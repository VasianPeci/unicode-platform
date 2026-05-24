import * as vm from 'node:vm'
import { spawn } from 'node:child_process'
import { promises as fs } from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { SubmissionStatus } from '@prisma/client'

export interface JudgeResult {
  status: SubmissionStatus
  runtimeMs?: number
  memoryKb?: number
  testResults: TestResult[]
  errorMsg?: string
}

interface TestResult {
  passed: boolean
  input?: string
  output?: string
  expected?: string
  time?: number
  isHidden?: boolean
}

interface TestCase {
  input: string
  expectedOutput: string
  isHidden: boolean
}

type JavaParam = { type: string; name: string }

const JUDGE0_URL = process.env.JUDGE0_URL || ''
const JUDGE0_TOKEN = process.env.JUDGE0_TOKEN || ''
const RESULT_MARKER = '__UNICODE_JUDGE_RESULT__:'

const JUDGE0_LANGUAGE_IDS: Record<string, number> = {
  python: Number(process.env.JUDGE0_PYTHON_ID || 71),
  java: Number(process.env.JUDGE0_JAVA_ID || 62),
  cpp: Number(process.env.JUDGE0_CPP_ID || 54),
}

const JUDGE0_POLL_INTERVAL_MS = 250

const STATUS_ORDER: Record<SubmissionStatus, number> = {
  PENDING: -1,
  ACCEPTED: 0,
  WRONG_ANSWER: 1,
  TIME_LIMIT_EXCEEDED: 2,
  MEMORY_LIMIT_EXCEEDED: 3,
  RUNTIME_ERROR: 4,
  COMPILATION_ERROR: 5,
}

class JudgeConfigurationError extends Error {}
class JudgeInfrastructureError extends Error {}
class LocalJudgeUnavailableError extends Error {}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

type CommandResult = {
  stdout: string
  stderr: string
  exitCode: number | null
  timedOut: boolean
  runtimeMs: number
  error?: NodeJS.ErrnoException
}

type LocalExecutionResult = {
  status: SubmissionStatus
  stdout: string
  stderr: string
  runtimeMs: number
}

function runCommand(command: string, args: string[], cwd: string, timeoutMs: number): Promise<CommandResult> {
  return new Promise(resolve => {
    const start = Date.now()
    let child: ReturnType<typeof spawn>
    try {
      child = spawn(command, args, { cwd, windowsHide: true })
    } catch (error) {
      resolve({
        stdout: '',
        stderr: '',
        exitCode: null,
        timedOut: false,
        runtimeMs: Date.now() - start,
        error: error as NodeJS.ErrnoException,
      })
      return
    }

    let stdout = ''
    let stderr = ''
    let timedOut = false
    let settled = false

    const finish = (result: Omit<CommandResult, 'stdout' | 'stderr' | 'runtimeMs' | 'timedOut'> & Partial<CommandResult>) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve({
        stdout,
        stderr,
        exitCode: result.exitCode ?? null,
        timedOut: result.timedOut ?? timedOut,
        runtimeMs: Date.now() - start,
        error: result.error,
      })
    }

    const timer = setTimeout(() => {
      timedOut = true
      child.kill('SIGKILL')
    }, timeoutMs)

    child.stdout?.on('data', chunk => { stdout += String(chunk) })
    child.stderr?.on('data', chunk => { stderr += String(chunk) })
    child.on('error', error => finish({ exitCode: null, error: error as NodeJS.ErrnoException }))
    child.on('close', code => finish({ exitCode: code }))
  })
}

function isCommandMissing(result: CommandResult): boolean {
  return ['ENOENT', 'EACCES', 'EPERM'].includes(result.error?.code || '')
}

function createUnavailableResult(language: string, detail?: string): JudgeResult {
  return {
    status: 'COMPILATION_ERROR',
    testResults: [],
    errorMsg: detail || `Language '${language}' cannot be judged because no local runtime or Judge0 service is available.`,
  }
}

function worseStatus(a: SubmissionStatus, b: SubmissionStatus): SubmissionStatus {
  return STATUS_ORDER[b] > STATUS_ORDER[a] ? b : a
}

function normalizeDisplayValue(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'bigint') return value.toString()
  if (typeof value === 'number' && Number.isNaN(value)) return 'NaN'
  if (value === undefined) return 'undefined'
  return JSON.stringify(value)
}

function parseLiteral(text: string): any {
  const trimmed = text.trim()
  if (!trimmed) return ''

  if (trimmed === 'true' || trimmed === 'True') return true
  if (trimmed === 'false' || trimmed === 'False') return false
  if (trimmed === 'null' || trimmed === 'None') return null
  if (trimmed === 'undefined') return undefined
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed)

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    try {
      return JSON.parse(trimmed.replace(/^'/, '"').replace(/'$/, '"'))
    } catch {
      return trimmed.slice(1, -1)
    }
  }

  if (
    (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
    (trimmed.startsWith('{') && trimmed.endsWith('}'))
  ) {
    return JSON.parse(trimmed)
  }

  return trimmed
}

function splitTopLevel(input: string): string[] {
  const parts: string[] = []
  let current = ''
  let depth = 0
  let stringQuote: '"' | "'" | '`' | null = null
  let escape = false

  for (const ch of input) {
    if (escape) {
      current += ch
      escape = false
      continue
    }

    if (ch === '\\') {
      current += ch
      escape = true
      continue
    }

    if (stringQuote) {
      current += ch
      if (ch === stringQuote) stringQuote = null
      continue
    }

    if (ch === '"' || ch === "'" || ch === '`') {
      current += ch
      stringQuote = ch
      continue
    }

    if (ch === '[' || ch === '{' || ch === '(') depth++
    if (ch === ']' || ch === '}' || ch === ')') depth--

    if (ch === ',' && depth === 0) {
      parts.push(current.trim())
      current = ''
      continue
    }

    current += ch
  }

  if (current.trim()) parts.push(current.trim())
  return parts
}

function parseInput(input: string): any[] {
  const trimmed = input.trim()
  if (!trimmed) return []

  const lines = trimmed.split(/\r?\n/).map(line => line.trim()).filter(Boolean)
  if (lines.length > 1 && lines.every(line => line.includes('='))) {
    return lines.map(line => parseLiteral(line.slice(line.indexOf('=') + 1)))
  }

  if (trimmed.includes('=')) {
    return splitTopLevel(trimmed).map(part => {
      const eqIndex = part.indexOf('=')
      return parseLiteral(eqIndex >= 0 ? part.slice(eqIndex + 1) : part)
    })
  }

  if (lines.length > 1) {
    return lines.map(parseLiteral)
  }

  if (
    trimmed.includes(',') &&
    !trimmed.startsWith('[') &&
    !trimmed.startsWith('{')
  ) {
    return splitTopLevel(trimmed).map(parseLiteral)
  }

  if (
    (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
    (trimmed.startsWith('{') && trimmed.endsWith('}'))
  ) {
    return [JSON.parse(trimmed)]
  }

  return [parseLiteral(trimmed)]
}

function parseExpectedOutput(text: string): any {
  return parseLiteral(text)
}

function parseJudgeOutput(text: string): any {
  const stdout = text ?? ''
  const markerLine = stdout
    .split(/\r?\n/)
    .reverse()
    .find(line => line.startsWith(RESULT_MARKER))
  const trimmed = (markerLine ? markerLine.slice(RESULT_MARKER.length) : stdout).trim()
  if (!trimmed) return ''

  try {
    return JSON.parse(trimmed)
  } catch {
    return parseLiteral(trimmed)
  }
}

function valuesEqual(actual: any, expected: any): boolean {
  if (typeof actual === 'number' && typeof expected === 'number') {
    if (Number.isNaN(actual) || Number.isNaN(expected)) return Number.isNaN(actual) && Number.isNaN(expected)
    return Math.abs(actual - expected) <= 1e-9
  }

  if (Array.isArray(actual) && Array.isArray(expected)) {
    return actual.length === expected.length && actual.every((value, index) => valuesEqual(value, expected[index]))
  }

  if (actual && expected && typeof actual === 'object' && typeof expected === 'object') {
    const actualKeys = Object.keys(actual).sort()
    const expectedKeys = Object.keys(expected).sort()
    return valuesEqual(actualKeys, expectedKeys) && actualKeys.every(key => valuesEqual(actual[key], expected[key]))
  }

  return Object.is(actual, expected)
}

function extractJavaScriptFunctionNames(code: string): string[] {
  const names = new Set<string>()
  const patterns = [
    /\b(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g,
    /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>/g,
    /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?function\b/g,
  ]

  for (const pattern of patterns) {
    for (const match of code.matchAll(pattern)) names.add(match[1])
  }

  return Array.from(names)
}

function extractJavaScriptSolutionMethods(code: string): string[] {
  const classMatch = code.match(/class\s+Solution\s*{([\s\S]*)}/)
  if (!classMatch) return []

  const methods = new Set<string>()
  const methodPattern = /^\s*(?:async\s+)?([A-Za-z_$][\w$]*)\s*\(/gm
  for (const match of classMatch[1].matchAll(methodPattern)) {
    if (match[1] !== 'constructor') methods.add(match[1])
  }

  return Array.from(methods)
}

function createSandbox(): vm.Context {
  const sandbox: any = {
    console: { log: () => {}, error: () => {}, warn: () => {} },
    module: { exports: {} },
    exports: {},
    Math,
    Array,
    Object,
    JSON,
    Map,
    Set,
    Date,
    Number,
    String,
    Boolean,
    RegExp,
    BigInt,
    Symbol,
  }

  sandbox.global = sandbox
  sandbox.globalThis = sandbox

  return vm.createContext(sandbox)
}

function buildJavaScriptLoadScript(code: string) {
  const functionNames = extractJavaScriptFunctionNames(code)
  const methodNames = extractJavaScriptSolutionMethods(code)

  const functionAssignments = functionNames
    .map(name => `${JSON.stringify(name)}: typeof ${name} !== 'undefined' ? ${name} : undefined`)
    .join(',')

  return `
${code}
;globalThis.__judgeFunctions = { ${functionAssignments} };
;globalThis.__judgeSolutionClass = typeof Solution !== 'undefined' ? Solution : undefined;
;globalThis.__judgeSolutionMethods = ${JSON.stringify(methodNames)};
`
}

function chooseJavaScriptEntry(sandbox: any, argCount: number): { kind: 'function' | 'method'; name: string } {
  const functions = sandbox.__judgeFunctions || {}
  const functionNames = Object.keys(functions).filter(name => typeof functions[name] === 'function')
  const methodNames = Array.isArray(sandbox.__judgeSolutionMethods) && typeof sandbox.__judgeSolutionClass === 'function'
    ? sandbox.__judgeSolutionMethods
    : []

  const preferredNames = ['solution', 'solve']

  for (const name of preferredNames) {
    if (functionNames.includes(name)) return { kind: 'function', name }
    if (methodNames.includes(name)) return { kind: 'method', name }
  }

  const matchingFunction = functionNames.filter(name => functions[name].length === argCount).at(-1)
  if (matchingFunction) return { kind: 'function', name: matchingFunction }

  const matchingMethod = methodNames.filter((name: string) => {
    try {
      return sandbox.__judgeSolutionClass.prototype[name].length === argCount
    } catch {
      return false
    }
  }).at(-1)
  if (matchingMethod) return { kind: 'method', name: matchingMethod }

  if (functionNames.length > 0) return { kind: 'function', name: functionNames.at(-1)! }
  if (methodNames.length > 0) return { kind: 'method', name: methodNames.at(-1)! }

  throw new Error('No callable solution function found')
}

function classifyLocalError(error: any): SubmissionStatus {
  const message = String(error?.message || '')
  if (message.includes('Script execution timed out') || message.includes('timed out')) return 'TIME_LIMIT_EXCEEDED'
  if (error?.name === 'SyntaxError') return 'COMPILATION_ERROR'
  return 'RUNTIME_ERROR'
}

function judgeJavaScriptTest(code: string, tc: TestCase, timeLimit: number): TestResult & { status: SubmissionStatus } {
  const start = Date.now()
  const sandbox: any = createSandbox()

  try {
    const args = parseInput(tc.input)
    sandbox.__judgeArgs = args

    new vm.Script(buildJavaScriptLoadScript(code)).runInContext(sandbox, { timeout: timeLimit })
    const entry = chooseJavaScriptEntry(sandbox, args.length)
    sandbox.__judgeEntry = entry

    new vm.Script(`
      (() => {
        const entry = globalThis.__judgeEntry;
        const args = globalThis.__judgeArgs;
        const result = entry.kind === 'method'
          ? new globalThis.__judgeSolutionClass()[entry.name](...args)
          : globalThis.__judgeFunctions[entry.name](...args);

        if (result && typeof result.then === 'function') {
          throw new Error('Async solutions are not supported');
        }

        globalThis.__judgeOutput = result;
      })();
    `).runInContext(sandbox, { timeout: timeLimit })

    const expected = parseExpectedOutput(tc.expectedOutput)
    const output = sandbox.__judgeOutput
    const passed = valuesEqual(output, expected)

    return {
      status: passed ? 'ACCEPTED' : 'WRONG_ANSWER',
      passed,
      input: tc.isHidden ? undefined : tc.input,
      output: tc.isHidden ? undefined : normalizeDisplayValue(output),
      expected: tc.isHidden ? undefined : normalizeDisplayValue(expected),
      time: Date.now() - start,
      isHidden: tc.isHidden,
    }
  } catch (error: any) {
    const status = classifyLocalError(error)
    return {
      status,
      passed: false,
      input: tc.isHidden ? undefined : tc.input,
      output: tc.isHidden ? undefined : error.message,
      time: Date.now() - start,
      isHidden: tc.isHidden,
    }
  }
}

async function judgeJavaScriptLocally(code: string, testCases: TestCase[], timeLimit: number): Promise<JudgeResult> {
  const results: TestResult[] = []
  let overallStatus: SubmissionStatus = 'ACCEPTED'

  for (const tc of testCases) {
    const result = judgeJavaScriptTest(code, tc, timeLimit)
    overallStatus = worseStatus(overallStatus, result.status)
    results.push(result)
  }

  return {
    status: overallStatus,
    runtimeMs: results.reduce((sum, result) => sum + (result.time || 0), 0),
    testResults: results,
    errorMsg: results.find(result => !result.passed && result.output)?.output,
  }
}

function mapJudge0Status(statusId: number): SubmissionStatus {
  const map: Record<number, SubmissionStatus> = {
    1: 'RUNTIME_ERROR',
    2: 'RUNTIME_ERROR',
    3: 'ACCEPTED',
    4: 'WRONG_ANSWER',
    5: 'TIME_LIMIT_EXCEEDED',
    6: 'COMPILATION_ERROR',
    7: 'RUNTIME_ERROR',
    8: 'RUNTIME_ERROR',
    9: 'RUNTIME_ERROR',
    10: 'RUNTIME_ERROR',
    11: 'RUNTIME_ERROR',
    12: 'RUNTIME_ERROR',
    13: 'RUNTIME_ERROR',
    14: 'RUNTIME_ERROR',
  }

  return map[statusId] || 'RUNTIME_ERROR'
}

function extractPythonSolutionMethodName(code: string): string | null {
  const classIndex = code.search(/class\s+Solution\b/)
  if (classIndex < 0) return null

  const rest = code.slice(classIndex)
  const methodMatch = rest.match(/\n\s+def\s+([A-Za-z_]\w*)\s*\(\s*self(?:\s*,|\s*\))/)
  return methodMatch ? methodMatch[1] : null
}

function extractStandalonePythonFunctionName(code: string): string | null {
  const match = code.match(/^\s*def\s+([A-Za-z_]\w*)\s*\(/m)
  return match ? match[1] : null
}

function extractJavaSolutionMethod(code: string): { name: string; params: JavaParam[] } | null {
  const pattern = /(?:public|private|protected)?\s*(?:static\s+)?[A-Za-z_<>, ?\[\]]+\s+([A-Za-z_]\w*)\s*\(([^)]*)\)\s*\{/g
  for (const match of code.matchAll(pattern)) {
    const name = match[1]
    if (name === 'main' || name === 'Solution') continue

    const params = match[2].trim()
      ? match[2].split(',').map(param => {
          const cleaned = param.trim().replace(/\s+/g, ' ')
          const lastSpace = cleaned.lastIndexOf(' ')
          return {
            type: cleaned.slice(0, lastSpace).trim(),
            name: cleaned.slice(lastSpace + 1).trim(),
          }
        })
      : []

    return { name, params }
  }

  return null
}

function extractCppSolutionMethod(code: string): { name: string; params: JavaParam[] } | null {
  const classIndex = code.search(/class\s+Solution\b/)
  const searchArea = classIndex >= 0 ? code.slice(classIndex) : code
  const pattern = /(?:^|\n)\s*(?:[A-Za-z_][\w:<>]*\s+)*(?:const\s+)?([A-Za-z_][\w:<>]*(?:\s*[&*])?)\s+([A-Za-z_]\w*)\s*\(([^)]*)\)\s*(?:const\s*)?\{/g

  for (const match of searchArea.matchAll(pattern)) {
    const name = match[2]
    if (name === 'main' || name === 'Solution') continue

    const params = match[3].trim()
      ? match[3].split(',').map(param => {
          const cleaned = param.trim().replace(/\s+/g, ' ')
          const noDefault = cleaned.split('=')[0].trim()
          const nameMatch = noDefault.match(/([A-Za-z_]\w*)\s*$/)
          const paramName = nameMatch?.[1] || ''
          return {
            type: noDefault.slice(0, noDefault.length - paramName.length).trim(),
            name: paramName,
          }
        })
      : []

    return { name, params }
  }

  return null
}

function javaStringLiteral(value: string) {
  return JSON.stringify(value)
}

function javaLiteral(value: any, type: string): string {
  const normalizedType = type.replace(/\s+/g, '')

  if (normalizedType.includes('List<')) {
    if (!Array.isArray(value)) return `new java.util.ArrayList<>()`
    return `new java.util.ArrayList<>(java.util.Arrays.asList(${value.map(item => javaLiteral(item, 'Object')).join(', ')}))`
  }

  if (normalizedType.endsWith('[][]')) {
    const innerType = normalizedType.slice(0, -4)
    const rows = Array.isArray(value) ? value : []
    return `new ${innerType}[][]{${rows.map(row => `{${(row || []).map((item: any) => javaLiteral(item, innerType)).join(', ')}}`).join(', ')}}`
  }

  if (normalizedType.endsWith('[]')) {
    const innerType = normalizedType.slice(0, -2)
    const items = Array.isArray(value) ? value : []
    return `new ${innerType}[]{${items.map(item => javaLiteral(item, innerType)).join(', ')}}`
  }

  if (normalizedType === 'String' || normalizedType === 'Object') {
    if (typeof value === 'string') return javaStringLiteral(value)
    if (typeof value === 'number' || typeof value === 'boolean') return String(value)
    return javaStringLiteral(JSON.stringify(value))
  }

  if (normalizedType === 'char' || normalizedType === 'Character') {
    return `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
  }

  if (normalizedType === 'long' || normalizedType === 'Long') return `${value}L`
  if (normalizedType === 'float' || normalizedType === 'Float') return `${value}f`
  if (normalizedType === 'boolean' || normalizedType === 'Boolean') return value ? 'true' : 'false'

  return String(value)
}

function cppStringLiteral(value: string) {
  return JSON.stringify(value)
}

function cppLiteral(value: any, type: string): string {
  const normalizedType = type
    .replace(/\bconst\b/g, '')
    .replace(/[&*]/g, '')
    .replace(/\s+/g, '')

  if (normalizedType.startsWith('vector<vector<')) {
    const innerMatch = normalizedType.match(/vector<vector<(.+)>>/)
    const innerType = innerMatch?.[1] || 'int'
    const rows = Array.isArray(value) ? value : []
    return `vector<vector<${innerType}>>{${rows.map(row => `{${(row || []).map((item: any) => cppLiteral(item, innerType)).join(', ')}}`).join(', ')}}`
  }

  if (normalizedType.startsWith('vector<')) {
    const innerType = normalizedType.slice('vector<'.length, -1)
    const items = Array.isArray(value) ? value : []
    return `vector<${innerType}>{${items.map(item => cppLiteral(item, innerType)).join(', ')}}`
  }

  if (normalizedType === 'string') return cppStringLiteral(String(value))
  if (normalizedType === 'char') return `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
  if (normalizedType === 'bool') return value ? 'true' : 'false'
  if (normalizedType === 'longlong') return `${value}LL`

  return String(value)
}

function cppValueType(type: string): string {
  return type
    .replace(/\bconst\b/g, '')
    .replace(/[&*]/g, '')
    .replace(/\s+/g, ' ')
    .trim() || 'auto'
}

function wrapPython(code: string, args: any[]): string {
  const methodName = extractPythonSolutionMethodName(code)
  const standaloneFuncName = extractStandalonePythonFunctionName(code)
  const argsB64 = Buffer.from(JSON.stringify(args), 'utf8').toString('base64')

  const call = methodName
    ? `Solution().${methodName}(*args)`
    : standaloneFuncName
      ? `${standaloneFuncName}(*args)`
      : null

  if (!call) throw new JudgeConfigurationError('No Python solution function found')

  return `
from typing import *
import base64
import json

${code}

def __unicode_normalize(value):
    if isinstance(value, tuple):
        return list(value)
    if isinstance(value, set):
        return sorted(list(value))
    return value

args = json.loads(base64.b64decode("${argsB64}").decode("utf-8"))
result = ${call}
try:
    payload = json.dumps(__unicode_normalize(result), separators=(",", ":"))
except TypeError:
    payload = json.dumps(str(result))
print("${RESULT_MARKER}" + payload)
`
}

function sanitizeJavaCode(code: string) {
  return code.replace(/\bpublic\s+class\s+Solution\b/g, 'class Solution')
}

function wrapJava(code: string, args: any[]): string {
  const method = extractJavaSolutionMethod(code)
  if (!method) throw new JudgeConfigurationError('No Java Solution method found')

  const argExpressions = method.params.map((param, index) => javaLiteral(args[index], param.type)).join(', ')

  return `
import java.util.*;
import java.lang.reflect.Array;

${sanitizeJavaCode(code)}

class Main {
  public static void main(String[] args) throws Exception {
    Solution solution = new Solution();
    Object result = solution.${method.name}(${argExpressions});
    System.out.println("${RESULT_MARKER}" + format(result));
  }

  static String format(Object value) {
    if (value == null) return "null";
    Class<?> cls = value.getClass();
    if (cls.isArray()) {
      int len = Array.getLength(value);
      StringBuilder sb = new StringBuilder("[");
      for (int i = 0; i < len; i++) {
        if (i > 0) sb.append(",");
        sb.append(format(Array.get(value, i)));
      }
      return sb.append("]").toString();
    }
    if (value instanceof Collection<?>) {
      StringBuilder sb = new StringBuilder("[");
      boolean first = true;
      for (Object item : (Collection<?>) value) {
        if (!first) sb.append(",");
        sb.append(format(item));
        first = false;
      }
      return sb.append("]").toString();
    }
    if (value instanceof String || value instanceof Character) return quote(String.valueOf(value));
    if (value instanceof Boolean) return ((Boolean) value) ? "true" : "false";
    return String.valueOf(value);
  }

  static String quote(String value) {
    return "\\\"" + value.replace("\\\\", "\\\\\\\\").replace("\\\"", "\\\\\\\"") + "\\\"";
  }
}
`
}

function wrapCpp(code: string, args: any[]): string {
  const method = extractCppSolutionMethod(code)
  if (!method) throw new JudgeConfigurationError('No C++ Solution method found')

  const argDeclarations = method.params
    .map((param, index) => {
      const name = `__unicode_arg_${index}`
      return `${cppValueType(param.type)} ${name} = ${cppLiteral(args[index], param.type)};`
    })
    .join('\n  ')
  const argExpressions = method.params.map((_, index) => `__unicode_arg_${index}`).join(', ')

  return `
#include <algorithm>
#include <array>
#include <cmath>
#include <deque>
#include <iostream>
#include <limits>
#include <map>
#include <numeric>
#include <queue>
#include <set>
#include <stack>
#include <string>
#include <type_traits>
#include <unordered_map>
#include <unordered_set>
#include <utility>
#include <vector>
using namespace std;

${code}

void __unicode_print_json(const string& value) {
  cout << '"';
  for (char ch : value) {
    if (ch == '"' || ch == '\\\\') cout << '\\\\';
    cout << ch;
  }
  cout << '"';
}

void __unicode_print_json(const char* value) { __unicode_print_json(string(value)); }
void __unicode_print_json(char value) { __unicode_print_json(string(1, value)); }
void __unicode_print_json(bool value) { cout << (value ? "true" : "false"); }

template <typename T>
typename enable_if<is_arithmetic<T>::value && !is_same<T, bool>::value, void>::type
__unicode_print_json(const T& value) { cout << value; }

template <typename T>
void __unicode_print_json(const vector<T>& values) {
  cout << '[';
  for (size_t i = 0; i < values.size(); i++) {
    if (i) cout << ',';
    __unicode_print_json(values[i]);
  }
  cout << ']';
}

int main() {
  Solution solution;
  ${argDeclarations}
  auto result = solution.${method.name}(${argExpressions});
  cout << "${RESULT_MARKER}";
  __unicode_print_json(result);
  cout << endl;
  return 0;
}
`
}

function wrapCodeForJudge0(code: string, language: string, args: any[]): string {
  if (language === 'python') return wrapPython(code, args)
  if (language === 'java') return wrapJava(code, args)
  if (language === 'cpp') return wrapCpp(code, args)
  throw new JudgeConfigurationError(`Language '${language}' is not supported by Judge0 wrapper`)
}

function pythonCandidates() {
  const override = process.env.LOCAL_JUDGE_PYTHON_BIN || process.env.PYTHON_BIN
  if (override) return [{ command: override, args: [] }]

  return process.platform === 'win32'
    ? [
        { command: 'py', args: ['-3'] },
        { command: 'python', args: [] },
        { command: 'python3', args: [] },
      ]
    : [
        { command: 'python3', args: [] },
        { command: 'python', args: [] },
      ]
}

function isPythonRuntimeMissing(result: CommandResult) {
  const output = `${result.stdout}\n${result.stderr}`
  return isCommandMissing(result) ||
    /No installed Python|Python was not found|No suitable Python runtime|can't find a default Python/i.test(output)
}

async function runPythonLocally(wrappedCode: string, timeLimit: number): Promise<LocalExecutionResult> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'unicode-judge-python-'))
  try {
    const file = path.join(tempDir, 'solution.py')
    await fs.writeFile(file, wrappedCode, 'utf8')

    for (const candidate of pythonCandidates()) {
      const result = await runCommand(candidate.command, [...candidate.args, file], tempDir, timeLimit)
      if (isPythonRuntimeMissing(result)) continue

      if (result.timedOut) {
        return { status: 'TIME_LIMIT_EXCEEDED', stdout: result.stdout, stderr: result.stderr, runtimeMs: result.runtimeMs }
      }

      if (result.exitCode !== 0) {
        const status: SubmissionStatus = /SyntaxError|IndentationError|TabError/i.test(result.stderr)
          ? 'COMPILATION_ERROR'
          : 'RUNTIME_ERROR'
        return { status, stdout: result.stdout, stderr: result.stderr, runtimeMs: result.runtimeMs }
      }

      return { status: 'ACCEPTED', stdout: result.stdout, stderr: result.stderr, runtimeMs: result.runtimeMs }
    }

    throw new LocalJudgeUnavailableError('Python runtime not found. Install Python, configure LOCAL_JUDGE_PYTHON_BIN, or start Judge0.')
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true })
  }
}

async function runJavaLocally(wrappedCode: string, timeLimit: number): Promise<LocalExecutionResult> {
  const javac = process.env.LOCAL_JUDGE_JAVAC_BIN || process.env.JAVAC_BIN || 'javac'
  const java = process.env.LOCAL_JUDGE_JAVA_BIN || process.env.JAVA_BIN || 'java'
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'unicode-judge-java-'))

  try {
    const file = path.join(tempDir, 'Main.java')
    await fs.writeFile(file, wrappedCode, 'utf8')

    const compile = await runCommand(javac, [file], tempDir, Math.max(timeLimit, 10000))
    if (isCommandMissing(compile)) {
      throw new LocalJudgeUnavailableError('Java compiler not found. Install a JDK, configure LOCAL_JUDGE_JAVAC_BIN, or start Judge0.')
    }
    if (compile.timedOut) {
      return { status: 'TIME_LIMIT_EXCEEDED', stdout: compile.stdout, stderr: compile.stderr, runtimeMs: compile.runtimeMs }
    }
    if (compile.exitCode !== 0) {
      return { status: 'COMPILATION_ERROR', stdout: compile.stdout, stderr: compile.stderr, runtimeMs: 0 }
    }

    const result = await runCommand(java, ['-cp', tempDir, 'Main'], tempDir, timeLimit)
    if (isCommandMissing(result)) {
      throw new LocalJudgeUnavailableError('Java runtime not found. Install a JRE/JDK, configure LOCAL_JUDGE_JAVA_BIN, or start Judge0.')
    }
    if (result.timedOut) {
      return { status: 'TIME_LIMIT_EXCEEDED', stdout: result.stdout, stderr: result.stderr, runtimeMs: result.runtimeMs }
    }
    if (result.exitCode !== 0) {
      return { status: 'RUNTIME_ERROR', stdout: result.stdout, stderr: result.stderr, runtimeMs: result.runtimeMs }
    }

    return { status: 'ACCEPTED', stdout: result.stdout, stderr: result.stderr, runtimeMs: result.runtimeMs }
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true })
  }
}

async function runCppLocally(wrappedCode: string, timeLimit: number): Promise<LocalExecutionResult> {
  const cxx = process.env.LOCAL_JUDGE_CXX_BIN || process.env.CXX_BIN || 'g++'
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'unicode-judge-cpp-'))

  try {
    const source = path.join(tempDir, 'main.cpp')
    const executable = path.join(tempDir, process.platform === 'win32' ? 'main.exe' : 'main')
    await fs.writeFile(source, wrappedCode, 'utf8')

    const compile = await runCommand(cxx, ['-std=c++17', '-O2', source, '-o', executable], tempDir, Math.max(timeLimit, 10000))
    if (isCommandMissing(compile)) {
      throw new LocalJudgeUnavailableError('C++ compiler not found. Install g++, configure LOCAL_JUDGE_CXX_BIN, or start Judge0.')
    }
    if (compile.timedOut) {
      return { status: 'TIME_LIMIT_EXCEEDED', stdout: compile.stdout, stderr: compile.stderr, runtimeMs: compile.runtimeMs }
    }
    if (compile.exitCode !== 0) {
      return { status: 'COMPILATION_ERROR', stdout: compile.stdout, stderr: compile.stderr, runtimeMs: 0 }
    }

    const result = await runCommand(executable, [], tempDir, timeLimit)
    if (result.timedOut) {
      return { status: 'TIME_LIMIT_EXCEEDED', stdout: result.stdout, stderr: result.stderr, runtimeMs: result.runtimeMs }
    }
    if (result.exitCode !== 0) {
      return { status: 'RUNTIME_ERROR', stdout: result.stdout, stderr: result.stderr, runtimeMs: result.runtimeMs }
    }

    return { status: 'ACCEPTED', stdout: result.stdout, stderr: result.stderr, runtimeMs: result.runtimeMs }
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true })
  }
}

async function runLocalSubmission(wrappedCode: string, language: string, timeLimit: number): Promise<LocalExecutionResult> {
  if (language === 'python') return runPythonLocally(wrappedCode, timeLimit)
  if (language === 'java') return runJavaLocally(wrappedCode, timeLimit)
  if (language === 'cpp') return runCppLocally(wrappedCode, timeLimit)
  throw new LocalJudgeUnavailableError(`No local runner configured for language '${language}'.`)
}

async function judgeWithLocalRuntime(
  code: string,
  language: string,
  testCases: TestCase[],
  timeLimit: number,
): Promise<JudgeResult> {
  const results: TestResult[] = []
  let overallStatus: SubmissionStatus = 'ACCEPTED'
  let runtimeMs = 0
  let errorMsg: string | undefined

  for (const tc of testCases) {
    try {
      const args = parseInput(tc.input)
      const expectedValue = parseExpectedOutput(tc.expectedOutput)
      const wrappedCode = wrapCodeForJudge0(code, language, args)
      const result = await runLocalSubmission(wrappedCode, language, timeLimit)
      runtimeMs += result.runtimeMs

      const processOutput = result.stdout.trim() || result.stderr.trim()
      const actualValue = parseJudgeOutput(result.stdout)
      const passed = result.status === 'ACCEPTED' && valuesEqual(actualValue, expectedValue)
      const status = passed ? 'ACCEPTED' : result.status === 'ACCEPTED' ? 'WRONG_ANSWER' : result.status

      overallStatus = worseStatus(overallStatus, status)
      if (!passed && !errorMsg) {
        errorMsg = result.stderr.trim() || result.stdout.trim() || `${status} on a test case`
      }

      results.push({
        passed,
        input: tc.isHidden ? undefined : tc.input,
        output: tc.isHidden ? undefined : (result.status === 'ACCEPTED' ? normalizeDisplayValue(actualValue) : processOutput),
        expected: tc.isHidden ? undefined : normalizeDisplayValue(expectedValue),
        time: result.runtimeMs,
        isHidden: tc.isHidden,
      })
    } catch (error: any) {
      if (error instanceof LocalJudgeUnavailableError) throw error

      const status: SubmissionStatus = error instanceof JudgeConfigurationError ? 'COMPILATION_ERROR' : 'RUNTIME_ERROR'
      overallStatus = worseStatus(overallStatus, status)
      if (!errorMsg) errorMsg = error.message

      results.push({
        passed: false,
        input: tc.isHidden ? undefined : tc.input,
        output: tc.isHidden ? undefined : error.message,
        isHidden: tc.isHidden,
      })
    }
  }

  return {
    status: overallStatus,
    runtimeMs,
    testResults: results,
    errorMsg,
  }
}

async function parseJudge0Response(response: Response) {
  const text = await response.text()

  if (!response.ok) {
    throw new JudgeInfrastructureError(`Judge0 request failed with HTTP ${response.status}${text ? `: ${text}` : ''}`)
  }

  return text ? JSON.parse(text) : {}
}

async function runJudge0Submission(
  wrappedCode: string,
  languageId: number,
  timeLimit: number,
  memoryLimit: number,
  headers: Record<string, string>,
) {
  let submission: Response
  try {
    submission = await fetch(
      `${JUDGE0_URL}/submissions?base64_encoded=false&wait=false`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          source_code: wrappedCode,
          language_id: languageId,
          cpu_time_limit: Math.max(timeLimit / 1000, 0.1),
          memory_limit: memoryLimit * 1024,
        }),
      },
    )
  } catch (error: any) {
    throw new JudgeInfrastructureError(`Judge0 is not reachable at ${JUDGE0_URL}: ${error.message}`)
  }

  let result = await parseJudge0Response(submission)
  const token = result.token

  if (!token) return result

  const deadline = Date.now() + Math.max(timeLimit + 5000, 10000)

  while (Date.now() < deadline) {
    const statusId = result.status?.id
    if (statusId && statusId !== 1 && statusId !== 2) return result

    await delay(JUDGE0_POLL_INTERVAL_MS)

    let poll: Response
    try {
      poll = await fetch(
        `${JUDGE0_URL}/submissions/${token}?base64_encoded=false`,
        { headers },
      )
    } catch (error: any) {
      throw new JudgeInfrastructureError(`Judge0 is not reachable at ${JUDGE0_URL}: ${error.message}`)
    }
    result = await parseJudge0Response(poll)
  }

  throw new JudgeInfrastructureError('Judge0 did not finish judging before the polling timeout')
}

async function judgeWithJudge0(
  code: string,
  language: string,
  testCases: TestCase[],
  timeLimit: number,
  memoryLimit: number,
): Promise<JudgeResult> {
  const languageId = JUDGE0_LANGUAGE_IDS[language]
  if (!languageId) {
    return {
      status: 'COMPILATION_ERROR',
      testResults: [],
      errorMsg: `Language '${language}' not supported`,
    }
  }

  const results: TestResult[] = []
  let overallStatus: SubmissionStatus = 'ACCEPTED'
  let runtimeMs = 0
  let errorMsg: string | undefined

  for (const tc of testCases) {
    try {
      const args = parseInput(tc.input)
      const expectedValue = parseExpectedOutput(tc.expectedOutput)
      const wrappedCode = wrapCodeForJudge0(code, language, args)

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }

      if (JUDGE0_TOKEN) {
        headers['X-RapidAPI-Key'] = JUDGE0_TOKEN
        headers['X-RapidAPI-Host'] = 'judge0-ce.p.rapidapi.com'
      }

      const result = await runJudge0Submission(wrappedCode, languageId, timeLimit, memoryLimit, headers)
      const stdout = result.stdout?.trim() || ''
      const stderr = result.stderr?.trim() || ''
      const compileOutput = result.compile_output?.trim() || ''
      const statusId = result.status?.id ?? 13
      const judgeMessage = result.message?.trim() || ''
      if (statusId === 13) {
        throw new JudgeInfrastructureError(`Judge0 internal error${judgeMessage ? `: ${judgeMessage}` : ''}`)
      }

      const judgeStatus = mapJudge0Status(statusId)
      const testRuntimeMs = result.time ? Math.round(parseFloat(result.time) * 1000) : 0
      runtimeMs += testRuntimeMs

      const actualValue = parseJudgeOutput(stdout)
      const passed = judgeStatus === 'ACCEPTED' && valuesEqual(actualValue, expectedValue)
      const status = passed ? 'ACCEPTED' : judgeStatus === 'ACCEPTED' ? 'WRONG_ANSWER' : judgeStatus

      overallStatus = worseStatus(overallStatus, status)
      if (!passed && !errorMsg) errorMsg = compileOutput || stderr || stdout || judgeMessage || `${status} on a test case`

      results.push({
        passed,
        input: tc.isHidden ? undefined : tc.input,
        output: tc.isHidden ? undefined : (judgeStatus === 'ACCEPTED' ? normalizeDisplayValue(actualValue) : (stdout || compileOutput || stderr || '')),
        expected: tc.isHidden ? undefined : normalizeDisplayValue(expectedValue),
        time: testRuntimeMs,
        isHidden: tc.isHidden,
      })
    } catch (error: any) {
      if (error instanceof JudgeInfrastructureError) throw error

      const status: SubmissionStatus = error instanceof JudgeConfigurationError ? 'COMPILATION_ERROR' : 'RUNTIME_ERROR'
      overallStatus = worseStatus(overallStatus, status)
      if (!errorMsg) errorMsg = error.message

      results.push({
        passed: false,
        input: tc.isHidden ? undefined : tc.input,
        output: tc.isHidden ? undefined : error.message,
        isHidden: tc.isHidden,
      })
    }
  }

  return {
    status: overallStatus,
    runtimeMs,
    testResults: results,
    errorMsg,
  }
}

export async function judgeSubmission(
  code: string,
  language: string,
  testCases: TestCase[],
  timeLimit: number,
  memoryLimit: number,
): Promise<JudgeResult> {
  const completeTestCases = testCases.filter(tc => tc.input?.trim() && tc.expectedOutput?.trim())

  if (completeTestCases.length === 0) {
    return {
      status: 'COMPILATION_ERROR',
      testResults: [],
      errorMsg: 'Problem has no complete test cases',
    }
  }

  if (language === 'javascript') {
    return judgeJavaScriptLocally(code, completeTestCases, timeLimit)
  }

  const preferLocalRuntime = process.env.LOCAL_JUDGE_ENABLED === 'true' || process.env.NODE_ENV !== 'production'
  let localUnavailableMessage: string | undefined

  if (preferLocalRuntime) {
    try {
      return await judgeWithLocalRuntime(code, language, completeTestCases, timeLimit)
    } catch (error: any) {
      if (!(error instanceof LocalJudgeUnavailableError)) throw error
      localUnavailableMessage = error.message
    }
  }

  if (JUDGE0_URL) {
    try {
      return await judgeWithJudge0(code, language, completeTestCases, timeLimit, memoryLimit)
    } catch (error: any) {
      if (!(error instanceof JudgeInfrastructureError)) throw error

      if (!preferLocalRuntime) {
        try {
          return await judgeWithLocalRuntime(code, language, completeTestCases, timeLimit)
        } catch (localError: any) {
          if (!(localError instanceof LocalJudgeUnavailableError)) throw localError
          localUnavailableMessage = localError.message
        }
      }

      return createUnavailableResult(
        language,
        `${error.message}${localUnavailableMessage ? ` ${localUnavailableMessage}` : ''}`,
      )
    }
  }

  if (!preferLocalRuntime) {
    try {
      return await judgeWithLocalRuntime(code, language, completeTestCases, timeLimit)
    } catch (error: any) {
      if (!(error instanceof LocalJudgeUnavailableError)) throw error
      localUnavailableMessage = error.message
    }
  }

  return createUnavailableResult(
    language,
    localUnavailableMessage || `Language '${language}' requires Judge0 or a local runtime. Set JUDGE0_URL or enable LOCAL_JUDGE_ENABLED.`,
  )
}

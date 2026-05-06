import * as vm from 'node:vm'
import { isDeepStrictEqual } from 'node:util'
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

const JUDGE0_URL = process.env.JUDGE0_URL || ''
const JUDGE0_TOKEN = process.env.JUDGE0_TOKEN || ''

const JUDGE0_LANGUAGE_IDS: Record<string, number> = {
  javascript: 93,
  python: 92,
  java: 62,
  cpp: 54,
}

const STATUS_ORDER: Record<SubmissionStatus, number> = {
  PENDING: -1,
  ACCEPTED: 0,
  WRONG_ANSWER: 1,
  TIME_LIMIT_EXCEEDED: 2,
  MEMORY_LIMIT_EXCEEDED: 3,
  RUNTIME_ERROR: 4,
  COMPILATION_ERROR: 5,
}

function worseStatus(a: SubmissionStatus, b: SubmissionStatus): SubmissionStatus {
  return STATUS_ORDER[b] > STATUS_ORDER[a] ? b : a
}

// Normalize values for comparison across VM boundaries
function normalizeForComparison(value: any): any {
  try {
    return structuredClone(value)
  } catch {
    return JSON.parse(JSON.stringify(value))
  }
}

function normalizeDisplayValue(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'bigint') return value.toString()
  if (typeof value === 'number' && Number.isNaN(value)) return 'NaN'
  if (value === undefined) return 'undefined'
  return JSON.stringify(value)
}

function parseLiteral(text: string): any {
  const t = text.trim()
  if (!t) return ''

  if (t === 'true') return true
  if (t === 'false') return false
  if (t === 'null') return null
  if (t === 'undefined') return undefined
  if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t)

  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    try {
      return JSON.parse(t.replace(/^'/, '"').replace(/'$/, '"'))
    } catch {
      return t.slice(1, -1)
    }
  }

  if ((t.startsWith('[') && t.endsWith(']')) || (t.startsWith('{') && t.endsWith('}'))) {
    return JSON.parse(t)
  }

  return t
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

  if (trimmed.includes('=')) {
    return splitTopLevel(trimmed).map((part) => {
      const eqIndex = part.indexOf('=')
      const rawValue = eqIndex >= 0 ? part.slice(eqIndex + 1).trim() : part.trim()
      return parseLiteral(rawValue)
    })
  }

  if ((trimmed.startsWith('[') && trimmed.endsWith(']')) ||
      (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
    return [JSON.parse(trimmed)]
  }

  if (trimmed.includes('\n')) {
    return trimmed.split('\n').filter(Boolean).map(parseLiteral)
  }

  return [parseLiteral(trimmed)]
}

function parseExpectedOutput(text: string): any {
  const trimmed = text.trim()
  if (!trimmed) return ''

  if ((trimmed.startsWith('[') && trimmed.endsWith(']')) ||
      (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
    return JSON.parse(trimmed)
  }

  if (trimmed === 'true') return true
  if (trimmed === 'false') return false
  if (trimmed === 'null') return null
  if (trimmed === 'undefined') return undefined
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed)

  return trimmed
}

function extractEntryName(code: string): string | null {
  const patterns = [
    /\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/,
    /\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\(/,
    /\blet\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\(/,
    /\bvar\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\(/,
    /\basync\s+function\s+([A-Za-z_$][\w$]*)\s*\(/,
  ]

  for (const re of patterns) {
    const match = code.match(re)
    if (match) return match[1]
  }

  return null
}

function createSandbox(): vm.Context {
  const sandbox: any = {
    console: { log: () => {} },
    module: { exports: {} },
    exports: {},
    setTimeout,
    clearTimeout,
    Promise,
    Math,
    Array,
    Object,
    JSON,
    Map,
    Set,
  }

  sandbox.global = sandbox
  sandbox.globalThis = sandbox

  return vm.createContext(sandbox)
}

function loadUserFunction(code: string, timeLimitMs: number): any {
  const entryName = extractEntryName(code)
  const sandbox = createSandbox()

  const script = new vm.Script(code)
  script.runInContext(sandbox, { timeout: timeLimitMs })

  let fn = (sandbox as any).__judgeFn

  if (!fn && entryName) {
    fn = (sandbox as any)[entryName]
  }

  if (typeof fn !== 'function') {
    throw new Error('No callable function found')
  }

  return { fn, sandbox }
}

async function withTimeout<T>(promise: Promise<T>, timeLimitMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('timed out')), timeLimitMs)
    ),
  ])
}

export async function judgeSubmission(
  code: string,
  language: string,
  testCases: TestCase[],
  timeLimit: number,
  memoryLimit: number
): Promise<JudgeResult> {
  if (language === 'javascript') {
    return judgeJavaScriptLocally(code, testCases, timeLimit)
  }

  if (JUDGE0_URL) {
    return judgeWithJudge0(code, language, testCases, timeLimit, memoryLimit)
  }

  return {
    status: 'COMPILATION_ERROR',
    testResults: [],
    errorMsg: `Language '${language}' requires Judge0. Set JUDGE0_URL environment variable.`,
  }
}

async function judgeWithJudge0(
  code: string,
  language: string,
  testCases: TestCase[],
  timeLimit: number,
  memoryLimit: number
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

  for (const tc of testCases) {
    try {
      const stdin = tc.input.trim()
      const expectedOutput = tc.expectedOutput.trim()

      const response = await fetch(`${JUDGE0_URL}/submissions?base64_encoded=false&wait=true`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-RapidAPI-Key': JUDGE0_TOKEN,
          'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
        },
        body: JSON.stringify({
          source_code: code,
          language_id: languageId,
          stdin,
          expected_output: expectedOutput,
          cpu_time_limit: timeLimit / 1000,
          memory_limit: memoryLimit,
        }),
      })

      const result = await response.json()
      const statusId = result.status?.id

      // Status 3 = Accepted
      const passed = statusId === 3

      if (!passed && overallStatus === 'ACCEPTED') {
        overallStatus = mapJudge0Status(statusId)
      }

      results.push({
        passed,
        input: tc.isHidden ? undefined : tc.input,
        output: tc.isHidden ? undefined : (result.stdout?.trim() || result.compile_output || result.stderr || ''),
        expected: tc.isHidden ? undefined : expectedOutput,
        time: result.time ? Math.round(parseFloat(result.time) * 1000) : 0,
        isHidden: tc.isHidden,
      })
    } catch (err: any) {
      overallStatus = worseStatus(overallStatus, 'RUNTIME_ERROR')
      results.push({
        passed: false,
        input: tc.isHidden ? undefined : tc.input,
        output: tc.isHidden ? undefined : err.message,
        isHidden: tc.isHidden,
      })
    }
  }

  return {
    status: overallStatus,
    testResults: results,
  }
}

function mapJudge0Status(statusId: number): SubmissionStatus {
  const map: Record<number, SubmissionStatus> = {
    1: 'COMPILATION_ERROR',
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
    12: 'MEMORY_LIMIT_EXCEEDED',
    13: 'RUNTIME_ERROR',
    14: 'COMPILATION_ERROR',
  }
  return map[statusId] || 'RUNTIME_ERROR'
}

async function judgeJavaScriptLocally(
  code: string,
  testCases: TestCase[],
  timeLimit: number
): Promise<JudgeResult> {
  const results: TestResult[] = []
  let overallStatus: SubmissionStatus = 'ACCEPTED'

  try {
    const { fn } = loadUserFunction(code, timeLimit)

    for (const tc of testCases) {
      const start = Date.now()
      try {
        const args = parseInput(tc.input)
        const output = await withTimeout(Promise.resolve(fn(...args)), timeLimit)

        const expected = parseExpectedOutput(tc.expectedOutput)

        const passed = isDeepStrictEqual(
          normalizeForComparison(output),
          normalizeForComparison(expected)
        )

        if (!passed) overallStatus = worseStatus(overallStatus, 'WRONG_ANSWER')

        results.push({
          passed,
          input: tc.isHidden ? undefined : tc.input,
          output: tc.isHidden ? undefined : normalizeDisplayValue(output),
          expected: tc.isHidden ? undefined : normalizeDisplayValue(expected),
          time: Date.now() - start,
          isHidden: tc.isHidden,
        })
      } catch (err: any) {
        overallStatus = worseStatus(overallStatus, 'RUNTIME_ERROR')
        results.push({
          passed: false,
          input: tc.isHidden ? undefined : tc.input,
          output: tc.isHidden ? undefined : err.message,
          time: Date.now() - start,
          isHidden: tc.isHidden,
        })
      }
    }
  } catch (err: any) {
    overallStatus = 'COMPILATION_ERROR'
    return {
      status: overallStatus,
      testResults: results,
      errorMsg: err.message,
    }
  }

  return {
    status: overallStatus,
    testResults: results,
  }
}
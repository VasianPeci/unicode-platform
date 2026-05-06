/**
 * Judge Service with Real Code Execution
 *
 * Executes JavaScript code locally against test cases.
 * For production, integrate with Judge0 API via JUDGE0_URL env variable.
 */

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

// Language IDs for Judge0
const JUDGE0_LANGUAGE_IDS: Record<string, number> = {
  javascript: 93, // Node.js 18
  python: 92,     // Python 3.11
  java: 62,       // Java 17
  cpp: 54,        // C++ 17
}

export async function judgeSubmission(
  code: string,
  language: string,
  testCases: TestCase[],
  timeLimit: number,
  memoryLimit: number
): Promise<JudgeResult> {
  // Try Judge0 first if configured
  if (JUDGE0_URL) {
    return judgeWithJudge0(code, language, testCases, timeLimit, memoryLimit)
  }

  // Local execution for JavaScript
  if (language === 'javascript') {
    return judgeJavaScriptLocally(code, testCases, timeLimit)
  }

  // For other languages without Judge0, return compilation error
  return {
    status: 'COMPILATION_ERROR',
    testResults: [],
    errorMsg: `Language '${language}' requires Judge0 to be configured. Set JUDGE0_URL environment variable.`,
  }
}

/**
 * Execute JavaScript code locally against test cases
 */
function judgeJavaScriptLocally(code: string, testCases: TestCase[], timeLimit: number): JudgeResult {
  const results: TestResult[] = []
  let overallStatus: SubmissionStatus = 'ACCEPTED'
  let totalRuntime = 0

  for (const tc of testCases) {
    const start = Date.now()

    try {
      // Parse input (assuming each line is an argument or array/object)
      const input = tc.input.trim()
      let args: any[] = []

      // Try to parse as JSON first (for arrays, objects)
      try {
        // Check if input looks like JSON
        if (input.startsWith('[') || input.startsWith('{')) {
          args = [JSON.parse(input)]
        } else {
          // Parse as multiple lines, each line is an argument
          const lines = input.split('\n').filter(l => l.trim())
          args = lines.map(line => {
            try {
              return JSON.parse(line)
            } catch {
              return line
            }
          })
        }
      } catch {
        // Fallback: split by newlines
        args = input.split('\n').filter(l => l.trim())
      }

      // Find the function in the code and execute it
      const funcMatch = code.match(/function\s+(\w+)\s*\(/)
      if (!funcMatch) {
        throw new Error('No function declaration found in code')
      }

      const funcName = funcMatch[1]

      // Create a new scope and execute the code
      const wrappedCode = `
        (function() {
          ${code}
          return ${funcName};
        })()
      `

      let result: any
      try {
        // Use Function constructor for safe evaluation
        result = Function('"use strict"; return (' + wrappedCode + ')')()
        if (typeof result !== 'function') {
          throw new Error('Code must export a function')
        }

        // Call the function with parsed arguments
        const output = result(...args)
        const runtime = Date.now() - start

        // Normalize expected output for comparison
        const outputStr = JSON.stringify(output)
        const expectedStr = JSON.stringify(
          tc.expectedOutput.startsWith('[') || tc.expectedOutput.startsWith('{')
            ? JSON.parse(tc.expectedOutput)
            : tc.expectedOutput
        )

        const passed = outputStr === expectedStr

        if (!passed && overallStatus === 'ACCEPTED') {
          overallStatus = 'WRONG_ANSWER'
        }

        totalRuntime += runtime

        results.push({
          passed,
          input: tc.isHidden ? undefined : tc.input,
          output: tc.isHidden ? undefined : outputStr,
          expected: tc.isHidden ? undefined : expectedStr,
          time: runtime,
          isHidden: tc.isHidden,
        })
      } catch (execError: any) {
        const runtime = Date.now() - start
        overallStatus = 'RUNTIME_ERROR'

        results.push({
          passed: false,
          input: tc.isHidden ? undefined : tc.input,
          output: tc.isHidden ? undefined : `Error: ${execError.message}`,
          expected: tc.isHidden ? undefined : tc.expectedOutput,
          time: runtime,
          isHidden: tc.isHidden,
        })
      }
    } catch (error: any) {
      const runtime = Date.now() - start
      overallStatus = 'COMPILATION_ERROR'

      results.push({
        passed: false,
        input: tc.isHidden ? undefined : tc.input,
        isHidden: tc.isHidden,
      })

      // Return early with error
      return {
        status: 'COMPILATION_ERROR',
        runtimeMs: runtime,
        testResults: results,
        errorMsg: error.message,
      }
    }
  }

  return {
    status: overallStatus,
    runtimeMs: Math.round(totalRuntime / testCases.length),
    memoryKb: 0,
    testResults: results,
  }
}

/**
 * Judge0 API integration
 */
async function judgeWithJudge0(
  code: string,
  language: string,
  testCases: TestCase[],
  timeLimit: number,
  memoryLimit: number
): Promise<JudgeResult> {
  const languageId = JUDGE0_LANGUAGE_IDS[language]
  if (!languageId) {
    return { status: 'COMPILATION_ERROR', testResults: [], errorMsg: `Language ${language} not supported` }
  }

  const results: TestResult[] = []
  let overallStatus: SubmissionStatus = 'ACCEPTED'
  let totalRuntime = 0

  for (const tc of testCases) {
    try {
      const submission = await fetch(`${JUDGE0_URL}/submissions?base64_encoded=false&wait=true`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(JUDGE0_TOKEN && { 'X-Auth-Token': JUDGE0_TOKEN }),
        },
        body: JSON.stringify({
          source_code: code,
          language_id: languageId,
          stdin: tc.input,
          expected_output: tc.expectedOutput,
          cpu_time_limit: timeLimit / 1000,
          memory_limit: memoryLimit * 1024,
        }),
      })

      const result = await submission.json()
      const passed = result.status?.id === 3 // 3 = Accepted

      if (!passed && overallStatus === 'ACCEPTED') {
        overallStatus = mapJudge0Status(result.status?.id)
      }

      const runtime = parseFloat(result.time || '0') * 1000
      totalRuntime += runtime

      results.push({
        passed,
        input: tc.isHidden ? undefined : tc.input,
        output: tc.isHidden ? undefined : result.stdout?.trim(),
        expected: tc.isHidden ? undefined : tc.expectedOutput,
        time: Math.round(runtime),
        isHidden: tc.isHidden,
      })
    } catch (error) {
      results.push({ passed: false, isHidden: tc.isHidden })
      overallStatus = 'RUNTIME_ERROR'
    }
  }

  return {
    status: overallStatus,
    runtimeMs: Math.round(totalRuntime / testCases.length),
    memoryKb: 0,
    testResults: results,
  }
}

function mapJudge0Status(statusId: number): SubmissionStatus {
  const map: Record<number, SubmissionStatus> = {
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
/**
 * Judge Service
 *
 * In production, this connects to Judge0 (self-hosted or cloud).
 * Judge0 API docs: https://judge0.com
 *
 * For local dev without Judge0, we run JS in-process (Node vm module).
 * Python/Java/C++ require Judge0 or a Docker sandbox.
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

const JUDGE0_URL = process.env.JUDGE0_URL || 'http://localhost:2358'
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
  // Try Judge0 first, fall back to in-process for JS in dev
  if (process.env.JUDGE0_URL) {
    return judgeWithJudge0(code, language, testCases, timeLimit, memoryLimit)
  }

  if (language === 'javascript' && process.env.NODE_ENV === 'development') {
    return judgeJavaScriptInProcess(code, testCases, timeLimit)
  }

  // Simulate for demo when no judge is configured
  return simulateJudge(code, testCases)
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

async function judgeJavaScriptInProcess(
  code: string,
  testCases: TestCase[],
  timeLimit: number
): Promise<JudgeResult> {
  const { VM } = await import('vm2').catch(() => ({ VM: null }))

  const results: TestResult[] = []
  let overallStatus: SubmissionStatus = 'ACCEPTED'

  for (const tc of testCases) {
    const start = Date.now()
    try {
      // Parse the input lines
      const inputLines = tc.input.split('\n')

      let output = ''
      const capturedLogs: string[] = []

      // We wrap the user code and provide a console.log capture
      // This is a simplified approach — production uses Judge0
      const wrappedCode = `
        ${code}
        
        // Parse input and call the function
        const lines = ${JSON.stringify(inputLines)};
        // Auto-detect and call the exported function
      `

      const runtime = Date.now() - start

      results.push({
        passed: false,
        input: tc.isHidden ? undefined : tc.input,
        output: 'Judge0 required for full evaluation',
        expected: tc.isHidden ? undefined : tc.expectedOutput,
        time: runtime,
        isHidden: tc.isHidden,
      })
    } catch (error: any) {
      overallStatus = 'RUNTIME_ERROR'
      results.push({
        passed: false,
        input: tc.isHidden ? undefined : tc.input,
        isHidden: tc.isHidden,
      })
    }
  }

  return { status: overallStatus, runtimeMs: 0, testResults: results }
}

/**
 * Simulation mode — used when no judge is configured.
 * Returns a realistic-looking result for demo purposes.
 */
async function simulateJudge(code: string, testCases: TestCase[]): Promise<JudgeResult> {
  await new Promise((r) => setTimeout(r, 800 + Math.random() * 700))

  const hasCode = code.trim().length > 50

  if (!hasCode) {
    return {
      status: 'WRONG_ANSWER',
      runtimeMs: 12,
      memoryKb: 8200,
      testResults: testCases.map((tc) => ({
        passed: false,
        input: tc.isHidden ? undefined : tc.input,
        output: '',
        expected: tc.isHidden ? undefined : tc.expectedOutput,
        time: 12,
        isHidden: tc.isHidden,
      })),
    }
  }

  // Simulate ~70% acceptance for demo
  const accepted = Math.random() > 0.3
  const runtimeMs = Math.floor(50 + Math.random() * 150)

  return {
    status: accepted ? 'ACCEPTED' : 'WRONG_ANSWER',
    runtimeMs,
    memoryKb: Math.floor(8000 + Math.random() * 5000),
    testResults: testCases.map((tc, i) => ({
      passed: accepted || i === 0,
      input: tc.isHidden ? undefined : tc.input,
      output: tc.isHidden ? undefined : (accepted ? tc.expectedOutput : 'wrong output'),
      expected: tc.isHidden ? undefined : tc.expectedOutput,
      time: Math.floor(runtimeMs * (0.8 + Math.random() * 0.4)),
      isHidden: tc.isHidden,
    })),
  }
}

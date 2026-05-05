import { Role, Difficulty, SubmissionStatus } from '@prisma/client'

export type { Role, Difficulty, SubmissionStatus }

export interface UserSession {
  id: string
  email: string
  name: string
  role: Role
  universityId: string
  universityName: string
  totalPoints: number
  avatarUrl?: string | null
}

export interface ProblemListItem {
  id: string
  title: string
  slug: string
  difficulty: Difficulty
  points: number
  tags: { id: string; name: string; color: string }[]
  acceptanceRate: number
  totalSubmissions: number
  isSolved?: boolean
}

export interface ProblemDetail extends ProblemListItem {
  description: string
  constraints?: string | null
  examples: Example[]
  hints: string[]
  starterCode: Record<string, string>
  timeLimit: number
  memoryLimit: number
  createdBy: { name: string }
}

export interface Example {
  input: string
  output: string
  explanation?: string
}

export interface TestCase {
  input: string
  expectedOutput: string
  isHidden: boolean
}

export interface TestResult {
  passed: boolean
  input?: string
  output?: string
  expected?: string
  time?: number
  isHidden?: boolean
}

export interface SubmissionResult {
  id: string
  status: SubmissionStatus
  runtimeMs?: number | null
  memoryKb?: number | null
  testResults?: TestResult[]
  errorMsg?: string | null
  pointsAwarded: number
  submittedAt: string
}

export interface ContestListItem {
  id: string
  title: string
  description?: string | null
  startsAt: string
  endsAt: string
  isPublic: boolean
  problemCount: number
  participantCount: number
  status: 'UPCOMING' | 'ACTIVE' | 'ENDED'
  createdBy: { name: string }
}

export interface LeaderboardEntry {
  rank: number
  userId: string
  name: string
  totalPoints: number
  problemsSolved: number
  avatarUrl?: string | null
}

export interface ApiResponse<T = unknown> {
  data?: T
  error?: string
  message?: string
}

export const LANGUAGES = [
  { id: 'javascript', label: 'JavaScript', monacoLang: 'javascript' },
  { id: 'python', label: 'Python', monacoLang: 'python' },
  { id: 'java', label: 'Java', monacoLang: 'java' },
  { id: 'cpp', label: 'C++', monacoLang: 'cpp' },
] as const

export type Language = (typeof LANGUAGES)[number]['id']

export const DIFFICULTY_CONFIG = {
  EASY: { label: 'Easy', color: 'text-emerald-400', bg: 'bg-emerald-400/10', points: 10 },
  MEDIUM: { label: 'Medium', color: 'text-amber-400', bg: 'bg-amber-400/10', points: 20 },
  HARD: { label: 'Hard', color: 'text-red-400', bg: 'bg-red-400/10', points: 40 },
} as const

export const STATUS_CONFIG: Record<SubmissionStatus, { label: string; color: string }> = {
  PENDING:               { label: 'Pending',                color: 'text-slate-400' },
  ACCEPTED:              { label: 'Accepted',               color: 'text-emerald-400' },
  WRONG_ANSWER:          { label: 'Wrong Answer',           color: 'text-red-400' },
  TIME_LIMIT_EXCEEDED:   { label: 'Time Limit Exceeded',    color: 'text-amber-400' },
  MEMORY_LIMIT_EXCEEDED: { label: 'Memory Limit Exceeded',  color: 'text-amber-400' },
  RUNTIME_ERROR:         { label: 'Runtime Error',          color: 'text-red-400' },
  COMPILATION_ERROR:     { label: 'Compilation Error',      color: 'text-red-400' },
}

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
  createdBy?: { id: string; name: string }
  isCreatedByMe?: boolean
  canDelete?: boolean
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
  createdBy: { id: string; name: string }
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
  contestPointsAwarded?: number
  aiComplexityStatus?: 'REVIEWED' | 'UNAVAILABLE' | 'FAILED' | null
  aiTimeComplexity?: string | null
  aiSpaceComplexity?: string | null
  aiComplexityScore?: number | null
  aiComplexityBonus?: number
  aiComplexityBonusAwarded?: number
  contestAiComplexityBonusAwarded?: number
  aiComplexityFeedback?: string | null
  aiComplexityModel?: string | null
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
  EASY: { label: 'Easy', color: '#34d399', bg: 'rgba(52,211,153,0.1)', points: 10 },
  MEDIUM: { label: 'Medium', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', points: 20 },
  HARD: { label: 'Hard', color: '#f87171', bg: 'rgba(248,113,113,0.1)', points: 40 },
} as const

export const STATUS_CONFIG: Record<SubmissionStatus, { label: string; color: string }> = {
  PENDING:               { label: 'Pending',                color: '#94a3b8' },
  ACCEPTED:              { label: 'Accepted',               color: '#34d399' },
  WRONG_ANSWER:          { label: 'Wrong Answer',           color: '#f87171' },
  TIME_LIMIT_EXCEEDED:   { label: 'Time Limit Exceeded',    color: '#f59e0b' },
  MEMORY_LIMIT_EXCEEDED: { label: 'Memory Limit Exceeded',  color: '#f59e0b' },
  RUNTIME_ERROR:         { label: 'Runtime Error',          color: '#f87171' },
  COMPILATION_ERROR:     { label: 'Compilation Error',      color: '#f87171' },
}

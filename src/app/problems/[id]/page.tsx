'use client'
import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import {
  Play, ChevronDown, ChevronUp, Lightbulb, Clock, HardDrive,
  CheckCircle2, XCircle, Loader2, RotateCcw, ArrowLeft, ArrowRight, Trophy, Flag, Sparkles
} from 'lucide-react'
import { DIFFICULTY_CONFIG, LANGUAGES, STATUS_CONFIG } from '@/types'
import type { ProblemDetail, SubmissionResult, Language } from '@/types'

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false })

type ContestProblemNav = {
  id: string
  title: string
  slug: string
}

export default function ProblemPage() {
  const { id } = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const contestId = searchParams.get('contestId')
  const [problem, setProblem] = useState<ProblemDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [language, setLanguage] = useState<Language>('javascript')
  const [code, setCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<SubmissionResult | null>(null)
  const [activeTab, setActiveTab] = useState<'description' | 'submissions'>('description')
  const [showHints, setShowHints] = useState(false)
  const [contestTitle, setContestTitle] = useState('')
  const [contestProblems, setContestProblems] = useState<ContestProblemNav[]>([])

  useEffect(() => {
    fetch(`/api/problems/${id}`)
      .then(r => r.json())
      .then(data => {
        setProblem(data.data)
        setCode((data.data?.starterCode as Record<string, string>)?.[language] || '')
        setLoading(false)
      })
  }, [id])

  useEffect(() => {
    if (problem) {
      setCode((problem.starterCode as Record<string, string>)?.[language] || '')
    }
  }, [language, problem])

  useEffect(() => {
    if (!contestId) {
      setContestTitle('')
      setContestProblems([])
      return
    }

    fetch(`/api/contests/${contestId}`)
      .then(r => r.json())
      .then(data => {
        const contest = data.data
        setContestTitle(contest?.title || '')
        setContestProblems(
          (contest?.problems || []).map((cp: any) => ({
            id: cp.problem.id,
            title: cp.problem.title,
            slug: cp.problem.slug,
          }))
        )
      })
      .catch(() => {
        setContestTitle('')
        setContestProblems([])
      })
  }, [contestId])

  async function handleSubmit() {
    if (!problem || !code.trim()) return
    setSubmitting(true)
    setResult(null)

    const res = await fetch('/api/submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, language, problemId: problem.id, contestId }),
    })
    const data = await res.json()
    setResult(data.data)
    if (data.data?.status === 'ACCEPTED' && data.data?.pointsAwarded > 0) {
      window.dispatchEvent(new Event('unicode-points-changed'))
    }
    setSubmitting(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <Loader2 size={24} className="animate-spin" style={{ color: 'var(--accent)' }} />
    </div>
  )

  if (!problem) return (
    <div className="flex items-center justify-center h-full" style={{ color: 'var(--text-muted)' }}>
      Problem not found
    </div>
  )

  const diff = DIFFICULTY_CONFIG[problem.difficulty as 'EASY' | 'MEDIUM' | 'HARD']
  const contestProblemIndex = contestProblems.findIndex(p => p.id === problem.id || p.slug === problem.slug)
  const previousContestProblem = contestProblemIndex > 0 ? contestProblems[contestProblemIndex - 1] : null
  const nextContestProblem = contestProblemIndex >= 0 && contestProblemIndex < contestProblems.length - 1
    ? contestProblems[contestProblemIndex + 1]
    : null
  const hasContestNavigation = contestProblems.length > 0 && contestProblemIndex >= 0
  const contestHref = contestId ? `/contests/${contestId}` : ''
  const contestProblemHref = (slug: string) => `/problems/${slug}?contestId=${contestId}`

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left panel - Problem description */}
      <div className="w-[45%] border-r overflow-y-auto flex flex-col"
        style={{ borderColor: 'var(--border)' }}>
        {/* Header */}
        <div className="px-6 py-5 sticky top-0 z-10" style={{ background: 'var(--bg-base)', borderBottom: '1px solid var(--border)' }}>
          {contestId && (
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <Link href={contestHref}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)', textDecoration: 'none' }}>
                <Trophy size={13} /> Back to contest
              </Link>

              {hasContestNavigation && (
                <div className="flex items-center gap-2">
                  <span className="hidden sm:inline text-xs" style={{ color: 'var(--text-muted)' }}>
                    {contestTitle ? `${contestTitle} - ` : ''}
                    Problem {contestProblemIndex + 1} of {contestProblems.length}
                  </span>

                  {previousContestProblem ? (
                    <Link href={contestProblemHref(previousContestProblem.slug)}
                      className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg"
                      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)', textDecoration: 'none' }}>
                      <ArrowLeft size={13} /> Previous
                    </Link>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg"
                      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-muted)', opacity: 0.5 }}>
                      <ArrowLeft size={13} /> Previous
                    </span>
                  )}

                  {nextContestProblem ? (
                    <Link href={contestProblemHref(nextContestProblem.slug)}
                      className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg"
                      style={{ background: 'var(--accent)', color: '#fff', textDecoration: 'none' }}>
                      Next <ArrowRight size={13} />
                    </Link>
                  ) : (
                    <Link href={contestHref}
                      className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg"
                      style={{ background: 'var(--accent)', color: '#fff', textDecoration: 'none' }}>
                      <Flag size={13} /> Finish
                    </Link>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-3 mb-2">
            <span className="text-xs font-medium px-2 py-0.5 rounded-md"
              style={{ color: diff.color, background: diff.bg }}>
              {diff.label}
            </span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{problem.points} pts</span>
            {problem.isCreatedByMe && (
              <span className="text-xs px-2 py-0.5 rounded-md"
                style={{ color: 'var(--accent)', background: 'var(--accent-dim)' }}>
                Created by you
              </span>
            )}
            {problem.isSolved && (
              <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--success)' }}>
                <CheckCircle2 size={12} /> Solved
              </span>
            )}
          </div>
          <h1 className="text-xl font-bold">{problem.title}</h1>

          {/* Tags */}
          {problem.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {problem.tags.map(tag => (
                <span key={tag.id} className="text-xs px-2 py-0.5 rounded-md"
                  style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                  {tag.name}
                </span>
              ))}
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-4 mt-4">
            {(['description', 'submissions'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className="text-sm font-medium pb-2 transition-all capitalize"
                style={{
                  color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-muted)',
                  borderBottom: activeTab === tab ? '2px solid var(--accent)' : '2px solid transparent',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0 0 8px 0',
                }}>
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 px-6 py-5">
          {activeTab === 'description' ? (
            <div className="space-y-6">
              {/* Description */}
              <div className="prose-dark text-sm leading-relaxed"
                dangerouslySetInnerHTML={{ __html: problem.description
                  .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                  .replace(/\*(.*?)\*/g, '<em>$1</em>')
                  .replace(/`(.*?)`/g, '<code>$1</code>')
                  .replace(/\n/g, '<br/>')
                }} />

              {/* Examples */}
              {problem.examples && (problem.examples as any[]).length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-3">Examples</h3>
                  {(problem.examples as any[]).map((ex, i) => (
                    <div key={i} className="mb-4 rounded-xl overflow-hidden"
                      style={{ border: '1px solid var(--border)' }}>
                      <div className="px-4 py-2 text-xs font-medium"
                        style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>
                        Example {i + 1}
                      </div>
                      <div className="px-4 py-3 space-y-2 font-mono text-xs"
                        style={{ background: 'var(--bg-surface)' }}>
                        <div><span style={{ color: 'var(--text-muted)' }}>Input: </span>
                          <span style={{ color: 'var(--text-primary)' }}>{ex.input}</span></div>
                        <div><span style={{ color: 'var(--text-muted)' }}>Output: </span>
                          <span style={{ color: 'var(--success)' }}>{ex.output}</span></div>
                        {ex.explanation && (
                          <div style={{ color: 'var(--text-secondary)' }}>Explanation: {ex.explanation}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Constraints */}
              {problem.constraints && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">Constraints</h3>
                  <div className="rounded-xl p-4 font-mono text-xs"
                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                    {problem.constraints.split('\n').map((c, i) => <div key={i}>{c}</div>)}
                  </div>
                </div>
              )}

              {/* Hints */}
              {problem.hints && (problem.hints as string[]).length > 0 && (
                <div>
                  <button onClick={() => setShowHints(h => !h)}
                    className="flex items-center gap-2 text-sm font-medium transition-colors"
                    style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}>
                    <Lightbulb size={15} />
                    {showHints ? 'Hide hints' : `Show hints (${(problem.hints as string[]).length})`}
                    {showHints ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                  {showHints && (
                    <div className="mt-3 space-y-2">
                      {(problem.hints as string[]).map((hint, i) => (
                        <div key={i} className="flex gap-3 p-3 rounded-xl text-sm"
                          style={{ background: 'var(--accent-dim)', border: '1px solid var(--border-accent)', color: 'var(--text-secondary)' }}>
                          <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{i + 1}.</span>
                          {hint}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <SubmissionsList problemId={problem.id} />
          )}
        </div>
      </div>

      {/* Right panel - Editor */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Editor toolbar */}
        <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
          <select
            value={language}
            onChange={e => setLanguage(e.target.value as Language)}
            className="px-3 py-1.5 rounded-lg text-sm"
            style={{
              background: 'var(--bg-elevated)', border: '1px solid var(--border)',
              color: 'var(--text-primary)', outline: 'none', cursor: 'pointer',
            }}
          >
            {LANGUAGES.map(l => (
              <option key={l.id} value={l.id}>{l.label}</option>
            ))}
          </select>

          <button
            onClick={() => setCode((problem.starterCode as Record<string, string>)?.[language] || '')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all ml-auto"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <RotateCcw size={12} /> Reset
          </button>

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center gap-2 px-5 py-1.5 rounded-lg text-sm font-medium transition-all"
            style={{
              background: submitting ? 'var(--accent-dim)' : 'var(--accent)',
              color: '#fff', border: 'none', cursor: submitting ? 'not-allowed' : 'pointer',
            }}
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            {submitting ? 'Reviewing...' : 'Submit'}
          </button>
        </div>

        {/* Monaco */}
        <div className="flex-1 overflow-hidden">
          <MonacoEditor
            height="100%"
            language={LANGUAGES.find(l => l.id === language)?.monacoLang || 'javascript'}
            value={code}
            onChange={v => setCode(v || '')}
            theme="vs-dark"
            options={{
              fontSize: 14,
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              fontLigatures: true,
              lineHeight: 22,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              padding: { top: 16, bottom: 16 },
              wordWrap: 'on',
              automaticLayout: true,
              tabSize: 2,
              renderLineHighlight: 'gutter',
            }}
          />
        </div>

        {/* Result panel */}
        {result && (
          <div className="flex-shrink-0 border-t overflow-y-auto max-h-80"
            style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
            <SubmissionResultPanel result={result} />
          </div>
        )}
      </div>
    </div>
  )
}

function SubmissionResultPanel({ result }: { result: SubmissionResult }) {
  const status = STATUS_CONFIG[result.status as keyof typeof STATUS_CONFIG]
  const accepted = result.status === 'ACCEPTED'

  return (
    <div className="p-5">
      <div className="flex items-center gap-3 mb-4">
        {accepted
          ? <CheckCircle2 size={20} style={{ color: 'var(--success)' }} />
          : <XCircle size={20} style={{ color: 'var(--danger)' }} />
        }
        <span className="font-semibold" style={{ color: accepted ? 'var(--success)' : 'var(--danger)' }}>
          {status.label}
        </span>
        {accepted && result.pointsAwarded > 0 && (
          <span className="text-sm px-2 py-0.5 rounded-md font-medium"
            style={{ background: 'rgba(52,211,153,0.1)', color: 'var(--success)' }}>
            +{result.pointsAwarded} pts
          </span>
        )}
        {accepted && (result.contestPointsAwarded || 0) > 0 && result.contestPointsAwarded !== result.pointsAwarded && (
          <span className="text-sm px-2 py-0.5 rounded-md font-medium"
            style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
            +{result.contestPointsAwarded} contest pts
          </span>
        )}
        {result.runtimeMs && (
          <span className="ml-auto text-xs flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
            <Clock size={12} /> {result.runtimeMs}ms
          </span>
        )}
        {result.memoryKb && (
          <span className="text-xs flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
            <HardDrive size={12} /> {Math.round(result.memoryKb / 1024 * 10) / 10}MB
          </span>
        )}
      </div>

      {result.errorMsg && (
        <pre className="text-xs p-3 rounded-xl overflow-x-auto mb-4"
          style={{ background: 'rgba(248,113,113,0.08)', color: 'var(--danger)', border: '1px solid rgba(248,113,113,0.2)' }}>
          {result.errorMsg}
        </pre>
      )}

      {result.aiComplexityFeedback && (
        <AiComplexityPanel result={result} accepted={accepted} />
      )}

      {result.testResults && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {(result.testResults as any[]).map((tr, i) => (
            <div key={i} className="rounded-lg p-3 text-xs"
              style={{
                background: tr.passed ? 'rgba(52,211,153,0.08)' : 'rgba(248,113,113,0.08)',
                border: `1px solid ${tr.passed ? 'rgba(52,211,153,0.2)' : 'rgba(248,113,113,0.2)'}`,
              }}>
              <div className="flex items-center gap-1.5 font-medium mb-1"
                style={{ color: tr.passed ? 'var(--success)' : 'var(--danger)' }}>
                {tr.passed ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                {tr.isHidden ? 'Hidden test' : `Test ${i + 1}`}
              </div>
              {!tr.isHidden && tr.output && (
                <div style={{ color: 'var(--text-muted)' }}>
                  Got: <span style={{ color: 'var(--text-secondary)' }}>{tr.output}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function AiComplexityPanel({ result, accepted }: { result: SubmissionResult; accepted: boolean }) {
  const reviewed = result.aiComplexityStatus === 'REVIEWED'
  const bonusAwarded = result.aiComplexityBonusAwarded || 0
  const contestBonusAwarded = result.contestAiComplexityBonusAwarded || 0
  const assessedBonus = result.aiComplexityBonus || 0
  const scoreLabel = typeof result.aiComplexityScore === 'number' ? `${result.aiComplexityScore}/10` : 'No score'
  const bonusMessage = accepted
    ? bonusAwarded > 0
      ? `+${bonusAwarded} complexity bonus awarded`
      : assessedBonus > 0
        ? 'Complexity bonus matched your previous best'
        : 'No complexity bonus awarded'
    : assessedBonus > 0
      ? `Potential +${assessedBonus} after an accepted solution`
      : 'Bonus applies to accepted solutions'

  return (
    <div className="rounded-xl p-3 mb-4 text-xs"
      style={{
        background: reviewed ? 'rgba(99,102,241,0.08)' : 'rgba(148,163,184,0.08)',
        border: `1px solid ${reviewed ? 'rgba(99,102,241,0.22)' : 'rgba(148,163,184,0.18)'}`,
      }}>
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <Sparkles size={13} style={{ color: reviewed ? 'var(--accent)' : 'var(--text-muted)' }} />
        <span className="font-semibold" style={{ color: reviewed ? 'var(--accent)' : 'var(--text-secondary)' }}>
          AI Complexity Review
        </span>
        <span className="px-2 py-0.5 rounded-md"
          style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
          {scoreLabel}
        </span>
        <span className="px-2 py-0.5 rounded-md"
          style={{ background: bonusAwarded > 0 ? 'rgba(52,211,153,0.1)' : 'var(--bg-elevated)', color: bonusAwarded > 0 ? 'var(--success)' : 'var(--text-muted)', border: '1px solid var(--border)' }}>
          {bonusMessage}
        </span>
        {contestBonusAwarded > 0 && contestBonusAwarded !== bonusAwarded && (
          <span className="px-2 py-0.5 rounded-md"
            style={{ background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--border-accent)' }}>
            +{contestBonusAwarded} contest complexity
          </span>
        )}
      </div>

      {(result.aiTimeComplexity || result.aiSpaceComplexity) && (
        <div className="grid grid-cols-2 gap-2 mb-2">
          <div style={{ color: 'var(--text-muted)' }}>
            Time: <span style={{ color: 'var(--text-secondary)' }}>{result.aiTimeComplexity || 'Unknown'}</span>
          </div>
          <div style={{ color: 'var(--text-muted)' }}>
            Space: <span style={{ color: 'var(--text-secondary)' }}>{result.aiSpaceComplexity || 'Unknown'}</span>
          </div>
        </div>
      )}

      <p style={{ color: 'var(--text-secondary)' }}>{result.aiComplexityFeedback}</p>
    </div>
  )
}

function SubmissionsList({ problemId }: { problemId: string }) {
  const [subs, setSubs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/submissions?problemId=${problemId}`)
      .then(r => r.json())
      .then(d => { setSubs(d.data || []); setLoading(false) })
  }, [problemId])

  if (loading) return <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>Loading...</div>
  if (subs.length === 0) return <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>No submissions yet</div>

  return (
    <div className="space-y-2">
      {subs.map(sub => {
        const status = STATUS_CONFIG[sub.status as keyof typeof STATUS_CONFIG]
        return (
          <div key={sub.id} className="flex items-center gap-4 p-3 rounded-xl text-sm"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            <span style={{ color: status.color }}>{status.label}</span>
            <span style={{ color: 'var(--text-muted)' }} className="text-xs">{sub.language}</span>
            {sub.runtimeMs && <span style={{ color: 'var(--text-muted)' }} className="text-xs">{sub.runtimeMs}ms</span>}
            {typeof sub.aiComplexityScore === 'number' && (
              <span style={{ color: 'var(--accent)' }} className="text-xs">
                AI {sub.aiComplexityScore}/10
              </span>
            )}
            {sub.aiComplexityBonusAwarded > 0 && (
              <span style={{ color: 'var(--success)' }} className="text-xs">
                +{sub.aiComplexityBonusAwarded} bonus
              </span>
            )}
            <span style={{ color: 'var(--text-muted)' }} className="text-xs ml-auto">
              {new Date(sub.submittedAt).toLocaleDateString()}
            </span>
          </div>
        )
      })}
    </div>
  )
}

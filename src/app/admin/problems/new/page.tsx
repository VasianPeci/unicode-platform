'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Loader2, BookOpen, Eye, EyeOff } from 'lucide-react'

const DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD']
const LANGUAGES = ['javascript', 'python', 'java', 'cpp']

interface TestCase {
  input: string
  expectedOutput: string
  isHidden: boolean
}

export default function CreateProblemPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    title: '',
    description: '',
    difficulty: 'EASY',
    points: 10,
    timeLimit: 2000,
    memoryLimit: 256,
    constraints: '',
  })

  const [testCases, setTestCases] = useState<TestCase[]>([
    { input: '', expectedOutput: '', isHidden: false },
  ])

  const [examples, setExamples] = useState([
    { input: '', output: '', explanation: '' },
  ])

  const [hints, setHints] = useState([''])
  const [starterCode, setStarterCode] = useState({
    javascript: `function solution() {\n  // Your solution here\n};`,
    python: `class Solution:\n    def solution(self):\n        # Your solution here\n        pass`,
    java: `class Solution {\n    public void solution() {\n        // Your solution here\n    }\n}`,
    cpp: `class Solution {\npublic:\n    void solution() {\n        // Your solution here\n    }\n};`,
  })

  const inputStyle = {
    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
    color: 'var(--text-primary)', outline: 'none',
  }

  const set = (f: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [f]: e.target.value }))

  async function handleSubmit(e: React.FormEvent, publish = false) {
    e.preventDefault()
    setLoading(true); setError('')

    const res = await fetch('/api/problems', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        points: Number(form.points),
        timeLimit: Number(form.timeLimit),
        memoryLimit: Number(form.memoryLimit),
        testCases,
        examples: examples.filter(ex => ex.input || ex.output),
        hints: hints.filter(Boolean),
        starterCode,
        isPublished: publish,
      }),
    })

    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Failed to create problem'); setLoading(false); return }

    router.push('/problems')
  }

  const addTestCase = () => setTestCases(prev => [...prev, { input: '', expectedOutput: '', isHidden: false }])
  const removeTestCase = (i: number) => setTestCases(prev => prev.filter((_, idx) => idx !== i))
  const updateTestCase = (i: number, field: keyof TestCase, value: string | boolean) =>
    setTestCases(prev => prev.map((tc, idx) => idx === i ? { ...tc, [field]: value } : tc))

  const sectionTitle = (title: string) => (
    <h2 className="text-base font-semibold mb-4 pb-3" style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-primary)' }}>
      {title}
    </h2>
  )

  return (
    <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-1 flex items-center gap-3">
              <BookOpen size={28} style={{ color: 'var(--accent)' }} />
              Create Problem
            </h1>
            <p style={{ color: 'var(--text-secondary)' }}>Add a new coding problem for students</p>
          </div>

          <form className="space-y-8">
            {/* Basic info */}
            <div className="glass rounded-2xl p-6">
              {sectionTitle('Basic Information')}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Title</label>
                  <input value={form.title} onChange={set('title')}
                    required className="w-full px-4 py-3 rounded-xl text-sm transition-all" style={inputStyle}
                    onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border)'} />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Difficulty</label>
                    <select value={form.difficulty} onChange={set('difficulty')}
                      className="w-full px-3 py-3 rounded-xl text-sm" style={{ ...inputStyle, cursor: 'pointer' }}>
                      {DIFFICULTIES.map(d => <option key={d} value={d}>{d.charAt(0) + d.slice(1).toLowerCase()}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Points</label>
                    <input type="number" value={form.points} onChange={set('points')} min={1}
                      className="w-full px-4 py-3 rounded-xl text-sm" style={inputStyle}
                      onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                      onBlur={e => e.target.style.borderColor = 'var(--border)'} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Time Limit (ms)</label>
                    <input type="number" value={form.timeLimit} onChange={set('timeLimit')} min={500}
                      className="w-full px-4 py-3 rounded-xl text-sm" style={inputStyle}
                      onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                      onBlur={e => e.target.style.borderColor = 'var(--border)'} />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                    Description <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>(Markdown supported)</span>
                  </label>
                  <textarea value={form.description} onChange={set('description')} rows={8}
                    required className="w-full px-4 py-3 rounded-xl text-sm resize-y font-mono" style={inputStyle}
                    onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border)'} />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Constraints</label>
                  <textarea value={form.constraints} onChange={set('constraints')} rows={3}
                    className="w-full px-4 py-3 rounded-xl text-sm resize-y font-mono" style={inputStyle}
                    onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border)'} />
                </div>
              </div>
            </div>

            {/* Examples */}
            <div className="glass rounded-2xl p-6">
              {sectionTitle('Examples')}
              <div className="space-y-4">
                {examples.map((ex, i) => (
                  <div key={i} className="p-4 rounded-xl space-y-3"
                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Example {i + 1}</span>
                      {examples.length > 1 && (
                        <button type="button" onClick={() => setExamples(prev => prev.filter((_, idx) => idx !== i))}
                          className="p-1 rounded" style={{ color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer' }}>
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Input</label>
                        <textarea value={ex.input} rows={2}
                          onChange={e => setExamples(prev => prev.map((item, idx) => idx === i ? { ...item, input: e.target.value } : item))}
                          className="w-full px-3 py-2 rounded-lg text-sm font-mono resize-none"
                          style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-primary)', outline: 'none' }} />
                      </div>
                      <div>
                        <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Output</label>
                        <textarea value={ex.output} rows={2}
                          onChange={e => setExamples(prev => prev.map((item, idx) => idx === i ? { ...item, output: e.target.value } : item))}
                          className="w-full px-3 py-2 rounded-lg text-sm font-mono resize-none"
                          style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-primary)', outline: 'none' }} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Explanation (optional)</label>
                      <input value={ex.explanation}
                        onChange={e => setExamples(prev => prev.map((item, idx) => idx === i ? { ...item, explanation: e.target.value } : item))}
                        className="w-full px-3 py-2 rounded-lg text-sm"
                        style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-primary)', outline: 'none' }} />
                    </div>
                  </div>
                ))}
                <button type="button" onClick={() => setExamples(prev => [...prev, { input: '', output: '', explanation: '' }])}
                  className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl transition-all"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  <Plus size={15} /> Add example
                </button>
              </div>
            </div>

            {/* Test Cases */}
            <div className="glass rounded-2xl p-6">
              {sectionTitle('Test Cases')}
              <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
                Hidden test cases are not shown to students. Add at least 2-3 hidden cases for robust testing.
              </p>
              <div className="space-y-3">
                {testCases.map((tc, i) => (
                  <div key={i} className="p-4 rounded-xl"
                    style={{ background: 'var(--bg-elevated)', border: `1px solid ${tc.isHidden ? 'var(--border-accent)' : 'var(--border)'}` }}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Test {i + 1}</span>
                        <button type="button"
                          onClick={() => updateTestCase(i, 'isHidden', !tc.isHidden)}
                          className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg transition-all"
                          style={{
                            background: tc.isHidden ? 'var(--accent-dim)' : 'var(--bg-base)',
                            color: tc.isHidden ? 'var(--accent)' : 'var(--text-muted)',
                            border: `1px solid ${tc.isHidden ? 'var(--border-accent)' : 'var(--border)'}`,
                            cursor: 'pointer',
                          }}>
                          {tc.isHidden ? <EyeOff size={11} /> : <Eye size={11} />}
                          {tc.isHidden ? 'Hidden' : 'Visible'}
                        </button>
                      </div>
                      {testCases.length > 1 && (
                        <button type="button" onClick={() => removeTestCase(i)}
                          className="p-1 rounded" style={{ color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer' }}>
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Input (one item per line)</label>
                        <textarea value={tc.input} rows={3}
                          onChange={e => updateTestCase(i, 'input', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg text-sm font-mono resize-none"
                          style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-primary)', outline: 'none' }} />
                      </div>
                      <div>
                        <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Expected output</label>
                        <textarea value={tc.expectedOutput} rows={3}
                          onChange={e => updateTestCase(i, 'expectedOutput', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg text-sm font-mono resize-none"
                          style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-primary)', outline: 'none' }} />
                      </div>
                    </div>
                  </div>
                ))}
                <button type="button" onClick={addTestCase}
                  className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl transition-all"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  <Plus size={15} /> Add test case
                </button>
              </div>
            </div>

            {/* Starter code */}
            <div className="glass rounded-2xl p-6">
              {sectionTitle('Starter Code')}
              <div className="space-y-4">
                {LANGUAGES.map(lang => (
                  <div key={lang}>
                    <label className="block text-sm font-medium mb-2 capitalize" style={{ color: 'var(--text-secondary)' }}>
                      {lang === 'cpp' ? 'C++' : lang.charAt(0).toUpperCase() + lang.slice(1)}
                    </label>
                    <textarea value={starterCode[lang as keyof typeof starterCode]} rows={5}
                      onChange={e => setStarterCode(prev => ({ ...prev, [lang]: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl text-sm font-mono resize-y"
                      style={inputStyle}
                      onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                      onBlur={e => e.target.style.borderColor = 'var(--border)'} />
                  </div>
                ))}
              </div>
            </div>

            {/* Hints */}
            <div className="glass rounded-2xl p-6">
              {sectionTitle('Hints (optional)')}
              <div className="space-y-3">
                {hints.map((hint, i) => (
                  <div key={i} className="flex gap-2">
                    <input value={hint}
                      onChange={e => setHints(prev => prev.map((h, idx) => idx === i ? e.target.value : h))}
                      className="flex-1 px-4 py-2.5 rounded-xl text-sm" style={inputStyle}
                      onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                      onBlur={e => e.target.style.borderColor = 'var(--border)'} />
                    {hints.length > 1 && (
                      <button type="button" onClick={() => setHints(prev => prev.filter((_, idx) => idx !== i))}
                        className="p-2.5 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--danger)', cursor: 'pointer' }}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={() => setHints(prev => [...prev, ''])}
                  className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl transition-all"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  <Plus size={15} /> Add hint
                </button>
              </div>
            </div>

            {error && (
              <div className="px-4 py-3 rounded-xl text-sm"
                style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', color: 'var(--danger)' }}>
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pb-8">
              <button type="button" onClick={e => handleSubmit(e as any, false)} disabled={loading}
                className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium transition-all"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                Save Draft
              </button>
              <button type="button" onClick={e => handleSubmit(e as any, true)} disabled={loading}
                className="flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-medium transition-all"
                style={{ background: 'var(--accent)', color: '#fff', border: 'none', cursor: loading ? 'not-allowed' : 'pointer' }}>
                {loading && <Loader2 size={15} className="animate-spin" />}
                {loading ? 'Publishing...' : 'Publish Problem'}
              </button>
            </div>
          </form>
    </div>
  )
}

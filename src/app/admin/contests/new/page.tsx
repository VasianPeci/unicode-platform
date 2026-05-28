"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Trophy, Plus, X, Loader2, Search } from "lucide-react";
import { DIFFICULTY_CONFIG } from "@/types";

interface Problem {
  id: string;
  title: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  points: number;
}

export default function CreateContestPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [problems, setProblems] = useState<Problem[]>([]);
  const [selectedProblems, setSelectedProblems] = useState<Problem[]>([]);
  const [search, setSearch] = useState("");

  const [form, setForm] = useState({
    title: "",
    description: "",
    startsAt: "",
    endsAt: "",
    isPublic: true,
    rules: "",
  });

  useEffect(() => {
    fetch("/api/problems?limit=100")
      .then((r) => r.json())
      .then((d) => setProblems(d.data || []));
  }, []);

  const set =
    (f: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [f]: e.target.value }));

  const toggleProblem = (p: Problem) => {
    setSelectedProblems((prev) =>
      prev.find((sp) => sp.id === p.id)
        ? prev.filter((sp) => sp.id !== p.id)
        : [...prev, p],
    );
  };

  const filtered = problems.filter(
    (p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) &&
      !selectedProblems.find((sp) => sp.id === p.id),
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedProblems.length === 0) {
      setError("Add at least one problem");
      return;
    }
    setLoading(true);
    setError("");

    const res = await fetch("/api/contests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        problemIds: selectedProblems.map((p) => p.id),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed");
      setLoading(false);
      return;
    }
    router.push("/contests");
  }

  const inputStyle = {
    background: "var(--bg-elevated)",
    border: "1px solid var(--border)",
    color: "var(--text-primary)",
    outline: "none",
  };

  const sectionTitle = (title: string) => (
    <h2
      className="text-base font-semibold mb-4 pb-3"
      style={{ borderBottom: "1px solid var(--border)" }}
    >
      {title}
    </h2>
  );

  return (
    <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-1 flex items-center gap-3">
              <Trophy size={28} style={{ color: "var(--accent)" }} />
              Create Contest
            </h1>
            <p style={{ color: "var(--text-secondary)" }}>
              Set up a timed assessment for your students
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic info */}
            <div className="glass rounded-2xl p-6">
              {sectionTitle("Contest Details")}
              <div className="space-y-4">
                <div>
                  <label
                    className="block text-sm font-medium mb-2"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Title
                  </label>
                  <input
                    value={form.title}
                    onChange={set("title")}
                    required
                    className="w-full px-4 py-3 rounded-xl text-sm"
                    style={inputStyle}
                    onFocus={(e) =>
                      (e.target.style.borderColor = "var(--accent)")
                    }
                    onBlur={(e) =>
                      (e.target.style.borderColor = "var(--border)")
                    }
                  />
                </div>

                <div>
                  <label
                    className="block text-sm font-medium mb-2"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Description (optional)
                  </label>
                  <textarea
                    value={form.description}
                    onChange={set("description")}
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl text-sm resize-none"
                    style={inputStyle}
                    onFocus={(e) =>
                      (e.target.style.borderColor = "var(--accent)")
                    }
                    onBlur={(e) =>
                      (e.target.style.borderColor = "var(--border)")
                    }
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      className="block text-sm font-medium mb-2"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Start time
                    </label>
                    <input
                      type="datetime-local"
                      value={form.startsAt}
                      onChange={set("startsAt")}
                      required
                      className="w-full px-4 py-3 rounded-xl text-sm"
                      style={inputStyle}
                      onFocus={(e) =>
                        (e.target.style.borderColor = "var(--accent)")
                      }
                      onBlur={(e) =>
                        (e.target.style.borderColor = "var(--border)")
                      }
                    />
                  </div>
                  <div>
                    <label
                      className="block text-sm font-medium mb-2"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      End time
                    </label>
                    <input
                      type="datetime-local"
                      value={form.endsAt}
                      onChange={set("endsAt")}
                      required
                      className="w-full px-4 py-3 rounded-xl text-sm"
                      style={inputStyle}
                      onFocus={(e) =>
                        (e.target.style.borderColor = "var(--accent)")
                      }
                      onBlur={(e) =>
                        (e.target.style.borderColor = "var(--border)")
                      }
                    />
                  </div>
                </div>

                <div>
                  <label
                    className="block text-sm font-medium mb-2"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Rules (optional)
                  </label>
                  <textarea
                    value={form.rules}
                    onChange={set("rules")}
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl text-sm resize-none"
                    style={inputStyle}
                    onFocus={(e) =>
                      (e.target.style.borderColor = "var(--accent)")
                    }
                    onBlur={(e) =>
                      (e.target.style.borderColor = "var(--border)")
                    }
                  />
                </div>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isPublic}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        isPublic: e.target.checked,
                      }))
                    }
                    className="w-4 h-4 rounded"
                    style={{ accentColor: "var(--accent)" }}
                  />
                  <span
                    className="text-sm"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Visible to all students (uncheck to keep private)
                  </span>
                </label>
              </div>
            </div>

            {/* Problems */}
            <div className="glass rounded-2xl p-6">
              {sectionTitle("Problems")}

              {/* Selected problems */}
              {selectedProblems.length > 0 && (
                <div className="mb-4 space-y-2">
                  <p
                    className="text-xs font-medium mb-3"
                    style={{ color: "var(--text-muted)" }}
                  >
                    SELECTED ({selectedProblems.length})
                  </p>
                  {selectedProblems.map((p, i) => {
                    const diff = DIFFICULTY_CONFIG[p.difficulty];
                    return (
                      <div
                        key={p.id}
                        className="flex flex-wrap items-center gap-3 px-4 py-3 rounded-xl"
                        style={{
                          background: "var(--accent-dim)",
                          border: "1px solid var(--border-accent)",
                        }}
                      >
                        <span
                          className="text-xs font-bold w-5"
                          style={{ color: "var(--text-muted)" }}
                        >
                          {i + 1}
                        </span>
                        <span className="flex-1 text-sm font-medium">
                          {p.title}
                        </span>
                        <span
                          className="text-xs px-2 py-0.5 rounded-md"
                          style={{ color: diff.color, background: diff.bg }}
                        >
                          {diff.label}
                        </span>
                        <span
                          className="text-xs"
                          style={{ color: "var(--text-muted)" }}
                        >
                          {p.points} pts
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleProblem(p)}
                          className="p-1 rounded"
                          style={{
                            color: "var(--danger)",
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                          }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    );
                  })}
                  <div
                    className="text-right text-sm pt-1"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Total:{" "}
                    <span
                      style={{ color: "var(--text-primary)", fontWeight: 600 }}
                    >
                      {selectedProblems.reduce((sum, p) => sum + p.points, 0)}{" "}
                      pts
                    </span>
                  </div>
                </div>
              )}

              {/* Search */}
              <div className="relative mb-3">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: "var(--text-muted)" }}
                />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm"
                  style={inputStyle}
                  onFocus={(e) =>
                    (e.target.style.borderColor = "var(--accent)")
                  }
                  onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
                />
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {filtered.length === 0 && (
                  <p
                    className="text-sm text-center py-4"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {problems.length === 0
                      ? "Loading problems..."
                      : "No problems found"}
                  </p>
                )}
                {filtered.map((p) => {
                  const diff = DIFFICULTY_CONFIG[p.difficulty];
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => toggleProblem(p)}
                      className="w-full flex flex-wrap items-center gap-3 px-4 py-3 rounded-xl text-left transition-all"
                      style={{
                        background: "var(--bg-elevated)",
                        border: "1px solid var(--border)",
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.borderColor =
                          "var(--border-accent)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.borderColor = "var(--border)")
                      }
                    >
                      <Plus
                        size={15}
                        style={{ color: "var(--accent)", flexShrink: 0 }}
                      />
                      <span className="flex-1 text-sm">{p.title}</span>
                      <span
                        className="text-xs px-2 py-0.5 rounded-md"
                        style={{ color: diff.color, background: diff.bg }}
                      >
                        {diff.label}
                      </span>
                      <span
                        className="text-xs"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {p.points} pts
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {error && (
              <div
                className="px-4 py-3 rounded-xl text-sm"
                style={{
                  background: "rgba(248,113,113,0.1)",
                  border: "1px solid rgba(248,113,113,0.2)",
                  color: "var(--danger)",
                }}
              >
                {error}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pb-8">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-3 rounded-xl text-sm font-medium transition-all"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border)",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-medium"
                style={{
                  background: "var(--accent)",
                  color: "#fff",
                  border: "none",
                  cursor: loading ? "not-allowed" : "pointer",
                }}
              >
                {loading && <Loader2 size={15} className="animate-spin" />}
                {loading ? "Creating..." : "Create Contest"}
              </button>
            </div>
          </form>
    </div>
  );
}

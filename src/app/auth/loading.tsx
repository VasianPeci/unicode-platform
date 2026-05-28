export default function Loading() {
  return (
    <div className="min-h-screen auth-login-bg relative overflow-hidden flex items-center justify-center p-4">
      <div className="auth-grid" />
      <div className="w-full max-w-md skeleton-card p-8 relative">
        <div className="skeleton h-10 w-10 rounded-xl mx-auto mb-6" />
        <div className="skeleton h-8 w-40 mx-auto mb-3" />
        <div className="skeleton h-4 w-64 max-w-full mx-auto mb-8" />
        <div className="space-y-4">
          <div className="skeleton h-11 w-full" />
          <div className="skeleton h-11 w-full" />
          <div className="skeleton h-11 w-full" />
        </div>
      </div>
    </div>
  )
}

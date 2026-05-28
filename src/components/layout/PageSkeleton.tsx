import { Sidebar } from '@/components/layout/Sidebar'

type SkeletonVariant = 'dashboard' | 'table' | 'cards' | 'form' | 'admin' | 'editor' | 'contest'

type PageSkeletonProps = {
  variant?: SkeletonVariant
  withShell?: boolean
}

function Block({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />
}

function HeaderSkeleton() {
  return (
    <div className="mb-8">
      <Block className="h-8 w-48 mb-3" />
      <Block className="h-4 w-64 max-w-full" />
    </div>
  )
}

function StatGrid({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="skeleton-card p-5">
          <Block className="h-10 w-10 rounded-xl mb-4" />
          <Block className="h-7 w-16 mb-3" />
          <Block className="h-4 w-28" />
        </div>
      ))}
    </div>
  )
}

function TableRows({ rows = 6 }: { rows?: number }) {
  return (
    <div className="skeleton-card overflow-hidden">
      <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <Block className="h-3 col-span-1" />
        <Block className="h-3 col-span-5" />
        <Block className="h-3 col-span-2" />
        <Block className="h-3 col-span-2" />
        <Block className="h-3 col-span-2" />
      </div>
      <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 px-4 md:px-6 py-4">
            <Block className="hidden md:block h-4 md:col-span-1" />
            <div className="md:col-span-5 space-y-2">
              <Block className="h-4 w-4/5" />
              <Block className="h-3 w-1/3" />
            </div>
            <Block className="h-6 w-24 md:col-span-2" />
            <Block className="h-4 w-20 md:col-span-2" />
            <Block className="h-4 w-28 md:col-span-2" />
          </div>
        ))}
      </div>
    </div>
  )
}

function CardList({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="skeleton-card p-5 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            <div className="flex-1 space-y-3">
              <Block className="h-5 w-28" />
              <Block className="h-6 w-2/3" />
              <Block className="h-4 w-full" />
              <div className="flex flex-wrap gap-3 pt-2">
                <Block className="h-4 w-20" />
                <Block className="h-4 w-24" />
                <Block className="h-4 w-36" />
              </div>
            </div>
            <Block className="h-9 w-9 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  )
}

function FormSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="skeleton-card p-5 md:p-6">
          <Block className="h-5 w-40 mb-5" />
          <div className="space-y-4">
            <Block className="h-11 w-full" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Block className="h-11 w-full" />
              <Block className="h-11 w-full" />
              <Block className="h-11 w-full" />
            </div>
            <Block className="h-28 w-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

function EditorSkeleton() {
  return (
    <div className="flex flex-col lg:flex-row min-h-screen lg:h-screen overflow-hidden">
      <div className="w-full lg:w-[45%] lg:border-r" style={{ borderColor: 'var(--border)' }}>
        <div className="px-4 md:px-6 py-5" style={{ borderBottom: '1px solid var(--border)' }}>
          <Block className="h-5 w-24 mb-4" />
          <Block className="h-7 w-2/3 mb-3" />
          <div className="flex gap-2">
            <Block className="h-6 w-16" />
            <Block className="h-6 w-20" />
            <Block className="h-6 w-14" />
          </div>
        </div>
        <div className="px-4 md:px-6 py-5 space-y-5">
          <Block className="h-4 w-full" />
          <Block className="h-4 w-11/12" />
          <Block className="h-4 w-4/5" />
          <Block className="h-32 w-full" />
        </div>
      </div>
      <div className="flex-1 min-h-[520px] flex flex-col">
        <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <Block className="h-9 w-32" />
          <Block className="h-9 w-20 ml-auto" />
          <Block className="h-9 w-24" />
        </div>
        <Block className="flex-1 rounded-none" />
      </div>
    </div>
  )
}

function SkeletonContent({ variant }: { variant: SkeletonVariant }) {
  if (variant === 'editor') return <EditorSkeleton />

  if (variant === 'form') {
    return (
      <div className="max-w-3xl mx-auto">
        <HeaderSkeleton />
        <FormSkeleton />
      </div>
    )
  }

  if (variant === 'cards' || variant === 'contest') {
    return (
      <div className="max-w-5xl mx-auto">
        <HeaderSkeleton />
        <CardList rows={variant === 'contest' ? 3 : 4} />
      </div>
    )
  }

  if (variant === 'admin') {
    return (
      <div className="max-w-4xl mx-auto">
        <HeaderSkeleton />
        <StatGrid count={4} />
        <div className="mt-8 skeleton-card p-5 md:p-6">
          <Block className="h-5 w-32 mb-4" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Block className="h-16 w-full" />
            <Block className="h-16 w-full" />
          </div>
        </div>
      </div>
    )
  }

  if (variant === 'dashboard') {
    return (
      <div className="max-w-5xl mx-auto space-y-8">
        <HeaderSkeleton />
        <StatGrid />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <TableRows rows={4} />
          </div>
          <div className="space-y-4">
            <CardList rows={2} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto">
      <HeaderSkeleton />
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <Block className="h-11 flex-1" />
        <div className="flex gap-2 overflow-hidden">
          <Block className="h-11 w-20" />
          <Block className="h-11 w-20" />
          <Block className="h-11 w-20" />
        </div>
      </div>
      <TableRows />
    </div>
  )
}

export function PageSkeleton({ variant = 'dashboard', withShell = false }: PageSkeletonProps) {
  const content = <SkeletonContent variant={variant} />

  if (!withShell) return content

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 app-shell-main overflow-y-auto p-4 pt-20 sm:p-6 md:p-8 md:pt-8">
        {content}
      </main>
    </div>
  )
}

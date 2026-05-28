import { Sidebar } from '@/components/layout/Sidebar'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />

      <main className="flex-1 app-shell-main overflow-y-auto p-4 pt-20 sm:p-6 md:p-8 md:pt-8">
        {children}
      </main>
    </div>
  )
}

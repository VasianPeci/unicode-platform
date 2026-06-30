import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Sidebar } from '@/components/layout/Sidebar'

export default async function AssistantLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/auth/login')

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 app-shell-main overflow-y-auto">
        <div className="min-h-full p-4 pt-20 sm:p-6 md:p-8 md:pt-8">
          {children}
        </div>
      </main>
    </div>
  )
}

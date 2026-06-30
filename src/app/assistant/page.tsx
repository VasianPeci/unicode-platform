import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import AssistantClient from './AssistantClient'

export default async function AssistantPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/auth/login')

  return (
    <AssistantClient
      user={{
        name: session.user.name,
        role: session.user.role,
        universityName: session.user.universityName,
      }}
    />
  )
}

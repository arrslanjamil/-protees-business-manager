import type { ReactNode } from 'react'
import { ShieldAlert } from 'lucide-react'
import { useFactoryAuth } from '@/context/FactoryAuthContext'
import type { FactoryRole } from '@/lib/factoryTypes'
import { FACTORY_ROLE_LABELS } from '@/lib/factoryTypes'
import { EmptyState } from '@/components/ui/EmptyState'

export function RequireFactoryRole({ role, children }: { role: FactoryRole | FactoryRole[]; children: ReactNode }) {
  const { profile } = useFactoryAuth()
  const allowed = Array.isArray(role) ? role : [role]

  if (!profile?.role || !allowed.includes(profile.role)) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Access restricted"
        description={`This screen is only available to: ${allowed.map((r) => FACTORY_ROLE_LABELS[r]).join(', ')}.`}
      />
    )
  }

  return <>{children}</>
}

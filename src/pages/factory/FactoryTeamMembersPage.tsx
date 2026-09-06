import { useState } from 'react'
import { Users } from 'lucide-react'
import { useFactoryData } from '@/context/FactoryDataContext'
import { useFactoryAuth } from '@/context/FactoryAuthContext'
import { EmptyState } from '@/components/ui/EmptyState'
import { RequireFactoryRole } from '@/components/factory/RequireFactoryRole'
import { FACTORY_ROLES, FACTORY_ROLE_LABELS, type FactoryRole } from '@/lib/factoryTypes'
import { formatDate } from '@/lib/utils'

function TeamMembersContent() {
  const { profiles, updateProfileRole } = useFactoryData()
  const { user: currentUser } = useFactoryAuth()
  const [savingId, setSavingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleRoleChange(id: string, value: string) {
    setSavingId(id)
    setError(null)
    try {
      await updateProfileRole(id, value === '' ? null : (value as FactoryRole))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role.')
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Team Members</h1>
        <p className="mt-1 text-sm text-slate-400">Approve new sign-ups and assign each person a Factory role.</p>
      </div>

      {error && <p className="text-xs text-neon-red">{error}</p>}

      {profiles.length === 0 ? (
        <EmptyState icon={Users} title="No factory users yet" description="Once someone signs up at /factory, they'll appear here for approval." />
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3.5">Name</th>
                <th className="px-5 py-3.5">Joined</th>
                <th className="px-5 py-3.5">Role</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((p) => (
                <tr key={p.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                  <td className="px-5 py-3.5 font-medium text-white">
                    {p.name} {p.id === currentUser?.id && <span className="text-xs text-slate-500">(you)</span>}
                  </td>
                  <td className="px-5 py-3.5 text-slate-500">{formatDate(p.created_at)}</td>
                  <td className="px-5 py-3.5">
                    <select
                      className="input-field w-48 py-1.5 text-sm"
                      value={p.role ?? ''}
                      disabled={savingId === p.id}
                      onChange={(e) => handleRoleChange(p.id, e.target.value)}
                    >
                      <option value="">Pending — no role</option>
                      {FACTORY_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {FACTORY_ROLE_LABELS[r]}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export function FactoryTeamMembersPage() {
  return (
    <RequireFactoryRole role="admin">
      <TeamMembersContent />
    </RequireFactoryRole>
  )
}

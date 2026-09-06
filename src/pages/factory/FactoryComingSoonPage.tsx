import type { LucideIcon } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'

export function FactoryComingSoonPage({ icon, title, phase }: { icon: LucideIcon; title: string; phase: string }) {
  return <EmptyState icon={icon} title={title} description={`Coming in ${phase} of the Factory rollout.`} />
}

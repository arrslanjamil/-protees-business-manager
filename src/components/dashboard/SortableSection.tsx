import type { ReactNode } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { classNames } from '@/lib/utils'

interface SortableSectionProps {
  id: string
  title: string
  icon?: ReactNode
  children: ReactNode
}

export function SortableSection({ id, title, icon, children }: SortableSectionProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <section
      ref={setNodeRef}
      style={style}
      className={classNames('scroll-mt-4', isDragging && 'z-10 opacity-90')}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-400">
          {icon}
          {title}
        </h2>
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Drag to reorder ${title}`}
          className="touch-none cursor-grab rounded-lg p-1.5 text-slate-600 transition hover:bg-white/5 hover:text-slate-300 active:cursor-grabbing"
        >
          <GripVertical size={16} />
        </button>
      </div>
      {children}
    </section>
  )
}

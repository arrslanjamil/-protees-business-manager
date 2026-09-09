import type { ReactNode } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { classNames } from '@/lib/utils'

interface SortableWidgetProps {
  id: string
  className?: string
  children: ReactNode
}

export function SortableWidget({ id, className, children }: SortableWidgetProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={classNames('group/widget relative', isDragging && 'z-10 opacity-80', className)}
    >
      <button
        type="button"
        aria-label="Drag to reorder widget"
        {...attributes}
        {...listeners}
        className="absolute right-2 top-2 z-10 cursor-grab touch-none rounded-lg p-1.5 text-slate-600 opacity-0 transition hover:bg-white/5 hover:text-slate-300 focus-visible:opacity-100 active:cursor-grabbing group-hover/widget:opacity-100"
      >
        <GripVertical size={15} />
      </button>
      {children}
    </div>
  )
}

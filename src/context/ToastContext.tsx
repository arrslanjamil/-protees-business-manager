import { AlertCircle, CheckCircle2, X } from 'lucide-react'
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { classNames } from '@/lib/utils'

type ToastType = 'success' | 'error'

interface ToastItem {
  id: number
  type: ToastType
  message: string
}

interface ToastContextValue {
  showToast: (type: ToastType, message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

let nextToastId = 1

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback(
    (type: ToastType, message: string) => {
      const id = nextToastId++
      setToasts((prev) => [...prev, { id, type, message }])
      setTimeout(() => dismiss(id), 5000)
    },
    [dismiss]
  )

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed inset-x-4 bottom-20 z-[100] flex flex-col items-center gap-2 lg:inset-x-auto lg:bottom-6 lg:right-6 lg:items-end">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={classNames(
              'flex w-full max-w-sm items-start gap-2.5 rounded-xl border bg-base-850/95 px-4 py-3 text-sm text-slate-100 shadow-xl shadow-black/40 backdrop-blur',
              t.type === 'success' ? 'border-neon-green/30' : 'border-neon-red/30'
            )}
          >
            {t.type === 'success' ? (
              <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-neon-green" />
            ) : (
              <AlertCircle size={18} className="mt-0.5 shrink-0 text-neon-red" />
            )}
            <p className="flex-1 break-words">{t.message}</p>
            <button className="shrink-0 text-slate-500 hover:text-white" onClick={() => dismiss(t.id)} aria-label="Dismiss">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}

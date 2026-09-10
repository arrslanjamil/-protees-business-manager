import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { classNames } from '@/lib/utils'

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme()
  const isLight = theme === 'light'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
      title={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
      className={classNames('rounded-lg p-1.5 text-slate-500 transition hover:bg-white/5 hover:text-neon-cyan', className)}
    >
      {isLight ? <Moon size={16} /> : <Sun size={16} />}
    </button>
  )
}

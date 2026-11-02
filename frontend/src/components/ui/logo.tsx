import { Link } from 'react-router-dom'
import { cn } from '../../lib/cn'

interface LogoProps {
  className?: string
  tone?: 'dark' | 'light'
  compact?: boolean
  asLink?: boolean
}

export function Logo({
  className,
  tone = 'dark',
  compact = false,
  asLink = true,
}: LogoProps) {
  const content = (
    <>
      <span className="relative grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-[12px] bg-lime shadow-[0_8px_20px_-10px_rgba(185,229,72,0.9)]">
        <span className="absolute -right-2 -top-2 h-6 w-6 rounded-full bg-white/40 blur-sm" />
        <svg
          viewBox="0 0 24 24"
          className="relative h-[19px] w-[19px]"
          aria-hidden="true"
        >
          <path
            d="M7 5.4v13.2h10.2"
            fill="none"
            stroke="#09111c"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="17.2" cy="7" r="1.7" fill="#09111c" />
        </svg>
      </span>

      {compact ? null : (
        <span className="flex flex-col leading-none">
          <span
            className={cn(
              'text-[21px] font-extrabold tracking-[-0.055em]',
              tone === 'light' ? 'text-white' : 'text-ink',
            )}
          >
            Lumen
          </span>
          <span
            className={cn(
              'mt-0.5 text-[9.5px] font-bold uppercase tracking-[0.28em]',
              tone === 'light' ? 'text-white/40' : 'text-faint',
            )}
          >
            bank
          </span>
        </span>
      )}
    </>
  )

  const base = cn('inline-flex items-center gap-2.5', className)

  if (!asLink) {
    return <span className={base}>{content}</span>
  }

  return (
    <Link to="/" aria-label="Lumen Bank — на главную" className={base}>
      {content}
    </Link>
  )
}

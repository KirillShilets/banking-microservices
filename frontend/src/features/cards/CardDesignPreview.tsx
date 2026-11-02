import type { CSSProperties } from 'react'
import { Nfc } from 'lucide-react'
import { cn } from '../../lib/cn'
import type { CardSurface } from './card-designs'

interface CardDesignPreviewProps {
  surface: CardSurface
  productName: string
  productKind: string
  ownerName: string
  /** Last four digits once the card exists; a placeholder before that. */
  last4?: string
  className?: string
  /**
   * Small tile used inside the design picker: keeps the product line and the
   * masked number only, so nothing is clipped at ~150px wide.
   */
  compact?: boolean
}

/**
 * Paints the pattern in `currentColor` and fades it with opacity, so the same
 * tile works on dark and light surfaces without a per-design asset.
 */
function patternStyle(pattern: CardSurface['pattern']): CSSProperties {
  switch (pattern) {
    case 'grid':
      return {
        backgroundImage:
          'linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }
    case 'dots':
      return {
        backgroundImage: 'radial-gradient(currentColor 1.4px, transparent 1.4px)',
        backgroundSize: '18px 18px',
      }
    case 'waves':
      return {
        backgroundImage:
          'radial-gradient(120% 90% at 104% -12%, currentColor 0%, transparent 58%), radial-gradient(96% 82% at -8% 108%, currentColor 0%, transparent 62%)',
      }
    default:
      return {}
  }
}

/**
 * Live preview of the card being configured. Mirrors the card shelf in
 * `BillCard`/`CardStack`, but renders user-picked colours instead of themes.
 */
export function CardDesignPreview({
  surface,
  productName,
  productKind,
  ownerName,
  last4,
  className,
  compact = false,
}: CardDesignPreviewProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'relative aspect-[1.586] w-full overflow-hidden rounded-[22px] shadow-[0_26px_60px_-30px_rgba(9,17,28,0.55)]',
        className,
      )}
      style={
        surface.image
          ? {
              backgroundColor: surface.background,
              backgroundImage: `url("${surface.image}")`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              color: surface.ink,
            }
          : { background: surface.background, color: surface.ink }
      }
    >
      {surface.image ? (
        // Dark bands top and bottom keep product data readable on any photo.
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(6,10,16,0.72)_0%,rgba(6,10,16,0.12)_42%,rgba(6,10,16,0.18)_62%,rgba(6,10,16,0.74)_100%)]" />
      ) : null}

      {surface.pattern !== 'none' ? (
        <div
          className={cn(
            'pointer-events-none absolute inset-0',
            surface.image ? 'opacity-[0.16]' : 'opacity-[0.09]',
          )}
          style={{ ...patternStyle(surface.pattern), color: surface.ink }}
        />
      ) : null}

      <div
        className={cn(
          'relative flex h-full flex-col',
          compact ? 'justify-between p-3' : 'justify-between p-4 sm:p-5',
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p
              className={cn(
                'truncate font-extrabold tracking-[-0.01em]',
                compact ? 'text-[10.5px]' : 'text-[13px]',
              )}
            >
              {productName}
            </p>
            <p
              className={cn(
                'mt-0.5 truncate font-semibold',
                compact ? 'text-[8.5px]' : 'text-[10.5px]',
              )}
              style={{ color: surface.muted }}
            >
              {productKind}
            </p>
          </div>
          <Nfc
            className={cn('shrink-0 rotate-90 opacity-50', compact ? 'h-3 w-3' : 'h-4 w-4')}
          />
        </div>

        <div className="flex items-center gap-2">
          <span
            className={cn('rounded-[5px]', compact ? 'h-4 w-6' : 'h-6 w-8')}
            style={{ background: surface.accent, opacity: 0.9 }}
          />
          <span
            className={cn(
              'font-mono font-semibold tracking-[0.08em]',
              compact ? 'text-[9px]' : 'text-[12px]',
            )}
            style={{ color: surface.muted }}
          >
            {compact ? `•••• ${last4 ?? '0000'}` : `•••• •••• •••• ${last4 ?? '0000'}`}
          </span>
        </div>

        {compact ? (
          <p
            className="text-[8px] font-bold uppercase tracking-[0.16em]"
            style={{ color: surface.muted }}
          >
            Lumen Bank · RUB
          </p>
        ) : (
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p
                className="text-[8px] font-bold uppercase tracking-[0.16em]"
                style={{ color: surface.muted }}
              >
                Владелец
              </p>
              <p className="mt-1 truncate text-[10.5px] font-semibold">{ownerName}</p>
            </div>
            <div className="shrink-0 text-right">
              <p
                className="text-[8px] font-bold uppercase tracking-[0.16em]"
                style={{ color: surface.muted }}
              >
                Lumen Bank
              </p>
              <p className="mt-0.5 text-[10.5px] font-extrabold">RUB</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

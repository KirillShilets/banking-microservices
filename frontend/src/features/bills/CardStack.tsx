import { motion, useReducedMotion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Nfc } from 'lucide-react'
import { useRef, type KeyboardEvent, type PointerEvent } from 'react'
import type { BillResponseDTO } from '../../dto/response'
import { Money } from '../../components/ui/money'
import { cn } from '../../lib/cn'
import type { CardSurface } from '../cards/card-designs'
import { billLast4, billProduct } from './bill-format'

interface CardStackProps {
  bills: BillResponseDTO[]
  surfaceFor?: (bill: BillResponseDTO) => CardSurface | null
  activeBillId?: number | null
  onSelect?: (bill: BillResponseDTO) => void
  /** Step through the line-up: -1 previous, +1 next. */
  onAdvance?: (delta: number) => void
}

const SWIPE_THRESHOLD = 40

/**
 * Horizontal coverflow carousel: one card tall, neighbours sit behind the
 * active card, shifted side to side, scaled down and dimmed. Glassmorphism
 * faces, neon-lime outline on the active card, spring transitions with depth.
 */
export function CardStack({
  bills,
  surfaceFor,
  activeBillId = null,
  onSelect,
  onAdvance,
}: CardStackProps) {
  const reduceMotion = useReducedMotion()
  const swipeStart = useRef<number | null>(null)

  if (bills.length === 0) return null

  const foundIndex = bills.findIndex((bill) => bill.billId === activeBillId)
  const activeIndex = foundIndex < 0 ? 0 : foundIndex
  const total = bills.length

  const spring = reduceMotion
    ? { duration: 0 }
    : { type: 'spring' as const, stiffness: 260, damping: 30, mass: 0.9 }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      onAdvance?.(1)
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      onAdvance?.(-1)
    }
  }

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    swipeStart.current = event.clientX
  }

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const start = swipeStart.current
    swipeStart.current = null
    if (start === null) return
    const delta = event.clientX - start
    if (Math.abs(delta) < SWIPE_THRESHOLD) return
    onAdvance?.(delta < 0 ? 1 : -1)
  }

  return (
    <div
      role="region"
      aria-roledescription="карусель"
      aria-label="Карты"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      className="mx-auto w-full max-w-[320px] rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime/60"
      style={{ perspective: '900px' }}
    >
      {/* One card tall: the stage is exactly the active card's box. */}
      <div className="relative aspect-[1.586] w-full">
        {bills.map((bill, index) => {
          const product = billProduct(bill, index)
          const surface = surfaceFor?.(bill) ?? null
          // Shortest signed distance so the carousel wraps naturally.
          let offset = index - activeIndex
          if (offset > total / 2) offset -= total
          if (offset < -total / 2) offset += total

          const isActive = offset === 0
          const depth = Math.min(Math.abs(offset), 3)

          return (
            <motion.button
              key={bill.billId}
              type="button"
              aria-pressed={isActive}
              aria-label={
                isActive
                  ? `${product.name}, •••• ${billLast4(bill)} — текущая карта`
                  : `${product.name}, •••• ${billLast4(bill)} — выбрать`
              }
              onClick={() => (isActive ? onAdvance?.(1) : onSelect?.(bill))}
              initial={false}
              animate={{
                x: offset * 58,
                scale: isActive ? 1 : 0.9,
                opacity: isActive ? 1 : 0.6,
                rotateY: offset === 0 ? 0 : offset > 0 ? -22 : 22,
              }}
              transition={spring}
              style={{ zIndex: 20 - depth, transformStyle: 'preserve-3d' }}
              className={cn(
                'absolute inset-0 overflow-hidden rounded-[20px] border p-4 text-left transition-shadow duration-300',
                'backdrop-blur-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime/70',
                isActive
                  ? 'border-lime/70 shadow-[0_0_0_1px_rgba(210,243,107,0.45),0_26px_60px_-26px_rgba(210,243,107,0.35)]'
                  : 'border-white/12 shadow-[0_18px_40px_-28px_rgba(0,0,0,0.8)]',
              )}
            >
              {/* Face: uploaded photo / palette gradient / default glass */}
              <span
                aria-hidden="true"
                className="absolute inset-0"
                style={
                  surface
                    ? surface.image
                      ? {
                          backgroundImage: `url("${surface.image}")`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                        }
                      : { background: surface.background }
                    : {
                        background:
                          'linear-gradient(135deg, #1b2a41 0%, #0d1626 55%, #091019 100%)',
                      }
                }
              />
              {/* Diagonal light sweep + glass tint */}
              <span
                aria-hidden="true"
                className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.16)_0%,rgba(255,255,255,0.02)_38%,rgba(210,243,107,0.10)_100%)]"
              />
              <span
                aria-hidden="true"
                className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,10,16,0.55)_0%,rgba(6,10,16,0.12)_45%,rgba(6,10,16,0.62)_100%)]"
              />

              <span className="relative flex h-full flex-col justify-between text-white">
                <span className="flex items-start justify-between gap-2">
                  <span className="min-w-0">
                    <span className="block truncate text-[13.5px] font-semibold tracking-[-0.01em]">
                      {product.name}
                    </span>
                    <span className="mt-0.5 block truncate text-[12px] font-medium text-white/60">
                      {product.kind}
                    </span>
                  </span>
                  <Nfc className="h-4 w-4 shrink-0 rotate-90 text-white/40" aria-hidden="true" />
                </span>

                <span className="flex items-center gap-2">
                  {/* Chip */}
                  <span
                    aria-hidden="true"
                    className="grid h-6 w-8 place-items-center rounded-[5px] border border-white/25 bg-[linear-gradient(135deg,#e9f7c8,#b6db63)]"
                  >
                    <span className="h-3 w-4 rounded-[2px] border border-[#12100a]/35" />
                  </span>
                  <span className="font-mono text-[12.5px] tracking-[0.16em] text-white/70">
                    •••• {billLast4(bill)}
                  </span>
                </span>

                <span className="flex items-end justify-between gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">
                    Баланс
                  </span>
                  <Money
                    amount={bill.amount}
                    tone="inherit"
                    className="text-[17px] font-bold tracking-[-0.01em]"
                  />
                </span>
              </span>
            </motion.button>
          )
        })}

        {/* Controls sit on the card so the block stays one card tall. */}
        {total > 1 ? (
          <>
            <button
              type="button"
              onClick={() => onAdvance?.(-1)}
              aria-label="Предыдущая карта"
              className="absolute left-1.5 top-1/2 z-30 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-white/10 text-white/80 backdrop-blur-md transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime/70"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onAdvance?.(1)}
              aria-label="Следующая карта"
              className="absolute right-1.5 top-1/2 z-30 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-white/10 text-white/80 backdrop-blur-md transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime/70"
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            <div
              className="absolute bottom-2 left-1/2 z-30 flex -translate-x-1/2 gap-1.5"
              role="tablist"
              aria-label="Выбор карты"
            >
              {bills.map((bill, index) => (
                <button
                  key={bill.billId}
                  type="button"
                  role="tab"
                  aria-selected={index === activeIndex}
                  aria-label={`Карта ${index + 1} из ${total}`}
                  onClick={() => onSelect?.(bill)}
                  className={cn(
                    'h-1.5 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime/70',
                    index === activeIndex ? 'w-5 bg-lime' : 'w-1.5 bg-white/35 hover:bg-white/55',
                  )}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}

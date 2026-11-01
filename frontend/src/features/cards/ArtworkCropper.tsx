import { useMemo, useRef, useState } from 'react'
import { Check, Move, X, ZoomIn } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { cn } from '../../lib/cn'
import {
  clampCrop,
  cropRect,
  defaultCrop,
  renderArtwork,
  type ArtworkCrop,
  type ArtworkMeta,
} from './card-artwork'

interface ArtworkCropperProps {
  source: string
  meta: ArtworkMeta
  onCancel: () => void
  onApply: (result: { card: string; thumb: string }) => void
}

/**
 * Picks the fragment of the uploaded photo that becomes the card face.
 * The stage mirrors the card aspect, so what you see is what is printed.
 */
export function ArtworkCropper({ source, meta, onCancel, onApply }: ArtworkCropperProps) {
  const [crop, setCrop] = useState<ArtworkCrop>(() => defaultCrop(meta.width, meta.height))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dragRef = useRef<{ x: number; y: number; crop: ArtworkCrop; width: number } | null>(null)

  const rect = useMemo(() => cropRect(meta.width, meta.height, crop), [meta.width, meta.height, crop])

  const imageStyle = {
    width: `${(meta.width / rect.w) * 100}%`,
    height: `${(meta.height / rect.h) * 100}%`,
    left: `${(-rect.x / rect.w) * 100}%`,
    top: `${(-rect.y / rect.h) * 100}%`,
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = {
      x: event.clientX,
      y: event.clientY,
      crop,
      width: event.currentTarget.clientWidth,
    }
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag) return
    const scale = rect.w / drag.width
    const next = clampCrop(meta.width, meta.height, {
      zoom: drag.crop.zoom,
      x: drag.crop.x - (event.clientX - drag.x) * scale,
      y: drag.crop.y - (event.clientY - drag.y) * scale,
    })
    setCrop(next)
  }

  const handlePointerUp = () => {
    dragRef.current = null
  }

  const apply = async () => {
    setBusy(true)
    setError(null)
    try {
      onApply(await renderArtwork(source, meta, crop))
    } catch {
      setError('Не удалось подготовить изображение')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-2xl border border-line bg-white p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-faint">
          Выберите область
        </p>
        <span className="flex items-center gap-1 text-[11px] font-semibold text-muted">
          <Move className="h-3.5 w-3.5" />
          перетащите фото
        </span>
      </div>

      <div
        role="application"
        aria-label="Область карты"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="relative mt-2 aspect-[1.586] w-full cursor-grab touch-none overflow-hidden rounded-xl border border-line bg-navy active:cursor-grabbing"
      >
        <img
          src={source}
          alt="Выбор области карты"
          draggable={false}
          className="pointer-events-none absolute max-w-none select-none"
          style={imageStyle}
        />
        <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-white/25" />
      </div>

      <div className="mt-2.5 flex items-center gap-2">
        <ZoomIn className="h-4 w-4 shrink-0 text-muted" />
        <input
          type="range"
          min={1}
          max={3}
          step={0.05}
          value={crop.zoom}
          aria-label="Масштаб"
          onChange={(event) =>
            setCrop((current) =>
              clampCrop(meta.width, meta.height, {
                ...current,
                zoom: Number(event.target.value),
              }),
            )
          }
          className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-line accent-ink"
          style={{ accentColor: '#0a121c' }}
        />
        <span className="w-9 shrink-0 text-right text-[11px] font-semibold text-muted">
          {crop.zoom.toFixed(1)}×
        </span>
      </div>

      {error ? <p className="mt-2 text-[11.5px] font-semibold text-rose">{error}</p> : null}

      <div className="mt-2.5 flex items-center justify-between gap-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={onCancel}
          leadingIcon={<X className="h-4 w-4" />}
        >
          Отмена
        </Button>
        <Button
          size="sm"
          variant="primary"
          loading={busy}
          onClick={() => void apply()}
          leadingIcon={<Check className="h-4 w-4" />}
          className={cn(!busy && 'min-w-[120px]')}
        >
          Применить
        </Button>
      </div>
    </div>
  )
}

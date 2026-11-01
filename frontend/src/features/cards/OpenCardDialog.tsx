import { useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleCheck,
  CreditCard,
  ImagePlus,
  Mail,
  Palette,
  ShieldCheck,
  Sparkles,
  Trash,
  Truck,
  Zap,
} from 'lucide-react'
import { useAuthUser } from '../../auth'
import { useAccount } from '../account/AccountProvider'
import { useOpenBill } from '../account/mutations'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Modal } from '../../components/ui/modal'
import { useToast } from '../../components/ui/toast'
import { cn } from '../../lib/cn'
import { formatDate } from '../../lib/date'
import { toMessage } from '../../lib/errors'
import { formatMoney } from '../../lib/money'
import { validateEmail } from '../../lib/validation'
import {
  CARD_PRODUCTS,
  findCardProduct,
  productFeeLabel,
  type CardProductId,
} from './card-catalog'
import {
  CARD_DESIGNS,
  CUSTOM_DESIGN_ID,
  CUSTOM_PALETTE,
  CUSTOM_PATTERNS,
  buildSurface,
  designName,
  designPrice,
  type CardPattern,
} from './card-designs'
import { CardDesignPreview } from './CardDesignPreview'
import { addCardOrder, getCardOrders, type CardOrder } from './card-order-store'
import {
  ARTWORK_ACCEPTED_TYPES,
  artworkError,
  artworkWarning,
  formatBytes,
  type ArtworkMeta,
} from './card-artwork'
import { ArtworkCropper } from './ArtworkCropper'
import { saveCardDesign, setActiveCardId } from './card-design-store'

const STEPS = [
  {
    id: 'product',
    label: 'Продукт',
    description: 'Выберите продукт — выпуск займёт пару минут',
  },
  {
    id: 'design',
    label: 'Дизайн',
    description: 'Дизайн можно будет поменять в приложении',
  },
  {
    id: 'delivery',
    label: 'Выпуск',
    description: 'Куда отправить реквизиты и условия',
  },
  {
    id: 'review',
    label: 'Проверка',
    description: 'Проверьте детали перед выпуском',
  },
] as const

const DELIVERY_OPTIONS = [
  {
    id: 'digital',
    label: 'Цифровая карта',
    hint: 'Реквизиты и условия придут письмом сразу после выпуска',
    icon: Zap,
    available: true,
  },
  {
    id: 'plastic',
    label: 'Пластиковая карта',
    hint: 'Доставка курьером за 3–5 дней, скоро',
    icon: Truck,
    available: false,
  },
] as const

interface OpenCardDialogProps {
  open: boolean
  onClose: () => void
  /** Called after a bill was opened, so the dashboard can refresh its shelf. */
  onOpened?: () => void
}

/**
 * Four-step card ordering flow: product → design → delivery → review.
 *
 * "Заказать на свою почту" opens a new bill (the card itself) and records the
 * order on the device, because the backend has no card-issue endpoint yet. The
 * email address is taken from the account profile and stays editable.
 */
export function OpenCardDialog({ open, onClose, onOpened }: OpenCardDialogProps) {
  const user = useAuthUser()
  const { account, accountId } = useAccount()
  const openBill = useOpenBill(accountId)
  const toast = useToast()

  const [step, setStep] = useState(0)
  const [productId, setProductId] = useState<CardProductId>('debit')
  const [designId, setDesignId] = useState<string>(CARD_DESIGNS[0].id)
  const [paletteId, setPaletteId] = useState<string>(CUSTOM_PALETTE[0].id)
  const [pattern, setPattern] = useState<CardPattern>('grid')
  /** Data URL of the uploaded artwork; kept in memory only. */
  const [artwork, setArtwork] = useState<string | null>(null)
  const [artworkMeta, setArtworkMeta] = useState<ArtworkMeta | null>(null)
  /** Hard error or soft warning about the uploaded file. */
  const [artworkIssue, setArtworkIssue] = useState<string | null>(null)
  /** Photo waiting for the customer to pick which fragment becomes the card. */
  const [pending, setPending] = useState<{ source: string; meta: ArtworkMeta } | null>(null)
  /** Small preview stored with the design for the sidebar card switcher. */
  const [artworkThumb, setArtworkThumb] = useState<string | null>(null)
  /**
   * `null` means "use the address from the profile", so an account query that
   * resolves after mount still prefills the field.
   */
  const [emailOverride, setEmailOverride] = useState<string | null>(null)
  const [consent, setConsent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [order, setOrder] = useState<CardOrder | null>(null)
  // Previous orders are read once per mount; the flow is mounted with the page,
  // so a pending custom design is visible the first time the wizard opens.
  const [orders, setOrders] = useState<CardOrder[]>(() => getCardOrders(user.subject))

  const defaultEmail = account?.email ?? user.email
  const ownerName = account?.name ?? user.displayName
  const email = emailOverride ?? defaultEmail

  /** Called from the footer after a successful order to start a clean draft. */
  const reset = () => {
    setStep(0)
    setProductId('debit')
    setDesignId(CARD_DESIGNS[0].id)
    setPaletteId(CUSTOM_PALETTE[0].id)
    setPattern('grid')
    setArtwork(null)
    setArtworkMeta(null)
    setArtworkIssue(null)
    setEmailOverride(null)
    setConsent(false)
    setSubmitting(false)
    setError(null)
    setOrder(null)
  }

  const product = findCardProduct(productId)
  const customDesign = designId === CUSTOM_DESIGN_ID
  const surface = useMemo(
    () => buildSurface(designId, paletteId, pattern, artwork),
    [designId, paletteId, pattern, artwork],
  )
  const chosenDesignName = designName(designId, paletteId, Boolean(artwork))
  const fee = designPrice(designId)

  const isLastStep = step === STEPS.length - 1
  const pendingOrder = orders[0] ?? null
  const done = order !== null

  const goNext = () => {
    if (step === 2) {
      const emailCheck = validateEmail(email)
      if (!emailCheck.valid) {
        setError(emailCheck.message ?? 'Проверьте email')
        return
      }
      if (!consent) {
        setError('Подтвердите условия выпуска карты')
        return
      }
    }
    setError(null)
    setStep((current) => Math.min(current + 1, STEPS.length - 1))
  }

  const goBack = () => {
    setError(null)
    setStep((current) => Math.max(current - 1, 0))
  }

  /**
   * Reads the uploaded artwork, measures it and switches the wizard to the
   * custom design. The bitmap stays in memory; only metadata is persisted with
   * the order.
   */
  const handleArtworkFile = (file: File) => {
    const hardError = artworkError({ type: file.type, size: file.size })
    if (hardError) {
      setArtworkIssue(hardError)
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : null
      if (!dataUrl) {
        setArtworkIssue('Не удалось прочитать файл')
        return
      }

      const probe = new window.Image()
      probe.onload = () => {
        const meta: ArtworkMeta = {
          name: file.name,
          type: file.type,
          width: probe.naturalWidth,
          height: probe.naturalHeight,
          size: file.size,
        }
        // The customer picks the visible fragment before the photo is applied.
        setPending({ source: dataUrl, meta })
        setArtworkIssue(artworkWarning(meta))
        setDesignId(CUSTOM_DESIGN_ID)
      }
      probe.onerror = () => setArtworkIssue('Файл повреждён или это не изображение')
      probe.src = dataUrl
    }
    reader.onerror = () => setArtworkIssue('Не удалось прочитать файл')
    reader.readAsDataURL(file)
  }

  const clearArtwork = () => {
    setArtwork(null)
    setArtworkMeta(null)
    setArtworkThumb(null)
    setArtworkIssue(null)
    setPending(null)
  }

  const applyCrop = (result: { card: string; thumb: string }) => {
    setArtwork(result.card)
    setArtworkThumb(result.thumb)
    // The file metadata only lives with the pending photo.
    setArtworkMeta(pending?.meta ?? null)
    setPending(null)
  }

  const handleOrder = async () => {
    const emailCheck = validateEmail(email)
    if (!emailCheck.valid) {
      setError(emailCheck.message ?? 'Проверьте email')
      return
    }
    if (!consent) {
      setError('Подтвердите условия выпуска карты')
      return
    }
    if (accountId === null) {
      setError('Сначала привяжите счёт к профилю')
      return
    }

    setError(null)
    setSubmitting(true)
    try {
      const created = await openBill.mutateAsync([{ amount: '0.00', overdraftEnabled: false }])
      const billId = Array.isArray(created) ? (created[0] ?? null) : null

      const placed = addCardOrder(user.subject, {
        productId,
        productName: product.name,
        designId,
        designName: chosenDesignName,
        customDesign,
        artworkName: artworkMeta?.name ?? null,
        email: email.trim(),
        delivery: 'digital',
        billId,
        total: fee,
      })

      if (billId !== null) {
        // Show the fresh card first: active in the fan, the shelf and the menu.
        setActiveCardId(user.subject, billId)
        saveCardDesign(user.subject, {
          billId,
          designId,
          paletteId,
          pattern,
          thumb: artworkThumb,
          artworkName: artworkMeta?.name ?? null,
        })
      }

      setOrder(placed)
      setOrders((current) => [placed, ...current])
      toast.success(
        'Карта выпущена',
        customDesign
          ? `Макет своего дизайна уйдёт на согласование, письмо — на ${email.trim()}`
          : `Реквизиты и условия отправлены на ${email.trim()}`,
      )
      onOpened?.()
    } catch (cause) {
      setError(toMessage(cause))
    } finally {
      setSubmitting(false)
    }
  }

  const footer = done ? (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <Button variant="ghost" size="sm" onClick={reset} leadingIcon={<Sparkles className="h-4 w-4" />}>
        Открыть ещё одну
      </Button>
      <Button variant="primary" size="md" onClick={onClose}>
        Готово
      </Button>
    </div>
  ) : (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <Button
        variant="ghost"
        size="sm"
        onClick={goBack}
        disabled={step === 0 || submitting}
        leadingIcon={<ArrowLeft className="h-4 w-4" />}
      >
        Назад
      </Button>

      {isLastStep ? (
        <Button
          variant="primary"
          size="md"
          loading={submitting}
          onClick={() => void handleOrder()}
          leadingIcon={<Mail className="h-4 w-4" />}
        >
          Заказать на свою почту
        </Button>
      ) : (
        <Button
          variant="primary"
          size="md"
          onClick={goNext}
          trailingIcon={<ArrowRight className="h-4 w-4" />}
        >
          Продолжить
        </Button>
      )}
    </div>
  )

  return (
    <Modal
      open={open}
      onClose={onClose}
      dismissible={!submitting}
      size="xl"
      title={done ? 'Карта выпущена' : 'Новая карта'}
      description={
        done
          ? 'Реквизиты, дизайн и условия отправлены на вашу почту'
          : STEPS[step].description
      }
      footer={footer}
    >
      {done && order ? (
        <OrderResult order={order} surface={surface} ownerName={ownerName} productKind={product.kind} />
      ) : (
        <div className="space-y-5">
          <StepIndicator step={step} />

          {error ? (
            <p
              role="alert"
              className="rounded-xl border border-rose/20 bg-rose-soft px-3.5 py-2.5 text-[12.5px] font-semibold text-rose"
            >
              {error}
            </p>
          ) : null}

          {step === 0 ? (
            <ProductStep
              productId={productId}
              onSelect={setProductId}
              pendingOrder={pendingOrder}
            />
          ) : null}

          {step === 1 ? (
            <DesignStep
              surface={surface}
              productName={product.name}
              productKind={product.kind}
              ownerName={ownerName}
              designId={designId}
              paletteId={paletteId}
              pattern={pattern}
              artwork={artwork}
              artworkMeta={artworkMeta}
              artworkIssue={artworkIssue}
              pending={pending}
              onApplyCrop={applyCrop}
              onCancelCrop={() => setPending(null)}
              onSelectDesign={setDesignId}
              onSelectPalette={(id) => {
                // While a photo is applied the palette is locked; remove the
                // photo first to switch back to a gradient.
                if (artwork) return
                setPaletteId(id)
              }}
              onSelectPattern={setPattern}
              onSelectArtwork={handleArtworkFile}
              onClearArtwork={clearArtwork}
            />
          ) : null}

          {step === 2 ? (
            <DeliveryStep
              email={email}
              defaultEmail={defaultEmail}
              consent={consent}
              onChangeEmail={setEmailOverride}
              onChangeConsent={setConsent}
            />
          ) : null}

          {step === 3 ? (
            <ReviewStep
              surface={surface}
              productName={product.name}
              productKind={product.kind}
              ownerName={ownerName}
              product={product}
              designName={chosenDesignName}
              customDesign={customDesign}
              email={email}
              fee={fee}
            />
          ) : null}
        </div>
      )}
    </Modal>
  )
}

function StepIndicator({ step }: { step: number }) {
  return (
    <div>
      <ol className="flex items-center gap-1.5">
        {STEPS.map((entry, index) => (
          <li key={entry.id} className="flex-1">
            <span
              className={cn(
                'block h-1.5 rounded-full transition-colors duration-200',
                index < step ? 'bg-lime-strong' : index === step ? 'bg-ink' : 'bg-line',
              )}
            />
          </li>
        ))}
      </ol>
      <div className="mt-2 flex items-center justify-between text-[11.5px] font-semibold">
        <span className="text-ink">{STEPS[step].label}</span>
        <span className="text-faint">
          Шаг {step + 1} из {STEPS.length}
        </span>
      </div>
    </div>
  )
}

function ProductStep({
  productId,
  onSelect,
  pendingOrder,
}: {
  productId: CardProductId
  onSelect: (id: CardProductId) => void
  pendingOrder: CardOrder | null
}) {
  return (
    <div className="space-y-4">
      {pendingOrder ? (
        <div className="flex items-start gap-2.5 rounded-2xl border border-line bg-surface-soft px-3.5 py-3">
          <CreditCard className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
          <p className="text-[12.5px] leading-relaxed text-muted">
            <span className="font-bold text-ink">{pendingOrder.productName}</span> ·{' '}
            {pendingOrder.designName} — заказ от {formatDate(pendingOrder.createdAt)}.{' '}
            {pendingOrder.status === 'design-review'
              ? 'Макет на согласовании у дизайнера.'
              : 'Карта активна.'}
          </p>
        </div>
      ) : null}

      <div className="grid gap-2.5 sm:grid-cols-2">
        {CARD_PRODUCTS.map((entry) => {
          const selected = entry.id === productId

          return (
            <button
              key={entry.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onSelect(entry.id)}
              className={cn(
                'group relative rounded-2xl border p-3.5 text-left transition-all duration-200',
                selected
                  ? 'border-ink bg-white shadow-[0_18px_40px_-28px_rgba(9,17,28,0.55)]'
                  : 'border-line bg-surface-soft hover:border-line-strong hover:bg-white',
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[13.5px] font-extrabold tracking-[-0.015em] text-ink">
                    {entry.name}
                  </p>
                  <p className="mt-0.5 text-[11.5px] font-semibold text-muted">{entry.kind}</p>
                </div>
                {entry.badge ? <Badge variant="lime">{entry.badge}</Badge> : null}
              </div>

              <p className="mt-2 text-[12px] leading-relaxed text-muted">{entry.tagline}</p>

              <ul className="mt-2.5 space-y-1">
                {entry.perks.map((perk) => (
                  <li key={perk} className="flex items-start gap-1.5 text-[11.5px] text-ink-soft">
                    <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald" />
                    <span>{perk}</span>
                  </li>
                ))}
              </ul>

              <p className="mt-3 text-[11.5px] font-extrabold text-ink">
                {productFeeLabel(entry)}
              </p>

              <span
                className={cn(
                  'absolute bottom-3 right-3 grid h-5 w-5 place-items-center rounded-full border transition-colors',
                  selected ? 'border-ink bg-ink text-white' : 'border-line bg-white text-transparent',
                )}
                aria-hidden="true"
              >
                <Check className="h-3 w-3" />
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function DesignStep({
  surface,
  productName,
  productKind,
  ownerName,
  artwork,
  artworkMeta,
  artworkIssue,
  pending,
  designId,
  paletteId,
  pattern,
  onSelectDesign,
  onSelectPalette,
  onSelectPattern,
  onSelectArtwork,
  onClearArtwork,
  onApplyCrop,
  onCancelCrop,
}: {
  surface: ReturnType<typeof buildSurface>
  productName: string
  productKind: string
  ownerName: string
  artwork: string | null
  artworkMeta: ArtworkMeta | null
  artworkIssue: string | null
  pending: { source: string; meta: ArtworkMeta } | null
  designId: string
  paletteId: string
  pattern: CardPattern
  onSelectDesign: (id: string) => void
  onSelectPalette: (id: string) => void
  onSelectPattern: (pattern: CardPattern) => void
  onSelectArtwork: (file: File) => void
  onClearArtwork: () => void
  onApplyCrop: (result: { card: string; thumb: string }) => void
  onCancelCrop: () => void
}) {
  const custom = designId === CUSTOM_DESIGN_ID

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_290px] lg:items-start">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {CARD_DESIGNS.map((design) => {
            const selected = design.id === designId
            return (
              <button
                key={design.id}
                type="button"
                aria-pressed={selected}
                onClick={() => onSelectDesign(design.id)}
                className={cn(
                  'min-w-0 overflow-hidden rounded-2xl border p-2 text-left transition-all duration-200',
                  selected
                    ? 'border-ink bg-white shadow-[0_16px_36px_-26px_rgba(9,17,28,0.55)]'
                    : 'border-line bg-surface-soft hover:border-line-strong hover:bg-white',
                )}
              >
                <CardDesignPreview
                  surface={design.surface}
                  productName={productName}
                  productKind={productKind}
                  ownerName={ownerName}
                  compact
                  className="shadow-none"
                />
                <p className="mt-2 truncate text-[11.5px] font-extrabold text-ink">
                  {design.name}
                </p>
                <p className="truncate text-[10.5px] font-semibold text-faint">
                  {design.price === 0 ? 'Включено' : formatMoney(design.price, { hideZeroFraction: true })}
                </p>
              </button>
            )
          })}

          <button
            type="button"
            aria-pressed={custom}
            onClick={() => onSelectDesign(CUSTOM_DESIGN_ID)}
            className={cn(
              'flex min-h-[118px] min-w-0 flex-col items-start justify-between rounded-2xl border border-dashed p-3 text-left transition-all duration-200',
              custom
                ? 'border-ink bg-white shadow-[0_16px_36px_-26px_rgba(9,17,28,0.55)]'
                : 'border-line-strong bg-surface-soft hover:border-ink/40 hover:bg-white',
            )}
          >
            <Palette className="h-5 w-5 text-ink" />
            <span>
              <span className="block text-[11.5px] font-extrabold text-ink">Свой дизайн</span>
              <span className="block text-[10.5px] font-semibold text-faint">
                {formatMoney(designPrice(CUSTOM_DESIGN_ID), { hideZeroFraction: true })} · макет
                согласуем
              </span>
            </span>
          </button>
        </div>

        {custom ? (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3 rounded-2xl border border-line bg-surface-soft p-3.5"
          >
            {pending ? (
              <ArtworkCropper
                source={pending.source}
                meta={pending.meta}
                onCancel={onCancelCrop}
                onApply={onApplyCrop}
              />
            ) : (
              <ArtworkUploader
                artwork={artwork}
                meta={artworkMeta}
                issue={artworkIssue}
                onSelect={onSelectArtwork}
                onClear={onClearArtwork}
              />
            )}

            {artwork ? (
              <p className="text-[11.5px] leading-relaxed text-muted">
                Фото на карте: палитра заблокирована, узор можно менять. Удалите фото, чтобы
                вернуться к градиенту.
              </p>
            ) : null}

            <p
              className={cn(
                'text-[11px] font-bold uppercase tracking-[0.14em]',
                artwork ? 'text-faint/60' : 'text-faint',
              )}
            >
              {artwork ? 'Палитра · недоступна с фото' : 'Палитра'}
            </p>
            <div
              aria-disabled={Boolean(artwork)}
              className={cn(
                'mt-2 flex flex-wrap gap-2',
                artwork && 'pointer-events-none opacity-40',
              )}
            >
              {CUSTOM_PALETTE.map((entry) => {
                const selected = entry.id === paletteId
                return (
                  <button
                    key={entry.id}
                    type="button"
                    aria-pressed={selected}
                    aria-label={entry.label}
                    title={entry.label}
                    onClick={() => onSelectPalette(entry.id)}
                    className={cn(
                      'h-9 w-9 rounded-full border-2 transition-transform duration-200 hover:scale-105',
                      selected ? 'border-ink' : 'border-white',
                    )}
                    style={{ background: entry.background }}
                  />
                )
              })}
            </div>

            <p className="mt-3.5 text-[11px] font-bold uppercase tracking-[0.14em] text-faint">
              Узор
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {CUSTOM_PATTERNS.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  aria-pressed={entry.id === pattern}
                  onClick={() => onSelectPattern(entry.id)}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-[11.5px] font-bold transition-colors',
                    entry.id === pattern
                      ? 'border-ink bg-ink text-white'
                      : 'border-line bg-white text-ink-soft hover:border-line-strong',
                  )}
                >
                  {entry.label}
                </button>
              ))}
            </div>

            <p className="mt-3 text-[11.5px] leading-relaxed text-muted">
              Макет подготовит дизайнер в течение дня. Стоимость{' '}
              <span className="font-bold text-ink">
                {formatMoney(designPrice(CUSTOM_DESIGN_ID), { hideZeroFraction: true })}
              </span>{' '}
              спишется с основного счёта после согласования.
            </p>
          </motion.div>
        ) : null}
      </div>

      <div className="space-y-2">
        <div className="sticky top-2">
          <CardDesignPreview
            surface={surface}
            productName={productName}
            productKind={productKind}
            ownerName={ownerName}
          />
          <p className="mt-2 text-center text-[11.5px] font-semibold text-faint">
            Предпросмотр · {designName(designId, paletteId, Boolean(artwork))}
          </p>
        </div>
      </div>
    </div>
  )
}

function DeliveryStep({
  email,
  defaultEmail,
  consent,
  onChangeEmail,
  onChangeConsent,
}: {
  email: string
  defaultEmail: string
  consent: boolean
  onChangeEmail: (value: string) => void
  onChangeConsent: (value: boolean) => void
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-2.5 sm:grid-cols-2">
        {DELIVERY_OPTIONS.map((option) => (
          <div
            key={option.id}
            className={cn(
              'rounded-2xl border p-3.5',
              option.available
                ? 'border-ink bg-white shadow-[0_16px_36px_-28px_rgba(9,17,28,0.5)]'
                : 'border-dashed border-line-strong bg-surface-soft',
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-lime-soft text-[#4f6b0d]">
                <option.icon className="h-4 w-4" />
              </span>
              {option.available ? (
                <Badge variant="lime">Выбрано</Badge>
              ) : (
                <Badge variant="neutral">Скоро</Badge>
              )}
            </div>
            <p className="mt-2 text-[13px] font-extrabold text-ink">{option.label}</p>
            <p className="mt-1 text-[11.5px] leading-relaxed text-muted">{option.hint}</p>
          </div>
        ))}
      </div>

      <Input
        label="Почта для реквизитов"
        type="email"
        value={email}
        onChange={(event) => onChangeEmail(event.target.value)}
        hint={`По умолчанию — ${defaultEmail}. Реквизиты, дизайн и условия придут сюда.`}
        leadingIcon={<Mail className="h-4 w-4 text-faint" />}
        autoComplete="email"
      />

      <label className="flex cursor-pointer items-start gap-2.5 rounded-2xl border border-line bg-surface-soft px-3.5 py-3">
        <input
          type="checkbox"
          checked={consent}
          onChange={(event) => onChangeConsent(event.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-line"
          style={{ accentColor: '#0a121c' }}
        />
        <span className="text-[12px] leading-relaxed text-muted">
          Согласен с условиями выпуска и тарифами, на обработку персональных данных и на
          получение писем о карте. Это учебный проект: карта цифровая и деньги не списываются.
        </span>
      </label>

      <div className="flex items-start gap-2 rounded-2xl border border-line bg-white px-3.5 py-3">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald" />
        <p className="text-[11.5px] leading-relaxed text-muted">
          Выпуск бесплатный. Плата за свой дизайн списывается только после согласования макета, а
          отменить заказ можно в любой момент в этом окне.
        </p>
      </div>
    </div>
  )
}

function ReviewStep({
  surface,
  productName,
  productKind,
  ownerName,
  product,
  designName: chosenDesignName,
  customDesign,
  email,
  fee,
}: {
  surface: ReturnType<typeof buildSurface>
  productName: string
  productKind: string
  ownerName: string
  product: ReturnType<typeof findCardProduct>
  designName: string
  customDesign: boolean
  email: string
  fee: number
}) {
  const rows: { label: string; value: string }[] = [
    { label: 'Продукт', value: `${product.name} · ${product.kind}` },
    { label: 'Обслуживание', value: productFeeLabel(product) },
    { label: 'Дизайн', value: chosenDesignName },
    { label: 'Выпуск', value: 'Цифровая карта, сразу после заказа' },
    { label: 'Почта', value: email.trim() || '—' },
  ]

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_290px] lg:items-start">
      <div className="space-y-2">
        <dl className="divide-y divide-line rounded-2xl border border-line bg-white">
          {rows.map((row) => (
            <div key={row.label} className="flex items-start justify-between gap-4 px-3.5 py-2.5">
              <dt className="text-[12px] font-semibold text-muted">{row.label}</dt>
              <dd className="max-w-[62%] text-right text-[12.5px] font-bold text-ink">
                {row.value}
              </dd>
            </div>
          ))}
        </dl>

        <div className="flex items-center justify-between rounded-2xl border border-line bg-surface-soft px-3.5 py-3">
          <div>
            <p className="text-[12px] font-bold text-ink">
              {fee === 0 ? 'Доплат нет' : 'Свой дизайн'}
            </p>
            <p className="mt-0.5 text-[11.5px] text-muted">
              {fee === 0
                ? 'Дизайн из коллекции входит в продукт'
                : customDesign
                  ? 'Спишем после согласования макета'
                  : 'Разовая плата'}
            </p>
          </div>
          <p className="text-[15px] font-extrabold text-ink">
            {fee === 0 ? '0 ₽' : formatMoney(fee, { hideZeroFraction: true })}
          </p>
        </div>
      </div>

      <div className="lg:sticky lg:top-2">
        <CardDesignPreview
          surface={surface}
          productName={productName}
          productKind={productKind}
          ownerName={ownerName}
        />
        <p className="mt-2 text-center text-[11.5px] font-semibold text-faint">
          Так карта появится в приложении
        </p>
      </div>
    </div>
  )
}

function OrderResult({
  order,
  surface,
  ownerName,
  productKind,
}: {
  order: CardOrder
  surface: ReturnType<typeof buildSurface>
  ownerName: string
  productKind: string
}) {
  const last4 = order.billId ? String(order.billId).padStart(4, '0').slice(-4) : undefined

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-2xl border border-emerald/20 bg-emerald-soft px-3.5 py-3">
        <CircleCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald" />
        <div>
          <p className="text-[13px] font-extrabold text-ink">
            {order.status === 'design-review'
              ? 'Заказ принят, макет на согласовании'
              : 'Карта выпущена'}
          </p>
          <p className="mt-0.5 text-[12px] leading-relaxed text-muted">
            Письмо с реквизитами, дизайном и условиями отправлено на{' '}
            <span className="font-bold text-ink">{order.email}</span>.
            {order.status === 'design-review'
              ? ' Дизайнер пришлёт макет в течение дня.'
              : ' Цифровая карта уже доступна на главной.'}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-[minmax(0,420px)_minmax(0,1fr)] sm:items-center">
        <CardDesignPreview
          surface={surface}
          productName={order.productName}
          productKind={productKind}
          ownerName={ownerName}
          last4={last4}
        />

        <dl className="space-y-2">
          <div>
            <dt className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-faint">
              Дизайн
            </dt>
            <dd className="mt-0.5 text-[12.5px] font-bold text-ink">{order.designName}</dd>
          </div>
          <div>
            <dt className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-faint">
              Заказ
            </dt>
            <dd className="mt-0.5 text-[12.5px] font-bold text-ink">
              {formatDate(order.createdAt)}
            </dd>
          </div>
          <div>
            <dt className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-faint">
              Оплата дизайна
            </dt>
            <dd className="mt-0.5 text-[12.5px] font-bold text-ink">
              {order.total === 0 ? '0 ₽' : formatMoney(order.total, { hideZeroFraction: true })}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  )
}

function ArtworkUploader({
  artwork,
  meta,
  issue,
  onSelect,
  onClear,
}: {
  artwork: string | null
  meta: ArtworkMeta | null
  issue: string | null
  onSelect: (file: File) => void
  onClear: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-faint">
            Своя картинка
          </p>
        </div>
        {artwork ? (
          <Badge variant="mint">Загружено</Badge>
        ) : (
          <Badge variant="neutral">Необязательно</Badge>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ARTWORK_ACCEPTED_TYPES.join(',')}
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) onSelect(file)
          event.target.value = ''
        }}
      />

      {artwork ? (
        <div className="mt-2.5 flex items-center gap-3">
          <img
            src={artwork}
            alt="Загруженный макет карты"
            className="h-14 w-[88px] shrink-0 rounded-lg border border-line object-cover"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-bold text-ink">{meta?.name ?? 'Изображение'}</p>
            <p className="mt-0.5 text-[11px] text-muted">
              {meta ? `${meta.width}×${meta.height} px · ${formatBytes(meta.size)}` : ''}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <Button size="sm" variant="secondary" onClick={() => inputRef.current?.click()}>
              Заменить
            </Button>
            <Button size="icon-sm" variant="ghost" aria-label="Удалить картинку" onClick={onClear}>
              <Trash className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-2.5 flex w-full flex-col items-center gap-1 rounded-xl border border-dashed border-line-strong bg-white px-3 py-4 text-center transition-colors hover:border-ink/40 hover:bg-surface-soft"
        >
          <ImagePlus className="h-5 w-5 text-ink" />
          <span className="text-[12px] font-bold text-ink">Загрузить свою картинку</span>
          <span className="text-[11px] text-muted">
            PNG, JPG или WEBP до 15 МБ · далее выберете область
          </span>
        </button>
      )}

      {issue ? <p className="mt-2 text-[11.5px] font-semibold text-amber">{issue}</p> : null}
    </div>
  )
}

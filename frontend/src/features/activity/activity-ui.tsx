import {
  ArrowDownLeft,
  ArrowLeftRight,
  Banknote,
  Car,
  Plus,
  ReceiptText,
  Repeat,
  ShoppingBasket,
  type LucideIcon,
} from 'lucide-react'
import type { Activity, ActivityCategory } from './types'
import { CATEGORY_META } from './analytics'
import { cn } from '../../lib/cn'
import { Badge } from '../../components/ui/badge'
import { Money } from '../../components/ui/money'

const CATEGORY_ICONS: Record<ActivityCategory, LucideIcon> = {
  income: ArrowDownLeft,
  groceries: ShoppingBasket,
  transport: Car,
  subscriptions: Repeat,
  transfer: ArrowLeftRight,
  cash: Banknote,
  topup: Plus,
  other: ReceiptText,
}

export function ActivityIcon({
  category,
  size = 'md',
}: {
  category: ActivityCategory
  size?: 'sm' | 'md' | 'lg'
}) {
  const meta = CATEGORY_META[category]
  const Icon = CATEGORY_ICONS[category]

  const sizeClass =
    size === 'sm' ? 'h-8 w-8 rounded-lg' : size === 'lg' ? 'h-12 w-12 rounded-2xl' : 'h-10 w-10 rounded-xl'
  const iconClass = size === 'sm' ? 'h-3.5 w-3.5' : size === 'lg' ? 'h-5.5 w-5.5' : 'h-[18px] w-[18px]'

  return (
    <span
      className={cn('grid shrink-0 place-items-center', sizeClass)}
      style={{ backgroundColor: meta.soft, color: meta.color }}
      aria-hidden="true"
    >
      <Icon className={iconClass} strokeWidth={1.9} />
    </span>
  )
}

export function ActivityStatusBadge({ status }: { status: Activity['status'] }) {
  if (status === 'pending') return <Badge variant="amber">В обработке</Badge>
  if (status === 'failed') return <Badge variant="rose">Отклонено</Badge>
  return <Badge variant="mint">Выполнено</Badge>
}

export function ActivityAmount({ activity }: { activity: Activity }) {
  return (
    <Money
      amount={activity.amount}
      signed
      hideZeroFraction
      className="text-[14.5px] font-bold"
    />
  )
}

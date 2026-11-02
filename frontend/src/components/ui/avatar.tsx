import { getInitials } from '../../lib/date'
import { cn } from '../../lib/cn'

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

interface AvatarProps {
  name: string
  size?: AvatarSize
  className?: string
  ring?: boolean
}

const sizeClasses: Record<AvatarSize, string> = {
  xs: 'h-7 w-7 text-[11px]',
  sm: 'h-9 w-9 text-[12px]',
  md: 'h-11 w-11 text-[14px]',
  lg: 'h-14 w-14 text-base',
  xl: 'h-20 w-20 text-xl',
}

const gradients = [
  'from-[#0e1a28] via-[#263a4f] to-[#456078]',
  'from-[#4f6b0d] via-[#7c9c2a] to-[#b9e548]',
  'from-[#1e7a57] via-[#3fa884] to-[#b8ecd4]',
  'from-[#3b5bfd] via-[#6178ff] to-[#b6c2ff]',
]

function hashName(name: string): number {
  let hash = 0
  for (const char of name) {
    hash = (hash * 31 + char.charCodeAt(0)) % 997
  }
  return hash
}

export function Avatar({ name, size = 'md', className, ring = false }: AvatarProps) {
  const gradient = gradients[hashName(name) % gradients.length]

  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center rounded-full bg-gradient-to-br font-bold tracking-wide text-white',
        gradient,
        sizeClasses[size],
        ring ? 'ring-2 ring-white/80' : undefined,
        className,
      )}
    >
      {getInitials(name)}
    </span>
  )
}

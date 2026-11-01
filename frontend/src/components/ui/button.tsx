import { motion, type HTMLMotionProps } from 'framer-motion'
import { LoaderCircle } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

type MotionButtonProps = Omit<HTMLMotionProps<'button'>, 'children'>

export type ButtonVariant =
  | 'primary'
  | 'accent'
  | 'secondary'
  | 'ghost'
  | 'danger'
  | 'dark'
  | 'outline-light'

export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm'

export interface ButtonProps extends MotionButtonProps {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  leadingIcon?: ReactNode
  trailingIcon?: ReactNode
  children?: ReactNode
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-ink text-white shadow-[0_10px_24px_-14px_rgba(10,18,28,0.8)] hover:bg-ink-soft',
  accent:
    'bg-lime text-ink shadow-[0_10px_26px_-16px_rgba(185,229,72,0.9)] hover:bg-lime-strong',
  secondary:
    'border border-line bg-white text-ink hover:border-line-strong hover:bg-surface-soft',
  ghost: 'bg-transparent text-ink hover:bg-black/[0.045]',
  danger: 'bg-rose text-white hover:bg-[#b84b37]',
  dark: 'bg-navy text-white hover:bg-navy-soft',
  'outline-light':
    'border border-white/20 bg-white/[0.06] text-white hover:bg-white/[0.12]',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-10 gap-2 px-4 text-[14px]',
  md: 'h-12 gap-2 px-5 text-[15px]',
  lg: 'h-[52px] gap-2.5 px-6 text-[16px]',
  icon: 'h-11 w-11 p-0',
  'icon-sm': 'h-10 w-10 p-0',
}

/**
 * Single button primitive with a tactile Framer Motion press response.
 * `type` defaults to "button" so a button inside a form never submits by
 * accident; submit buttons set `type="submit"` explicitly.
 */
export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  leadingIcon,
  trailingIcon,
  className,
  children,
  disabled,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <motion.button
      type={type}
      whileTap={disabled || loading ? undefined : { scale: 0.975 }}
      transition={{ duration: 0.12, ease: 'easeOut' }}
      disabled={disabled || loading}
      className={cn(
        'inline-flex select-none items-center justify-center rounded-full font-semibold tracking-[-0.01em] transition-colors duration-200',
        'disabled:pointer-events-none disabled:opacity-45',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {loading ? (
        <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        leadingIcon
      )}
      {children}
      {trailingIcon}
    </motion.button>
  )
}

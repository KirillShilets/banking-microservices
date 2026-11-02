import { Check, Copy } from 'lucide-react'
import { useRef, useState } from 'react'
import { cn } from '../../lib/cn'

interface CopyButtonProps {
  value: string
  label?: string
  className?: string
  onCopied?: () => void
}

export function CopyButton({
  value,
  label = 'Скопировать',
  className,
  onCopied,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<number | undefined>(undefined)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      onCopied?.()

      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      aria-label={copied ? 'Скопировано' : label}
      title={copied ? 'Скопировано' : label}
      className={cn(
        'grid h-9 w-9 place-items-center rounded-lg text-muted transition-colors hover:bg-black/[0.05] hover:text-ink',
        className,
      )}
    >
      {copied ? (
        <Check className="h-4 w-4 text-emerald" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
    </button>
  )
}

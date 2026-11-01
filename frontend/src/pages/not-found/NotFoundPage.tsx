import { ArrowLeft, Compass } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { Logo } from '../../components/ui/logo'

export function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className="grid min-h-[70dvh] place-items-center py-8">
      <Card className="w-full max-w-lg overflow-hidden">
        <div className="relative bg-navy px-7 py-8 text-white">
          <div className="pointer-events-none absolute -right-10 -top-16 h-44 w-44 rounded-full bg-lime/20 blur-3xl" />
          <Logo tone="light" asLink={false} />
          <p className="mt-8 font-mono text-[12px] tracking-[0.2em] text-lime">404</p>
          <h1 className="mt-2 text-[31px] font-extrabold leading-[1.05] tracking-[-0.045em]">
            Страница потерялась
          </h1>
          <p className="mt-2 max-w-sm text-[13.5px] leading-relaxed text-white/50">
            Раздел не найден или был перемещён. Вернитесь на главную — там
            остались все счета и операции.
          </p>
        </div>

        <div className="flex flex-col gap-2 p-6 sm:flex-row">
          <Button
            className="flex-1"
            leadingIcon={<ArrowLeft className="h-4 w-4" />}
            onClick={() => navigate('/')}
          >
            На главную
          </Button>
          <Button
            variant="secondary"
            className="flex-1"
            leadingIcon={<Compass className="h-4 w-4" />}
            onClick={() => navigate('/history')}
          >
            История
          </Button>
        </div>
      </Card>
    </div>
  )
}

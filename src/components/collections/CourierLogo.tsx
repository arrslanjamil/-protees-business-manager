import { getCourierBrand } from '@/lib/courierBrand'
import { classNames } from '@/lib/utils'

export function CourierLogo({ name, size = 44 }: { name: string; size?: number }) {
  const brand = getCourierBrand(name)
  return (
    <div
      className={classNames('flex shrink-0 items-center justify-center rounded-xl font-display text-xs font-bold', brand.className)}
      style={{ width: size, height: size }}
      title={name}
    >
      {brand.initials}
    </div>
  )
}

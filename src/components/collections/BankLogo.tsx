import { getBankBrand } from '@/lib/bankBrand'
import { classNames } from '@/lib/utils'

export function BankLogo({ name, size = 40 }: { name: string; size?: number }) {
  const brand = getBankBrand(name)
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

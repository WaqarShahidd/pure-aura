import { site } from '../../../config/site'
import { cn } from '../../../utils/classNames'

// Card marks live as <symbol> entries in public/icons.svg; site.paymentIcons names which ones
// to show and in what order.
export default function PaymentIcons({ className, iconClassName }) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {site.paymentIcons.map(({ id, label }) => (
        <svg
          key={id}
          role="img"
          aria-label={label}
          className={cn('h-6 w-10', iconClassName)}
          viewBox="0 0 48 32"
        >
          <use href={`/icons.svg#${id}-icon`} />
        </svg>
      ))}
    </div>
  )
}

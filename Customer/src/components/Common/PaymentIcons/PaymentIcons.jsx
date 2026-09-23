import { cn } from '../../../utils/classNames'

// Card marks live as <symbol> entries in public/icons.svg; site.paymentIcons names which ones
// to show and in what order.
// Takes the icon list as a prop rather than importing site config. The footer strip is a
// TRUST signal (brands we accept, admin-ordered) while the checkout row is a CAPABILITY
// list (methods actually enabled) - two different questions that happened to share one
// source, and now do not.
export default function PaymentIcons({ icons = [], className, iconClassName }) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {icons.map(({ id, label }) => (
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

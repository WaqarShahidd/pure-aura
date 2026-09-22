import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '../../../utils/classNames'

// items: [{ label, href }] — the last entry renders as plain text, since it is the current page.
export default function Breadcrumb({ items, className }) {
  return (
    <nav aria-label="Breadcrumb" className={cn('text-sm text-text-muted', className)}>
      <ol className="flex flex-wrap items-center justify-center gap-2">
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          return (
            <Fragment key={item.label}>
              <li>
                {isLast || !item.href ? (
                  <span aria-current="page" className="text-charcoal">
                    {item.label}
                  </span>
                ) : (
                  <Link to={item.href} className="transition-colors hover:text-charcoal">
                    {item.label}
                  </Link>
                )}
              </li>
              {!isLast && <li aria-hidden="true">&gt;</li>}
            </Fragment>
          )
        })}
      </ol>
    </nav>
  )
}

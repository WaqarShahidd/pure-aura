import { useState } from 'react'
import { Link } from 'react-router-dom'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { SOCIAL_ICONS } from '../../config/socialIcons'
import { useBootstrap } from '../../data/useContent'

export default function AnnouncementBar() {
  const { announcements, socials } = useBootstrap()
  const [index, setIndex] = useState(0)

  const total = announcements.length
  // An admin can schedule every announcement out of its window, which leaves none. The
  // bar removes itself rather than rendering an empty black strip.
  if (total === 0) return null

  const current = announcements[index % total]

  const step = (delta) => setIndex((prev) => (prev + delta + total) % total)

  return (
    <div className="flex items-center justify-between gap-4 bg-charcoal px-4 py-2.5 text-xs text-white md:px-8">
      <button
        type="button"
        aria-label="Previous announcement"
        onClick={() => step(-1)}
        className="opacity-70 transition-opacity hover:opacity-100"
      >
        <ChevronLeftIcon fontSize="small" />
      </button>

      <div className="flex flex-1 items-center justify-center gap-3 text-center">
        <span className="tracking-wide">{current.message}</span>
        <Link
          to={current.ctaHref}
          className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-charcoal"
        >
          {current.ctaLabel}
        </Link>
      </div>

      <div className="hidden items-center gap-4 md:flex">
        <button
          type="button"
          aria-label="Next announcement"
          onClick={() => step(1)}
          className="opacity-70 transition-opacity hover:opacity-100"
        >
          <ChevronRightIcon fontSize="small" />
        </button>

        <div className="flex items-center gap-3">
          {socials.map(({ label, icon, href }) => {
            const Icon = SOCIAL_ICONS[icon]
            if (!Icon) return null
            return (
              <a
                key={label}
                href={href}
                aria-label={label}
                target="_blank"
                rel="noreferrer"
                className="opacity-80 transition-opacity hover:opacity-100"
              >
                <Icon fontSize="small" />
              </a>
            )
          })}
        </div>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { Link } from 'react-router-dom'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { site } from '../../config/site'
import { SOCIAL_ICONS } from '../../config/socialIcons'
import LocaleSelect from './LocaleSelect'

export default function AnnouncementBar() {
  const [index, setIndex] = useState(0)
  const total = site.announcements.length
  const current = site.announcements[index]

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
          {site.socials.map(({ label, icon, href }) => {
            const Icon = SOCIAL_ICONS[icon]
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

        <div className="flex items-center gap-4 border-l border-white/20 pl-4">
          <LocaleSelect label="Language" options={site.languages} />
          <LocaleSelect label="Region" options={site.regions} />
        </div>
      </div>
    </div>
  )
}

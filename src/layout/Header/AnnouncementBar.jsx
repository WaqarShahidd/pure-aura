import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import TwitterIcon from '@mui/icons-material/Twitter'
import FacebookIcon from '@mui/icons-material/Facebook'
import PinterestIcon from '@mui/icons-material/Pinterest'
import InstagramIcon from '@mui/icons-material/Instagram'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import { site } from '../../config/site'

const SOCIAL_ICONS = {
  x: TwitterIcon,
  facebook: FacebookIcon,
  pinterest: PinterestIcon,
  instagram: InstagramIcon,
}

export default function AnnouncementBar() {
  return (
    <div className="flex items-center justify-between gap-4 bg-charcoal px-4 py-2.5 text-xs text-white md:px-8">
      <button type="button" aria-label="Previous announcement" className="opacity-70 hover:opacity-100">
        <ChevronLeftIcon fontSize="small" />
      </button>

      <div className="flex flex-1 items-center justify-center gap-3">
        <span className="tracking-wide">{site.announcement.message}</span>
        <a
          href={site.announcement.ctaHref}
          className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-charcoal"
        >
          {site.announcement.ctaLabel}
        </a>
      </div>

      <div className="hidden items-center gap-4 md:flex">
        <button type="button" aria-label="Next announcement" className="opacity-70 hover:opacity-100">
          <ChevronRightIcon fontSize="small" />
        </button>

        <div className="flex items-center gap-3">
          {site.socials.map(({ label, icon, href }) => {
            const Icon = SOCIAL_ICONS[icon]
            return (
              <a key={label} href={href} aria-label={label} className="opacity-80 hover:opacity-100">
                <Icon fontSize="small" />
              </a>
            )
          })}
        </div>

        <div className="h-4 w-px bg-white/30" />

        <button type="button" className="flex items-center gap-1 opacity-90 hover:opacity-100">
          {site.languages[0]} <KeyboardArrowDownIcon fontSize="small" />
        </button>
        <button type="button" className="flex items-center gap-1 opacity-90 hover:opacity-100">
          {site.regions[0]} <KeyboardArrowDownIcon fontSize="small" />
        </button>
      </div>
    </div>
  )
}

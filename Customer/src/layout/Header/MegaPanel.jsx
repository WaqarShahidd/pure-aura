import { useState } from 'react'
import { Link } from 'react-router-dom'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import ImagePlaceholder from '../../components/Common/ImagePlaceholder/ImagePlaceholder'
import { cn } from '../../utils/classNames'

// Full-width panel: a sidebar of groups on the left, and the active group's columns beside it.
// Hovering a sidebar row swaps the body without closing the menu.
export default function MegaPanel({ item, onNavigate }) {
  const [activeId, setActiveId] = useState(item.groups[0].id)
  const group = item.groups.find((candidate) => candidate.id === activeId) ?? item.groups[0]

  return (
    <div className="border-t border-charcoal/10 bg-white shadow-lg">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-6 py-10 md:px-10 lg:grid-cols-[18rem_1fr]">
        <ul className="flex flex-col">
          {item.groups.map((candidate) => (
            <li key={candidate.id}>
              <button
                type="button"
                onMouseEnter={() => setActiveId(candidate.id)}
                onFocus={() => setActiveId(candidate.id)}
                className={cn(
                  'flex w-full items-center justify-between border-b border-charcoal/10 px-4 py-4 text-left text-sm font-medium transition-colors',
                  candidate.id === activeId ? 'bg-sage text-charcoal' : 'text-charcoal hover:bg-sage/50',
                )}
              >
                {candidate.label}
                <ChevronRightIcon fontSize="small" />
              </button>
            </li>
          ))}
        </ul>

        <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
          <div>
            <Link
              to={group.allHref}
              onClick={onNavigate}
              className="text-sm font-semibold text-charcoal hover:text-accent"
            >
              {group.allLabel}
            </Link>
            <ul className="mt-4 flex flex-col gap-2.5">
              {group.allLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.href}
                    onClick={onNavigate}
                    className="text-sm text-text-muted transition-colors hover:text-charcoal"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {group.columns.map((column) => (
            <div key={column.heading}>
              <Link
                to={column.href}
                onClick={onNavigate}
                className="text-sm font-semibold text-charcoal hover:text-accent"
              >
                {column.heading}
              </Link>

              <Link to={column.href} onClick={onNavigate} className="mt-4 block">
                <ImagePlaceholder
                  src={column.image}
                  alt={column.heading}
                  seed={column.seed || column.heading}
                />
              </Link>

              <ul className="mt-4 flex flex-col gap-2.5">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.href}
                      onClick={onNavigate}
                      className="text-sm text-text-muted transition-colors hover:text-charcoal"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

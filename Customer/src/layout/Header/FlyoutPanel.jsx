import { useState } from 'react'
import { Link } from 'react-router-dom'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { cn } from '../../utils/classNames'

// Two-level menu: labels on the left, the hovered panel's links on the right. Both columns sit
// inside one box so travelling between them never crosses a gap that would close the menu.
export default function FlyoutPanel({ item, onNavigate }) {
  const [activeId, setActiveId] = useState(item.panels[0].id)
  const panel = item.panels.find((candidate) => candidate.id === activeId) ?? item.panels[0]

  return (
    <div className="border-t border-charcoal/10 bg-white shadow-lg">
      <div className="mx-auto flex max-w-7xl px-6 py-8 md:px-10">
        <ul className="w-64 shrink-0 border-r border-charcoal/10 pr-6">
          {item.panels.map((candidate) => (
            <li key={candidate.id}>
              <button
                type="button"
                onMouseEnter={() => setActiveId(candidate.id)}
                onFocus={() => setActiveId(candidate.id)}
                className={cn(
                  'flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition-colors',
                  candidate.id === activeId
                    ? 'bg-sage font-medium text-charcoal'
                    : 'text-charcoal hover:bg-sage/50',
                )}
              >
                {candidate.label}
                <ChevronRightIcon fontSize="small" />
              </button>
            </li>
          ))}
        </ul>

        <div className="flex-1 pl-8">
          <Link
            to={panel.href}
            onClick={onNavigate}
            className="text-sm font-semibold text-charcoal hover:text-accent"
          >
            {panel.label}
          </Link>

          <ul className="mt-4 grid grid-cols-2 gap-x-8 gap-y-2.5 md:grid-cols-3">
            {panel.links.map((link) => (
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
      </div>
    </div>
  )
}

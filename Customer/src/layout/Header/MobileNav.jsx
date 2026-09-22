import { useState } from 'react'
import Drawer from '@mui/material/Drawer'
import { Link } from 'react-router-dom'
import CloseIcon from '@mui/icons-material/Close'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import { navigation } from '../../config/navigation'
import { site } from '../../config/site'
import { ROUTES } from '../../config/routes'
import { cn } from '../../utils/classNames'
import { layoutOf } from './navLayout'

// Flattens whichever shape an item uses into a single list for the accordion — mobile has no
// room for a sidebar or a second column.
function childLinksOf(item) {
  const layout = layoutOf(item)
  if (layout === 'mega') {
    return item.groups.map((group) => ({ label: group.label, href: group.allHref }))
  }
  if (layout === 'flyout') {
    return item.panels.map((panel) => ({ label: panel.label, href: panel.href }))
  }
  return item.children ?? []
}

export default function MobileNav({ open, onClose }) {
  const [expanded, setExpanded] = useState(null)

  return (
    <Drawer
      anchor="left"
      open={open}
      onClose={onClose}
      // The theme sets a global borderRadius of 999; without this the drawer is a capsule.
      slotProps={{ paper: { sx: { borderRadius: 0, width: 320 } } }}
    >
      <div className="flex items-center justify-between border-b border-charcoal/10 px-5 py-4">
        <Link to={ROUTES.home} onClick={onClose} className="text-xl font-semibold lowercase">
          {site.name.split(' ')[0].toLowerCase()}
          <span className="text-accent">.</span>
        </Link>
        <button type="button" aria-label="Close menu" onClick={onClose}>
          <CloseIcon />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        {navigation.map((item) => {
          const children = childLinksOf(item)
          const isOpen = expanded === item.label

          return (
            <div key={item.label} className="border-b border-charcoal/5">
              <div className="flex items-center">
                <Link
                  to={item.href}
                  onClick={onClose}
                  className="flex-1 px-5 py-3.5 text-sm font-medium"
                >
                  {item.label}
                </Link>
                {children.length > 0 && (
                  <button
                    type="button"
                    aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${item.label}`}
                    aria-expanded={isOpen}
                    onClick={() => setExpanded(isOpen ? null : item.label)}
                    className="px-4 py-3.5"
                  >
                    <KeyboardArrowDownIcon
                      fontSize="small"
                      className={cn('transition-transform', isOpen && 'rotate-180')}
                    />
                  </button>
                )}
              </div>

              {isOpen && (
                <ul className="bg-sage/40 pb-2">
                  {children.map((child) => (
                    <li key={child.label}>
                      <Link
                        to={child.href}
                        onClick={onClose}
                        className="block px-8 py-2.5 text-sm text-text-muted"
                      >
                        {child.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        })}
      </nav>
    </Drawer>
  )
}

import { Link } from 'react-router-dom'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import ListPanel from './ListPanel'
import { layoutOf } from './navLayout'
import { cn } from '../../utils/classNames'
import { palette } from '../../theme/palette'

// Trigger only. Mega and flyout panels are full-width and render at header level; a list panel
// has to anchor under its own item, so that one renders here instead.
//
// The label navigates and the chevron toggles, kept separate so the panel is reachable by
// keyboard and on touch, where hover does not exist.
export default function NavItem({ item, dark, open, onOpen, onClose }) {
  const layout = layoutOf(item)
  const hasPanel = layout !== 'link'
  const tone = dark ? 'text-charcoal' : 'text-white'

  return (
    <div className="relative" onMouseEnter={() => hasPanel && onOpen(item.label)}>
      <div className={cn('flex items-center gap-1 py-2 text-sm font-medium', tone)}>
        {item.highlight && <AutoAwesomeIcon sx={{ fontSize: 14, color: palette.accent }} />}

        <Link to={item.href} onClick={onClose} className="transition-colors">
          {item.label}
        </Link>

        {hasPanel && (
          <button
            type="button"
            aria-label={`${open ? 'Close' : 'Open'} ${item.label} menu`}
            aria-expanded={open}
            aria-haspopup="true"
            onClick={() => (open ? onClose() : onOpen(item.label))}
            className="flex items-center"
          >
            <KeyboardArrowDownIcon
              fontSize="small"
              className={cn('transition-transform', open && 'rotate-180')}
            />
          </button>
        )}
      </div>

      {layout === 'list' && open && <ListPanel item={item} onNavigate={onClose} />}
    </div>
  )
}

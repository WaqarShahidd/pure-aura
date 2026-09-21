import { useState } from 'react'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import { cn } from '../../utils/classNames'

export default function NavDropdown({ item, dark }) {
  const [anchorEl, setAnchorEl] = useState(null)
  const open = Boolean(anchorEl)
  const hasChildren = item.children?.length > 0

  return (
    <div
      onMouseEnter={(event) => hasChildren && setAnchorEl(event.currentTarget)}
      onMouseLeave={() => setAnchorEl(null)}
    >
      <a
        href={item.href}
        className={cn(
          'flex items-center gap-1 text-sm font-medium',
          dark ? 'text-charcoal' : 'text-white',
        )}
      >
        {item.highlight && <AutoAwesomeIcon sx={{ fontSize: 14, color: '#e2733a' }} />}
        {item.label}
        {hasChildren && <KeyboardArrowDownIcon fontSize="small" />}
      </a>

      {hasChildren && (
        <Menu
          anchorEl={anchorEl}
          open={open}
          onClose={() => setAnchorEl(null)}
          disableAutoFocus
          disableEnforceFocus
          disableScrollLock
          MenuListProps={{ onMouseLeave: () => setAnchorEl(null) }}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        >
          {item.children.map((child) => (
            <MenuItem key={child.label} component="a" href={child.href}>
              {child.label}
            </MenuItem>
          ))}
        </Menu>
      )}
    </div>
  )
}

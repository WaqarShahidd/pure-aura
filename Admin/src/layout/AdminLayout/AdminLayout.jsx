import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  AppBar, Avatar, Box, Divider, Drawer, IconButton, List, ListItemButton, ListItemIcon,
  ListItemText, Menu, MenuItem, Toolbar, Typography,
} from '@mui/material'
import DashboardIcon from '@mui/icons-material/SpaceDashboard'
import InventoryIcon from '@mui/icons-material/Inventory2'
import CollectionsIcon from '@mui/icons-material/Collections'
import CategoryIcon from '@mui/icons-material/Sell'
import PermMediaIcon from '@mui/icons-material/PermMedia'
import HomeIcon from '@mui/icons-material/HomeOutlined'
import ReceiptIcon from '@mui/icons-material/ReceiptLong'
import PeopleIcon from '@mui/icons-material/People'
import TuneIcon from '@mui/icons-material/Tune'
import QuizIcon from '@mui/icons-material/QuizOutlined'
import SortIcon from '@mui/icons-material/SwapVert'
import InventoryTwoIcon from '@mui/icons-material/Warehouse'
import DiscountIcon from '@mui/icons-material/LocalOfferOutlined'
import ArticleIcon from '@mui/icons-material/ArticleOutlined'
import HelpIcon from '@mui/icons-material/HelpOutlineOutlined'
import CampaignIcon from '@mui/icons-material/CampaignOutlined'
import ViewSidebarIcon from '@mui/icons-material/ViewSidebarOutlined'
import AccountTreeIcon from '@mui/icons-material/AccountTreeOutlined'
import SettingsIcon from '@mui/icons-material/SettingsOutlined'
import MenuIcon from '@mui/icons-material/Menu'
import LogoutIcon from '@mui/icons-material/Logout'
import { useAuth } from '../../auth/useAuth'

const DRAWER_WIDTH = 236

// Sections that exist but are not built yet are listed with `soon` rather than hidden.
// A sidebar that grows new entries every week is harder to learn than one whose shape is
// stable from the start.
const NAV = [
  { to: '/', label: 'Dashboard', icon: DashboardIcon, end: true },
  { to: '/products', label: 'Products', icon: InventoryIcon },
  { to: '/collections', label: 'Collections', icon: CollectionsIcon },
  { to: '/categories', label: 'Categories', icon: CategoryIcon },
  { to: '/media', label: 'Media', icon: PermMediaIcon },
  { to: '/content/homepage', label: 'Homepage', icon: HomeIcon },
  { to: '/content/pages', label: 'Pages', icon: ArticleIcon },
  { to: '/content/faqs', label: 'FAQs', icon: HelpIcon },
  { to: '/content/navigation', label: 'Navigation', icon: AccountTreeIcon },
  { to: '/content/footer', label: 'Footer', icon: ViewSidebarIcon },
  { to: '/content/announcements', label: 'Announcement bar', icon: CampaignIcon },
  { to: '/orders', label: 'Orders', icon: ReceiptIcon },
  { to: '/facets', label: 'Facets', icon: TuneIcon },
  { to: '/quiz', label: 'Quiz', icon: QuizIcon },
  { to: '/sort-and-filters', label: 'Sort & filters', icon: SortIcon },
  { to: '/inventory', label: 'Inventory', icon: InventoryTwoIcon },
  { to: '/discounts', label: 'Discounts', icon: DiscountIcon },
  { to: '/customers', label: 'Customers', icon: PeopleIcon },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
]

function SidebarContent({ onNavigate }) {
  return (
    <>
      <Toolbar sx={{ px: 3 }}>
        <Typography sx={{ fontWeight: 600, letterSpacing: '-0.01em' }}>
          pure<Box component="span" sx={{ color: 'secondary.main' }}>.</Box>
          <Box component="span" sx={{ ml: 1, color: 'text.secondary', fontWeight: 400 }}>
            admin
          </Box>
        </Typography>
      </Toolbar>

      <Divider />

      <List sx={{ px: 1.5, py: 1 }}>
        {NAV.map(({ to, label, icon: Icon, end, soon }) => (
          <ListItemButton
            key={to}
            component={NavLink}
            to={to}
            end={end}
            onClick={onNavigate}
            disabled={soon}
            sx={{
              borderRadius: 1.5,
              mb: 0.5,
              '&.active': { bgcolor: 'rgba(26,26,26,0.06)', fontWeight: 600 },
            }}
          >
            <ListItemIcon sx={{ minWidth: 36 }}>
              <Icon fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary={label}
              secondary={soon ? 'Coming soon' : null}
              slotProps={{
                primary: { fontSize: 14 },
                secondary: { fontSize: 11 },
              }}
            />
          </ListItemButton>
        ))}
      </List>
    </>
  )
}

export default function AdminLayout() {
  const { admin, signOut } = useAuth()
  const { pathname } = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [menuAnchor, setMenuAnchor] = useState(null)

  const current = NAV.find((item) => (item.end ? pathname === item.to : pathname.startsWith(item.to)))

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar
        position="fixed"
        color="inherit"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` },
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Toolbar>
          <IconButton
            edge="start"
            onClick={() => setMobileOpen(true)}
            sx={{ mr: 2, display: { md: 'none' } }}
            aria-label="Open navigation"
          >
            <MenuIcon />
          </IconButton>

          <Typography variant="h3" sx={{ flexGrow: 1 }}>
            {current?.label ?? 'Admin'}
          </Typography>

          <IconButton onClick={(event) => setMenuAnchor(event.currentTarget)} aria-label="Account">
            <Avatar sx={{ width: 30, height: 30, bgcolor: 'primary.main', fontSize: 13 }}>
              {admin?.name?.[0]?.toUpperCase() ?? '?'}
            </Avatar>
          </IconButton>

          <Menu
            anchorEl={menuAnchor}
            open={Boolean(menuAnchor)}
            onClose={() => setMenuAnchor(null)}
          >
            <MenuItem disabled sx={{ opacity: '1 !important' }}>
              <Box>
                <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{admin?.name}</Typography>
                <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                  {admin?.email} · {admin?.role}
                </Typography>
              </Box>
            </MenuItem>
            <Divider />
            <MenuItem onClick={signOut}>
              <ListItemIcon>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              Sign out
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { width: DRAWER_WIDTH, borderRight: '1px solid rgba(26,26,26,0.10)' },
          }}
        >
          <SidebarContent onNavigate={() => setMobileOpen(false)} />
        </Drawer>

        <Drawer
          variant="permanent"
          open
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { width: DRAWER_WIDTH, borderRight: '1px solid rgba(26,26,26,0.10)' },
          }}
        >
          <SidebarContent />
        </Drawer>
      </Box>

      <Box component="main" sx={{ flexGrow: 1, p: 3, width: { md: `calc(100% - ${DRAWER_WIDTH}px)` } }}>
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  )
}

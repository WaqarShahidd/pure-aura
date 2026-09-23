import { useState } from 'react'
import { Box, Tab, Tabs, Typography } from '@mui/material'
import { useAuth } from '../../auth/useAuth'
import GeneralSettings from './GeneralSettings'
import ShippingSettings from './ShippingSettings'
import PaymentSettings from './PaymentSettings'
import TaxSettings from './TaxSettings'
import UserSettings from './UserSettings'
import AuditLog from './AuditLog'

const TABS = [
  { id: 'general', label: 'General', Component: GeneralSettings },
  { id: 'shipping', label: 'Shipping', Component: ShippingSettings },
  { id: 'payments', label: 'Payments', Component: PaymentSettings },
  { id: 'tax', label: 'Tax', Component: TaxSettings },
  { id: 'users', label: 'Users', Component: UserSettings },
  { id: 'audit', label: 'Audit log', Component: AuditLog },
]

export default function SettingsPage() {
  const { can } = useAuth()
  const [tab, setTab] = useState('general')
  const active = TABS.find((candidate) => candidate.id === tab) ?? TABS[0]
  const Active = active.Component

  return (
    <Box>
      <Typography variant="h2" sx={{ mb: 2 }}>Settings</Typography>
      <Tabs
        value={tab}
        onChange={(_, value) => setTab(value)}
        sx={{ mb: 3, borderBottom: '1px solid', borderColor: 'divider' }}
      >
        {TABS.map((candidate) => (
          <Tab
            key={candidate.id}
            value={candidate.id}
            label={candidate.label}
            disabled={(candidate.id === 'users' || candidate.id === 'audit') && !can('owner')}
          />
        ))}
      </Tabs>
      <Active />
    </Box>
  )
}

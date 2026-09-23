import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert, Box, Button, Card, CardContent, Chip, Dialog, DialogActions, DialogContent,
  DialogTitle, Snackbar, Stack, Switch, TextField, Typography,
} from '@mui/material'
import EditIcon from '@mui/icons-material/EditOutlined'
import { get, patch } from '../../lib/api'
import { useAuth } from '../../auth/useAuth'

export default function PaymentSettings() {
  const queryClient = useQueryClient()
  const { can } = useAuth()
  const [editing, setEditing] = useState(null)
  const [draft, setDraft] = useState(null)
  const [toast, setToast] = useState(null)

  const { data: methods, isPending } = useQuery({
    queryKey: ['admin-payment-methods'],
    queryFn: () => get('/admin/payment-methods').then((body) => body.data),
  })
  const { data: flags } = useQuery({
    queryKey: ['admin-feature-flags'],
    queryFn: () => get('/admin/feature-flags').then((body) => body.data),
  })

  const toggleEnabled = useMutation({
    mutationFn: ({ id, isEnabled }) => patch(`/admin/payment-methods/${id}`, { isEnabled }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-payment-methods'] }),
  })

  const save = useMutation({
    mutationFn: (body) => patch(`/admin/payment-methods/${editing.id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-payment-methods'] })
      setToast({ severity: 'success', message: 'Saved' })
      setEditing(null)
    },
    onError: (error) => setToast({ severity: 'error', message: error.message }),
  })

  const toggleFlag = useMutation({
    mutationFn: ({ key, isEnabled }) => patch(`/admin/feature-flags/${key}`, { isEnabled }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-feature-flags'] }),
    onError: (error) => setToast({ severity: 'error', message: error.message }),
  })

  if (isPending) return <Typography sx={{ color: 'text.secondary' }}>Loading…</Typography>

  return (
    <Stack spacing={3}>
      <Stack spacing={1.5}>
        <Typography variant="h3">Payment methods</Typography>
        <Alert severity="info">
          Enabled is the merchant switch. A gateway (card, PayPal, Stripe) is only actually
          offered when its engineering flag below is also on - that needs real credentials
          and a deploy, not just a toggle here.
        </Alert>
        {methods.map((method) => (
          <Card key={method.id}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ flexGrow: 1 }}>
                <Typography sx={{ fontWeight: 600 }}>{method.label}</Typography>
                <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                  {method.code} · {method.kind}
                  {method.featureFlagKey ? ` · needs ${method.featureFlagKey}` : ''}
                  {method.surchargeAmount > 0 ? ` · +Rs ${method.surchargeAmount} surcharge` : ''}
                </Typography>
              </Box>
              {!method.isDeletable && <Chip size="small" label="Fixed" variant="outlined" />}
              {can('manager') && (
                <>
                  <Switch checked={method.isEnabled} onChange={(e) => toggleEnabled.mutate({ id: method.id, isEnabled: e.target.checked })} />
                  <Button
                    size="small" startIcon={<EditIcon />}
                    onClick={() => {
                      setEditing(method)
                      setDraft({ instructions: method.instructions ?? '', surchargeAmount: method.surchargeAmount })
                    }}
                  >
                    Edit
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </Stack>

      <Stack spacing={1.5}>
        <Typography variant="h3">Feature flags</Typography>
        <Alert severity="warning">
          Owner only. Turning one on without real credentials configured strands a customer
          on a form with no processor behind it.
        </Alert>
        {(flags ?? []).map((flag) => (
          <Card key={flag.key}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ flexGrow: 1 }}>
                <Typography sx={{ fontWeight: 600 }}>{flag.label}</Typography>
                <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{flag.description}</Typography>
              </Box>
              {can('owner') && (
                <Switch checked={flag.isEnabled} onChange={(e) => toggleFlag.mutate({ key: flag.key, isEnabled: e.target.checked })} />
              )}
            </CardContent>
          </Card>
        ))}
      </Stack>

      <Dialog open={Boolean(editing)} onClose={() => setEditing(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Edit "{editing?.label}"</DialogTitle>
        <DialogContent dividers>
          {draft && (
            <Stack spacing={2} sx={{ mt: 0.5 }}>
              <TextField label="Instructions" value={draft.instructions} onChange={(e) => setDraft({ ...draft, instructions: e.target.value })} multiline minRows={3} fullWidth />
              <TextField label="Surcharge (Rs)" type="number" value={draft.surchargeAmount} onChange={(e) => setDraft({ ...draft, surchargeAmount: Number(e.target.value) })} fullWidth />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditing(null)}>Cancel</Button>
          <Button variant="contained" disabled={save.isPending} onClick={() => save.mutate({ instructions: draft.instructions || null, surchargeAmount: draft.surchargeAmount })}>
            {save.isPending ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={Boolean(toast)} autoHideDuration={4000} onClose={() => setToast(null)}>
        <Alert severity={toast?.severity ?? 'info'} onClose={() => setToast(null)}>{toast?.message}</Alert>
      </Snackbar>
    </Stack>
  )
}

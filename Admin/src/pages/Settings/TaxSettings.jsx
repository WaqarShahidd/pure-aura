import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert, Box, Button, Card, CardContent, Chip, Dialog, DialogActions, DialogContent,
  DialogTitle, IconButton, Snackbar, Stack, Switch, TextField, Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/EditOutlined'
import { get, patch, post } from '../../lib/api'
import { useAuth } from '../../auth/useAuth'

const EMPTY = { country: '', rateBp: 0, isInclusive: true, isDefault: false, isActive: true }

export default function TaxSettings() {
  const queryClient = useQueryClient()
  const { can } = useAuth()
  const [editing, setEditing] = useState(null)
  const [draft, setDraft] = useState(EMPTY)
  const [errors, setErrors] = useState([])
  const [toast, setToast] = useState(null)

  const { data, isPending } = useQuery({
    queryKey: ['admin-tax-rates'],
    queryFn: () => get('/admin/tax-rates').then((body) => body.data),
  })

  const save = useMutation({
    mutationFn: (body) => (editing?.id ? patch(`/admin/tax-rates/${editing.id}`, body) : post('/admin/tax-rates', body)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tax-rates'] })
      setToast({ severity: 'success', message: 'Saved' })
      setEditing(null)
      setErrors([])
    },
    onError: (error) => setErrors(error.details ?? [{ field: '', message: error.message }]),
  })

  const fieldError = (field) => errors.find((d) => d.field === field)?.message

  if (isPending) return <Typography sx={{ color: 'text.secondary' }}>Loading…</Typography>

  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ alignItems: 'center' }}>
        <Typography variant="h3">Tax rates</Typography>
        <Box sx={{ flexGrow: 1 }} />
        {can('manager') && (
          <Button size="small" startIcon={<AddIcon />} onClick={() => { setEditing({}); setDraft(EMPTY); setErrors([]) }}>Add</Button>
        )}
      </Stack>

      <Alert severity="info">
        Prices include tax - this is shown as "(incl. GST Rs X)" under the total, never added
        on top. The default rate applies when a customer's country has no rate of its own.
      </Alert>

      <Stack spacing={1.5}>
        {data.map((rate) => (
          <Card key={rate.id}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ flexGrow: 1 }}>
                <Typography sx={{ fontWeight: 600 }}>{rate.country} — {(rate.rateBp / 100).toFixed(1)}%</Typography>
                <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                  {rate.isInclusive ? 'Tax-inclusive' : 'Tax-exclusive'}
                </Typography>
              </Box>
              {rate.isDefault && <Chip size="small" color="primary" label="Default" />}
              {!rate.isActive && <Chip size="small" label="Inactive" variant="outlined" />}
              {can('manager') && (
                <IconButton size="small" onClick={() => {
                  setEditing(rate)
                  setDraft({ country: rate.country, rateBp: rate.rateBp, isInclusive: rate.isInclusive, isDefault: rate.isDefault, isActive: rate.isActive })
                  setErrors([])
                }}>
                  <EditIcon fontSize="small" />
                </IconButton>
              )}
            </CardContent>
          </Card>
        ))}
      </Stack>

      <Dialog open={Boolean(editing)} onClose={() => setEditing(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{editing?.id ? 'Edit tax rate' : 'New tax rate'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            {errors.some((d) => !d.field) && <Alert severity="error">{errors.find((d) => !d.field).message}</Alert>}
            <TextField label="Country" value={draft.country} onChange={(e) => setDraft({ ...draft, country: e.target.value })} error={Boolean(fieldError('country'))} helperText={fieldError('country')} fullWidth />
            <TextField
              label="Rate (%)" type="number" value={draft.rateBp / 100}
              onChange={(e) => setDraft({ ...draft, rateBp: Math.round(Number(e.target.value) * 100) })}
              error={Boolean(fieldError('rateBp'))} helperText={fieldError('rateBp')} fullWidth
            />
            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography sx={{ fontSize: 14 }}>Tax-inclusive pricing</Typography>
              <Switch checked={draft.isInclusive} onChange={(e) => setDraft({ ...draft, isInclusive: e.target.checked })} />
            </Stack>
            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography sx={{ fontSize: 14 }}>Default rate</Typography>
              <Switch checked={draft.isDefault} onChange={(e) => setDraft({ ...draft, isDefault: e.target.checked })} />
            </Stack>
            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography sx={{ fontSize: 14 }}>Active</Typography>
              <Switch checked={draft.isActive} onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })} />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditing(null)}>Cancel</Button>
          <Button variant="contained" disabled={save.isPending} onClick={() => save.mutate(draft)}>{save.isPending ? 'Saving…' : 'Save'}</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={Boolean(toast)} autoHideDuration={4000} onClose={() => setToast(null)}>
        <Alert severity={toast?.severity ?? 'info'} onClose={() => setToast(null)}>{toast?.message}</Alert>
      </Snackbar>
    </Stack>
  )
}

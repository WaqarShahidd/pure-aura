import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert, Box, Button, Card, CardContent, Chip, Dialog, DialogActions, DialogContent,
  DialogTitle, IconButton, Snackbar, Stack, Switch, TextField, Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/DeleteOutlined'
import EditIcon from '@mui/icons-material/EditOutlined'
import { del, get, patch, post } from '../../lib/api'
import { useAuth } from '../../auth/useAuth'

const EMPTY = { code: '', label: '', detail: '', priceAmount: 0, freeOverAmount: '', isPickup: false, etaMinDays: '', etaMaxDays: '', isEnabled: true }

export default function ShippingSettings() {
  const queryClient = useQueryClient()
  const { can } = useAuth()
  const [editing, setEditing] = useState(null)
  const [draft, setDraft] = useState(EMPTY)
  const [errors, setErrors] = useState([])
  const [toast, setToast] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const { data, isPending } = useQuery({
    queryKey: ['admin-delivery-methods'],
    queryFn: () => get('/admin/delivery-methods').then((body) => body.data),
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-delivery-methods'] })

  const save = useMutation({
    mutationFn: (body) => (editing?.id ? patch(`/admin/delivery-methods/${editing.id}`, body) : post('/admin/delivery-methods', body)),
    onSuccess: () => { invalidate(); setToast({ severity: 'success', message: 'Saved' }); setEditing(null); setErrors([]) },
    onError: (error) => setErrors(error.details ?? [{ field: '', message: error.message }]),
  })

  const remove = useMutation({
    mutationFn: (id) => del(`/admin/delivery-methods/${id}`),
    onSuccess: () => { invalidate(); setToast({ severity: 'success', message: 'Deleted' }); setConfirmDelete(null) },
    onError: (error) => { setToast({ severity: 'error', message: error.message }); setConfirmDelete(null) },
  })

  const fieldError = (field) => errors.find((d) => d.field === field)?.message

  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ alignItems: 'center' }}>
        <Typography variant="h3">Delivery methods</Typography>
        <Box sx={{ flexGrow: 1 }} />
        {can('manager') && (
          <Button size="small" startIcon={<AddIcon />} onClick={() => { setEditing({}); setDraft(EMPTY); setErrors([]) }}>Add</Button>
        )}
      </Stack>

      {isPending ? (
        <Typography sx={{ color: 'text.secondary' }}>Loading…</Typography>
      ) : (
        <Stack spacing={1.5}>
          {data.map((method) => (
            <Card key={method.id}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography sx={{ fontWeight: 600 }}>{method.label} — Rs {method.priceAmount}</Typography>
                  <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                    {method.code} · {method.detail}{method.freeOverAmount ? ` · free over Rs ${method.freeOverAmount}` : ''}
                  </Typography>
                </Box>
                {!method.isEnabled && <Chip size="small" label="Disabled" variant="outlined" />}
                {can('manager') && (
                  <>
                    <IconButton size="small" onClick={() => {
                      setEditing(method)
                      setDraft({ ...method, freeOverAmount: method.freeOverAmount ?? '', etaMinDays: method.etaMinDays ?? '', etaMaxDays: method.etaMaxDays ?? '' })
                      setErrors([])
                    }}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => setConfirmDelete(method)}><DeleteIcon fontSize="small" /></IconButton>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      <Dialog open={Boolean(editing)} onClose={() => setEditing(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{editing?.id ? 'Edit delivery method' : 'New delivery method'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            {errors.some((d) => !d.field) && <Alert severity="error">{errors.find((d) => !d.field).message}</Alert>}
            <TextField label="Label" value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} error={Boolean(fieldError('label'))} helperText={fieldError('label')} fullWidth />
            <TextField label="Code" value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value })} error={Boolean(fieldError('code'))} helperText={fieldError('code')} fullWidth />
            <TextField label="Detail" value={draft.detail} onChange={(e) => setDraft({ ...draft, detail: e.target.value })} fullWidth />
            <Stack direction="row" spacing={2}>
              <TextField label="Price (Rs)" type="number" value={draft.priceAmount} onChange={(e) => setDraft({ ...draft, priceAmount: Number(e.target.value) })} sx={{ flex: 1 }} />
              <TextField label="Free over (Rs, blank = never)" type="number" value={draft.freeOverAmount} onChange={(e) => setDraft({ ...draft, freeOverAmount: e.target.value })} sx={{ flex: 1 }} />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField label="ETA min days" type="number" value={draft.etaMinDays} onChange={(e) => setDraft({ ...draft, etaMinDays: e.target.value })} sx={{ flex: 1 }} />
              <TextField label="ETA max days" type="number" value={draft.etaMaxDays} onChange={(e) => setDraft({ ...draft, etaMaxDays: e.target.value })} sx={{ flex: 1 }} />
            </Stack>
            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography sx={{ fontSize: 14 }}>Is pickup</Typography>
              <Switch checked={draft.isPickup} onChange={(e) => setDraft({ ...draft, isPickup: e.target.checked })} />
            </Stack>
            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography sx={{ fontSize: 14 }}>Enabled</Typography>
              <Switch checked={draft.isEnabled} onChange={(e) => setDraft({ ...draft, isEnabled: e.target.checked })} />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditing(null)}>Cancel</Button>
          <Button
            variant="contained" disabled={save.isPending}
            onClick={() => save.mutate({
              ...draft,
              freeOverAmount: draft.freeOverAmount === '' ? null : Number(draft.freeOverAmount),
              etaMinDays: draft.etaMinDays === '' ? null : Number(draft.etaMinDays),
              etaMaxDays: draft.etaMaxDays === '' ? null : Number(draft.etaMaxDays),
            })}
          >
            {save.isPending ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(confirmDelete)} onClose={() => setConfirmDelete(null)}>
        <DialogTitle>Delete "{confirmDelete?.label}"?</DialogTitle>
        <DialogContent><Typography sx={{ fontSize: 13, color: 'text.secondary' }}>Cannot be undone; refused if any order used it.</Typography></DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={() => remove.mutate(confirmDelete.id)}>Delete</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={Boolean(toast)} autoHideDuration={4000} onClose={() => setToast(null)}>
        <Alert severity={toast?.severity ?? 'info'} onClose={() => setToast(null)}>{toast?.message}</Alert>
      </Snackbar>
    </Stack>
  )
}

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert, Box, Button, Card, CardContent, Chip, Dialog, DialogActions, DialogContent,
  DialogTitle, IconButton, MenuItem, Snackbar, Stack, Switch, TextField, Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/DeleteOutlined'
import EditIcon from '@mui/icons-material/EditOutlined'
import { del, get, patch, post } from '../../lib/api'
import { useAuth } from '../../auth/useAuth'

const EMPTY = {
  code: '', kind: 'percent', value: 0, minSubtotal: 0, maxUses: '', perCustomerLimit: '',
  appliesTo: 'all', isActive: true,
}

const money = new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', minimumFractionDigits: 0, maximumFractionDigits: 0 })

function summaryOf(discount) {
  if (discount.kind === 'percent') return `${discount.value}% off`
  if (discount.kind === 'fixed') return `${money.format(discount.value)} off`
  return 'Free shipping'
}

export default function DiscountList() {
  const queryClient = useQueryClient()
  const { can } = useAuth()
  const [editing, setEditing] = useState(null)
  const [draft, setDraft] = useState(EMPTY)
  const [errors, setErrors] = useState([])
  const [toast, setToast] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const { data, isPending } = useQuery({
    queryKey: ['admin-discounts'],
    queryFn: () => get('/admin/discounts').then((body) => body.data),
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-discounts'] })

  const save = useMutation({
    mutationFn: (body) => (editing?.id ? patch(`/admin/discounts/${editing.id}`, body) : post('/admin/discounts', body)),
    onSuccess: () => { invalidate(); setToast({ severity: 'success', message: 'Saved' }); setEditing(null); setErrors([]) },
    onError: (error) => setErrors(error.details ?? [{ field: '', message: error.message }]),
  })

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }) => patch(`/admin/discounts/${id}`, { isActive }),
    onSuccess: invalidate,
  })

  const remove = useMutation({
    mutationFn: (id) => del(`/admin/discounts/${id}`),
    onSuccess: () => { invalidate(); setToast({ severity: 'success', message: 'Deleted' }); setConfirmDelete(null) },
    onError: (error) => { setToast({ severity: 'error', message: error.message }); setConfirmDelete(null) },
  })

  const fieldError = (field) => errors.find((detail) => detail.field === field)?.message

  const openNew = () => { setEditing({}); setDraft(EMPTY); setErrors([]) }
  const openEdit = (discount) => {
    setEditing(discount)
    setDraft({
      code: discount.code, kind: discount.kind, value: discount.value, minSubtotal: discount.minSubtotal,
      maxUses: discount.maxUses ?? '', perCustomerLimit: discount.perCustomerLimit ?? '',
      appliesTo: discount.appliesTo, isActive: discount.isActive,
    })
    setErrors([])
  }

  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ alignItems: 'center' }}>
        <Typography variant="h2">Discount codes</Typography>
        <Box sx={{ flexGrow: 1 }} />
        {can('manager') && <Button variant="contained" startIcon={<AddIcon />} onClick={openNew}>New code</Button>}
      </Stack>

      {isPending ? (
        <Typography sx={{ color: 'text.secondary' }}>Loading…</Typography>
      ) : (data ?? []).length === 0 ? (
        <Alert severity="info">No discount codes yet.</Alert>
      ) : (
        <Stack spacing={1.5}>
          {data.map((discount) => (
            <Card key={discount.id}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography sx={{ fontWeight: 600 }}>{discount.code}</Typography>
                  <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                    {summaryOf(discount)}
                    {discount.minSubtotal > 0 ? ` · min ${money.format(discount.minSubtotal)}` : ''}
                    {' · '}{discount.usedCount} use{discount.usedCount === 1 ? '' : 's'}
                    {discount.maxUses ? ` of ${discount.maxUses}` : ''}
                  </Typography>
                </Box>
                {!discount.isActive && <Chip size="small" label="Inactive" variant="outlined" />}
                {can('manager') && (
                  <>
                    <Switch
                      checked={discount.isActive}
                      onChange={(event) => toggleActive.mutate({ id: discount.id, isActive: event.target.checked })}
                    />
                    <IconButton onClick={() => openEdit(discount)}><EditIcon fontSize="small" /></IconButton>
                    <IconButton onClick={() => setConfirmDelete(discount)}><DeleteIcon fontSize="small" /></IconButton>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      <Dialog open={Boolean(editing)} onClose={() => setEditing(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing?.id ? 'Edit discount code' : 'New discount code'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            {errors.some((detail) => !detail.field) && <Alert severity="error">{errors.find((detail) => !detail.field).message}</Alert>}
            <TextField
              label="Code" value={draft.code}
              onChange={(event) => setDraft({ ...draft, code: event.target.value.toUpperCase() })}
              error={Boolean(fieldError('code'))} helperText={fieldError('code')} fullWidth
            />
            <Stack direction="row" spacing={2}>
              <TextField
                select label="Type" value={draft.kind} sx={{ flex: 1 }}
                onChange={(event) => setDraft({ ...draft, kind: event.target.value })}
              >
                <MenuItem value="percent">Percent off</MenuItem>
                <MenuItem value="fixed">Fixed amount off</MenuItem>
                <MenuItem value="free_shipping">Free shipping</MenuItem>
              </TextField>
              {draft.kind !== 'free_shipping' && (
                <TextField
                  label={draft.kind === 'percent' ? 'Percent' : 'Amount (Rs)'} type="number" sx={{ flex: 1 }}
                  value={draft.value}
                  onChange={(event) => setDraft({ ...draft, value: Number(event.target.value) })}
                  error={Boolean(fieldError('value'))} helperText={fieldError('value')}
                />
              )}
            </Stack>
            <TextField
              label="Minimum subtotal (Rs)" type="number" value={draft.minSubtotal}
              onChange={(event) => setDraft({ ...draft, minSubtotal: Number(event.target.value) })}
              fullWidth
            />
            <Stack direction="row" spacing={2}>
              <TextField
                label="Max total uses (blank = unlimited)" type="number" value={draft.maxUses} sx={{ flex: 1 }}
                onChange={(event) => setDraft({ ...draft, maxUses: event.target.value })}
              />
              <TextField
                label="Max uses per customer (blank = unlimited)" type="number" value={draft.perCustomerLimit} sx={{ flex: 1 }}
                onChange={(event) => setDraft({ ...draft, perCustomerLimit: event.target.value })}
              />
            </Stack>
            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography sx={{ fontSize: 14 }}>Active</Typography>
              <Switch checked={draft.isActive} onChange={(event) => setDraft({ ...draft, isActive: event.target.checked })} />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditing(null)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={save.isPending}
            onClick={() =>
              save.mutate({
                code: draft.code,
                kind: draft.kind,
                value: draft.kind === 'free_shipping' ? 0 : draft.value,
                minSubtotal: draft.minSubtotal,
                maxUses: draft.maxUses === '' ? null : Number(draft.maxUses),
                perCustomerLimit: draft.perCustomerLimit === '' ? null : Number(draft.perCustomerLimit),
                appliesTo: draft.appliesTo,
                isActive: draft.isActive,
              })
            }
          >
            {save.isPending ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(confirmDelete)} onClose={() => setConfirmDelete(null)}>
        <DialogTitle>Delete "{confirmDelete?.code}"?</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
            This cannot be undone. A code already used on an order cannot be deleted -
            switch it off instead.
          </Typography>
        </DialogContent>
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

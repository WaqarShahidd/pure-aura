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

const money = new Intl.NumberFormat('en-PK', {
  style: 'currency', currency: 'PKR', minimumFractionDigits: 0, maximumFractionDigits: 0,
})

const SORT_FIELDS = [
  { value: 'title', label: 'Title' },
  { value: 'price', label: 'Price' },
  { value: 'review_count', label: 'Review count' },
  { value: 'rating', label: 'Rating' },
  { value: 'created_at', label: 'Date added' },
]

const SORT_EMPTY = { key: '', label: '', field: 'title', direction: 'asc', position: 0, isDefault: false, isActive: true }
const RANGE_EMPTY = { key: '', label: '', minAmount: 0, maxAmount: '', position: 0, isActive: true }

function Section({ title, description, children, onAdd, can }) {
  return (
    <Card>
      <CardContent>
        <Stack direction="row" sx={{ alignItems: 'center', mb: 0.5 }}>
          <Typography variant="h3">{title}</Typography>
          <Box sx={{ flexGrow: 1 }} />
          {can('manager') && (
            <Button size="small" startIcon={<AddIcon />} onClick={onAdd}>Add</Button>
          )}
        </Stack>
        <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 2 }}>{description}</Typography>
        <Stack spacing={1}>{children}</Stack>
      </CardContent>
    </Card>
  )
}

export default function SortAndFiltersEditor() {
  const queryClient = useQueryClient()
  const { can } = useAuth()
  const [toast, setToast] = useState(null)
  const [errors, setErrors] = useState([])

  const [editingSort, setEditingSort] = useState(null)
  const [sortDraft, setSortDraft] = useState(SORT_EMPTY)
  const [editingRange, setEditingRange] = useState(null)
  const [rangeDraft, setRangeDraft] = useState(RANGE_EMPTY)
  const [confirmDelete, setConfirmDelete] = useState(null) // {kind, id, label}

  const { data: sortOptions } = useQuery({
    queryKey: ['admin-sort-options'],
    queryFn: () => get('/admin/sort-options').then((body) => body.data),
  })
  const { data: priceRanges } = useQuery({
    queryKey: ['admin-price-ranges'],
    queryFn: () => get('/admin/price-ranges').then((body) => body.data),
  })

  const invalidateSort = () => queryClient.invalidateQueries({ queryKey: ['admin-sort-options'] })
  const invalidateRanges = () => queryClient.invalidateQueries({ queryKey: ['admin-price-ranges'] })

  const saveSort = useMutation({
    mutationFn: (body) => (editingSort?.id ? patch(`/admin/sort-options/${editingSort.id}`, body) : post('/admin/sort-options', body)),
    onSuccess: () => { invalidateSort(); setToast({ severity: 'success', message: 'Saved' }); setEditingSort(null); setErrors([]) },
    onError: (error) => setErrors(error.details ?? [{ field: '', message: error.message }]),
  })
  const removeSort = useMutation({
    mutationFn: (id) => del(`/admin/sort-options/${id}`),
    onSuccess: () => { invalidateSort(); setConfirmDelete(null); setToast({ severity: 'success', message: 'Deleted' }) },
    onError: (error) => { setConfirmDelete(null); setToast({ severity: 'error', message: error.message }) },
  })

  const saveRange = useMutation({
    mutationFn: (body) => (editingRange?.id ? patch(`/admin/price-ranges/${editingRange.id}`, body) : post('/admin/price-ranges', body)),
    onSuccess: () => { invalidateRanges(); setToast({ severity: 'success', message: 'Saved' }); setEditingRange(null); setErrors([]) },
    onError: (error) => setErrors(error.details ?? [{ field: '', message: error.message }]),
  })
  const removeRange = useMutation({
    mutationFn: (id) => del(`/admin/price-ranges/${id}`),
    onSuccess: () => { invalidateRanges(); setConfirmDelete(null); setToast({ severity: 'success', message: 'Deleted' }) },
    onError: (error) => { setConfirmDelete(null); setToast({ severity: 'error', message: error.message }) },
  })

  const fieldError = (field) => errors.find((detail) => detail.field === field)?.message

  return (
    <Stack spacing={3}>
      <Typography variant="h2">Sort &amp; filters</Typography>

      <Section
        title="Sort options"
        description="Appears in the storefront's sort dropdown. A new option can only use a field the storefront already knows how to compare."
        can={can}
        onAdd={() => { setEditingSort({}); setSortDraft(SORT_EMPTY); setErrors([]) }}
      >
        {(sortOptions ?? []).map((option) => (
          <Stack key={option.id} direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <Typography sx={{ fontSize: 13, flexGrow: 1 }}>
              {option.label} <Typography component="span" sx={{ fontSize: 11, color: 'text.secondary' }}>({option.field} {option.direction})</Typography>
            </Typography>
            {option.isDefault && <Chip size="small" color="primary" label="Default" />}
            {!option.isActive && <Chip size="small" label="Inactive" variant="outlined" />}
            {can('manager') && (
              <>
                <IconButton size="small" onClick={() => {
                  setEditingSort(option)
                  setSortDraft({ key: option.key, label: option.label, field: option.field, direction: option.direction, position: option.position, isDefault: option.isDefault, isActive: option.isActive })
                  setErrors([])
                }}>
                  <EditIcon fontSize="inherit" />
                </IconButton>
                <IconButton size="small" onClick={() => setConfirmDelete({ kind: 'sort', id: option.id, label: option.label })}>
                  <DeleteIcon fontSize="inherit" />
                </IconButton>
              </>
            )}
          </Stack>
        ))}
      </Section>

      <Section
        title="Price ranges"
        description="The bracket buckets shown in the price filter."
        can={can}
        onAdd={() => { setEditingRange({}); setRangeDraft(RANGE_EMPTY); setErrors([]) }}
      >
        {(priceRanges ?? []).map((range) => (
          <Stack key={range.id} direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <Typography sx={{ fontSize: 13, flexGrow: 1 }}>
              {range.label}{' '}
              <Typography component="span" sx={{ fontSize: 11, color: 'text.secondary' }}>
                ({money.format(range.minAmount)} – {range.maxAmount != null ? money.format(range.maxAmount) : 'no limit'})
              </Typography>
            </Typography>
            {!range.isActive && <Chip size="small" label="Inactive" variant="outlined" />}
            {can('manager') && (
              <>
                <IconButton size="small" onClick={() => {
                  setEditingRange(range)
                  setRangeDraft({ key: range.key, label: range.label, minAmount: range.minAmount, maxAmount: range.maxAmount ?? '', position: range.position, isActive: range.isActive })
                  setErrors([])
                }}>
                  <EditIcon fontSize="inherit" />
                </IconButton>
                <IconButton size="small" onClick={() => setConfirmDelete({ kind: 'range', id: range.id, label: range.label })}>
                  <DeleteIcon fontSize="inherit" />
                </IconButton>
              </>
            )}
          </Stack>
        ))}
      </Section>

      {/* Sort option dialog */}
      <Dialog open={Boolean(editingSort)} onClose={() => setEditingSort(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{editingSort?.id ? 'Edit sort option' : 'New sort option'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            {errors.some((detail) => !detail.field) && <Alert severity="error">{errors.find((detail) => !detail.field).message}</Alert>}
            <TextField label="Label" value={sortDraft.label} onChange={(event) => setSortDraft({ ...sortDraft, label: event.target.value })} error={Boolean(fieldError('label'))} helperText={fieldError('label')} fullWidth />
            <TextField label="Key" value={sortDraft.key} onChange={(event) => setSortDraft({ ...sortDraft, key: event.target.value })} error={Boolean(fieldError('key'))} helperText={fieldError('key')} fullWidth />
            <Stack direction="row" spacing={2}>
              <TextField select label="Field" value={sortDraft.field} sx={{ flex: 1 }} onChange={(event) => setSortDraft({ ...sortDraft, field: event.target.value })}>
                {SORT_FIELDS.map((f) => <MenuItem key={f.value} value={f.value}>{f.label}</MenuItem>)}
              </TextField>
              <TextField select label="Direction" value={sortDraft.direction} sx={{ flex: 1 }} onChange={(event) => setSortDraft({ ...sortDraft, direction: event.target.value })}>
                <MenuItem value="asc">Ascending</MenuItem>
                <MenuItem value="desc">Descending</MenuItem>
              </TextField>
            </Stack>
            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography sx={{ fontSize: 14 }}>Default sort</Typography>
              <Switch checked={sortDraft.isDefault} onChange={(event) => setSortDraft({ ...sortDraft, isDefault: event.target.checked })} />
            </Stack>
            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography sx={{ fontSize: 14 }}>Active</Typography>
              <Switch checked={sortDraft.isActive} onChange={(event) => setSortDraft({ ...sortDraft, isActive: event.target.checked })} />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingSort(null)}>Cancel</Button>
          <Button variant="contained" disabled={saveSort.isPending} onClick={() => saveSort.mutate(sortDraft)}>{saveSort.isPending ? 'Saving…' : 'Save'}</Button>
        </DialogActions>
      </Dialog>

      {/* Price range dialog */}
      <Dialog open={Boolean(editingRange)} onClose={() => setEditingRange(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{editingRange?.id ? 'Edit price range' : 'New price range'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            {errors.some((detail) => !detail.field) && <Alert severity="error">{errors.find((detail) => !detail.field).message}</Alert>}
            <TextField label="Label" value={rangeDraft.label} onChange={(event) => setRangeDraft({ ...rangeDraft, label: event.target.value })} error={Boolean(fieldError('label'))} helperText={fieldError('label')} fullWidth />
            <TextField label="Key" value={rangeDraft.key} onChange={(event) => setRangeDraft({ ...rangeDraft, key: event.target.value })} error={Boolean(fieldError('key'))} helperText={fieldError('key')} fullWidth />
            <Stack direction="row" spacing={2}>
              <TextField label="Min (Rs)" type="number" value={rangeDraft.minAmount} onChange={(event) => setRangeDraft({ ...rangeDraft, minAmount: Number(event.target.value) })} sx={{ flex: 1 }} />
              <TextField label="Max (Rs, blank = no limit)" type="number" value={rangeDraft.maxAmount} onChange={(event) => setRangeDraft({ ...rangeDraft, maxAmount: event.target.value })} sx={{ flex: 1 }} />
            </Stack>
            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography sx={{ fontSize: 14 }}>Active</Typography>
              <Switch checked={rangeDraft.isActive} onChange={(event) => setRangeDraft({ ...rangeDraft, isActive: event.target.checked })} />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingRange(null)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={saveRange.isPending}
            onClick={() => saveRange.mutate({ ...rangeDraft, maxAmount: rangeDraft.maxAmount === '' ? null : Number(rangeDraft.maxAmount) })}
          >
            {saveRange.isPending ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(confirmDelete)} onClose={() => setConfirmDelete(null)}>
        <DialogTitle>Delete "{confirmDelete?.label}"?</DialogTitle>
        <DialogContent><Typography sx={{ fontSize: 13, color: 'text.secondary' }}>This cannot be undone.</Typography></DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(null)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => (confirmDelete.kind === 'sort' ? removeSort.mutate(confirmDelete.id) : removeRange.mutate(confirmDelete.id))}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={Boolean(toast)} autoHideDuration={4000} onClose={() => setToast(null)}>
        <Alert severity={toast?.severity ?? 'info'} onClose={() => setToast(null)}>{toast?.message}</Alert>
      </Snackbar>
    </Stack>
  )
}

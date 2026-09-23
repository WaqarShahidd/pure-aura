import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert, Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControlLabel, MenuItem, Snackbar, Stack, TextField, Typography,
} from '@mui/material'
import { DataGrid } from '@mui/x-data-grid'
import { get, post } from '../../lib/api'
import { useAuth } from '../../auth/useAuth'

const ADJUST_EMPTY = { delta: '', reason: 'restock', note: '' }

export default function InventoryList() {
  const queryClient = useQueryClient()
  const { can } = useAuth()
  const [search, setSearch] = useState('')
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const [pagination, setPagination] = useState({ page: 0, pageSize: 25 })
  const [adjusting, setAdjusting] = useState(null) // the variant row
  const [draft, setDraft] = useState(ADJUST_EMPTY)
  const [error, setError] = useState(null)
  const [toast, setToast] = useState(null)

  const params = {
    page: pagination.page + 1,
    perPage: pagination.pageSize,
    ...(search ? { q: search } : {}),
    ...(lowStockOnly ? { lowStockOnly: true } : {}),
  }

  const { data, isFetching } = useQuery({
    queryKey: ['admin-inventory', params],
    queryFn: () => get('/admin/inventory', { params }),
    placeholderData: (previous) => previous,
  })

  const adjust = useMutation({
    mutationFn: ({ variantId, body }) => post(`/admin/inventory/${variantId}/adjust`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-inventory'] })
      setToast({ severity: 'success', message: 'Stock updated' })
      setAdjusting(null)
      setError(null)
    },
    onError: (caught) => setError(caught.message),
  })

  const columns = useMemo(
    () => [
      { field: 'productTitle', headerName: 'Product', flex: 1, minWidth: 180 },
      { field: 'label', headerName: 'Variant', width: 160 },
      { field: 'sku', headerName: 'SKU', width: 140 },
      { field: 'stockQuantity', headerName: 'On hand', width: 100 },
      { field: 'heldQuantity', headerName: 'Held', width: 90 },
      { field: 'availableQuantity', headerName: 'Available', width: 110 },
      {
        field: 'isLowStock',
        headerName: '',
        width: 100,
        sortable: false,
        renderCell: ({ value }) =>
          value ? <Typography sx={{ fontSize: 12, color: 'warning.main', fontWeight: 600 }}>Low stock</Typography> : null,
      },
      {
        field: 'actions',
        headerName: '',
        width: 110,
        sortable: false,
        renderCell: ({ row }) =>
          can('manager') ? (
            <Button
              size="small"
              onClick={() => {
                setAdjusting(row)
                setDraft(ADJUST_EMPTY)
                setError(null)
              }}
            >
              Adjust
            </Button>
          ) : null,
      },
    ],
    [can],
  )

  return (
    <Stack spacing={2}>
      <Typography variant="h2">Inventory</Typography>

      <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
        <TextField
          placeholder="Search product, variant or SKU"
          value={search}
          onChange={(event) => { setSearch(event.target.value); setPagination((current) => ({ ...current, page: 0 })) }}
          sx={{ width: 300 }}
        />
        <FormControlLabel
          control={<Checkbox checked={lowStockOnly} onChange={(event) => { setLowStockOnly(event.target.checked); setPagination((current) => ({ ...current, page: 0 })) }} />}
          label="Low stock only"
        />
        <Box sx={{ flexGrow: 1 }} />
        <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>{data?.meta?.total ?? 0} variant(s)</Typography>
      </Stack>

      <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <DataGrid
          rows={data?.data ?? []}
          columns={columns}
          getRowId={(row) => row.id}
          loading={isFetching}
          paginationMode="server"
          rowCount={data?.meta?.total ?? 0}
          paginationModel={pagination}
          onPaginationModelChange={setPagination}
          pageSizeOptions={[25, 50, 100]}
          disableRowSelectionOnClick
          sx={{ border: 'none', '& .MuiDataGrid-columnHeaders': { bgcolor: '#faf9f5' } }}
        />
      </Box>

      <Dialog open={Boolean(adjusting)} onClose={() => setAdjusting(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Adjust "{adjusting?.label}"</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
              Currently {adjusting?.stockQuantity} on hand, {adjusting?.availableQuantity} available.
            </Typography>
            <TextField
              select label="Reason" value={draft.reason}
              onChange={(event) => setDraft({ ...draft, reason: event.target.value })}
            >
              <MenuItem value="restock">Restock (new stock arrived)</MenuItem>
              <MenuItem value="adjustment">Adjustment (correction, damage, count)</MenuItem>
            </TextField>
            <TextField
              label="Change" type="number" value={draft.delta}
              onChange={(event) => setDraft({ ...draft, delta: event.target.value })}
              helperText="Positive to add, negative to remove"
            />
            <TextField
              label="Note (optional)" value={draft.note} multiline minRows={2}
              onChange={(event) => setDraft({ ...draft, note: event.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAdjusting(null)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={adjust.isPending || !draft.delta}
            onClick={() =>
              adjust.mutate({
                variantId: adjusting.id,
                body: { delta: Number(draft.delta), reason: draft.reason, note: draft.note || null },
              })
            }
          >
            {adjust.isPending ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={Boolean(toast)} autoHideDuration={4000} onClose={() => setToast(null)}>
        <Alert severity={toast?.severity ?? 'info'} onClose={() => setToast(null)}>{toast?.message}</Alert>
      </Snackbar>
    </Stack>
  )
}

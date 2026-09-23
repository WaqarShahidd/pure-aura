import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert, Box, Button, Card, CardContent, Chip, Collapse, Dialog, DialogActions, DialogContent,
  DialogTitle, IconButton, MenuItem, Snackbar, Stack, Switch, TextField, Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/DeleteOutlined'
import EditIcon from '@mui/icons-material/EditOutlined'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import { del, get, patch, post } from '../../lib/api'
import { useAuth } from '../../auth/useAuth'

const FACET_EMPTY = { key: '', label: '', fieldKey: '', type: 'list', cardinality: 'single', position: 0, isActive: true }
const VALUE_EMPTY = { value: '', label: '', swatchHex: '', position: 0, isActive: true }

export default function FacetList() {
  const queryClient = useQueryClient()
  const { can } = useAuth()
  const [expanded, setExpanded] = useState(null)
  const [editingFacet, setEditingFacet] = useState(null)
  const [facetDraft, setFacetDraft] = useState(FACET_EMPTY)
  const [editingValue, setEditingValue] = useState(null) // {facetId, value|null}
  const [valueDraft, setValueDraft] = useState(VALUE_EMPTY)
  const [errors, setErrors] = useState([])
  const [toast, setToast] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null) // {kind, id, label}

  const { data, isPending } = useQuery({
    queryKey: ['admin-facets'],
    queryFn: () => get('/admin/facets').then((body) => body.data),
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-facets'] })

  const saveFacet = useMutation({
    mutationFn: (body) =>
      editingFacet?.id ? patch(`/admin/facets/${editingFacet.id}`, body) : post('/admin/facets', body),
    onSuccess: () => {
      invalidate()
      setToast({ severity: 'success', message: 'Saved' })
      setEditingFacet(null)
      setErrors([])
    },
    onError: (error) => setErrors(error.details ?? [{ field: '', message: error.message }]),
  })

  const saveValue = useMutation({
    mutationFn: ({ facetId, id, body }) =>
      id ? patch(`/admin/facet-values/${id}`, body) : post(`/admin/facets/${facetId}/values`, body),
    onSuccess: () => {
      invalidate()
      setToast({ severity: 'success', message: 'Saved' })
      setEditingValue(null)
      setErrors([])
    },
    onError: (error) => setErrors(error.details ?? [{ field: '', message: error.message }]),
  })

  const remove = useMutation({
    mutationFn: ({ kind, id }) =>
      kind === 'facet' ? del(`/admin/facets/${id}`) : del(`/admin/facet-values/${id}`),
    onSuccess: () => {
      invalidate()
      setToast({ severity: 'success', message: 'Deleted' })
      setConfirmDelete(null)
    },
    onError: (error) => {
      setToast({ severity: 'error', message: error.message })
      setConfirmDelete(null)
    },
  })

  const fieldError = (field) => errors.find((detail) => detail.field === field)?.message

  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ alignItems: 'center' }}>
        <Typography variant="h2">Facets</Typography>
        <Box sx={{ flexGrow: 1 }} />
        {can('manager') && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setEditingFacet({})
              setFacetDraft(FACET_EMPTY)
              setErrors([])
            }}
          >
            New facet
          </Button>
        )}
      </Stack>

      <Alert severity="info">
        These vocabularies power the collection filters and the skin quiz. A value still used
        by a product or a quiz answer cannot be deleted - the error names what is using it.
      </Alert>

      {isPending ? (
        <Typography sx={{ color: 'text.secondary' }}>Loading…</Typography>
      ) : (
        <Stack spacing={1.5}>
          {(data ?? []).map((facet) => (
            <Card key={facet.id}>
              <CardContent>
                <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                  <IconButton size="small" onClick={() => setExpanded(expanded === facet.id ? null : facet.id)}>
                    {expanded === facet.id ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                  </IconButton>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography sx={{ fontWeight: 600 }}>{facet.label}</Typography>
                    <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                      {facet.key} · {facet.type} · {facet.cardinality} · {facet.values.length} value{facet.values.length === 1 ? '' : 's'}
                    </Typography>
                  </Box>
                  {facet.isSystem && <Chip size="small" label="System" />}
                  {!facet.isActive && <Chip size="small" label="Inactive" variant="outlined" />}
                  {can('manager') && (
                    <>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setEditingFacet(facet)
                          setFacetDraft({
                            key: facet.key, label: facet.label, fieldKey: facet.fieldKey,
                            type: facet.type, cardinality: facet.cardinality, position: facet.position,
                            isActive: facet.isActive,
                          })
                          setErrors([])
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      {!facet.isSystem && (
                        <IconButton size="small" onClick={() => setConfirmDelete({ kind: 'facet', id: facet.id, label: facet.label })}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      )}
                    </>
                  )}
                </Stack>

                <Collapse in={expanded === facet.id}>
                  <Stack spacing={1} sx={{ mt: 2, pl: 5 }}>
                    {facet.values.map((value) => (
                      <Stack key={value.id} direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                        {value.swatchHex && (
                          <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: value.swatchHex, border: '1px solid rgba(0,0,0,0.15)' }} />
                        )}
                        <Typography sx={{ fontSize: 13, flexGrow: 1 }}>
                          {value.label} <Typography component="span" sx={{ fontSize: 11, color: 'text.secondary' }}>({value.value})</Typography>
                        </Typography>
                        {!value.isActive && <Chip size="small" label="Inactive" variant="outlined" />}
                        {can('manager') && (
                          <>
                            <IconButton
                              size="small"
                              onClick={() => {
                                setEditingValue({ facetId: facet.id, id: value.id })
                                setValueDraft({
                                  value: value.value, label: value.label, swatchHex: value.swatchHex ?? '',
                                  position: value.position, isActive: value.isActive,
                                })
                                setErrors([])
                              }}
                            >
                              <EditIcon fontSize="inherit" />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => setConfirmDelete({ kind: 'value', id: value.id, label: value.label })}
                            >
                              <DeleteIcon fontSize="inherit" />
                            </IconButton>
                          </>
                        )}
                      </Stack>
                    ))}
                    {can('manager') && (
                      <Button
                        size="small"
                        startIcon={<AddIcon />}
                        sx={{ alignSelf: 'flex-start', mt: 1 }}
                        onClick={() => {
                          setEditingValue({ facetId: facet.id, id: null })
                          setValueDraft(VALUE_EMPTY)
                          setErrors([])
                        }}
                      >
                        Add value
                      </Button>
                    )}
                  </Stack>
                </Collapse>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      {/* Facet dialog */}
      <Dialog open={Boolean(editingFacet)} onClose={() => setEditingFacet(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingFacet?.id ? 'Edit facet' : 'New facet'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            {errors.some((detail) => !detail.field) && (
              <Alert severity="error">{errors.find((detail) => !detail.field).message}</Alert>
            )}
            <TextField
              label="Label" value={facetDraft.label}
              onChange={(event) => setFacetDraft({ ...facetDraft, label: event.target.value })}
              error={Boolean(fieldError('label'))} helperText={fieldError('label')} fullWidth
            />
            <TextField
              label="Key" value={facetDraft.key}
              onChange={(event) => setFacetDraft({ ...facetDraft, key: event.target.value })}
              error={Boolean(fieldError('key'))} helperText={fieldError('key')}
              disabled={editingFacet?.isSystem} fullWidth
            />
            <TextField
              label="Field key" value={facetDraft.fieldKey}
              onChange={(event) => setFacetDraft({ ...facetDraft, fieldKey: event.target.value })}
              helperText="The product field the storefront reads this from"
              disabled={editingFacet?.isSystem} fullWidth
            />
            <Stack direction="row" spacing={2}>
              <TextField
                select label="Type" value={facetDraft.type} sx={{ flex: 1 }}
                onChange={(event) => setFacetDraft({ ...facetDraft, type: event.target.value })}
                disabled={editingFacet?.isSystem}
              >
                <MenuItem value="list">List</MenuItem>
                <MenuItem value="swatch">Swatch</MenuItem>
                <MenuItem value="range">Range</MenuItem>
              </TextField>
              <TextField
                select label="Cardinality" value={facetDraft.cardinality} sx={{ flex: 1 }}
                onChange={(event) => setFacetDraft({ ...facetDraft, cardinality: event.target.value })}
                disabled={editingFacet?.isSystem}
              >
                <MenuItem value="single">Single</MenuItem>
                <MenuItem value="multi">Multi</MenuItem>
              </TextField>
            </Stack>
            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography sx={{ fontSize: 14 }}>Active</Typography>
              <Switch
                checked={facetDraft.isActive}
                onChange={(event) => setFacetDraft({ ...facetDraft, isActive: event.target.checked })}
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingFacet(null)}>Cancel</Button>
          <Button variant="contained" disabled={saveFacet.isPending} onClick={() => saveFacet.mutate(facetDraft)}>
            {saveFacet.isPending ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Facet value dialog */}
      <Dialog open={Boolean(editingValue)} onClose={() => setEditingValue(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{editingValue?.id ? 'Edit value' : 'New value'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            {errors.some((detail) => !detail.field) && (
              <Alert severity="error">{errors.find((detail) => !detail.field).message}</Alert>
            )}
            <TextField
              label="Label" value={valueDraft.label}
              onChange={(event) => setValueDraft({ ...valueDraft, label: event.target.value })}
              error={Boolean(fieldError('label'))} helperText={fieldError('label')} fullWidth
            />
            <TextField
              label="Value" value={valueDraft.value}
              onChange={(event) => setValueDraft({ ...valueDraft, value: event.target.value })}
              error={Boolean(fieldError('value'))} helperText={fieldError('value') ?? 'Exact string stored on the product'} fullWidth
            />
            <TextField
              label="Swatch color" value={valueDraft.swatchHex}
              onChange={(event) => setValueDraft({ ...valueDraft, swatchHex: event.target.value })}
              placeholder="#a1b2c3" helperText={fieldError('swatchHex') ?? 'Only used by swatch-type facets'} fullWidth
            />
            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography sx={{ fontSize: 14 }}>Active</Typography>
              <Switch
                checked={valueDraft.isActive}
                onChange={(event) => setValueDraft({ ...valueDraft, isActive: event.target.checked })}
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingValue(null)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={saveValue.isPending}
            onClick={() =>
              saveValue.mutate({
                facetId: editingValue.facetId,
                id: editingValue.id,
                body: { ...valueDraft, swatchHex: valueDraft.swatchHex || null },
              })
            }
          >
            {saveValue.isPending ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(confirmDelete)} onClose={() => setConfirmDelete(null)}>
        <DialogTitle>Delete "{confirmDelete?.label}"?</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
            This cannot be undone. Still used by a product or a quiz answer? The delete will be
            refused and say which.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={() => remove.mutate(confirmDelete)}>Delete</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={Boolean(toast)} autoHideDuration={4000} onClose={() => setToast(null)}>
        <Alert severity={toast?.severity ?? 'info'} onClose={() => setToast(null)}>{toast?.message}</Alert>
      </Snackbar>
    </Stack>
  )
}

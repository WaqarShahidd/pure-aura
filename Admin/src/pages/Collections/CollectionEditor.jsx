import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert, Autocomplete, Box, Button, Card, CardContent, Chip, CircularProgress, Dialog,
  DialogActions, DialogContent, DialogTitle, Grid, MenuItem, Snackbar, Stack, Switch,
  TextField, Typography,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import DeleteIcon from '@mui/icons-material/DeleteOutlined'
import { del, get, patch, post } from '../../lib/api'
import { queryKeys } from '../../lib/queryKeys'
import { useAuth } from '../../auth/useAuth'
import SingleImagePicker from '../../components/MediaPicker/SingleImagePicker'

const EMPTY = {
  handle: '', title: '', description: '', cardLabel: '', position: 0,
  isFeatured: false, featuredPosition: null, isActive: true,
  mediaId: null, url: null, productIds: [],
}

function draftFrom(collection) {
  if (!collection) return EMPTY
  return {
    handle: collection.handle,
    title: collection.title,
    description: collection.description ?? '',
    cardLabel: collection.cardLabel ?? '',
    position: collection.position,
    isFeatured: collection.isFeatured,
    featuredPosition: collection.featuredPosition,
    isActive: collection.isActive,
    mediaId: collection.mediaId,
    url: collection.image,
    productIds: collection.productIds ?? [],
  }
}

export default function CollectionEditor() {
  const { id } = useParams()
  const isNew = id === 'new'

  const { data: collection, isPending } = useQuery({
    queryKey: queryKeys.collections.detail(id),
    queryFn: () => get(`/admin/collections/${id}`).then((body) => body.data),
    enabled: !isNew,
  })

  if (!isNew && isPending) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 300 }}>
        <CircularProgress size={26} />
      </Box>
    )
  }

  // Keyed by id so navigating from editing one collection straight to another (both use
  // this same route) gets a fresh lazy-initialized draft instead of the previous one's
  // fields bleeding through - React reuses the component instance across a param change,
  // it does not remount it on its own.
  return <CollectionForm key={id} id={id} isNew={isNew} collection={collection} />
}

function CollectionForm({ id, isNew, collection }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { can } = useAuth()

  const [draft, setDraft] = useState(() => draftFrom(collection))
  const [errors, setErrors] = useState([])
  const [toast, setToast] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const { data: products } = useQuery({
    queryKey: ['admin-products-picker'],
    queryFn: () => get('/admin/products', { params: { perPage: 100 } }).then((body) => body.data),
  })

  const save = useMutation({
    mutationFn: (body) => (isNew ? post('/admin/collections', body) : patch(`/admin/collections/${id}`, body)),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.collections.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.collections.featured })
      setToast({ severity: 'success', message: 'Saved' })
      setErrors([])
      if (isNew) navigate(`/collections/${saved.id}`, { replace: true })
    },
    onError: (error) => setErrors(error.details ?? [{ field: '', message: error.message }]),
  })

  const remove = useMutation({
    mutationFn: () => del(`/admin/collections/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.collections.all })
      navigate('/collections')
    },
    onError: (error) => {
      setToast({ severity: 'error', message: error.message })
      setConfirmDelete(false)
    },
  })

  const fieldError = (field) => errors.find((detail) => detail.field === field)?.message
  const selectedProducts = (products ?? []).filter((product) => draft.productIds.includes(product.id))

  const submit = () => {
    save.mutate({
      handle: draft.handle,
      title: draft.title,
      description: draft.description || null,
      cardLabel: draft.cardLabel || null,
      position: draft.position,
      isFeatured: draft.isFeatured,
      featuredPosition: draft.isFeatured ? draft.featuredPosition : null,
      isActive: draft.isActive,
      mediaId: draft.mediaId,
      productIds: draft.productIds,
    })
  }

  return (
    <Stack spacing={3}>
      <Button startIcon={<ArrowBackIcon />} component={Link} to="/collections" sx={{ alignSelf: 'flex-start' }}>
        Collections
      </Button>

      <Stack direction="row" sx={{ alignItems: 'center' }}>
        <Typography variant="h2">{isNew ? 'New collection' : draft.title || 'Collection'}</Typography>
        <Box sx={{ flexGrow: 1 }} />
        {!isNew && can('manager') && (
          <Button color="error" startIcon={<DeleteIcon />} onClick={() => setConfirmDelete(true)}>
            Delete
          </Button>
        )}
      </Stack>

      {errors.some((detail) => !detail.field) && (
        <Alert severity="error">{errors.find((detail) => !detail.field).message}</Alert>
      )}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Card>
            <CardContent>
              <Stack spacing={2}>
                <TextField
                  label="Title"
                  value={draft.title}
                  onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                  error={Boolean(fieldError('title'))}
                  helperText={fieldError('title')}
                  disabled={!can('manager')}
                  fullWidth
                />
                <TextField
                  label="Handle"
                  value={draft.handle}
                  onChange={(event) => setDraft({ ...draft, handle: event.target.value })}
                  error={Boolean(fieldError('handle'))}
                  helperText={fieldError('handle') ?? 'Lowercase words separated by hyphens'}
                  disabled={!can('manager')}
                  fullWidth
                />
                <TextField
                  label="Description"
                  value={draft.description}
                  onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                  multiline
                  minRows={2}
                  disabled={!can('manager')}
                  fullWidth
                />
                <TextField
                  label="Card label"
                  value={draft.cardLabel}
                  onChange={(event) => setDraft({ ...draft, cardLabel: event.target.value })}
                  helperText="Short label shown on the collection card, if different from the title"
                  disabled={!can('manager')}
                  fullWidth
                />

                <Box>
                  <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 1 }}>Image</Typography>
                  <SingleImagePicker
                    mediaId={draft.mediaId}
                    url={draft.url}
                    onChange={({ mediaId, url }) => setDraft({ ...draft, mediaId, url })}
                  />
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Stack spacing={3}>
            <Card>
              <CardContent>
                <Typography variant="h3" sx={{ mb: 1.5 }}>Visibility</Typography>
                <Stack spacing={2}>
                  <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography sx={{ fontSize: 14 }}>Active on storefront</Typography>
                    <Switch
                      checked={draft.isActive}
                      onChange={(event) => setDraft({ ...draft, isActive: event.target.checked })}
                      disabled={!can('manager')}
                    />
                  </Stack>
                  <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography sx={{ fontSize: 14 }}>Featured on homepage</Typography>
                    <Switch
                      checked={draft.isFeatured}
                      onChange={(event) => setDraft({ ...draft, isFeatured: event.target.checked })}
                      disabled={!can('manager')}
                    />
                  </Stack>
                  {draft.isFeatured && (
                    <TextField
                      select
                      label="Featured position"
                      value={draft.featuredPosition ?? ''}
                      onChange={(event) => setDraft({ ...draft, featuredPosition: Number(event.target.value) })}
                      error={Boolean(fieldError('featuredPosition'))}
                      helperText={fieldError('featuredPosition')}
                      disabled={!can('manager')}
                    >
                      {[1, 2, 3, 4].map((position) => (
                        <MenuItem key={position} value={position}>{position}</MenuItem>
                      ))}
                    </TextField>
                  )}
                </Stack>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="h3" sx={{ mb: 1.5 }}>Products</Typography>
                <Autocomplete
                  multiple
                  options={products ?? []}
                  value={selectedProducts}
                  getOptionLabel={(product) => product.title}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  onChange={(_, values) => setDraft({ ...draft, productIds: values.map((product) => product.id) })}
                  disabled={!can('manager')}
                  renderValue={(value, getItemProps) =>
                    value.map((product, index) => {
                      const { key, ...chipProps } = getItemProps({ index })
                      return <Chip label={product.title} size="small" {...chipProps} key={key} />
                    })
                  }
                  renderInput={(params) => <TextField {...params} label="Products in this collection" />}
                />
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>

      {can('manager') && (
        <Box>
          <Button variant="contained" disabled={save.isPending} onClick={submit}>
            {save.isPending ? 'Saving…' : 'Save'}
          </Button>
        </Box>
      )}

      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)}>
        <DialogTitle>Delete "{draft.title}"?</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
            This cannot be undone. A collection that still has products in it cannot be deleted -
            remove them here first.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={() => remove.mutate()}>Delete</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={Boolean(toast)} autoHideDuration={4000} onClose={() => setToast(null)}>
        <Alert severity={toast?.severity ?? 'info'} onClose={() => setToast(null)}>
          {toast?.message}
        </Alert>
      </Snackbar>
    </Stack>
  )
}

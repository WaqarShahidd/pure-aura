import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert, Box, Button, Card, CardContent, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, Snackbar, Stack, TextField, Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/DeleteOutlined'
import EditIcon from '@mui/icons-material/EditOutlined'
import { del, get, patch, post } from '../../lib/api'
import { queryKeys } from '../../lib/queryKeys'
import { useAuth } from '../../auth/useAuth'
import SingleImagePicker from '../../components/MediaPicker/SingleImagePicker'

const EMPTY = { handle: '', title: '', description: '', position: 0, mediaId: null, url: null }

export default function CategoryList() {
  const queryClient = useQueryClient()
  const { can } = useAuth()
  const [editing, setEditing] = useState(null) // null = closed, {} = new, row = editing
  const [draft, setDraft] = useState(EMPTY)
  const [errors, setErrors] = useState([])
  const [toast, setToast] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const { data, isPending } = useQuery({
    queryKey: queryKeys.categories.all,
    queryFn: () => get('/admin/categories').then((body) => body.data),
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.categories.all })

  const save = useMutation({
    mutationFn: (body) =>
      editing?.id
        ? patch(`/admin/categories/${editing.id}`, body)
        : post('/admin/categories', body),
    onSuccess: () => {
      invalidate()
      setToast({ severity: 'success', message: 'Saved' })
      setEditing(null)
      setErrors([])
    },
    onError: (error) => setErrors(error.details ?? [{ field: '', message: error.message }]),
  })

  const remove = useMutation({
    mutationFn: (id) => del(`/admin/categories/${id}`),
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

  const openNew = () => {
    setEditing({})
    setDraft(EMPTY)
    setErrors([])
  }

  const openEdit = (category) => {
    setEditing(category)
    setDraft({
      handle: category.handle,
      title: category.title,
      description: category.description ?? '',
      position: category.position,
      mediaId: category.mediaId,
      url: category.image,
    })
    setErrors([])
  }

  const fieldError = (field) => errors.find((detail) => detail.field === field)?.message

  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ alignItems: 'center' }}>
        <Typography variant="h2">Categories</Typography>
        <Box sx={{ flexGrow: 1 }} />
        {can('manager') && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openNew}>
            New category
          </Button>
        )}
      </Stack>

      {isPending ? (
        <Typography sx={{ color: 'text.secondary' }}>Loading…</Typography>
      ) : (data ?? []).length === 0 ? (
        <Alert severity="info">No categories yet.</Alert>
      ) : (
        <Stack spacing={1.5}>
          {data.map((category) => (
            <Card key={category.id}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  component="img"
                  src={category.image}
                  alt=""
                  sx={{ width: 44, height: 44, borderRadius: 1, objectFit: 'cover', bgcolor: '#eef1e7' }}
                />
                <Box sx={{ flexGrow: 1 }}>
                  <Typography sx={{ fontWeight: 600 }}>{category.title}</Typography>
                  <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                    /{category.handle} · {category.productCount ?? 0} product{category.productCount === 1 ? '' : 's'}
                  </Typography>
                </Box>
                {can('manager') && (
                  <>
                    <IconButton onClick={() => openEdit(category)}><EditIcon fontSize="small" /></IconButton>
                    <IconButton onClick={() => setConfirmDelete(category)}><DeleteIcon fontSize="small" /></IconButton>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      <Dialog open={Boolean(editing)} onClose={() => setEditing(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing?.id ? 'Edit category' : 'New category'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            {errors.some((detail) => !detail.field) && (
              <Alert severity="error">{errors.find((detail) => !detail.field).message}</Alert>
            )}
            <TextField
              label="Title"
              value={draft.title}
              onChange={(event) => setDraft({ ...draft, title: event.target.value })}
              error={Boolean(fieldError('title'))}
              helperText={fieldError('title')}
              fullWidth
            />
            <TextField
              label="Handle"
              value={draft.handle}
              onChange={(event) => setDraft({ ...draft, handle: event.target.value })}
              error={Boolean(fieldError('handle'))}
              helperText={fieldError('handle') ?? 'Lowercase words separated by hyphens'}
              fullWidth
            />
            <TextField
              label="Description"
              value={draft.description}
              onChange={(event) => setDraft({ ...draft, description: event.target.value })}
              multiline
              minRows={2}
              fullWidth
            />
            <TextField
              label="Position"
              type="number"
              value={draft.position}
              onChange={(event) => setDraft({ ...draft, position: Number(event.target.value) })}
              sx={{ width: 140 }}
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
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditing(null)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={save.isPending}
            onClick={() =>
              save.mutate({
                handle: draft.handle,
                title: draft.title,
                description: draft.description || null,
                position: draft.position,
                mediaId: draft.mediaId,
              })
            }
          >
            {save.isPending ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(confirmDelete)} onClose={() => setConfirmDelete(null)}>
        <DialogTitle>Delete "{confirmDelete?.title}"?</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
            This cannot be undone. Categories still used by a product cannot be deleted.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={() => remove.mutate(confirmDelete.id)}>
            Delete
          </Button>
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

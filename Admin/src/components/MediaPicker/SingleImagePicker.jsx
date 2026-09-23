import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert, Box, Button, Dialog, DialogContent, DialogTitle, IconButton, ImageList,
  ImageListItem, Stack, Typography,
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/DeleteOutlined'
import { api, get } from '../../lib/api'
import { queryKeys } from '../../lib/queryKeys'

// MediaPicker's sibling for the one-image case (a category or collection card), rather
// than that component learning a single/multi mode - ProductEditor's ordering and
// "first is primary" logic has nothing to do with a single card image, and threading a
// mode flag through it risked the one screen that already works.
export default function SingleImagePicker({ mediaId, url, onChange }) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState(null)
  const fileInput = useRef(null)
  const queryClient = useQueryClient()

  const library = useQuery({
    queryKey: queryKeys.media.list({ perPage: 48 }),
    queryFn: () => get('/admin/media', { params: { perPage: 48 } }),
    enabled: open,
  })

  const upload = useMutation({
    mutationFn: async (file) => {
      const form = new FormData()
      form.append('file', file)
      form.append('folder', 'catalog')
      const response = await api.post('/admin/media', form)
      return response.data.data
    },
    onSuccess: (asset) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.media.all })
      onChange({ mediaId: asset.id, url: asset.url })
      setError(null)
    },
    onError: (caught) => setError(caught.message),
  })

  return (
    <Stack spacing={1.5}>
      {mediaId ? (
        <Box sx={{ width: 150, border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
          <Box component="img" src={url} alt="" sx={{ width: '100%', height: 150, objectFit: 'cover', display: 'block' }} />
          <Stack direction="row" sx={{ justifyContent: 'flex-end', px: 0.5 }}>
            <IconButton size="small" onClick={() => onChange({ mediaId: null, url: null })}>
              <DeleteIcon fontSize="inherit" />
            </IconButton>
          </Stack>
        </Box>
      ) : (
        <Box
          sx={{
            width: 150, height: 150, border: '1px dashed', borderColor: 'divider', borderRadius: 2,
            display: 'grid', placeItems: 'center', color: 'text.secondary', fontSize: 12, textAlign: 'center', p: 1,
          }}
        >
          No image
        </Box>
      )}

      {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}

      <Stack direction="row" spacing={1}>
        <Button size="small" variant="outlined" onClick={() => setOpen(true)}>
          Choose from library
        </Button>
        <Button size="small" variant="contained" onClick={() => fileInput.current?.click()} disabled={upload.isPending}>
          {upload.isPending ? 'Uploading…' : 'Upload'}
        </Button>
        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) upload.mutate(file)
            event.target.value = ''
          }}
        />
      </Stack>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Media library</DialogTitle>
        <DialogContent>
          {library.isPending && <Typography>Loading…</Typography>}
          <ImageList cols={4} gap={12}>
            {(library.data?.data ?? []).map((asset) => (
              <ImageListItem
                key={asset.id}
                onClick={() => {
                  onChange({ mediaId: asset.id, url: asset.url })
                  setOpen(false)
                }}
                sx={{ cursor: 'pointer', borderRadius: 1, overflow: 'hidden' }}
              >
                <img src={asset.urls?.thumb ?? asset.url} alt={asset.alt ?? ''} loading="lazy" />
              </ImageListItem>
            ))}
          </ImageList>
        </DialogContent>
      </Dialog>
    </Stack>
  )
}

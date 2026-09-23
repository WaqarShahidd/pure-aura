import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert, Box, Button, Dialog, DialogContent, DialogTitle, IconButton, ImageList,
  ImageListItem, Stack, Typography,
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/DeleteOutlined'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import { api, get } from '../../lib/api'
import { queryKeys } from '../../lib/queryKeys'

// Picks images for a product and orders them. Position matters: the first image is the
// product's primary, which is what the grid, the cart drawer and order lines all show.
export default function MediaPicker({ selected, onChange }) {
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
      form.append('folder', 'products')
      // Content-Type is left to the browser so it can set the multipart boundary.
      const response = await api.post('/admin/media', form)
      return response.data.data
    },
    onSuccess: (asset) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.media.all })
      add(asset)
      setError(null)
    },
    onError: (caught) => setError(caught.message),
  })

  const add = (asset) => {
    if (selected.some((image) => image.mediaId === asset.id)) return
    onChange([...selected, { mediaId: asset.id, url: asset.url, altText: asset.alt }])
  }

  const move = (index, delta) => {
    const next = [...selected]
    const target = index + delta
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <Button variant="outlined" onClick={() => setOpen(true)}>
          Choose from library
        </Button>
        <Button variant="contained" onClick={() => fileInput.current?.click()} disabled={upload.isPending}>
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
        <Box sx={{ flexGrow: 1 }} />
        <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
          First image is the primary
        </Typography>
      </Stack>

      {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}

      {selected.length === 0 ? (
        <Box
          sx={{
            border: '1px dashed', borderColor: 'divider', borderRadius: 2, p: 6,
            textAlign: 'center', color: 'text.secondary',
          }}
        >
          No images yet. The storefront shows a tinted placeholder until one is added.
        </Box>
      ) : (
        <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', gap: 2 }}>
          {selected.map((image, index) => (
            <Box
              // Position, not mediaId: uploads are deduped by checksum, so the same asset
              // can legitimately sit at two positions on one product and mediaId collides.
              key={`${image.mediaId}-${index}`}
              sx={{
                width: 150, border: '1px solid', borderColor: 'divider',
                borderRadius: 2, overflow: 'hidden',
              }}
            >
              <Box
                component="img"
                src={image.url}
                alt=""
                sx={{ width: '100%', height: 150, objectFit: 'cover', display: 'block' }}
              />
              <Stack direction="row" sx={{ alignItems: 'center', px: 0.5 }}>
                <IconButton size="small" onClick={() => move(index, -1)} disabled={index === 0}>
                  <ArrowBackIcon fontSize="inherit" />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => move(index, 1)}
                  disabled={index === selected.length - 1}
                >
                  <ArrowForwardIcon fontSize="inherit" />
                </IconButton>
                <Box sx={{ flexGrow: 1 }} />
                <IconButton
                  size="small"
                  onClick={() => onChange(selected.filter((_, at) => at !== index))}
                >
                  <DeleteIcon fontSize="inherit" />
                </IconButton>
              </Stack>
            </Box>
          ))}
        </Stack>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Media library</DialogTitle>
        <DialogContent>
          {library.isPending && <Typography>Loading…</Typography>}
          <ImageList cols={4} gap={12}>
            {(library.data?.data ?? []).map((asset) => (
              <ImageListItem
                key={asset.id}
                onClick={() => {
                  add(asset)
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

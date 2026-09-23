import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert, Box, Button, Card, CardContent, ImageList, ImageListItem, ImageListItemBar,
  IconButton, Snackbar, Stack, Typography,
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/DeleteOutlined'
import { api, del, get } from '../../lib/api'
import { queryKeys } from '../../lib/queryKeys'
import { useAuth } from '../../auth/useAuth'

export default function MediaLibrary() {
  const queryClient = useQueryClient()
  const { can } = useAuth()
  const fileInput = useRef(null)
  const [toast, setToast] = useState(null)

  const params = { perPage: 48 }
  const { data, isPending } = useQuery({
    queryKey: queryKeys.media.list(params),
    queryFn: () => get('/admin/media', { params }),
  })

  const upload = useMutation({
    mutationFn: async (file) => {
      const form = new FormData()
      form.append('file', file)
      const response = await api.post('/admin/media', form)
      return response.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.media.all })
      setToast({ severity: 'success', message: 'Uploaded' })
    },
    onError: (error) => setToast({ severity: 'error', message: error.message }),
  })

  const remove = useMutation({
    mutationFn: (id) => del(`/admin/media/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.media.all })
      setToast({ severity: 'success', message: 'Deleted' })
    },
    // A file still attached to a product comes back as 409 naming how many things use it,
    // which is more useful than a bare refusal.
    onError: (error) => setToast({ severity: 'error', message: error.message }),
  })

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
        <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>
          {data?.meta?.total ?? 0} file(s)
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        {can('manager') && (
          <>
            <Button variant="contained" onClick={() => fileInput.current?.click()}>
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
          </>
        )}
      </Stack>

      <Card>
        <CardContent>
          {isPending ? (
            <Typography>Loading…</Typography>
          ) : (
            <ImageList cols={6} gap={12}>
              {(data?.data ?? []).map((asset) => (
                <ImageListItem key={asset.id} sx={{ borderRadius: 1, overflow: 'hidden' }}>
                  <img src={asset.urls?.thumb ?? asset.url} alt={asset.alt ?? ''} loading="lazy" />
                  <ImageListItemBar
                    subtitle={`${Math.round(asset.bytes / 1024)} KB`}
                    actionIcon={
                      can('manager') && (
                        <IconButton
                          sx={{ color: 'rgba(255,255,255,0.85)' }}
                          onClick={() => remove.mutate(asset.id)}
                          aria-label="Delete file"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      )
                    }
                  />
                </ImageListItem>
              ))}
            </ImageList>
          )}
        </CardContent>
      </Card>

      <Snackbar open={Boolean(toast)} autoHideDuration={4000} onClose={() => setToast(null)}>
        <Alert severity={toast?.severity ?? 'info'} onClose={() => setToast(null)}>
          {toast?.message}
        </Alert>
      </Snackbar>
    </Stack>
  )
}

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert, Box, Button, Card, CardContent, Chip, Dialog, DialogActions, DialogContent,
  DialogTitle, Snackbar, Stack, Switch, TextField, Typography,
} from '@mui/material'
import EditIcon from '@mui/icons-material/EditOutlined'
import { get, patch } from '../../lib/api'
import { useAuth } from '../../auth/useAuth'

export default function PagesEditor() {
  const queryClient = useQueryClient()
  const { can } = useAuth()
  const [editingSlug, setEditingSlug] = useState(null)
  const [draft, setDraft] = useState(null)
  const [toast, setToast] = useState(null)
  const [error, setError] = useState(null)

  const { data: pages, isPending } = useQuery({
    queryKey: ['admin-pages'],
    queryFn: () => get('/admin/pages').then((body) => body.data),
  })

  const { data: full } = useQuery({
    queryKey: ['admin-page', editingSlug],
    queryFn: () => get(`/admin/pages/${editingSlug}`).then((body) => body.data),
    enabled: Boolean(editingSlug),
  })

  const save = useMutation({
    mutationFn: (body) => patch(`/admin/pages/${editingSlug}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pages'] })
      setToast({ severity: 'success', message: 'Saved' })
      setEditingSlug(null)
      setError(null)
    },
    onError: (caught) => setError(caught.message),
  })

  const openEdit = (page) => {
    setEditingSlug(page.slug)
    setDraft(null)
  }

  // Fills once the detail query resolves, since the dialog opens before it has.
  if (editingSlug && full && !draft) {
    setDraft({
      title: full.title,
      accent: full.accent ?? '',
      intro: full.intro ?? '',
      updatedLabel: full.updatedLabel ?? '',
      isPublished: full.isPublished,
      sections: full.sections ?? [],
    })
  }

  return (
    <Stack spacing={2}>
      <Typography variant="h2">Pages</Typography>
      <Alert severity="info">
        Custom pages (quiz, booking, etc.) keep their interactive component - only the
        title, intro and text sections here are editable.
      </Alert>

      {isPending ? (
        <Typography sx={{ color: 'text.secondary' }}>Loading…</Typography>
      ) : (
        <Stack spacing={1.5}>
          {(pages ?? []).map((page) => (
            <Card key={page.id}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography sx={{ fontWeight: 600 }}>{page.title}</Typography>
                  <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                    /{page.slug} · {page.kind}{page.customComponent ? ` · custom: ${page.customComponent}` : ''}
                  </Typography>
                </Box>
                {!page.isPublished && <Chip size="small" label="Unpublished" variant="outlined" />}
                {can('manager') && (
                  <Button size="small" startIcon={<EditIcon />} onClick={() => openEdit(page)}>Edit</Button>
                )}
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      <Dialog open={Boolean(editingSlug)} onClose={() => setEditingSlug(null)} maxWidth="md" fullWidth>
        <DialogTitle>Edit page</DialogTitle>
        <DialogContent dividers>
          {!draft ? (
            <Typography sx={{ color: 'text.secondary' }}>Loading…</Typography>
          ) : (
            <Stack spacing={2} sx={{ mt: 0.5 }}>
              {error && <Alert severity="error">{error}</Alert>}
              <TextField label="Title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} fullWidth />
              <TextField label="Accent word" value={draft.accent} onChange={(e) => setDraft({ ...draft, accent: e.target.value })} helperText="The italicised word within the title, if any" fullWidth />
              <TextField label="Intro" value={draft.intro} onChange={(e) => setDraft({ ...draft, intro: e.target.value })} multiline minRows={2} fullWidth />
              <TextField label="Updated label" value={draft.updatedLabel} onChange={(e) => setDraft({ ...draft, updatedLabel: e.target.value })} helperText='e.g. "Last updated March 2026"' fullWidth />

              <Typography sx={{ fontSize: 13, fontWeight: 600 }}>Sections</Typography>
              {draft.sections.map((section, index) => (
                <Card key={index} sx={{ bgcolor: '#fbfbfa' }}>
                  <CardContent>
                    <Stack spacing={1.5}>
                      <TextField
                        label="Heading" size="small" value={section.heading ?? ''}
                        onChange={(e) => {
                          const sections = [...draft.sections]
                          sections[index] = { ...section, heading: e.target.value }
                          setDraft({ ...draft, sections })
                        }}
                      />
                      <TextField
                        label="Body (one paragraph per line)" size="small" multiline minRows={3}
                        value={section.body.join('\n')}
                        onChange={(e) => {
                          const sections = [...draft.sections]
                          sections[index] = { ...section, body: e.target.value.split('\n') }
                          setDraft({ ...draft, sections })
                        }}
                      />
                      <Button
                        size="small" color="error" sx={{ alignSelf: 'flex-start' }}
                        onClick={() => setDraft({ ...draft, sections: draft.sections.filter((_, i) => i !== index) })}
                      >
                        Remove section
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
              <Button
                size="small" sx={{ alignSelf: 'flex-start' }}
                onClick={() => setDraft({ ...draft, sections: [...draft.sections, { heading: '', body: [''] }] })}
              >
                Add section
              </Button>

              <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography sx={{ fontSize: 14 }}>Published</Typography>
                <Switch checked={draft.isPublished} onChange={(e) => setDraft({ ...draft, isPublished: e.target.checked })} />
              </Stack>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingSlug(null)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!draft || save.isPending}
            onClick={() =>
              save.mutate({
                title: draft.title,
                accent: draft.accent || null,
                intro: draft.intro || null,
                updatedLabel: draft.updatedLabel || null,
                isPublished: draft.isPublished,
                sections: draft.sections.map((section) => ({
                  heading: section.heading || null,
                  body: section.body.filter((line) => line.trim() !== ''),
                })),
              })
            }
          >
            {save.isPending ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={Boolean(toast)} autoHideDuration={4000} onClose={() => setToast(null)}>
        <Alert severity={toast?.severity ?? 'info'} onClose={() => setToast(null)}>{toast?.message}</Alert>
      </Snackbar>
    </Stack>
  )
}

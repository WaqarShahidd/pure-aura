import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, IconButton, Snackbar, Stack, Switch, TextField, Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/DeleteOutlined'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import { get, patch } from '../../lib/api'
import { useAuth } from '../../auth/useAuth'
import AccentHeadingField from '../../components/AccentHeadingField/AccentHeadingField'

// "Fixed sections, editable fields", made literal.
//
// Four cards in a locked order. No add, no delete, no reorder handle - the API refuses
// POST and DELETE on this resource, so the screen matches what the server will actually
// allow rather than offering something that fails on save.
//
// Each section gets a purpose-built form rather than a JSON textarea: the server validates
// `content` against a per-key schema, and a free-text blob would turn every typo into a
// validation error instead of preventing it.

const STORE_URL = import.meta.env.VITE_STOREFRONT_URL ?? 'http://localhost:5173'

function SlideEditor({ slide, onChange, onRemove, onMove, index, total }) {
  const set = (field) => (value) => onChange({ ...slide, [field]: value })
  const setCta = (which) => (patchValue) =>
    onChange({ ...slide, [which]: { ...slide[which], ...patchValue } })

  return (
    <Card sx={{ bgcolor: '#fbfbfa' }}>
      <CardContent>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 2 }}>
          <Chip size="small" label={`Slide ${index + 1}`} />
          <Box sx={{ flexGrow: 1 }} />
          <IconButton size="small" onClick={() => onMove(-1)} disabled={index === 0}>
            <ArrowUpwardIcon fontSize="inherit" />
          </IconButton>
          <IconButton size="small" onClick={() => onMove(1)} disabled={index === total - 1}>
            <ArrowDownwardIcon fontSize="inherit" />
          </IconButton>
          <IconButton size="small" onClick={onRemove} disabled={total === 1}>
            <DeleteIcon fontSize="inherit" />
          </IconButton>
        </Stack>

        <Stack spacing={2}>
          <AccentHeadingField label="Heading" value={slide.heading} onChange={set('heading')} />

          <TextField
            label="Subheading"
            value={slide.subheading ?? ''}
            onChange={(event) => set('subheading')(event.target.value)}
            fullWidth
          />

          <Box>
            <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 1 }}>
              Background gradient
            </Typography>
            <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 1.5 }}>
              Shown when no poster image is set.
            </Typography>
            <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
              {['from', 'to'].map((end) => (
                <TextField
                  key={end}
                  type="color"
                  label={end === 'from' ? 'From' : 'To'}
                  value={slide.fallbackGradient?.[end] ?? '#7a6a5f'}
                  onChange={(event) =>
                    set('fallbackGradient')({
                      ...slide.fallbackGradient,
                      [end]: event.target.value,
                    })
                  }
                  sx={{ width: 110 }}
                />
              ))}
              <Box
                sx={{
                  flexGrow: 1,
                  height: 44,
                  borderRadius: 1,
                  backgroundImage: `linear-gradient(to bottom right, ${
                    slide.fallbackGradient?.from ?? '#7a6a5f'
                  }, ${slide.fallbackGradient?.to ?? '#3f342c'})`,
                }}
              />
            </Stack>
          </Box>

          {['primaryCta', 'secondaryCta'].map((which) => (
            <Stack key={which} direction="row" spacing={2} sx={{ alignItems: 'center' }}>
              <Switch
                checked={slide[which]?.enabled !== false}
                onChange={(event) => setCta(which)({ enabled: event.target.checked })}
              />
              <TextField
                label={which === 'primaryCta' ? 'Primary button' : 'Secondary button'}
                value={slide[which]?.label ?? ''}
                onChange={(event) => setCta(which)({ label: event.target.value })}
                sx={{ width: 220 }}
              />
              <TextField
                label="Link"
                value={slide[which]?.href ?? ''}
                onChange={(event) => setCta(which)({ href: event.target.value })}
                fullWidth
              />
            </Stack>
          ))}
        </Stack>
      </CardContent>
    </Card>
  )
}

function HeroForm({ content, onChange }) {
  const slides = content.slides ?? []

  const update = (index, slide) =>
    onChange({ ...content, slides: slides.map((row, at) => (at === index ? slide : row)) })

  const move = (index, delta) => {
    const next = [...slides]
    const target = index + delta
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange({ ...content, slides: next })
  }

  return (
    <Stack spacing={2}>
      {slides.map((slide, index) => (
        <SlideEditor
          key={index}
          slide={slide}
          index={index}
          total={slides.length}
          onChange={(next) => update(index, next)}
          onMove={(delta) => move(index, delta)}
          onRemove={() =>
            onChange({ ...content, slides: slides.filter((_, at) => at !== index) })
          }
        />
      ))}

      <Button
        startIcon={<AddIcon />}
        onClick={() =>
          onChange({
            ...content,
            slides: [
              ...slides,
              {
                heading: { text: 'New slide', accent: '' },
                subheading: '',
                fallbackGradient: { from: '#7a6a5f', to: '#3f342c' },
                primaryCta: { enabled: true, label: 'Shop', href: '/collections/all' },
                secondaryCta: { enabled: false, label: '', href: '' },
              },
            ],
          })
        }
      >
        Add slide
      </Button>
    </Stack>
  )
}

function FavoritesForm({ content, onChange }) {
  const set = (field) => (value) => onChange({ ...content, [field]: value })
  const promo = content.promoTile ?? {}

  return (
    <Stack spacing={3}>
      <AccentHeadingField
        label="Sage band heading"
        value={content.bandHeading}
        onChange={set('bandHeading')}
      />
      <AccentHeadingField
        label="Section heading"
        value={content.sectionHeading}
        onChange={set('sectionHeading')}
      />

      <Alert severity="info">
        The products shown here are the ones marked <strong>Homepage favourite</strong> on the
        product itself, grouped by category. The row fits a promo tile plus three cards, so a
        category with more or fewer than three favourites will look uneven.
      </Alert>

      <Box>
        <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 1.5 }}>Promo tile</Typography>
        <Stack spacing={2}>
          <TextField
            label="Title"
            value={promo.title ?? ''}
            onChange={(event) => set('promoTile')({ ...promo, title: event.target.value })}
          />
          <TextField
            label="Discount label"
            value={promo.discountLabel ?? ''}
            onChange={(event) => set('promoTile')({ ...promo, discountLabel: event.target.value })}
          />
          <TextField
            label="Link"
            value={promo.href ?? ''}
            onChange={(event) => set('promoTile')({ ...promo, href: event.target.value })}
          />
        </Stack>
      </Box>
    </Stack>
  )
}

function MarqueeForm({ content, onChange }) {
  const set = (field) => (value) => onChange({ ...content, [field]: value })

  return (
    <Stack spacing={3}>
      <Stack direction="row" spacing={2}>
        <TextField
          label="Marquee words (comma separated)"
          value={(content.marqueeItems ?? []).join(', ')}
          onChange={(event) =>
            set('marqueeItems')(
              event.target.value
                .split(',')
                .map((word) => word.trim())
                .filter(Boolean),
            )
          }
          fullWidth
        />
        <TextField
          label="Speed"
          type="number"
          value={content.marqueeSpeed ?? 22}
          onChange={(event) => set('marqueeSpeed')(Number(event.target.value))}
          helperText="Seconds per loop"
          sx={{ width: 140 }}
        />
      </Stack>

      <TextField
        label="Eyebrow"
        value={content.eyebrow ?? ''}
        onChange={(event) => set('eyebrow')(event.target.value)}
      />

      <AccentHeadingField label="Heading" value={content.heading} onChange={set('heading')} />

      <TextField
        label="Body"
        value={content.body ?? ''}
        onChange={(event) => set('body')(event.target.value)}
        multiline
        minRows={3}
      />

      <Stack direction="row" spacing={2}>
        <TextField
          label="Button label"
          value={content.cta?.label ?? ''}
          onChange={(event) => set('cta')({ ...content.cta, label: event.target.value })}
        />
        <TextField
          label="Button link"
          value={content.cta?.href ?? ''}
          onChange={(event) => set('cta')({ ...content.cta, href: event.target.value })}
          fullWidth
        />
      </Stack>

      <Stack direction="row" spacing={2}>
        <TextField
          label="Disclaimer prefix"
          value={content.disclaimer?.prefix ?? ''}
          onChange={(event) =>
            set('disclaimer')({ ...content.disclaimer, prefix: event.target.value })
          }
          fullWidth
        />
        <TextField
          label="Link label"
          value={content.disclaimer?.linkLabel ?? ''}
          onChange={(event) =>
            set('disclaimer')({ ...content.disclaimer, linkLabel: event.target.value })
          }
        />
      </Stack>
    </Stack>
  )
}

function RoutineForm({ content, onChange }) {
  const steps = content.steps ?? []
  const update = (index, step) =>
    onChange({ ...content, steps: steps.map((row, at) => (at === index ? step : row)) })

  return (
    <Stack spacing={3}>
      <AccentHeadingField
        label="Heading"
        value={content.heading}
        onChange={(value) => onChange({ ...content, heading: value })}
      />

      <TextField
        select
        label="Step open by default"
        value={content.defaultOpenStepIndex ?? 0}
        onChange={(event) =>
          onChange({ ...content, defaultOpenStepIndex: Number(event.target.value) })
        }
        slotProps={{ select: { native: true } }}
        sx={{ width: 240 }}
        helperText="Used to be hardcoded to the last step"
      >
        {steps.map((step, index) => (
          <option key={index} value={index}>
            {index + 1}. {step.label || 'Untitled'}
          </option>
        ))}
      </TextField>

      {steps.map((step, index) => (
        <Card key={index} sx={{ bgcolor: '#fbfbfa' }}>
          <CardContent>
            <Stack spacing={2}>
              <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                <Chip size="small" label={`Step ${index + 1}`} />
                <TextField
                  label="Label"
                  value={step.label ?? ''}
                  onChange={(event) => update(index, { ...step, label: event.target.value })}
                  fullWidth
                />
                <IconButton
                  onClick={() =>
                    onChange({ ...content, steps: steps.filter((_, at) => at !== index) })
                  }
                  disabled={steps.length === 1}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Stack>

              <TextField
                label="Description"
                value={step.description ?? ''}
                onChange={(event) =>
                  update(index, { ...step, description: event.target.value || null })
                }
                multiline
                minRows={2}
                helperText="Only shown when this step is open"
              />

              <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                <Switch
                  checked={step.cta?.enabled !== false}
                  onChange={(event) =>
                    update(index, { ...step, cta: { ...step.cta, enabled: event.target.checked } })
                  }
                />
                <TextField
                  label="Button"
                  value={step.cta?.label ?? ''}
                  onChange={(event) =>
                    update(index, { ...step, cta: { ...step.cta, label: event.target.value } })
                  }
                />
                <TextField
                  label="Link"
                  value={step.cta?.href ?? ''}
                  onChange={(event) =>
                    update(index, { ...step, cta: { ...step.cta, href: event.target.value } })
                  }
                  fullWidth
                />
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      ))}

      <Button
        startIcon={<AddIcon />}
        onClick={() =>
          onChange({
            ...content,
            steps: [
              ...steps,
              { label: 'New step', description: null, cta: { enabled: false, label: '', href: '' } },
            ],
          })
        }
      >
        Add step
      </Button>
    </Stack>
  )
}

const FORMS = {
  hero: HeroForm,
  favorites: FavoritesForm,
  marquee_quiz: MarqueeForm,
  routine_steps: RoutineForm,
}

export default function HomepageEditor() {
  const queryClient = useQueryClient()
  const { can } = useAuth()
  const [editing, setEditing] = useState(null)
  const [draft, setDraft] = useState(null)
  const [errors, setErrors] = useState([])
  const [toast, setToast] = useState(null)

  const { data, isPending } = useQuery({
    queryKey: ['homepage-sections'],
    queryFn: () => get('/admin/homepage/sections').then((body) => body.data),
  })

  const save = useMutation({
    mutationFn: ({ key, body }) => patch(`/admin/homepage/sections/${key}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homepage-sections'] })
      setToast({ severity: 'success', message: 'Saved — reload the storefront to see it' })
      setEditing(null)
      setErrors([])
    },
    onError: (error) => {
      setErrors(error.details ?? [{ field: '', message: error.message }])
    },
  })

  if (isPending) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 300 }}>
        <CircularProgress size={26} />
      </Box>
    )
  }

  const Form = editing ? FORMS[editing.key] : null

  return (
    <Stack spacing={2}>
      <Alert severity="info">
        The homepage always shows these four sections in this order. You can edit what is in
        them and switch any of them off, but the set and the order are fixed in the design.
      </Alert>

      {(data ?? []).map((section) => (
        <Card key={section.key}>
          <CardContent>
            <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
              <Box>
                <Typography variant="h3">{section.label}</Typography>
                <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                  {section.isEnabled ? 'Visible on the storefront' : 'Hidden'}
                </Typography>
              </Box>

              <Box sx={{ flexGrow: 1 }} />

              <Button href={STORE_URL} target="_blank" rel="noreferrer" size="small">
                Preview site
              </Button>

              <Switch
                checked={section.isEnabled}
                disabled={!can('manager')}
                onChange={(event) =>
                  save.mutate({ key: section.key, body: { isEnabled: event.target.checked } })
                }
              />

              <Button
                variant="outlined"
                disabled={!can('manager')}
                onClick={() => {
                  setEditing(section)
                  setDraft(structuredClone(section.content))
                  setErrors([])
                }}
              >
                Edit
              </Button>
            </Stack>
          </CardContent>
        </Card>
      ))}

      <Dialog open={Boolean(editing)} onClose={() => setEditing(null)} maxWidth="md" fullWidth>
        <DialogTitle>{editing?.label}</DialogTitle>
        <DialogContent dividers>
          {errors.length > 0 && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {errors.map((detail, index) => (
                <div key={index}>
                  {detail.field ? `${detail.field}: ` : ''}
                  {detail.message}
                </div>
              ))}
            </Alert>
          )}
          {Form && draft && <Form content={draft} onChange={setDraft} />}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditing(null)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={save.isPending}
            onClick={() => save.mutate({ key: editing.key, body: { content: draft } })}
          >
            {save.isPending ? 'Saving…' : 'Save'}
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

import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert, Box, Button, Card, CardContent, Checkbox, CircularProgress, FormControlLabel,
  MenuItem, Snackbar, Stack, Tab, Tabs, TextField, Typography,
} from '@mui/material'
import { del, get, patch, post } from '../../lib/api'
import { queryKeys } from '../../lib/queryKeys'
import { useAuth } from '../../auth/useAuth'
import VariantMatrix from './VariantMatrix'
import MediaPicker from '../../components/MediaPicker/MediaPicker'

const EMPTY = {
  handle: '',
  title: '',
  subtitle: '',
  description: '',
  vendor: 'Pure Aura',
  badge: null,
  crueltyFree: true,
  rating: 0,
  reviewCount: 0,
  ingredientNote: '',
  stockLabel: 'In stock - Ready to be shipped',
  categoryId: null,
  isFavorite: false,
  isUpsell: false,
  status: 'draft',
  images: [],
  ingredients: [],
  options: [],
  variants: [
    {
      label: '',
      sku: '',
      price: 0,
      compareAtPrice: null,
      stockQuantity: 0,
      lowStockThreshold: 5,
      isDefault: true,
      isActive: true,
      optionValues: {},
    },
  ],
  facetValueIds: [],
  collectionIds: [],
}

const TABS = ['Details', 'Variants', 'Media', 'Facets', 'Ingredients', 'Collections']

export default function ProductEditor() {
  const { id } = useParams()
  const isNew = !id
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { can } = useAuth()
  const readOnly = !can('manager')

  const [tab, setTab] = useState(0)
  const [values, setValues] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [toast, setToast] = useState(null)

  const productQuery = useQuery({
    queryKey: queryKeys.products.detail(id),
    queryFn: () => get(`/admin/products/${id}`).then((body) => body.data),
    enabled: !isNew,
  })

  const pickersQuery = useQuery({
    queryKey: queryKeys.products.pickers(),
    queryFn: () => get('/admin/products/pickers').then((body) => body.data),
  })

  // Hydrating the form from the fetched product during render rather than in an effect.
  // This is the same render-phase guard the storefront uses to reset per-product state in
  // Collection.jsx and Product.jsx, and it is what react-hooks/set-state-in-effect is
  // steering towards: an effect here would render once with empty values, then again with
  // the real ones, for no benefit.
  const [hydratedFrom, setHydratedFrom] = useState(null)
  if (productQuery.data && productQuery.data !== hydratedFrom) {
    setHydratedFrom(productQuery.data)
    setValues({ ...EMPTY, ...productQuery.data })
  }

  const set = (field) => (event) => {
    const value =
      event?.target?.type === 'checkbox' ? event.target.checked : (event?.target?.value ?? event)
    setValues((current) => ({ ...current, [field]: value }))
  }

  const payloadOf = (source) => ({
    ...source,
    // The API takes media ids and positions, not the hydrated image rows the editor holds.
    images: (source.images ?? []).map((image) => ({
      mediaId: image.mediaId,
      altText: image.altText ?? null,
    })),
    variants: (source.variants ?? []).map((variant) => ({
      ...variant,
      sku: variant.sku || null,
      price: Number(variant.price) || 0,
      compareAtPrice:
        variant.compareAtPrice === '' || variant.compareAtPrice == null
          ? null
          : Number(variant.compareAtPrice),
      stockQuantity: Number(variant.stockQuantity) || 0,
    })),
    rating: source.rating === '' || source.rating == null ? null : Number(source.rating),
    reviewCount: Number(source.reviewCount) || 0,
  })

  const save = useMutation({
    mutationFn: (source) =>
      isNew
        ? post('/admin/products', payloadOf(source))
        : patch(`/admin/products/${id}`, payloadOf(source)),
    onSuccess: (saved) => {
      setErrors({})
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all })
      setToast({ severity: 'success', message: 'Saved' })
      if (isNew) navigate(`/products/${saved.id}`, { replace: true })
    },
    onError: (error) => {
      // The server's details[] carry { field, message } with copy written to match what
      // the forms already say, so they drop straight onto the fields.
      const next = {}
      for (const detail of error.details ?? []) next[detail.field] = detail.message
      setErrors(next)
      setToast({ severity: 'error', message: error.message })
      if (error.details?.some((detail) => detail.field?.startsWith('variants'))) setTab(1)
    },
  })

  const remove = useMutation({
    mutationFn: () => del(`/admin/products/${id}`),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all })
      setToast({
        severity: 'success',
        message: result?.archived ? 'Archived (it has orders against it)' : 'Deleted',
      })
      navigate('/products')
    },
    onError: (error) => setToast({ severity: 'error', message: error.message }),
  })

  if (!isNew && productQuery.isPending) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 320 }}>
        <CircularProgress size={26} />
      </Box>
    )
  }

  if (productQuery.isError) {
    return <Alert severity="error">{productQuery.error.message}</Alert>
  }

  const pickers = pickersQuery.data

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
        <Box>
          <Typography variant="h2">{isNew ? 'New product' : values.title}</Typography>
          <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
            {values.status} · {values.variants?.length ?? 0} variant(s)
          </Typography>
        </Box>

        <Box sx={{ flexGrow: 1 }} />

        <Button onClick={() => navigate('/products')}>Back</Button>

        {!isNew && can('manager') && (
          <Button
            color="error"
            onClick={() => {
              // A hard-delete of something with order history would lose the link, so the
              // server archives instead. Saying so up front avoids a surprising outcome.
              if (window.confirm('Delete this product? Products with orders are archived instead.')) {
                remove.mutate()
              }
            }}
          >
            Delete
          </Button>
        )}

        <Button
          variant="contained"
          disabled={readOnly || save.isPending}
          onClick={() => save.mutate(values)}
        >
          {save.isPending ? 'Saving…' : 'Save'}
        </Button>
      </Stack>

      {readOnly && (
        <Alert severity="info">
          Your role can view the catalogue but not change it.
        </Alert>
      )}

      <Tabs value={tab} onChange={(event, next) => setTab(next)} variant="scrollable">
        {TABS.map((label) => (
          <Tab key={label} label={label} />
        ))}
      </Tabs>

      <Card>
        <CardContent sx={{ p: 3 }}>
          {tab === 0 && (
            <Stack spacing={2} sx={{ maxWidth: 720 }}>
              <TextField
                label="Title"
                value={values.title ?? ''}
                onChange={set('title')}
                error={Boolean(errors.title)}
                helperText={errors.title}
                required
              />
              <TextField
                label="Handle"
                value={values.handle ?? ''}
                onChange={set('handle')}
                error={Boolean(errors.handle)}
                helperText={errors.handle ?? 'Lowercase words separated by hyphens'}
                required
              />
              <TextField label="Subtitle" value={values.subtitle ?? ''} onChange={set('subtitle')} />
              <TextField
                label="Description"
                value={values.description ?? ''}
                onChange={set('description')}
                multiline
                minRows={4}
              />

              <Stack direction="row" spacing={2}>
                <TextField
                  select
                  label="Category"
                  value={values.categoryId ?? ''}
                  onChange={set('categoryId')}
                  sx={{ minWidth: 200 }}
                >
                  <MenuItem value="">None</MenuItem>
                  {(pickers?.categories ?? []).map((category) => (
                    <MenuItem key={category.id} value={category.id}>
                      {category.title}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  select
                  label="Status"
                  value={values.status ?? 'draft'}
                  onChange={set('status')}
                  sx={{ minWidth: 160 }}
                >
                  <MenuItem value="draft">Draft</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="archived">Archived</MenuItem>
                </TextField>

                <TextField
                  select
                  label="Badge"
                  value={values.badge ?? ''}
                  onChange={(event) => set('badge')(event.target.value || null)}
                  sx={{ minWidth: 160 }}
                >
                  <MenuItem value="">None</MenuItem>
                  <MenuItem value="BEST SELLER">BEST SELLER</MenuItem>
                  <MenuItem value="SALE">SALE</MenuItem>
                </TextField>
              </Stack>

              <Stack direction="row" spacing={2}>
                <TextField
                  label="Rating"
                  type="number"
                  value={values.rating ?? 0}
                  onChange={set('rating')}
                  slotProps={{ htmlInput: { min: 0, max: 5 } }}
                  error={Boolean(errors.rating)}
                  helperText={errors.rating ?? '0 means no reviews yet'}
                  sx={{ width: 160 }}
                />
                <TextField
                  label="Review count"
                  type="number"
                  value={values.reviewCount ?? 0}
                  onChange={set('reviewCount')}
                  slotProps={{ htmlInput: { min: 0 } }}
                  sx={{ width: 160 }}
                />
                <TextField
                  label="Stock label"
                  value={values.stockLabel ?? ''}
                  onChange={set('stockLabel')}
                  fullWidth
                />
              </Stack>

              <Stack direction="row" spacing={3}>
                <FormControlLabel
                  control={<Checkbox checked={Boolean(values.crueltyFree)} onChange={set('crueltyFree')} />}
                  label="Cruelty free"
                />
                <FormControlLabel
                  control={<Checkbox checked={Boolean(values.isFavorite)} onChange={set('isFavorite')} />}
                  label="Homepage favourite"
                />
                <FormControlLabel
                  control={<Checkbox checked={Boolean(values.isUpsell)} onChange={set('isUpsell')} />}
                  label="Cart upsell"
                />
              </Stack>
            </Stack>
          )}

          {tab === 1 && (
            <>
              {errors.variants && <Alert severity="error" sx={{ mb: 2 }}>{errors.variants}</Alert>}
              <VariantMatrix
                options={values.options ?? []}
                variants={values.variants ?? []}
                onChange={(variants) => setValues((current) => ({ ...current, variants }))}
                onOptionsChange={(options) => setValues((current) => ({ ...current, options }))}
              />
            </>
          )}

          {tab === 2 && (
            <MediaPicker
              selected={values.images ?? []}
              onChange={(images) => setValues((current) => ({ ...current, images }))}
            />
          )}

          {tab === 3 && (
            <Stack spacing={2} sx={{ maxWidth: 720 }}>
              {errors.facetValueIds && <Alert severity="error">{errors.facetValueIds}</Alert>}
              {(pickers?.facets ?? []).map((facet) => (
                <TextField
                  key={facet.id}
                  select
                  label={`${facet.label}${facet.cardinality === 'multi' ? ' (multiple)' : ''}`}
                  value={
                    facet.cardinality === 'multi'
                      ? (values.facetValueIds ?? []).filter((valueId) =>
                          facet.values.some((value) => value.id === valueId),
                        )
                      : ((values.facetValueIds ?? []).find((valueId) =>
                          facet.values.some((value) => value.id === valueId),
                        ) ?? '')
                  }
                  onChange={(event) => {
                    const picked = event.target.value
                    const others = (values.facetValueIds ?? []).filter(
                      (valueId) => !facet.values.some((value) => value.id === valueId),
                    )
                    const next = Array.isArray(picked) ? picked : picked ? [picked] : []
                    setValues((current) => ({ ...current, facetValueIds: [...others, ...next] }))
                  }}
                  slotProps={{ select: { multiple: facet.cardinality === 'multi' } }}
                >
                  {facet.cardinality !== 'multi' && <MenuItem value="">None</MenuItem>}
                  {facet.values.map((value) => (
                    <MenuItem key={value.id} value={value.id}>
                      {value.label}
                    </MenuItem>
                  ))}
                </TextField>
              ))}
            </Stack>
          )}

          {tab === 4 && (
            <Stack spacing={2} sx={{ maxWidth: 560 }}>
              {(values.ingredients ?? []).map((ingredient, index) => (
                <Stack key={index} direction="row" spacing={2}>
                  <TextField
                    label="Ingredient"
                    value={ingredient.name}
                    onChange={(event) =>
                      setValues((current) => ({
                        ...current,
                        ingredients: current.ingredients.map((row, at) =>
                          at === index ? { ...row, name: event.target.value } : row,
                        ),
                      }))
                    }
                    fullWidth
                  />
                  <TextField
                    label="%"
                    type="number"
                    value={ingredient.percent}
                    onChange={(event) =>
                      setValues((current) => ({
                        ...current,
                        ingredients: current.ingredients.map((row, at) =>
                          at === index ? { ...row, percent: Number(event.target.value) } : row,
                        ),
                      }))
                    }
                    slotProps={{ htmlInput: { min: 0, max: 100 } }}
                    sx={{ width: 110 }}
                  />
                  <Button
                    color="error"
                    onClick={() =>
                      setValues((current) => ({
                        ...current,
                        ingredients: current.ingredients.filter((_, at) => at !== index),
                      }))
                    }
                  >
                    Remove
                  </Button>
                </Stack>
              ))}

              <Button
                onClick={() =>
                  setValues((current) => ({
                    ...current,
                    ingredients: [...(current.ingredients ?? []), { name: '', percent: 5 }],
                  }))
                }
              >
                Add ingredient
              </Button>

              <TextField
                label="Ingredient note"
                value={values.ingredientNote ?? ''}
                onChange={set('ingredientNote')}
                multiline
                minRows={3}
              />
            </Stack>
          )}

          {tab === 5 && (
            <TextField
              select
              label="Collections"
              value={values.collectionIds ?? []}
              onChange={(event) =>
                setValues((current) => ({ ...current, collectionIds: event.target.value }))
              }
              slotProps={{ select: { multiple: true } }}
              sx={{ maxWidth: 520 }}
              fullWidth
            >
              {(pickers?.collections ?? []).map((collection) => (
                <MenuItem key={collection.id} value={collection.id}>
                  {collection.title}
                </MenuItem>
              ))}
            </TextField>
          )}
        </CardContent>
      </Card>

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={toast?.severity ?? 'info'} onClose={() => setToast(null)}>
          {toast?.message}
        </Alert>
      </Snackbar>
    </Stack>
  )
}

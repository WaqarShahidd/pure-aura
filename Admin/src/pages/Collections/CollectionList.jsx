import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Alert, Box, Button, Card, CardContent, Chip, Stack, Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import { get } from '../../lib/api'
import { queryKeys } from '../../lib/queryKeys'
import { useAuth } from '../../auth/useAuth'

function FeaturedPanel() {
  const { data } = useQuery({
    queryKey: queryKeys.collections.featured,
    queryFn: () => get('/admin/collections/featured').then((body) => body.data),
  })

  return (
    <Card>
      <CardContent>
        <Typography variant="h3" sx={{ mb: 0.5 }}>Featured on homepage</Typography>
        <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 2 }}>
          The 4 cards on the homepage's favourites row, in this order. Edit a collection to
          add or remove it here.
        </Typography>
        {(data ?? []).length !== 4 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {(data ?? []).length} of 4 slots filled - the homepage row expects exactly 4.
          </Alert>
        )}
        <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', gap: 2 }}>
          {(data ?? []).map((collection) => (
            <Box
              key={collection.id}
              sx={{ width: 120, border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}
            >
              <Box
                component="img"
                src={collection.image}
                alt=""
                sx={{ width: '100%', height: 90, objectFit: 'cover', bgcolor: '#eef1e7', display: 'block' }}
              />
              <Box sx={{ p: 1 }}>
                <Chip size="small" label={`#${collection.featuredPosition}`} sx={{ mb: 0.5 }} />
                <Typography sx={{ fontSize: 12 }}>{collection.title}</Typography>
              </Box>
            </Box>
          ))}
        </Stack>
      </CardContent>
    </Card>
  )
}

export default function CollectionList() {
  const navigate = useNavigate()
  const { can } = useAuth()

  const { data, isPending } = useQuery({
    queryKey: queryKeys.collections.all,
    queryFn: () => get('/admin/collections').then((body) => body.data),
  })

  return (
    <Stack spacing={3}>
      <Stack direction="row" sx={{ alignItems: 'center' }}>
        <Typography variant="h2">Collections</Typography>
        <Box sx={{ flexGrow: 1 }} />
        {can('manager') && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/collections/new')}>
            New collection
          </Button>
        )}
      </Stack>

      <FeaturedPanel />

      {isPending ? (
        <Typography sx={{ color: 'text.secondary' }}>Loading…</Typography>
      ) : (
        <Stack spacing={1.5}>
          {(data ?? []).map((collection) => (
            <Card
              key={collection.id}
              onClick={() => navigate(`/collections/${collection.id}`)}
              sx={{ cursor: 'pointer' }}
            >
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  component="img"
                  src={collection.image}
                  alt=""
                  sx={{ width: 44, height: 44, borderRadius: 1, objectFit: 'cover', bgcolor: '#eef1e7' }}
                />
                <Box sx={{ flexGrow: 1 }}>
                  <Typography sx={{ fontWeight: 600 }}>{collection.title}</Typography>
                  <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                    /{collection.handle} · {collection.productCount ?? 0} product{collection.productCount === 1 ? '' : 's'}
                  </Typography>
                </Box>
                {collection.isFeatured && <Chip size="small" label={`Featured #${collection.featuredPosition}`} color="primary" />}
                {!collection.isActive && <Chip size="small" label="Inactive" variant="outlined" />}
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
    </Stack>
  )
}

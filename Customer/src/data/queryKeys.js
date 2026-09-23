// One factory for every cache key, so an invalidation after a mutation cannot miss a
// query because the key was spelled differently in two files.
export const queryKeys = {
  products: {
    all: ['products'],
    list: (params = {}) => ['products', 'list', params],
    detail: (handle) => ['products', 'detail', handle],
    favorites: () => ['products', 'favorites'],
    upsells: (exclude = []) => ['products', 'upsells', [...exclude].sort()],
    search: (query) => ['products', 'search', query],
  },
  collections: {
    all: ['collections'],
    list: () => ['collections', 'list'],
    detail: (handle) => ['collections', 'detail', handle],
    featured: () => ['collections', 'featured'],
  },
  categories: () => ['categories'],
  filters: () => ['filters'],
}

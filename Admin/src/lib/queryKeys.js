export const queryKeys = {
  products: {
    all: ['products'],
    list: (params = {}) => ['products', 'list', params],
    detail: (id) => ['products', 'detail', id],
    pickers: () => ['products', 'pickers'],
  },
  media: {
    all: ['media'],
    list: (params = {}) => ['media', 'list', params],
    usage: (id) => ['media', 'usage', id],
  },
}

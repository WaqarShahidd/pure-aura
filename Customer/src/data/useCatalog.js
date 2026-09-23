import { useQuery } from '@tanstack/react-query'
import { queryKeys } from './queryKeys'
import {
  favoriteCategoriesOf,
  fetchAllProducts,
  fetchCategories,
  fetchCollectionByHandle,
  fetchCollections,
  fetchFavorites,
  fetchFeaturedCollections,
  fetchFilters,
  fetchProductByHandle,
  fetchProductsByCollection,
  fetchRoutineProducts,
  fetchSearchResults,
  fetchUpsells,
} from './catalog'

// A hook per accessor. Components used to call getAllProducts() and get an array back;
// they now call useAllProducts() and get { data, isPending, isError } — the one shape
// change the API migration forces on them.
//
// EMPTY is a module-level frozen constant, not an inline []. Collection.jsx feeds the
// products array into three useMemos, and a fresh literal on every render would recompute
// the facets every render, which is the sort of thing that only shows up as jank later.
export const EMPTY = Object.freeze([])

export function useAllProducts({ sort } = {}) {
  return useQuery({
    queryKey: queryKeys.products.list({ sort }),
    queryFn: () => fetchAllProducts({ sort }),
  })
}

export function useProduct(handle) {
  return useQuery({
    queryKey: queryKeys.products.detail(handle),
    queryFn: () => fetchProductByHandle(handle),
    enabled: Boolean(handle),
  })
}

export function useCollectionProducts(handle, { sort } = {}) {
  return useQuery({
    queryKey: queryKeys.products.list({ collection: handle, sort }),
    queryFn: () => fetchProductsByCollection(handle, { sort }),
    enabled: Boolean(handle),
  })
}

export function useFavorites() {
  return useQuery({
    queryKey: queryKeys.products.favorites(),
    queryFn: fetchFavorites,
  })
}

export function useUpsells(excludeHandles = []) {
  return useQuery({
    queryKey: queryKeys.products.upsells(excludeHandles),
    queryFn: () => fetchUpsells(excludeHandles),
  })
}

export function useRoutineProducts(handle) {
  return useQuery({
    queryKey: [...queryKeys.products.detail(handle), 'routine'],
    queryFn: () => fetchRoutineProducts(handle),
    enabled: Boolean(handle),
  })
}

export function useSearch(query) {
  return useQuery({
    queryKey: queryKeys.products.search(query),
    queryFn: () => fetchSearchResults(query),
    enabled: Boolean(query),
    // Search runs on every keystroke. Keeping the previous results on screen while the
    // next query resolves stops the grid flashing empty between letters.
    placeholderData: (previous) => previous,
  })
}

export function useCollections() {
  return useQuery({ queryKey: queryKeys.collections.list(), queryFn: fetchCollections })
}

export function useCollection(handle) {
  return useQuery({
    queryKey: queryKeys.collections.detail(handle),
    queryFn: () => fetchCollectionByHandle(handle),
    enabled: Boolean(handle),
  })
}

export function useFeaturedCollections() {
  return useQuery({
    queryKey: queryKeys.collections.featured(),
    queryFn: fetchFeaturedCollections,
  })
}

export function useCategories() {
  return useQuery({ queryKey: queryKeys.categories(), queryFn: fetchCategories })
}

// The filter vocabulary: facets, price ranges and sort options, replacing the literals in
// config/filters.js. It changes only when an admin edits it, so it is effectively static
// for the length of a session.
export function useFilters() {
  return useQuery({
    queryKey: queryKeys.filters(),
    queryFn: fetchFilters,
    staleTime: Infinity,
  })
}

export { favoriteCategoriesOf }

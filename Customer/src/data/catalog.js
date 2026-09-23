// Accessors over the catalogue. Components read through these rather than talking to the
// API directly, so the data source lives in one file — which is exactly what the original
// version of this comment promised when these were synchronous reads over a literal array.
//
// They are now fetchers. The function names and their arguments are unchanged; only the
// return type is (a promise instead of an array). Components do not call these directly
// any more — useCatalog.js wraps each one in a query so loading and error states exist —
// but the shape of the data coming back is identical to what products.js used to hold.

import { api, buildQuery } from '../lib/api'
import { ALL_COLLECTION } from '../config/routes'

export function fetchAllProducts({ sort } = {}) {
  return api(`/products${buildQuery({ sort })}`)
}

export function fetchProductByHandle(handle) {
  return api(`/products/${encodeURIComponent(handle)}`)
}

export function fetchProductsByCollection(handle = ALL_COLLECTION, { sort } = {}) {
  return api(`/collections/${encodeURIComponent(handle)}/products${buildQuery({ sort })}`)
}

export function fetchProductsByCategory(category) {
  return api(`/products${buildQuery({ category })}`)
}

export function fetchFavorites() {
  return api(`/products${buildQuery({ favorites: true })}`)
}

export function fetchUpsells(excludeHandles = []) {
  return api(`/products${buildQuery({ upsell: true, exclude: excludeHandles })}`)
}

export function fetchSearchResults(query) {
  return api(`/products${buildQuery({ q: query })}`)
}

export function fetchCollections() {
  return api('/collections')
}

export function fetchCollectionByHandle(handle = ALL_COLLECTION) {
  return api(`/collections/${encodeURIComponent(handle)}`)
}

export function fetchFeaturedCollections() {
  return api('/collections/featured')
}

export function fetchCategories() {
  return api('/categories')
}

export function fetchFilters() {
  return api('/filters')
}

// Still derived client-side rather than given its own endpoint: it is a distinct-values
// pass over a list the caller already has, and a round trip to compute it would be slower
// than the reduce.
export function favoriteCategoriesOf(favorites = []) {
  return [...new Set(favorites.map((product) => product.category))]
}

// routineWith arrives on the product as an array of handles, and RoutineRow needs titles
// and images. This has its own endpoint rather than being embedded in the product payload,
// which keeps that payload exactly the shape products.js had — the thing the serializer
// snapshot test guards.
export function fetchRoutineProducts(handle) {
  return api(`/products/${encodeURIComponent(handle)}/routine`)
}

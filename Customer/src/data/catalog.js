// Accessors over the mock catalogue. Components read through these rather than importing
// products.js directly, so swapping the data source later is a change in one file.

import { products } from './products'
import { collections, featuredCollectionCards } from './collections'
import { ALL_COLLECTION } from '../config/routes'

export function getAllProducts() {
  return products
}

export function getProductByHandle(handle) {
  return products.find((product) => product.handle === handle)
}

export function getProductsByCollection(handle = ALL_COLLECTION) {
  if (handle === ALL_COLLECTION) return products
  return products.filter((product) => product.collections.includes(handle))
}

export function getProductsByCategory(category) {
  return products.filter((product) => product.category === category)
}

export function getFavorites() {
  return products.filter((product) => product.isFavorite)
}

export function getUpsells(excludeHandles = []) {
  return products.filter(
    (product) => product.isUpsell && !excludeHandles.includes(product.handle),
  )
}

export function getRoutineProducts(product) {
  if (!product?.routineWith) return []
  return product.routineWith.map(getProductByHandle).filter(Boolean)
}

export function getCollectionByHandle(handle = ALL_COLLECTION) {
  return collections.find((collection) => collection.handle === handle)
}

export function getFeaturedCollections() {
  return featuredCollectionCards.map(getCollectionByHandle).filter(Boolean)
}

// The category values used by the homepage showcase pills.
export function getFavoriteCategories() {
  return [...new Set(getFavorites().map((product) => product.category))]
}

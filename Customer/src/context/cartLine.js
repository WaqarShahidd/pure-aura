// Builds a cart line from a product record. Snapshots price at add time so later catalogue
// edits never rewrite what someone already has in their cart.
export function cartLineFrom(product, options = {}) {
  return {
    key: product.handle,
    handle: product.handle,
    title: product.title,
    image: product.image,
    variantSummary: product.variantSummary,
    price: product.price,
    compareAtPrice: product.compareAtPrice ?? null,
    giftWrap: options.giftWrap ?? false,
    giftCard: options.giftCard ?? false,
    giftMessage: options.giftMessage ?? '',
  }
}

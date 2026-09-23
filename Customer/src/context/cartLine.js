// Builds a cart line from a product record. Snapshots price at add time so later catalogue
// edits never rewrite what someone already has in their cart.

// A tiny non-cryptographic hash, only used to fold a gift message into the line key.
// Same shape as ImagePlaceholder.tintFor - stable output for the same input is all it needs.
function hashOf(value) {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) % 99991
  }
  return hash.toString(36)
}

// The line key used to be the product handle alone, which quietly merged two adds of the
// same product and DISCARDED the second one's gift options: ordering one plain and one
// gift-wrapped gave you two plain. It now includes the variant and the options, so lines
// that differ in any way a customer would notice stay separate.
export function cartLineKey(variantId, handle, options = {}) {
  return [
    variantId ?? handle,
    options.giftWrap ? 'gw' : '',
    options.giftCard ? 'gc' : '',
    options.giftMessage ? `m${hashOf(options.giftMessage)}` : '',
  ]
    .filter(Boolean)
    .join('::')
}

export function cartLineFrom(product, options = {}, variant = null) {
  // Products always have at least one variant now. The default is what the grid and the
  // cart drawer price against, so it is the right fallback when nothing was chosen.
  const chosen = variant ?? product.variants?.find((row) => row.isDefault) ?? product.variants?.[0]

  return {
    key: cartLineKey(chosen?.id, product.handle, options),
    handle: product.handle,
    variantId: chosen?.id ?? null,
    title: product.title,
    image: product.image,
    variantSummary: chosen?.label ?? product.variantSummary,
    price: chosen?.price ?? product.price,
    compareAtPrice: chosen?.compareAtPrice ?? product.compareAtPrice ?? null,
    giftWrap: options.giftWrap ?? false,
    giftCard: options.giftCard ?? false,
    giftMessage: options.giftMessage ?? '',
  }
}

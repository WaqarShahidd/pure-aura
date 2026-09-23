// One order shape, used by the storefront receipt, the account pages and the admin.
// Line items describe themselves - title, variant label, image and price were snapshotted
// at purchase - so nothing here needs the catalogue.
export function serializeOrder(order, { includeEvents = true } = {}) {
  return {
    id: order.number,
    number: order.number,
    status: order.status,
    paymentStatus: order.paymentStatus,
    placedOn: order.placedAt,
    confirmedAt: order.confirmedAt,
    deliveredOn: order.deliveredAt,
    cancelledAt: order.cancelledAt,

    email: order.contactEmail,
    phone: order.contactPhone,

    subtotal: order.subtotalAmount,
    discount: order.discountAmount,
    discountCode: order.discountCode,
    shipping: order.shippingAmount,
    tax: order.taxAmount,
    taxRateBp: order.taxRateBp,
    // Prices include tax, so this is the portion contained in the total rather than
    // something added to it. The storefront shows it as "(incl. GST Rs X)".
    taxInclusive: order.taxInclusive,
    total: order.totalAmount,

    delivery: order.deliveryMethodLabel,
    paymentLabel: order.paymentMethodLabel,
    trackingNumber: order.trackingNumber,
    trackingUrl: order.trackingUrl,
    courier: order.courier ? { name: order.courier.name } : null,

    shippingAddress: {
      name: order.shipName,
      line1: order.shipLine1,
      line2: order.shipLine2,
      city: order.shipCity,
      region: order.shipRegion,
      postcode: order.shipPostcode,
      country: order.shipCountry,
      phone: order.shipPhone,
    },

    items: (order.items ?? []).map((item) => ({
      handle: item.handle,
      title: item.title,
      variantLabel: item.variantLabel,
      image: item.imageUrl,
      quantity: item.quantity,
      price: item.unitPrice,
      lineTotal: item.lineTotal,
      giftWrap: item.giftWrap,
      giftCard: item.giftCard,
      giftMessage: item.giftMessage,
    })),

    payment: (order.payments ?? [])[0]
      ? {
          kind: order.payments[0].kind,
          status: order.payments[0].status,
          referenceCode: order.payments[0].referenceCode,
          bankAccount: order.payments[0].bankAccountSnapshot,
          hasProof: Boolean(order.payments[0].proofMediaId),
        }
      : null,

    ...(includeEvents
      ? {
          events: (order.events ?? [])
            .slice()
            .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
            .map((event) => ({
              status: event.toStatus,
              at: event.createdAt,
              note: event.note,
              actor: event.actorType,
            })),
        }
      : {}),
  }
}

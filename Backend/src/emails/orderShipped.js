import { layout } from './layout.js'

export function orderShippedEmail({ order }) {
  const bodyHtml = `
    <p style="font-size: 14px; line-height: 1.6;">
      Your order <strong>${order.number}</strong> is on its way.
    </p>
    ${
      order.trackingNumber
        ? `<p style="font-size: 14px;">
             ${order.courierName ?? 'Courier'} tracking: <strong>${order.trackingNumber}</strong>
             ${order.trackingUrl ? `<br /><a href="${order.trackingUrl}" style="color:#e2733a;">Track your parcel</a>` : ''}
           </p>`
        : ''
    }
  `

  return {
    subject: `Order ${order.number} has shipped`,
    html: layout({ title: 'Your order has shipped', bodyHtml, preheader: `Order ${order.number} is on its way` }),
    text: `Order ${order.number} has shipped.${order.trackingNumber ? ` Tracking: ${order.trackingNumber}` : ''}`,
  }
}

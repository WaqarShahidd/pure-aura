import { layout, money } from './layout.js'

export function orderConfirmedEmail({ order, items }) {
  const itemsHtml = items
    .map(
      (item) => `<tr>
        <td style="padding: 8px 0; font-size: 14px;">${item.title}${item.variantLabel ? ` — ${item.variantLabel}` : ''} × ${item.quantity}</td>
        <td style="padding: 8px 0; font-size: 14px; text-align:right;">${money(item.lineTotal)}</td>
      </tr>`,
    )
    .join('')

  const bodyHtml = `
    <p style="font-size: 14px; line-height: 1.6;">
      Thanks for your order. We've got it and we're getting it ready.
    </p>
    <p style="font-size: 14px;"><strong>Order ${order.number}</strong></p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top: 1px solid #eee; margin-top: 8px;">
      ${itemsHtml}
      <tr><td style="padding-top: 12px; border-top: 1px solid #eee; font-size: 15px; font-weight:600;">Total</td>
          <td style="padding-top: 12px; border-top: 1px solid #eee; font-size: 15px; font-weight:600; text-align:right;">${money(order.totalAmount)}</td></tr>
    </table>
    ${
      order.paymentMethodLabel?.toLowerCase().includes('transfer')
        ? `<p style="font-size: 13px; color:#6b6b6b; margin-top: 20px;">
             We're waiting on your bank transfer - upload your receipt from the confirmation
             page if you haven't already, and we'll confirm as soon as it's verified.
           </p>`
        : `<p style="font-size: 13px; color:#6b6b6b; margin-top: 20px;">
             We'll email you again once your order ships.
           </p>`
    }
  `

  return {
    subject: `Order ${order.number} confirmed`,
    html: layout({ title: 'Your order is confirmed', bodyHtml, preheader: `Order ${order.number} — ${money(order.totalAmount)}` }),
    text: `Order ${order.number} confirmed. Total ${money(order.totalAmount)}.`,
  }
}

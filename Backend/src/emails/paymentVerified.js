import { layout, money } from './layout.js'

export function paymentVerifiedEmail({ order }) {
  const bodyHtml = `
    <p style="font-size: 14px; line-height: 1.6;">
      We've received and verified your bank transfer for order <strong>${order.number}</strong>.
    </p>
    <p style="font-size: 14px;">Amount confirmed: <strong>${money(order.totalAmount)}</strong></p>
    <p style="font-size: 13px; color:#6b6b6b; margin-top: 20px;">
      Your order is now confirmed and will be prepared for dispatch. We'll email you again
      once it ships.
    </p>
  `

  return {
    subject: `Payment verified for order ${order.number}`,
    html: layout({ title: 'Payment verified', bodyHtml, preheader: `We've confirmed your transfer for order ${order.number}` }),
    text: `Payment verified for order ${order.number}. Amount: ${money(order.totalAmount)}.`,
  }
}

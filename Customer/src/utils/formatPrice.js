// Prices are stored and displayed in Pakistani rupees. PKR has no practical subunit, so
// amounts are whole rupees and render without decimals ("Rs 19,000").
export const CURRENCY = 'PKR'
export const CURRENCY_LOCALE = 'en-PK'

export function formatPrice(amount, currency = CURRENCY) {
  return new Intl.NumberFormat(CURRENCY_LOCALE, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

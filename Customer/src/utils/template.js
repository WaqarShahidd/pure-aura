// Fills `{placeholder}` tokens in a CMS-authored string. An unknown placeholder renders
// empty rather than throwing, so an admin typo is invisible rather than embarrassing -
// the copy functions this replaces (`freeShippingProgress(amount)` etc.) cannot be stored
// as functions, so this is what a template becomes once it lives in the database instead
// of in code.
export function fill(template, values = {}) {
  if (!template) return ''
  return template.replace(/\{(\w+)\}/g, (match, key) => (key in values ? String(values[key]) : ''))
}

// Order numbers come from a Postgres sequence starting at 10248, which is the number
// of the first mock order in the storefront's data/account.js. That keeps seeded
// history continuous with anything placed afterwards, and replaces checkout's current
// `PA-${Math.floor(10000 + Math.random() * 89999)}` - which can collide, and does so
// silently, because nothing was ever stored to collide against.

export const ORDER_NUMBER_SEQUENCE = 'order_number_seq'
export const ORDER_NUMBER_START = 10248
export const BANK_REFERENCE_SEQUENCE = 'bank_reference_seq'
export const BANK_REFERENCE_START = 44712

export async function nextOrderNumber(sequelize, transaction) {
  const [row] = await sequelize.query(`SELECT nextval('${ORDER_NUMBER_SEQUENCE}') AS value`, {
    type: sequelize.constructor.QueryTypes.SELECT,
    transaction,
  })
  return `PA-${row.value}`
}

export async function nextBankReference(sequelize, transaction) {
  const [row] = await sequelize.query(`SELECT nextval('${BANK_REFERENCE_SEQUENCE}') AS value`, {
    type: sequelize.constructor.QueryTypes.SELECT,
    transaction,
  })
  return `PA-BT-${row.value}`
}

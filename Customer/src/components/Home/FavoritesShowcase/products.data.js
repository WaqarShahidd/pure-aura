// The promo tile beside the favourites grid. Not a real product — it has a discount label
// rather than a price — so it stays here rather than moving into src/data/products.js.
import { collectionPath } from '../../../config/routes'

export const featuredProduct = {
  title: 'Puff Official',
  discountLabel: 'UP TO 10% OFF',
  image: null,
  href: collectionPath('best-sellers'),
}

import QuantityStepper from '../../Common/QuantityStepper/QuantityStepper'
import Button from '../../Common/Button/Button'
import { productPageCopy } from '../../../config/productPage'
import { formatPrice } from '../../../utils/formatPrice'

export default function ProductPurchase({
  product,
  quantity,
  onQuantityChange,
  onAddToCart,
  onBuyNow,
}) {
  const disabled = !product.inStock

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <QuantityStepper value={quantity} onChange={onQuantityChange} />

        <Button
          variant="outline-dark"
          onClick={onAddToCart}
          disabled={disabled}
          fullWidth
          className="flex-1"
        >
          {disabled
            ? 'Out of stock'
            : `${productPageCopy.addToCart} - ${formatPrice(product.price * quantity)}`}
        </Button>
      </div>

      <Button variant="solid-dark" onClick={onBuyNow} disabled={disabled} fullWidth>
        {productPageCopy.buyNow}
      </Button>
    </div>
  )
}

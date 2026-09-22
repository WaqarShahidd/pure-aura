import { Link } from 'react-router-dom'
import AddIcon from '@mui/icons-material/Add'
import ImagePlaceholder from '../../Common/ImagePlaceholder/ImagePlaceholder'
import PriceTag from '../../Common/PriceTag/PriceTag'
import { cartCopy } from '../../../config/cart'
import { productPath } from '../../../config/routes'

export default function CartUpsells({ products, onAdd, onNavigate }) {
  if (products.length === 0) return null

  return (
    <div className="border-t border-charcoal/10 px-5 py-4">
      <h3 className="mb-3 text-sm font-medium">{cartCopy.upsellTitle}</h3>

      <ul className="flex flex-col gap-3">
        {products.map((product) => (
          <li key={product.handle} className="flex items-center gap-3">
            <Link to={productPath(product.handle)} onClick={onNavigate} className="w-12 shrink-0">
              <ImagePlaceholder
                src={product.image}
                alt={product.title}
                seed={product.handle}
                rounded="rounded-lg"
              />
            </Link>

            <div className="min-w-0 flex-1">
              <Link
                to={productPath(product.handle)}
                onClick={onNavigate}
                className="block truncate text-sm"
              >
                {product.title}
              </Link>
              <PriceTag
                price={product.price}
                compareAtPrice={product.compareAtPrice}
                size="sm"
              />
            </div>

            <button
              type="button"
              aria-label={`Add ${product.title} to cart`}
              onClick={() => onAdd(product)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-charcoal text-white transition-opacity hover:opacity-85"
            >
              <AddIcon fontSize="small" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

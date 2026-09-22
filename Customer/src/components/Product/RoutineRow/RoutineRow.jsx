import { Link } from 'react-router-dom'
import ImagePlaceholder from '../../Common/ImagePlaceholder/ImagePlaceholder'
import { productPageCopy } from '../../../config/productPage'
import { productPath } from '../../../config/routes'

export default function RoutineRow({ products }) {
  if (products.length === 0) return null

  return (
    <div>
      <h2 className="mb-4 text-sm font-medium">{productPageCopy.routineTitle}</h2>
      <div className="grid grid-cols-3 gap-3 md:grid-cols-5">
        {products.map((product) => (
          <Link key={product.handle} to={productPath(product.handle)} title={product.title}>
            <ImagePlaceholder
              src={product.image}
              alt={product.title}
              seed={product.handle}
              aspect="portrait"
              rounded="rounded-xl"
            />
          </Link>
        ))}
      </div>
    </div>
  )
}

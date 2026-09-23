import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ProductGallery from '../../components/Product/ProductGallery/ProductGallery'
import ProductSummary from '../../components/Product/ProductSummary/ProductSummary'
import ProductOptions from '../../components/Product/ProductOptions/ProductOptions'
import FileDropzone from '../../components/Product/FileDropzone/FileDropzone'
import ProductPurchase from '../../components/Product/ProductPurchase/ProductPurchase'
import PickupInfo from '../../components/Product/PickupInfo/PickupInfo'
import MoreDeals from '../../components/Product/MoreDeals/MoreDeals'
import ProductAccordions from '../../components/Product/ProductAccordions/ProductAccordions'
import RoutineRow from '../../components/Product/RoutineRow/RoutineRow'
import Breadcrumb from '../../components/Common/Breadcrumb/Breadcrumb'
import PaymentIcons from '../../components/Common/PaymentIcons/PaymentIcons'
import NotFound from '../NotFound/NotFound'
import ProductDetailSkeleton from '../../components/Product/ProductDetailSkeleton'
import LoadError from '../../components/Common/LoadError/LoadError'
import { EMPTY, useProduct, useRoutineProducts, useUpsells } from '../../data/useCatalog'
import { cartLineFrom } from '../../context/cartLine'
import { useCart } from '../../context/useCart'
import { productPageCopy } from '../../config/productPage'
import { ROUTES, collectionPath } from '../../config/routes'

const EMPTY_OPTIONS = { giftWrap: false, giftCard: false, giftMessage: '' }

export default function Product() {
  const { handle } = useParams()
  const navigate = useNavigate()
  const { addItem } = useCart()

  const [quantity, setQuantity] = useState(1)
  const [options, setOptions] = useState(EMPTY_OPTIONS)
  const [artworkFile, setArtworkFile] = useState(null)

  // Reset per-product state when navigating between products, which happens via the
  // "Complete your routine with" row without unmounting this page.
  const [lastHandle, setLastHandle] = useState(handle)
  if (handle !== lastHandle) {
    setLastHandle(handle)
    setQuantity(1)
    setOptions(EMPTY_OPTIONS)
    setArtworkFile(null)
  }

  // Every hook has to run before the early returns below. Sequencing matters here: the
  // NotFound and loading branches used to sit above these calls, and moving a return
  // upwards would change the hook order between renders.
  const { data: product, isPending, isError, error, refetch } = useProduct(handle)
  const { data: routineProducts = EMPTY } = useRoutineProducts(handle)
  const { data: deals = EMPTY } = useUpsells(handle ? [handle] : [])

  if (isPending) return <ProductDetailSkeleton />
  // A 404 from the API is a genuinely missing product, not a failure worth retrying.
  if (isError && error?.status === 404) return <NotFound />
  if (isError) return <LoadError onAction={refetch} />
  if (!product) return <NotFound />

  const deal = deals[0]

  const handleAddToCart = () => addItem(cartLineFrom(product, options), quantity)
  const handleBuyNow = () => {
    addItem(cartLineFrom(product, options), quantity)
    navigate(ROUTES.checkout)
  }

  return (
    <>
      <div className="border-b border-charcoal/10 bg-cream py-4">
        <Breadcrumb
          items={[
            { label: 'Home', href: ROUTES.home },
            { label: 'Products', href: collectionPath('all') },
            { label: product.title },
          ]}
        />
      </div>

      <section className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-6 py-12 md:grid-cols-2 md:gap-14 md:px-10">
        <ProductGallery product={product} />

        <div className="flex flex-col gap-6">
          <ProductSummary product={product} />
          <ProductOptions options={options} onChange={setOptions} />
          <FileDropzone file={artworkFile} onChange={setArtworkFile} />

          <ProductPurchase
            product={product}
            quantity={quantity}
            onQuantityChange={setQuantity}
            onAddToCart={handleAddToCart}
            onBuyNow={handleBuyNow}
          />

          <PickupInfo />
          <MoreDeals product={deal} onAdd={(item) => addItem(cartLineFrom(item), 1)} />
          <ProductAccordions product={product} />
          <RoutineRow products={routineProducts} />

          <div>
            <p className="mb-2 text-sm font-medium">{productPageCopy.payWith}</p>
            <PaymentIcons />
          </div>
        </div>
      </section>
    </>
  )
}

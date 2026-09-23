import { sequelize } from '../index.js'
import { defineCatalog } from './catalog.js'
import { defineCms } from './cms.js'
import { defineCommerce } from './commerce.js'
import { defineFacets } from './facets.js'
import { defineInventory } from './inventory.js'
import { defineMedia } from './media.js'
import { defineOrders } from './orders.js'
import { definePeople } from './people.js'

const models = {
  ...defineMedia(sequelize),
  ...defineCatalog(sequelize),
  ...defineFacets(sequelize),
  ...definePeople(sequelize),
  ...defineCommerce(sequelize),
  ...defineOrders(sequelize),
  ...defineInventory(sequelize),
  ...defineCms(sequelize),
}

const {
  MediaAsset, MediaVariant,
  Category, Collection, Product, ProductOption, ProductOptionValue, ProductVariant,
  ProductImage, ProductIngredient, CollectionProduct, ProductRoutineProduct,
  VariantOptionValue,
  Facet, FacetValue, ProductFacetValue, QuizQuestion, QuizAnswer, QuizAnswerValue,
  Customer, Address, AdminUser, RefreshToken, AuditLog,
  Courier, DeliveryMethod, PaymentMethod,
  Order, OrderItem, OrderStatusEvent, Payment,
  InventoryHold, InventoryMove, DiscountCode, DiscountRedemption,
  StaticPage, PageSection, NavItem, FooterLinkGroup, FooterLink,
} = models

// --- media ---------------------------------------------------------------------------
MediaAsset.hasMany(MediaVariant, { as: 'variants', foreignKey: 'mediaId', onDelete: 'CASCADE' })
MediaVariant.belongsTo(MediaAsset, { as: 'asset', foreignKey: 'mediaId' })

// --- catalogue -----------------------------------------------------------------------
Category.hasMany(Product, { as: 'products', foreignKey: 'categoryId' })
Product.belongsTo(Category, { as: 'category', foreignKey: 'categoryId' })

Product.belongsTo(MediaAsset, { as: 'primaryImage', foreignKey: 'primaryImageId' })
Collection.belongsTo(MediaAsset, { as: 'image', foreignKey: 'mediaId' })
Category.belongsTo(MediaAsset, { as: 'image', foreignKey: 'mediaId' })

Product.hasMany(ProductImage, { as: 'images', foreignKey: 'productId', onDelete: 'CASCADE' })
ProductImage.belongsTo(Product, { foreignKey: 'productId' })
ProductImage.belongsTo(MediaAsset, { as: 'media', foreignKey: 'mediaId' })

Product.hasMany(ProductIngredient, {
  as: 'ingredients',
  foreignKey: 'productId',
  onDelete: 'CASCADE',
})
ProductIngredient.belongsTo(Product, { foreignKey: 'productId' })

Product.hasMany(ProductOption, { as: 'options', foreignKey: 'productId', onDelete: 'CASCADE' })
ProductOption.belongsTo(Product, { foreignKey: 'productId' })
ProductOption.hasMany(ProductOptionValue, {
  as: 'values',
  foreignKey: 'optionId',
  onDelete: 'CASCADE',
})
ProductOptionValue.belongsTo(ProductOption, { as: 'option', foreignKey: 'optionId' })

Product.hasMany(ProductVariant, { as: 'variants', foreignKey: 'productId', onDelete: 'CASCADE' })
ProductVariant.belongsTo(Product, { as: 'product', foreignKey: 'productId' })
ProductVariant.belongsTo(MediaAsset, { as: 'image', foreignKey: 'mediaId' })

ProductVariant.belongsToMany(ProductOptionValue, {
  as: 'optionValues',
  through: VariantOptionValue,
  foreignKey: 'variantId',
  otherKey: 'optionValueId',
})
ProductOptionValue.belongsToMany(ProductVariant, {
  as: 'variants',
  through: VariantOptionValue,
  foreignKey: 'optionValueId',
  otherKey: 'variantId',
})

Product.belongsToMany(Collection, {
  as: 'collections',
  through: CollectionProduct,
  foreignKey: 'productId',
  otherKey: 'collectionId',
})
Collection.belongsToMany(Product, {
  as: 'products',
  through: CollectionProduct,
  foreignKey: 'collectionId',
  otherKey: 'productId',
})

// product.routineWith - a self-referencing many-to-many. The alias has to differ from
// the foreign key or Sequelize cannot tell the two sides apart.
Product.belongsToMany(Product, {
  as: 'routineProducts',
  through: ProductRoutineProduct,
  foreignKey: 'productId',
  otherKey: 'relatedProductId',
})

// --- facets --------------------------------------------------------------------------
Facet.hasMany(FacetValue, { as: 'values', foreignKey: 'facetId', onDelete: 'CASCADE' })
FacetValue.belongsTo(Facet, { as: 'facet', foreignKey: 'facetId' })

Product.belongsToMany(FacetValue, {
  as: 'facetValues',
  through: ProductFacetValue,
  foreignKey: 'productId',
  otherKey: 'facetValueId',
})
FacetValue.belongsToMany(Product, {
  as: 'products',
  through: ProductFacetValue,
  foreignKey: 'facetValueId',
  otherKey: 'productId',
})

QuizQuestion.belongsTo(Facet, { as: 'facet', foreignKey: 'facetId' })
QuizQuestion.hasMany(QuizAnswer, { as: 'answers', foreignKey: 'questionId', onDelete: 'CASCADE' })
QuizAnswer.belongsTo(QuizQuestion, { as: 'question', foreignKey: 'questionId' })
QuizAnswer.belongsToMany(FacetValue, {
  as: 'facetValues',
  through: QuizAnswerValue,
  foreignKey: 'answerId',
  otherKey: 'facetValueId',
})

// --- people --------------------------------------------------------------------------
Customer.hasMany(Address, { as: 'addresses', foreignKey: 'customerId', onDelete: 'CASCADE' })
Address.belongsTo(Customer, { as: 'customer', foreignKey: 'customerId' })
AuditLog.belongsTo(AdminUser, { as: 'admin', foreignKey: 'adminUserId' })
RefreshToken.belongsTo(RefreshToken, { as: 'replacedBy', foreignKey: 'replacedById' })

// --- orders --------------------------------------------------------------------------
Customer.hasMany(Order, { as: 'orders', foreignKey: 'customerId' })
Order.belongsTo(Customer, { as: 'customer', foreignKey: 'customerId' })

Order.hasMany(OrderItem, { as: 'items', foreignKey: 'orderId', onDelete: 'CASCADE' })
OrderItem.belongsTo(Order, { as: 'order', foreignKey: 'orderId' })
OrderItem.belongsTo(Product, { as: 'product', foreignKey: 'productId' })
OrderItem.belongsTo(ProductVariant, { as: 'variant', foreignKey: 'variantId' })

Order.hasMany(OrderStatusEvent, { as: 'events', foreignKey: 'orderId', onDelete: 'CASCADE' })
OrderStatusEvent.belongsTo(Order, { as: 'order', foreignKey: 'orderId' })

Order.hasMany(Payment, { as: 'payments', foreignKey: 'orderId', onDelete: 'CASCADE' })
Payment.belongsTo(Order, { as: 'order', foreignKey: 'orderId' })
Payment.belongsTo(PaymentMethod, { as: 'method', foreignKey: 'paymentMethodId' })
Payment.belongsTo(MediaAsset, { as: 'proof', foreignKey: 'proofMediaId' })
Payment.belongsTo(AdminUser, { as: 'verifiedBy', foreignKey: 'verifiedByAdminId' })

Order.belongsTo(Courier, { as: 'courier', foreignKey: 'courierId' })
Order.belongsTo(DeliveryMethod, { as: 'deliveryMethod', foreignKey: 'deliveryMethodId' })
Order.belongsTo(PaymentMethod, { as: 'paymentMethod', foreignKey: 'paymentMethodId' })
Order.belongsTo(DiscountCode, { as: 'discount', foreignKey: 'discountId' })

// --- inventory and discounts ---------------------------------------------------------
ProductVariant.hasMany(InventoryHold, { as: 'holds', foreignKey: 'variantId', onDelete: 'CASCADE' })
InventoryHold.belongsTo(ProductVariant, { as: 'variant', foreignKey: 'variantId' })

ProductVariant.hasMany(InventoryMove, { as: 'moves', foreignKey: 'variantId', onDelete: 'CASCADE' })
InventoryMove.belongsTo(ProductVariant, { as: 'variant', foreignKey: 'variantId' })
InventoryMove.belongsTo(Order, { as: 'order', foreignKey: 'orderId' })

DiscountCode.hasMany(DiscountRedemption, {
  as: 'redemptions',
  foreignKey: 'discountId',
  onDelete: 'CASCADE',
})
DiscountRedemption.belongsTo(DiscountCode, { as: 'discount', foreignKey: 'discountId' })
DiscountRedemption.belongsTo(Order, { as: 'order', foreignKey: 'orderId' })

// --- cms -----------------------------------------------------------------------------
StaticPage.hasMany(PageSection, { as: 'sections', foreignKey: 'pageId', onDelete: 'CASCADE' })
PageSection.belongsTo(StaticPage, { as: 'page', foreignKey: 'pageId' })

NavItem.hasMany(NavItem, { as: 'children', foreignKey: 'parentId', onDelete: 'CASCADE' })
NavItem.belongsTo(NavItem, { as: 'parent', foreignKey: 'parentId' })
NavItem.belongsTo(MediaAsset, { as: 'image', foreignKey: 'mediaId' })

FooterLinkGroup.hasMany(FooterLink, { as: 'links', foreignKey: 'groupId', onDelete: 'CASCADE' })
FooterLink.belongsTo(FooterLinkGroup, { as: 'group', foreignKey: 'groupId' })

export { models, sequelize }
export default models

/**
 * GraphQL Schema Definition
 * Unified API for catalog, designs, pricing
 */

export const typeDefs = `#graphql
  type Query {
    catalog(tenantId: ID!): CatalogResponse!
    product(id: ID!, tenantId: ID!): Product
    design(id: ID!): Design
    pricingQuote(input: PricingQuoteInput!): PricingQuote!
    customerDesigns(customerId: ID, limit: Int): [Design!]!
  }

  type Mutation {
    createDesign(input: CreateDesignInput!): DesignResponse!
    updateDesign(id: ID!, input: UpdateDesignInput!): DesignResponse!
    submitDesign(id: ID!): DesignResponse!
    checkoutWithDesign(input: CheckoutInput!): CheckoutResponse!
  }

  type CatalogResponse {
    products: [Product!]!
    surfaces: [Surface!]!
    techniques: [PrintTechnique!]!
  }

  type Product {
    id: ID!
    slug: String!
    title: String!
    description: String
    shopifyProductId: String
    surfaces: [Surface!]!
    colors: [String!]
    pricing: PricingConfig
    metadata: JSON
  }

  type Surface {
    id: ID!
    name: String!
    widthMm: Float!
    heightMm: Float!
    widthPx: Int!
    heightPx: Int!
    ppi: Int!
    safeMarginMm: Float
    bleedMarginMm: Float
    note: String
  }

  type PrintTechnique {
    id: ID!
    slug: String!
    name: String!
    description: String
    rules: JSON
  }

  type PricingConfig {
    base: Float!
    perSqIn: Float!
    colorAdder: Float
    techMultipliers: JSON
    quantityBreaks: [QuantityBreak!]
  }

  type QuantityBreak {
    qty: Int!
    discountPct: Float!
  }

  type Design {
    id: ID!
    status: DesignStatus!
    snapshot: JSON!
    previewUrl: String
    productSlug: String
    surfaceId: String
    technique: String
    dimensions: Dimensions
    stats: DesignStats
    createdAt: String!
    updatedAt: String!
  }

  type Dimensions {
    widthMm: Float!
    heightMm: Float!
    widthPx: Int!
    heightPx: Int!
  }

  type DesignStats {
    areaIn2: Float!
    colorCount: Int!
    lowestImageDpi: Float
    coverage: Float
  }

  enum DesignStatus {
    DRAFT
    SUBMITTED
    APPROVED
    REJECTED
    ARCHIVED
  }

  type PricingQuote {
    unitPrice: Float!
    total: Float!
    currency: String!
    breakdown: PricingBreakdown!
    validUntil: String!
  }

  type PricingBreakdown {
    base: Float!
    areaCost: Float!
    colorCost: Float!
    techMultiplier: Float!
    quantityDiscount: Float
  }

  type DesignResponse {
    design: Design!
    errors: [String!]
  }

  type CheckoutResponse {
    designId: ID!
    checkoutUrl: String!
    cartId: String
  }

  input CreateDesignInput {
    productSlug: String!
    surfaceId: ID!
    technique: String!
    color: String
    items: JSON!
    previewUrl: String
  }

  input UpdateDesignInput {
    items: JSON
    previewUrl: String
    technique: String
    color: String
  }

  input PricingQuoteInput {
    productSlug: String!
    surfaceId: ID!
    technique: String!
    quantity: Int!
    areaIn2: Float!
    colorCount: Int!
  }

  input CheckoutInput {
    designId: ID
    designSnapshot: JSON
    productGid: String!
    variantId: String
    quantity: Int!
    previewUrl: String
    returnUrl: String
  }

  scalar JSON
`;


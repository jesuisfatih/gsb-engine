const fetch = (...args) => import("node-fetch").then(({default: fetch}) => fetch(...args));


const MOCK_SHOPIFY_PRODUCTS = [
  {
    id: "gid://shopify/Product/1",
    title: "Premium Tee",
    handle: "premium-tee",
    options: ["Color", "Size"],
    variants: [
      { id: "gid://shopify/ProductVariant/1001", title: "White / M", sku: "TEE-WHM", price: "29.90", options: { Color: "White", Size: "M" } },
      { id: "gid://shopify/ProductVariant/1002", title: "White / L", sku: "TEE-WHL", price: "29.90", options: { Color: "White", Size: "L" } },
      { id: "gid://shopify/ProductVariant/1003", title: "Black / M", sku: "TEE-BKM", price: "29.90", options: { Color: "Black", Size: "M" } },
    ],
  },
  {
    id: "gid://shopify/Product/2",
    title: "Ceramic Mug 11oz",
    handle: "ceramic-mug-11oz",
    options: ["Color"],
    variants: [
      { id: "gid://shopify/ProductVariant/2001", title: "White", sku: "MUG-WHT", price: "19.90", options: { Color: "White" } },
      { id: "gid://shopify/ProductVariant/2002", title: "Black", sku: "MUG-BLK", price: "19.90", options: { Color: "Black" } },
    ],
  },
  {
    id: "gid://shopify/Product/3",
    title: "Tote Bag",
    handle: "canvas-tote",
    options: ["Color"],
    variants: [
      { id: "gid://shopify/ProductVariant/3001", title: "Natural", sku: "TOTE-NAT", price: "24.90", options: { Color: "Natural" } },
      { id: "gid://shopify/ProductVariant/3002", title: "Black", sku: "TOTE-BLK", price: "24.90", options: { Color: "Black" } },
    ],
  },
];

async function shopifyGraphQL(query, variables = {}) {
  const store = process.env.SHOPIFY_STORE;           // my-shop.myshopify.com
  const token = process.env.SHOPIFY_TOKEN;           // Admin API access token
  const url = `https://${store}/admin/api/2024-07/graphql.json`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type":"application/json", "X-Shopify-Access-Token": token },
    body: JSON.stringify({ query, variables })
  });
  const j = await r.json();
  if (j.errors) throw new Error(JSON.stringify(j.errors));
  return j;
}

exports.createProduct = async function(req, res) {
  try {
    const { title, description, price, imageDataUrl, options } = req.body;
    const q = `
      mutation CreateProduct($title: String!, $desc: String, $price: Money!) {
        productCreate(input: {
          title: $title, descriptionHtml: $desc,
          variants: [{ price: $price }]
        }) {
          product { id title }
          userErrors { field message }
        }
      }`;
    const out = await shopifyGraphQL(q, { title, desc: description || "", price });
    // görsel eklemek için ayrı mutation da atılabilir
    res.json(out);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}

// Stubbed cart add via App Proxy-like endpoint.
// In MVP we just echo back with a server-generated id and timestamp.
exports.cartAdd = async function(req, res) {
  try {
    const body = req.body || {};
    const id = Math.random().toString(36).slice(2, 10);
    const at = new Date().toISOString();
    res.json({ ok: true, id, at, received: body });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}

exports.listProducts = function(_req, res) {
  const payload = MOCK_SHOPIFY_PRODUCTS.map(p => ({
    id: p.id,
    title: p.title,
    handle: p.handle,
    options: p.options,
    variantsCount: p.variants.length,
  }));
  res.json(payload);
};

exports.listVariants = function(req, res) {
  const id = req.params.id;
  const product = MOCK_SHOPIFY_PRODUCTS.find(p => p.id === id);
  if (!product) return res.json([]);
  res.json(product.variants.map(v => ({
    id: v.id,
    title: v.title,
    sku: v.sku,
    price: v.price,
    options: v.options,
  })));
};

# Checkout Design Preview Extension

Shopify Checkout UI Extension that displays custom design previews during checkout.

## Features

- ✅ Design preview image in checkout
- ✅ Design specifications (dimensions, technique, colors, DPI)
- ✅ Edit design button (opens editor in new tab)
- ✅ Download preview button
- ✅ Quality warnings (low DPI alerts)
- ✅ Success confirmation banner
- ✅ Configurable via theme settings

## Installation

1. Install dependencies:
```bash
cd extensions/checkout-design-preview
npm install
```

2. Development mode:
```bash
npm run dev
```

3. Deploy to Shopify:
```bash
npm run deploy
```

4. Activate in Shopify Admin:
- Go to: Settings → Checkout → Checkout editor
- Add "Design Preview" block
- Configure settings
- Save

## Configuration

Extension settings (configurable in Shopify Admin):

- **Title**: Section heading text
- **Show Dimensions**: Display design specifications
- **Show Edit Button**: Enable design editing from checkout
- **Show Download Button**: Allow preview download

## How It Works

1. Extension reads cart line items
2. Extracts design metadata from line item properties:
   - Design ID
   - Preview URL
   - Surface name
   - Dimensions
   - Technique
   - Color count
   - Min DPI
3. Displays preview with specs
4. Provides action buttons (edit, download)
5. Shows quality warnings if needed

## Line Item Properties Required

For this extension to work, ensure your cart API includes these properties:

```javascript
{
  "Design ID": "abc-123-uuid",
  "Preview URL": "data:image/png;base64,...",
  "Surface Label": "20x30 cm",
  "Sheet Size (mm)": "200 × 300",
  "Print Technique": "DTF",
  "Color Count": "5",
  "Min DPI": "366",
  "Return URL": "https://app.gsb-engine.dev/editor?id=..."
}
```

## Development

- Built with React 18
- Uses Shopify UI Extensions React API
- TypeScript for type safety
- Follows Shopify Polaris design system

## Support

For issues or questions, contact: support@gsb-engine.dev


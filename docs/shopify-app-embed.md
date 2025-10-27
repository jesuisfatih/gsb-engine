# Shopify Theme & App Embed Integration

Use these assets to render the responsive `gsb-shortcode` button inside a Shopify storefront. The guide covers both Online Store 2.0 app-embed blocks and legacy snippet injection.

## 1. Files included

Path | Description
---- | -----------
`shopify/snippets/gsb-app-embed.liquid` | Theme App Embed entry point; renders the placeholder and loads `gsb-shortcode.js`.
`shopify/snippets/gsb-product-button.liquid` | Optional legacy snippet that replaces the standard “Add to cart” button.

Copy these snippets into your theme. They assume your app serves `gsb-shortcode.js` at `/gsb-shortcode.js` and exposes shortcode records via `/api/embed/shortcodes`.

## 2. App Embed workflow (recommended)

1. In Shopify admin, go to **Online Store → Themes** and choose **Edit code**.
2. Create `snippets/gsb-app-embed.liquid` in the theme and paste the snippet from this repo.
3. In your app extension (`app/extensions/<extension-name>/blocks/`), render the snippet:
   ```liquid
   {% render 'gsb-app-embed', button_label: block.settings.button_label, button_color: block.settings.button_color, shortcode_handle: block.settings.shortcode_handle %}
   ```
4. Expose block settings for button label, colors, shortcode handle, open mode, etc.
5. In the theme customizer, enable the Gang Sheet Builder app embed wherever the button should appear (product page, collection page, etc.).

The snippet injects `<div data-gsb-shortcode>` and loads the public script. The script transforms the placeholder into the responsive button.

## 3. Legacy snippet fallback

If you cannot use an app embed:

1. Create `snippets/gsb-product-button.liquid`.
2. In `sections/main-product.liquid` (or the theme’s product section), replace the standard “Add to cart” button with:
   ```liquid
   {% render 'gsb-product-button', product: product %}
   ```
3. The snippet falls back to the default buy-buttons component when no shortcode is mapped, so existing products continue to work.

## 4. Dataset overrides

The snippet forwards several attributes to `gsb-shortcode.js`. You can override them per block or via metafields.

Attribute | Purpose
--------- | -------
`data-editor-url` | URL of the hosted editor (defaults to `/editor`).
`data-api-url` | REST endpoint for shortcode lookup (defaults to `/api/embed/shortcodes`).
`data-button-label` | Button text.
`data-button-bg`, `data-button-color` | Background/text colours.
`data-button-variant` | `pill`, `rounded`, or `square`.
`data-button-size` | `sm`, `md`, or `lg`.
`data-button-icon` | Optional glyph (emoji or short text).
`data-open-mode` | `navigate` (same tab) or `popup`.

Example:
```liquid
<div
  data-gsb-shortcode="{{ product.metafields.gsb.shortcode }}"
  data-button-label="{{ block.settings.button_label }}"
  data-button-bg="{{ block.settings.button_color }}"
  data-open-mode="{{ block.settings.open_mode }}"
>
</div>
```

## 5. Merchant rollout summary

1. Configure product shortcodes inside the app’s Merchant portal.
2. Enable the Gang Sheet Builder embed (or insert the legacy snippet) in the theme editor.
3. Map shortcode handles to the desired products (through block settings or metafields).
4. Publish the theme changes. Customers will see the “Edit design” button that opens the editor with the correct shortcode context.

## 6. Troubleshooting

Issue | Fix
----- | ---
Button shows but does nothing | Ensure the shortcode exists and `/api/embed/shortcodes/:handle` returns 200. Check browser console logs.
Styling looks wrong | Verify `data-button-*` overrides or provide custom class via the snippet.
Wrong product opens | Confirm the shortcode record targets the correct product/variant and the theme passes the right handle.

Update this document whenever `gsb-shortcode.js` or the embed API changes.

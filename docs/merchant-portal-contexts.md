# Merchant Portal Contexts (HTML Drafts & Workflows)

Below are 15 context modules for the merchant-facing portal. Each includes a short HTML wireframe snippet and describes how it ties into the Shopify product → shortcode → editor → cart handoff flow.

1. **Dashboard Overview**
```html
<section class="card">
  <h2>Production Snapshot</h2>
  <ul class="metrics">
    <li><span class="label">Pending DTF Orders</span><span class="value">8</span></li>
    <li><span class="label">Gang Sheets Ready</span><span class="value">3</span></li>
    <li><span class="label">Average Turnaround</span><span class="value">2.1 days</span></li>
  </ul>
</section>
```
*Shows live counts from jobs & gang sheet tables; merchants quickly gauge workload.*

2. **Product Catalog Linker**
```html
<section class="card">
  <h2>Link Shopify Product</h2>
  <label>Choose product</label>
  <select id="shopify-product-selector">
    <option value="gid://shopify/Product/123">Premium T‑Shirt</option>
  </select>
  <label>DTF Template</label>
  <select id="dtf-template-selector">
    <option value="tshirt-front">T‑Shirt Front (DTF)</option>
  </select>
  <button type="button">Generate Shortcode</button>
</section>
```
*Generates shortcode mapping Shopify product to editor surface; persisted via catalog API.*

3. **Shortcode Result Modal**
```html
<div class="modal">
  <header><h3>Embed Code</h3></header>
  <code>&lt;div data-gsb-shortcode="dtf:tshirt-front:tenant123"&gt;&lt;/div&gt;</code>
  <p>Paste on the Shopify product page template to enable customization.</p>
</div>
```
*Displays generated shortcode plus copy instructions.*

4. **Template Library Manager**
```html
<section class="grid">
  <article class="template-card">
    <img src="/previews/template001.png" alt="Summer Promo Tee">
    <h3>Summer Promo Tee</h3>
    <p>Targets: T‑Shirt Front | Default DTF</p>
    <button>Edit</button>
    <button>Publish</button>
  </article>
</section>
```
*CRUD for templates stored in Prisma `templates` table.*

5. **Template Edit Sidebar**
```html
<aside class="panel">
  <h4>Template Details</h4>
  <label>Name</label><input value="Summer Promo Tee">
  <label>Print Technique</label><select><option>DTF</option></select>
  <label>Tag</label><input placeholder="e.g. seasonal">
  <button>Save Draft</button>
</aside>
```
*Autosaves template metadata; publish pushes to live library.*

6. **DTF Order Queue**
```html
<table class="data-table">
  <thead><tr><th>Order</th><th>Design</th><th>Status</th><th>Actions</th></tr></thead>
  <tbody>
    <tr>
      <td>#10245</td>
      <td><a href="/editor?design=abc123">View Design</a></td>
      <td><span class="badge badge--warning">Awaiting Approval</span></td>
      <td><button>Approve</button><button>Reject</button></td>
    </tr>
  </tbody>
</table>
```
*Links to editor using design ID; approval transitions status from `SUBMITTED` to `APPROVED`.*

7. **Gang Sheet Batch Board**
```html
<div class="kanban">
  <div class="column">
    <h3>Draft</h3>
    <article class="sheet-card">Sheet #GS-120<br><small>Utilization 62%</small></article>
  </div>
  <div class="column">
    <h3>Ready</h3>
    <article class="sheet-card highlighted">Sheet #GS-121</article>
  </div>
</div>
```
*Displays gang sheets by status; clicking opens editor in gang mode.*

8. **Pricing Rule Wizard**
```html
<form class="card">
  <h2>DTF Pricing</h2>
  <label>Base Rate ($)</label><input type="number" step="0.01">
  <label>Area Rate ($/sq in)</label><input type="number" step="0.01">
  <label>Quantity Breaks</label>
  <div class="row">
    <input type="number" placeholder="Qty">
    <input type="number" placeholder="% Discount">
  </div>
  <button>Save Rule</button>
</form>
```
*Writes to `pricing_rules` table for tenant-specific pricing engine.*

9. **Supplier Routing Matrix**
```html
<table class="data-table">
  <thead><tr><th>Technique</th><th>Region</th><th>Default Supplier</th></tr></thead>
  <tbody>
    <tr><td>DTF</td><td>NA</td><td>
      <select><option>PrintHouse LA</option><option>Rapid DTF</option></select>
    </td></tr>
  </tbody>
</table>
```
*Updates `supplier_profiles` preferences per tenant.*

10. **Shortcode Activity Log**
```html
<section class="card">
  <h2>Embed Usage</h2>
  <ul class="log">
    <li><time>09:45</time> Shortcode `dtf:tshirt-front` rendered on /products/premium-tshirt</li>
  </ul>
</section>
```
*Captures CDN logs or frontend pings to monitor embed usage.*

11. **Mockup Preview Center**
```html
<div class="preview-grid">
  <figure>
    <img src="/previews/mockup-10245-2d.png" alt="">
    <figcaption>2D Mockup</figcaption>
  </figure>
  <figure>
    <img src="/previews/mockup-10245-3d.gif" alt="">
    <figcaption>3D Spin</figcaption>
  </figure>
</div>
```
*Shows assets generated during autosave or submission.*

12. **Autosave Recovery Prompt**
```html
<div class="alert">
  <h4>Resume Draft?</h4>
  <p>We found an autosaved version from 10:14 AM for design #abc123.</p>
  <button>Resume Editing</button>
  <button class="ghost">Discard Autosave</button>
</div>
```
*Displayed when autosave snapshot is newer than committed snapshot.*

13. **Customer Support Module**
```html
<section class="card">
  <h2>Customer Issues</h2>
  <article class="ticket">
    <header>Order #10240 – Alignment Concern</header>
    <p>Customer uploaded low-resolution art. Suggested re-upload.</p>
    <button>Mark Resolved</button>
  </article>
</section>
```
*Ties into audit log entries or support tickets for quick resolution.*

14. **Analytics – Template Performance**
```html
<section class="card">
  <h2>Template Conversions</h2>
  <table class="data-table">
    <thead><tr><th>Template</th><th>Views</th><th>Add-to-Cart</th><th>Conversion</th></tr></thead>
    <tbody>
      <tr><td>Summer Promo Tee</td><td>512</td><td>132</td><td>25.8%</td></tr>
    </tbody>
  </table>
</section>
```
*Aggregates stats from `design_documents` and orders.*

15. **Checkout Redirect Config**
```html
<form class="card">
  <h2>Checkout Mapping</h2>
  <label>Shopify App Proxy URL</label><input value="/apps/gsb-proxy">
  <label>Cart Redirect</label><input value="/cart?design={{designId}}">
  <button>Save</button>
</form>
```
*Defines where the editor sends the user after saving (cart or checkout).*

These modules, when implemented, will provide merchants with end-to-end control: product mapping, shortcode distribution, design management, production routing, and analytics.

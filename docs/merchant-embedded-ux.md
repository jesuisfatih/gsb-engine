# Merchant Embedded Shopify UI – Layout Notes

## Variant Mapping Workspace

- **Header block**: Polaris card header with title, contextual helper text, and a `ButtonGroup` hosting _Upload CSV_, _Auto match_, and _Export_ actions. These afford bulk updates without overwhelming the row controls.
- **Filtering rail**: Horizontal filter bar immediately beneath the header. Includes a segmented control for _Status_ (Linked/Pending/Missing), a surface selector (front/back/pocket etc.), and a search input targeting product or variant titles. Filters use Polaris badge-style pills so merchants can quickly see the active constraints.
- **Resource list body**: Each row mirrors Polaris `ResourceItem` styling. Leading column stacks product + variant subtitles; trailing columns hold two compact `Select` fields (Surface, Technique) and a status pill. Inline validation (e.g. missing technique) raises a critical badge next to the select. A final column hosts an overflow `Button` with row-level actions (Duplicate mapping, Remove mapping).
- **Bulk footer**: Sticky footer bar with a checkbox showing the current multi-select count, bulk actions (Assign surface, Set technique, Mark linked), and a `PrimaryButton` for “Apply changes”. This mirrors Polaris list pattern and encourages batching edits before saving.
- **Progress summary**: Right-aligned top corner shows “Linked 18 / 24” using Polaris badge tone green vs. amber, reinforcing completion feedback while merchants map variants.

**Why this works**: Merchants typically work through many variants per product; the resource-list layout keeps everything inline while the footer supports batch edits. Adhering to Polaris spacing (16–20 px gutters, subdued text for secondary info) makes the tool feel native to Shopify’s admin and reduces cognitive load during repetitive operations.

## Webhook Health Widget

- **Card header**: Displays overall health badge (“All endpoints healthy” / “Retries detected”) with a `PlainButton` for “View logs”. The badge tone changes based on worst status, reflecting Shopify’s status indicators.
- **Endpoint stack**: Each webhook topic is rendered as a collapsible row:
  - Left column: checkbox toggle (enabled/disabled), topic label, and the delivery URL in monospace subdued text.
  - Right column: `Select` for status override (Connected/Retrying/Failed) plus a status pill. When status ≠ connected, a secondary pill shows `Retries (n)` or `Last 4xx` for quick triage.
  - Collapse content: shows last 5 delivery timestamps as a timeline with status icons (green check, amber clock, red x) and a link to retry. Matches Polaris “Index table + collapsibles” language.
- **Empty/failed states**: If webhooks are disabled, show Polaris empty state with an illustration, headline “Webhooks not connected”, and primary action “Enable all webhooks” to guide merchants.

**UX Rationale**: Production teams watch webhook health closely; surfacing retries inline with the toggle avoids drilling into logs. The collapsible timeline keeps noise hidden while offering fast audits when something fails. Visual hierarchy follows Polaris (bold for primary info, subdued metadata), keeping the embedded page consistent with Shopify admin expectations.

## Guiding Principles

1. **Polaris spacing & typography** – 16 px padding blocks, 12 px for subdued sections, uppercase microcopy for meta labels. This ensures the embedded app doesn’t feel alien beside Shopify’s native UI.
2. **Batch-first workflows** – Merchants often map entire catalogs or fix multiple webhooks; providing bulk actions and sticky footers reduces click fatigue.
3. **Inline feedback** – Status pills, error text, and subdued helper copy all live near their inputs, so users never search for feedback. Red tones only appear for blocking issues, matching Polaris severity.
4. **Progress transparency** – Every panel surfaces completion metrics or latest timestamps. Merchants know immediately whether mapping or webhook setup is complete, aligning with their need to validate onboarding quickly.

These patterns keep the merchant onboarding journey predictable, reduce friction during variant mapping and webhook validation, and align closely with Shopify’s Polaris design system for a cohesive embedded-app experience.

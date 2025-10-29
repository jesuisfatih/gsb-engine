/**
 * GSB Shortcode Button Loader
 * Transforms <div data-gsb-shortcode="..."> placeholders into interactive customize buttons
 * that open the editor with the appropriate product/surface configuration.
 *
 * Usage: <script src="/gsb-shortcode.js" defer></script>
 */

(function () {
  'use strict';

  // Configuration from script tag data attributes or defaults
  const script = document.currentScript || document.querySelector('script[src*="gsb-shortcode"]');
  const config = {
    editorUrl: script?.dataset?.editorUrl || '/editor',
    apiUrl: script?.dataset?.apiUrl || '/api/embed/shortcodes',
    mappingUrl: script?.dataset?.mappingUrl || '/api/embed/catalog/mappings',
    buttonLabel: script?.dataset?.buttonLabel || 'Customize & Add to cart',
    buttonClass: script?.dataset?.buttonClass || '',
    buttonBg: script?.dataset?.buttonBg || '#4c1d95',
    buttonColor: script?.dataset?.buttonColor || '#ffffff',
    openMode: script?.dataset?.openMode || 'navigate', // 'navigate' | 'popup'
  };

  // Shortcode cache to avoid redundant API calls
  const shortcodeCache = new Map();
  const productMappingCache = new Map();

  /**
   * Fetch shortcode data from API
   */
  async function fetchShortcode(handle) {
    if (shortcodeCache.has(handle)) {
      return shortcodeCache.get(handle);
    }

    try {
      const response = await fetch(`${config.apiUrl}?handle=${encodeURIComponent(handle)}`);
      if (!response.ok) {
        console.warn(`[GSB] Shortcode not found: ${handle}`);
        return null;
      }

      const data = await response.json();
      const shortcode = data.data || data;
      shortcodeCache.set(handle, shortcode);
      return shortcode;
    } catch (error) {
      console.error('[GSB] Error fetching shortcode:', error);
      return null;
    }
  }

  /**
   * Fetch product mapping for Shopify product/variant
   */
  async function fetchProductMapping(shopifyProductId, shopifyVariantId) {
    const cacheKey = `${shopifyProductId}:${shopifyVariantId}`;
    if (productMappingCache.has(cacheKey)) {
      return productMappingCache.get(cacheKey);
    }

    try {
      const params = new URLSearchParams();
      if (shopifyProductId) params.append('shopifyProductId', shopifyProductId);
      if (shopifyVariantId) params.append('shopifyVariantId', shopifyVariantId);

      const response = await fetch(`${config.mappingUrl}?${params}`);
      if (!response.ok) {
        console.warn('[GSB] No mapping found for product/variant');
        return null;
      }

      const data = await response.json();
      const mapping = data.data || data;
      productMappingCache.set(cacheKey, mapping);
      return mapping;
    } catch (error) {
      console.error('[GSB] Error fetching product mapping:', error);
      return null;
    }
  }

  /**
   * Build editor URL with query params
   */
  function buildEditorUrl(shortcode, element) {
    const params = new URLSearchParams();

    // From shortcode
    if (shortcode) {
      if (shortcode.productSlug) params.append('product', shortcode.productSlug);
      if (shortcode.surfaceId) params.append('surface', shortcode.surfaceId);
      if (shortcode.technique) params.append('technique', shortcode.technique);
      if (shortcode.color) params.append('color', shortcode.color);
      if (shortcode.material) params.append('material', shortcode.material);
    }

    // From element data attributes
    const shopifyProductGid = element.dataset.gsbProductGid;
    const shopifyVariantId = element.dataset.gsbVariantId;
    const returnTo = element.dataset.gsbReturnTo || window.location.href;

    if (shopifyProductGid) params.append('shopifyProduct', shopifyProductGid);
    if (shopifyVariantId) params.append('shopifyVariant', shopifyVariantId);
    if (returnTo) params.append('returnTo', returnTo);

    return `${config.editorUrl}?${params}`;
  }

  /**
   * Create customize button
   */
  function createButton(element, shortcode) {
    const button = document.createElement('button');
    button.type = 'button';
    button.classList.add('gsb-customize-button');

    // Apply custom classes
    if (config.buttonClass) {
      config.buttonClass.split(' ').forEach(cls => button.classList.add(cls));
    }

    // Button label (can be overridden per element)
    const label = element.dataset.buttonLabel || config.buttonLabel;
    button.textContent = label;

    // Button icon (optional)
    const icon = element.dataset.buttonIcon;
    if (icon) {
      const iconEl = document.createElement('span');
      iconEl.classList.add('gsb-button-icon');
      iconEl.textContent = icon;
      button.prepend(iconEl);
    }

    // Apply inline styles (if no custom class)
    if (!config.buttonClass) {
      const bg = element.dataset.buttonBg || config.buttonBg;
      const color = element.dataset.buttonColor || config.buttonColor;
      const variant = element.dataset.buttonVariant || 'pill';
      const size = element.dataset.buttonSize || 'md';
      const shadow = element.dataset.buttonShadow || '';

      button.style.cssText = `
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        padding: ${size === 'sm' ? '0.5rem 1rem' : size === 'lg' ? '0.875rem 2rem' : '0.75rem 1.5rem'};
        font-size: ${size === 'sm' ? '0.875rem' : size === 'lg' ? '1.125rem' : '1rem'};
        font-weight: 600;
        line-height: 1.5;
        color: ${color};
        background-color: ${bg};
        border: none;
        border-radius: ${variant === 'pill' ? '9999px' : variant === 'rounded' ? '0.375rem' : '0'};
        cursor: pointer;
        transition: all 0.2s ease;
        ${shadow ? `box-shadow: ${shadow};` : ''}
        width: ${element.dataset.mobileFullWidth === 'true' ? '100%' : 'auto'};
      `;

      // Hover effect
      button.addEventListener('mouseenter', () => {
        button.style.opacity = '0.9';
        button.style.transform = 'translateY(-1px)';
      });
      button.addEventListener('mouseleave', () => {
        button.style.opacity = '1';
        button.style.transform = 'translateY(0)';
      });
    }

    // Click handler
    const openMode = element.dataset.openMode || config.openMode;
    const editorUrl = buildEditorUrl(shortcode, element);

    button.addEventListener('click', (e) => {
      e.preventDefault();

      if (openMode === 'popup') {
        const width = 1200;
        const height = 800;
        const left = (screen.width - width) / 2;
        const top = (screen.height - height) / 2;
        window.open(
          editorUrl,
          'gsb-editor',
          `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
        );
      } else {
        window.location.href = editorUrl;
      }
    });

    return button;
  }

  /**
   * Process a single shortcode placeholder
   */
  async function processElement(element) {
    // Skip if already processed
    if (element.dataset.gsbProcessed === 'true') {
      return;
    }

    element.dataset.gsbProcessed = 'true';

    // Get shortcode handle
    const handle = element.dataset.gsbShortcode;
    const shopifyProductGid = element.dataset.gsbProductGid;
    const shopifyVariantId = element.dataset.gsbVariantId;

    let shortcode = null;

    // Fetch shortcode data if handle provided
    if (handle) {
      shortcode = await fetchShortcode(handle);
    }

    // Fallback: try to find mapping via Shopify product/variant
    if (!shortcode && (shopifyProductGid || shopifyVariantId)) {
      const mapping = await fetchProductMapping(shopifyProductGid, shopifyVariantId);
      if (mapping) {
        shortcode = {
          productSlug: mapping.productSlug,
          surfaceId: mapping.surfaceId,
          technique: mapping.technique,
          color: mapping.color,
          material: mapping.material,
        };
      }
    }

    // If still no shortcode/mapping, show fallback or hide
    if (!shortcode) {
      const fallbackHandle = element.dataset.fallbackShortcode;
      if (fallbackHandle) {
        shortcode = await fetchShortcode(fallbackHandle);
      }
      if (!shortcode) {
        // No shortcode found - hide element or show fallback cart button
        element.style.display = 'none';
        console.warn('[GSB] No shortcode or mapping found for element:', element);
        return;
      }
    }

    // Create and insert button
    const button = createButton(element, shortcode);
    element.innerHTML = '';
    element.appendChild(button);

    // Hide standard cart button if requested
    if (element.dataset.hideCartButton === 'true') {
      const cartButtonSelectors = [
        'button[name="add"]',
        '.product-form__submit',
        '[type="submit"][name="add"]',
        '.btn--add-to-cart',
      ];

      for (const selector of cartButtonSelectors) {
        const cartButton = element.closest('form, .product-form')?.querySelector(selector);
        if (cartButton) {
          cartButton.style.display = 'none';
        }
      }
    }
  }

  /**
   * Initialize all shortcode placeholders
   */
  function init() {
    const elements = document.querySelectorAll('[data-gsb-shortcode]');
    elements.forEach(processElement);

    // Watch for dynamically added elements (e.g., AJAX-loaded products)
    if (typeof MutationObserver !== 'undefined') {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1) { // Element node
              if (node.hasAttribute?.('data-gsb-shortcode')) {
                processElement(node);
              }
              // Check children
              const children = node.querySelectorAll?.('[data-gsb-shortcode]');
              children?.forEach(processElement);
            }
          });
        });
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose API for manual initialization
  window.GSB = {
    init,
    processElement,
    config,
  };
})();

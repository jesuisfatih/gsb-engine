(function() {
  const ATTR = "data-gsb-shortcode";
  const script = document.currentScript;
  const dataset = script ? script.dataset : {};
  const editorUrl = dataset.editorUrl || "/editor";
  const apiBase = dataset.apiUrl || "/api/embed/shortcodes";
  const mappingBase = dataset.mappingUrl || "/api/embed/catalog/mappings";
  const buttonLabel = dataset.buttonLabel || "Edit design";
  const buttonClass = dataset.buttonClass || "";
  const buttonBg = dataset.buttonBg || "#4c1d95";
  const buttonColor = dataset.buttonColor || "#ffffff";
  const buttonVariant = (dataset.buttonVariant || "pill").toLowerCase();
  const buttonSize = (dataset.buttonSize || "md").toLowerCase();
  const buttonIcon = dataset.buttonIcon || "";
  const buttonIconPosition = (dataset.buttonIconPosition || "left").toLowerCase();
  const buttonShadow = dataset.buttonShadow || "";
  const fullWidth = dataset.buttonFullWidth === "true";
  const mobileFullWidth = dataset.mobileFullWidth !== "false";
  const mobileBreakpoint = parseInt(dataset.mobileBreakpoint || "640", 10);
  const openMode = dataset.openMode || "navigate";
  const logApiBase = dataset.logUrl || apiBase;

  const mappingCache = new Map();
  const shortcodeCache = new Map();
  const stateMap = new WeakMap();

  function toAbsolute(url) {
    if (!url) return "";
    if (/^https?:/i.test(url)) return url;
    if (url.startsWith("//")) return window.location.protocol + url;
    if (url.startsWith("/")) return window.location.origin + url;
    return `${window.location.origin}/${url.replace(/^\\//, "")}`;
  }

  function trimHandle(value) {
    if (!value) return null;
    const trimmed = String(value).trim();
    return trimmed.length ? trimmed.toLowerCase() : null;
  }

  function normaliseVariantId(value) {
    if (!value) return null;
    const raw = String(value).trim();
    if (!raw) return null;
    if (raw.startsWith("gid://")) return raw;
    const numeric = raw.replace(/[^\d]/g, "");
    if (!numeric) return null;
    return `gid://shopify/ProductVariant/${numeric}`;
  }

  function cleanEndpoint(base, suffix) {
    const absolute = toAbsolute(base || "");
    const trimmed = absolute.endsWith("/") ? absolute.slice(0, -1) : absolute;
    return `${trimmed}/${suffix}`;
  }

  function sizeConfig() {
    switch (buttonSize) {
      case "sm":
        return { padding: "8px 12px", fontSize: "0.875rem" };
      case "lg":
        return { padding: "14px 24px", fontSize: "1.05rem" };
      default:
        return { padding: "12px 18px", fontSize: "1rem" };
    }
  }

  function borderRadiusConfig() {
    switch (buttonVariant) {
      case "square":
        return "8px";
      case "rounded":
        return "16px";
      case "pill":
      default:
        return "999px";
    }
  }

  function shouldFullWidth(container) {
    if (fullWidth) return true;
    if (!container) return false;
    const containerWidth = container.offsetWidth;
    if (containerWidth && containerWidth < 180) return true;
    if (mobileFullWidth && typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia(`(max-width: ${mobileBreakpoint || 640}px)`).matches;
    }
    return false;
  }

  function applyResponsiveWidth(btn, container) {
    const isFull = shouldFullWidth(container);
    if (isFull) {
      btn.style.width = "100%";
      btn.style.display = "flex";
    } else if (!fullWidth) {
      btn.style.width = "auto";
    }
  }

  function logFailure(handle, details) {
    const targetHandle = handle || "unknown";
    try {
      const endpoint = cleanEndpoint(logApiBase, `${encodeURIComponent(targetHandle)}/log`);
      const payload = JSON.stringify({
        status: "error",
        errorCode: details && details.code ? String(details.code) : undefined,
        errorMessage: details && details.message ? String(details.message).slice(0, 500) : undefined,
        meta: details && details.meta ? details.meta : undefined,
      });
      if (navigator.sendBeacon) {
        const blob = new Blob([payload], { type: "application/json" });
        navigator.sendBeacon(endpoint, blob);
      } else {
        fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
          credentials: "include",
        }).catch(() => {});
      }
    } catch (loggingError) {
      if (typeof console !== "undefined") {
        console.warn("[gsb-shortcode] failed to record error", loggingError);
      }
    }
  }

  function createButton(container, context) {
    const { handle, variantId, mapping } = context;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.dataset.gsbHandle = handle;
    if (variantId) btn.dataset.gsbVariantId = variantId;

    if (buttonClass) {
      btn.className = buttonClass;
      btn.textContent = buttonLabel;
    } else {
      const config = sizeConfig();
      btn.textContent = "";
      btn.style.padding = config.padding;
      btn.style.borderRadius = borderRadiusConfig();
      btn.style.border = "none";
      btn.style.background = buttonBg;
      btn.style.color = buttonColor;
      btn.style.fontFamily = "inherit";
      btn.style.cursor = "pointer";
      btn.style.fontWeight = "600";
      btn.style.display = "inline-flex";
      btn.style.alignItems = "center";
      btn.style.justifyContent = "center";
      btn.style.gap = "8px";
      btn.style.fontSize = config.fontSize;
      if (buttonShadow) {
        btn.style.boxShadow = buttonShadow;
      }

      if (buttonIcon) {
        const icon = document.createElement("span");
        icon.textContent = buttonIcon;
        icon.setAttribute("aria-hidden", "true");
        if (buttonIconPosition === "right") {
          btn.appendChild(document.createTextNode(buttonLabel));
          btn.appendChild(icon);
        } else {
          btn.appendChild(icon);
          btn.appendChild(document.createTextNode(buttonLabel));
        }
      } else {
        btn.textContent = buttonLabel;
      }
    }

    btn.addEventListener("click", () => {
      const targetEditor = toAbsolute(editorUrl);
      if (!targetEditor) return;
      const params = new URLSearchParams();
      params.set("shortcode", handle);
      params.set("returnUrl", window.location.href);
      if (variantId) params.set("variantId", variantId);
      if (mapping && mapping.productSlug) params.set("productSlug", mapping.productSlug);
      if (mapping && mapping.surfaceId) params.set("surfaceId", mapping.surfaceId);
      if (mapping && mapping.technique) params.set("technique", mapping.technique);
      const joiner = targetEditor.includes("?") ? "&" : "?";
      const href = `${targetEditor}${joiner}${params.toString()}`;
      if (openMode === "popup") {
        window.open(href, "_blank", "noopener,width=1440,height=900");
      } else {
        window.location.href = href;
      }
    });

    return btn;
  }

  function renderContainer(container, context) {
    const { handle, info, mapping } = context;
    container.innerHTML = "";
    const title = info?.productTitle || mapping?.productTitle;
    if (title) {
      const label = document.createElement("span");
      label.textContent = title;
      label.style.display = "block";
      label.style.marginBottom = "6px";
      label.style.fontWeight = "600";
      container.appendChild(label);
    }
    const button = createButton(container, context);
    container.appendChild(button);
    applyResponsiveWidth(button, container);
    if (typeof ResizeObserver !== "undefined" && !buttonClass) {
      const resizeObserver = new ResizeObserver(() => applyResponsiveWidth(button, container));
      resizeObserver.observe(container);
    }
  }

  function hydrateShortcode(container, context) {
    const { handle } = context;
    const cached = shortcodeCache.get(handle);
    if (cached) {
      container.dataset.gsbShortcodeStatus = "ready";
      renderContainer(container, { ...context, info: cached });
      return;
    }

    const endpoint = cleanEndpoint(apiBase, encodeURIComponent(handle));
    fetch(endpoint, { credentials: "include" })
      .then(response => {
        if (!response.ok) throw new Error(`Shortcode lookup failed (${response.status})`);
        return response.json();
      })
      .then(payload => {
        const info = payload && payload.data ? payload.data : null;
        if (info) {
          shortcodeCache.set(handle, info);
        }
        container.dataset.gsbShortcodeStatus = "ready";
        renderContainer(container, { ...context, info });
      })
      .catch(error => {
        container.dataset.gsbShortcodeStatus = "error";
        container.textContent = "Design customization unavailable.";
        container.style.color = "#991b1b";
        logFailure(handle, {
          code: "FETCH_ERROR",
          message: error?.message || `Failed to hydrate shortcode ${handle}`,
          meta: { variantId: context.variantId || undefined },
        });
      });
  }

  async function fetchVariantMapping(container, variantId) {
    if (!variantId) return null;
    if (mappingCache.has(variantId)) return mappingCache.get(variantId);

    const base = container?.dataset?.gsbMappingUrl || mappingBase;
    if (!base) return null;
    const endpoint = cleanEndpoint(base, encodeURIComponent(variantId));
    try {
      const response = await fetch(endpoint, { credentials: "include" });
      if (response.status === 404) {
        mappingCache.set(variantId, null);
        return null;
      }
      if (!response.ok) throw new Error(`Mapping lookup failed (${response.status})`);
      const payload = await response.json();
      const record = payload && payload.data ? payload.data : null;
      mappingCache.set(variantId, record);
      return record;
    } catch (error) {
      console.warn("[gsb-shortcode] mapping lookup failed", error);
      logFailure(null, {
        code: "MAPPING_ERROR",
        message: error?.message || "Variant mapping lookup failed",
        meta: { variantId },
      });
      mappingCache.set(variantId, null);
      return null;
    }
  }

  async function resolveContext(container) {
    const state = stateMap.get(container) || {};
    const attrHandle = trimHandle(container.getAttribute(ATTR));
    const datasetVariant = normaliseVariantId(container.dataset.gsbVariantId || state.variantId || "");

    state.variantId = datasetVariant || null;
    stateMap.set(container, state);

    let mapping = null;
    let handle = attrHandle;

    if (datasetVariant) {
      mapping = await fetchVariantMapping(container, datasetVariant);
      const mappedHandle = trimHandle(mapping?.shortcodeHandle);
      if (mappedHandle) {
        handle = mappedHandle;
        container.setAttribute(ATTR, mappedHandle);
      }
    }

    if (!handle) {
      handle = state.lastResolvedHandle || null;
    }

    return {
      handle,
      mapping,
      variantId: datasetVariant || null,
    };
  }

  async function refreshContainer(container) {
    const state = stateMap.get(container) || {};
    if (state.refreshing) {
      state.pending = true;
      stateMap.set(container, state);
      return;
    }

    state.refreshing = true;
    state.pending = false;
    container.dataset.gsbShortcodeStatus = "loading";
    stateMap.set(container, state);

    try {
      const context = await resolveContext(container);
      const handle = context.handle;
      if (!handle) {
        container.dataset.gsbShortcodeStatus = "error";
        container.textContent = "Design customization unavailable.";
        container.style.color = "#991b1b";
        logFailure(null, {
          code: "NO_HANDLE",
          message: "No shortcode handle could be resolved for the selected variant.",
          meta: { variantId: context.variantId || undefined },
        });
        return;
      }

      state.lastResolvedHandle = handle;
      stateMap.set(container, state);
      hydrateShortcode(container, context);
    } finally {
      state.refreshing = false;
      const pending = state.pending;
      state.pending = false;
      stateMap.set(container, state);
      if (pending) {
        refreshContainer(container);
      }
    }
  }

  function broadcastVariant(form, variantId) {
    const normalised = normaliseVariantId(variantId);
    if (!normalised) return;
    const targets = form.querySelectorAll(`[${ATTR}]`);
    targets.forEach(container => {
      container.dataset.gsbVariantId = normalised;
      refreshContainer(container);
    });
  }

  function attachVariantObserver(container) {
    const form = container.closest("form");
    if (!form) return;

    const input = form.querySelector('[name="id"]');

    if (input) {
      const updateFromInput = () => {
        const variantId = input.value || input.getAttribute("value");
        broadcastVariant(form, variantId);
      };
      input.addEventListener("change", updateFromInput);
      input.addEventListener("input", updateFromInput);
      const observer = new MutationObserver(updateFromInput);
      observer.observe(input, { attributes: true, attributeFilter: ["value"] });
      updateFromInput();
    }

    if (!form.dataset.gsbVariantListenersAttached) {
      const handleVariantEvent = event => {
        const detail = event.detail || {};
        const variant = detail.variant || detail.selectedVariant || detail;
        const variantId =
          variant?.id ||
          variant?.admin_graphql_api_id ||
          variant?.variantId ||
          detail?.variantId ||
          detail?.currentVariantId;
        if (variantId) {
          broadcastVariant(form, variantId);
        }
      };
      form.addEventListener("variant:change", handleVariantEvent);
      form.addEventListener("shopify:variant:change", handleVariantEvent);
      form.dataset.gsbVariantListenersAttached = "true";
    }
  }

  function initContainer(container) {
    if (container.dataset.gsbInitialised === "true") return;
    container.dataset.gsbInitialised = "true";
    const normalisedVariant = normaliseVariantId(container.dataset.gsbVariantId || "");
    if (normalisedVariant) {
      container.dataset.gsbVariantId = normalisedVariant;
    }
    stateMap.set(container, {});
    refreshContainer(container);
    attachVariantObserver(container);
  }

  function initAll(root) {
    const scope = root && root.querySelectorAll ? root : document;
    const targets = scope.querySelectorAll(`[${ATTR}]`);
    targets.forEach(initContainer);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => initAll(document));
  } else {
    initAll(document);
  }

  document.addEventListener("shopify:section:load", event => {
    if (event && event.target) initAll(event.target);
  });
  document.addEventListener("shopify:section:reorder", () => initAll(document));
})();

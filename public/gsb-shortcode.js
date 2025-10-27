(function() {
  const ATTR = "data-gsb-shortcode";
  const script = document.currentScript;
  const dataset = script ? script.dataset : {};
  const editorUrl = dataset.editorUrl || "/editor";
  const apiBase = dataset.apiUrl || "/api/embed/shortcodes";
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

  function toAbsolute(url) {
    if (!url) return "";
    if (/^https?:/i.test(url)) return url;
    if (url.startsWith("//")) return window.location.protocol + url;
    if (url.startsWith("/")) return window.location.origin + url;
    return `${window.location.origin}/${url.replace(/^\\//, "")}`;
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
    try {
      const endpoint = `${toAbsolute(logApiBase)}/${encodeURIComponent(handle)}/log`;
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

  function createButton(handle) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.dataset.gsbHandle = handle;
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
      const joiner = targetEditor.includes("?") ? "&" : "?";
      const href = `${targetEditor}${joiner}shortcode=${encodeURIComponent(handle)}&returnUrl=${encodeURIComponent(window.location.href)}`;
      if (openMode === "popup") {
        window.open(href, "_blank", "noopener,width=1440,height=900");
      } else {
        window.location.href = href;
      }
    });

    return btn;
  }

  function renderContainer(handle, container, info) {
    container.innerHTML = "";
    if (info && info.productTitle) {
      const label = document.createElement("span");
      label.textContent = info.productTitle;
      label.style.display = "block";
      label.style.marginBottom = "6px";
      label.style.fontWeight = "600";
      container.appendChild(label);
    }
    const button = createButton(handle);
    container.appendChild(button);
    applyResponsiveWidth(button, container);
    if (typeof ResizeObserver !== "undefined" && !buttonClass) {
      const resizeObserver = new ResizeObserver(() => applyResponsiveWidth(button, container));
      resizeObserver.observe(container);
    }
  }

  function hydrate(handle, container) {
    const endpoint = `${toAbsolute(apiBase)}/${encodeURIComponent(handle)}`;
    fetch(endpoint, { credentials: 'include' })
      .then(response => {
        if (!response.ok) throw new Error(`Shortcode lookup failed (${response.status})`);
        return response.json();
      })
      .then(payload => {
        container.dataset.gsbShortcodeStatus = "ready";
        renderContainer(handle, container, payload && payload.data);
      })
      .catch(() => {
        container.dataset.gsbShortcodeStatus = "error";
        container.textContent = "Design customization unavailable.";
        container.style.color = "#991b1b";
        logFailure(handle, { code: "FETCH_ERROR", message: `Failed to hydrate shortcode ${handle}` });
      });
  }

  function init() {
    const targets = document.querySelectorAll(`[${ATTR}]`);
    targets.forEach(target => {
      const handle = target.getAttribute(ATTR);
      if (!handle) return;
      target.dataset.gsbShortcodeStatus = "loading";
      hydrate(handle, target);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

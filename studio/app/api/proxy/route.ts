import { NextRequest, NextResponse } from "next/server"

// Inspector injection script
const INSPECTOR_SCRIPT = `
<script>
(function() {
  // Notify parent that we're loaded
  window.parent.postMessage({ type: 'LUMOS_CONNECTED' }, '*');

  // Listen for undo/redo commands
  window.addEventListener('message', function(event) {
    if (event.data.type === 'LUMOS_UNDO') {
      const change = event.data.change;
      const el = document.querySelector(change.selector);
      if (el) {
        el.style[change.property] = change.oldValue;
      }
    } else if (event.data.type === 'LUMOS_REDO') {
      const change = event.data.change;
      const el = document.querySelector(change.selector);
      if (el) {
        el.style[change.property] = change.newValue;
      }
    }
  });

  // Override style setter to track changes
  const originalSetProperty = CSSStyleDeclaration.prototype.setProperty;
  CSSStyleDeclaration.prototype.setProperty = function(prop, value, priority) {
    const el = this.parentElement || document.querySelector('[style]');
    if (el) {
      const oldValue = this.getPropertyValue(prop);
      originalSetProperty.call(this, prop, value, priority);

      // Generate a unique selector for this element
      const selector = generateSelector(el);

      window.parent.postMessage({
        type: 'LUMOS_STYLE_CHANGE',
        selector: selector,
        property: prop,
        oldValue: oldValue,
        newValue: value,
      }, '*');
    } else {
      originalSetProperty.call(this, prop, value, priority);
    }
  };

  function generateSelector(el) {
    if (el.id) return '#' + el.id;
    if (el.className) {
      const classes = el.className.split(' ').filter(c => c).slice(0, 2).join('.');
      if (classes) return el.tagName.toLowerCase() + '.' + classes;
    }

    // Generate path-based selector
    const path = [];
    while (el && el.nodeType === Node.ELEMENT_NODE) {
      let selector = el.nodeName.toLowerCase();
      if (el.id) {
        selector = '#' + el.id;
        path.unshift(selector);
        break;
      }
      let sibling = el;
      let nth = 1;
      while (sibling = sibling.previousElementSibling) {
        if (sibling.nodeName.toLowerCase() === selector) nth++;
      }
      if (nth !== 1) selector += ':nth-of-type(' + nth + ')';
      path.unshift(selector);
      el = el.parentNode;
    }
    return path.join(' > ');
  }
})();
</script>
`

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const targetUrl = searchParams.get("url")

  if (!targetUrl) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 })
  }

  try {
    // Validate URL
    const url = new URL(targetUrl)

    // Fetch the target page
    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent": "Lumos-Studio/1.0",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch: ${response.status}` },
        { status: response.status }
      )
    }

    let html = await response.text()

    // Inject the inspector script before </body>
    if (html.includes("</body>")) {
      html = html.replace("</body>", INSPECTOR_SCRIPT + "</body>")
    } else if (html.includes("</html>")) {
      html = html.replace("</html>", INSPECTOR_SCRIPT + "</html>")
    } else {
      html += INSPECTOR_SCRIPT
    }

    // Rewrite relative URLs to absolute
    const baseUrl = `${url.protocol}//${url.host}`
    html = html.replace(/(href|src|action)=["'](?!http|\/\/|#|data:|javascript:)([^"']+)["']/gi, (match, attr, path) => {
      const absolutePath = path.startsWith("/") ? baseUrl + path : baseUrl + "/" + path
      return `${attr}="${absolutePath}"`
    })

    // Remove X-Frame-Options and CSP headers that might block iframe
    const headers = new Headers()
    headers.set("Content-Type", "text/html; charset=utf-8")
    headers.set("X-Frame-Options", "SAMEORIGIN")
    headers.delete("Content-Security-Policy")

    return new NextResponse(html, { headers })
  } catch (error) {
    console.error("Proxy error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Proxy error" },
      { status: 500 }
    )
  }
}

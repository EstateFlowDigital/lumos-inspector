import { NextRequest, NextResponse } from "next/server"

// Inspector injection script
const INSPECTOR_SCRIPT = `
<style>
  .lumos-hover-outline {
    outline: 2px solid #3b82f6 !important;
    outline-offset: 2px !important;
  }
  .lumos-selected-outline {
    outline: 2px solid #8b5cf6 !important;
    outline-offset: 2px !important;
  }
</style>
<script>
(function() {
  let selectedElement = null;
  let hoveredElement = null;

  // Notify parent that we're loaded
  window.parent.postMessage({ type: 'LUMOS_CONNECTED' }, '*');

  // Listen for commands from parent
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
    } else if (event.data.type === 'LUMOS_APPLY_STYLE') {
      const el = document.querySelector(event.data.selector);
      if (el) {
        const oldValue = el.style[event.data.property] || getComputedStyle(el)[event.data.property];
        el.style[event.data.property] = event.data.value;

        // Notify parent of change
        window.parent.postMessage({
          type: 'LUMOS_STYLE_CHANGE',
          selector: event.data.selector,
          property: event.data.property,
          oldValue: oldValue,
          newValue: event.data.value,
        }, '*');
      }
    }
  });

  // Handle hover
  document.addEventListener('mouseover', function(e) {
    if (e.target === document.body || e.target === document.documentElement) return;

    if (hoveredElement && hoveredElement !== selectedElement) {
      hoveredElement.classList.remove('lumos-hover-outline');
    }

    hoveredElement = e.target;
    if (hoveredElement !== selectedElement) {
      hoveredElement.classList.add('lumos-hover-outline');
    }
  });

  document.addEventListener('mouseout', function(e) {
    if (hoveredElement && hoveredElement !== selectedElement) {
      hoveredElement.classList.remove('lumos-hover-outline');
    }
  });

  // Handle click to select element
  document.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();

    if (selectedElement) {
      selectedElement.classList.remove('lumos-selected-outline');
    }

    selectedElement = e.target;
    selectedElement.classList.add('lumos-selected-outline');
    if (hoveredElement) {
      hoveredElement.classList.remove('lumos-hover-outline');
    }

    // Get computed styles
    const computed = getComputedStyle(selectedElement);
    const styles = {
      display: computed.display,
      position: computed.position,
      padding: computed.padding,
      margin: computed.margin,
      fontSize: computed.fontSize,
      fontWeight: computed.fontWeight,
      color: rgbToHex(computed.color),
      backgroundColor: rgbToHex(computed.backgroundColor),
      borderRadius: computed.borderRadius,
      borderWidth: computed.borderWidth,
    };

    // Notify parent of selection
    window.parent.postMessage({
      type: 'LUMOS_ELEMENT_SELECTED',
      selector: generateSelector(selectedElement),
      tagName: selectedElement.tagName.toLowerCase(),
      className: selectedElement.className.replace('lumos-selected-outline', '').replace('lumos-hover-outline', '').trim(),
      id: selectedElement.id || '',
      styles: styles,
    }, '*');
  }, true);

  function rgbToHex(rgb) {
    if (!rgb || rgb === 'transparent' || rgb === 'rgba(0, 0, 0, 0)') return '';
    const match = rgb.match(/^rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)/);
    if (!match) return rgb;
    return '#' + [match[1], match[2], match[3]].map(x => {
      const hex = parseInt(x).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  }

  function generateSelector(el) {
    if (el.id) return '#' + el.id;
    if (el.className) {
      const classes = el.className.split(' ').filter(c => c && !c.startsWith('lumos-')).slice(0, 2).join('.');
      if (classes) return el.tagName.toLowerCase() + '.' + classes;
    }

    // Generate path-based selector
    const path = [];
    let current = el;
    while (current && current.nodeType === Node.ELEMENT_NODE && current !== document.body) {
      let selector = current.nodeName.toLowerCase();
      if (current.id) {
        selector = '#' + current.id;
        path.unshift(selector);
        break;
      }
      let sibling = current;
      let nth = 1;
      while (sibling = sibling.previousElementSibling) {
        if (sibling.nodeName.toLowerCase() === current.nodeName.toLowerCase()) nth++;
      }
      if (nth !== 1) selector += ':nth-of-type(' + nth + ')';
      path.unshift(selector);
      current = current.parentNode;
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

    // Fetch the target page with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
      },
      signal: controller.signal,
      redirect: "follow",
      cache: "no-store",
    })

    clearTimeout(timeoutId)

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

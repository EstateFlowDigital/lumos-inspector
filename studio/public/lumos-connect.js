/**
 * Lumos Studio Connection SDK
 *
 * Add this script to your app to enable visual editing from Lumos Studio.
 *
 * Usage:
 * <script src="https://lumos-inspector-production.up.railway.app/lumos-connect.js"
 *         data-session="YOUR_SESSION_ID"></script>
 */
(function() {
  // Prevent double initialization
  if (window.__lumosConnected) return;
  window.__lumosConnected = true;

  // Get configuration from script tag
  const currentScript = document.currentScript;
  const sessionId = currentScript?.dataset?.session || new URLSearchParams(window.location.search).get('lumos-session');
  const studioUrl = currentScript?.dataset?.studioUrl || 'https://lumos-inspector-production.up.railway.app';

  // State
  let socket = null;
  let selectedElement = null;
  let hoveredElement = null;
  let inspectorEnabled = true;

  // Check if running inside Lumos Studio iframe
  const isInIframe = window.parent !== window;

  // Inject highlighting styles
  const style = document.createElement('style');
  style.id = 'lumos-inspector-styles';
  style.textContent = `
    .lumos-hover-outline {
      outline: 2px solid #3b82f6 !important;
      outline-offset: 2px !important;
    }
    .lumos-selected-outline {
      outline: 2px solid #8b5cf6 !important;
      outline-offset: 2px !important;
    }
    .lumos-connection-badge {
      position: fixed;
      bottom: 16px;
      right: 16px;
      background: linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%);
      color: white;
      padding: 8px 16px;
      border-radius: 9999px;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 13px;
      font-weight: 500;
      z-index: 999999;
      box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .lumos-connection-badge:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(139, 92, 246, 0.5);
    }
    .lumos-connection-badge.connected {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
    }
    .lumos-connection-badge .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: currentColor;
      animation: lumos-pulse 2s infinite;
    }
    @keyframes lumos-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
  `;
  document.head.appendChild(style);

  // Helper: Convert RGB to Hex
  function rgbToHex(rgb) {
    if (!rgb || rgb === 'transparent' || rgb === 'rgba(0, 0, 0, 0)') return '';
    const match = rgb.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!match) return rgb;
    return '#' + [match[1], match[2], match[3]].map(x => {
      const hex = parseInt(x).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  }

  // Helper: Generate CSS selector for element
  function generateSelector(el) {
    if (el.id) return '#' + el.id;
    if (el.className && typeof el.className === 'string') {
      const classes = el.className.split(' ')
        .filter(c => c && !c.startsWith('lumos-'))
        .slice(0, 2)
        .join('.');
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

  // Helper: Get computed styles for element
  function getElementStyles(el) {
    const computed = getComputedStyle(el);
    return {
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
      width: computed.width,
      height: computed.height,
    };
  }

  // Send message to Studio (via postMessage or socket)
  function sendToStudio(type, data) {
    const message = { type, ...data };

    if (isInIframe) {
      window.parent.postMessage(message, '*');
    } else if (socket && socket.connected) {
      socket.emit(type.replace('LUMOS_', '').toLowerCase().replace(/_/g, '-'), data);
    }
  }

  // Handle element selection
  function selectElement(el) {
    if (selectedElement) {
      selectedElement.classList.remove('lumos-selected-outline');
    }

    selectedElement = el;
    selectedElement.classList.add('lumos-selected-outline');

    if (hoveredElement) {
      hoveredElement.classList.remove('lumos-hover-outline');
    }

    const className = typeof el.className === 'string'
      ? el.className.replace('lumos-selected-outline', '').replace('lumos-hover-outline', '').trim()
      : '';

    sendToStudio('LUMOS_ELEMENT_SELECTED', {
      selector: generateSelector(el),
      tagName: el.tagName.toLowerCase(),
      className: className,
      id: el.id || '',
      styles: getElementStyles(el),
    });
  }

  // Apply style to element
  function applyStyle(selector, property, value) {
    const el = document.querySelector(selector);
    if (el) {
      const oldValue = el.style[property] || getComputedStyle(el)[property];
      el.style[property] = value;

      sendToStudio('LUMOS_STYLE_CHANGE', {
        selector,
        property,
        oldValue,
        newValue: value,
      });

      // Update selected element styles if it's the same element
      if (selectedElement && generateSelector(selectedElement) === selector) {
        // Trigger re-selection to update panel
        sendToStudio('LUMOS_ELEMENT_SELECTED', {
          selector: selector,
          tagName: selectedElement.tagName.toLowerCase(),
          className: typeof selectedElement.className === 'string'
            ? selectedElement.className.replace('lumos-selected-outline', '').replace('lumos-hover-outline', '').trim()
            : '',
          id: selectedElement.id || '',
          styles: getElementStyles(selectedElement),
        });
      }
    }
  }

  // Set up event listeners
  document.addEventListener('mouseover', function(e) {
    if (!inspectorEnabled) return;
    if (e.target === document.body || e.target === document.documentElement) return;
    if (e.target.closest('.lumos-connection-badge')) return;

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

  document.addEventListener('click', function(e) {
    if (!inspectorEnabled) return;
    if (e.target.closest('.lumos-connection-badge')) return;

    e.preventDefault();
    e.stopPropagation();
    selectElement(e.target);
  }, true);

  // Listen for messages from Studio
  function handleStudioMessage(event) {
    const data = event.data || event;

    switch (data.type) {
      case 'LUMOS_APPLY_STYLE':
        applyStyle(data.selector, data.property, data.value);
        break;

      case 'LUMOS_UNDO':
        if (data.change) {
          const el = document.querySelector(data.change.selector);
          if (el) {
            el.style[data.change.property] = data.change.oldValue;
          }
        }
        break;

      case 'LUMOS_REDO':
        if (data.change) {
          const el = document.querySelector(data.change.selector);
          if (el) {
            el.style[data.change.property] = data.change.newValue;
          }
        }
        break;

      case 'LUMOS_TOGGLE_INSPECTOR':
        inspectorEnabled = data.enabled !== false;
        break;
    }
  }

  // Set up communication based on context
  if (isInIframe) {
    // Running inside Studio iframe - use postMessage
    window.addEventListener('message', handleStudioMessage);
    sendToStudio('LUMOS_CONNECTED', {});
    console.log('[Lumos] Connected to Studio via iframe');
  } else if (sessionId) {
    // Running standalone with session ID - connect via Socket.io
    // Load Socket.io client dynamically
    const socketScript = document.createElement('script');
    socketScript.src = studioUrl + '/socket.io/socket.io.js';
    socketScript.onload = function() {
      socket = io(studioUrl, {
        path: '/lumos-socket',
        transports: ['websocket', 'polling'],
      });

      socket.on('connect', function() {
        console.log('[Lumos] Connected to Studio via WebSocket');
        socket.emit('join-session', { sessionId, role: 'target' });
        updateBadge(true);
      });

      socket.on('session-joined', function() {
        console.log('[Lumos] Joined session:', sessionId);
      });

      socket.on('studio-connected', function() {
        console.log('[Lumos] Studio is now connected');
        updateBadge(true);
      });

      socket.on('studio-disconnected', function() {
        console.log('[Lumos] Studio disconnected');
        updateBadge(false);
      });

      socket.on('apply-style', function(data) {
        applyStyle(data.selector, data.property, data.value);
      });

      socket.on('undo', function(data) {
        handleStudioMessage({ type: 'LUMOS_UNDO', ...data });
      });

      socket.on('redo', function(data) {
        handleStudioMessage({ type: 'LUMOS_REDO', ...data });
      });

      socket.on('disconnect', function() {
        console.log('[Lumos] Disconnected from Studio');
        updateBadge(false);
      });
    };
    document.body.appendChild(socketScript);

    // Show connection badge
    const badge = document.createElement('div');
    badge.className = 'lumos-connection-badge';
    badge.innerHTML = '<span class="dot"></span> Lumos Studio';
    badge.onclick = function() {
      window.open(studioUrl + '/connect?session=' + sessionId, '_blank');
    };
    document.body.appendChild(badge);

    function updateBadge(connected) {
      badge.classList.toggle('connected', connected);
      badge.innerHTML = connected
        ? '<span class="dot"></span> Connected to Studio'
        : '<span class="dot"></span> Waiting for Studio...';
    }
  } else {
    // No session ID - show instructions
    console.log('[Lumos] No session ID provided. Add data-session="YOUR_SESSION_ID" to the script tag.');

    const badge = document.createElement('div');
    badge.className = 'lumos-connection-badge';
    badge.innerHTML = '<span class="dot"></span> Lumos (No Session)';
    badge.onclick = function() {
      window.open(studioUrl + '/connect', '_blank');
    };
    document.body.appendChild(badge);
  }
})();

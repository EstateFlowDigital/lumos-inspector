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
  let inspectorEnabled = false; // Start disabled - user clicks to enable
  let badgeElement = null;

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
    .lumos-badge-container {
      position: fixed;
      bottom: 16px;
      right: 16px;
      z-index: 999999;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 8px;
      font-family: system-ui, -apple-system, sans-serif;
    }
    .lumos-connection-badge {
      background: linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%);
      color: white;
      padding: 10px 16px;
      border-radius: 12px;
      font-size: 13px;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      transition: all 0.2s;
      user-select: none;
    }
    .lumos-connection-badge:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(139, 92, 246, 0.5);
    }
    .lumos-connection-badge.connected {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
    }
    .lumos-connection-badge.inspector-active {
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
    }
    .lumos-connection-badge .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: currentColor;
      flex-shrink: 0;
    }
    .lumos-connection-badge .dot.pulse {
      animation: lumos-pulse 2s infinite;
    }
    .lumos-toggle-btn {
      background: rgba(255,255,255,0.2);
      border: none;
      color: white;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .lumos-toggle-btn:hover {
      background: rgba(255,255,255,0.3);
    }
    .lumos-hint {
      font-size: 11px;
      color: rgba(255,255,255,0.8);
      background: rgba(0,0,0,0.3);
      padding: 6px 12px;
      border-radius: 8px;
      max-width: 200px;
      text-align: center;
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

  // Toggle inspector on/off
  function toggleInspector() {
    inspectorEnabled = !inspectorEnabled;

    // Clear any existing selections when disabling
    if (!inspectorEnabled) {
      if (selectedElement) {
        selectedElement.classList.remove('lumos-selected-outline');
        selectedElement = null;
      }
      if (hoveredElement) {
        hoveredElement.classList.remove('lumos-hover-outline');
        hoveredElement = null;
      }
    }

    updateBadgeState();
  }

  // Update badge appearance based on state
  function updateBadgeState() {
    if (!badgeElement) return;

    const dot = badgeElement.querySelector('.dot');
    const text = badgeElement.querySelector('.badge-text');
    const btn = badgeElement.querySelector('.lumos-toggle-btn');

    if (inspectorEnabled) {
      badgeElement.classList.add('inspector-active');
      badgeElement.classList.remove('connected');
      if (dot) dot.classList.add('pulse');
      if (text) text.textContent = 'Inspector Active';
      if (btn) btn.textContent = 'Stop';
    } else {
      badgeElement.classList.remove('inspector-active');
      if (socket && socket.connected) {
        badgeElement.classList.add('connected');
        if (text) text.textContent = 'Connected';
      } else {
        badgeElement.classList.remove('connected');
        if (text) text.textContent = 'Lumos Studio';
      }
      if (dot) dot.classList.remove('pulse');
      if (btn) btn.textContent = 'Inspect';
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
    if (e.target.closest('.lumos-badge-container')) return;

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
    if (e.target.closest('.lumos-badge-container')) return;

    e.preventDefault();
    e.stopPropagation();
    selectElement(e.target);
  }, true);

  // Keyboard shortcut: Escape to toggle inspector
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      toggleInspector();
    }
  });

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
        updateBadgeState();
        break;
    }
  }

  // Create badge UI
  function createBadge() {
    const container = document.createElement('div');
    container.className = 'lumos-badge-container';

    const badge = document.createElement('div');
    badge.className = 'lumos-connection-badge';
    badge.innerHTML = `
      <span class="dot"></span>
      <span class="badge-text">Lumos Studio</span>
      <button class="lumos-toggle-btn">Inspect</button>
    `;

    // Toggle button click
    const toggleBtn = badge.querySelector('.lumos-toggle-btn');
    toggleBtn.onclick = function(e) {
      e.stopPropagation();
      toggleInspector();
    };

    // Badge click opens Studio
    badge.onclick = function(e) {
      if (e.target === toggleBtn) return;
      window.open(studioUrl + '/connect?session=' + sessionId, '_blank');
    };

    container.appendChild(badge);

    // Add hint when inspector is active
    const hint = document.createElement('div');
    hint.className = 'lumos-hint';
    hint.style.display = 'none';
    hint.textContent = 'Click elements to inspect. Press ESC to stop.';
    container.appendChild(hint);

    document.body.appendChild(container);
    badgeElement = badge;

    return { badge, hint };
  }

  // Set up communication based on context
  if (isInIframe) {
    // Running inside Studio iframe - use postMessage
    window.addEventListener('message', handleStudioMessage);
    sendToStudio('LUMOS_CONNECTED', {});
    inspectorEnabled = true; // Auto-enable in iframe mode
    console.log('[Lumos] Connected to Studio via iframe');
  } else if (sessionId) {
    // Running standalone with session ID - connect via Socket.io
    const { badge, hint } = createBadge();

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
        updateBadgeState();
      });

      socket.on('session-joined', function() {
        console.log('[Lumos] Joined session:', sessionId);
      });

      socket.on('studio-connected', function() {
        console.log('[Lumos] Studio is now connected');
        updateBadgeState();
      });

      socket.on('studio-disconnected', function() {
        console.log('[Lumos] Studio disconnected');
        updateBadgeState();
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
        updateBadgeState();
      });
    };
    document.body.appendChild(socketScript);

    // Show/hide hint based on inspector state
    const originalToggle = toggleInspector;
    toggleInspector = function() {
      originalToggle();
      hint.style.display = inspectorEnabled ? 'block' : 'none';
    };
  } else {
    // No session ID - show instructions
    console.log('[Lumos] No session ID provided. Add data-session="YOUR_SESSION_ID" to the script tag.');

    const { badge } = createBadge();
    badge.querySelector('.badge-text').textContent = 'Lumos (No Session)';
    badge.querySelector('.lumos-toggle-btn').style.display = 'none';
  }
})();

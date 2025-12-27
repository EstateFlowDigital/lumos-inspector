/**
 * Lumos Inspector - Built-in Visual Style Editor
 *
 * Add this script to your app to enable visual style editing.
 * Click the Lumos badge to open the style panel, select elements, and edit styles.
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
  let selectedElement = null;
  let hoveredElement = null;
  let inspectorEnabled = false;
  let panelOpen = false;
  let changes = [];
  let undoStack = [];

  // Check if running inside iframe
  const isInIframe = window.parent !== window;

  // Inject styles
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

    /* Floating Badge */
    .lumos-fab {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 999998;
      width: 56px;
      height: 56px;
      border-radius: 28px;
      background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 20px rgba(139, 92, 246, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      font-family: system-ui, -apple-system, sans-serif;
    }
    .lumos-fab:hover {
      transform: scale(1.1);
      box-shadow: 0 6px 24px rgba(139, 92, 246, 0.6);
    }
    .lumos-fab.active {
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      box-shadow: 0 4px 20px rgba(245, 158, 11, 0.5);
    }
    .lumos-fab.panel-open {
      right: 340px;
    }
    .lumos-fab svg {
      width: 24px;
      height: 24px;
      fill: white;
    }

    /* Side Panel */
    .lumos-panel {
      position: fixed;
      top: 0;
      right: -320px;
      width: 320px;
      height: 100vh;
      background: #18181b;
      color: #fafafa;
      z-index: 999999;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 13px;
      box-shadow: -4px 0 20px rgba(0,0,0,0.3);
      transition: right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .lumos-panel.open {
      right: 0;
    }

    /* Panel Header */
    .lumos-panel-header {
      padding: 16px;
      border-bottom: 1px solid #27272a;
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #09090b;
    }
    .lumos-panel-title {
      font-weight: 600;
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .lumos-panel-title svg {
      width: 18px;
      height: 18px;
    }
    .lumos-panel-close {
      background: none;
      border: none;
      color: #71717a;
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .lumos-panel-close:hover {
      color: #fafafa;
      background: #27272a;
    }

    /* Inspector Toggle */
    .lumos-inspector-toggle {
      padding: 12px 16px;
      border-bottom: 1px solid #27272a;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .lumos-inspector-toggle label {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #a1a1aa;
      font-size: 12px;
    }
    .lumos-toggle-switch {
      position: relative;
      width: 40px;
      height: 22px;
      background: #3f3f46;
      border-radius: 11px;
      cursor: pointer;
      transition: background 0.2s;
    }
    .lumos-toggle-switch.active {
      background: #8b5cf6;
    }
    .lumos-toggle-switch::after {
      content: '';
      position: absolute;
      top: 2px;
      left: 2px;
      width: 18px;
      height: 18px;
      background: white;
      border-radius: 50%;
      transition: transform 0.2s;
    }
    .lumos-toggle-switch.active::after {
      transform: translateX(18px);
    }

    /* Element Info */
    .lumos-element-info {
      padding: 12px 16px;
      background: #27272a;
      border-bottom: 1px solid #3f3f46;
    }
    .lumos-element-tag {
      display: inline-block;
      padding: 2px 8px;
      background: #8b5cf6;
      color: white;
      border-radius: 4px;
      font-size: 11px;
      font-family: ui-monospace, monospace;
      margin-right: 6px;
    }
    .lumos-element-id {
      color: #a78bfa;
      font-size: 11px;
      font-family: ui-monospace, monospace;
    }
    .lumos-element-class {
      color: #71717a;
      font-size: 11px;
      font-family: ui-monospace, monospace;
      margin-top: 4px;
      word-break: break-all;
    }

    /* Style Sections */
    .lumos-panel-content {
      flex: 1;
      overflow-y: auto;
      padding-bottom: 80px;
    }
    .lumos-section {
      border-bottom: 1px solid #27272a;
    }
    .lumos-section-header {
      padding: 12px 16px;
      font-size: 11px;
      font-weight: 600;
      color: #71717a;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      background: #18181b;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .lumos-section-header:hover {
      background: #1f1f23;
    }
    .lumos-section-content {
      padding: 12px 16px;
    }

    /* Form Controls */
    .lumos-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-bottom: 8px;
    }
    .lumos-field {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .lumos-field.full {
      grid-column: span 2;
    }
    .lumos-label {
      font-size: 11px;
      color: #71717a;
    }
    .lumos-input {
      background: #27272a;
      border: 1px solid #3f3f46;
      border-radius: 6px;
      padding: 8px 10px;
      color: #fafafa;
      font-size: 12px;
      font-family: ui-monospace, monospace;
      outline: none;
      transition: border-color 0.2s;
    }
    .lumos-input:focus {
      border-color: #8b5cf6;
    }
    .lumos-input::placeholder {
      color: #52525b;
    }
    .lumos-select {
      background: #27272a;
      border: 1px solid #3f3f46;
      border-radius: 6px;
      padding: 8px 10px;
      color: #fafafa;
      font-size: 12px;
      outline: none;
      cursor: pointer;
    }
    .lumos-select:focus {
      border-color: #8b5cf6;
    }

    /* Color Input */
    .lumos-color-row {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    .lumos-color-swatch {
      width: 32px;
      height: 32px;
      border-radius: 6px;
      border: 2px solid #3f3f46;
      cursor: pointer;
      padding: 0;
      overflow: hidden;
    }
    .lumos-color-swatch input[type="color"] {
      width: 48px;
      height: 48px;
      margin: -8px;
      border: none;
      cursor: pointer;
    }

    /* Changes List */
    .lumos-changes {
      padding: 12px 16px;
      background: #09090b;
      border-top: 1px solid #27272a;
    }
    .lumos-changes-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    }
    .lumos-changes-title {
      font-size: 11px;
      color: #71717a;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .lumos-changes-count {
      background: #8b5cf6;
      color: white;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 11px;
      font-weight: 600;
    }
    .lumos-change-item {
      background: #27272a;
      padding: 8px 10px;
      border-radius: 6px;
      margin-bottom: 4px;
      font-size: 11px;
    }
    .lumos-change-selector {
      color: #71717a;
      font-family: ui-monospace, monospace;
      margin-bottom: 2px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .lumos-change-value {
      color: #a78bfa;
    }

    /* Action Buttons */
    .lumos-actions {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 12px 16px;
      background: linear-gradient(to top, #18181b 80%, transparent);
      display: flex;
      gap: 8px;
    }
    .lumos-btn {
      flex: 1;
      padding: 10px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }
    .lumos-btn svg {
      width: 16px;
      height: 16px;
    }
    .lumos-btn-primary {
      background: #8b5cf6;
      color: white;
    }
    .lumos-btn-primary:hover {
      background: #7c3aed;
    }
    .lumos-btn-primary:disabled {
      background: #3f3f46;
      color: #71717a;
      cursor: not-allowed;
    }
    .lumos-btn-secondary {
      background: #27272a;
      color: #fafafa;
    }
    .lumos-btn-secondary:hover {
      background: #3f3f46;
    }
    .lumos-btn-secondary:disabled {
      color: #52525b;
      cursor: not-allowed;
    }

    /* Empty State */
    .lumos-empty {
      padding: 40px 20px;
      text-align: center;
      color: #71717a;
    }
    .lumos-empty svg {
      width: 48px;
      height: 48px;
      margin-bottom: 12px;
      opacity: 0.3;
    }
    .lumos-empty p {
      font-size: 13px;
      line-height: 1.5;
    }

    /* Toast Notification */
    .lumos-toast {
      position: fixed;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%) translateY(20px);
      background: #27272a;
      color: #fafafa;
      padding: 12px 20px;
      border-radius: 8px;
      font-size: 13px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      opacity: 0;
      transition: all 0.3s;
      z-index: 1000000;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .lumos-toast.show {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
    .lumos-toast.success {
      background: #059669;
    }
    .lumos-toast.error {
      background: #dc2626;
    }
  `;
  document.head.appendChild(style);

  // Icons
  const icons = {
    paintbrush: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18.37 2.63L14 7l-1.59-1.59a2 2 0 0 0-2.82 0L8 7l9 9 1.59-1.59a2 2 0 0 0 0-2.82L17 10l4.37-4.37a2.12 2.12 0 1 0-3-3Z"/><path d="M9 8c-2 3-4 3.5-7 4l8 10c2-1 6-5 6-7"/><path d="M14.5 17.5 4.5 15"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>',
    cursor: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/><path d="M13 13l6 6"/></svg>',
    undo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>',
    save: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17,21 17,13 7,13 7,21"/><polyline points="7,3 7,8 15,8"/></svg>',
    git: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 0 1 2 2v7"/><path d="M6 9v12"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20,6 9,17 4,12"/></svg>',
  };

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

  // Helper: Generate CSS selector
  function generateSelector(el) {
    if (el.id) return '#' + el.id;
    if (el.className && typeof el.className === 'string') {
      const classes = el.className.split(' ')
        .filter(c => c && !c.startsWith('lumos-'))
        .slice(0, 2)
        .join('.');
      if (classes) return el.tagName.toLowerCase() + '.' + classes;
    }
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

  // Helper: Get computed styles
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

  // Show toast notification
  function showToast(message, type = 'info') {
    const existing = document.querySelector('.lumos-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'lumos-toast ' + type;
    toast.innerHTML = (type === 'success' ? icons.check : '') + message;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }

  // Apply style change
  function applyStyleChange(property, value) {
    if (!selectedElement) return;

    const selector = generateSelector(selectedElement);
    const oldValue = selectedElement.style[property] || getComputedStyle(selectedElement)[property];

    selectedElement.style[property] = value;

    const change = {
      id: Date.now().toString(36),
      selector,
      property,
      oldValue,
      newValue: value,
      timestamp: Date.now(),
    };

    changes.push(change);
    undoStack = [];
    updateUI();
    showToast(`${property}: ${value}`, 'success');
  }

  // Undo last change
  function undo() {
    if (changes.length === 0) return;
    const change = changes.pop();
    const el = document.querySelector(change.selector);
    if (el) {
      el.style[change.property] = change.oldValue;
    }
    undoStack.push(change);
    updateUI();
  }

  // Clear all changes
  function clearChanges() {
    changes.forEach(change => {
      const el = document.querySelector(change.selector);
      if (el) {
        el.style[change.property] = change.oldValue;
      }
    });
    changes = [];
    undoStack = [];
    updateUI();
    showToast('All changes cleared');
  }

  // Create PR with changes
  async function createPR() {
    if (changes.length === 0) {
      showToast('No changes to save', 'error');
      return;
    }

    try {
      const response = await fetch(studioUrl + '/api/create-pr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          changes,
          url: window.location.href,
        }),
      });

      const data = await response.json();
      if (data.success) {
        showToast('PR created successfully!', 'success');
        if (data.prUrl) {
          window.open(data.prUrl, '_blank');
        }
      } else {
        throw new Error(data.error || 'Failed to create PR');
      }
    } catch (error) {
      showToast(error.message, 'error');
    }
  }

  // Toggle inspector mode
  function toggleInspector() {
    inspectorEnabled = !inspectorEnabled;
    fab.classList.toggle('active', inspectorEnabled);

    if (!inspectorEnabled && selectedElement) {
      selectedElement.classList.remove('lumos-selected-outline');
      if (hoveredElement) hoveredElement.classList.remove('lumos-hover-outline');
      selectedElement = null;
      hoveredElement = null;
    }

    updateUI();
  }

  // Toggle panel
  function togglePanel() {
    panelOpen = !panelOpen;
    panel.classList.toggle('open', panelOpen);
    fab.classList.toggle('panel-open', panelOpen);
  }

  // Update UI
  function updateUI() {
    // Update toggle switch
    const toggle = panel.querySelector('.lumos-toggle-switch');
    if (toggle) toggle.classList.toggle('active', inspectorEnabled);

    // Update element info
    const elementInfo = panel.querySelector('.lumos-element-info');
    const emptyState = panel.querySelector('.lumos-empty');
    const styleContent = panel.querySelector('.lumos-style-content');

    if (selectedElement) {
      const styles = getElementStyles(selectedElement);
      const className = typeof selectedElement.className === 'string'
        ? selectedElement.className.replace('lumos-selected-outline', '').replace('lumos-hover-outline', '').trim()
        : '';

      elementInfo.style.display = 'block';
      elementInfo.innerHTML = `
        <span class="lumos-element-tag">${selectedElement.tagName.toLowerCase()}</span>
        ${selectedElement.id ? `<span class="lumos-element-id">#${selectedElement.id}</span>` : ''}
        ${className ? `<div class="lumos-element-class">.${className.split(' ').join(' .')}</div>` : ''}
      `;

      emptyState.style.display = 'none';
      styleContent.style.display = 'block';

      // Update style inputs
      updateStyleInputs(styles);
    } else {
      elementInfo.style.display = 'none';
      emptyState.style.display = 'block';
      styleContent.style.display = 'none';
    }

    // Update changes list
    const changesList = panel.querySelector('.lumos-changes-list');
    const changesCount = panel.querySelector('.lumos-changes-count');
    const undoBtn = panel.querySelector('.lumos-btn-undo');
    const prBtn = panel.querySelector('.lumos-btn-pr');

    changesCount.textContent = changes.length;
    undoBtn.disabled = changes.length === 0;
    prBtn.disabled = changes.length === 0;

    changesList.innerHTML = changes.slice(-3).reverse().map(c => `
      <div class="lumos-change-item">
        <div class="lumos-change-selector">${c.selector}</div>
        <div class="lumos-change-value">${c.property}: ${c.newValue}</div>
      </div>
    `).join('');
  }

  // Update style inputs with current values
  function updateStyleInputs(styles) {
    const inputs = {
      display: panel.querySelector('[data-prop="display"]'),
      position: panel.querySelector('[data-prop="position"]'),
      padding: panel.querySelector('[data-prop="padding"]'),
      margin: panel.querySelector('[data-prop="margin"]'),
      fontSize: panel.querySelector('[data-prop="font-size"]'),
      fontWeight: panel.querySelector('[data-prop="font-weight"]'),
      color: panel.querySelector('[data-prop="color"]'),
      colorText: panel.querySelector('[data-prop="color-text"]'),
      backgroundColor: panel.querySelector('[data-prop="background-color"]'),
      bgText: panel.querySelector('[data-prop="background-color-text"]'),
      borderRadius: panel.querySelector('[data-prop="border-radius"]'),
    };

    if (inputs.display) inputs.display.value = styles.display || '';
    if (inputs.position) inputs.position.value = styles.position || '';
    if (inputs.padding) inputs.padding.value = styles.padding || '';
    if (inputs.margin) inputs.margin.value = styles.margin || '';
    if (inputs.fontSize) inputs.fontSize.value = styles.fontSize || '';
    if (inputs.fontWeight) inputs.fontWeight.value = styles.fontWeight || '';
    if (inputs.color) inputs.color.value = styles.color || '#000000';
    if (inputs.colorText) inputs.colorText.value = styles.color || '';
    if (inputs.backgroundColor) inputs.backgroundColor.value = styles.backgroundColor || '#ffffff';
    if (inputs.bgText) inputs.bgText.value = styles.backgroundColor || '';
    if (inputs.borderRadius) inputs.borderRadius.value = styles.borderRadius || '';
  }

  // Create FAB (Floating Action Button)
  const fab = document.createElement('button');
  fab.className = 'lumos-fab';
  fab.innerHTML = icons.paintbrush;
  fab.onclick = togglePanel;
  document.body.appendChild(fab);

  // Create Panel
  const panel = document.createElement('div');
  panel.className = 'lumos-panel';
  panel.innerHTML = `
    <div class="lumos-panel-header">
      <div class="lumos-panel-title">
        ${icons.paintbrush}
        Lumos Inspector
      </div>
      <button class="lumos-panel-close">${icons.close}</button>
    </div>

    <div class="lumos-inspector-toggle">
      <label>
        ${icons.cursor}
        Select elements
      </label>
      <div class="lumos-toggle-switch"></div>
    </div>

    <div class="lumos-element-info" style="display: none;"></div>

    <div class="lumos-panel-content">
      <div class="lumos-empty">
        ${icons.cursor}
        <p>Enable inspector and click on any element to start editing its styles</p>
      </div>

      <div class="lumos-style-content" style="display: none;">
        <!-- Layout Section -->
        <div class="lumos-section">
          <div class="lumos-section-header">Layout</div>
          <div class="lumos-section-content">
            <div class="lumos-row">
              <div class="lumos-field">
                <label class="lumos-label">Display</label>
                <select class="lumos-select" data-prop="display">
                  <option value="">—</option>
                  <option value="block">block</option>
                  <option value="flex">flex</option>
                  <option value="grid">grid</option>
                  <option value="inline">inline</option>
                  <option value="inline-block">inline-block</option>
                  <option value="none">none</option>
                </select>
              </div>
              <div class="lumos-field">
                <label class="lumos-label">Position</label>
                <select class="lumos-select" data-prop="position">
                  <option value="">—</option>
                  <option value="static">static</option>
                  <option value="relative">relative</option>
                  <option value="absolute">absolute</option>
                  <option value="fixed">fixed</option>
                  <option value="sticky">sticky</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <!-- Spacing Section -->
        <div class="lumos-section">
          <div class="lumos-section-header">Spacing</div>
          <div class="lumos-section-content">
            <div class="lumos-row">
              <div class="lumos-field">
                <label class="lumos-label">Padding</label>
                <input type="text" class="lumos-input" data-prop="padding" placeholder="0px">
              </div>
              <div class="lumos-field">
                <label class="lumos-label">Margin</label>
                <input type="text" class="lumos-input" data-prop="margin" placeholder="0px">
              </div>
            </div>
          </div>
        </div>

        <!-- Typography Section -->
        <div class="lumos-section">
          <div class="lumos-section-header">Typography</div>
          <div class="lumos-section-content">
            <div class="lumos-row">
              <div class="lumos-field">
                <label class="lumos-label">Font Size</label>
                <input type="text" class="lumos-input" data-prop="font-size" placeholder="16px">
              </div>
              <div class="lumos-field">
                <label class="lumos-label">Font Weight</label>
                <select class="lumos-select" data-prop="font-weight">
                  <option value="">—</option>
                  <option value="300">Light</option>
                  <option value="400">Normal</option>
                  <option value="500">Medium</option>
                  <option value="600">Semibold</option>
                  <option value="700">Bold</option>
                </select>
              </div>
            </div>
            <div class="lumos-row">
              <div class="lumos-field full">
                <label class="lumos-label">Text Color</label>
                <div class="lumos-color-row">
                  <div class="lumos-color-swatch">
                    <input type="color" data-prop="color" value="#000000">
                  </div>
                  <input type="text" class="lumos-input" data-prop="color-text" placeholder="#000000" style="flex:1">
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Background Section -->
        <div class="lumos-section">
          <div class="lumos-section-header">Background</div>
          <div class="lumos-section-content">
            <div class="lumos-row">
              <div class="lumos-field full">
                <label class="lumos-label">Background Color</label>
                <div class="lumos-color-row">
                  <div class="lumos-color-swatch">
                    <input type="color" data-prop="background-color" value="#ffffff">
                  </div>
                  <input type="text" class="lumos-input" data-prop="background-color-text" placeholder="transparent" style="flex:1">
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Border Section -->
        <div class="lumos-section">
          <div class="lumos-section-header">Border</div>
          <div class="lumos-section-content">
            <div class="lumos-row">
              <div class="lumos-field full">
                <label class="lumos-label">Border Radius</label>
                <input type="text" class="lumos-input" data-prop="border-radius" placeholder="0px">
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="lumos-changes">
      <div class="lumos-changes-header">
        <span class="lumos-changes-title">Changes</span>
        <span class="lumos-changes-count">0</span>
      </div>
      <div class="lumos-changes-list"></div>
    </div>

    <div class="lumos-actions">
      <button class="lumos-btn lumos-btn-secondary lumos-btn-undo" disabled>
        ${icons.undo}
        Undo
      </button>
      <button class="lumos-btn lumos-btn-primary lumos-btn-pr" disabled>
        ${icons.git}
        Create PR
      </button>
    </div>
  `;
  document.body.appendChild(panel);

  // Event: Close panel
  panel.querySelector('.lumos-panel-close').onclick = togglePanel;

  // Event: Toggle inspector
  panel.querySelector('.lumos-toggle-switch').onclick = toggleInspector;

  // Event: Undo button
  panel.querySelector('.lumos-btn-undo').onclick = undo;

  // Event: Create PR button
  panel.querySelector('.lumos-btn-pr').onclick = createPR;

  // Event: Style inputs
  panel.querySelectorAll('.lumos-select, .lumos-input').forEach(input => {
    const handler = () => {
      const prop = input.dataset.prop;
      if (!prop || !selectedElement) return;

      // Handle linked color inputs
      if (prop === 'color-text') {
        applyStyleChange('color', input.value);
        panel.querySelector('[data-prop="color"]').value = input.value;
      } else if (prop === 'background-color-text') {
        applyStyleChange('backgroundColor', input.value);
        panel.querySelector('[data-prop="background-color"]').value = input.value;
      } else if (prop === 'color' || prop === 'background-color') {
        const camelCase = prop === 'background-color' ? 'backgroundColor' : 'color';
        applyStyleChange(camelCase, input.value);
        const textInput = panel.querySelector(`[data-prop="${prop}-text"]`);
        if (textInput) textInput.value = input.value;
      } else {
        const camelCase = prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        applyStyleChange(camelCase, input.value);
      }
    };

    if (input.tagName === 'SELECT' || input.type === 'color') {
      input.onchange = handler;
    } else {
      input.onblur = handler;
      input.onkeydown = (e) => { if (e.key === 'Enter') handler(); };
    }
  });

  // Mouse events for element selection
  document.addEventListener('mouseover', (e) => {
    if (!inspectorEnabled) return;
    if (e.target === document.body || e.target === document.documentElement) return;
    if (e.target.closest('.lumos-fab, .lumos-panel, .lumos-toast')) return;

    if (hoveredElement && hoveredElement !== selectedElement) {
      hoveredElement.classList.remove('lumos-hover-outline');
    }
    hoveredElement = e.target;
    if (hoveredElement !== selectedElement) {
      hoveredElement.classList.add('lumos-hover-outline');
    }
  });

  document.addEventListener('mouseout', () => {
    if (hoveredElement && hoveredElement !== selectedElement) {
      hoveredElement.classList.remove('lumos-hover-outline');
    }
  });

  document.addEventListener('click', (e) => {
    if (!inspectorEnabled) return;
    if (e.target.closest('.lumos-fab, .lumos-panel, .lumos-toast')) return;

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

    updateUI();
  }, true);

  // Keyboard: Escape to toggle inspector
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (panelOpen) {
        togglePanel();
      } else if (inspectorEnabled) {
        toggleInspector();
      }
    }
  });

  console.log('[Lumos] Inspector loaded. Click the purple button to start editing.');
})();

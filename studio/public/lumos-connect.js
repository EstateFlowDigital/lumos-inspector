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
  let currentViewport = 'desktop';
  let currentTab = 'layout';

  // LocalStorage key for persistence
  const STORAGE_KEY = `lumos-changes-${sessionId || 'default'}`;

  // Load persisted changes
  function loadPersistedChanges() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        changes = data.changes || [];
        // Re-apply persisted changes
        changes.forEach(c => {
          const el = document.querySelector(c.selector);
          if (el) el.style[c.property] = c.newValue;
        });
        showToast(`Restored ${changes.length} changes`, 'success');
      }
    } catch (e) {
      console.warn('[Lumos] Failed to load persisted changes:', e);
    }
  }

  // Save changes to localStorage
  function persistChanges() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ changes, timestamp: Date.now() }));
    } catch (e) {
      console.warn('[Lumos] Failed to persist changes:', e);
    }
  }

  // Viewport sizes
  const viewports = {
    desktop: { width: '100%', label: 'Desktop' },
    tablet: { width: '768px', label: 'Tablet' },
    mobile: { width: '375px', label: 'Mobile' },
  };

  // Font stacks
  const fontFamilies = [
    { label: 'System', value: 'system-ui, -apple-system, sans-serif' },
    { label: 'Sans Serif', value: 'Arial, Helvetica, sans-serif' },
    { label: 'Serif', value: 'Georgia, Times, serif' },
    { label: 'Mono', value: 'ui-monospace, monospace' },
    { label: 'Inter', value: 'Inter, sans-serif' },
    { label: 'Roboto', value: 'Roboto, sans-serif' },
  ];

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

    /* Viewport Preview Mode */
    .lumos-viewport-active {
      margin: 0 auto !important;
      transition: max-width 0.3s ease;
      box-shadow: 0 0 0 1px #3f3f46;
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
      right: 360px;
    }
    .lumos-fab svg {
      width: 24px;
      height: 24px;
      stroke: white;
      fill: none;
    }

    /* Side Panel */
    .lumos-panel {
      position: fixed;
      top: 0;
      right: -340px;
      width: 340px;
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
      padding: 12px 16px;
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

    /* Toolbar */
    .lumos-toolbar {
      padding: 8px 16px;
      border-bottom: 1px solid #27272a;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      background: #09090b;
    }
    .lumos-toolbar-group {
      display: flex;
      align-items: center;
      gap: 4px;
      background: #27272a;
      border-radius: 6px;
      padding: 2px;
    }
    .lumos-toolbar-btn {
      background: none;
      border: none;
      color: #71717a;
      cursor: pointer;
      padding: 6px 8px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s;
    }
    .lumos-toolbar-btn:hover {
      color: #fafafa;
      background: #3f3f46;
    }
    .lumos-toolbar-btn.active {
      color: #fafafa;
      background: #8b5cf6;
    }
    .lumos-toolbar-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    .lumos-toolbar-btn svg {
      width: 16px;
      height: 16px;
    }

    /* Inspector Toggle */
    .lumos-inspector-toggle {
      padding: 10px 16px;
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
      padding: 10px 16px;
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

    /* Tabs */
    .lumos-tabs {
      display: flex;
      border-bottom: 1px solid #27272a;
      background: #18181b;
      overflow-x: auto;
    }
    .lumos-tab {
      flex: 1;
      min-width: 60px;
      padding: 10px 8px;
      background: none;
      border: none;
      color: #71717a;
      font-size: 11px;
      font-weight: 500;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      transition: all 0.15s;
      white-space: nowrap;
    }
    .lumos-tab:hover {
      color: #a1a1aa;
    }
    .lumos-tab.active {
      color: #fafafa;
      border-bottom-color: #8b5cf6;
    }

    /* Style Sections */
    .lumos-panel-content {
      flex: 1;
      overflow-y: auto;
      padding-bottom: 140px;
    }
    .lumos-tab-content {
      display: none;
    }
    .lumos-tab-content.active {
      display: block;
    }
    .lumos-section {
      border-bottom: 1px solid #27272a;
    }
    .lumos-section-header {
      padding: 10px 16px;
      font-size: 11px;
      font-weight: 600;
      color: #71717a;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      background: #18181b;
    }
    .lumos-section-content {
      padding: 10px 16px;
    }

    /* Form Controls */
    .lumos-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-bottom: 8px;
    }
    .lumos-row-3 {
      grid-template-columns: 1fr 1fr 1fr;
    }
    .lumos-row-4 {
      grid-template-columns: 1fr 1fr 1fr 1fr;
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
      font-size: 10px;
      color: #71717a;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .lumos-input {
      background: #27272a;
      border: 1px solid #3f3f46;
      border-radius: 6px;
      padding: 7px 10px;
      color: #fafafa;
      font-size: 12px;
      font-family: ui-monospace, monospace;
      outline: none;
      transition: border-color 0.2s;
      width: 100%;
      box-sizing: border-box;
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
      padding: 7px 10px;
      color: #fafafa;
      font-size: 12px;
      outline: none;
      cursor: pointer;
      width: 100%;
      box-sizing: border-box;
    }
    .lumos-select:focus {
      border-color: #8b5cf6;
    }

    /* 4-value input (padding/margin) */
    .lumos-quad-input {
      display: grid;
      grid-template-columns: 1fr 1fr;
      grid-template-rows: 1fr 1fr;
      gap: 4px;
      position: relative;
    }
    .lumos-quad-input input {
      text-align: center;
      padding: 6px 4px;
    }
    .lumos-quad-input .lumos-quad-label {
      position: absolute;
      font-size: 8px;
      color: #52525b;
      text-transform: uppercase;
    }
    .lumos-quad-input .top { grid-column: span 2; }
    .lumos-quad-input .bottom { grid-column: span 2; }

    /* Color Input */
    .lumos-color-row {
      display: flex;
      gap: 6px;
      align-items: center;
    }
    .lumos-color-swatch {
      width: 28px;
      height: 28px;
      border-radius: 6px;
      border: 2px solid #3f3f46;
      cursor: pointer;
      padding: 0;
      overflow: hidden;
      flex-shrink: 0;
    }
    .lumos-color-swatch input[type="color"] {
      width: 40px;
      height: 40px;
      margin: -6px;
      border: none;
      cursor: pointer;
    }

    /* Range Slider */
    .lumos-range-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .lumos-range {
      flex: 1;
      height: 4px;
      border-radius: 2px;
      background: #3f3f46;
      appearance: none;
      cursor: pointer;
    }
    .lumos-range::-webkit-slider-thumb {
      appearance: none;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: #8b5cf6;
      cursor: pointer;
    }
    .lumos-range-value {
      width: 45px;
      font-size: 11px;
      font-family: ui-monospace, monospace;
      text-align: right;
      color: #a1a1aa;
    }

    /* Box Shadow Builder */
    .lumos-shadow-inputs {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 4px;
      margin-bottom: 8px;
    }
    .lumos-shadow-inputs input {
      text-align: center;
      padding: 6px 4px;
      font-size: 11px;
    }
    .lumos-shadow-preview {
      height: 40px;
      background: #27272a;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .lumos-shadow-box {
      width: 60px;
      height: 24px;
      background: #fafafa;
      border-radius: 4px;
    }

    /* Changes List */
    .lumos-changes {
      padding: 10px 16px;
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
      padding: 6px 10px;
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
      background: linear-gradient(to top, #18181b 90%, transparent);
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .lumos-btn {
      flex: 1;
      min-width: 70px;
      padding: 10px 12px;
      border-radius: 8px;
      font-size: 11px;
      font-weight: 500;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
    }
    .lumos-btn svg {
      width: 14px;
      height: 14px;
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
    .lumos-btn-icon {
      flex: none;
      width: 36px;
      min-width: 36px;
      padding: 10px;
    }
    .lumos-btn-danger {
      background: #dc2626;
      color: white;
    }
    .lumos-btn-danger:hover {
      background: #b91c1c;
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
      margin: 0 auto 12px;
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

    /* Modal */
    .lumos-modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.7);
      z-index: 1000001;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.2s;
    }
    .lumos-modal-overlay.show {
      opacity: 1;
    }
    .lumos-modal {
      background: #18181b;
      border-radius: 12px;
      padding: 24px;
      max-width: 500px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
    }
    .lumos-modal h3 {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 16px;
    }
    .lumos-modal-actions {
      display: flex;
      gap: 8px;
      margin-top: 20px;
    }
  `;
  document.head.appendChild(style);

  // Icons
  const icons = {
    paintbrush: '<svg viewBox="0 0 24 24" stroke-width="2"><path d="M18.37 2.63L14 7l-1.59-1.59a2 2 0 0 0-2.82 0L8 7l9 9 1.59-1.59a2 2 0 0 0 0-2.82L17 10l4.37-4.37a2.12 2.12 0 1 0-3-3Z"/><path d="M9 8c-2 3-4 3.5-7 4l8 10c2-1 6-5 6-7"/><path d="M14.5 17.5 4.5 15"/></svg>',
    close: '<svg viewBox="0 0 24 24" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>',
    cursor: '<svg viewBox="0 0 24 24" stroke-width="2"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/><path d="M13 13l6 6"/></svg>',
    undo: '<svg viewBox="0 0 24 24" stroke-width="2"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>',
    redo: '<svg viewBox="0 0 24 24" stroke-width="2"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"/></svg>',
    save: '<svg viewBox="0 0 24 24" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17,21 17,13 7,13 7,21"/><polyline points="7,3 7,8 15,8"/></svg>',
    git: '<svg viewBox="0 0 24 24" stroke-width="2"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 0 1 2 2v7"/><path d="M6 9v12"/></svg>',
    check: '<svg viewBox="0 0 24 24" stroke-width="2"><polyline points="20,6 9,17 4,12"/></svg>',
    monitor: '<svg viewBox="0 0 24 24" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>',
    tablet: '<svg viewBox="0 0 24 24" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="12" y1="18" x2="12" y2="18"/></svg>',
    phone: '<svg viewBox="0 0 24 24" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12" y2="18"/></svg>',
    trash: '<svg viewBox="0 0 24 24" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
    copy: '<svg viewBox="0 0 24 24" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
    download: '<svg viewBox="0 0 24 24" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
    upload: '<svg viewBox="0 0 24 24" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17,8 12,3 7,8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>',
    github: '<svg viewBox="0 0 24 24" stroke-width="2"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>',
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
      // Layout
      display: computed.display,
      position: computed.position,
      flexDirection: computed.flexDirection,
      flexWrap: computed.flexWrap,
      justifyContent: computed.justifyContent,
      alignItems: computed.alignItems,
      gap: computed.gap,
      // Flex item
      flexGrow: computed.flexGrow,
      flexShrink: computed.flexShrink,
      flexBasis: computed.flexBasis,
      order: computed.order,
      alignSelf: computed.alignSelf,
      // Grid
      gridTemplateColumns: computed.gridTemplateColumns,
      gridTemplateRows: computed.gridTemplateRows,
      gridColumn: computed.gridColumn,
      gridRow: computed.gridRow,
      // Sizing
      width: computed.width,
      height: computed.height,
      minWidth: computed.minWidth,
      maxWidth: computed.maxWidth,
      minHeight: computed.minHeight,
      maxHeight: computed.maxHeight,
      // Spacing
      padding: computed.padding,
      paddingTop: computed.paddingTop,
      paddingRight: computed.paddingRight,
      paddingBottom: computed.paddingBottom,
      paddingLeft: computed.paddingLeft,
      margin: computed.margin,
      marginTop: computed.marginTop,
      marginRight: computed.marginRight,
      marginBottom: computed.marginBottom,
      marginLeft: computed.marginLeft,
      // Typography
      fontFamily: computed.fontFamily,
      fontSize: computed.fontSize,
      fontWeight: computed.fontWeight,
      lineHeight: computed.lineHeight,
      letterSpacing: computed.letterSpacing,
      textAlign: computed.textAlign,
      textDecoration: computed.textDecoration,
      textTransform: computed.textTransform,
      whiteSpace: computed.whiteSpace,
      color: rgbToHex(computed.color),
      // Background
      backgroundColor: rgbToHex(computed.backgroundColor),
      // Border
      borderRadius: computed.borderRadius,
      borderWidth: computed.borderWidth,
      borderStyle: computed.borderStyle,
      borderColor: rgbToHex(computed.borderColor),
      // Effects
      opacity: computed.opacity,
      boxShadow: computed.boxShadow,
      // Positioning
      zIndex: computed.zIndex,
      overflow: computed.overflow,
      overflowX: computed.overflowX,
      overflowY: computed.overflowY,
      visibility: computed.visibility,
      cursor: computed.cursor,
      pointerEvents: computed.pointerEvents,
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
    const camelCase = property.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    const oldValue = selectedElement.style[camelCase] || getComputedStyle(selectedElement)[camelCase];

    selectedElement.style[camelCase] = value;

    const change = {
      id: Date.now().toString(36),
      selector,
      property: camelCase,
      oldValue,
      newValue: value,
      timestamp: Date.now(),
    };

    changes.push(change);
    undoStack = [];
    persistChanges();
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
    persistChanges();
    updateUI();
  }

  // Redo last undone change
  function redo() {
    if (undoStack.length === 0) return;
    const change = undoStack.pop();
    const el = document.querySelector(change.selector);
    if (el) {
      el.style[change.property] = change.newValue;
    }
    changes.push(change);
    persistChanges();
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
    localStorage.removeItem(STORAGE_KEY);
    updateUI();
    showToast('All changes cleared');
  }

  // Copy CSS to clipboard
  function copyCss() {
    if (changes.length === 0) {
      showToast('No changes to copy', 'error');
      return;
    }

    // Group changes by selector
    const grouped = {};
    changes.forEach(c => {
      if (!grouped[c.selector]) grouped[c.selector] = {};
      grouped[c.selector][c.property] = c.newValue;
    });

    // Generate CSS
    let css = '';
    Object.entries(grouped).forEach(([selector, props]) => {
      css += `${selector} {\n`;
      Object.entries(props).forEach(([prop, val]) => {
        const kebab = prop.replace(/([A-Z])/g, '-$1').toLowerCase();
        css += `  ${kebab}: ${val};\n`;
      });
      css += '}\n\n';
    });

    navigator.clipboard.writeText(css);
    showToast('CSS copied to clipboard!', 'success');
  }

  // Export changes as JSON
  function exportChanges() {
    if (changes.length === 0) {
      showToast('No changes to export', 'error');
      return;
    }

    const data = JSON.stringify({ changes, exportedAt: new Date().toISOString() }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lumos-changes-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Changes exported!', 'success');
  }

  // Open Lumos Studio to create a PR
  function openCreatePR() {
    if (changes.length === 0) {
      showToast('No changes to commit', 'error');
      return;
    }

    // Generate CSS from changes
    const grouped = {};
    changes.forEach(c => {
      if (!grouped[c.selector]) grouped[c.selector] = {};
      grouped[c.selector][c.property] = c.newValue;
    });

    let css = '';
    Object.entries(grouped).forEach(([selector, props]) => {
      css += `${selector} {\n`;
      Object.entries(props).forEach(([prop, val]) => {
        const kebab = prop.replace(/([A-Z])/g, '-$1').toLowerCase();
        css += `  ${kebab}: ${val};\n`;
      });
      css += '}\n\n';
    });

    // Encode data for URL
    const payload = {
      css,
      changes,
      sourceUrl: window.location.href,
      sessionId,
      timestamp: Date.now(),
    };

    // Compress and encode
    const encoded = btoa(encodeURIComponent(JSON.stringify(payload)));

    // Open Lumos Studio create-pr page
    const prUrl = `${studioUrl}/create-pr?data=${encoded}`;
    window.open(prUrl, '_blank');
    showToast('Opening Lumos Studio...', 'success');
  }

  // Import changes from JSON
  function importChanges() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const data = JSON.parse(evt.target.result);
          if (data.changes && Array.isArray(data.changes)) {
            // Apply imported changes
            data.changes.forEach(c => {
              const el = document.querySelector(c.selector);
              if (el) el.style[c.property] = c.newValue;
            });
            changes = [...changes, ...data.changes];
            persistChanges();
            updateUI();
            showToast(`Imported ${data.changes.length} changes`, 'success');
          }
        } catch (err) {
          showToast('Invalid file format', 'error');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  // Set viewport
  function setViewport(size) {
    currentViewport = size;
    const body = document.body;

    if (size === 'desktop') {
      body.style.maxWidth = '';
      body.classList.remove('lumos-viewport-active');
    } else {
      body.style.maxWidth = viewports[size].width;
      body.classList.add('lumos-viewport-active');
    }

    updateViewportButtons();
  }

  // Update viewport button states
  function updateViewportButtons() {
    panel.querySelectorAll('.lumos-viewport-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.viewport === currentViewport);
    });
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

  // Switch tab
  function switchTab(tabId) {
    currentTab = tabId;
    panel.querySelectorAll('.lumos-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.tab === tabId);
    });
    panel.querySelectorAll('.lumos-tab-content').forEach(c => {
      c.classList.toggle('active', c.dataset.tab === tabId);
    });
  }

  // Update UI
  function updateUI() {
    // Update toggle switch
    const toggle = panel.querySelector('.lumos-toggle-switch');
    if (toggle) toggle.classList.toggle('active', inspectorEnabled);

    // Update element info
    const elementInfo = panel.querySelector('.lumos-element-info');
    const emptyState = panel.querySelector('.lumos-empty');
    const tabsContainer = panel.querySelector('.lumos-tabs');

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
      tabsContainer.style.display = 'flex';
      panel.querySelectorAll('.lumos-tab-content').forEach(c => {
        if (c.classList.contains('active')) c.style.display = 'block';
      });

      // Update style inputs
      updateStyleInputs(styles);
    } else {
      elementInfo.style.display = 'none';
      emptyState.style.display = 'block';
      tabsContainer.style.display = 'none';
      panel.querySelectorAll('.lumos-tab-content').forEach(c => c.style.display = 'none');
    }

    // Update changes list
    const changesList = panel.querySelector('.lumos-changes-list');
    const changesCount = panel.querySelector('.lumos-changes-count');
    const undoBtn = panel.querySelector('.lumos-btn-undo');
    const redoBtn = panel.querySelector('.lumos-btn-redo');
    const copyBtn = panel.querySelector('.lumos-btn-copy');
    const exportBtn = panel.querySelector('.lumos-btn-export');
    const prBtn = panel.querySelector('.lumos-btn-pr');

    changesCount.textContent = changes.length;
    if (undoBtn) undoBtn.disabled = changes.length === 0;
    if (redoBtn) redoBtn.disabled = undoStack.length === 0;
    if (copyBtn) copyBtn.disabled = changes.length === 0;
    if (exportBtn) exportBtn.disabled = changes.length === 0;
    if (prBtn) prBtn.disabled = changes.length === 0;

    changesList.innerHTML = changes.slice(-3).reverse().map(c => `
      <div class="lumos-change-item">
        <div class="lumos-change-selector">${c.selector}</div>
        <div class="lumos-change-value">${c.property}: ${c.newValue}</div>
      </div>
    `).join('');
  }

  // Update style inputs with current values
  function updateStyleInputs(styles) {
    const setVal = (prop, val) => {
      const input = panel.querySelector(`[data-prop="${prop}"]`);
      if (input) {
        if (input.type === 'color') {
          input.value = val || '#000000';
        } else if (input.type === 'range') {
          input.value = parseFloat(val) || 0;
        } else {
          input.value = val || '';
        }
      }
    };

    // Layout
    setVal('display', styles.display);
    setVal('position', styles.position);
    setVal('flex-direction', styles.flexDirection);
    setVal('flex-wrap', styles.flexWrap);
    setVal('justify-content', styles.justifyContent);
    setVal('align-items', styles.alignItems);
    setVal('gap', styles.gap);

    // Flex item
    setVal('flex-grow', styles.flexGrow);
    setVal('flex-shrink', styles.flexShrink);
    setVal('flex-basis', styles.flexBasis);
    setVal('order', styles.order);
    setVal('align-self', styles.alignSelf);

    // Grid
    setVal('grid-template-columns', styles.gridTemplateColumns);
    setVal('grid-template-rows', styles.gridTemplateRows);

    // Sizing
    setVal('width', styles.width);
    setVal('height', styles.height);
    setVal('min-width', styles.minWidth);
    setVal('max-width', styles.maxWidth);
    setVal('min-height', styles.minHeight);
    setVal('max-height', styles.maxHeight);

    // Spacing
    setVal('padding', styles.padding);
    setVal('padding-top', styles.paddingTop);
    setVal('padding-right', styles.paddingRight);
    setVal('padding-bottom', styles.paddingBottom);
    setVal('padding-left', styles.paddingLeft);
    setVal('margin', styles.margin);
    setVal('margin-top', styles.marginTop);
    setVal('margin-right', styles.marginRight);
    setVal('margin-bottom', styles.marginBottom);
    setVal('margin-left', styles.marginLeft);

    // Typography
    setVal('font-family', styles.fontFamily);
    setVal('font-size', styles.fontSize);
    setVal('font-weight', styles.fontWeight);
    setVal('line-height', styles.lineHeight);
    setVal('letter-spacing', styles.letterSpacing);
    setVal('text-align', styles.textAlign);
    setVal('text-decoration', styles.textDecoration);
    setVal('text-transform', styles.textTransform);
    setVal('white-space', styles.whiteSpace);
    setVal('color', styles.color);
    setVal('color-text', styles.color);

    // Background
    setVal('background-color', styles.backgroundColor);
    setVal('background-color-text', styles.backgroundColor);

    // Border
    setVal('border-radius', styles.borderRadius);
    setVal('border-width', styles.borderWidth);
    setVal('border-style', styles.borderStyle);
    setVal('border-color', styles.borderColor);
    setVal('border-color-text', styles.borderColor);

    // Effects
    setVal('opacity', styles.opacity);
    setVal('box-shadow', styles.boxShadow);

    // Positioning
    setVal('z-index', styles.zIndex);
    setVal('overflow', styles.overflow);
    setVal('visibility', styles.visibility);
    setVal('cursor', styles.cursor);
    setVal('pointer-events', styles.pointerEvents);
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

    <div class="lumos-toolbar">
      <div class="lumos-toolbar-group">
        <button class="lumos-toolbar-btn lumos-viewport-btn active" data-viewport="desktop" title="Desktop">${icons.monitor}</button>
        <button class="lumos-toolbar-btn lumos-viewport-btn" data-viewport="tablet" title="Tablet">${icons.tablet}</button>
        <button class="lumos-toolbar-btn lumos-viewport-btn" data-viewport="mobile" title="Mobile">${icons.phone}</button>
      </div>
      <div class="lumos-toolbar-group">
        <button class="lumos-toolbar-btn lumos-btn-undo" title="Undo (Ctrl+Z)" disabled>${icons.undo}</button>
        <button class="lumos-toolbar-btn lumos-btn-redo" title="Redo (Ctrl+Shift+Z)" disabled>${icons.redo}</button>
      </div>
    </div>

    <div class="lumos-inspector-toggle">
      <label>
        ${icons.cursor}
        Select elements
      </label>
      <div class="lumos-toggle-switch"></div>
    </div>

    <div class="lumos-element-info" style="display: none;"></div>

    <div class="lumos-tabs" style="display: none;">
      <button class="lumos-tab active" data-tab="layout">Layout</button>
      <button class="lumos-tab" data-tab="spacing">Space</button>
      <button class="lumos-tab" data-tab="typography">Text</button>
      <button class="lumos-tab" data-tab="style">Style</button>
      <button class="lumos-tab" data-tab="effects">FX</button>
    </div>

    <div class="lumos-panel-content">
      <div class="lumos-empty">
        ${icons.cursor}
        <p>Enable inspector and click on any element to start editing its styles</p>
      </div>

      <!-- Layout Tab -->
      <div class="lumos-tab-content active" data-tab="layout" style="display: none;">
        <div class="lumos-section">
          <div class="lumos-section-header">Display & Position</div>
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
                  <option value="inline-flex">inline-flex</option>
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
            <div class="lumos-row">
              <div class="lumos-field">
                <label class="lumos-label">Z-Index</label>
                <input type="text" class="lumos-input" data-prop="z-index" placeholder="auto">
              </div>
              <div class="lumos-field">
                <label class="lumos-label">Overflow</label>
                <select class="lumos-select" data-prop="overflow">
                  <option value="">—</option>
                  <option value="visible">visible</option>
                  <option value="hidden">hidden</option>
                  <option value="scroll">scroll</option>
                  <option value="auto">auto</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div class="lumos-section">
          <div class="lumos-section-header">Flexbox</div>
          <div class="lumos-section-content">
            <div class="lumos-row">
              <div class="lumos-field">
                <label class="lumos-label">Direction</label>
                <select class="lumos-select" data-prop="flex-direction">
                  <option value="">—</option>
                  <option value="row">row</option>
                  <option value="row-reverse">row-reverse</option>
                  <option value="column">column</option>
                  <option value="column-reverse">column-reverse</option>
                </select>
              </div>
              <div class="lumos-field">
                <label class="lumos-label">Wrap</label>
                <select class="lumos-select" data-prop="flex-wrap">
                  <option value="">—</option>
                  <option value="nowrap">nowrap</option>
                  <option value="wrap">wrap</option>
                  <option value="wrap-reverse">wrap-reverse</option>
                </select>
              </div>
            </div>
            <div class="lumos-row">
              <div class="lumos-field">
                <label class="lumos-label">Justify</label>
                <select class="lumos-select" data-prop="justify-content">
                  <option value="">—</option>
                  <option value="flex-start">start</option>
                  <option value="center">center</option>
                  <option value="flex-end">end</option>
                  <option value="space-between">between</option>
                  <option value="space-around">around</option>
                  <option value="space-evenly">evenly</option>
                </select>
              </div>
              <div class="lumos-field">
                <label class="lumos-label">Align</label>
                <select class="lumos-select" data-prop="align-items">
                  <option value="">—</option>
                  <option value="flex-start">start</option>
                  <option value="center">center</option>
                  <option value="flex-end">end</option>
                  <option value="stretch">stretch</option>
                  <option value="baseline">baseline</option>
                </select>
              </div>
            </div>
            <div class="lumos-row">
              <div class="lumos-field full">
                <label class="lumos-label">Gap</label>
                <input type="text" class="lumos-input" data-prop="gap" placeholder="0px">
              </div>
            </div>
          </div>
        </div>

        <div class="lumos-section">
          <div class="lumos-section-header">Flex Item</div>
          <div class="lumos-section-content">
            <div class="lumos-row lumos-row-3">
              <div class="lumos-field">
                <label class="lumos-label">Grow</label>
                <input type="text" class="lumos-input" data-prop="flex-grow" placeholder="0">
              </div>
              <div class="lumos-field">
                <label class="lumos-label">Shrink</label>
                <input type="text" class="lumos-input" data-prop="flex-shrink" placeholder="1">
              </div>
              <div class="lumos-field">
                <label class="lumos-label">Basis</label>
                <input type="text" class="lumos-input" data-prop="flex-basis" placeholder="auto">
              </div>
            </div>
            <div class="lumos-row">
              <div class="lumos-field">
                <label class="lumos-label">Order</label>
                <input type="text" class="lumos-input" data-prop="order" placeholder="0">
              </div>
              <div class="lumos-field">
                <label class="lumos-label">Align Self</label>
                <select class="lumos-select" data-prop="align-self">
                  <option value="">—</option>
                  <option value="auto">auto</option>
                  <option value="flex-start">start</option>
                  <option value="center">center</option>
                  <option value="flex-end">end</option>
                  <option value="stretch">stretch</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div class="lumos-section">
          <div class="lumos-section-header">Grid</div>
          <div class="lumos-section-content">
            <div class="lumos-row">
              <div class="lumos-field full">
                <label class="lumos-label">Columns</label>
                <input type="text" class="lumos-input" data-prop="grid-template-columns" placeholder="repeat(3, 1fr)">
              </div>
            </div>
            <div class="lumos-row">
              <div class="lumos-field full">
                <label class="lumos-label">Rows</label>
                <input type="text" class="lumos-input" data-prop="grid-template-rows" placeholder="auto">
              </div>
            </div>
          </div>
        </div>

        <div class="lumos-section">
          <div class="lumos-section-header">Size</div>
          <div class="lumos-section-content">
            <div class="lumos-row">
              <div class="lumos-field">
                <label class="lumos-label">Width</label>
                <input type="text" class="lumos-input" data-prop="width" placeholder="auto">
              </div>
              <div class="lumos-field">
                <label class="lumos-label">Height</label>
                <input type="text" class="lumos-input" data-prop="height" placeholder="auto">
              </div>
            </div>
            <div class="lumos-row">
              <div class="lumos-field">
                <label class="lumos-label">Min W</label>
                <input type="text" class="lumos-input" data-prop="min-width" placeholder="0">
              </div>
              <div class="lumos-field">
                <label class="lumos-label">Max W</label>
                <input type="text" class="lumos-input" data-prop="max-width" placeholder="none">
              </div>
            </div>
            <div class="lumos-row">
              <div class="lumos-field">
                <label class="lumos-label">Min H</label>
                <input type="text" class="lumos-input" data-prop="min-height" placeholder="0">
              </div>
              <div class="lumos-field">
                <label class="lumos-label">Max H</label>
                <input type="text" class="lumos-input" data-prop="max-height" placeholder="none">
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Spacing Tab -->
      <div class="lumos-tab-content" data-tab="spacing">
        <div class="lumos-section">
          <div class="lumos-section-header">Padding</div>
          <div class="lumos-section-content">
            <div class="lumos-row">
              <div class="lumos-field full">
                <label class="lumos-label">All Sides</label>
                <input type="text" class="lumos-input" data-prop="padding" placeholder="0px">
              </div>
            </div>
            <div class="lumos-row lumos-row-4">
              <div class="lumos-field">
                <label class="lumos-label">Top</label>
                <input type="text" class="lumos-input" data-prop="padding-top" placeholder="0">
              </div>
              <div class="lumos-field">
                <label class="lumos-label">Right</label>
                <input type="text" class="lumos-input" data-prop="padding-right" placeholder="0">
              </div>
              <div class="lumos-field">
                <label class="lumos-label">Bottom</label>
                <input type="text" class="lumos-input" data-prop="padding-bottom" placeholder="0">
              </div>
              <div class="lumos-field">
                <label class="lumos-label">Left</label>
                <input type="text" class="lumos-input" data-prop="padding-left" placeholder="0">
              </div>
            </div>
          </div>
        </div>

        <div class="lumos-section">
          <div class="lumos-section-header">Margin</div>
          <div class="lumos-section-content">
            <div class="lumos-row">
              <div class="lumos-field full">
                <label class="lumos-label">All Sides</label>
                <input type="text" class="lumos-input" data-prop="margin" placeholder="0px">
              </div>
            </div>
            <div class="lumos-row lumos-row-4">
              <div class="lumos-field">
                <label class="lumos-label">Top</label>
                <input type="text" class="lumos-input" data-prop="margin-top" placeholder="0">
              </div>
              <div class="lumos-field">
                <label class="lumos-label">Right</label>
                <input type="text" class="lumos-input" data-prop="margin-right" placeholder="0">
              </div>
              <div class="lumos-field">
                <label class="lumos-label">Bottom</label>
                <input type="text" class="lumos-input" data-prop="margin-bottom" placeholder="0">
              </div>
              <div class="lumos-field">
                <label class="lumos-label">Left</label>
                <input type="text" class="lumos-input" data-prop="margin-left" placeholder="0">
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Typography Tab -->
      <div class="lumos-tab-content" data-tab="typography">
        <div class="lumos-section">
          <div class="lumos-section-header">Font</div>
          <div class="lumos-section-content">
            <div class="lumos-row">
              <div class="lumos-field full">
                <label class="lumos-label">Font Family</label>
                <select class="lumos-select" data-prop="font-family">
                  <option value="">—</option>
                  <option value="system-ui, -apple-system, sans-serif">System</option>
                  <option value="Arial, Helvetica, sans-serif">Sans Serif</option>
                  <option value="Georgia, Times, serif">Serif</option>
                  <option value="ui-monospace, monospace">Mono</option>
                  <option value="Inter, sans-serif">Inter</option>
                  <option value="Roboto, sans-serif">Roboto</option>
                </select>
              </div>
            </div>
            <div class="lumos-row">
              <div class="lumos-field">
                <label class="lumos-label">Size</label>
                <input type="text" class="lumos-input" data-prop="font-size" placeholder="16px">
              </div>
              <div class="lumos-field">
                <label class="lumos-label">Weight</label>
                <select class="lumos-select" data-prop="font-weight">
                  <option value="">—</option>
                  <option value="100">Thin</option>
                  <option value="300">Light</option>
                  <option value="400">Normal</option>
                  <option value="500">Medium</option>
                  <option value="600">Semibold</option>
                  <option value="700">Bold</option>
                  <option value="900">Black</option>
                </select>
              </div>
            </div>
            <div class="lumos-row">
              <div class="lumos-field">
                <label class="lumos-label">Line Height</label>
                <input type="text" class="lumos-input" data-prop="line-height" placeholder="1.5">
              </div>
              <div class="lumos-field">
                <label class="lumos-label">Spacing</label>
                <input type="text" class="lumos-input" data-prop="letter-spacing" placeholder="0px">
              </div>
            </div>
          </div>
        </div>

        <div class="lumos-section">
          <div class="lumos-section-header">Text Style</div>
          <div class="lumos-section-content">
            <div class="lumos-row">
              <div class="lumos-field">
                <label class="lumos-label">Align</label>
                <select class="lumos-select" data-prop="text-align">
                  <option value="">—</option>
                  <option value="left">left</option>
                  <option value="center">center</option>
                  <option value="right">right</option>
                  <option value="justify">justify</option>
                </select>
              </div>
              <div class="lumos-field">
                <label class="lumos-label">Transform</label>
                <select class="lumos-select" data-prop="text-transform">
                  <option value="">—</option>
                  <option value="none">none</option>
                  <option value="uppercase">uppercase</option>
                  <option value="lowercase">lowercase</option>
                  <option value="capitalize">capitalize</option>
                </select>
              </div>
            </div>
            <div class="lumos-row">
              <div class="lumos-field">
                <label class="lumos-label">Decoration</label>
                <select class="lumos-select" data-prop="text-decoration">
                  <option value="">—</option>
                  <option value="none">none</option>
                  <option value="underline">underline</option>
                  <option value="line-through">line-through</option>
                  <option value="overline">overline</option>
                </select>
              </div>
              <div class="lumos-field">
                <label class="lumos-label">White Space</label>
                <select class="lumos-select" data-prop="white-space">
                  <option value="">—</option>
                  <option value="normal">normal</option>
                  <option value="nowrap">nowrap</option>
                  <option value="pre">pre</option>
                  <option value="pre-wrap">pre-wrap</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div class="lumos-section">
          <div class="lumos-section-header">Color</div>
          <div class="lumos-section-content">
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
      </div>

      <!-- Style Tab -->
      <div class="lumos-tab-content" data-tab="style">
        <div class="lumos-section">
          <div class="lumos-section-header">Background</div>
          <div class="lumos-section-content">
            <div class="lumos-row">
              <div class="lumos-field full">
                <label class="lumos-label">Color</label>
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

        <div class="lumos-section">
          <div class="lumos-section-header">Border</div>
          <div class="lumos-section-content">
            <div class="lumos-row">
              <div class="lumos-field">
                <label class="lumos-label">Width</label>
                <input type="text" class="lumos-input" data-prop="border-width" placeholder="0px">
              </div>
              <div class="lumos-field">
                <label class="lumos-label">Style</label>
                <select class="lumos-select" data-prop="border-style">
                  <option value="">—</option>
                  <option value="none">none</option>
                  <option value="solid">solid</option>
                  <option value="dashed">dashed</option>
                  <option value="dotted">dotted</option>
                </select>
              </div>
            </div>
            <div class="lumos-row">
              <div class="lumos-field full">
                <label class="lumos-label">Color</label>
                <div class="lumos-color-row">
                  <div class="lumos-color-swatch">
                    <input type="color" data-prop="border-color" value="#000000">
                  </div>
                  <input type="text" class="lumos-input" data-prop="border-color-text" placeholder="#000000" style="flex:1">
                </div>
              </div>
            </div>
            <div class="lumos-row">
              <div class="lumos-field full">
                <label class="lumos-label">Radius</label>
                <input type="text" class="lumos-input" data-prop="border-radius" placeholder="0px">
              </div>
            </div>
          </div>
        </div>

        <div class="lumos-section">
          <div class="lumos-section-header">Visibility</div>
          <div class="lumos-section-content">
            <div class="lumos-row">
              <div class="lumos-field">
                <label class="lumos-label">Visibility</label>
                <select class="lumos-select" data-prop="visibility">
                  <option value="">—</option>
                  <option value="visible">visible</option>
                  <option value="hidden">hidden</option>
                </select>
              </div>
              <div class="lumos-field">
                <label class="lumos-label">Pointer Events</label>
                <select class="lumos-select" data-prop="pointer-events">
                  <option value="">—</option>
                  <option value="auto">auto</option>
                  <option value="none">none</option>
                </select>
              </div>
            </div>
            <div class="lumos-row">
              <div class="lumos-field full">
                <label class="lumos-label">Cursor</label>
                <select class="lumos-select" data-prop="cursor">
                  <option value="">—</option>
                  <option value="auto">auto</option>
                  <option value="default">default</option>
                  <option value="pointer">pointer</option>
                  <option value="move">move</option>
                  <option value="text">text</option>
                  <option value="wait">wait</option>
                  <option value="not-allowed">not-allowed</option>
                  <option value="grab">grab</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Effects Tab -->
      <div class="lumos-tab-content" data-tab="effects">
        <div class="lumos-section">
          <div class="lumos-section-header">Opacity</div>
          <div class="lumos-section-content">
            <div class="lumos-range-row">
              <input type="range" class="lumos-range" data-prop="opacity" min="0" max="1" step="0.01" value="1">
              <span class="lumos-range-value">1</span>
            </div>
          </div>
        </div>

        <div class="lumos-section">
          <div class="lumos-section-header">Box Shadow</div>
          <div class="lumos-section-content">
            <div class="lumos-row">
              <div class="lumos-field full">
                <label class="lumos-label">Shadow</label>
                <input type="text" class="lumos-input" data-prop="box-shadow" placeholder="0 4px 6px rgba(0,0,0,0.1)">
              </div>
            </div>
            <div class="lumos-shadow-preview">
              <div class="lumos-shadow-box" id="lumos-shadow-preview-box"></div>
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
      <button class="lumos-btn lumos-btn-secondary lumos-btn-icon lumos-btn-copy" title="Copy CSS" disabled>
        ${icons.copy}
      </button>
      <button class="lumos-btn lumos-btn-secondary lumos-btn-icon lumos-btn-export" title="Export JSON" disabled>
        ${icons.download}
      </button>
      <button class="lumos-btn lumos-btn-secondary lumos-btn-icon lumos-btn-import" title="Import JSON">
        ${icons.upload}
      </button>
      <button class="lumos-btn lumos-btn-secondary lumos-btn-icon lumos-btn-clear" title="Clear All">
        ${icons.trash}
      </button>
      <button class="lumos-btn lumos-btn-primary lumos-btn-pr" disabled>
        ${icons.github}
        Create PR
      </button>
    </div>
  `;
  document.body.appendChild(panel);

  // Event: Close panel
  panel.querySelector('.lumos-panel-close').onclick = togglePanel;

  // Event: Toggle inspector
  panel.querySelector('.lumos-toggle-switch').onclick = toggleInspector;

  // Event: Viewport buttons
  panel.querySelectorAll('.lumos-viewport-btn').forEach(btn => {
    btn.onclick = () => setViewport(btn.dataset.viewport);
  });

  // Event: Undo/Redo buttons in toolbar
  panel.querySelector('.lumos-toolbar .lumos-btn-undo').onclick = undo;
  panel.querySelector('.lumos-toolbar .lumos-btn-redo').onclick = redo;

  // Event: Tab switching
  panel.querySelectorAll('.lumos-tab').forEach(tab => {
    tab.onclick = () => switchTab(tab.dataset.tab);
  });

  // Event: Copy CSS button
  panel.querySelector('.lumos-btn-copy').onclick = copyCss;

  // Event: Export button
  panel.querySelector('.lumos-btn-export').onclick = exportChanges;

  // Event: Import button
  panel.querySelector('.lumos-btn-import').onclick = importChanges;

  // Event: Clear button
  panel.querySelector('.lumos-btn-clear').onclick = clearChanges;

  // Event: Create PR button
  panel.querySelector('.lumos-btn-pr').onclick = openCreatePR;

  // Event: Opacity slider
  const opacitySlider = panel.querySelector('[data-prop="opacity"]');
  if (opacitySlider && opacitySlider.type === 'range') {
    opacitySlider.oninput = (e) => {
      const val = e.target.value;
      panel.querySelector('.lumos-range-value').textContent = val;
      if (selectedElement) {
        applyStyleChange('opacity', val);
      }
    };
  }

  // Event: Box shadow preview
  const shadowInput = panel.querySelector('[data-prop="box-shadow"]');
  if (shadowInput) {
    shadowInput.oninput = (e) => {
      const previewBox = document.getElementById('lumos-shadow-preview-box');
      if (previewBox) previewBox.style.boxShadow = e.target.value;
    };
  }

  // Event: Style inputs
  panel.querySelectorAll('.lumos-select, .lumos-input').forEach(input => {
    const handler = () => {
      const prop = input.dataset.prop;
      if (!prop || !selectedElement) return;

      // Skip opacity slider (handled separately)
      if (prop === 'opacity' && input.type === 'range') return;

      // Handle linked color inputs
      if (prop.endsWith('-text')) {
        const baseProp = prop.replace('-text', '');
        const colorInput = panel.querySelector(`[data-prop="${baseProp}"]`);
        applyStyleChange(baseProp, input.value);
        if (colorInput) colorInput.value = input.value;
      } else if (input.type === 'color') {
        applyStyleChange(prop, input.value);
        const textInput = panel.querySelector(`[data-prop="${prop}-text"]`);
        if (textInput) textInput.value = input.value;
      } else {
        applyStyleChange(prop, input.value);
      }
    };

    if (input.tagName === 'SELECT' || input.type === 'color') {
      input.onchange = handler;
    } else if (input.type !== 'range') {
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

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Escape to close/disable
    if (e.key === 'Escape') {
      if (panelOpen) {
        togglePanel();
      } else if (inspectorEnabled) {
        toggleInspector();
      }
    }
    // Ctrl/Cmd + Z to undo
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      if (changes.length > 0) {
        e.preventDefault();
        undo();
      }
    }
    // Ctrl/Cmd + Shift + Z to redo
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
      if (undoStack.length > 0) {
        e.preventDefault();
        redo();
      }
    }
    // Ctrl/Cmd + S to save/copy CSS
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      copyCss();
    }
  });

  // Load persisted changes on init
  setTimeout(loadPersistedChanges, 500);

  console.log('[Lumos] Inspector loaded. Click the purple button to start editing.');
})();

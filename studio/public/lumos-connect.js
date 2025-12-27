/**
 * Lumos Inspector - Webflow-like Visual Style Editor
 *
 * Add this script to your app to enable visual style editing.
 * Features a left navigator panel and right inspector/styler panel.
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
  let currentTab = 'styles';
  let currentStyleTab = 'layout';
  let currentPseudoState = 'none';
  let navigatorOpen = true;
  let currentBreakpoint = 'base';
  let copiedStyles = null;
  let recentColors = [];
  let measureMode = false;
  let measureStart = null;

  // Breakpoints for responsive editing
  const breakpoints = {
    base: { label: 'Base', minWidth: 0, icon: 'layers' },
    sm: { label: '640px', minWidth: 640, icon: 'phone' },
    md: { label: '768px', minWidth: 768, icon: 'tablet' },
    lg: { label: '1024px', minWidth: 1024, icon: 'monitor' },
    xl: { label: '1280px', minWidth: 1280, icon: 'monitor' },
  };

  // Popular Google Fonts
  const googleFonts = [
    'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins',
    'Nunito', 'Playfair Display', 'Merriweather', 'Source Sans Pro',
    'Raleway', 'Ubuntu', 'Oswald', 'Rubik', 'Work Sans', 'DM Sans',
    'Space Grotesk', 'Outfit', 'Plus Jakarta Sans', 'Manrope'
  ];

  // Load Google Fonts
  function loadGoogleFont(fontName) {
    const link = document.createElement('link');
    link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/ /g, '+')}:wght@400;500;600;700&display=swap`;
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }

  // LocalStorage key for persistence
  const STORAGE_KEY = `lumos-changes-${sessionId || 'default'}`;

  // Load persisted changes
  function loadPersistedChanges() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        changes = data.changes || [];
        changes.forEach(c => {
          const el = document.querySelector(c.selector);
          if (el) el.style[c.property] = c.newValue;
        });
        if (changes.length > 0) showToast(`Restored ${changes.length} changes`, 'success');
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
    desktop: { width: '100%', icon: 'monitor' },
    tablet: { width: '768px', icon: 'tablet' },
    mobile: { width: '375px', icon: 'phone' },
  };

  // Inject styles
  const style = document.createElement('style');
  style.id = 'lumos-inspector-styles';
  style.textContent = `
    /* Reset for Lumos elements */
    .lumos-ui, .lumos-ui * {
      box-sizing: border-box;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    /* Hover/Selection Outlines */
    .lumos-hover-outline {
      outline: 2px solid #3b82f6 !important;
      outline-offset: 1px !important;
    }
    .lumos-selected-outline {
      outline: 2px solid #8b5cf6 !important;
      outline-offset: 1px !important;
    }

    /* Viewport Preview */
    .lumos-viewport-active {
      margin: 0 auto !important;
      transition: max-width 0.3s ease;
      box-shadow: 0 0 0 1px #3f3f46;
    }

    /* FAB Button */
    .lumos-fab {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 999990;
      width: 48px;
      height: 48px;
      border-radius: 12px;
      background: linear-gradient(135deg, #8b5cf6, #6366f1);
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 16px rgba(139, 92, 246, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }
    .lumos-fab:hover {
      transform: scale(1.05);
      box-shadow: 0 6px 20px rgba(139, 92, 246, 0.5);
    }
    .lumos-fab.active {
      background: linear-gradient(135deg, #f59e0b, #d97706);
    }
    .lumos-fab.hidden {
      display: none;
    }
    .lumos-fab svg {
      width: 22px;
      height: 22px;
      stroke: white;
      fill: none;
      stroke-width: 2;
    }

    /* Main Container */
    .lumos-container {
      position: fixed;
      inset: 0;
      z-index: 999995;
      pointer-events: none;
      display: none;
    }
    .lumos-container.open {
      display: flex;
    }

    /* Left Navigator Panel */
    .lumos-navigator {
      width: 280px;
      height: 100%;
      background: #0a0a0b;
      border-right: 1px solid #27272a;
      display: flex;
      flex-direction: column;
      pointer-events: auto;
      transform: translateX(-100%);
      transition: transform 0.3s ease;
    }
    .lumos-navigator.open {
      transform: translateX(0);
    }
    .lumos-nav-header {
      padding: 12px 16px;
      border-bottom: 1px solid #27272a;
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #09090b;
    }
    .lumos-nav-title {
      font-size: 12px;
      font-weight: 600;
      color: #a1a1aa;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .lumos-nav-content {
      flex: 1;
      overflow-y: auto;
      padding: 8px 0;
    }

    /* Element Tree */
    .lumos-tree-item {
      display: flex;
      align-items: center;
      padding: 6px 12px;
      cursor: pointer;
      color: #a1a1aa;
      font-size: 12px;
      transition: all 0.1s;
      border-left: 2px solid transparent;
    }
    .lumos-tree-item:hover {
      background: #18181b;
      color: #fafafa;
    }
    .lumos-tree-item.selected {
      background: #1e1b4b;
      color: #a78bfa;
      border-left-color: #8b5cf6;
    }
    .lumos-tree-item.hovered {
      background: #172554;
      border-left-color: #3b82f6;
    }
    .lumos-tree-toggle {
      width: 16px;
      height: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 4px;
      color: #52525b;
    }
    .lumos-tree-toggle svg {
      width: 10px;
      height: 10px;
      transition: transform 0.15s;
    }
    .lumos-tree-toggle.expanded svg {
      transform: rotate(90deg);
    }
    .lumos-tree-tag {
      color: #a78bfa;
      font-family: ui-monospace, monospace;
      font-size: 11px;
    }
    .lumos-tree-class {
      color: #52525b;
      font-size: 10px;
      margin-left: 6px;
      max-width: 120px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .lumos-tree-id {
      color: #f59e0b;
      font-size: 10px;
      margin-left: 4px;
    }

    /* Center Spacer (for page content) */
    .lumos-spacer {
      flex: 1;
      pointer-events: none;
    }

    /* Right Inspector Panel */
    .lumos-inspector {
      width: 320px;
      height: 100%;
      background: #0a0a0b;
      border-left: 1px solid #27272a;
      display: flex;
      flex-direction: column;
      pointer-events: auto;
      transform: translateX(100%);
      transition: transform 0.3s ease;
    }
    .lumos-inspector.open {
      transform: translateX(0);
    }

    /* Inspector Header */
    .lumos-header {
      padding: 10px 12px;
      border-bottom: 1px solid #27272a;
      display: flex;
      align-items: center;
      gap: 8px;
      background: #09090b;
    }
    .lumos-logo {
      width: 28px;
      height: 28px;
      border-radius: 6px;
      background: linear-gradient(135deg, #8b5cf6, #6366f1);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .lumos-logo svg {
      width: 14px;
      height: 14px;
      stroke: white;
      fill: none;
    }
    .lumos-header-title {
      flex: 1;
      font-weight: 600;
      font-size: 13px;
      color: #fafafa;
    }
    .lumos-header-btn {
      width: 28px;
      height: 28px;
      border-radius: 6px;
      border: none;
      background: transparent;
      color: #71717a;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s;
    }
    .lumos-header-btn:hover {
      background: #27272a;
      color: #fafafa;
    }
    .lumos-header-btn svg {
      width: 16px;
      height: 16px;
    }

    /* Toolbar */
    .lumos-toolbar {
      padding: 8px 12px;
      border-bottom: 1px solid #27272a;
      display: flex;
      align-items: center;
      gap: 8px;
      background: #0a0a0b;
    }
    .lumos-toolbar-group {
      display: flex;
      background: #18181b;
      border-radius: 6px;
      padding: 2px;
    }
    .lumos-toolbar-btn {
      width: 28px;
      height: 26px;
      border: none;
      background: transparent;
      color: #71717a;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: all 0.15s;
    }
    .lumos-toolbar-btn:hover {
      color: #fafafa;
    }
    .lumos-toolbar-btn.active {
      background: #8b5cf6;
      color: white;
    }
    .lumos-toolbar-btn:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }
    .lumos-toolbar-btn svg {
      width: 14px;
      height: 14px;
    }
    .lumos-toolbar-divider {
      width: 1px;
      height: 20px;
      background: #27272a;
      margin: 0 4px;
    }

    /* Inspector Toggle */
    .lumos-inspect-toggle {
      padding: 10px 12px;
      border-bottom: 1px solid #27272a;
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #0a0a0b;
    }
    .lumos-inspect-label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: #a1a1aa;
    }
    .lumos-inspect-label svg {
      width: 14px;
      height: 14px;
    }
    .lumos-switch {
      width: 36px;
      height: 20px;
      background: #27272a;
      border-radius: 10px;
      cursor: pointer;
      position: relative;
      transition: background 0.2s;
    }
    .lumos-switch.active {
      background: #8b5cf6;
    }
    .lumos-switch::after {
      content: '';
      position: absolute;
      top: 2px;
      left: 2px;
      width: 16px;
      height: 16px;
      background: white;
      border-radius: 50%;
      transition: transform 0.2s;
    }
    .lumos-switch.active::after {
      transform: translateX(16px);
    }

    /* Element Info */
    .lumos-element-info {
      padding: 10px 12px;
      background: #18181b;
      border-bottom: 1px solid #27272a;
    }
    .lumos-element-row {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 4px;
    }
    .lumos-element-tag {
      padding: 2px 6px;
      background: #8b5cf6;
      color: white;
      border-radius: 3px;
      font-size: 10px;
      font-family: ui-monospace, monospace;
      font-weight: 500;
    }
    .lumos-element-id {
      color: #f59e0b;
      font-size: 10px;
      font-family: ui-monospace, monospace;
    }
    .lumos-element-classes {
      font-size: 10px;
      color: #71717a;
      font-family: ui-monospace, monospace;
      word-break: break-all;
    }
    .lumos-element-size {
      font-size: 10px;
      color: #52525b;
      margin-top: 4px;
    }

    /* Pseudo State Selector */
    .lumos-pseudo-row {
      padding: 8px 12px;
      border-bottom: 1px solid #27272a;
      display: flex;
      gap: 4px;
    }
    .lumos-pseudo-btn {
      padding: 4px 8px;
      border: 1px solid #27272a;
      background: transparent;
      color: #71717a;
      font-size: 10px;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .lumos-pseudo-btn:hover {
      border-color: #3f3f46;
      color: #a1a1aa;
    }
    .lumos-pseudo-btn.active {
      background: #8b5cf6;
      border-color: #8b5cf6;
      color: white;
    }

    /* Main Tabs */
    .lumos-main-tabs {
      display: flex;
      border-bottom: 1px solid #27272a;
      background: #0a0a0b;
    }
    .lumos-main-tab {
      flex: 1;
      padding: 10px;
      border: none;
      background: transparent;
      color: #71717a;
      font-size: 11px;
      font-weight: 500;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      transition: all 0.15s;
    }
    .lumos-main-tab:hover {
      color: #a1a1aa;
    }
    .lumos-main-tab.active {
      color: #fafafa;
      border-bottom-color: #8b5cf6;
    }

    /* Style Tabs */
    .lumos-style-tabs {
      display: flex;
      padding: 8px 12px;
      gap: 4px;
      border-bottom: 1px solid #27272a;
      background: #0a0a0b;
      overflow-x: auto;
    }
    .lumos-style-tab {
      padding: 6px 10px;
      border: none;
      background: transparent;
      color: #71717a;
      font-size: 10px;
      font-weight: 500;
      cursor: pointer;
      border-radius: 4px;
      white-space: nowrap;
      transition: all 0.15s;
    }
    .lumos-style-tab:hover {
      background: #18181b;
      color: #a1a1aa;
    }
    .lumos-style-tab.active {
      background: #27272a;
      color: #fafafa;
    }

    /* Panel Content */
    .lumos-panel-content {
      flex: 1;
      overflow-y: auto;
      background: #0a0a0b;
    }
    .lumos-tab-content {
      display: none;
    }
    .lumos-tab-content.active {
      display: block;
    }

    /* Sections */
    .lumos-section {
      border-bottom: 1px solid #1a1a1d;
    }
    .lumos-section-header {
      padding: 10px 12px;
      font-size: 10px;
      font-weight: 600;
      color: #52525b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      background: #0f0f10;
      display: flex;
      align-items: center;
      justify-content: space-between;
      cursor: pointer;
    }
    .lumos-section-header:hover {
      color: #71717a;
    }
    .lumos-section-content {
      padding: 10px 12px;
    }

    /* Form Controls */
    .lumos-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-bottom: 8px;
    }
    .lumos-row-3 {
      grid-template-columns: repeat(3, 1fr);
    }
    .lumos-row-4 {
      grid-template-columns: repeat(4, 1fr);
    }
    .lumos-field {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .lumos-field.full {
      grid-column: 1 / -1;
    }
    .lumos-label {
      font-size: 9px;
      color: #52525b;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .lumos-input {
      width: 100%;
      padding: 6px 8px;
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 4px;
      color: #fafafa;
      font-size: 11px;
      font-family: ui-monospace, monospace;
      outline: none;
      transition: border-color 0.15s;
    }
    .lumos-input:focus {
      border-color: #8b5cf6;
    }
    .lumos-input::placeholder {
      color: #3f3f46;
    }
    .lumos-select {
      width: 100%;
      padding: 6px 8px;
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 4px;
      color: #fafafa;
      font-size: 11px;
      outline: none;
      cursor: pointer;
    }
    .lumos-select:focus {
      border-color: #8b5cf6;
    }

    /* Color Input */
    .lumos-color-field {
      display: flex;
      gap: 6px;
      align-items: center;
    }
    .lumos-color-swatch {
      width: 26px;
      height: 26px;
      border-radius: 4px;
      border: 1px solid #27272a;
      overflow: hidden;
      flex-shrink: 0;
      cursor: pointer;
    }
    .lumos-color-swatch input {
      width: 36px;
      height: 36px;
      margin: -5px;
      border: none;
      cursor: pointer;
    }

    /* Range Slider */
    .lumos-range-field {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .lumos-range {
      flex: 1;
      height: 4px;
      background: #27272a;
      border-radius: 2px;
      -webkit-appearance: none;
      cursor: pointer;
    }
    .lumos-range::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 12px;
      height: 12px;
      background: #8b5cf6;
      border-radius: 50%;
      cursor: pointer;
    }
    .lumos-range-value {
      width: 36px;
      font-size: 10px;
      color: #71717a;
      text-align: right;
      font-family: ui-monospace, monospace;
    }

    /* Interactive Box Model */
    .lumos-box-model-interactive {
      padding: 8px;
    }
    .lumos-box-layer {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }
    .lumos-box-margin-layer {
      background: rgba(251, 191, 36, 0.15);
      border: 1px dashed rgba(251, 191, 36, 0.5);
      border-radius: 4px;
    }
    .lumos-box-border-layer {
      background: rgba(59, 130, 246, 0.15);
      border: 1px dashed rgba(59, 130, 246, 0.5);
      border-radius: 3px;
      width: 100%;
    }
    .lumos-box-padding-layer {
      background: rgba(34, 197, 94, 0.15);
      border: 1px dashed rgba(34, 197, 94, 0.5);
      border-radius: 2px;
      width: 100%;
    }
    .lumos-box-content-layer {
      background: #8b5cf6;
      border-radius: 2px;
      padding: 12px 20px;
      min-width: 60px;
      text-align: center;
    }
    .lumos-box-size-label {
      font-size: 10px;
      color: white;
      font-family: ui-monospace, monospace;
    }
    .lumos-box-corner-label {
      position: absolute;
      top: 2px;
      left: 4px;
      font-size: 8px;
      color: #71717a;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .lumos-box-input {
      position: absolute;
      width: 32px;
      padding: 2px 4px;
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 3px;
      color: #a1a1aa;
      font-size: 10px;
      font-family: ui-monospace, monospace;
      text-align: center;
      outline: none;
    }
    .lumos-box-input:focus {
      border-color: #8b5cf6;
      color: #fafafa;
    }
    .lumos-box-input.lumos-box-top { top: 2px; left: 50%; transform: translateX(-50%); }
    .lumos-box-input.lumos-box-right { right: 2px; top: 50%; transform: translateY(-50%); }
    .lumos-box-input.lumos-box-bottom { bottom: 2px; left: 50%; transform: translateX(-50%); }
    .lumos-box-input.lumos-box-left { left: 2px; top: 50%; transform: translateY(-50%); }

    /* Class Management */
    .lumos-class-list {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-bottom: 8px;
    }
    .lumos-class-tag {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 3px 6px;
      background: #27272a;
      border-radius: 4px;
      font-size: 10px;
      color: #a1a1aa;
      font-family: ui-monospace, monospace;
    }
    .lumos-class-tag:hover {
      background: #3f3f46;
    }
    .lumos-class-remove {
      cursor: pointer;
      opacity: 0.5;
      transition: opacity 0.15s;
    }
    .lumos-class-remove:hover {
      opacity: 1;
      color: #ef4444;
    }
    .lumos-class-add {
      display: flex;
      gap: 6px;
    }
    .lumos-class-add input {
      flex: 1;
    }
    .lumos-class-add button {
      padding: 6px 10px;
      background: #8b5cf6;
      color: white;
      border: none;
      border-radius: 4px;
      font-size: 10px;
      cursor: pointer;
    }
    .lumos-class-add button:hover {
      background: #7c3aed;
    }

    /* Gradient Editor */
    .lumos-gradient-preview {
      height: 40px;
      border-radius: 4px;
      border: 1px solid #27272a;
      margin-bottom: 8px;
    }
    .lumos-gradient-type {
      display: flex;
      gap: 4px;
      margin-bottom: 8px;
    }
    .lumos-gradient-type button {
      flex: 1;
      padding: 6px;
      background: #18181b;
      border: 1px solid #27272a;
      color: #71717a;
      font-size: 10px;
      border-radius: 4px;
      cursor: pointer;
    }
    .lumos-gradient-type button.active {
      background: #8b5cf6;
      border-color: #8b5cf6;
      color: white;
    }
    .lumos-gradient-stops {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 8px;
    }
    .lumos-gradient-stop {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .lumos-gradient-stop-color {
      width: 24px;
      height: 24px;
      border-radius: 4px;
      border: 1px solid #27272a;
      overflow: hidden;
    }
    .lumos-gradient-stop-color input {
      width: 32px;
      height: 32px;
      margin: -4px;
      border: none;
      cursor: pointer;
    }
    .lumos-gradient-stop-pos {
      width: 50px;
    }
    .lumos-gradient-stop-remove {
      cursor: pointer;
      color: #71717a;
    }
    .lumos-gradient-stop-remove:hover {
      color: #ef4444;
    }
    .lumos-add-stop-btn {
      width: 100%;
      padding: 6px;
      background: #18181b;
      border: 1px dashed #27272a;
      color: #71717a;
      font-size: 10px;
      border-radius: 4px;
      cursor: pointer;
    }
    .lumos-add-stop-btn:hover {
      background: #27272a;
      color: #a1a1aa;
    }

    /* Changes Footer */
    .lumos-changes {
      border-top: 1px solid #27272a;
      background: #09090b;
      padding: 10px 12px;
    }
    .lumos-changes-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 6px;
    }
    .lumos-changes-title {
      font-size: 10px;
      color: #52525b;
      text-transform: uppercase;
    }
    .lumos-changes-count {
      background: #8b5cf6;
      color: white;
      padding: 1px 6px;
      border-radius: 8px;
      font-size: 10px;
      font-weight: 600;
    }
    .lumos-changes-list {
      max-height: 80px;
      overflow-y: auto;
    }
    .lumos-change-item {
      padding: 4px 8px;
      background: #18181b;
      border-radius: 3px;
      margin-bottom: 3px;
      font-size: 10px;
    }
    .lumos-change-prop {
      color: #71717a;
    }
    .lumos-change-val {
      color: #a78bfa;
      font-family: ui-monospace, monospace;
    }

    /* Action Bar */
    .lumos-actions {
      padding: 10px 12px;
      background: #09090b;
      border-top: 1px solid #27272a;
      display: flex;
      gap: 6px;
    }
    .lumos-btn {
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 500;
      cursor: pointer;
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: all 0.15s;
    }
    .lumos-btn svg {
      width: 14px;
      height: 14px;
    }
    .lumos-btn-primary {
      flex: 1;
      background: #8b5cf6;
      color: white;
    }
    .lumos-btn-primary:hover {
      background: #7c3aed;
    }
    .lumos-btn-primary:disabled {
      background: #27272a;
      color: #52525b;
      cursor: not-allowed;
    }
    .lumos-btn-secondary {
      background: #18181b;
      color: #a1a1aa;
      border: 1px solid #27272a;
    }
    .lumos-btn-secondary:hover {
      background: #27272a;
      color: #fafafa;
    }
    .lumos-btn-icon {
      width: 32px;
      padding: 8px;
    }

    /* Empty State */
    .lumos-empty {
      padding: 40px 20px;
      text-align: center;
    }
    .lumos-empty svg {
      width: 40px;
      height: 40px;
      color: #27272a;
      margin-bottom: 12px;
    }
    .lumos-empty-text {
      font-size: 12px;
      color: #52525b;
      line-height: 1.5;
    }

    /* Toast */
    .lumos-toast {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%) translateY(20px);
      background: #18181b;
      color: #fafafa;
      padding: 10px 16px;
      border-radius: 6px;
      font-size: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      opacity: 0;
      transition: all 0.2s;
      z-index: 999999;
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

    /* Scrollbar */
    .lumos-ui ::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    .lumos-ui ::-webkit-scrollbar-track {
      background: transparent;
    }
    .lumos-ui ::-webkit-scrollbar-thumb {
      background: #27272a;
      border-radius: 3px;
    }
    .lumos-ui ::-webkit-scrollbar-thumb:hover {
      background: #3f3f46;
    }

    /* Breakpoint Bar */
    .lumos-breakpoint-bar {
      display: flex;
      padding: 6px 12px;
      gap: 4px;
      border-bottom: 1px solid #27272a;
      background: #09090b;
    }
    .lumos-breakpoint-btn {
      padding: 4px 8px;
      border: 1px solid #27272a;
      background: transparent;
      color: #71717a;
      font-size: 9px;
      border-radius: 4px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 4px;
      transition: all 0.15s;
    }
    .lumos-breakpoint-btn:hover {
      border-color: #3f3f46;
      color: #a1a1aa;
    }
    .lumos-breakpoint-btn.active {
      background: #8b5cf6;
      border-color: #8b5cf6;
      color: white;
    }
    .lumos-breakpoint-btn svg {
      width: 10px;
      height: 10px;
    }

    /* Selector Helper */
    .lumos-selector-row {
      padding: 8px 12px;
      background: #0f0f10;
      border-bottom: 1px solid #27272a;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .lumos-selector-text {
      flex: 1;
      font-size: 10px;
      font-family: ui-monospace, monospace;
      color: #8b5cf6;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .lumos-selector-copy {
      padding: 3px 6px;
      background: #27272a;
      border: none;
      border-radius: 3px;
      color: #a1a1aa;
      font-size: 9px;
      cursor: pointer;
    }
    .lumos-selector-copy:hover {
      background: #3f3f46;
      color: #fafafa;
    }

    /* Color Palette */
    .lumos-recent-colors {
      display: flex;
      gap: 4px;
      flex-wrap: wrap;
      margin-bottom: 8px;
    }
    .lumos-recent-color {
      width: 20px;
      height: 20px;
      border-radius: 4px;
      border: 1px solid #27272a;
      cursor: pointer;
      transition: transform 0.1s;
    }
    .lumos-recent-color:hover {
      transform: scale(1.1);
      border-color: #8b5cf6;
    }

    /* Computed Styles */
    .lumos-computed-list {
      max-height: 300px;
      overflow-y: auto;
    }
    .lumos-computed-item {
      display: flex;
      padding: 4px 8px;
      font-size: 10px;
      border-bottom: 1px solid #1a1a1d;
    }
    .lumos-computed-item:hover {
      background: #18181b;
    }
    .lumos-computed-prop {
      flex: 1;
      color: #71717a;
      font-family: ui-monospace, monospace;
    }
    .lumos-computed-val {
      color: #a78bfa;
      font-family: ui-monospace, monospace;
      max-width: 120px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* Copy/Paste Buttons */
    .lumos-copy-paste-row {
      display: flex;
      gap: 4px;
      padding: 8px 12px;
      border-bottom: 1px solid #27272a;
    }
    .lumos-copy-paste-btn {
      flex: 1;
      padding: 6px 8px;
      background: #18181b;
      border: 1px solid #27272a;
      color: #a1a1aa;
      font-size: 10px;
      border-radius: 4px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
    }
    .lumos-copy-paste-btn:hover {
      background: #27272a;
      color: #fafafa;
    }
    .lumos-copy-paste-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .lumos-copy-paste-btn svg {
      width: 12px;
      height: 12px;
    }

    /* Measurement Tool */
    .lumos-measure-line {
      position: fixed;
      pointer-events: none;
      z-index: 999998;
    }
    .lumos-measure-h {
      height: 2px;
      background: #f59e0b;
    }
    .lumos-measure-v {
      width: 2px;
      background: #f59e0b;
    }
    .lumos-measure-label {
      position: fixed;
      background: #f59e0b;
      color: black;
      font-size: 10px;
      font-weight: 600;
      padding: 2px 6px;
      border-radius: 3px;
      z-index: 999998;
      pointer-events: none;
    }
    .lumos-measure-point {
      position: fixed;
      width: 8px;
      height: 8px;
      background: #f59e0b;
      border-radius: 50%;
      z-index: 999998;
      pointer-events: none;
      transform: translate(-50%, -50%);
    }

    /* Export Modal */
    .lumos-modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.7);
      z-index: 999999;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .lumos-modal {
      background: #0a0a0b;
      border: 1px solid #27272a;
      border-radius: 12px;
      width: 500px;
      max-width: 90vw;
      max-height: 80vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .lumos-modal-header {
      padding: 16px;
      border-bottom: 1px solid #27272a;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .lumos-modal-title {
      font-size: 14px;
      font-weight: 600;
      color: #fafafa;
    }
    .lumos-modal-close {
      background: none;
      border: none;
      color: #71717a;
      cursor: pointer;
      padding: 4px;
    }
    .lumos-modal-close:hover {
      color: #fafafa;
    }
    .lumos-modal-body {
      padding: 16px;
      overflow-y: auto;
      flex: 1;
    }
    .lumos-modal-tabs {
      display: flex;
      gap: 4px;
      margin-bottom: 12px;
    }
    .lumos-modal-tab {
      padding: 6px 12px;
      background: #18181b;
      border: 1px solid #27272a;
      color: #71717a;
      font-size: 11px;
      border-radius: 4px;
      cursor: pointer;
    }
    .lumos-modal-tab.active {
      background: #8b5cf6;
      border-color: #8b5cf6;
      color: white;
    }
    .lumos-modal-code {
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 6px;
      padding: 12px;
      font-family: ui-monospace, monospace;
      font-size: 11px;
      color: #a1a1aa;
      max-height: 300px;
      overflow: auto;
      white-space: pre-wrap;
    }
    .lumos-modal-footer {
      padding: 12px 16px;
      border-top: 1px solid #27272a;
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    }

    /* Animation Editor */
    .lumos-animation-timeline {
      background: #18181b;
      border-radius: 6px;
      padding: 12px;
      margin-bottom: 8px;
    }
    .lumos-keyframe-track {
      position: relative;
      height: 24px;
      background: #27272a;
      border-radius: 4px;
      margin-bottom: 8px;
    }
    .lumos-keyframe-point {
      position: absolute;
      top: 50%;
      transform: translate(-50%, -50%);
      width: 10px;
      height: 10px;
      background: #8b5cf6;
      border-radius: 50%;
      cursor: pointer;
    }
    .lumos-keyframe-point:hover {
      background: #a78bfa;
    }
    .lumos-animation-controls {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    .lumos-animation-input {
      flex: 1;
    }

    /* Accessibility Checker */
    .lumos-a11y-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .lumos-a11y-item {
      padding: 8px;
      background: #18181b;
      border-radius: 6px;
      display: flex;
      align-items: flex-start;
      gap: 8px;
    }
    .lumos-a11y-icon {
      width: 16px;
      height: 16px;
      flex-shrink: 0;
      margin-top: 2px;
    }
    .lumos-a11y-icon.pass {
      color: #22c55e;
    }
    .lumos-a11y-icon.warn {
      color: #f59e0b;
    }
    .lumos-a11y-icon.fail {
      color: #ef4444;
    }
    .lumos-a11y-content {
      flex: 1;
    }
    .lumos-a11y-title {
      font-size: 11px;
      font-weight: 500;
      color: #fafafa;
      margin-bottom: 2px;
    }
    .lumos-a11y-desc {
      font-size: 10px;
      color: #71717a;
    }

    /* Font Preview */
    .lumos-font-option {
      padding: 8px 12px;
      cursor: pointer;
      transition: background 0.1s;
    }
    .lumos-font-option:hover {
      background: #27272a;
    }
    .lumos-font-preview {
      font-size: 14px;
      color: #fafafa;
    }
    .lumos-font-name {
      font-size: 10px;
      color: #71717a;
      margin-top: 2px;
    }

    /* Command Palette (Cmd+K) */
    .lumos-command-palette {
      position: fixed;
      top: 15%;
      left: 50%;
      transform: translateX(-50%);
      width: 500px;
      max-width: 90vw;
      background: #0a0a0b;
      border: 1px solid #27272a;
      border-radius: 12px;
      box-shadow: 0 20px 50px rgba(0,0,0,0.5);
      z-index: 1000000;
      overflow: hidden;
    }
    .lumos-command-input-wrap {
      display: flex;
      align-items: center;
      padding: 12px 16px;
      border-bottom: 1px solid #27272a;
      gap: 10px;
    }
    .lumos-command-input-wrap svg {
      width: 18px;
      height: 18px;
      color: #71717a;
    }
    .lumos-command-input {
      flex: 1;
      background: transparent;
      border: none;
      color: #fafafa;
      font-size: 14px;
      outline: none;
    }
    .lumos-command-input::placeholder {
      color: #52525b;
    }
    .lumos-command-list {
      max-height: 300px;
      overflow-y: auto;
    }
    .lumos-command-group {
      padding: 8px;
    }
    .lumos-command-group-title {
      font-size: 10px;
      color: #52525b;
      text-transform: uppercase;
      padding: 4px 8px;
      letter-spacing: 0.5px;
    }
    .lumos-command-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 12px;
      border-radius: 6px;
      cursor: pointer;
      transition: background 0.1s;
    }
    .lumos-command-item:hover, .lumos-command-item.selected {
      background: #27272a;
    }
    .lumos-command-item svg {
      width: 16px;
      height: 16px;
      color: #71717a;
    }
    .lumos-command-item-text {
      flex: 1;
      font-size: 13px;
      color: #fafafa;
    }
    .lumos-command-item-shortcut {
      font-size: 10px;
      color: #52525b;
      font-family: ui-monospace, monospace;
    }
    .lumos-command-empty {
      padding: 24px;
      text-align: center;
      color: #52525b;
      font-size: 13px;
    }

    /* Navigator Search */
    .lumos-nav-search {
      padding: 8px;
      border-bottom: 1px solid #27272a;
    }
    .lumos-nav-search-input {
      width: 100%;
      padding: 6px 10px;
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 4px;
      color: #a1a1aa;
      font-size: 11px;
      outline: none;
    }
    .lumos-nav-search-input:focus {
      border-color: #8b5cf6;
    }
    .lumos-nav-search-input::placeholder {
      color: #52525b;
    }

    /* Keyboard Shortcuts Panel */
    .lumos-shortcuts-panel {
      padding: 16px;
    }
    .lumos-shortcut-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #1a1a1d;
    }
    .lumos-shortcut-desc {
      font-size: 12px;
      color: #a1a1aa;
    }
    .lumos-shortcut-keys {
      display: flex;
      gap: 4px;
    }
    .lumos-shortcut-key {
      padding: 2px 6px;
      background: #27272a;
      border-radius: 3px;
      font-size: 10px;
      color: #71717a;
      font-family: ui-monospace, monospace;
    }

    /* History Panel */
    .lumos-history-panel {
      max-height: 300px;
      overflow-y: auto;
    }
    .lumos-history-item {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 10px 12px;
      border-bottom: 1px solid #1a1a1d;
      cursor: pointer;
    }
    .lumos-history-item:hover {
      background: #18181b;
    }
    .lumos-history-icon {
      width: 24px;
      height: 24px;
      background: #27272a;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .lumos-history-icon svg {
      width: 12px;
      height: 12px;
      color: #8b5cf6;
    }
    .lumos-history-content {
      flex: 1;
      min-width: 0;
    }
    .lumos-history-title {
      font-size: 11px;
      color: #fafafa;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .lumos-history-meta {
      font-size: 9px;
      color: #52525b;
      margin-top: 2px;
    }
    .lumos-history-time {
      font-size: 9px;
      color: #52525b;
      flex-shrink: 0;
    }

    /* Drag Handles */
    .lumos-drag-handle {
      position: fixed;
      width: 10px;
      height: 10px;
      background: #8b5cf6;
      border: 2px solid white;
      border-radius: 2px;
      cursor: move;
      z-index: 999997;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    }
    .lumos-drag-handle.top-left { cursor: nw-resize; }
    .lumos-drag-handle.top-right { cursor: ne-resize; }
    .lumos-drag-handle.bottom-left { cursor: sw-resize; }
    .lumos-drag-handle.bottom-right { cursor: se-resize; }
    .lumos-drag-handle.top, .lumos-drag-handle.bottom { cursor: ns-resize; }
    .lumos-drag-handle.left, .lumos-drag-handle.right { cursor: ew-resize; }

    /* Multi-select */
    .lumos-multi-selected {
      outline: 2px dashed #8b5cf6 !important;
      outline-offset: 2px !important;
    }
    .lumos-selection-box {
      position: fixed;
      border: 1px dashed #8b5cf6;
      background: rgba(139, 92, 246, 0.1);
      pointer-events: none;
      z-index: 999996;
    }

    /* Style Presets */
    .lumos-presets-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .lumos-preset-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px;
      background: #18181b;
      border-radius: 6px;
      cursor: pointer;
    }
    .lumos-preset-item:hover {
      background: #27272a;
    }
    .lumos-preset-preview {
      width: 32px;
      height: 32px;
      border-radius: 4px;
      border: 1px solid #27272a;
    }
    .lumos-preset-info {
      flex: 1;
    }
    .lumos-preset-name {
      font-size: 11px;
      color: #fafafa;
    }
    .lumos-preset-count {
      font-size: 9px;
      color: #52525b;
    }
    .lumos-preset-delete {
      color: #71717a;
      cursor: pointer;
    }
    .lumos-preset-delete:hover {
      color: #ef4444;
    }

    /* Favorites */
    .lumos-favorites-bar {
      display: flex;
      gap: 4px;
      padding: 8px 12px;
      border-bottom: 1px solid #27272a;
      flex-wrap: wrap;
    }
    .lumos-favorite-btn {
      padding: 4px 8px;
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 4px;
      font-size: 9px;
      color: #a1a1aa;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .lumos-favorite-btn:hover {
      background: #27272a;
    }
    .lumos-favorite-btn svg {
      width: 10px;
      height: 10px;
    }
    .lumos-star-btn {
      cursor: pointer;
      color: #52525b;
      transition: color 0.15s;
    }
    .lumos-star-btn:hover, .lumos-star-btn.active {
      color: #f59e0b;
    }

    /* Snap Guides */
    .lumos-guide-h, .lumos-guide-v {
      position: fixed;
      pointer-events: none;
      z-index: 999995;
    }
    .lumos-guide-h {
      left: 0;
      right: 0;
      height: 1px;
      background: #ec4899;
    }
    .lumos-guide-v {
      top: 0;
      bottom: 0;
      width: 1px;
      background: #ec4899;
    }
    .lumos-guide-label {
      position: fixed;
      background: #ec4899;
      color: white;
      font-size: 9px;
      padding: 1px 4px;
      border-radius: 2px;
      z-index: 999995;
    }

    /* Comments */
    .lumos-comment-marker {
      position: fixed;
      width: 24px;
      height: 24px;
      background: #f59e0b;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      font-weight: bold;
      color: black;
      cursor: pointer;
      z-index: 999994;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    }
    .lumos-comment-popup {
      position: fixed;
      width: 250px;
      background: #0a0a0b;
      border: 1px solid #27272a;
      border-radius: 8px;
      z-index: 999995;
      overflow: hidden;
    }
    .lumos-comment-header {
      padding: 8px 12px;
      background: #18181b;
      border-bottom: 1px solid #27272a;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .lumos-comment-title {
      font-size: 11px;
      color: #fafafa;
      font-weight: 500;
    }
    .lumos-comment-body {
      padding: 12px;
    }
    .lumos-comment-input {
      width: 100%;
      min-height: 60px;
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 4px;
      color: #a1a1aa;
      font-size: 11px;
      padding: 8px;
      resize: none;
      outline: none;
    }
    .lumos-comment-actions {
      display: flex;
      gap: 6px;
      margin-top: 8px;
    }

    /* Settings Panel */
    .lumos-settings-section {
      padding: 12px;
      border-bottom: 1px solid #27272a;
    }
    .lumos-settings-title {
      font-size: 11px;
      color: #71717a;
      text-transform: uppercase;
      margin-bottom: 8px;
    }
    .lumos-settings-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 0;
    }
    .lumos-settings-label {
      font-size: 12px;
      color: #a1a1aa;
    }
    .lumos-toggle {
      width: 36px;
      height: 20px;
      background: #27272a;
      border-radius: 10px;
      position: relative;
      cursor: pointer;
      transition: background 0.2s;
    }
    .lumos-toggle.active {
      background: #8b5cf6;
    }
    .lumos-toggle::after {
      content: '';
      position: absolute;
      top: 2px;
      left: 2px;
      width: 16px;
      height: 16px;
      background: white;
      border-radius: 50%;
      transition: left 0.2s;
    }
    .lumos-toggle.active::after {
      left: 18px;
    }

    /* Onboarding */
    .lumos-onboarding-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.8);
      z-index: 1000001;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .lumos-onboarding-card {
      width: 400px;
      max-width: 90vw;
      background: #0a0a0b;
      border: 1px solid #27272a;
      border-radius: 16px;
      overflow: hidden;
    }
    .lumos-onboarding-header {
      padding: 24px;
      text-align: center;
      border-bottom: 1px solid #27272a;
    }
    .lumos-onboarding-icon {
      width: 48px;
      height: 48px;
      background: linear-gradient(135deg, #8b5cf6, #06b6d4);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 16px;
    }
    .lumos-onboarding-icon svg {
      width: 24px;
      height: 24px;
      color: white;
    }
    .lumos-onboarding-title {
      font-size: 18px;
      font-weight: 600;
      color: #fafafa;
    }
    .lumos-onboarding-subtitle {
      font-size: 13px;
      color: #71717a;
      margin-top: 4px;
    }
    .lumos-onboarding-body {
      padding: 24px;
    }
    .lumos-onboarding-step {
      display: flex;
      gap: 12px;
      margin-bottom: 16px;
    }
    .lumos-onboarding-step-num {
      width: 24px;
      height: 24px;
      background: #8b5cf6;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 600;
      color: white;
      flex-shrink: 0;
    }
    .lumos-onboarding-step-text {
      font-size: 13px;
      color: #a1a1aa;
      line-height: 1.5;
    }
    .lumos-onboarding-footer {
      padding: 16px 24px;
      border-top: 1px solid #27272a;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .lumos-onboarding-dots {
      display: flex;
      gap: 6px;
    }
    .lumos-onboarding-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #27272a;
    }
    .lumos-onboarding-dot.active {
      background: #8b5cf6;
    }

    /* Share Link */
    .lumos-share-url {
      display: flex;
      gap: 8px;
      margin-top: 12px;
    }
    .lumos-share-url input {
      flex: 1;
      padding: 8px 12px;
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 6px;
      color: #a1a1aa;
      font-size: 11px;
      font-family: ui-monospace, monospace;
    }

    /* Animation Editor */
    .lumos-animation-editor {
      padding: 12px;
    }
    .lumos-animation-preview {
      height: 60px;
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 12px;
    }
    .lumos-animation-preview-box {
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, #8b5cf6, #06b6d4);
      border-radius: 6px;
    }
    .lumos-keyframe-timeline {
      height: 40px;
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 6px;
      position: relative;
      margin-bottom: 12px;
    }
    .lumos-keyframe-track {
      position: absolute;
      top: 50%;
      left: 12px;
      right: 12px;
      height: 2px;
      background: #3f3f46;
      transform: translateY(-50%);
    }
    .lumos-keyframe-point {
      position: absolute;
      top: 50%;
      width: 12px;
      height: 12px;
      background: #8b5cf6;
      border: 2px solid white;
      border-radius: 50%;
      transform: translate(-50%, -50%);
      cursor: pointer;
    }
    .lumos-animation-controls {
      display: flex;
      gap: 8px;
      margin-bottom: 12px;
    }
    .lumos-animation-control-btn {
      flex: 1;
      padding: 6px;
      background: #27272a;
      border: none;
      border-radius: 4px;
      color: #a1a1aa;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      font-size: 11px;
    }
    .lumos-animation-control-btn:hover {
      background: #3f3f46;
    }
    .lumos-animation-control-btn.active {
      background: #8b5cf6;
      color: white;
    }
    .lumos-easing-select {
      width: 100%;
      margin-bottom: 8px;
    }

    /* Spacing Visualizer */
    .lumos-spacing-overlay {
      position: fixed;
      pointer-events: none;
      z-index: 999997;
    }
    .lumos-spacing-margin {
      background: rgba(249, 115, 22, 0.2);
      border: 1px dashed #f97316;
    }
    .lumos-spacing-padding {
      background: rgba(34, 197, 94, 0.2);
      border: 1px dashed #22c55e;
    }
    .lumos-spacing-label {
      position: absolute;
      background: #18181b;
      color: #fafafa;
      font-size: 9px;
      padding: 2px 4px;
      border-radius: 2px;
      white-space: nowrap;
    }

    /* CSS Variables Panel */
    .lumos-vars-list {
      max-height: 300px;
      overflow-y: auto;
    }
    .lumos-var-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-bottom: 1px solid #27272a;
    }
    .lumos-var-name {
      flex: 1;
      font-family: ui-monospace, monospace;
      font-size: 11px;
      color: #8b5cf6;
    }
    .lumos-var-value {
      font-family: ui-monospace, monospace;
      font-size: 11px;
      color: #a1a1aa;
      max-width: 120px;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .lumos-var-color {
      width: 16px;
      height: 16px;
      border-radius: 3px;
      border: 1px solid #3f3f46;
      flex-shrink: 0;
    }

    /* Element Info Tooltip */
    .lumos-info-tooltip {
      position: fixed;
      background: #0a0a0b;
      border: 1px solid #27272a;
      border-radius: 6px;
      padding: 8px 12px;
      font-size: 11px;
      color: #fafafa;
      z-index: 1000002;
      pointer-events: none;
      box-shadow: 0 4px 12px rgba(0,0,0,0.5);
      max-width: 300px;
    }
    .lumos-info-tooltip-tag {
      color: #f472b6;
      font-weight: 600;
    }
    .lumos-info-tooltip-id {
      color: #fbbf24;
    }
    .lumos-info-tooltip-class {
      color: #60a5fa;
    }
    .lumos-info-tooltip-size {
      color: #71717a;
      margin-top: 4px;
    }

    /* Quick Layout Mode */
    .lumos-layout-panel {
      padding: 12px;
    }
    .lumos-layout-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      margin-bottom: 12px;
    }
    .lumos-layout-btn {
      padding: 12px 8px;
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 6px;
      color: #a1a1aa;
      cursor: pointer;
      text-align: center;
      font-size: 10px;
      transition: all 0.2s;
    }
    .lumos-layout-btn:hover {
      background: #27272a;
      border-color: #3f3f46;
    }
    .lumos-layout-btn.active {
      background: #8b5cf620;
      border-color: #8b5cf6;
      color: #8b5cf6;
    }
    .lumos-layout-btn svg {
      width: 24px;
      height: 24px;
      margin-bottom: 4px;
    }
    .lumos-layout-quick {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 6px;
    }
    .lumos-layout-quick-btn {
      padding: 8px;
      background: #27272a;
      border: none;
      border-radius: 4px;
      color: #a1a1aa;
      font-size: 10px;
      cursor: pointer;
    }
    .lumos-layout-quick-btn:hover {
      background: #3f3f46;
    }

    /* Color Eyedropper */
    .lumos-eyedropper-cursor {
      cursor: crosshair !important;
    }
    .lumos-eyedropper-preview {
      position: fixed;
      width: 100px;
      height: 100px;
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 4px 20px rgba(0,0,0,0.5);
      pointer-events: none;
      z-index: 1000003;
      overflow: hidden;
      image-rendering: pixelated;
    }
    .lumos-eyedropper-color {
      position: fixed;
      background: #0a0a0b;
      border: 1px solid #27272a;
      border-radius: 6px;
      padding: 8px 12px;
      z-index: 1000003;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 11px;
      font-family: ui-monospace, monospace;
    }
    .lumos-eyedropper-swatch {
      width: 24px;
      height: 24px;
      border-radius: 4px;
      border: 1px solid #3f3f46;
    }

    /* Rulers */
    .lumos-ruler {
      position: fixed;
      background: #18181b;
      z-index: 999996;
      user-select: none;
    }
    .lumos-ruler-h {
      top: 0;
      left: 0;
      right: 0;
      height: 20px;
      border-bottom: 1px solid #27272a;
    }
    .lumos-ruler-v {
      top: 0;
      left: 0;
      bottom: 0;
      width: 20px;
      border-right: 1px solid #27272a;
    }
    .lumos-ruler-tick {
      position: absolute;
      color: #71717a;
      font-size: 8px;
    }
    .lumos-ruler-h .lumos-ruler-tick {
      bottom: 2px;
      transform: translateX(-50%);
    }
    .lumos-ruler-v .lumos-ruler-tick {
      right: 2px;
      transform: translateY(-50%) rotate(-90deg);
      transform-origin: right center;
    }
    .lumos-ruler-line {
      position: absolute;
      background: #8b5cf6;
    }
    .lumos-ruler-h .lumos-ruler-line {
      width: 1px;
      height: 100%;
      top: 0;
    }
    .lumos-ruler-v .lumos-ruler-line {
      height: 1px;
      width: 100%;
      left: 0;
    }

    /* DOM Navigation */
    .lumos-dom-nav {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 8px 12px;
      background: #18181b;
      border-bottom: 1px solid #27272a;
    }
    .lumos-dom-nav-btn {
      padding: 4px 8px;
      background: #27272a;
      border: none;
      border-radius: 4px;
      color: #a1a1aa;
      font-size: 10px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .lumos-dom-nav-btn:hover {
      background: #3f3f46;
    }
    .lumos-dom-nav-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .lumos-breadcrumb {
      display: flex;
      align-items: center;
      gap: 4px;
      flex: 1;
      overflow-x: auto;
      font-size: 10px;
    }
    .lumos-breadcrumb-item {
      color: #71717a;
      cursor: pointer;
      white-space: nowrap;
    }
    .lumos-breadcrumb-item:hover {
      color: #a1a1aa;
    }
    .lumos-breadcrumb-item.current {
      color: #8b5cf6;
    }
    .lumos-breadcrumb-sep {
      color: #3f3f46;
    }

    /* Spacing Guides */
    .lumos-spacing-guide {
      position: fixed;
      pointer-events: none;
      z-index: 999998;
    }
    .lumos-spacing-guide-line {
      background: #f59e0b;
      position: absolute;
    }
    .lumos-spacing-guide-label {
      position: absolute;
      background: #f59e0b;
      color: #0a0a0b;
      font-size: 9px;
      padding: 1px 4px;
      border-radius: 2px;
      font-weight: 600;
    }

    /* Quick Actions Floating Bar */
    .lumos-quick-bar {
      position: fixed;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%);
      background: #0a0a0b;
      border: 1px solid #27272a;
      border-radius: 12px;
      padding: 8px;
      display: flex;
      gap: 4px;
      z-index: 1000000;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5);
    }
    .lumos-quick-bar-btn {
      padding: 8px 12px;
      background: transparent;
      border: none;
      border-radius: 8px;
      color: #a1a1aa;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      transition: all 0.2s;
    }
    .lumos-quick-bar-btn:hover {
      background: #27272a;
      color: #fafafa;
    }
    .lumos-quick-bar-btn.active {
      background: #8b5cf6;
      color: white;
    }
    .lumos-quick-bar-divider {
      width: 1px;
      background: #27272a;
      margin: 0 4px;
    }

    /* Box Shadow Editor */
    .lumos-shadow-editor {
      padding: 12px;
    }
    .lumos-shadow-preview {
      height: 100px;
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 12px;
    }
    .lumos-shadow-preview-box {
      width: 60px;
      height: 60px;
      background: #3f3f46;
      border-radius: 8px;
    }
    .lumos-shadow-layers {
      max-height: 150px;
      overflow-y: auto;
      margin-bottom: 12px;
    }
    .lumos-shadow-layer {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px;
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 6px;
      margin-bottom: 6px;
    }
    .lumos-shadow-layer-color {
      width: 24px;
      height: 24px;
      border-radius: 4px;
      border: 1px solid #3f3f46;
      cursor: pointer;
    }
    .lumos-shadow-layer-inputs {
      display: flex;
      gap: 4px;
      flex: 1;
    }
    .lumos-shadow-layer-input {
      width: 40px;
      padding: 4px;
      background: #0a0a0b;
      border: 1px solid #27272a;
      border-radius: 4px;
      color: #a1a1aa;
      font-size: 10px;
      text-align: center;
    }
    .lumos-shadow-layer-remove {
      padding: 4px 8px;
      background: transparent;
      border: none;
      color: #ef4444;
      cursor: pointer;
      font-size: 14px;
    }

    /* Filter Editor */
    .lumos-filter-editor {
      padding: 12px;
    }
    .lumos-filter-preview {
      height: 80px;
      background: linear-gradient(135deg, #8b5cf6 0%, #06b6d4 50%, #f59e0b 100%);
      border-radius: 8px;
      margin-bottom: 12px;
    }
    .lumos-filter-slider {
      margin-bottom: 12px;
    }
    .lumos-filter-slider-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
    }
    .lumos-filter-slider-label {
      font-size: 11px;
      color: #a1a1aa;
    }
    .lumos-filter-slider-value {
      font-size: 11px;
      color: #8b5cf6;
      font-family: ui-monospace, monospace;
    }
    .lumos-filter-range {
      width: 100%;
      height: 4px;
      -webkit-appearance: none;
      background: #27272a;
      border-radius: 2px;
      outline: none;
    }
    .lumos-filter-range::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 14px;
      height: 14px;
      background: #8b5cf6;
      border-radius: 50%;
      cursor: pointer;
    }

    /* Focus Mode */
    .lumos-focus-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.8);
      z-index: 999995;
      pointer-events: none;
    }
    .lumos-focus-highlight {
      position: fixed;
      box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.8);
      z-index: 999996;
      pointer-events: none;
    }

    /* Style Comparison */
    .lumos-compare-panel {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      padding: 12px;
    }
    .lumos-compare-side {
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 8px;
      padding: 12px;
    }
    .lumos-compare-title {
      font-size: 11px;
      color: #71717a;
      margin-bottom: 8px;
      text-transform: uppercase;
    }
    .lumos-compare-selector {
      font-size: 12px;
      color: #8b5cf6;
      margin-bottom: 8px;
      font-family: ui-monospace, monospace;
    }
    .lumos-compare-diff {
      font-size: 11px;
    }
    .lumos-compare-same {
      color: #71717a;
    }
    .lumos-compare-different {
      color: #f59e0b;
    }

    /* Z-Index Manager */
    .lumos-zindex-list {
      max-height: 400px;
      overflow-y: auto;
    }
    .lumos-zindex-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 12px;
      border-bottom: 1px solid #27272a;
      cursor: pointer;
    }
    .lumos-zindex-item:hover {
      background: #18181b;
    }
    .lumos-zindex-item.selected {
      background: #8b5cf620;
    }
    .lumos-zindex-value {
      width: 50px;
      padding: 4px 8px;
      background: #0a0a0b;
      border: 1px solid #27272a;
      border-radius: 4px;
      color: #8b5cf6;
      font-family: ui-monospace, monospace;
      font-size: 11px;
      text-align: center;
    }
    .lumos-zindex-selector {
      flex: 1;
      font-size: 11px;
      color: #a1a1aa;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .lumos-zindex-bar {
      width: 60px;
      height: 4px;
      background: #27272a;
      border-radius: 2px;
      overflow: hidden;
    }
    .lumos-zindex-bar-fill {
      height: 100%;
      background: #8b5cf6;
    }

    /* CSS Audit */
    .lumos-audit-section {
      margin-bottom: 16px;
    }
    .lumos-audit-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: #18181b;
      border-radius: 6px;
      margin-bottom: 8px;
    }
    .lumos-audit-icon {
      width: 20px;
      height: 20px;
    }
    .lumos-audit-icon.pass { color: #22c55e; }
    .lumos-audit-icon.warn { color: #f59e0b; }
    .lumos-audit-icon.fail { color: #ef4444; }
    .lumos-audit-title {
      flex: 1;
      font-size: 12px;
      color: #fafafa;
    }
    .lumos-audit-count {
      font-size: 11px;
      color: #71717a;
    }
    .lumos-audit-items {
      padding-left: 12px;
    }
    .lumos-audit-item {
      padding: 6px 8px;
      font-size: 11px;
      color: #a1a1aa;
      border-left: 2px solid #27272a;
      margin-bottom: 4px;
    }
    .lumos-audit-item code {
      background: #27272a;
      padding: 1px 4px;
      border-radius: 2px;
      font-family: ui-monospace, monospace;
    }

    /* Dark Mode Toggle */
    .lumos-darkmode-toggle {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 6px;
      cursor: pointer;
    }
    .lumos-darkmode-toggle:hover {
      background: #27272a;
    }

    /* Text Shadow Editor */
    .lumos-text-shadow-preview {
      padding: 20px;
      background: #18181b;
      border-radius: 8px;
      margin-bottom: 12px;
      text-align: center;
    }
    .lumos-text-shadow-preview-text {
      font-size: 24px;
      font-weight: 600;
      color: #fafafa;
    }

    /* Responsive Preview */
    .lumos-responsive-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      padding: 12px;
    }
    .lumos-responsive-frame {
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 8px;
      overflow: hidden;
    }
    .lumos-responsive-frame-header {
      padding: 8px;
      border-bottom: 1px solid #27272a;
      font-size: 10px;
      color: #71717a;
      text-align: center;
    }
    .lumos-responsive-frame-content {
      height: 150px;
      overflow: hidden;
    }

    /* Smart Suggestions */
    .lumos-suggestions {
      position: absolute;
      background: #0a0a0b;
      border: 1px solid #27272a;
      border-radius: 6px;
      max-height: 200px;
      overflow-y: auto;
      z-index: 1000003;
      box-shadow: 0 4px 12px rgba(0,0,0,0.5);
    }
    .lumos-suggestion-item {
      padding: 8px 12px;
      font-size: 11px;
      color: #a1a1aa;
      cursor: pointer;
    }
    .lumos-suggestion-item:hover {
      background: #27272a;
      color: #fafafa;
    }
    .lumos-suggestion-item-prop {
      color: #8b5cf6;
    }
    .lumos-suggestion-item-desc {
      color: #71717a;
      font-size: 10px;
      margin-top: 2px;
    }

    /* Transform Editor */
    .lumos-transform-editor {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 380px;
      background: #0a0a0b;
      border: 1px solid #27272a;
      border-radius: 12px;
      z-index: 1000006;
      box-shadow: 0 25px 50px -12px rgba(0,0,0,0.8);
    }
    .lumos-transform-preview {
      width: 80px;
      height: 80px;
      background: linear-gradient(135deg, #3b82f6, #8b5cf6);
      border-radius: 8px;
      transition: transform 0.2s;
    }
    .lumos-transform-slider-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 0;
    }
    .lumos-transform-slider-row label {
      width: 70px;
      font-size: 11px;
      color: #a1a1aa;
    }
    .lumos-transform-slider-row input[type="range"] {
      flex: 1;
      accent-color: #8b5cf6;
    }
    .lumos-transform-slider-row input[type="number"] {
      width: 60px;
      padding: 4px 8px;
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 4px;
      color: #fafafa;
      font-size: 11px;
    }

    /* Position Editor */
    .lumos-position-editor {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 340px;
      background: #0a0a0b;
      border: 1px solid #27272a;
      border-radius: 12px;
      z-index: 1000006;
    }
    .lumos-position-type-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 6px;
      padding: 12px;
      background: #18181b;
      border-radius: 8px;
    }
    .lumos-position-type-btn {
      padding: 8px 4px;
      background: #09090b;
      border: 1px solid #27272a;
      border-radius: 6px;
      color: #a1a1aa;
      font-size: 10px;
      cursor: pointer;
      text-align: center;
      transition: all 0.2s;
    }
    .lumos-position-type-btn:hover {
      background: #27272a;
      color: #fafafa;
    }
    .lumos-position-type-btn.active {
      background: #8b5cf6;
      border-color: #8b5cf6;
      color: white;
    }
    .lumos-position-offsets {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
    }
    .lumos-offset-input {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .lumos-offset-input label {
      font-size: 10px;
      color: #71717a;
      text-transform: uppercase;
    }
    .lumos-offset-input input {
      padding: 8px;
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 6px;
      color: #fafafa;
      font-size: 12px;
    }

    /* Border Editor */
    .lumos-border-editor {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 380px;
      background: #0a0a0b;
      border: 1px solid #27272a;
      border-radius: 12px;
      z-index: 1000006;
    }
    .lumos-border-sides {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 4px;
      margin-bottom: 16px;
    }
    .lumos-border-side-btn {
      padding: 8px;
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 6px;
      color: #a1a1aa;
      font-size: 10px;
      cursor: pointer;
      text-align: center;
    }
    .lumos-border-side-btn.active {
      background: #8b5cf6;
      border-color: #8b5cf6;
      color: white;
    }
    .lumos-border-preview-box {
      width: 100px;
      height: 100px;
      background: #18181b;
      margin: 0 auto 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #71717a;
      font-size: 10px;
    }
    .lumos-border-style-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 6px;
    }
    .lumos-border-style-btn {
      padding: 8px 4px;
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 6px;
      color: #a1a1aa;
      font-size: 10px;
      cursor: pointer;
      text-align: center;
    }
    .lumos-border-style-btn.active {
      background: #8b5cf6;
      border-color: #8b5cf6;
      color: white;
    }

    /* Cursor Picker */
    .lumos-cursor-picker {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 420px;
      background: #0a0a0b;
      border: 1px solid #27272a;
      border-radius: 12px;
      z-index: 1000006;
    }
    .lumos-cursor-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 8px;
      max-height: 300px;
      overflow-y: auto;
    }
    .lumos-cursor-btn {
      padding: 12px 8px;
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 8px;
      color: #a1a1aa;
      font-size: 10px;
      cursor: pointer;
      text-align: center;
      transition: all 0.2s;
    }
    .lumos-cursor-btn:hover {
      background: #27272a;
      color: #fafafa;
    }
    .lumos-cursor-btn.active {
      background: #8b5cf6;
      border-color: #8b5cf6;
      color: white;
    }
    .lumos-cursor-preview {
      width: 60px;
      height: 60px;
      background: #18181b;
      border-radius: 8px;
      margin: 0 auto 8px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* Overflow Controls */
    .lumos-overflow-editor {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 340px;
      background: #0a0a0b;
      border: 1px solid #27272a;
      border-radius: 12px;
      z-index: 1000006;
    }
    .lumos-overflow-axis {
      margin-bottom: 16px;
    }
    .lumos-overflow-axis-label {
      font-size: 11px;
      color: #71717a;
      margin-bottom: 8px;
      text-transform: uppercase;
    }
    .lumos-overflow-options {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 6px;
    }
    .lumos-overflow-btn {
      padding: 10px 4px;
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 6px;
      color: #a1a1aa;
      font-size: 10px;
      cursor: pointer;
      text-align: center;
    }
    .lumos-overflow-btn:hover {
      background: #27272a;
    }
    .lumos-overflow-btn.active {
      background: #8b5cf6;
      border-color: #8b5cf6;
      color: white;
    }

    /* Display/Visibility Toggles */
    .lumos-display-editor {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 360px;
      background: #0a0a0b;
      border: 1px solid #27272a;
      border-radius: 12px;
      z-index: 1000006;
    }
    .lumos-display-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
    }
    .lumos-display-btn {
      padding: 12px 8px;
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 8px;
      color: #a1a1aa;
      font-size: 11px;
      cursor: pointer;
      text-align: center;
      transition: all 0.2s;
    }
    .lumos-display-btn:hover {
      background: #27272a;
    }
    .lumos-display-btn.active {
      background: #8b5cf6;
      border-color: #8b5cf6;
      color: white;
    }
    .lumos-display-btn-icon {
      font-size: 18px;
      margin-bottom: 4px;
    }

    /* Flex Item Controls */
    .lumos-flex-item-editor {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 380px;
      background: #0a0a0b;
      border: 1px solid #27272a;
      border-radius: 12px;
      z-index: 1000006;
    }
    .lumos-flex-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 0;
      border-bottom: 1px solid #1f1f23;
    }
    .lumos-flex-row:last-child {
      border-bottom: none;
    }
    .lumos-flex-row label {
      width: 90px;
      font-size: 11px;
      color: #a1a1aa;
    }
    .lumos-flex-row input[type="number"] {
      width: 80px;
      padding: 8px;
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 6px;
      color: #fafafa;
      font-size: 12px;
    }
    .lumos-flex-row input[type="text"] {
      flex: 1;
      padding: 8px;
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 6px;
      color: #fafafa;
      font-size: 12px;
    }
    .lumos-flex-align-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 4px;
    }
    .lumos-flex-align-btn {
      padding: 8px;
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 4px;
      color: #a1a1aa;
      font-size: 9px;
      cursor: pointer;
      text-align: center;
    }
    .lumos-flex-align-btn.active {
      background: #8b5cf6;
      border-color: #8b5cf6;
      color: white;
    }

    /* Aspect Ratio Editor */
    .lumos-aspect-editor {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 340px;
      background: #0a0a0b;
      border: 1px solid #27272a;
      border-radius: 12px;
      z-index: 1000006;
    }
    .lumos-aspect-presets {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      margin-bottom: 16px;
    }
    .lumos-aspect-preset {
      padding: 12px;
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 8px;
      cursor: pointer;
      text-align: center;
    }
    .lumos-aspect-preset:hover {
      background: #27272a;
    }
    .lumos-aspect-preset.active {
      background: #8b5cf6;
      border-color: #8b5cf6;
    }
    .lumos-aspect-preset-box {
      margin: 0 auto 8px;
      background: #3b82f6;
      border-radius: 2px;
    }
    .lumos-aspect-preset-label {
      font-size: 10px;
      color: #a1a1aa;
    }
    .lumos-aspect-preset.active .lumos-aspect-preset-label {
      color: white;
    }
    .lumos-aspect-custom {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px;
      background: #18181b;
      border-radius: 8px;
    }
    .lumos-aspect-custom input {
      width: 60px;
      padding: 8px;
      background: #09090b;
      border: 1px solid #27272a;
      border-radius: 4px;
      color: #fafafa;
      font-size: 12px;
      text-align: center;
    }
    .lumos-aspect-custom span {
      color: #71717a;
      font-size: 14px;
    }

    /* Background Editor */
    .lumos-background-editor {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 400px;
      max-height: 80vh;
      background: #0a0a0b;
      border: 1px solid #27272a;
      border-radius: 12px;
      z-index: 1000006;
      overflow-y: auto;
    }
    .lumos-bg-tabs {
      display: flex;
      border-bottom: 1px solid #27272a;
    }
    .lumos-bg-tab {
      flex: 1;
      padding: 12px;
      background: transparent;
      border: none;
      color: #71717a;
      font-size: 12px;
      cursor: pointer;
      border-bottom: 2px solid transparent;
    }
    .lumos-bg-tab.active {
      color: #fafafa;
      border-bottom-color: #8b5cf6;
    }
    .lumos-bg-content {
      padding: 16px;
    }
    .lumos-bg-preview {
      width: 100%;
      height: 120px;
      border-radius: 8px;
      margin-bottom: 16px;
      background-size: cover;
      background-position: center;
      border: 1px solid #27272a;
    }
    .lumos-bg-url-input {
      width: 100%;
      padding: 10px 12px;
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 8px;
      color: #fafafa;
      font-size: 12px;
      margin-bottom: 12px;
    }
    .lumos-bg-size-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 6px;
      margin-bottom: 12px;
    }
    .lumos-bg-size-btn {
      padding: 8px;
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 6px;
      color: #a1a1aa;
      font-size: 10px;
      cursor: pointer;
      text-align: center;
    }
    .lumos-bg-size-btn.active {
      background: #8b5cf6;
      border-color: #8b5cf6;
      color: white;
    }
    .lumos-bg-position-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 4px;
    }
    .lumos-bg-position-btn {
      padding: 10px;
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 4px;
      color: #71717a;
      font-size: 16px;
      cursor: pointer;
      text-align: center;
    }
    .lumos-bg-position-btn:hover {
      background: #27272a;
    }
    .lumos-bg-position-btn.active {
      background: #8b5cf6;
      border-color: #8b5cf6;
      color: white;
    }

    /* Outline Editor */
    .lumos-outline-editor {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 360px;
      background: #0a0a0b;
      border: 1px solid #27272a;
      border-radius: 12px;
      z-index: 1000006;
    }
    .lumos-outline-preview {
      width: 80px;
      height: 80px;
      background: #18181b;
      margin: 0 auto 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #71717a;
      font-size: 10px;
    }

    /* Text Formatting Toolbar */
    .lumos-text-toolbar {
      position: fixed;
      background: #0a0a0b;
      border: 1px solid #27272a;
      border-radius: 8px;
      padding: 8px;
      display: flex;
      gap: 4px;
      z-index: 1000006;
      box-shadow: 0 4px 12px rgba(0,0,0,0.5);
    }
    .lumos-text-toolbar-btn {
      width: 32px;
      height: 32px;
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 6px;
      color: #a1a1aa;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: 600;
    }
    .lumos-text-toolbar-btn:hover {
      background: #27272a;
      color: #fafafa;
    }
    .lumos-text-toolbar-btn.active {
      background: #8b5cf6;
      border-color: #8b5cf6;
      color: white;
    }
    .lumos-text-toolbar-divider {
      width: 1px;
      background: #27272a;
      margin: 4px 4px;
    }

    /* Transition Presets */
    .lumos-transition-editor {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 400px;
      background: #0a0a0b;
      border: 1px solid #27272a;
      border-radius: 12px;
      z-index: 1000006;
    }
    .lumos-transition-preset-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
    }
    .lumos-transition-preset {
      padding: 12px;
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s;
    }
    .lumos-transition-preset:hover {
      background: #27272a;
      transform: scale(1.02);
    }
    .lumos-transition-preset-name {
      font-size: 12px;
      color: #fafafa;
      margin-bottom: 4px;
    }
    .lumos-transition-preset-preview {
      width: 100%;
      height: 4px;
      background: #3b82f6;
      border-radius: 2px;
    }

    /* Object Fit Controls */
    .lumos-object-fit-editor {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 340px;
      background: #0a0a0b;
      border: 1px solid #27272a;
      border-radius: 12px;
      z-index: 1000006;
    }
    .lumos-object-fit-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
    }
    .lumos-object-fit-btn {
      padding: 16px 8px;
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 8px;
      color: #a1a1aa;
      cursor: pointer;
      text-align: center;
      font-size: 11px;
    }
    .lumos-object-fit-btn:hover {
      background: #27272a;
    }
    .lumos-object-fit-btn.active {
      background: #8b5cf6;
      border-color: #8b5cf6;
      color: white;
    }
    .lumos-object-fit-preview {
      width: 40px;
      height: 30px;
      background: linear-gradient(135deg, #3b82f6 50%, #8b5cf6 50%);
      margin: 0 auto 8px;
      border-radius: 4px;
    }

    /* Clip Path Editor */
    .lumos-clip-path-editor {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 420px;
      background: #0a0a0b;
      border: 1px solid #27272a;
      border-radius: 12px;
      z-index: 1000006;
    }
    .lumos-clip-path-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
    }
    .lumos-clip-path-btn {
      padding: 16px;
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 8px;
      cursor: pointer;
      text-align: center;
    }
    .lumos-clip-path-btn:hover {
      background: #27272a;
    }
    .lumos-clip-path-btn.active {
      background: #8b5cf6;
      border-color: #8b5cf6;
    }
    .lumos-clip-path-shape {
      width: 40px;
      height: 40px;
      background: #3b82f6;
      margin: 0 auto 8px;
    }
    .lumos-clip-path-label {
      font-size: 10px;
      color: #a1a1aa;
    }
    .lumos-clip-path-btn.active .lumos-clip-path-label {
      color: white;
    }

    /* Blend Mode Picker */
    .lumos-blend-mode-editor {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 380px;
      background: #0a0a0b;
      border: 1px solid #27272a;
      border-radius: 12px;
      z-index: 1000006;
    }
    .lumos-blend-mode-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 6px;
      max-height: 300px;
      overflow-y: auto;
    }
    .lumos-blend-mode-btn {
      padding: 10px 8px;
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 6px;
      color: #a1a1aa;
      font-size: 10px;
      cursor: pointer;
      text-align: center;
    }
    .lumos-blend-mode-btn:hover {
      background: #27272a;
      color: #fafafa;
    }
    .lumos-blend-mode-btn.active {
      background: #8b5cf6;
      border-color: #8b5cf6;
      color: white;
    }
    .lumos-blend-preview {
      width: 80px;
      height: 60px;
      margin: 0 auto 16px;
      position: relative;
      border-radius: 8px;
      overflow: hidden;
    }
    .lumos-blend-preview-layer1 {
      position: absolute;
      inset: 0;
      background: linear-gradient(135deg, #ef4444, #f97316);
    }
    .lumos-blend-preview-layer2 {
      position: absolute;
      inset: 0;
      background: linear-gradient(225deg, #3b82f6, #8b5cf6);
    }

    /* Quick Controls Panel */
    .lumos-quick-controls {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 320px;
      background: #0a0a0b;
      border: 1px solid #27272a;
      border-radius: 12px;
      z-index: 1000006;
    }
    .lumos-quick-control-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      border-bottom: 1px solid #1f1f23;
    }
    .lumos-quick-control-row:last-child {
      border-bottom: none;
    }
    .lumos-quick-control-label {
      font-size: 12px;
      color: #a1a1aa;
    }
    .lumos-quick-control-value {
      display: flex;
      gap: 6px;
    }
    .lumos-quick-toggle {
      width: 40px;
      height: 22px;
      background: #27272a;
      border: none;
      border-radius: 11px;
      cursor: pointer;
      position: relative;
      transition: background 0.2s;
    }
    .lumos-quick-toggle::after {
      content: '';
      position: absolute;
      top: 2px;
      left: 2px;
      width: 18px;
      height: 18px;
      background: #71717a;
      border-radius: 50%;
      transition: transform 0.2s, background 0.2s;
    }
    .lumos-quick-toggle.active {
      background: #8b5cf6;
    }
    .lumos-quick-toggle.active::after {
      transform: translateX(18px);
      background: white;
    }

    /* Typography Editor */
    .lumos-typography-editor {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 380px;
      background: #0a0a0b;
      border: 1px solid #27272a;
      border-radius: 12px;
      z-index: 1000006;
    }
    .lumos-typo-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 0;
      border-bottom: 1px solid #1f1f23;
    }
    .lumos-typo-row:last-child {
      border-bottom: none;
    }
    .lumos-typo-row label {
      width: 100px;
      font-size: 11px;
      color: #a1a1aa;
    }
    .lumos-typo-row input[type="range"] {
      flex: 1;
      accent-color: #8b5cf6;
    }
    .lumos-typo-row .lumos-typo-value {
      width: 50px;
      font-size: 11px;
      color: #fafafa;
      text-align: right;
    }

    /* Grid Builder */
    .lumos-grid-builder {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 450px;
      background: #0a0a0b;
      border: 1px solid #27272a;
      border-radius: 12px;
      z-index: 1000006;
    }
    .lumos-grid-preview {
      display: grid;
      gap: 4px;
      padding: 16px;
      background: #18181b;
      border-radius: 8px;
      min-height: 120px;
    }
    .lumos-grid-preview-cell {
      background: #3b82f6;
      border-radius: 4px;
      min-height: 30px;
      opacity: 0.6;
    }
    .lumos-grid-controls {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }
    .lumos-grid-control {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .lumos-grid-control label {
      font-size: 10px;
      color: #71717a;
      text-transform: uppercase;
    }
    .lumos-grid-control input {
      padding: 8px;
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 6px;
      color: #fafafa;
      font-size: 12px;
    }

    /* 3D/Perspective Controls */
    .lumos-3d-editor {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 400px;
      background: #0a0a0b;
      border: 1px solid #27272a;
      border-radius: 12px;
      z-index: 1000006;
    }
    .lumos-3d-preview {
      width: 100px;
      height: 100px;
      background: linear-gradient(135deg, #3b82f6, #8b5cf6);
      margin: 0 auto 16px;
      border-radius: 8px;
      transition: transform 0.3s, perspective 0.3s;
    }
    .lumos-3d-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 0;
    }
    .lumos-3d-row label {
      width: 100px;
      font-size: 11px;
      color: #a1a1aa;
    }
    .lumos-3d-row input[type="range"] {
      flex: 1;
      accent-color: #8b5cf6;
    }
    .lumos-3d-row span {
      width: 60px;
      font-size: 11px;
      color: #fafafa;
      text-align: right;
    }

    /* Scroll Snap Controls */
    .lumos-scroll-snap-editor {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 360px;
      background: #0a0a0b;
      border: 1px solid #27272a;
      border-radius: 12px;
      z-index: 1000006;
    }
    .lumos-snap-section {
      margin-bottom: 16px;
    }
    .lumos-snap-section-label {
      font-size: 10px;
      color: #71717a;
      text-transform: uppercase;
      margin-bottom: 8px;
    }
    .lumos-snap-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 6px;
    }
    .lumos-snap-btn {
      padding: 10px 8px;
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 6px;
      color: #a1a1aa;
      font-size: 10px;
      cursor: pointer;
      text-align: center;
    }
    .lumos-snap-btn:hover {
      background: #27272a;
    }
    .lumos-snap-btn.active {
      background: #8b5cf6;
      border-color: #8b5cf6;
      color: white;
    }

    /* Writing Mode Controls */
    .lumos-writing-mode-editor {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 340px;
      background: #0a0a0b;
      border: 1px solid #27272a;
      border-radius: 12px;
      z-index: 1000006;
    }
    .lumos-writing-preview {
      padding: 16px;
      background: #18181b;
      border-radius: 8px;
      margin-bottom: 16px;
      min-height: 80px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fafafa;
      font-size: 14px;
    }

    /* Word Break Controls */
    .lumos-word-break-editor {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 340px;
      background: #0a0a0b;
      border: 1px solid #27272a;
      border-radius: 12px;
      z-index: 1000006;
    }
    .lumos-word-break-preview {
      padding: 12px;
      background: #18181b;
      border-radius: 8px;
      margin-bottom: 16px;
      font-size: 12px;
      color: #a1a1aa;
      word-break: break-all;
    }

    /* Resize Control */
    .lumos-resize-editor {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 300px;
      background: #0a0a0b;
      border: 1px solid #27272a;
      border-radius: 12px;
      z-index: 1000006;
    }
    .lumos-resize-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
    }
    .lumos-resize-btn {
      padding: 16px;
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 8px;
      color: #a1a1aa;
      font-size: 11px;
      cursor: pointer;
      text-align: center;
    }
    .lumos-resize-btn:hover {
      background: #27272a;
    }
    .lumos-resize-btn.active {
      background: #8b5cf6;
      border-color: #8b5cf6;
      color: white;
    }
    .lumos-resize-icon {
      font-size: 20px;
      margin-bottom: 4px;
    }
  `;
  document.head.appendChild(style);

  // Icons
  const icons = {
    paintbrush: '<svg viewBox="0 0 24 24" stroke-width="2"><path d="M18.37 2.63L14 7l-1.59-1.59a2 2 0 0 0-2.82 0L8 7l9 9 1.59-1.59a2 2 0 0 0 0-2.82L17 10l4.37-4.37a2.12 2.12 0 1 0-3-3Z"/><path d="M9 8c-2 3-4 3.5-7 4l8 10c2-1 6-5 6-7"/></svg>',
    close: '<svg viewBox="0 0 24 24" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>',
    cursor: '<svg viewBox="0 0 24 24" stroke-width="2"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/></svg>',
    undo: '<svg viewBox="0 0 24 24" stroke-width="2"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>',
    redo: '<svg viewBox="0 0 24 24" stroke-width="2"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"/></svg>',
    monitor: '<svg viewBox="0 0 24 24" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>',
    tablet: '<svg viewBox="0 0 24 24" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2"/></svg>',
    phone: '<svg viewBox="0 0 24 24" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2"/></svg>',
    layers: '<svg viewBox="0 0 24 24" stroke-width="2"><polygon points="12,2 2,7 12,12 22,7"/><polyline points="2,17 12,22 22,17"/><polyline points="2,12 12,17 22,12"/></svg>',
    sidebar: '<svg viewBox="0 0 24 24" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>',
    chevron: '<svg viewBox="0 0 24 24" stroke-width="2"><polyline points="9,18 15,12 9,6"/></svg>',
    copy: '<svg viewBox="0 0 24 24" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
    download: '<svg viewBox="0 0 24 24" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
    upload: '<svg viewBox="0 0 24 24" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17,8 12,3 7,8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>',
    trash: '<svg viewBox="0 0 24 24" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
    github: '<svg viewBox="0 0 24 24" stroke-width="2"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>',
    check: '<svg viewBox="0 0 24 24" stroke-width="2"><polyline points="20,6 9,17 4,12"/></svg>',
    box: '<svg viewBox="0 0 24 24" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>',
    paste: '<svg viewBox="0 0 24 24" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>',
    ruler: '<svg viewBox="0 0 24 24" stroke-width="2"><path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z"/><path d="m14.5 12.5 2-2"/><path d="m11.5 9.5 2-2"/><path d="m8.5 6.5 2-2"/><path d="m17.5 15.5 2-2"/></svg>',
    code: '<svg viewBox="0 0 24 24" stroke-width="2"><polyline points="16,18 22,12 16,6"/><polyline points="8,6 2,12 8,18"/></svg>',
    eye: '<svg viewBox="0 0 24 24" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
    accessibility: '<svg viewBox="0 0 24 24" stroke-width="2"><circle cx="12" cy="4" r="2"/><path d="M4 20l3-10"/><path d="M20 20l-3-10"/><path d="m12 12-3-2h6l-3 2v3l3 4"/></svg>',
    play: '<svg viewBox="0 0 24 24" stroke-width="2"><polygon points="5,3 19,12 5,21"/></svg>',
    palette: '<svg viewBox="0 0 24 24" stroke-width="2"><circle cx="13.5" cy="6.5" r="0.5" fill="currentColor"/><circle cx="17.5" cy="10.5" r="0.5" fill="currentColor"/><circle cx="8.5" cy="7.5" r="0.5" fill="currentColor"/><circle cx="6.5" cy="12.5" r="0.5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.555C21.965 6.012 17.461 2 12 2z"/></svg>',
    type: '<svg viewBox="0 0 24 24" stroke-width="2"><polyline points="4,7 4,4 20,4 20,7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>',
    alertCircle: '<svg viewBox="0 0 24 24" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
    checkCircle: '<svg viewBox="0 0 24 24" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22,4 12,14.01 9,11.01"/></svg>',
    alertTriangle: '<svg viewBox="0 0 24 24" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    bookmark: '<svg viewBox="0 0 24 24" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>',
    search: '<svg viewBox="0 0 24 24" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>',
    command: '<svg viewBox="0 0 24 24" stroke-width="2"><path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z"/></svg>',
    clock: '<svg viewBox="0 0 24 24" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>',
    settings: '<svg viewBox="0 0 24 24" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>',
    star: '<svg viewBox="0 0 24 24" stroke-width="2"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>',
    share: '<svg viewBox="0 0 24 24" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>',
    messageCircle: '<svg viewBox="0 0 24 24" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>',
    move: '<svg viewBox="0 0 24 24" stroke-width="2"><polyline points="5,9 2,12 5,15"/><polyline points="9,5 12,2 15,5"/><polyline points="15,19 12,22 9,19"/><polyline points="19,9 22,12 19,15"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="22"/></svg>',
    grid: '<svg viewBox="0 0 24 24" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>',
    help: '<svg viewBox="0 0 24 24" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    keyboard: '<svg viewBox="0 0 24 24" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 8h.001M10 8h.001M14 8h.001M18 8h.001M8 12h.001M12 12h.001M16 12h.001M6 16h12"/></svg>',
    zap: '<svg viewBox="0 0 24 24" stroke-width="2"><polygon points="13,2 3,14 12,14 11,22 21,10 12,10"/></svg>',
    camera: '<svg viewBox="0 0 24 24" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>',
    droplet: '<svg viewBox="0 0 24 24" stroke-width="2"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>',
    layout: '<svg viewBox="0 0 24 24" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>',
    arrowUp: '<svg viewBox="0 0 24 24" stroke-width="2"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5,12 12,5 19,12"/></svg>',
    arrowDown: '<svg viewBox="0 0 24 24" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19,12 12,19 5,12"/></svg>',
    film: '<svg viewBox="0 0 24 24" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/></svg>',
    crosshair: '<svg viewBox="0 0 24 24" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="18" y2="12"/><line x1="6" y1="12" x2="2" y2="12"/><line x1="12" y1="6" x2="12" y2="2"/><line x1="12" y1="22" x2="12" y2="18"/></svg>',
    maximize: '<svg viewBox="0 0 24 24" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>',
    cornerUpLeft: '<svg viewBox="0 0 24 24" stroke-width="2"><polyline points="9,14 4,9 9,4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg>',
    alignLeft: '<svg viewBox="0 0 24 24" stroke-width="2"><line x1="17" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="17" y1="18" x2="3" y2="18"/></svg>',
    alignCenter: '<svg viewBox="0 0 24 24" stroke-width="2"><line x1="18" y1="10" x2="6" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="18" y1="18" x2="6" y2="18"/></svg>',
    alignRight: '<svg viewBox="0 0 24 24" stroke-width="2"><line x1="21" y1="10" x2="7" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="21" y1="18" x2="7" y2="18"/></svg>',
    columns: '<svg viewBox="0 0 24 24" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="3" x2="12" y2="21"/></svg>',
    rows: '<svg viewBox="0 0 24 24" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="12" x2="21" y2="12"/></svg>',
    spacing: '<svg viewBox="0 0 24 24" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27,6.96 12,12.01 20.73,6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>',
    shadow: '<svg viewBox="0 0 24 24" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M21 12H12V21" opacity="0.3"/></svg>',
    sliders: '<svg viewBox="0 0 24 24" stroke-width="2"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>',
    focus: '<svg viewBox="0 0 24 24" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4"/></svg>',
    gitCompare: '<svg viewBox="0 0 24 24" stroke-width="2"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M6 21V9a9 9 0 0 0 9 9"/></svg>',
    layersIcon: '<svg viewBox="0 0 24 24" stroke-width="2"><polygon points="12,2 2,7 12,12 22,7"/><polyline points="2,17 12,22 22,17"/><polyline points="2,12 12,17 22,12"/></svg>',
    fileSearch: '<svg viewBox="0 0 24 24" stroke-width="2"><path d="M4 22h14a2 2 0 0 0 2-2V7.5L14.5 2H6a2 2 0 0 0-2 2v3"/><polyline points="14,2 14,8 20,8"/><circle cx="5" cy="14" r="3"/><path d="m7 16.5 1.5 1.5"/></svg>',
    moon: '<svg viewBox="0 0 24 24" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
    sun: '<svg viewBox="0 0 24 24" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>',
    textCursor: '<svg viewBox="0 0 24 24" stroke-width="2"><path d="M17 6H7a4 4 0 0 0-4 4v1h2v-1a2 2 0 0 1 2-2h4v12H9v2h6v-2h-2V8h4a2 2 0 0 1 2 2v1h2v-1a4 4 0 0 0-4-4z"/></svg>',
    smartphone: '<svg viewBox="0 0 24 24" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>',
    lightbulb: '<svg viewBox="0 0 24 24" stroke-width="2"><path d="M9 18h6M10 22h4M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/></svg>',
    rotate: '<svg viewBox="0 0 24 24" stroke-width="2"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>',
    scale: '<svg viewBox="0 0 24 24" stroke-width="2"><path d="M21 3H15M21 3V9M21 3L14 10M3 21H9M3 21V15M3 21L10 14"/></svg>',
    mapPin: '<svg viewBox="0 0 24 24" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
    square: '<svg viewBox="0 0 24 24" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>',
    mousePointer: '<svg viewBox="0 0 24 24" stroke-width="2"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/><path d="M13 13l6 6"/></svg>',
    scrollIcon: '<svg viewBox="0 0 24 24" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="6" x2="12" y2="10"/></svg>',
    eyeOff: '<svg viewBox="0 0 24 24" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>',
    flexGrow: '<svg viewBox="0 0 24 24" stroke-width="2"><rect x="2" y="6" width="6" height="12" rx="1"/><rect x="16" y="6" width="6" height="12" rx="1"/><path d="M8 12h8M11 9l3 3-3 3"/></svg>',
    ratio: '<svg viewBox="0 0 24 24" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 3v18M3 12h18"/></svg>',
    image: '<svg viewBox="0 0 24 24" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>',
    outlineIcon: '<svg viewBox="0 0 24 24" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke-dasharray="4 2"/></svg>',
    bold: '<svg viewBox="0 0 24 24" stroke-width="2"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/></svg>',
    italic: '<svg viewBox="0 0 24 24" stroke-width="2"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>',
    underline: '<svg viewBox="0 0 24 24" stroke-width="2"><path d="M6 4v6a6 6 0 0 0 12 0V4"/><line x1="4" y1="20" x2="20" y2="20"/></svg>',
    timer: '<svg viewBox="0 0 24 24" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>',
    cropIcon: '<svg viewBox="0 0 24 24" stroke-width="2"><path d="M6 2v14a2 2 0 0 0 2 2h14"/><path d="M18 22V8a2 2 0 0 0-2-2H2"/></svg>',
    scissors: '<svg viewBox="0 0 24 24" stroke-width="2"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>',
    blendMode: '<svg viewBox="0 0 24 24" stroke-width="2"><circle cx="9" cy="9" r="6"/><circle cx="15" cy="15" r="6"/></svg>',
    pointerIcon: '<svg viewBox="0 0 24 24" stroke-width="2"><path d="M22 14a8 8 0 0 1-8 8"/><path d="M18 11v-1a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"/><path d="M14 10V9a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v1"/><path d="M10 9.5V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v10"/><path d="M18 11a2 2 0 1 1 4 0v3a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/></svg>',
    textSelect: '<svg viewBox="0 0 24 24" stroke-width="2"><path d="M5 3a2 2 0 0 0-2 2"/><path d="M19 3a2 2 0 0 1 2 2"/><path d="M21 19a2 2 0 0 1-2 2"/><path d="M5 21a2 2 0 0 1-2-2"/><path d="M9 3h1"/><path d="M9 21h1"/><path d="M14 3h1"/><path d="M14 21h1"/><path d="M3 9v1"/><path d="M21 9v1"/><path d="M3 14v1"/><path d="M21 14v1"/></svg>',
    letterSpacing: '<svg viewBox="0 0 24 24" stroke-width="2"><path d="M7 8h10M17 12V8M7 12V8"/><line x1="3" y1="20" x2="7" y2="20"/><line x1="17" y1="20" x2="21" y2="20"/><polyline points="5,18 5,22"/><polyline points="19,18 19,22"/></svg>',
    lineHeight: '<svg viewBox="0 0 24 24" stroke-width="2"><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="12" x2="3" y2="12"/><line x1="21" y1="18" x2="3" y2="18"/><path d="M4 2v20M20 2v20"/></svg>',
    gridTemplate: '<svg viewBox="0 0 24 24" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>',
    cube3d: '<svg viewBox="0 0 24 24" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27,6.96 12,12.01 20.73,6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>',
    scrollSnap: '<svg viewBox="0 0 24 24" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="3" x2="12" y2="21"/><circle cx="12" cy="12" r="2" fill="currentColor"/></svg>',
    writingMode: '<svg viewBox="0 0 24 24" stroke-width="2"><path d="M12 19V5M5 12h14"/><path d="M5 5h14M5 19h14"/></svg>',
    wordBreak: '<svg viewBox="0 0 24 24" stroke-width="2"><path d="M10 4v16"/><path d="M14 4v16"/><path d="M3 8h4M17 8h4M3 16h4M17 16h4"/></svg>',
    resizeIcon: '<svg viewBox="0 0 24 24" stroke-width="2"><path d="M21 21l-6-6m6 6v-4.8m0 4.8h-4.8"/><path d="M3 16.2V21m0 0h4.8M3 21l6-6"/><rect x="3" y="3" width="18" height="18" rx="2"/></svg>',
  };

  // Helper: RGB to Hex
  function rgbToHex(rgb) {
    if (!rgb || rgb === 'transparent' || rgb === 'rgba(0, 0, 0, 0)') return '';
    const match = rgb.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!match) return rgb;
    return '#' + [match[1], match[2], match[3]].map(x => {
      const hex = parseInt(x).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  }

  // Helper: Generate selector
  function generateSelector(el) {
    if (!el || el === document.body || el === document.documentElement) return 'body';
    if (el.id) return '#' + el.id;
    if (el.className && typeof el.className === 'string') {
      const classes = el.className.split(' ').filter(c => c && !c.startsWith('lumos-')).slice(0, 2).join('.');
      if (classes) return el.tagName.toLowerCase() + '.' + classes;
    }
    const path = [];
    let current = el;
    while (current && current.nodeType === Node.ELEMENT_NODE && current !== document.body) {
      let selector = current.nodeName.toLowerCase();
      if (current.id) {
        path.unshift('#' + current.id);
        break;
      }
      let nth = 1, sibling = current;
      while (sibling = sibling.previousElementSibling) {
        if (sibling.nodeName === current.nodeName) nth++;
      }
      if (nth > 1) selector += ':nth-of-type(' + nth + ')';
      path.unshift(selector);
      current = current.parentNode;
    }
    return path.join(' > ');
  }

  // Helper: Get element styles
  function getElementStyles(el) {
    const cs = getComputedStyle(el);
    return {
      display: cs.display,
      position: cs.position,
      flexDirection: cs.flexDirection,
      flexWrap: cs.flexWrap,
      justifyContent: cs.justifyContent,
      alignItems: cs.alignItems,
      gap: cs.gap,
      flexGrow: cs.flexGrow,
      flexShrink: cs.flexShrink,
      flexBasis: cs.flexBasis,
      order: cs.order,
      alignSelf: cs.alignSelf,
      gridTemplateColumns: cs.gridTemplateColumns,
      gridTemplateRows: cs.gridTemplateRows,
      width: cs.width,
      height: cs.height,
      minWidth: cs.minWidth,
      maxWidth: cs.maxWidth,
      minHeight: cs.minHeight,
      maxHeight: cs.maxHeight,
      padding: cs.padding,
      paddingTop: cs.paddingTop,
      paddingRight: cs.paddingRight,
      paddingBottom: cs.paddingBottom,
      paddingLeft: cs.paddingLeft,
      margin: cs.margin,
      marginTop: cs.marginTop,
      marginRight: cs.marginRight,
      marginBottom: cs.marginBottom,
      marginLeft: cs.marginLeft,
      fontFamily: cs.fontFamily,
      fontSize: cs.fontSize,
      fontWeight: cs.fontWeight,
      lineHeight: cs.lineHeight,
      letterSpacing: cs.letterSpacing,
      textAlign: cs.textAlign,
      textDecoration: cs.textDecoration,
      textTransform: cs.textTransform,
      whiteSpace: cs.whiteSpace,
      color: rgbToHex(cs.color),
      backgroundColor: rgbToHex(cs.backgroundColor),
      backgroundImage: cs.backgroundImage,
      backgroundSize: cs.backgroundSize,
      backgroundPosition: cs.backgroundPosition,
      backgroundRepeat: cs.backgroundRepeat,
      borderRadius: cs.borderRadius,
      borderTopLeftRadius: cs.borderTopLeftRadius,
      borderTopRightRadius: cs.borderTopRightRadius,
      borderBottomRightRadius: cs.borderBottomRightRadius,
      borderBottomLeftRadius: cs.borderBottomLeftRadius,
      borderWidth: cs.borderWidth,
      borderStyle: cs.borderStyle,
      borderColor: rgbToHex(cs.borderColor),
      borderTopWidth: cs.borderTopWidth,
      borderRightWidth: cs.borderRightWidth,
      borderBottomWidth: cs.borderBottomWidth,
      borderLeftWidth: cs.borderLeftWidth,
      borderTopStyle: cs.borderTopStyle,
      borderRightStyle: cs.borderRightStyle,
      borderBottomStyle: cs.borderBottomStyle,
      borderLeftStyle: cs.borderLeftStyle,
      opacity: cs.opacity,
      boxShadow: cs.boxShadow,
      zIndex: cs.zIndex,
      overflow: cs.overflow,
      visibility: cs.visibility,
      cursor: cs.cursor,
      pointerEvents: cs.pointerEvents,
      transform: cs.transform,
      transition: cs.transition,
      filter: cs.filter,
    };
  }

  // Toast notification
  function showToast(message, type = 'info') {
    const existing = document.querySelector('.lumos-toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = 'lumos-toast ' + type;
    toast.innerHTML = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 200);
    }, 2000);
  }

  // Apply style change
  function applyStyleChange(property, value) {
    if (!selectedElement) return;
    const selector = generateSelector(selectedElement);
    const camelCase = property.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    const oldValue = selectedElement.style[camelCase] || getComputedStyle(selectedElement)[camelCase];

    // Apply with pseudo state if needed
    if (currentPseudoState !== 'none') {
      // For pseudo states, we'd need to inject a style rule
      applyPseudoStyle(selector, property, value);
    } else {
      selectedElement.style[camelCase] = value;
    }

    const change = {
      id: Date.now().toString(36),
      selector,
      property: camelCase,
      oldValue,
      newValue: value,
      pseudoState: currentPseudoState,
      timestamp: Date.now(),
    };
    changes.push(change);
    undoStack = [];
    persistChanges();
    updateUI();
  }

  // Apply pseudo state style
  function applyPseudoStyle(selector, property, value) {
    const kebab = property.replace(/([A-Z])/g, '-$1').toLowerCase();
    const pseudoSelector = selector + ':' + currentPseudoState;
    let styleEl = document.getElementById('lumos-pseudo-styles');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'lumos-pseudo-styles';
      document.head.appendChild(styleEl);
    }
    styleEl.textContent += `${pseudoSelector} { ${kebab}: ${value} !important; }\n`;
  }

  // Undo
  function undo() {
    if (changes.length === 0) return;
    const change = changes.pop();
    const el = document.querySelector(change.selector);
    if (el) el.style[change.property] = change.oldValue;
    undoStack.push(change);
    persistChanges();
    updateUI();
  }

  // Redo
  function redo() {
    if (undoStack.length === 0) return;
    const change = undoStack.pop();
    const el = document.querySelector(change.selector);
    if (el) el.style[change.property] = change.newValue;
    changes.push(change);
    persistChanges();
    updateUI();
  }

  // Clear all
  function clearChanges() {
    changes.forEach(c => {
      const el = document.querySelector(c.selector);
      if (el) el.style[c.property] = c.oldValue;
    });
    changes = [];
    undoStack = [];
    localStorage.removeItem(STORAGE_KEY);
    const pseudoStyles = document.getElementById('lumos-pseudo-styles');
    if (pseudoStyles) pseudoStyles.remove();
    updateUI();
    showToast('Changes cleared');
  }

  // Copy CSS
  function copyCss() {
    if (changes.length === 0) return showToast('No changes', 'error');
    const grouped = {};
    changes.forEach(c => {
      const key = c.pseudoState !== 'none' ? `${c.selector}:${c.pseudoState}` : c.selector;
      if (!grouped[key]) grouped[key] = {};
      grouped[key][c.property] = c.newValue;
    });
    let css = '';
    Object.entries(grouped).forEach(([sel, props]) => {
      css += `${sel} {\n`;
      Object.entries(props).forEach(([p, v]) => {
        css += `  ${p.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${v};\n`;
      });
      css += '}\n\n';
    });
    navigator.clipboard.writeText(css);
    showToast('CSS copied!', 'success');
  }

  // Export JSON
  function exportChanges() {
    if (changes.length === 0) return showToast('No changes', 'error');
    const data = JSON.stringify({ changes, exportedAt: new Date().toISOString() }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lumos-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported!', 'success');
  }

  // Import JSON
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
          if (data.changes) {
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
          showToast('Invalid file', 'error');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  // Open Create PR
  function openCreatePR() {
    if (changes.length === 0) return showToast('No changes', 'error');
    const grouped = {};
    changes.forEach(c => {
      const key = c.pseudoState !== 'none' ? `${c.selector}:${c.pseudoState}` : c.selector;
      if (!grouped[key]) grouped[key] = {};
      grouped[key][c.property] = c.newValue;
    });
    let css = '';
    Object.entries(grouped).forEach(([sel, props]) => {
      css += `${sel} {\n`;
      Object.entries(props).forEach(([p, v]) => {
        css += `  ${p.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${v};\n`;
      });
      css += '}\n\n';
    });
    const payload = { css, changes, sourceUrl: window.location.href, sessionId, timestamp: Date.now() };
    const encoded = btoa(encodeURIComponent(JSON.stringify(payload)));
    window.open(`${studioUrl}/create-pr?data=${encoded}`, '_blank');
  }

  // Set viewport
  function setViewport(size) {
    currentViewport = size;
    if (size === 'desktop') {
      document.body.style.maxWidth = '';
      document.body.classList.remove('lumos-viewport-active');
    } else {
      document.body.style.maxWidth = viewports[size].width;
      document.body.classList.add('lumos-viewport-active');
    }
    updateToolbar();
  }

  // Build element tree
  function buildElementTree(el, depth = 0, maxDepth = 10) {
    if (!el || depth > maxDepth) return '';
    if (el.nodeType !== Node.ELEMENT_NODE) return '';
    if (el.closest('.lumos-ui')) return '';

    const tag = el.tagName.toLowerCase();
    const id = el.id ? `#${el.id}` : '';
    const classes = (el.className && typeof el.className === 'string')
      ? el.className.split(' ').filter(c => c && !c.startsWith('lumos-')).slice(0, 2).map(c => '.' + c).join('')
      : '';

    const hasChildren = Array.from(el.children).some(c => c.nodeType === Node.ELEMENT_NODE && !c.closest('.lumos-ui'));
    const isSelected = el === selectedElement;
    const isHovered = el === hoveredElement;

    const indent = depth * 16;

    let html = `<div class="lumos-tree-item ${isSelected ? 'selected' : ''} ${isHovered ? 'hovered' : ''}"
      style="padding-left: ${12 + indent}px"
      data-element-path="${generateSelector(el)}">`;

    if (hasChildren) {
      html += `<span class="lumos-tree-toggle expanded">${icons.chevron}</span>`;
    } else {
      html += `<span class="lumos-tree-toggle"></span>`;
    }

    html += `<span class="lumos-tree-tag">${tag}</span>`;
    if (id) html += `<span class="lumos-tree-id">${id}</span>`;
    if (classes) html += `<span class="lumos-tree-class">${classes}</span>`;
    html += '</div>';

    if (hasChildren && depth < 5) {
      Array.from(el.children).forEach(child => {
        html += buildElementTree(child, depth + 1, maxDepth);
      });
    }

    return html;
  }

  // Update navigator
  function updateNavigator() {
    const nav = document.querySelector('.lumos-nav-content');
    if (!nav) return;
    nav.innerHTML = buildElementTree(document.body, 0, 6);

    // Add click handlers
    nav.querySelectorAll('.lumos-tree-item').forEach(item => {
      item.onclick = () => {
        const path = item.dataset.elementPath;
        const el = document.querySelector(path);
        if (el) {
          if (selectedElement) selectedElement.classList.remove('lumos-selected-outline');
          selectedElement = el;
          selectedElement.classList.add('lumos-selected-outline');
          updateUI();
        }
      };
    });
  }

  // Update toolbar
  function updateToolbar() {
    container.querySelectorAll('.lumos-viewport-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.viewport === currentViewport);
    });
    const undoBtn = container.querySelector('.lumos-undo-btn');
    const redoBtn = container.querySelector('.lumos-redo-btn');
    if (undoBtn) undoBtn.disabled = changes.length === 0;
    if (redoBtn) redoBtn.disabled = undoStack.length === 0;
  }

  // Toggle inspector
  function toggleInspector() {
    inspectorEnabled = !inspectorEnabled;
    container.querySelector('.lumos-switch').classList.toggle('active', inspectorEnabled);
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
    container.classList.toggle('open', panelOpen);
    container.querySelector('.lumos-navigator').classList.toggle('open', panelOpen && navigatorOpen);
    container.querySelector('.lumos-inspector').classList.toggle('open', panelOpen);
    fab.classList.toggle('hidden', panelOpen);
    if (panelOpen) updateNavigator();
  }

  // Toggle navigator
  function toggleNavigator() {
    navigatorOpen = !navigatorOpen;
    container.querySelector('.lumos-navigator').classList.toggle('open', navigatorOpen);
  }

  // Switch main tab
  function switchMainTab(tab) {
    currentTab = tab;
    container.querySelectorAll('.lumos-main-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.tab === tab);
    });
    container.querySelectorAll('.lumos-main-content').forEach(c => {
      c.classList.toggle('active', c.dataset.tab === tab);
    });
  }

  // Switch style tab
  function switchStyleTab(tab) {
    currentStyleTab = tab;
    container.querySelectorAll('.lumos-style-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.tab === tab);
    });
    container.querySelectorAll('.lumos-style-content').forEach(c => {
      c.classList.toggle('active', c.dataset.tab === tab);
    });
  }

  // Switch pseudo state
  function switchPseudoState(state) {
    currentPseudoState = state;
    container.querySelectorAll('.lumos-pseudo-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.state === state);
    });
  }

  // Update UI
  function updateUI() {
    updateToolbar();
    updateNavigator();

    const elInfo = container.querySelector('.lumos-element-info');
    const emptyState = container.querySelector('.lumos-empty');
    const pseudoRow = container.querySelector('.lumos-pseudo-row');
    const styleTabs = container.querySelector('.lumos-style-tabs');
    const styleContents = container.querySelectorAll('.lumos-style-content');
    const classSection = container.querySelector('.lumos-class-section');
    const selectorRow = container.querySelector('.lumos-selector-row');
    const copyPasteRow = container.querySelector('.lumos-copy-paste-row');
    const mainTabs = container.querySelector('.lumos-main-tabs');

    if (selectedElement) {
      const styles = getElementStyles(selectedElement);
      const rect = selectedElement.getBoundingClientRect();
      const className = (typeof selectedElement.className === 'string')
        ? selectedElement.className.replace(/lumos-\S+/g, '').trim()
        : '';

      elInfo.style.display = 'block';
      emptyState.style.display = 'none';
      pseudoRow.style.display = 'flex';
      styleTabs.style.display = 'flex';
      if (classSection) classSection.style.display = 'block';
      if (selectorRow) selectorRow.style.display = 'flex';
      if (copyPasteRow) copyPasteRow.style.display = 'flex';
      if (mainTabs) mainTabs.style.display = 'flex';
      styleContents.forEach(c => {
        if (c.classList.contains('active')) c.style.display = 'block';
        else c.style.display = 'none';
      });

      elInfo.innerHTML = `
        <div class="lumos-element-row">
          <span class="lumos-element-tag">${selectedElement.tagName.toLowerCase()}</span>
          ${selectedElement.id ? `<span class="lumos-element-id">#${selectedElement.id}</span>` : ''}
        </div>
        ${className ? `<div class="lumos-element-classes">.${className.split(' ').filter(c=>c).join(' .')}</div>` : ''}
        <div class="lumos-element-size">${Math.round(rect.width)} x ${Math.round(rect.height)}</div>
      `;

      // Update selector row
      const selectorText = container.querySelector('.lumos-selector-text');
      if (selectorText) {
        selectorText.textContent = generateSelector(selectedElement);
      }

      // Update box model size label
      const boxSizeLabel = container.querySelector('.lumos-box-size-label');
      if (boxSizeLabel) {
        boxSizeLabel.textContent = `${Math.round(rect.width)} × ${Math.round(rect.height)}`;
      }

      updateStyleInputs(styles);
      updateClassList();
    } else {
      elInfo.style.display = 'none';
      emptyState.style.display = 'block';
      pseudoRow.style.display = 'none';
      styleTabs.style.display = 'none';
      if (classSection) classSection.style.display = 'none';
      if (selectorRow) selectorRow.style.display = 'none';
      if (copyPasteRow) copyPasteRow.style.display = 'none';
      if (mainTabs) mainTabs.style.display = 'none';
      container.querySelector('.lumos-computed-panel').style.display = 'none';
      container.querySelector('.lumos-a11y-panel').style.display = 'none';
      styleContents.forEach(c => c.style.display = 'none');
    }

    // Update changes
    const count = container.querySelector('.lumos-changes-count');
    const list = container.querySelector('.lumos-changes-list');
    const prBtn = container.querySelector('.lumos-pr-btn');

    if (count) count.textContent = changes.length;
    if (prBtn) prBtn.disabled = changes.length === 0;
    if (list) {
      list.innerHTML = changes.slice(-4).reverse().map(c => `
        <div class="lumos-change-item">
          <span class="lumos-change-prop">${c.property}:</span>
          <span class="lumos-change-val">${c.newValue}</span>
        </div>
      `).join('');
    }
  }

  // Update style inputs
  function updateStyleInputs(styles) {
    const setVal = (prop, val) => {
      const input = container.querySelector(`[data-prop="${prop}"]`);
      if (input) {
        if (input.type === 'color') input.value = val || '#000000';
        else if (input.type === 'range') input.value = parseFloat(val) || 0;
        else input.value = val || '';
      }
    };

    // Layout
    setVal('display', styles.display);
    setVal('position', styles.position);
    setVal('z-index', styles.zIndex);
    setVal('overflow', styles.overflow);

    // Flexbox
    setVal('flex-direction', styles.flexDirection);
    setVal('flex-wrap', styles.flexWrap);
    setVal('justify-content', styles.justifyContent);
    setVal('align-items', styles.alignItems);
    setVal('gap', styles.gap);
    setVal('flex-grow', styles.flexGrow);
    setVal('flex-shrink', styles.flexShrink);
    setVal('flex-basis', styles.flexBasis);
    setVal('order', styles.order);
    setVal('align-self', styles.alignSelf);

    // Grid
    setVal('grid-template-columns', styles.gridTemplateColumns);
    setVal('grid-template-rows', styles.gridTemplateRows);

    // Size
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
    setVal('color', styles.color);

    // Background
    setVal('background-color', styles.backgroundColor);
    setVal('background-image', styles.backgroundImage);
    setVal('background-size', styles.backgroundSize);
    setVal('background-position', styles.backgroundPosition);
    setVal('background-repeat', styles.backgroundRepeat);

    // Border
    setVal('border-width', styles.borderWidth);
    setVal('border-style', styles.borderStyle);
    setVal('border-color', styles.borderColor);
    setVal('border-radius', styles.borderRadius);
    setVal('border-top-width', styles.borderTopWidth);
    setVal('border-right-width', styles.borderRightWidth);
    setVal('border-bottom-width', styles.borderBottomWidth);
    setVal('border-left-width', styles.borderLeftWidth);
    setVal('border-top-style', styles.borderTopStyle);
    setVal('border-right-style', styles.borderRightStyle);
    setVal('border-bottom-style', styles.borderBottomStyle);
    setVal('border-left-style', styles.borderLeftStyle);
    setVal('border-top-left-radius', styles.borderTopLeftRadius);
    setVal('border-top-right-radius', styles.borderTopRightRadius);
    setVal('border-bottom-right-radius', styles.borderBottomRightRadius);
    setVal('border-bottom-left-radius', styles.borderBottomLeftRadius);

    // Effects
    setVal('opacity', styles.opacity);
    setVal('box-shadow', styles.boxShadow);
    setVal('visibility', styles.visibility);
    setVal('cursor', styles.cursor);

    // Transform
    setVal('transform', styles.transform);
    setVal('transition', styles.transition);
    setVal('filter', styles.filter);

    // Update opacity display
    const opacityVal = container.querySelector('.lumos-opacity-value');
    if (opacityVal) opacityVal.textContent = styles.opacity;

    // Update box model inputs
    const boxInputs = container.querySelectorAll('.lumos-box-input');
    boxInputs.forEach(input => {
      const prop = input.dataset.prop;
      if (prop && styles[prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase())]) {
        input.value = styles[prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase())];
      }
    });
  }

  // Create FAB
  const fab = document.createElement('button');
  fab.className = 'lumos-fab lumos-ui';
  fab.innerHTML = icons.paintbrush;
  fab.onclick = togglePanel;
  document.body.appendChild(fab);

  // Create main container
  const container = document.createElement('div');
  container.className = 'lumos-container lumos-ui';
  container.innerHTML = `
    <!-- Left Navigator -->
    <div class="lumos-navigator">
      <div class="lumos-nav-header">
        <span class="lumos-nav-title">Navigator</span>
        <button class="lumos-header-btn" onclick="this.closest('.lumos-navigator').classList.remove('open')">${icons.close}</button>
      </div>
      <div class="lumos-nav-content"></div>
    </div>

    <!-- Center spacer -->
    <div class="lumos-spacer"></div>

    <!-- Right Inspector -->
    <div class="lumos-inspector">
      <div class="lumos-header">
        <div class="lumos-logo">${icons.paintbrush}</div>
        <span class="lumos-header-title">Lumos</span>
        <button class="lumos-header-btn lumos-nav-toggle" title="Toggle Navigator">${icons.sidebar}</button>
        <button class="lumos-header-btn lumos-close-btn" title="Close">${icons.close}</button>
      </div>

      <div class="lumos-toolbar">
        <div class="lumos-toolbar-group">
          <button class="lumos-toolbar-btn lumos-viewport-btn active" data-viewport="desktop" title="Desktop">${icons.monitor}</button>
          <button class="lumos-toolbar-btn lumos-viewport-btn" data-viewport="tablet" title="Tablet">${icons.tablet}</button>
          <button class="lumos-toolbar-btn lumos-viewport-btn" data-viewport="mobile" title="Mobile">${icons.phone}</button>
        </div>
        <div class="lumos-toolbar-divider"></div>
        <div class="lumos-toolbar-group">
          <button class="lumos-toolbar-btn lumos-undo-btn" title="Undo" disabled>${icons.undo}</button>
          <button class="lumos-toolbar-btn lumos-redo-btn" title="Redo" disabled>${icons.redo}</button>
        </div>
        <div class="lumos-toolbar-divider"></div>
        <div class="lumos-toolbar-group">
          <button class="lumos-toolbar-btn lumos-measure-btn" title="Measure">${icons.ruler}</button>
          <button class="lumos-toolbar-btn lumos-export-btn" title="Export">${icons.code}</button>
        </div>
      </div>

      <!-- Breakpoint Bar -->
      <div class="lumos-breakpoint-bar">
        <button class="lumos-breakpoint-btn active" data-bp="base">${icons.layers} Base</button>
        <button class="lumos-breakpoint-btn" data-bp="sm">${icons.phone} SM</button>
        <button class="lumos-breakpoint-btn" data-bp="md">${icons.tablet} MD</button>
        <button class="lumos-breakpoint-btn" data-bp="lg">${icons.monitor} LG</button>
        <button class="lumos-breakpoint-btn" data-bp="xl">${icons.monitor} XL</button>
      </div>

      <div class="lumos-inspect-toggle">
        <span class="lumos-inspect-label">${icons.cursor} Select Element</span>
        <div class="lumos-switch"></div>
      </div>

      <div class="lumos-element-info" style="display:none"></div>

      <!-- Selector Helper -->
      <div class="lumos-selector-row" style="display:none">
        <span class="lumos-selector-text"></span>
        <button class="lumos-selector-copy">${icons.copy} Copy</button>
      </div>

      <!-- Copy/Paste Styles -->
      <div class="lumos-copy-paste-row" style="display:none">
        <button class="lumos-copy-paste-btn lumos-copy-styles-btn">${icons.copy} Copy Styles</button>
        <button class="lumos-copy-paste-btn lumos-paste-styles-btn" disabled>${icons.paste} Paste Styles</button>
      </div>

      <!-- Main Tabs -->
      <div class="lumos-main-tabs" style="display:none">
        <button class="lumos-tab active" data-main-tab="styles">Styles</button>
        <button class="lumos-tab" data-main-tab="computed">Computed</button>
        <button class="lumos-tab" data-main-tab="a11y">A11y</button>
      </div>

      <!-- Computed Styles Panel -->
      <div class="lumos-computed-panel" style="display:none">
        <div class="lumos-section">
          <div class="lumos-section-header">All Computed Styles</div>
          <div class="lumos-computed-list"></div>
        </div>
      </div>

      <!-- Accessibility Panel -->
      <div class="lumos-a11y-panel" style="display:none">
        <div class="lumos-section">
          <div class="lumos-section-header">Accessibility Check</div>
          <div class="lumos-a11y-list"></div>
        </div>
      </div>

      <!-- Class Management -->
      <div class="lumos-class-section" style="display:none">
        <div class="lumos-section">
          <div class="lumos-section-header">Classes</div>
          <div class="lumos-section-content">
            <div class="lumos-class-list"></div>
            <div class="lumos-class-add">
              <input class="lumos-input lumos-class-input" placeholder="Add class...">
              <button class="lumos-add-class-btn">Add</button>
            </div>
          </div>
        </div>
      </div>

      <div class="lumos-pseudo-row" style="display:none">
        <button class="lumos-pseudo-btn active" data-state="none">None</button>
        <button class="lumos-pseudo-btn" data-state="hover">:hover</button>
        <button class="lumos-pseudo-btn" data-state="focus">:focus</button>
        <button class="lumos-pseudo-btn" data-state="active">:active</button>
      </div>

      <div class="lumos-style-tabs" style="display:none">
        <button class="lumos-style-tab active" data-tab="layout">Layout</button>
        <button class="lumos-style-tab" data-tab="spacing">Spacing</button>
        <button class="lumos-style-tab" data-tab="size">Size</button>
        <button class="lumos-style-tab" data-tab="typography">Type</button>
        <button class="lumos-style-tab" data-tab="background">Fill</button>
        <button class="lumos-style-tab" data-tab="borders">Border</button>
        <button class="lumos-style-tab" data-tab="effects">Effects</button>
      </div>

      <div class="lumos-panel-content">
        <div class="lumos-empty">
          ${icons.cursor}
          <p class="lumos-empty-text">Enable inspector and click an element to start editing</p>
        </div>

        <!-- Layout Tab -->
        <div class="lumos-style-content active" data-tab="layout" style="display:none">
          <div class="lumos-section">
            <div class="lumos-section-header">Display</div>
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
                  <input class="lumos-input" data-prop="z-index" placeholder="auto">
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
                  <input class="lumos-input" data-prop="gap" placeholder="0px">
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
                  <input class="lumos-input" data-prop="flex-grow" placeholder="0">
                </div>
                <div class="lumos-field">
                  <label class="lumos-label">Shrink</label>
                  <input class="lumos-input" data-prop="flex-shrink" placeholder="1">
                </div>
                <div class="lumos-field">
                  <label class="lumos-label">Basis</label>
                  <input class="lumos-input" data-prop="flex-basis" placeholder="auto">
                </div>
              </div>
              <div class="lumos-row">
                <div class="lumos-field">
                  <label class="lumos-label">Order</label>
                  <input class="lumos-input" data-prop="order" placeholder="0">
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
                  <input class="lumos-input" data-prop="grid-template-columns" placeholder="1fr 1fr">
                </div>
              </div>
              <div class="lumos-row">
                <div class="lumos-field full">
                  <label class="lumos-label">Rows</label>
                  <input class="lumos-input" data-prop="grid-template-rows" placeholder="auto">
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Spacing Tab -->
        <div class="lumos-style-content" data-tab="spacing">
          <!-- Interactive Box Model -->
          <div class="lumos-section">
            <div class="lumos-section-header">Box Model</div>
            <div class="lumos-section-content">
              <div class="lumos-box-model-interactive">
                <div class="lumos-box-layer lumos-box-margin-layer">
                  <span class="lumos-box-corner-label">margin</span>
                  <input class="lumos-box-input lumos-box-top" data-prop="margin-top" placeholder="0">
                  <input class="lumos-box-input lumos-box-right" data-prop="margin-right" placeholder="0">
                  <input class="lumos-box-input lumos-box-bottom" data-prop="margin-bottom" placeholder="0">
                  <input class="lumos-box-input lumos-box-left" data-prop="margin-left" placeholder="0">
                  <div class="lumos-box-layer lumos-box-border-layer">
                    <span class="lumos-box-corner-label">border</span>
                    <input class="lumos-box-input lumos-box-top" data-prop="border-top-width" placeholder="0">
                    <input class="lumos-box-input lumos-box-right" data-prop="border-right-width" placeholder="0">
                    <input class="lumos-box-input lumos-box-bottom" data-prop="border-bottom-width" placeholder="0">
                    <input class="lumos-box-input lumos-box-left" data-prop="border-left-width" placeholder="0">
                    <div class="lumos-box-layer lumos-box-padding-layer">
                      <span class="lumos-box-corner-label">padding</span>
                      <input class="lumos-box-input lumos-box-top" data-prop="padding-top" placeholder="0">
                      <input class="lumos-box-input lumos-box-right" data-prop="padding-right" placeholder="0">
                      <input class="lumos-box-input lumos-box-bottom" data-prop="padding-bottom" placeholder="0">
                      <input class="lumos-box-input lumos-box-left" data-prop="padding-left" placeholder="0">
                      <div class="lumos-box-content-layer">
                        <span class="lumos-box-size-label"></span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="lumos-section">
            <div class="lumos-section-header">Padding</div>
            <div class="lumos-section-content">
              <div class="lumos-row">
                <div class="lumos-field full">
                  <label class="lumos-label">All Sides</label>
                  <input class="lumos-input" data-prop="padding" placeholder="0px">
                </div>
              </div>
              <div class="lumos-row lumos-row-4">
                <div class="lumos-field">
                  <label class="lumos-label">Top</label>
                  <input class="lumos-input" data-prop="padding-top" placeholder="0">
                </div>
                <div class="lumos-field">
                  <label class="lumos-label">Right</label>
                  <input class="lumos-input" data-prop="padding-right" placeholder="0">
                </div>
                <div class="lumos-field">
                  <label class="lumos-label">Bottom</label>
                  <input class="lumos-input" data-prop="padding-bottom" placeholder="0">
                </div>
                <div class="lumos-field">
                  <label class="lumos-label">Left</label>
                  <input class="lumos-input" data-prop="padding-left" placeholder="0">
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
                  <input class="lumos-input" data-prop="margin" placeholder="0px">
                </div>
              </div>
              <div class="lumos-row lumos-row-4">
                <div class="lumos-field">
                  <label class="lumos-label">Top</label>
                  <input class="lumos-input" data-prop="margin-top" placeholder="0">
                </div>
                <div class="lumos-field">
                  <label class="lumos-label">Right</label>
                  <input class="lumos-input" data-prop="margin-right" placeholder="0">
                </div>
                <div class="lumos-field">
                  <label class="lumos-label">Bottom</label>
                  <input class="lumos-input" data-prop="margin-bottom" placeholder="0">
                </div>
                <div class="lumos-field">
                  <label class="lumos-label">Left</label>
                  <input class="lumos-input" data-prop="margin-left" placeholder="0">
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Size Tab -->
        <div class="lumos-style-content" data-tab="size">
          <div class="lumos-section">
            <div class="lumos-section-header">Dimensions</div>
            <div class="lumos-section-content">
              <div class="lumos-row">
                <div class="lumos-field">
                  <label class="lumos-label">Width</label>
                  <input class="lumos-input" data-prop="width" placeholder="auto">
                </div>
                <div class="lumos-field">
                  <label class="lumos-label">Height</label>
                  <input class="lumos-input" data-prop="height" placeholder="auto">
                </div>
              </div>
              <div class="lumos-row">
                <div class="lumos-field">
                  <label class="lumos-label">Min W</label>
                  <input class="lumos-input" data-prop="min-width" placeholder="0">
                </div>
                <div class="lumos-field">
                  <label class="lumos-label">Max W</label>
                  <input class="lumos-input" data-prop="max-width" placeholder="none">
                </div>
              </div>
              <div class="lumos-row">
                <div class="lumos-field">
                  <label class="lumos-label">Min H</label>
                  <input class="lumos-input" data-prop="min-height" placeholder="0">
                </div>
                <div class="lumos-field">
                  <label class="lumos-label">Max H</label>
                  <input class="lumos-input" data-prop="max-height" placeholder="none">
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Typography Tab -->
        <div class="lumos-style-content" data-tab="typography">
          <div class="lumos-section">
            <div class="lumos-section-header">Font</div>
            <div class="lumos-section-content">
              <div class="lumos-row">
                <div class="lumos-field full">
                  <label class="lumos-label">Family</label>
                  <select class="lumos-select" data-prop="font-family">
                    <option value="">—</option>
                    <option value="system-ui, sans-serif">System</option>
                    <option value="Arial, sans-serif">Arial</option>
                    <option value="Georgia, serif">Georgia</option>
                    <option value="ui-monospace, monospace">Mono</option>
                    <option value="Inter, sans-serif">Inter</option>
                  </select>
                </div>
              </div>
              <div class="lumos-row">
                <div class="lumos-field">
                  <label class="lumos-label">Size</label>
                  <input class="lumos-input" data-prop="font-size" placeholder="16px">
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
                  <input class="lumos-input" data-prop="line-height" placeholder="1.5">
                </div>
                <div class="lumos-field">
                  <label class="lumos-label">Letter Spacing</label>
                  <input class="lumos-input" data-prop="letter-spacing" placeholder="0">
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
                <div class="lumos-field full">
                  <label class="lumos-label">Decoration</label>
                  <select class="lumos-select" data-prop="text-decoration">
                    <option value="">—</option>
                    <option value="none">none</option>
                    <option value="underline">underline</option>
                    <option value="line-through">line-through</option>
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
                  <div class="lumos-color-field">
                    <div class="lumos-color-swatch"><input type="color" data-prop="color" value="#000000"></div>
                    <input class="lumos-input" data-prop="color-text" placeholder="#000000">
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Background Tab -->
        <div class="lumos-style-content" data-tab="background">
          <div class="lumos-section">
            <div class="lumos-section-header">Solid Color</div>
            <div class="lumos-section-content">
              <div class="lumos-row">
                <div class="lumos-field full">
                  <label class="lumos-label">Color</label>
                  <div class="lumos-color-field">
                    <div class="lumos-color-swatch"><input type="color" data-prop="background-color" value="#ffffff"></div>
                    <input class="lumos-input" data-prop="background-color-text" placeholder="transparent">
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="lumos-section">
            <div class="lumos-section-header">Gradient</div>
            <div class="lumos-section-content">
              <div class="lumos-gradient-preview" id="lumos-gradient-preview"></div>
              <div class="lumos-gradient-type">
                <button class="lumos-gradient-type-btn active" data-type="linear">Linear</button>
                <button class="lumos-gradient-type-btn" data-type="radial">Radial</button>
              </div>
              <div class="lumos-row">
                <div class="lumos-field full">
                  <label class="lumos-label">Angle (Linear)</label>
                  <input class="lumos-input" id="lumos-gradient-angle" value="90" placeholder="90">
                </div>
              </div>
              <div class="lumos-gradient-stops" id="lumos-gradient-stops">
                <div class="lumos-gradient-stop" data-index="0">
                  <div class="lumos-gradient-stop-color"><input type="color" value="#8b5cf6"></div>
                  <input class="lumos-input lumos-gradient-stop-pos" value="0%">
                  <span class="lumos-gradient-stop-remove">×</span>
                </div>
                <div class="lumos-gradient-stop" data-index="1">
                  <div class="lumos-gradient-stop-color"><input type="color" value="#06b6d4"></div>
                  <input class="lumos-input lumos-gradient-stop-pos" value="100%">
                  <span class="lumos-gradient-stop-remove">×</span>
                </div>
              </div>
              <button class="lumos-add-stop-btn" id="lumos-add-stop">+ Add Color Stop</button>
              <div class="lumos-row" style="margin-top:8px">
                <button class="lumos-btn lumos-btn-primary" id="lumos-apply-gradient" style="width:100%">Apply Gradient</button>
              </div>
            </div>
          </div>

          <div class="lumos-section">
            <div class="lumos-section-header">Background Image</div>
            <div class="lumos-section-content">
              <div class="lumos-row">
                <div class="lumos-field full">
                  <label class="lumos-label">Image URL</label>
                  <input class="lumos-input" data-prop="background-image" placeholder="url(...)">
                </div>
              </div>
              <div class="lumos-row">
                <div class="lumos-field">
                  <label class="lumos-label">Size</label>
                  <select class="lumos-select" data-prop="background-size">
                    <option value="">—</option>
                    <option value="cover">cover</option>
                    <option value="contain">contain</option>
                    <option value="auto">auto</option>
                  </select>
                </div>
                <div class="lumos-field">
                  <label class="lumos-label">Position</label>
                  <select class="lumos-select" data-prop="background-position">
                    <option value="">—</option>
                    <option value="center">center</option>
                    <option value="top">top</option>
                    <option value="bottom">bottom</option>
                    <option value="left">left</option>
                    <option value="right">right</option>
                  </select>
                </div>
              </div>
              <div class="lumos-row">
                <div class="lumos-field full">
                  <label class="lumos-label">Repeat</label>
                  <select class="lumos-select" data-prop="background-repeat">
                    <option value="">—</option>
                    <option value="no-repeat">no-repeat</option>
                    <option value="repeat">repeat</option>
                    <option value="repeat-x">repeat-x</option>
                    <option value="repeat-y">repeat-y</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Borders Tab -->
        <div class="lumos-style-content" data-tab="borders">
          <div class="lumos-section">
            <div class="lumos-section-header">All Borders</div>
            <div class="lumos-section-content">
              <div class="lumos-row">
                <div class="lumos-field">
                  <label class="lumos-label">Width</label>
                  <input class="lumos-input" data-prop="border-width" placeholder="0px">
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
                  <div class="lumos-color-field">
                    <div class="lumos-color-swatch"><input type="color" data-prop="border-color" value="#000000"></div>
                    <input class="lumos-input" data-prop="border-color-text" placeholder="#000000">
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="lumos-section">
            <div class="lumos-section-header">Individual Sides</div>
            <div class="lumos-section-content">
              <div class="lumos-row lumos-row-4">
                <div class="lumos-field">
                  <label class="lumos-label">Top</label>
                  <input class="lumos-input" data-prop="border-top-width" placeholder="0">
                </div>
                <div class="lumos-field">
                  <label class="lumos-label">Right</label>
                  <input class="lumos-input" data-prop="border-right-width" placeholder="0">
                </div>
                <div class="lumos-field">
                  <label class="lumos-label">Bottom</label>
                  <input class="lumos-input" data-prop="border-bottom-width" placeholder="0">
                </div>
                <div class="lumos-field">
                  <label class="lumos-label">Left</label>
                  <input class="lumos-input" data-prop="border-left-width" placeholder="0">
                </div>
              </div>
              <div class="lumos-row">
                <div class="lumos-field">
                  <label class="lumos-label">Top Style</label>
                  <select class="lumos-select" data-prop="border-top-style">
                    <option value="">—</option>
                    <option value="none">none</option>
                    <option value="solid">solid</option>
                    <option value="dashed">dashed</option>
                    <option value="dotted">dotted</option>
                  </select>
                </div>
                <div class="lumos-field">
                  <label class="lumos-label">Bottom Style</label>
                  <select class="lumos-select" data-prop="border-bottom-style">
                    <option value="">—</option>
                    <option value="none">none</option>
                    <option value="solid">solid</option>
                    <option value="dashed">dashed</option>
                    <option value="dotted">dotted</option>
                  </select>
                </div>
              </div>
              <div class="lumos-row">
                <div class="lumos-field">
                  <label class="lumos-label">Left Style</label>
                  <select class="lumos-select" data-prop="border-left-style">
                    <option value="">—</option>
                    <option value="none">none</option>
                    <option value="solid">solid</option>
                    <option value="dashed">dashed</option>
                    <option value="dotted">dotted</option>
                  </select>
                </div>
                <div class="lumos-field">
                  <label class="lumos-label">Right Style</label>
                  <select class="lumos-select" data-prop="border-right-style">
                    <option value="">—</option>
                    <option value="none">none</option>
                    <option value="solid">solid</option>
                    <option value="dashed">dashed</option>
                    <option value="dotted">dotted</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div class="lumos-section">
            <div class="lumos-section-header">Border Radius</div>
            <div class="lumos-section-content">
              <div class="lumos-row">
                <div class="lumos-field full">
                  <label class="lumos-label">All Corners</label>
                  <input class="lumos-input" data-prop="border-radius" placeholder="0px">
                </div>
              </div>
              <div class="lumos-row lumos-row-4">
                <div class="lumos-field">
                  <label class="lumos-label">TL</label>
                  <input class="lumos-input" data-prop="border-top-left-radius" placeholder="0">
                </div>
                <div class="lumos-field">
                  <label class="lumos-label">TR</label>
                  <input class="lumos-input" data-prop="border-top-right-radius" placeholder="0">
                </div>
                <div class="lumos-field">
                  <label class="lumos-label">BR</label>
                  <input class="lumos-input" data-prop="border-bottom-right-radius" placeholder="0">
                </div>
                <div class="lumos-field">
                  <label class="lumos-label">BL</label>
                  <input class="lumos-input" data-prop="border-bottom-left-radius" placeholder="0">
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Effects Tab -->
        <div class="lumos-style-content" data-tab="effects">
          <div class="lumos-section">
            <div class="lumos-section-header">Opacity</div>
            <div class="lumos-section-content">
              <div class="lumos-range-field">
                <input type="range" class="lumos-range" data-prop="opacity" min="0" max="1" step="0.01" value="1">
                <span class="lumos-range-value lumos-opacity-value">1</span>
              </div>
            </div>
          </div>

          <div class="lumos-section">
            <div class="lumos-section-header">Shadow</div>
            <div class="lumos-section-content">
              <div class="lumos-row">
                <div class="lumos-field full">
                  <label class="lumos-label">Box Shadow</label>
                  <input class="lumos-input" data-prop="box-shadow" placeholder="0 4px 6px rgba(0,0,0,0.1)">
                </div>
              </div>
            </div>
          </div>

          <div class="lumos-section">
            <div class="lumos-section-header">Transform</div>
            <div class="lumos-section-content">
              <div class="lumos-row">
                <div class="lumos-field full">
                  <label class="lumos-label">Transform</label>
                  <input class="lumos-input" data-prop="transform" placeholder="none">
                </div>
              </div>
            </div>
          </div>

          <div class="lumos-section">
            <div class="lumos-section-header">Filter</div>
            <div class="lumos-section-content">
              <div class="lumos-row">
                <div class="lumos-field full">
                  <label class="lumos-label">Filter</label>
                  <input class="lumos-input" data-prop="filter" placeholder="none">
                </div>
              </div>
            </div>
          </div>

          <div class="lumos-section">
            <div class="lumos-section-header">Transition</div>
            <div class="lumos-section-content">
              <div class="lumos-row">
                <div class="lumos-field full">
                  <label class="lumos-label">Transition</label>
                  <input class="lumos-input" data-prop="transition" placeholder="all 0.3s ease">
                </div>
              </div>
            </div>
          </div>

          <div class="lumos-section">
            <div class="lumos-section-header">Misc</div>
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
                  <label class="lumos-label">Cursor</label>
                  <select class="lumos-select" data-prop="cursor">
                    <option value="">—</option>
                    <option value="auto">auto</option>
                    <option value="pointer">pointer</option>
                    <option value="default">default</option>
                    <option value="move">move</option>
                    <option value="text">text</option>
                    <option value="not-allowed">not-allowed</option>
                  </select>
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
        <button class="lumos-btn lumos-btn-secondary lumos-btn-icon" title="Copy CSS" onclick="window.__lumosCopy()">${icons.copy}</button>
        <button class="lumos-btn lumos-btn-secondary lumos-btn-icon" title="Export" onclick="window.__lumosExport()">${icons.download}</button>
        <button class="lumos-btn lumos-btn-secondary lumos-btn-icon" title="Import" onclick="window.__lumosImport()">${icons.upload}</button>
        <button class="lumos-btn lumos-btn-secondary lumos-btn-icon" title="Clear" onclick="window.__lumosClear()">${icons.trash}</button>
        <button class="lumos-btn lumos-btn-primary lumos-pr-btn" disabled onclick="window.__lumosPR()">${icons.github} Create PR</button>
      </div>
    </div>
  `;
  document.body.appendChild(container);

  // Global functions
  window.__lumosCopy = copyCss;
  window.__lumosExport = exportChanges;
  window.__lumosImport = importChanges;
  window.__lumosClear = clearChanges;
  window.__lumosPR = openCreatePR;

  // Event handlers
  container.querySelector('.lumos-close-btn').onclick = togglePanel;
  container.querySelector('.lumos-nav-toggle').onclick = toggleNavigator;
  container.querySelector('.lumos-switch').onclick = toggleInspector;
  container.querySelector('.lumos-undo-btn').onclick = undo;
  container.querySelector('.lumos-redo-btn').onclick = redo;

  container.querySelectorAll('.lumos-viewport-btn').forEach(btn => {
    btn.onclick = () => setViewport(btn.dataset.viewport);
  });

  container.querySelectorAll('.lumos-style-tab').forEach(tab => {
    tab.onclick = () => switchStyleTab(tab.dataset.tab);
  });

  container.querySelectorAll('.lumos-pseudo-btn').forEach(btn => {
    btn.onclick = () => switchPseudoState(btn.dataset.state);
  });

  // Style input handlers
  container.querySelectorAll('.lumos-select, .lumos-input').forEach(input => {
    const handler = () => {
      const prop = input.dataset.prop;
      if (!prop || !selectedElement) return;

      if (prop === 'opacity' && input.type === 'range') {
        container.querySelector('.lumos-opacity-value').textContent = input.value;
        applyStyleChange('opacity', input.value);
        return;
      }

      if (prop.endsWith('-text')) {
        const baseProp = prop.replace('-text', '');
        const colorInput = container.querySelector(`[data-prop="${baseProp}"]`);
        applyStyleChange(baseProp, input.value);
        if (colorInput) colorInput.value = input.value;
      } else if (input.type === 'color') {
        applyStyleChange(prop, input.value);
        const textInput = container.querySelector(`[data-prop="${prop}-text"]`);
        if (textInput) textInput.value = input.value;
      } else {
        applyStyleChange(prop, input.value);
      }
    };

    if (input.tagName === 'SELECT' || input.type === 'color' || input.type === 'range') {
      input.onchange = handler;
      if (input.type === 'range') input.oninput = handler;
    } else {
      input.onblur = handler;
      input.onkeydown = e => e.key === 'Enter' && handler();
    }
  });

  // Mouse events
  document.addEventListener('mouseover', e => {
    if (!inspectorEnabled) return;
    if (e.target.closest('.lumos-ui')) return;
    if (e.target === document.body || e.target === document.documentElement) return;

    if (hoveredElement && hoveredElement !== selectedElement) {
      hoveredElement.classList.remove('lumos-hover-outline');
    }
    hoveredElement = e.target;
    if (hoveredElement !== selectedElement) {
      hoveredElement.classList.add('lumos-hover-outline');
    }
    updateNavigator();
  });

  document.addEventListener('mouseout', () => {
    if (hoveredElement && hoveredElement !== selectedElement) {
      hoveredElement.classList.remove('lumos-hover-outline');
    }
  });

  document.addEventListener('click', e => {
    if (!inspectorEnabled) return;
    if (e.target.closest('.lumos-ui')) return;

    e.preventDefault();
    e.stopPropagation();

    if (selectedElement) selectedElement.classList.remove('lumos-selected-outline');
    if (hoveredElement) hoveredElement.classList.remove('lumos-hover-outline');

    selectedElement = e.target;
    selectedElement.classList.add('lumos-selected-outline');

    updateUI();
  }, true);

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (panelOpen) togglePanel();
      else if (inspectorEnabled) toggleInspector();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey && changes.length > 0) {
      e.preventDefault();
      undo();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey && undoStack.length > 0) {
      e.preventDefault();
      redo();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      copyCss();
    }
  });

  // Class management handlers
  function updateClassList() {
    const classList = container.querySelector('.lumos-class-list');
    if (!selectedElement || !classList) return;

    const classes = Array.from(selectedElement.classList)
      .filter(c => !c.startsWith('lumos-'));

    classList.innerHTML = classes.map(c => `
      <span class="lumos-class-tag">
        .${c}
        <span class="lumos-class-remove" data-class="${c}">×</span>
      </span>
    `).join('');

    // Add remove handlers
    classList.querySelectorAll('.lumos-class-remove').forEach(btn => {
      btn.onclick = () => {
        const className = btn.dataset.class;
        if (selectedElement && className) {
          selectedElement.classList.remove(className);
          changes.push({
            id: Date.now().toString(36),
            selector: generateSelector(selectedElement),
            property: 'classList.remove',
            oldValue: className,
            newValue: '',
            timestamp: Date.now(),
          });
          persistChanges();
          updateClassList();
          showToast(`Removed .${className}`);
        }
      };
    });
  }

  container.querySelector('.lumos-add-class-btn').onclick = () => {
    const input = container.querySelector('.lumos-class-input');
    const className = input.value.trim().replace(/^\./, '');
    if (selectedElement && className) {
      selectedElement.classList.add(className);
      changes.push({
        id: Date.now().toString(36),
        selector: generateSelector(selectedElement),
        property: 'classList.add',
        oldValue: '',
        newValue: className,
        timestamp: Date.now(),
      });
      persistChanges();
      input.value = '';
      updateClassList();
      showToast(`Added .${className}`, 'success');
    }
  };

  container.querySelector('.lumos-class-input').onkeydown = (e) => {
    if (e.key === 'Enter') {
      container.querySelector('.lumos-add-class-btn').click();
    }
  };

  // Gradient editor state
  let gradientType = 'linear';
  let gradientAngle = 90;
  let gradientStops = [
    { color: '#8b5cf6', position: '0%' },
    { color: '#06b6d4', position: '100%' }
  ];

  function updateGradientPreview() {
    const preview = container.querySelector('#lumos-gradient-preview');
    if (!preview) return;

    const stopsStr = gradientStops.map(s => `${s.color} ${s.position}`).join(', ');
    if (gradientType === 'linear') {
      preview.style.background = `linear-gradient(${gradientAngle}deg, ${stopsStr})`;
    } else {
      preview.style.background = `radial-gradient(circle, ${stopsStr})`;
    }
  }

  function renderGradientStops() {
    const stopsContainer = container.querySelector('#lumos-gradient-stops');
    if (!stopsContainer) return;

    stopsContainer.innerHTML = gradientStops.map((stop, i) => `
      <div class="lumos-gradient-stop" data-index="${i}">
        <div class="lumos-gradient-stop-color"><input type="color" value="${stop.color}"></div>
        <input class="lumos-input lumos-gradient-stop-pos" value="${stop.position}">
        ${gradientStops.length > 2 ? `<span class="lumos-gradient-stop-remove">×</span>` : ''}
      </div>
    `).join('');

    // Add handlers
    stopsContainer.querySelectorAll('.lumos-gradient-stop').forEach((el, i) => {
      el.querySelector('input[type="color"]').onchange = (e) => {
        gradientStops[i].color = e.target.value;
        updateGradientPreview();
      };
      el.querySelector('.lumos-gradient-stop-pos').onchange = (e) => {
        gradientStops[i].position = e.target.value;
        updateGradientPreview();
      };
      const removeBtn = el.querySelector('.lumos-gradient-stop-remove');
      if (removeBtn) {
        removeBtn.onclick = () => {
          gradientStops.splice(i, 1);
          renderGradientStops();
          updateGradientPreview();
        };
      }
    });
  }

  // Gradient type buttons
  container.querySelectorAll('.lumos-gradient-type-btn').forEach(btn => {
    btn.onclick = () => {
      gradientType = btn.dataset.type;
      container.querySelectorAll('.lumos-gradient-type-btn').forEach(b => {
        b.classList.toggle('active', b === btn);
      });
      updateGradientPreview();
    };
  });

  // Gradient angle
  container.querySelector('#lumos-gradient-angle').onchange = (e) => {
    gradientAngle = parseInt(e.target.value) || 90;
    updateGradientPreview();
  };

  // Add stop button
  container.querySelector('#lumos-add-stop').onclick = () => {
    const lastPos = parseInt(gradientStops[gradientStops.length - 1]?.position) || 100;
    gradientStops.push({ color: '#ffffff', position: `${Math.min(lastPos + 10, 100)}%` });
    renderGradientStops();
    updateGradientPreview();
  };

  // Apply gradient button
  container.querySelector('#lumos-apply-gradient').onclick = () => {
    if (!selectedElement) return showToast('Select an element first', 'error');

    const stopsStr = gradientStops.map(s => `${s.color} ${s.position}`).join(', ');
    let gradientValue;
    if (gradientType === 'linear') {
      gradientValue = `linear-gradient(${gradientAngle}deg, ${stopsStr})`;
    } else {
      gradientValue = `radial-gradient(circle, ${stopsStr})`;
    }

    applyStyleChange('background', gradientValue);
    showToast('Gradient applied!', 'success');
  };

  // Initialize gradient editor
  renderGradientStops();
  updateGradientPreview();

  // Box model input handlers
  container.querySelectorAll('.lumos-box-input').forEach(input => {
    const handler = () => {
      const prop = input.dataset.prop;
      if (!prop || !selectedElement) return;
      applyStyleChange(prop, input.value);
    };
    input.onblur = handler;
    input.onkeydown = e => e.key === 'Enter' && handler();
  });

  // Breakpoint handlers
  container.querySelectorAll('.lumos-breakpoint-btn').forEach(btn => {
    btn.onclick = () => {
      currentBreakpoint = btn.dataset.bp;
      container.querySelectorAll('.lumos-breakpoint-btn').forEach(b => {
        b.classList.toggle('active', b === btn);
      });
      showToast(`Editing @ ${breakpoints[currentBreakpoint].label}`);
    };
  });

  // Main tabs handler
  let currentMainTab = 'styles';
  container.querySelectorAll('[data-main-tab]').forEach(btn => {
    btn.onclick = () => {
      currentMainTab = btn.dataset.mainTab;
      container.querySelectorAll('[data-main-tab]').forEach(b => {
        b.classList.toggle('active', b === btn);
      });
      updateMainTabs();
    };
  });

  function updateMainTabs() {
    const stylesContent = container.querySelector('.lumos-styles-wrapper');
    const computedPanel = container.querySelector('.lumos-computed-panel');
    const a11yPanel = container.querySelector('.lumos-a11y-panel');

    if (stylesContent) stylesContent.style.display = currentMainTab === 'styles' ? 'block' : 'none';
    if (computedPanel) computedPanel.style.display = currentMainTab === 'computed' ? 'block' : 'none';
    if (a11yPanel) a11yPanel.style.display = currentMainTab === 'a11y' ? 'block' : 'none';

    if (currentMainTab === 'computed') updateComputedStyles();
    if (currentMainTab === 'a11y') runAccessibilityCheck();
  }

  // Computed styles panel
  function updateComputedStyles() {
    if (!selectedElement) return;
    const cs = getComputedStyle(selectedElement);
    const list = container.querySelector('.lumos-computed-list');
    if (!list) return;

    const props = Array.from(cs).sort();
    list.innerHTML = props.map(prop => {
      const val = cs.getPropertyValue(prop);
      return `<div class="lumos-computed-item">
        <span class="lumos-computed-prop">${prop}</span>
        <span class="lumos-computed-val" title="${val}">${val}</span>
      </div>`;
    }).join('');
  }

  // Accessibility checker
  function runAccessibilityCheck() {
    if (!selectedElement) return;
    const list = container.querySelector('.lumos-a11y-list');
    if (!list) return;

    const checks = [];
    const cs = getComputedStyle(selectedElement);

    // Check 1: Color contrast (simplified)
    const bgColor = cs.backgroundColor;
    const textColor = cs.color;
    const contrastRatio = getContrastRatio(textColor, bgColor);
    if (contrastRatio < 4.5) {
      checks.push({
        status: contrastRatio < 3 ? 'fail' : 'warn',
        title: 'Color Contrast',
        desc: `Ratio ${contrastRatio.toFixed(2)}:1 (min 4.5:1 for normal text)`
      });
    } else {
      checks.push({ status: 'pass', title: 'Color Contrast', desc: `Ratio ${contrastRatio.toFixed(2)}:1 - Good!` });
    }

    // Check 2: Alt text for images
    if (selectedElement.tagName === 'IMG') {
      if (!selectedElement.alt) {
        checks.push({ status: 'fail', title: 'Alt Text', desc: 'Image missing alt attribute' });
      } else if (selectedElement.alt.length < 5) {
        checks.push({ status: 'warn', title: 'Alt Text', desc: 'Alt text may be too short' });
      } else {
        checks.push({ status: 'pass', title: 'Alt Text', desc: 'Image has alt text' });
      }
    }

    // Check 3: Button/Link text
    if (selectedElement.tagName === 'BUTTON' || selectedElement.tagName === 'A') {
      const text = selectedElement.textContent?.trim();
      if (!text && !selectedElement.getAttribute('aria-label')) {
        checks.push({ status: 'fail', title: 'Accessible Name', desc: 'Missing text or aria-label' });
      } else {
        checks.push({ status: 'pass', title: 'Accessible Name', desc: 'Has accessible text' });
      }
    }

    // Check 4: Font size
    const fontSize = parseFloat(cs.fontSize);
    if (fontSize < 12) {
      checks.push({ status: 'warn', title: 'Font Size', desc: `${fontSize}px may be too small` });
    } else {
      checks.push({ status: 'pass', title: 'Font Size', desc: `${fontSize}px - Readable` });
    }

    // Check 5: Focus indicator for interactive elements
    if (['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA'].includes(selectedElement.tagName)) {
      const outline = cs.outline;
      if (outline === 'none' || outline.includes('0px')) {
        checks.push({ status: 'warn', title: 'Focus Indicator', desc: 'May not have visible focus state' });
      }
    }

    list.innerHTML = checks.map(c => `
      <div class="lumos-a11y-item">
        <span class="lumos-a11y-icon ${c.status}">${c.status === 'pass' ? icons.checkCircle : c.status === 'warn' ? icons.alertTriangle : icons.alertCircle}</span>
        <div class="lumos-a11y-content">
          <div class="lumos-a11y-title">${c.title}</div>
          <div class="lumos-a11y-desc">${c.desc}</div>
        </div>
      </div>
    `).join('');
  }

  // Contrast ratio helper
  function getContrastRatio(fg, bg) {
    const getLum = (rgb) => {
      const match = rgb.match(/\d+/g);
      if (!match) return 0;
      const [r, g, b] = match.map(v => {
        v = parseInt(v) / 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const l1 = getLum(fg);
    const l2 = getLum(bg);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  }

  // Copy/Paste styles
  container.querySelector('.lumos-copy-styles-btn')?.addEventListener('click', () => {
    if (!selectedElement) return showToast('Select an element first', 'error');
    copiedStyles = getElementStyles(selectedElement);
    container.querySelector('.lumos-paste-styles-btn').disabled = false;
    showToast('Styles copied!', 'success');
  });

  container.querySelector('.lumos-paste-styles-btn')?.addEventListener('click', () => {
    if (!selectedElement || !copiedStyles) return;
    Object.entries(copiedStyles).forEach(([prop, val]) => {
      if (val && val !== 'none' && val !== 'auto' && val !== 'normal') {
        const cssProp = prop.replace(/([A-Z])/g, '-$1').toLowerCase();
        applyStyleChange(cssProp, val);
      }
    });
    showToast('Styles pasted!', 'success');
  });

  // Selector copy
  container.querySelector('.lumos-selector-copy')?.addEventListener('click', () => {
    if (!selectedElement) return;
    const selector = generateSelector(selectedElement);
    navigator.clipboard.writeText(selector);
    showToast('Selector copied!', 'success');
  });

  // Measure tool
  container.querySelector('.lumos-measure-btn')?.addEventListener('click', () => {
    measureMode = !measureMode;
    container.querySelector('.lumos-measure-btn').classList.toggle('active', measureMode);
    if (measureMode) {
      showToast('Click two points to measure');
      document.body.style.cursor = 'crosshair';
    } else {
      document.body.style.cursor = '';
      clearMeasurement();
    }
  });

  function clearMeasurement() {
    document.querySelectorAll('.lumos-measure-line, .lumos-measure-label, .lumos-measure-point').forEach(el => el.remove());
    measureStart = null;
  }

  document.addEventListener('click', (e) => {
    if (!measureMode) return;
    if (e.target.closest('.lumos-ui')) return;

    e.preventDefault();
    e.stopPropagation();

    if (!measureStart) {
      measureStart = { x: e.clientX, y: e.clientY };
      const point = document.createElement('div');
      point.className = 'lumos-measure-point lumos-ui';
      point.style.left = e.clientX + 'px';
      point.style.top = e.clientY + 'px';
      document.body.appendChild(point);
    } else {
      const dx = e.clientX - measureStart.x;
      const dy = e.clientY - measureStart.y;
      const dist = Math.round(Math.sqrt(dx * dx + dy * dy));

      // Draw line
      const line = document.createElement('div');
      line.className = 'lumos-measure-line lumos-ui';
      const angle = Math.atan2(dy, dx) * 180 / Math.PI;
      line.style.cssText = `
        left: ${measureStart.x}px;
        top: ${measureStart.y}px;
        width: ${dist}px;
        height: 2px;
        background: #f59e0b;
        transform-origin: 0 50%;
        transform: rotate(${angle}deg);
      `;
      document.body.appendChild(line);

      // Draw end point
      const point = document.createElement('div');
      point.className = 'lumos-measure-point lumos-ui';
      point.style.left = e.clientX + 'px';
      point.style.top = e.clientY + 'px';
      document.body.appendChild(point);

      // Show label
      const label = document.createElement('div');
      label.className = 'lumos-measure-label lumos-ui';
      label.textContent = `${dist}px`;
      label.style.left = (measureStart.x + e.clientX) / 2 + 'px';
      label.style.top = (measureStart.y + e.clientY) / 2 - 20 + 'px';
      document.body.appendChild(label);

      measureStart = null;
      showToast(`Distance: ${dist}px`);
    }
  }, true);

  // Export modal
  container.querySelector('.lumos-export-btn')?.addEventListener('click', openExportModal);

  function openExportModal() {
    if (changes.length === 0) return showToast('No changes to export', 'error');

    const overlay = document.createElement('div');
    overlay.className = 'lumos-modal-overlay lumos-ui';
    overlay.innerHTML = `
      <div class="lumos-modal">
        <div class="lumos-modal-header">
          <span class="lumos-modal-title">Export Styles</span>
          <button class="lumos-modal-close">${icons.close}</button>
        </div>
        <div class="lumos-modal-body">
          <div class="lumos-modal-tabs">
            <button class="lumos-modal-tab active" data-format="css">CSS</button>
            <button class="lumos-modal-tab" data-format="scss">SCSS</button>
            <button class="lumos-modal-tab" data-format="tailwind">Tailwind</button>
            <button class="lumos-modal-tab" data-format="cssInJs">CSS-in-JS</button>
          </div>
          <pre class="lumos-modal-code"></pre>
        </div>
        <div class="lumos-modal-footer">
          <button class="lumos-btn lumos-btn-secondary lumos-modal-download">${icons.download} Download</button>
          <button class="lumos-btn lumos-btn-primary lumos-modal-copy">${icons.copy} Copy</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    let currentFormat = 'css';
    const codeEl = overlay.querySelector('.lumos-modal-code');

    function updateExportCode() {
      codeEl.textContent = generateExportCode(currentFormat);
    }

    overlay.querySelectorAll('.lumos-modal-tab').forEach(tab => {
      tab.onclick = () => {
        currentFormat = tab.dataset.format;
        overlay.querySelectorAll('.lumos-modal-tab').forEach(t => t.classList.toggle('active', t === tab));
        updateExportCode();
      };
    });

    overlay.querySelector('.lumos-modal-close').onclick = () => overlay.remove();
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

    overlay.querySelector('.lumos-modal-copy').onclick = () => {
      navigator.clipboard.writeText(codeEl.textContent);
      showToast('Copied to clipboard!', 'success');
    };

    overlay.querySelector('.lumos-modal-download').onclick = () => {
      const ext = currentFormat === 'scss' ? 'scss' : currentFormat === 'tailwind' ? 'txt' : currentFormat === 'cssInJs' ? 'js' : 'css';
      const blob = new Blob([codeEl.textContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lumos-styles.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
    };

    updateExportCode();
  }

  function generateExportCode(format) {
    const grouped = {};
    changes.forEach(c => {
      if (!grouped[c.selector]) grouped[c.selector] = {};
      grouped[c.selector][c.property] = c.newValue;
    });

    if (format === 'css') {
      let mediaPrefix = '';
      if (currentBreakpoint !== 'base') {
        mediaPrefix = `@media (min-width: ${breakpoints[currentBreakpoint].minWidth}px) {\n`;
      }
      let css = Object.entries(grouped).map(([sel, props]) => {
        const rules = Object.entries(props).map(([p, v]) => `  ${p}: ${v};`).join('\n');
        return `${sel} {\n${rules}\n}`;
      }).join('\n\n');
      if (mediaPrefix) css = mediaPrefix + css.split('\n').map(l => '  ' + l).join('\n') + '\n}';
      return css;
    }

    if (format === 'scss') {
      return Object.entries(grouped).map(([sel, props]) => {
        const rules = Object.entries(props).map(([p, v]) => `  ${p}: ${v};`).join('\n');
        return `${sel} {\n${rules}\n}`;
      }).join('\n\n');
    }

    if (format === 'tailwind') {
      const cssToTw = {
        'display': { 'flex': 'flex', 'block': 'block', 'inline': 'inline', 'grid': 'grid', 'none': 'hidden' },
        'position': { 'relative': 'relative', 'absolute': 'absolute', 'fixed': 'fixed' },
        'text-align': { 'left': 'text-left', 'center': 'text-center', 'right': 'text-right' },
      };
      let result = '/* Approximate Tailwind classes */\n\n';
      Object.entries(grouped).forEach(([sel, props]) => {
        const classes = [];
        Object.entries(props).forEach(([p, v]) => {
          if (cssToTw[p]?.[v]) classes.push(cssToTw[p][v]);
          else classes.push(`[${p}:${v}]`);
        });
        result += `${sel}:\n  ${classes.join(' ')}\n\n`;
      });
      return result;
    }

    if (format === 'cssInJs') {
      return Object.entries(grouped).map(([sel, props]) => {
        const jsProps = Object.entries(props).map(([p, v]) => {
          const camel = p.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
          return `  ${camel}: '${v}'`;
        }).join(',\n');
        return `// ${sel}\nconst styles = {\n${jsProps}\n};`;
      }).join('\n\n');
    }

    return '';
  }

  // Track recent colors
  function addRecentColor(color) {
    if (!color || color === 'transparent') return;
    recentColors = [color, ...recentColors.filter(c => c !== color)].slice(0, 10);
    updateRecentColors();
  }

  function updateRecentColors() {
    const container = document.querySelector('.lumos-recent-colors');
    if (!container || recentColors.length === 0) return;
    container.innerHTML = recentColors.map(c => `
      <div class="lumos-recent-color" style="background:${c}" data-color="${c}" title="${c}"></div>
    `).join('');
    container.querySelectorAll('.lumos-recent-color').forEach(el => {
      el.onclick = () => {
        const color = el.dataset.color;
        const activeColorInput = document.activeElement?.closest('.lumos-color-field')?.querySelector('input[type="color"]');
        if (activeColorInput && selectedElement) {
          activeColorInput.value = color;
          applyStyleChange(activeColorInput.dataset.prop, color);
        }
      };
    });
  }

  // Track color changes
  const originalApplyStyleChange = applyStyleChange;
  applyStyleChange = function(prop, value) {
    originalApplyStyleChange(prop, value);
    if (prop.includes('color') || prop === 'background') {
      addRecentColor(value);
    }
  };

  // ============================================
  // COMMAND PALETTE (Cmd+K)
  // ============================================
  let commandPaletteOpen = false;

  const commands = [
    { id: 'toggle-inspector', label: 'Toggle Inspector', icon: 'cursor', shortcut: 'I', action: toggleInspector },
    { id: 'undo', label: 'Undo Change', icon: 'undo', shortcut: '⌘Z', action: undo },
    { id: 'redo', label: 'Redo Change', icon: 'redo', shortcut: '⇧⌘Z', action: redo },
    { id: 'copy-css', label: 'Copy CSS', icon: 'copy', shortcut: '⌘S', action: copyCss },
    { id: 'export', label: 'Export Styles', icon: 'download', action: openExportModal },
    { id: 'clear', label: 'Clear All Changes', icon: 'trash', action: clearChanges },
    { id: 'measure', label: 'Toggle Measure Tool', icon: 'ruler', action: () => container.querySelector('.lumos-measure-btn')?.click() },
    { id: 'copy-styles', label: 'Copy Element Styles', icon: 'copy', action: () => container.querySelector('.lumos-copy-styles-btn')?.click() },
    { id: 'paste-styles', label: 'Paste Styles', icon: 'paste', action: () => container.querySelector('.lumos-paste-styles-btn')?.click() },
    { id: 'copy-selector', label: 'Copy Selector', icon: 'copy', action: () => container.querySelector('.lumos-selector-copy')?.click() },
    { id: 'create-pr', label: 'Create Pull Request', icon: 'github', action: openCreatePR },
    { id: 'shortcuts', label: 'Show Keyboard Shortcuts', icon: 'keyboard', action: openShortcutsPanel },
    { id: 'settings', label: 'Open Settings', icon: 'settings', action: openSettingsPanel },
    { id: 'history', label: 'View Change History', icon: 'clock', action: openHistoryPanel },
    { id: 'presets', label: 'Manage Style Presets', icon: 'bookmark', action: openPresetsPanel },
    { id: 'share', label: 'Share Session', icon: 'share', action: openSharePanel },
    { id: 'help', label: 'Help & Tutorial', icon: 'help', action: showOnboarding },
    { id: 'toggle-navigator', label: 'Toggle Navigator', icon: 'sidebar', action: toggleNavigator },
    { id: 'desktop', label: 'Desktop View', icon: 'monitor', action: () => setViewport('desktop') },
    { id: 'tablet', label: 'Tablet View', icon: 'tablet', action: () => setViewport('tablet') },
    { id: 'mobile', label: 'Mobile View', icon: 'phone', action: () => setViewport('mobile') },
  ];

  function openCommandPalette() {
    if (commandPaletteOpen) return closeCommandPalette();
    commandPaletteOpen = true;

    const overlay = document.createElement('div');
    overlay.className = 'lumos-command-overlay lumos-ui';
    overlay.id = 'lumos-command-palette';
    overlay.innerHTML = `
      <div class="lumos-command-palette">
        <div class="lumos-command-header">
          <span class="lumos-command-icon">${icons.command}</span>
          <input class="lumos-command-input" placeholder="Search commands..." autofocus>
          <span class="lumos-command-hint">ESC to close</span>
        </div>
        <div class="lumos-command-list"></div>
      </div>
    `;
    document.body.appendChild(overlay);

    const input = overlay.querySelector('.lumos-command-input');
    const list = overlay.querySelector('.lumos-command-list');
    let selectedIndex = 0;

    function renderCommands(filter = '') {
      const filtered = commands.filter(c =>
        c.label.toLowerCase().includes(filter.toLowerCase())
      );
      list.innerHTML = filtered.map((cmd, i) => `
        <div class="lumos-command-item ${i === selectedIndex ? 'selected' : ''}" data-index="${i}" data-id="${cmd.id}">
          <span class="lumos-command-item-icon">${icons[cmd.icon] || ''}</span>
          <span class="lumos-command-item-label">${cmd.label}</span>
          ${cmd.shortcut ? `<span class="lumos-command-item-shortcut">${cmd.shortcut}</span>` : ''}
        </div>
      `).join('');

      list.querySelectorAll('.lumos-command-item').forEach(item => {
        item.onclick = () => executeCommand(item.dataset.id);
        item.onmouseenter = () => {
          selectedIndex = parseInt(item.dataset.index);
          renderCommands(input.value);
        };
      });
    }

    function executeCommand(id) {
      const cmd = commands.find(c => c.id === id);
      if (cmd) {
        closeCommandPalette();
        setTimeout(() => cmd.action(), 50);
      }
    }

    input.oninput = () => {
      selectedIndex = 0;
      renderCommands(input.value);
    };

    input.onkeydown = (e) => {
      const filtered = commands.filter(c =>
        c.label.toLowerCase().includes(input.value.toLowerCase())
      );

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, filtered.length - 1);
        renderCommands(input.value);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, 0);
        renderCommands(input.value);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          executeCommand(filtered[selectedIndex].id);
        }
      } else if (e.key === 'Escape') {
        closeCommandPalette();
      }
    };

    overlay.onclick = (e) => {
      if (e.target === overlay) closeCommandPalette();
    };

    renderCommands();
    input.focus();
  }

  function closeCommandPalette() {
    commandPaletteOpen = false;
    document.getElementById('lumos-command-palette')?.remove();
  }

  // Cmd+K handler
  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      openCommandPalette();
    }
  });

  // ============================================
  // KEYBOARD SHORTCUTS PANEL
  // ============================================
  function openShortcutsPanel() {
    const shortcuts = [
      { keys: '⌘K', desc: 'Open command palette' },
      { keys: '⌘Z', desc: 'Undo change' },
      { keys: '⇧⌘Z', desc: 'Redo change' },
      { keys: '⌘S', desc: 'Copy CSS' },
      { keys: 'Esc', desc: 'Close panel / Disable inspector' },
      { keys: 'I', desc: 'Toggle inspector mode' },
      { keys: 'N', desc: 'Toggle navigator' },
      { keys: '1', desc: 'Desktop viewport' },
      { keys: '2', desc: 'Tablet viewport' },
      { keys: '3', desc: 'Mobile viewport' },
      { keys: '⌘C', desc: 'Copy styles (with element)' },
      { keys: '⌘V', desc: 'Paste styles (with element)' },
      { keys: 'M', desc: 'Toggle measure tool' },
      { keys: 'H', desc: 'Open history panel' },
      { keys: '?', desc: 'Show help' },
    ];

    const overlay = document.createElement('div');
    overlay.className = 'lumos-modal-overlay lumos-ui';
    overlay.innerHTML = `
      <div class="lumos-modal">
        <div class="lumos-modal-header">
          <span class="lumos-modal-title">${icons.keyboard} Keyboard Shortcuts</span>
          <button class="lumos-modal-close">${icons.close}</button>
        </div>
        <div class="lumos-modal-body" style="max-height:400px;overflow:auto">
          <div class="lumos-shortcuts-list">
            ${shortcuts.map(s => `
              <div class="lumos-shortcut-item">
                <span class="lumos-shortcut-keys">${s.keys}</span>
                <span class="lumos-shortcut-desc">${s.desc}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.querySelector('.lumos-modal-close').onclick = () => overlay.remove();
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
  }

  // Quick keyboard shortcuts
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (commandPaletteOpen) return;

    if (e.key === 'i' && !e.metaKey && !e.ctrlKey) toggleInspector();
    if (e.key === 'n' && !e.metaKey && !e.ctrlKey) toggleNavigator();
    if (e.key === '1') setViewport('desktop');
    if (e.key === '2') setViewport('tablet');
    if (e.key === '3') setViewport('mobile');
    if (e.key === 'm' && !e.metaKey && !e.ctrlKey) container.querySelector('.lumos-measure-btn')?.click();
    if (e.key === 'h' && !e.metaKey && !e.ctrlKey) openHistoryPanel();
    if (e.key === '?') openShortcutsPanel();
  });

  // ============================================
  // HISTORY PANEL
  // ============================================
  function openHistoryPanel() {
    const overlay = document.createElement('div');
    overlay.className = 'lumos-modal-overlay lumos-ui';
    overlay.innerHTML = `
      <div class="lumos-modal" style="width:500px">
        <div class="lumos-modal-header">
          <span class="lumos-modal-title">${icons.clock} Change History</span>
          <button class="lumos-modal-close">${icons.close}</button>
        </div>
        <div class="lumos-modal-body" style="max-height:500px;overflow:auto;padding:0">
          <div class="lumos-history-list">
            ${changes.length === 0 ? '<div style="padding:24px;text-align:center;color:#71717a">No changes yet</div>' :
              changes.slice().reverse().map((c, i) => `
                <div class="lumos-history-item" data-index="${changes.length - 1 - i}">
                  <div class="lumos-history-main">
                    <span class="lumos-history-selector">${c.selector}</span>
                    <span class="lumos-history-time">${formatTime(c.timestamp)}</span>
                  </div>
                  <div class="lumos-history-change">
                    <span class="lumos-history-prop">${c.property}:</span>
                    <span class="lumos-history-old">${c.oldValue || '(none)'}</span>
                    <span class="lumos-history-arrow">→</span>
                    <span class="lumos-history-new">${c.newValue}</span>
                  </div>
                  <div class="lumos-history-actions">
                    <button class="lumos-history-revert" data-index="${changes.length - 1 - i}">Revert</button>
                    <button class="lumos-history-goto" data-selector="${c.selector}">Go to</button>
                  </div>
                </div>
              `).join('')
            }
          </div>
        </div>
        <div class="lumos-modal-footer">
          <button class="lumos-btn lumos-btn-secondary" onclick="this.closest('.lumos-modal-overlay').remove()">Close</button>
          ${changes.length > 0 ? '<button class="lumos-btn lumos-btn-primary lumos-clear-history">Clear All</button>' : ''}
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.querySelector('.lumos-modal-close').onclick = () => overlay.remove();
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

    overlay.querySelectorAll('.lumos-history-revert').forEach(btn => {
      btn.onclick = () => {
        const idx = parseInt(btn.dataset.index);
        const change = changes[idx];
        if (change) {
          const el = document.querySelector(change.selector);
          if (el) el.style[change.property] = change.oldValue;
          changes.splice(idx, 1);
          persistChanges();
          overlay.remove();
          openHistoryPanel();
          showToast('Change reverted');
        }
      };
    });

    overlay.querySelectorAll('.lumos-history-goto').forEach(btn => {
      btn.onclick = () => {
        const el = document.querySelector(btn.dataset.selector);
        if (el) {
          if (selectedElement) selectedElement.classList.remove('lumos-selected-outline');
          selectedElement = el;
          selectedElement.classList.add('lumos-selected-outline');
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          overlay.remove();
          updateUI();
        }
      };
    });

    overlay.querySelector('.lumos-clear-history')?.addEventListener('click', () => {
      if (confirm('Clear all change history?')) {
        clearChanges();
        overlay.remove();
      }
    });
  }

  function formatTime(timestamp) {
    const d = new Date(timestamp);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString();
  }

  // ============================================
  // STYLE PRESETS
  // ============================================
  let stylePresets = JSON.parse(localStorage.getItem('lumos-presets') || '[]');

  function openPresetsPanel() {
    const overlay = document.createElement('div');
    overlay.className = 'lumos-modal-overlay lumos-ui';
    overlay.id = 'lumos-presets-modal';

    function render() {
      overlay.innerHTML = `
        <div class="lumos-modal" style="width:500px">
          <div class="lumos-modal-header">
            <span class="lumos-modal-title">${icons.bookmark} Style Presets</span>
            <button class="lumos-modal-close">${icons.close}</button>
          </div>
          <div class="lumos-modal-body" style="padding:0;max-height:400px;overflow:auto">
            ${!selectedElement ? '<div style="padding:24px;text-align:center;color:#71717a">Select an element first to save/apply presets</div>' : `
              <div style="padding:12px;border-bottom:1px solid #27272a">
                <button class="lumos-btn lumos-btn-primary lumos-save-preset" style="width:100%">${icons.star} Save Current Styles as Preset</button>
              </div>
              <div class="lumos-presets-list">
                ${stylePresets.length === 0 ? '<div style="padding:24px;text-align:center;color:#71717a">No presets saved yet</div>' :
                  stylePresets.map((p, i) => `
                    <div class="lumos-preset-item">
                      <div class="lumos-preset-info">
                        <span class="lumos-preset-name">${p.name}</span>
                        <span class="lumos-preset-count">${Object.keys(p.styles).length} properties</span>
                      </div>
                      <div class="lumos-preset-actions">
                        <button class="lumos-preset-apply" data-index="${i}">Apply</button>
                        <button class="lumos-preset-delete" data-index="${i}">${icons.trash}</button>
                      </div>
                    </div>
                  `).join('')
                }
              </div>
            `}
          </div>
        </div>
      `;

      overlay.querySelector('.lumos-modal-close').onclick = () => overlay.remove();
      overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

      overlay.querySelector('.lumos-save-preset')?.addEventListener('click', () => {
        const name = prompt('Preset name:');
        if (!name || !selectedElement) return;
        const styles = getElementStyles(selectedElement);
        stylePresets.push({ name, styles, created: Date.now() });
        localStorage.setItem('lumos-presets', JSON.stringify(stylePresets));
        showToast('Preset saved!', 'success');
        render();
      });

      overlay.querySelectorAll('.lumos-preset-apply').forEach(btn => {
        btn.onclick = () => {
          if (!selectedElement) return showToast('Select an element first', 'error');
          const preset = stylePresets[parseInt(btn.dataset.index)];
          Object.entries(preset.styles).forEach(([prop, val]) => {
            if (val && val !== 'none' && val !== 'auto' && val !== 'normal' && val !== 'rgba(0, 0, 0, 0)') {
              const cssProp = prop.replace(/([A-Z])/g, '-$1').toLowerCase();
              applyStyleChange(cssProp, val);
            }
          });
          showToast('Preset applied!', 'success');
          overlay.remove();
        };
      });

      overlay.querySelectorAll('.lumos-preset-delete').forEach(btn => {
        btn.onclick = () => {
          stylePresets.splice(parseInt(btn.dataset.index), 1);
          localStorage.setItem('lumos-presets', JSON.stringify(stylePresets));
          showToast('Preset deleted');
          render();
        };
      });
    }

    document.body.appendChild(overlay);
    render();
  }

  // ============================================
  // SETTINGS PANEL
  // ============================================
  let settings = JSON.parse(localStorage.getItem('lumos-settings') || '{}');
  settings = {
    showGrid: settings.showGrid ?? false,
    gridSize: settings.gridSize ?? 8,
    snapToGrid: settings.snapToGrid ?? false,
    highlightOnHover: settings.highlightOnHover ?? true,
    showDimensions: settings.showDimensions ?? true,
    darkMode: settings.darkMode ?? true,
    autoSave: settings.autoSave ?? true,
  };

  function saveSettings() {
    localStorage.setItem('lumos-settings', JSON.stringify(settings));
  }

  function openSettingsPanel() {
    const overlay = document.createElement('div');
    overlay.className = 'lumos-modal-overlay lumos-ui';
    overlay.innerHTML = `
      <div class="lumos-modal" style="width:400px">
        <div class="lumos-modal-header">
          <span class="lumos-modal-title">${icons.settings} Settings</span>
          <button class="lumos-modal-close">${icons.close}</button>
        </div>
        <div class="lumos-modal-body" style="padding:0">
          <div class="lumos-settings-section">
            <div class="lumos-settings-title">Inspector</div>
            <div class="lumos-settings-row">
              <span class="lumos-settings-label">Highlight on hover</span>
              <div class="lumos-toggle ${settings.highlightOnHover ? 'active' : ''}" data-setting="highlightOnHover"></div>
            </div>
            <div class="lumos-settings-row">
              <span class="lumos-settings-label">Show dimensions</span>
              <div class="lumos-toggle ${settings.showDimensions ? 'active' : ''}" data-setting="showDimensions"></div>
            </div>
          </div>
          <div class="lumos-settings-section">
            <div class="lumos-settings-title">Grid & Snap</div>
            <div class="lumos-settings-row">
              <span class="lumos-settings-label">Show grid overlay</span>
              <div class="lumos-toggle ${settings.showGrid ? 'active' : ''}" data-setting="showGrid"></div>
            </div>
            <div class="lumos-settings-row">
              <span class="lumos-settings-label">Snap to grid</span>
              <div class="lumos-toggle ${settings.snapToGrid ? 'active' : ''}" data-setting="snapToGrid"></div>
            </div>
            <div class="lumos-settings-row">
              <span class="lumos-settings-label">Grid size</span>
              <select class="lumos-select" data-setting="gridSize" style="width:80px">
                <option value="4" ${settings.gridSize === 4 ? 'selected' : ''}>4px</option>
                <option value="8" ${settings.gridSize === 8 ? 'selected' : ''}>8px</option>
                <option value="16" ${settings.gridSize === 16 ? 'selected' : ''}>16px</option>
                <option value="24" ${settings.gridSize === 24 ? 'selected' : ''}>24px</option>
              </select>
            </div>
          </div>
          <div class="lumos-settings-section">
            <div class="lumos-settings-title">Data</div>
            <div class="lumos-settings-row">
              <span class="lumos-settings-label">Auto-save changes</span>
              <div class="lumos-toggle ${settings.autoSave ? 'active' : ''}" data-setting="autoSave"></div>
            </div>
          </div>
        </div>
        <div class="lumos-modal-footer">
          <button class="lumos-btn lumos-btn-secondary" onclick="this.closest('.lumos-modal-overlay').remove()">Close</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.querySelector('.lumos-modal-close').onclick = () => overlay.remove();
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

    overlay.querySelectorAll('.lumos-toggle').forEach(toggle => {
      toggle.onclick = () => {
        const key = toggle.dataset.setting;
        settings[key] = !settings[key];
        toggle.classList.toggle('active', settings[key]);
        saveSettings();
        applySettings();
      };
    });

    overlay.querySelectorAll('select[data-setting]').forEach(select => {
      select.onchange = () => {
        const key = select.dataset.setting;
        settings[key] = parseInt(select.value);
        saveSettings();
        applySettings();
      };
    });
  }

  function applySettings() {
    // Apply grid overlay
    let gridOverlay = document.getElementById('lumos-grid-overlay');
    if (settings.showGrid) {
      if (!gridOverlay) {
        gridOverlay = document.createElement('div');
        gridOverlay.id = 'lumos-grid-overlay';
        gridOverlay.className = 'lumos-ui';
        gridOverlay.style.cssText = `
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 999998;
          background-image:
            linear-gradient(to right, rgba(139,92,246,0.1) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(139,92,246,0.1) 1px, transparent 1px);
          background-size: ${settings.gridSize}px ${settings.gridSize}px;
        `;
        document.body.appendChild(gridOverlay);
      } else {
        gridOverlay.style.backgroundSize = `${settings.gridSize}px ${settings.gridSize}px`;
      }
    } else if (gridOverlay) {
      gridOverlay.remove();
    }
  }

  // ============================================
  // SHARE LINK
  // ============================================
  function openSharePanel() {
    const shareData = {
      changes: changes,
      url: window.location.href,
      timestamp: Date.now()
    };
    const encoded = btoa(encodeURIComponent(JSON.stringify(shareData)));
    const shareUrl = `${studioUrl}/share?data=${encoded}`;

    const overlay = document.createElement('div');
    overlay.className = 'lumos-modal-overlay lumos-ui';
    overlay.innerHTML = `
      <div class="lumos-modal" style="width:500px">
        <div class="lumos-modal-header">
          <span class="lumos-modal-title">${icons.share} Share Session</span>
          <button class="lumos-modal-close">${icons.close}</button>
        </div>
        <div class="lumos-modal-body">
          <p style="color:#a1a1aa;margin-bottom:12px">Share this link to let others view your style changes:</p>
          <div class="lumos-share-url">
            <input type="text" value="${shareUrl}" readonly>
            <button class="lumos-btn lumos-btn-primary lumos-copy-share">${icons.copy}</button>
          </div>
          <p style="color:#71717a;font-size:11px;margin-top:12px">Note: The link includes all ${changes.length} style changes encoded in the URL.</p>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.querySelector('.lumos-modal-close').onclick = () => overlay.remove();
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

    overlay.querySelector('.lumos-copy-share').onclick = () => {
      navigator.clipboard.writeText(shareUrl);
      showToast('Link copied!', 'success');
    };
  }

  // ============================================
  // ONBOARDING TUTORIAL
  // ============================================
  const hasSeenOnboarding = localStorage.getItem('lumos-onboarding-seen');

  function showOnboarding() {
    const steps = [
      { title: 'Welcome to Lumos Inspector', subtitle: 'A powerful visual CSS editor', content: [
        'Inspect and edit any element on the page',
        'See changes in real-time',
        'Export CSS in multiple formats',
        'Create pull requests with your changes'
      ]},
      { title: 'Getting Started', subtitle: 'Basic workflow', content: [
        'Click the purple button to open the panel',
        'Toggle "Select Element" to enable inspector',
        'Hover and click elements to select them',
        'Modify styles in the right panel'
      ]},
      { title: 'Pro Tips', subtitle: 'Work faster', content: [
        'Press ⌘K to open the command palette',
        'Use keyboard shortcuts (press ? to view)',
        'Copy/paste styles between elements',
        'Save presets for reusable style sets'
      ]}
    ];

    let currentStep = 0;

    function render() {
      const overlay = document.getElementById('lumos-onboarding') || document.createElement('div');
      overlay.id = 'lumos-onboarding';
      overlay.className = 'lumos-onboarding-overlay lumos-ui';

      const step = steps[currentStep];
      overlay.innerHTML = `
        <div class="lumos-onboarding-card">
          <div class="lumos-onboarding-header">
            <div class="lumos-onboarding-icon">${icons.paintbrush}</div>
            <div class="lumos-onboarding-title">${step.title}</div>
            <div class="lumos-onboarding-subtitle">${step.subtitle}</div>
          </div>
          <div class="lumos-onboarding-body">
            ${step.content.map((text, i) => `
              <div class="lumos-onboarding-step">
                <div class="lumos-onboarding-step-num">${i + 1}</div>
                <div class="lumos-onboarding-step-text">${text}</div>
              </div>
            `).join('')}
          </div>
          <div class="lumos-onboarding-footer">
            <div class="lumos-onboarding-dots">
              ${steps.map((_, i) => `<div class="lumos-onboarding-dot ${i === currentStep ? 'active' : ''}"></div>`).join('')}
            </div>
            <div>
              ${currentStep > 0 ? '<button class="lumos-btn lumos-btn-secondary lumos-onboarding-prev">Back</button>' : ''}
              <button class="lumos-btn lumos-btn-primary lumos-onboarding-next">${currentStep === steps.length - 1 ? 'Get Started' : 'Next'}</button>
            </div>
          </div>
        </div>
      `;

      if (!overlay.parentNode) document.body.appendChild(overlay);

      overlay.querySelector('.lumos-onboarding-prev')?.addEventListener('click', () => {
        currentStep--;
        render();
      });

      overlay.querySelector('.lumos-onboarding-next').addEventListener('click', () => {
        if (currentStep === steps.length - 1) {
          localStorage.setItem('lumos-onboarding-seen', 'true');
          overlay.remove();
        } else {
          currentStep++;
          render();
        }
      });
    }

    render();
  }

  // ============================================
  // NAVIGATOR SEARCH
  // ============================================
  function addNavigatorSearch() {
    const navHeader = container.querySelector('.lumos-nav-header');
    if (!navHeader || navHeader.querySelector('.lumos-nav-search')) return;

    const searchContainer = document.createElement('div');
    searchContainer.className = 'lumos-nav-search';
    searchContainer.innerHTML = `
      <span class="lumos-nav-search-icon">${icons.search}</span>
      <input class="lumos-nav-search-input" placeholder="Filter elements...">
    `;
    navHeader.insertAdjacentElement('afterend', searchContainer);

    const input = searchContainer.querySelector('.lumos-nav-search-input');
    input.oninput = () => {
      const filter = input.value.toLowerCase();
      container.querySelectorAll('.lumos-tree-item').forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(filter) || !filter ? 'flex' : 'none';
      });
    };
  }

  // ============================================
  // MULTI-ELEMENT SELECTION
  // ============================================
  let multiSelectedElements = [];

  document.addEventListener('click', e => {
    if (!inspectorEnabled) return;
    if (e.target.closest('.lumos-ui')) return;

    if (e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();

      const el = e.target;
      if (multiSelectedElements.includes(el)) {
        // Deselect
        el.classList.remove('lumos-multi-selected');
        multiSelectedElements = multiSelectedElements.filter(x => x !== el);
      } else {
        // Add to selection
        el.classList.add('lumos-multi-selected');
        multiSelectedElements.push(el);
      }
      showToast(`${multiSelectedElements.length} elements selected`);
    }
  }, true);

  // ============================================
  // DRAG HANDLES
  // ============================================
  function createDragHandles() {
    if (!selectedElement || !settings.showDimensions) return;

    // Remove existing handles
    document.querySelectorAll('.lumos-drag-handle').forEach(h => h.remove());

    const rect = selectedElement.getBoundingClientRect();
    const handles = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

    handles.forEach(pos => {
      const handle = document.createElement('div');
      handle.className = 'lumos-drag-handle lumos-ui';
      handle.dataset.position = pos;

      let x, y;
      switch(pos) {
        case 'nw': x = rect.left; y = rect.top; break;
        case 'n': x = rect.left + rect.width/2; y = rect.top; break;
        case 'ne': x = rect.right; y = rect.top; break;
        case 'e': x = rect.right; y = rect.top + rect.height/2; break;
        case 'se': x = rect.right; y = rect.bottom; break;
        case 's': x = rect.left + rect.width/2; y = rect.bottom; break;
        case 'sw': x = rect.left; y = rect.bottom; break;
        case 'w': x = rect.left; y = rect.top + rect.height/2; break;
      }

      handle.style.cssText = `
        position: fixed;
        width: 8px;
        height: 8px;
        background: #8b5cf6;
        border: 2px solid white;
        border-radius: 2px;
        z-index: 1000000;
        cursor: ${pos}-resize;
        left: ${x - 4}px;
        top: ${y - 4}px;
      `;

      handle.onmousedown = (e) => startResize(e, pos);
      document.body.appendChild(handle);
    });
  }

  let resizing = false;
  let resizeStart = { x: 0, y: 0, width: 0, height: 0 };

  function startResize(e, direction) {
    if (!selectedElement) return;
    e.preventDefault();
    resizing = true;
    const rect = selectedElement.getBoundingClientRect();
    resizeStart = { x: e.clientX, y: e.clientY, width: rect.width, height: rect.height };

    const onMouseMove = (e) => {
      if (!resizing) return;
      const dx = e.clientX - resizeStart.x;
      const dy = e.clientY - resizeStart.y;

      let newWidth = resizeStart.width;
      let newHeight = resizeStart.height;

      if (direction.includes('e')) newWidth += dx;
      if (direction.includes('w')) newWidth -= dx;
      if (direction.includes('s')) newHeight += dy;
      if (direction.includes('n')) newHeight -= dy;

      if (settings.snapToGrid) {
        newWidth = Math.round(newWidth / settings.gridSize) * settings.gridSize;
        newHeight = Math.round(newHeight / settings.gridSize) * settings.gridSize;
      }

      selectedElement.style.width = newWidth + 'px';
      selectedElement.style.height = newHeight + 'px';
      createDragHandles();
    };

    const onMouseUp = () => {
      if (resizing) {
        applyStyleChange('width', selectedElement.style.width);
        applyStyleChange('height', selectedElement.style.height);
      }
      resizing = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  // Update drag handles when element changes
  const originalUpdateUI = updateUI;
  updateUI = function() {
    originalUpdateUI();
    createDragHandles();
  };

  // ============================================
  // FAVORITES / PINNED PROPERTIES
  // ============================================
  let favoriteProps = JSON.parse(localStorage.getItem('lumos-favorites') || '["color","background-color","font-size","padding","margin"]');

  function toggleFavorite(prop) {
    if (favoriteProps.includes(prop)) {
      favoriteProps = favoriteProps.filter(p => p !== prop);
    } else {
      favoriteProps.push(prop);
    }
    localStorage.setItem('lumos-favorites', JSON.stringify(favoriteProps));
    showToast(favoriteProps.includes(prop) ? 'Added to favorites' : 'Removed from favorites');
  }

  // ============================================
  // ANIMATION/TRANSITION EDITOR
  // ============================================
  function openAnimationEditor() {
    if (!selectedElement) return showToast('Select an element first', 'error');

    const cs = getComputedStyle(selectedElement);
    const currentTransition = cs.transition;
    const currentAnimation = cs.animation;

    const overlay = document.createElement('div');
    overlay.className = 'lumos-modal-overlay lumos-ui';
    overlay.innerHTML = `
      <div class="lumos-modal" style="width:500px">
        <div class="lumos-modal-header">
          <span class="lumos-modal-title">${icons.film} Animation Editor</span>
          <button class="lumos-modal-close">${icons.close}</button>
        </div>
        <div class="lumos-modal-body">
          <div class="lumos-animation-editor">
            <div class="lumos-animation-preview">
              <div class="lumos-animation-preview-box" id="lumos-anim-preview"></div>
            </div>

            <div class="lumos-section">
              <div class="lumos-section-header">Transition</div>
              <div class="lumos-section-content">
                <div class="lumos-row">
                  <div class="lumos-field">
                    <label class="lumos-label">Property</label>
                    <select class="lumos-select" id="lumos-trans-prop">
                      <option value="all">all</option>
                      <option value="transform">transform</option>
                      <option value="opacity">opacity</option>
                      <option value="background">background</option>
                      <option value="color">color</option>
                      <option value="box-shadow">box-shadow</option>
                    </select>
                  </div>
                  <div class="lumos-field">
                    <label class="lumos-label">Duration</label>
                    <input class="lumos-input" id="lumos-trans-dur" value="0.3s" placeholder="0.3s">
                  </div>
                </div>
                <div class="lumos-row">
                  <div class="lumos-field">
                    <label class="lumos-label">Easing</label>
                    <select class="lumos-select lumos-easing-select" id="lumos-trans-ease">
                      <option value="ease">ease</option>
                      <option value="ease-in">ease-in</option>
                      <option value="ease-out">ease-out</option>
                      <option value="ease-in-out">ease-in-out</option>
                      <option value="linear">linear</option>
                      <option value="cubic-bezier(0.4, 0, 0.2, 1)">Material</option>
                      <option value="cubic-bezier(0.68, -0.55, 0.265, 1.55)">Bounce</option>
                    </select>
                  </div>
                  <div class="lumos-field">
                    <label class="lumos-label">Delay</label>
                    <input class="lumos-input" id="lumos-trans-delay" value="0s" placeholder="0s">
                  </div>
                </div>
              </div>
            </div>

            <div class="lumos-animation-controls">
              <button class="lumos-animation-control-btn" id="lumos-anim-test">${icons.play} Test</button>
              <button class="lumos-animation-control-btn" id="lumos-anim-apply">${icons.check} Apply</button>
            </div>

            <div class="lumos-section">
              <div class="lumos-section-header">Quick Animations</div>
              <div class="lumos-section-content">
                <div class="lumos-layout-quick">
                  <button class="lumos-layout-quick-btn" data-anim="fade">Fade In/Out</button>
                  <button class="lumos-layout-quick-btn" data-anim="slide">Slide Up</button>
                  <button class="lumos-layout-quick-btn" data-anim="scale">Scale</button>
                  <button class="lumos-layout-quick-btn" data-anim="rotate">Rotate</button>
                  <button class="lumos-layout-quick-btn" data-anim="shake">Shake</button>
                  <button class="lumos-layout-quick-btn" data-anim="pulse">Pulse</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const preview = overlay.querySelector('#lumos-anim-preview');
    const propSel = overlay.querySelector('#lumos-trans-prop');
    const durInput = overlay.querySelector('#lumos-trans-dur');
    const easeSel = overlay.querySelector('#lumos-trans-ease');
    const delayInput = overlay.querySelector('#lumos-trans-delay');

    function getTransitionValue() {
      return `${propSel.value} ${durInput.value} ${easeSel.value} ${delayInput.value}`;
    }

    overlay.querySelector('#lumos-anim-test').onclick = () => {
      preview.style.transition = getTransitionValue();
      preview.style.transform = 'scale(1.2) rotate(5deg)';
      setTimeout(() => { preview.style.transform = ''; }, 500);
    };

    overlay.querySelector('#lumos-anim-apply').onclick = () => {
      applyStyleChange('transition', getTransitionValue());
      showToast('Transition applied!', 'success');
      overlay.remove();
    };

    overlay.querySelectorAll('[data-anim]').forEach(btn => {
      btn.onclick = () => {
        const anim = btn.dataset.anim;
        let keyframes, animValue;
        switch(anim) {
          case 'fade':
            applyStyleChange('transition', 'opacity 0.3s ease');
            break;
          case 'slide':
            applyStyleChange('transition', 'transform 0.3s ease');
            break;
          case 'scale':
            applyStyleChange('transition', 'transform 0.2s ease-out');
            break;
          case 'rotate':
            applyStyleChange('transition', 'transform 0.5s ease');
            break;
          case 'shake':
            selectedElement.style.animation = 'lumos-shake 0.5s';
            break;
          case 'pulse':
            selectedElement.style.animation = 'lumos-pulse 1s infinite';
            break;
        }
        showToast(`${anim} animation applied`);
      };
    });

    overlay.querySelector('.lumos-modal-close').onclick = () => overlay.remove();
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
  }

  // Add animation keyframes
  const animStyle = document.createElement('style');
  animStyle.textContent = `
    @keyframes lumos-shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
    @keyframes lumos-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
  `;
  document.head.appendChild(animStyle);

  // ============================================
  // SPACING VISUALIZER
  // ============================================
  let spacingVisualizerEnabled = false;

  function toggleSpacingVisualizer() {
    spacingVisualizerEnabled = !spacingVisualizerEnabled;
    updateSpacingVisualizer();
  }

  function updateSpacingVisualizer() {
    document.querySelectorAll('.lumos-spacing-overlay').forEach(el => el.remove());

    if (!spacingVisualizerEnabled || !selectedElement) return;

    const rect = selectedElement.getBoundingClientRect();
    const cs = getComputedStyle(selectedElement);

    const mt = parseFloat(cs.marginTop);
    const mr = parseFloat(cs.marginRight);
    const mb = parseFloat(cs.marginBottom);
    const ml = parseFloat(cs.marginLeft);
    const pt = parseFloat(cs.paddingTop);
    const pr = parseFloat(cs.paddingRight);
    const pb = parseFloat(cs.paddingBottom);
    const pl = parseFloat(cs.paddingLeft);

    // Margin overlays
    if (mt > 0) createSpacingOverlay(rect.left, rect.top - mt, rect.width, mt, 'margin', `${mt}px`);
    if (mr > 0) createSpacingOverlay(rect.right, rect.top, mr, rect.height, 'margin', `${mr}px`);
    if (mb > 0) createSpacingOverlay(rect.left, rect.bottom, rect.width, mb, 'margin', `${mb}px`);
    if (ml > 0) createSpacingOverlay(rect.left - ml, rect.top, ml, rect.height, 'margin', `${ml}px`);

    // Padding overlays
    if (pt > 0) createSpacingOverlay(rect.left, rect.top, rect.width, pt, 'padding', `${pt}px`);
    if (pr > 0) createSpacingOverlay(rect.right - pr, rect.top, pr, rect.height, 'padding', `${pr}px`);
    if (pb > 0) createSpacingOverlay(rect.left, rect.bottom - pb, rect.width, pb, 'padding', `${pb}px`);
    if (pl > 0) createSpacingOverlay(rect.left, rect.top, pl, rect.height, 'padding', `${pl}px`);
  }

  function createSpacingOverlay(x, y, w, h, type, label) {
    const div = document.createElement('div');
    div.className = `lumos-spacing-overlay lumos-spacing-${type} lumos-ui`;
    div.style.cssText = `left:${x}px;top:${y}px;width:${w}px;height:${h}px`;
    const labelEl = document.createElement('span');
    labelEl.className = 'lumos-spacing-label';
    labelEl.textContent = label;
    labelEl.style.cssText = 'left:50%;top:50%;transform:translate(-50%,-50%)';
    div.appendChild(labelEl);
    document.body.appendChild(div);
  }

  // ============================================
  // CSS VARIABLES INSPECTOR
  // ============================================
  function openCSSVariablesPanel() {
    const rootStyles = getComputedStyle(document.documentElement);
    const allVars = [];

    // Get CSS variables from :root
    for (const prop of document.styleSheets) {
      try {
        for (const rule of prop.cssRules || []) {
          if (rule.selectorText === ':root') {
            const text = rule.cssText;
            const matches = text.matchAll(/--([^:]+):\s*([^;]+)/g);
            for (const match of matches) {
              allVars.push({ name: '--' + match[1].trim(), value: match[2].trim() });
            }
          }
        }
      } catch (e) {}
    }

    // Fallback: check computed style for common vars
    if (allVars.length === 0) {
      ['--background', '--foreground', '--primary', '--secondary', '--muted', '--accent', '--border', '--ring'].forEach(name => {
        const val = rootStyles.getPropertyValue(name);
        if (val) allVars.push({ name, value: val.trim() });
      });
    }

    const overlay = document.createElement('div');
    overlay.className = 'lumos-modal-overlay lumos-ui';
    overlay.innerHTML = `
      <div class="lumos-modal" style="width:450px">
        <div class="lumos-modal-header">
          <span class="lumos-modal-title">${icons.code} CSS Variables</span>
          <button class="lumos-modal-close">${icons.close}</button>
        </div>
        <div class="lumos-modal-body" style="padding:0;max-height:400px;overflow:auto">
          <div class="lumos-vars-list">
            ${allVars.length === 0 ? '<div style="padding:24px;text-align:center;color:#71717a">No CSS variables found</div>' :
              allVars.map(v => {
                const isColor = v.value.startsWith('#') || v.value.startsWith('rgb') || v.value.startsWith('hsl');
                return `
                  <div class="lumos-var-item" data-var="${v.name}">
                    ${isColor ? `<div class="lumos-var-color" style="background:${v.value}"></div>` : ''}
                    <span class="lumos-var-name">${v.name}</span>
                    <span class="lumos-var-value" title="${v.value}">${v.value}</span>
                    <button class="lumos-copy-var" style="padding:4px 8px;background:#27272a;border:none;border-radius:4px;color:#a1a1aa;cursor:pointer;font-size:10px">Copy</button>
                  </div>
                `;
              }).join('')
            }
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.querySelector('.lumos-modal-close').onclick = () => overlay.remove();
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

    overlay.querySelectorAll('.lumos-copy-var').forEach(btn => {
      btn.onclick = () => {
        const varName = btn.closest('.lumos-var-item').dataset.var;
        navigator.clipboard.writeText(`var(${varName})`);
        showToast('Copied!', 'success');
      };
    });
  }

  // ============================================
  // ELEMENT INFO TOOLTIP
  // ============================================
  let infoTooltip = null;

  function showInfoTooltip(el, x, y) {
    if (!settings.showDimensions) return;
    if (!infoTooltip) {
      infoTooltip = document.createElement('div');
      infoTooltip.className = 'lumos-info-tooltip lumos-ui';
      document.body.appendChild(infoTooltip);
    }

    const rect = el.getBoundingClientRect();
    const tag = el.tagName.toLowerCase();
    const id = el.id ? `#${el.id}` : '';
    const classes = (el.className && typeof el.className === 'string')
      ? el.className.split(' ').filter(c => c && !c.startsWith('lumos-')).slice(0, 3).map(c => '.' + c).join('')
      : '';

    infoTooltip.innerHTML = `
      <span class="lumos-info-tooltip-tag">${tag}</span><span class="lumos-info-tooltip-id">${id}</span><span class="lumos-info-tooltip-class">${classes}</span>
      <div class="lumos-info-tooltip-size">${Math.round(rect.width)} × ${Math.round(rect.height)}</div>
    `;
    infoTooltip.style.left = (x + 15) + 'px';
    infoTooltip.style.top = (y + 15) + 'px';
    infoTooltip.style.display = 'block';
  }

  function hideInfoTooltip() {
    if (infoTooltip) infoTooltip.style.display = 'none';
  }

  // Hook into mouseover
  document.addEventListener('mousemove', e => {
    if (!inspectorEnabled || !settings.showDimensions) return;
    if (e.target.closest('.lumos-ui')) {
      hideInfoTooltip();
      return;
    }
    if (hoveredElement && hoveredElement !== selectedElement) {
      showInfoTooltip(hoveredElement, e.clientX, e.clientY);
    }
  });

  document.addEventListener('mouseout', () => hideInfoTooltip());

  // ============================================
  // QUICK LAYOUT MODE
  // ============================================
  function openLayoutPanel() {
    if (!selectedElement) return showToast('Select an element first', 'error');

    const cs = getComputedStyle(selectedElement);
    const currentDisplay = cs.display;

    const overlay = document.createElement('div');
    overlay.className = 'lumos-modal-overlay lumos-ui';
    overlay.innerHTML = `
      <div class="lumos-modal" style="width:400px">
        <div class="lumos-modal-header">
          <span class="lumos-modal-title">${icons.layout} Quick Layout</span>
          <button class="lumos-modal-close">${icons.close}</button>
        </div>
        <div class="lumos-modal-body">
          <div class="lumos-layout-panel">
            <div class="lumos-section-header" style="margin-bottom:8px">Display Type</div>
            <div class="lumos-layout-grid">
              <button class="lumos-layout-btn ${currentDisplay === 'block' ? 'active' : ''}" data-display="block">
                ${icons.box}<br>Block
              </button>
              <button class="lumos-layout-btn ${currentDisplay === 'flex' ? 'active' : ''}" data-display="flex">
                ${icons.columns}<br>Flex
              </button>
              <button class="lumos-layout-btn ${currentDisplay === 'grid' ? 'active' : ''}" data-display="grid">
                ${icons.grid}<br>Grid
              </button>
              <button class="lumos-layout-btn ${currentDisplay === 'inline-flex' ? 'active' : ''}" data-display="inline-flex">
                ${icons.columns}<br>I-Flex
              </button>
              <button class="lumos-layout-btn ${currentDisplay === 'none' ? 'active' : ''}" data-display="none">
                ${icons.eye}<br>Hidden
              </button>
              <button class="lumos-layout-btn ${currentDisplay === 'inline-block' ? 'active' : ''}" data-display="inline-block">
                ${icons.box}<br>I-Block
              </button>
            </div>

            <div class="lumos-section-header" style="margin-bottom:8px">Quick Flex Layouts</div>
            <div class="lumos-layout-quick">
              <button class="lumos-layout-quick-btn" data-layout="row-center">Row Center</button>
              <button class="lumos-layout-quick-btn" data-layout="col-center">Col Center</button>
              <button class="lumos-layout-quick-btn" data-layout="space-between">Space Between</button>
              <button class="lumos-layout-quick-btn" data-layout="space-around">Space Around</button>
              <button class="lumos-layout-quick-btn" data-layout="wrap">Flex Wrap</button>
              <button class="lumos-layout-quick-btn" data-layout="stretch">Stretch</button>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.querySelector('.lumos-modal-close').onclick = () => overlay.remove();
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

    overlay.querySelectorAll('[data-display]').forEach(btn => {
      btn.onclick = () => {
        applyStyleChange('display', btn.dataset.display);
        overlay.querySelectorAll('[data-display]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        showToast(`Display: ${btn.dataset.display}`);
      };
    });

    overlay.querySelectorAll('[data-layout]').forEach(btn => {
      btn.onclick = () => {
        const layout = btn.dataset.layout;
        applyStyleChange('display', 'flex');
        switch(layout) {
          case 'row-center':
            applyStyleChange('flex-direction', 'row');
            applyStyleChange('justify-content', 'center');
            applyStyleChange('align-items', 'center');
            break;
          case 'col-center':
            applyStyleChange('flex-direction', 'column');
            applyStyleChange('justify-content', 'center');
            applyStyleChange('align-items', 'center');
            break;
          case 'space-between':
            applyStyleChange('justify-content', 'space-between');
            break;
          case 'space-around':
            applyStyleChange('justify-content', 'space-around');
            break;
          case 'wrap':
            applyStyleChange('flex-wrap', 'wrap');
            break;
          case 'stretch':
            applyStyleChange('align-items', 'stretch');
            break;
        }
        showToast(`Applied ${layout} layout`);
      };
    });
  }

  // ============================================
  // COLOR EYEDROPPER
  // ============================================
  let eyedropperActive = false;

  function toggleEyedropper() {
    if (!window.EyeDropper) {
      // Fallback for browsers without EyeDropper API
      showToast('Eyedropper not supported in this browser', 'error');
      return;
    }

    const eyeDropper = new EyeDropper();
    eyeDropper.open().then(result => {
      const color = result.sRGBHex;
      navigator.clipboard.writeText(color);
      showToast(`Color ${color} copied!`, 'success');

      // If an element is selected and we have a recent color input, apply it
      if (selectedElement) {
        const lastColorProp = container.querySelector('[data-prop="color"]') ||
                              container.querySelector('[data-prop="background-color"]');
        if (lastColorProp) {
          // Show color in toast
          showToast(`Picked: ${color}`, 'success');
        }
      }
    }).catch(() => {
      // User cancelled
    });
  }

  // ============================================
  // RULERS
  // ============================================
  let rulersEnabled = false;

  function toggleRulers() {
    rulersEnabled = !rulersEnabled;
    updateRulers();
  }

  function updateRulers() {
    document.querySelectorAll('.lumos-ruler').forEach(el => el.remove());
    if (!rulersEnabled) return;

    // Horizontal ruler
    const hRuler = document.createElement('div');
    hRuler.className = 'lumos-ruler lumos-ruler-h lumos-ui';
    let hTicks = '';
    for (let i = 0; i <= window.innerWidth; i += 100) {
      hTicks += `<span class="lumos-ruler-tick" style="left:${i}px">${i}</span>`;
    }
    hRuler.innerHTML = hTicks;
    document.body.appendChild(hRuler);

    // Vertical ruler
    const vRuler = document.createElement('div');
    vRuler.className = 'lumos-ruler lumos-ruler-v lumos-ui';
    let vTicks = '';
    for (let i = 0; i <= window.innerHeight; i += 100) {
      vTicks += `<span class="lumos-ruler-tick" style="top:${i}px">${i}</span>`;
    }
    vRuler.innerHTML = vTicks;
    document.body.appendChild(vRuler);
  }

  // ============================================
  // DOM NAVIGATION (Parent/Child)
  // ============================================
  function selectParent() {
    if (!selectedElement || selectedElement === document.body) return;
    const parent = selectedElement.parentElement;
    if (parent && parent !== document.body && parent !== document.documentElement) {
      if (selectedElement) selectedElement.classList.remove('lumos-selected-outline');
      selectedElement = parent;
      selectedElement.classList.add('lumos-selected-outline');
      updateUI();
      showToast(`Selected parent: ${parent.tagName.toLowerCase()}`);
    }
  }

  function selectFirstChild() {
    if (!selectedElement) return;
    const child = selectedElement.querySelector(':scope > *:not(.lumos-ui)');
    if (child) {
      if (selectedElement) selectedElement.classList.remove('lumos-selected-outline');
      selectedElement = child;
      selectedElement.classList.add('lumos-selected-outline');
      updateUI();
      showToast(`Selected child: ${child.tagName.toLowerCase()}`);
    }
  }

  function selectNextSibling() {
    if (!selectedElement) return;
    let next = selectedElement.nextElementSibling;
    while (next && next.classList.contains('lumos-ui')) {
      next = next.nextElementSibling;
    }
    if (next) {
      if (selectedElement) selectedElement.classList.remove('lumos-selected-outline');
      selectedElement = next;
      selectedElement.classList.add('lumos-selected-outline');
      updateUI();
    }
  }

  function selectPrevSibling() {
    if (!selectedElement) return;
    let prev = selectedElement.previousElementSibling;
    while (prev && prev.classList.contains('lumos-ui')) {
      prev = prev.previousElementSibling;
    }
    if (prev) {
      if (selectedElement) selectedElement.classList.remove('lumos-selected-outline');
      selectedElement = prev;
      selectedElement.classList.add('lumos-selected-outline');
      updateUI();
    }
  }

  // Arrow key navigation
  document.addEventListener('keydown', e => {
    if (!inspectorEnabled || !selectedElement) return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    if (e.altKey && e.key === 'ArrowUp') {
      e.preventDefault();
      selectParent();
    } else if (e.altKey && e.key === 'ArrowDown') {
      e.preventDefault();
      selectFirstChild();
    } else if (e.altKey && e.key === 'ArrowLeft') {
      e.preventDefault();
      selectPrevSibling();
    } else if (e.altKey && e.key === 'ArrowRight') {
      e.preventDefault();
      selectNextSibling();
    }
  });

  // ============================================
  // ELEMENT SCREENSHOT
  // ============================================
  async function captureElement() {
    if (!selectedElement) return showToast('Select an element first', 'error');

    try {
      // Use html2canvas if available, otherwise provide instructions
      if (typeof html2canvas !== 'undefined') {
        const canvas = await html2canvas(selectedElement);
        const link = document.createElement('a');
        link.download = 'element-screenshot.png';
        link.href = canvas.toDataURL();
        link.click();
        showToast('Screenshot saved!', 'success');
      } else {
        // Provide clipboard-based solution
        const rect = selectedElement.getBoundingClientRect();
        showToast(`Element size: ${Math.round(rect.width)}×${Math.round(rect.height)}px. Use browser DevTools to capture.`, 'info');
      }
    } catch (err) {
      showToast('Screenshot failed', 'error');
    }
  }

  // ============================================
  // SPACING GUIDES BETWEEN ELEMENTS
  // ============================================
  let spacingGuidesEnabled = false;

  function toggleSpacingGuides() {
    spacingGuidesEnabled = !spacingGuidesEnabled;
    updateSpacingGuides();
  }

  function updateSpacingGuides() {
    document.querySelectorAll('.lumos-spacing-guide').forEach(el => el.remove());
    if (!spacingGuidesEnabled || !selectedElement || !hoveredElement || selectedElement === hoveredElement) return;

    const r1 = selectedElement.getBoundingClientRect();
    const r2 = hoveredElement.getBoundingClientRect();

    // Calculate distances
    const guides = [];

    // Horizontal distance
    if (r2.left > r1.right) {
      // r2 is to the right
      const dist = Math.round(r2.left - r1.right);
      guides.push({ x: r1.right, y: Math.max(r1.top, r2.top), w: dist, h: 2, label: dist + 'px', dir: 'h' });
    } else if (r1.left > r2.right) {
      // r1 is to the right
      const dist = Math.round(r1.left - r2.right);
      guides.push({ x: r2.right, y: Math.max(r1.top, r2.top), w: dist, h: 2, label: dist + 'px', dir: 'h' });
    }

    // Vertical distance
    if (r2.top > r1.bottom) {
      // r2 is below
      const dist = Math.round(r2.top - r1.bottom);
      guides.push({ x: Math.max(r1.left, r2.left), y: r1.bottom, w: 2, h: dist, label: dist + 'px', dir: 'v' });
    } else if (r1.top > r2.bottom) {
      // r1 is below
      const dist = Math.round(r1.top - r2.bottom);
      guides.push({ x: Math.max(r1.left, r2.left), y: r2.bottom, w: 2, h: dist, label: dist + 'px', dir: 'v' });
    }

    guides.forEach(g => {
      const guide = document.createElement('div');
      guide.className = 'lumos-spacing-guide lumos-ui';
      guide.innerHTML = `
        <div class="lumos-spacing-guide-line" style="left:0;top:0;width:${g.w}px;height:${g.h}px"></div>
        <span class="lumos-spacing-guide-label" style="${g.dir === 'h' ? 'left:50%;top:-16px;transform:translateX(-50%)' : 'top:50%;left:8px;transform:translateY(-50%)'}">${g.label}</span>
      `;
      guide.style.cssText = `left:${g.x}px;top:${g.y}px`;
      document.body.appendChild(guide);
    });
  }

  // Update guides on hover
  document.addEventListener('mouseover', () => {
    if (spacingGuidesEnabled) updateSpacingGuides();
  });

  // ============================================
  // QUICK ACTIONS BAR
  // ============================================
  let quickBarVisible = false;

  function toggleQuickBar() {
    quickBarVisible = !quickBarVisible;
    updateQuickBar();
  }

  function updateQuickBar() {
    document.querySelector('.lumos-quick-bar')?.remove();
    if (!quickBarVisible || !selectedElement) return;

    const bar = document.createElement('div');
    bar.className = 'lumos-quick-bar lumos-ui';
    bar.innerHTML = `
      <button class="lumos-quick-bar-btn" data-action="copy-styles" title="Copy Styles">${icons.copy}</button>
      <button class="lumos-quick-bar-btn" data-action="paste-styles" title="Paste Styles">${icons.paste}</button>
      <div class="lumos-quick-bar-divider"></div>
      <button class="lumos-quick-bar-btn" data-action="layout" title="Layout">${icons.layout}</button>
      <button class="lumos-quick-bar-btn" data-action="animation" title="Animation">${icons.film}</button>
      <div class="lumos-quick-bar-divider"></div>
      <button class="lumos-quick-bar-btn" data-action="parent" title="Select Parent">${icons.arrowUp}</button>
      <button class="lumos-quick-bar-btn" data-action="child" title="Select Child">${icons.arrowDown}</button>
      <div class="lumos-quick-bar-divider"></div>
      <button class="lumos-quick-bar-btn" data-action="screenshot" title="Screenshot">${icons.camera}</button>
    `;
    document.body.appendChild(bar);

    bar.querySelectorAll('[data-action]').forEach(btn => {
      btn.onclick = () => {
        const action = btn.dataset.action;
        switch(action) {
          case 'copy-styles': container.querySelector('.lumos-copy-styles-btn')?.click(); break;
          case 'paste-styles': container.querySelector('.lumos-paste-styles-btn')?.click(); break;
          case 'layout': openLayoutPanel(); break;
          case 'animation': openAnimationEditor(); break;
          case 'parent': selectParent(); break;
          case 'child': selectFirstChild(); break;
          case 'screenshot': captureElement(); break;
        }
      };
    });
  }

  // ============================================
  // BOX SHADOW EDITOR
  // ============================================
  let shadowLayers = [
    { x: 0, y: 4, blur: 6, spread: -1, color: 'rgba(0,0,0,0.1)', inset: false },
    { x: 0, y: 2, blur: 4, spread: -2, color: 'rgba(0,0,0,0.1)', inset: false }
  ];

  function openBoxShadowEditor() {
    if (!selectedElement) return showToast('Select an element first', 'error');

    const overlay = document.createElement('div');
    overlay.className = 'lumos-modal-overlay lumos-ui';
    overlay.id = 'lumos-shadow-editor';

    function render() {
      const shadowValue = shadowLayers.map(l =>
        `${l.inset ? 'inset ' : ''}${l.x}px ${l.y}px ${l.blur}px ${l.spread}px ${l.color}`
      ).join(', ');

      overlay.innerHTML = `
        <div class="lumos-modal" style="width:500px">
          <div class="lumos-modal-header">
            <span class="lumos-modal-title">${icons.shadow} Box Shadow Editor</span>
            <button class="lumos-modal-close">${icons.close}</button>
          </div>
          <div class="lumos-modal-body">
            <div class="lumos-shadow-editor">
              <div class="lumos-shadow-preview">
                <div class="lumos-shadow-preview-box" style="box-shadow: ${shadowValue}"></div>
              </div>

              <div class="lumos-shadow-layers">
                ${shadowLayers.map((layer, i) => `
                  <div class="lumos-shadow-layer" data-index="${i}">
                    <input type="color" class="lumos-shadow-layer-color" value="${rgbToHex(layer.color) || '#000000'}" data-field="color">
                    <div class="lumos-shadow-layer-inputs">
                      <input class="lumos-shadow-layer-input" value="${layer.x}" data-field="x" title="X offset">
                      <input class="lumos-shadow-layer-input" value="${layer.y}" data-field="y" title="Y offset">
                      <input class="lumos-shadow-layer-input" value="${layer.blur}" data-field="blur" title="Blur">
                      <input class="lumos-shadow-layer-input" value="${layer.spread}" data-field="spread" title="Spread">
                    </div>
                    <label style="font-size:10px;color:#71717a">
                      <input type="checkbox" ${layer.inset ? 'checked' : ''} data-field="inset"> Inset
                    </label>
                    ${shadowLayers.length > 1 ? `<button class="lumos-shadow-layer-remove" data-remove="${i}">×</button>` : ''}
                  </div>
                `).join('')}
              </div>

              <button class="lumos-btn lumos-btn-secondary" style="width:100%;margin-bottom:12px" id="lumos-add-shadow">+ Add Layer</button>

              <div class="lumos-section">
                <div class="lumos-section-header">Presets</div>
                <div class="lumos-layout-quick">
                  <button class="lumos-layout-quick-btn" data-preset="sm">Small</button>
                  <button class="lumos-layout-quick-btn" data-preset="md">Medium</button>
                  <button class="lumos-layout-quick-btn" data-preset="lg">Large</button>
                  <button class="lumos-layout-quick-btn" data-preset="xl">X-Large</button>
                  <button class="lumos-layout-quick-btn" data-preset="glow">Glow</button>
                  <button class="lumos-layout-quick-btn" data-preset="none">None</button>
                </div>
              </div>
            </div>
          </div>
          <div class="lumos-modal-footer">
            <button class="lumos-btn lumos-btn-secondary" onclick="this.closest('.lumos-modal-overlay').remove()">Cancel</button>
            <button class="lumos-btn lumos-btn-primary" id="lumos-apply-shadow">Apply Shadow</button>
          </div>
        </div>
      `;

      // Event handlers
      overlay.querySelector('.lumos-modal-close').onclick = () => overlay.remove();
      overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

      overlay.querySelectorAll('.lumos-shadow-layer input').forEach(input => {
        input.onchange = () => {
          const idx = parseInt(input.closest('.lumos-shadow-layer').dataset.index);
          const field = input.dataset.field;
          if (field === 'inset') {
            shadowLayers[idx].inset = input.checked;
          } else if (field === 'color') {
            shadowLayers[idx].color = input.value;
          } else {
            shadowLayers[idx][field] = parseInt(input.value) || 0;
          }
          render();
        };
      });

      overlay.querySelectorAll('[data-remove]').forEach(btn => {
        btn.onclick = () => {
          shadowLayers.splice(parseInt(btn.dataset.remove), 1);
          render();
        };
      });

      overlay.querySelector('#lumos-add-shadow').onclick = () => {
        shadowLayers.push({ x: 0, y: 4, blur: 8, spread: 0, color: 'rgba(0,0,0,0.15)', inset: false });
        render();
      };

      overlay.querySelectorAll('[data-preset]').forEach(btn => {
        btn.onclick = () => {
          const p = btn.dataset.preset;
          switch(p) {
            case 'sm': shadowLayers = [{ x: 0, y: 1, blur: 2, spread: 0, color: 'rgba(0,0,0,0.05)', inset: false }]; break;
            case 'md': shadowLayers = [{ x: 0, y: 4, blur: 6, spread: -1, color: 'rgba(0,0,0,0.1)', inset: false }]; break;
            case 'lg': shadowLayers = [{ x: 0, y: 10, blur: 15, spread: -3, color: 'rgba(0,0,0,0.1)', inset: false }]; break;
            case 'xl': shadowLayers = [{ x: 0, y: 20, blur: 25, spread: -5, color: 'rgba(0,0,0,0.1)', inset: false }]; break;
            case 'glow': shadowLayers = [{ x: 0, y: 0, blur: 20, spread: 0, color: 'rgba(139,92,246,0.5)', inset: false }]; break;
            case 'none': shadowLayers = [{ x: 0, y: 0, blur: 0, spread: 0, color: 'rgba(0,0,0,0)', inset: false }]; break;
          }
          render();
        };
      });

      overlay.querySelector('#lumos-apply-shadow').onclick = () => {
        const val = shadowLayers.map(l =>
          `${l.inset ? 'inset ' : ''}${l.x}px ${l.y}px ${l.blur}px ${l.spread}px ${l.color}`
        ).join(', ');
        applyStyleChange('box-shadow', val);
        showToast('Shadow applied!', 'success');
        overlay.remove();
      };
    }

    document.body.appendChild(overlay);
    render();
  }

  // ============================================
  // FILTER EDITOR
  // ============================================
  function openFilterEditor() {
    if (!selectedElement) return showToast('Select an element first', 'error');

    const filters = {
      blur: { value: 0, unit: 'px', max: 20 },
      brightness: { value: 100, unit: '%', max: 200 },
      contrast: { value: 100, unit: '%', max: 200 },
      saturate: { value: 100, unit: '%', max: 200 },
      grayscale: { value: 0, unit: '%', max: 100 },
      sepia: { value: 0, unit: '%', max: 100 },
      hueRotate: { value: 0, unit: 'deg', max: 360 },
      invert: { value: 0, unit: '%', max: 100 },
      opacity: { value: 100, unit: '%', max: 100 }
    };

    const overlay = document.createElement('div');
    overlay.className = 'lumos-modal-overlay lumos-ui';

    function getFilterString() {
      const parts = [];
      if (filters.blur.value > 0) parts.push(`blur(${filters.blur.value}px)`);
      if (filters.brightness.value !== 100) parts.push(`brightness(${filters.brightness.value}%)`);
      if (filters.contrast.value !== 100) parts.push(`contrast(${filters.contrast.value}%)`);
      if (filters.saturate.value !== 100) parts.push(`saturate(${filters.saturate.value}%)`);
      if (filters.grayscale.value > 0) parts.push(`grayscale(${filters.grayscale.value}%)`);
      if (filters.sepia.value > 0) parts.push(`sepia(${filters.sepia.value}%)`);
      if (filters.hueRotate.value > 0) parts.push(`hue-rotate(${filters.hueRotate.value}deg)`);
      if (filters.invert.value > 0) parts.push(`invert(${filters.invert.value}%)`);
      if (filters.opacity.value < 100) parts.push(`opacity(${filters.opacity.value}%)`);
      return parts.length > 0 ? parts.join(' ') : 'none';
    }

    function render() {
      const filterStr = getFilterString();
      overlay.innerHTML = `
        <div class="lumos-modal" style="width:450px">
          <div class="lumos-modal-header">
            <span class="lumos-modal-title">${icons.sliders} Filter Editor</span>
            <button class="lumos-modal-close">${icons.close}</button>
          </div>
          <div class="lumos-modal-body">
            <div class="lumos-filter-editor">
              <div class="lumos-filter-preview" style="filter: ${filterStr}"></div>

              ${Object.entries(filters).map(([name, f]) => `
                <div class="lumos-filter-slider">
                  <div class="lumos-filter-slider-header">
                    <span class="lumos-filter-slider-label">${name.replace(/([A-Z])/g, ' $1')}</span>
                    <span class="lumos-filter-slider-value">${f.value}${f.unit}</span>
                  </div>
                  <input type="range" class="lumos-filter-range" data-filter="${name}" value="${f.value}" min="0" max="${f.max}">
                </div>
              `).join('')}

              <div class="lumos-layout-quick" style="margin-top:12px">
                <button class="lumos-layout-quick-btn" data-preset="reset">Reset</button>
                <button class="lumos-layout-quick-btn" data-preset="vintage">Vintage</button>
                <button class="lumos-layout-quick-btn" data-preset="noir">Noir</button>
                <button class="lumos-layout-quick-btn" data-preset="vibrant">Vibrant</button>
              </div>
            </div>
          </div>
          <div class="lumos-modal-footer">
            <button class="lumos-btn lumos-btn-secondary" onclick="this.closest('.lumos-modal-overlay').remove()">Cancel</button>
            <button class="lumos-btn lumos-btn-primary" id="lumos-apply-filter">Apply Filter</button>
          </div>
        </div>
      `;

      overlay.querySelector('.lumos-modal-close').onclick = () => overlay.remove();
      overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

      overlay.querySelectorAll('.lumos-filter-range').forEach(input => {
        input.oninput = () => {
          filters[input.dataset.filter].value = parseInt(input.value);
          render();
        };
      });

      overlay.querySelectorAll('[data-preset]').forEach(btn => {
        btn.onclick = () => {
          const p = btn.dataset.preset;
          if (p === 'reset') {
            Object.keys(filters).forEach(k => filters[k].value = k === 'brightness' || k === 'contrast' || k === 'saturate' || k === 'opacity' ? 100 : 0);
          } else if (p === 'vintage') {
            filters.sepia.value = 40; filters.contrast.value = 110; filters.brightness.value = 90;
          } else if (p === 'noir') {
            filters.grayscale.value = 100; filters.contrast.value = 120;
          } else if (p === 'vibrant') {
            filters.saturate.value = 150; filters.contrast.value = 110;
          }
          render();
        };
      });

      overlay.querySelector('#lumos-apply-filter').onclick = () => {
        applyStyleChange('filter', getFilterString());
        showToast('Filter applied!', 'success');
        overlay.remove();
      };
    }

    document.body.appendChild(overlay);
    render();
  }

  // ============================================
  // FOCUS MODE
  // ============================================
  let focusModeEnabled = false;

  function toggleFocusMode() {
    focusModeEnabled = !focusModeEnabled;
    updateFocusMode();
    showToast(focusModeEnabled ? 'Focus mode enabled' : 'Focus mode disabled');
  }

  function updateFocusMode() {
    document.querySelector('.lumos-focus-highlight')?.remove();

    if (!focusModeEnabled || !selectedElement) return;

    const rect = selectedElement.getBoundingClientRect();
    const highlight = document.createElement('div');
    highlight.className = 'lumos-focus-highlight lumos-ui';
    highlight.style.cssText = `
      left: ${rect.left}px;
      top: ${rect.top}px;
      width: ${rect.width}px;
      height: ${rect.height}px;
    `;
    document.body.appendChild(highlight);
  }

  // ============================================
  // STYLE COMPARISON
  // ============================================
  let compareElement = null;

  function startStyleComparison() {
    if (!selectedElement) return showToast('Select an element first', 'error');
    compareElement = selectedElement;
    showToast('Now select another element to compare');
  }

  function openStyleComparison() {
    if (!selectedElement || !compareElement || selectedElement === compareElement) {
      return showToast('Select two different elements to compare', 'error');
    }

    const styles1 = getElementStyles(compareElement);
    const styles2 = getElementStyles(selectedElement);

    const allProps = new Set([...Object.keys(styles1), ...Object.keys(styles2)]);
    const diffs = [];
    const same = [];

    allProps.forEach(prop => {
      if (styles1[prop] !== styles2[prop]) {
        diffs.push({ prop, val1: styles1[prop], val2: styles2[prop] });
      } else {
        same.push({ prop, value: styles1[prop] });
      }
    });

    const overlay = document.createElement('div');
    overlay.className = 'lumos-modal-overlay lumos-ui';
    overlay.innerHTML = `
      <div class="lumos-modal" style="width:700px">
        <div class="lumos-modal-header">
          <span class="lumos-modal-title">${icons.gitCompare} Style Comparison</span>
          <button class="lumos-modal-close">${icons.close}</button>
        </div>
        <div class="lumos-modal-body" style="max-height:500px;overflow:auto">
          <div class="lumos-compare-panel">
            <div class="lumos-compare-side">
              <div class="lumos-compare-title">Element A</div>
              <div class="lumos-compare-selector">${generateSelector(compareElement)}</div>
            </div>
            <div class="lumos-compare-side">
              <div class="lumos-compare-title">Element B</div>
              <div class="lumos-compare-selector">${generateSelector(selectedElement)}</div>
            </div>
          </div>

          <div style="padding:12px">
            <h4 style="color:#f59e0b;margin-bottom:8px">${diffs.length} Differences</h4>
            ${diffs.slice(0, 20).map(d => `
              <div class="lumos-compare-diff lumos-compare-different" style="margin-bottom:4px">
                <strong>${d.prop}:</strong> ${d.val1 || '(none)'} → ${d.val2 || '(none)'}
              </div>
            `).join('')}
            ${diffs.length > 20 ? `<div style="color:#71717a;font-size:11px">...and ${diffs.length - 20} more</div>` : ''}

            <h4 style="color:#22c55e;margin:12px 0 8px">${same.length} Same</h4>
            <div style="color:#71717a;font-size:11px">${same.length} properties have identical values</div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.querySelector('.lumos-modal-close').onclick = () => overlay.remove();
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
  }

  // ============================================
  // Z-INDEX / LAYER MANAGER
  // ============================================
  function openZIndexManager() {
    const elements = [];
    document.querySelectorAll('*:not(.lumos-ui)').forEach(el => {
      const z = getComputedStyle(el).zIndex;
      if (z !== 'auto' && parseInt(z) !== 0) {
        elements.push({ el, zIndex: parseInt(z), selector: generateSelector(el) });
      }
    });

    elements.sort((a, b) => b.zIndex - a.zIndex);
    const maxZ = Math.max(...elements.map(e => e.zIndex), 1);

    const overlay = document.createElement('div');
    overlay.className = 'lumos-modal-overlay lumos-ui';
    overlay.innerHTML = `
      <div class="lumos-modal" style="width:500px">
        <div class="lumos-modal-header">
          <span class="lumos-modal-title">${icons.layersIcon} Z-Index Manager</span>
          <button class="lumos-modal-close">${icons.close}</button>
        </div>
        <div class="lumos-modal-body" style="padding:0;max-height:500px;overflow:auto">
          ${elements.length === 0 ? '<div style="padding:24px;text-align:center;color:#71717a">No elements with z-index found</div>' : `
            <div class="lumos-zindex-list">
              ${elements.map((e, i) => `
                <div class="lumos-zindex-item ${e.el === selectedElement ? 'selected' : ''}" data-index="${i}">
                  <input class="lumos-zindex-value" value="${e.zIndex}" data-selector="${e.selector}">
                  <span class="lumos-zindex-selector">${e.selector}</span>
                  <div class="lumos-zindex-bar">
                    <div class="lumos-zindex-bar-fill" style="width:${(e.zIndex / maxZ) * 100}%"></div>
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.querySelector('.lumos-modal-close').onclick = () => overlay.remove();
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

    overlay.querySelectorAll('.lumos-zindex-item').forEach(item => {
      item.onclick = (e) => {
        if (e.target.tagName === 'INPUT') return;
        const el = elements[parseInt(item.dataset.index)].el;
        if (selectedElement) selectedElement.classList.remove('lumos-selected-outline');
        selectedElement = el;
        selectedElement.classList.add('lumos-selected-outline');
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        overlay.remove();
        updateUI();
      };
    });

    overlay.querySelectorAll('.lumos-zindex-value').forEach(input => {
      input.onchange = () => {
        const el = document.querySelector(input.dataset.selector);
        if (el) {
          el.style.zIndex = input.value;
          showToast(`z-index set to ${input.value}`);
        }
      };
    });
  }

  // ============================================
  // CSS AUDIT
  // ============================================
  function runCSSAudit() {
    const issues = {
      unusedClasses: [],
      duplicateStyles: [],
      importantOveruse: [],
      inlineStyles: [],
      deepNesting: []
    };

    // Check inline styles
    document.querySelectorAll('[style]:not(.lumos-ui)').forEach(el => {
      issues.inlineStyles.push(generateSelector(el));
    });

    // Check !important in stylesheets
    try {
      for (const sheet of document.styleSheets) {
        try {
          for (const rule of sheet.cssRules || []) {
            if (rule.cssText?.includes('!important')) {
              issues.importantOveruse.push(rule.selectorText);
            }
          }
        } catch (e) {}
      }
    } catch (e) {}

    // Check deep nesting
    document.querySelectorAll('*:not(.lumos-ui)').forEach(el => {
      let depth = 0;
      let current = el;
      while (current.parentElement && current !== document.body) {
        depth++;
        current = current.parentElement;
      }
      if (depth > 10) {
        issues.deepNesting.push({ selector: generateSelector(el), depth });
      }
    });

    const overlay = document.createElement('div');
    overlay.className = 'lumos-modal-overlay lumos-ui';
    overlay.innerHTML = `
      <div class="lumos-modal" style="width:550px">
        <div class="lumos-modal-header">
          <span class="lumos-modal-title">${icons.fileSearch} CSS Audit</span>
          <button class="lumos-modal-close">${icons.close}</button>
        </div>
        <div class="lumos-modal-body" style="max-height:500px;overflow:auto">
          <div class="lumos-audit-section">
            <div class="lumos-audit-header">
              <span class="lumos-audit-icon ${issues.inlineStyles.length > 10 ? 'warn' : 'pass'}">${issues.inlineStyles.length > 10 ? icons.alertTriangle : icons.checkCircle}</span>
              <span class="lumos-audit-title">Inline Styles</span>
              <span class="lumos-audit-count">${issues.inlineStyles.length}</span>
            </div>
            ${issues.inlineStyles.length > 0 ? `
              <div class="lumos-audit-items">
                ${issues.inlineStyles.slice(0, 5).map(s => `<div class="lumos-audit-item"><code>${s}</code></div>`).join('')}
                ${issues.inlineStyles.length > 5 ? `<div class="lumos-audit-item">...and ${issues.inlineStyles.length - 5} more</div>` : ''}
              </div>
            ` : ''}
          </div>

          <div class="lumos-audit-section">
            <div class="lumos-audit-header">
              <span class="lumos-audit-icon ${issues.importantOveruse.length > 5 ? 'warn' : 'pass'}">${issues.importantOveruse.length > 5 ? icons.alertTriangle : icons.checkCircle}</span>
              <span class="lumos-audit-title">!important Usage</span>
              <span class="lumos-audit-count">${issues.importantOveruse.length}</span>
            </div>
            ${issues.importantOveruse.length > 0 ? `
              <div class="lumos-audit-items">
                ${issues.importantOveruse.slice(0, 5).map(s => `<div class="lumos-audit-item"><code>${s}</code></div>`).join('')}
                ${issues.importantOveruse.length > 5 ? `<div class="lumos-audit-item">...and ${issues.importantOveruse.length - 5} more</div>` : ''}
              </div>
            ` : ''}
          </div>

          <div class="lumos-audit-section">
            <div class="lumos-audit-header">
              <span class="lumos-audit-icon ${issues.deepNesting.length > 0 ? 'warn' : 'pass'}">${issues.deepNesting.length > 0 ? icons.alertTriangle : icons.checkCircle}</span>
              <span class="lumos-audit-title">Deep Nesting (>10 levels)</span>
              <span class="lumos-audit-count">${issues.deepNesting.length}</span>
            </div>
            ${issues.deepNesting.length > 0 ? `
              <div class="lumos-audit-items">
                ${issues.deepNesting.slice(0, 5).map(n => `<div class="lumos-audit-item"><code>${n.selector}</code> (${n.depth} levels)</div>`).join('')}
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.querySelector('.lumos-modal-close').onclick = () => overlay.remove();
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
  }

  // ============================================
  // DARK MODE TOGGLE
  // ============================================
  let darkModeForced = false;

  function toggleDarkModePreview() {
    darkModeForced = !darkModeForced;

    if (darkModeForced) {
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
      showToast('Dark mode preview enabled');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = '';
      showToast('Dark mode preview disabled');
    }
  }

  // ============================================
  // TEXT SHADOW EDITOR
  // ============================================
  function openTextShadowEditor() {
    if (!selectedElement) return showToast('Select an element first', 'error');

    let shadow = { x: 2, y: 2, blur: 4, color: 'rgba(0,0,0,0.3)' };

    const overlay = document.createElement('div');
    overlay.className = 'lumos-modal-overlay lumos-ui';

    function render() {
      const shadowVal = `${shadow.x}px ${shadow.y}px ${shadow.blur}px ${shadow.color}`;
      overlay.innerHTML = `
        <div class="lumos-modal" style="width:400px">
          <div class="lumos-modal-header">
            <span class="lumos-modal-title">${icons.textCursor} Text Shadow Editor</span>
            <button class="lumos-modal-close">${icons.close}</button>
          </div>
          <div class="lumos-modal-body">
            <div class="lumos-text-shadow-preview">
              <span class="lumos-text-shadow-preview-text" style="text-shadow: ${shadowVal}">Sample Text</span>
            </div>

            <div class="lumos-row">
              <div class="lumos-field">
                <label class="lumos-label">X Offset</label>
                <input class="lumos-input" type="number" value="${shadow.x}" data-field="x">
              </div>
              <div class="lumos-field">
                <label class="lumos-label">Y Offset</label>
                <input class="lumos-input" type="number" value="${shadow.y}" data-field="y">
              </div>
            </div>
            <div class="lumos-row">
              <div class="lumos-field">
                <label class="lumos-label">Blur</label>
                <input class="lumos-input" type="number" value="${shadow.blur}" data-field="blur" min="0">
              </div>
              <div class="lumos-field">
                <label class="lumos-label">Color</label>
                <input type="color" class="lumos-input" value="${rgbToHex(shadow.color) || '#000000'}" data-field="color">
              </div>
            </div>

            <div class="lumos-layout-quick" style="margin-top:12px">
              <button class="lumos-layout-quick-btn" data-preset="subtle">Subtle</button>
              <button class="lumos-layout-quick-btn" data-preset="drop">Drop</button>
              <button class="lumos-layout-quick-btn" data-preset="glow">Glow</button>
              <button class="lumos-layout-quick-btn" data-preset="none">None</button>
            </div>
          </div>
          <div class="lumos-modal-footer">
            <button class="lumos-btn lumos-btn-secondary" onclick="this.closest('.lumos-modal-overlay').remove()">Cancel</button>
            <button class="lumos-btn lumos-btn-primary" id="lumos-apply-text-shadow">Apply</button>
          </div>
        </div>
      `;

      overlay.querySelector('.lumos-modal-close').onclick = () => overlay.remove();
      overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

      overlay.querySelectorAll('input').forEach(input => {
        input.onchange = () => {
          const field = input.dataset.field;
          shadow[field] = field === 'color' ? input.value : parseInt(input.value) || 0;
          render();
        };
      });

      overlay.querySelectorAll('[data-preset]').forEach(btn => {
        btn.onclick = () => {
          const p = btn.dataset.preset;
          if (p === 'subtle') shadow = { x: 1, y: 1, blur: 2, color: 'rgba(0,0,0,0.2)' };
          else if (p === 'drop') shadow = { x: 3, y: 3, blur: 6, color: 'rgba(0,0,0,0.4)' };
          else if (p === 'glow') shadow = { x: 0, y: 0, blur: 10, color: 'rgba(139,92,246,0.8)' };
          else if (p === 'none') shadow = { x: 0, y: 0, blur: 0, color: 'rgba(0,0,0,0)' };
          render();
        };
      });

      overlay.querySelector('#lumos-apply-text-shadow').onclick = () => {
        const val = `${shadow.x}px ${shadow.y}px ${shadow.blur}px ${shadow.color}`;
        applyStyleChange('text-shadow', val);
        showToast('Text shadow applied!', 'success');
        overlay.remove();
      };
    }

    document.body.appendChild(overlay);
    render();
  }

  // ============================================
  // SMART PROPERTY SUGGESTIONS
  // ============================================
  const propertySuggestions = {
    'display': ['flex', 'grid', 'block', 'inline-flex', 'none'],
    'position': ['relative', 'absolute', 'fixed', 'sticky'],
    'flex-direction': ['row', 'column', 'row-reverse', 'column-reverse'],
    'justify-content': ['flex-start', 'center', 'flex-end', 'space-between', 'space-around'],
    'align-items': ['flex-start', 'center', 'flex-end', 'stretch', 'baseline'],
    'text-align': ['left', 'center', 'right', 'justify'],
    'font-weight': ['400', '500', '600', '700', 'bold'],
    'overflow': ['hidden', 'auto', 'scroll', 'visible'],
    'cursor': ['pointer', 'default', 'move', 'text', 'not-allowed']
  };

  function showPropertySuggestions(input, property) {
    const suggestions = propertySuggestions[property];
    if (!suggestions) return;

    document.querySelector('.lumos-suggestions')?.remove();

    const rect = input.getBoundingClientRect();
    const panel = document.createElement('div');
    panel.className = 'lumos-suggestions lumos-ui';
    panel.style.cssText = `left:${rect.left}px;top:${rect.bottom + 4}px;min-width:${rect.width}px`;

    panel.innerHTML = suggestions.map(s => `
      <div class="lumos-suggestion-item" data-value="${s}">${s}</div>
    `).join('');

    document.body.appendChild(panel);

    panel.querySelectorAll('.lumos-suggestion-item').forEach(item => {
      item.onclick = () => {
        input.value = item.dataset.value;
        input.dispatchEvent(new Event('change'));
        panel.remove();
      };
    });

    // Close on click outside
    setTimeout(() => {
      document.addEventListener('click', function handler(e) {
        if (!panel.contains(e.target) && e.target !== input) {
          panel.remove();
          document.removeEventListener('click', handler);
        }
      });
    }, 10);
  }

  // ============================================
  // TRANSFORM EDITOR
  // ============================================
  function openTransformEditor() {
    if (!selectedElement) {
      showToast('Select an element first', 'warning');
      return;
    }

    document.querySelector('.lumos-transform-editor')?.remove();
    const cs = getComputedStyle(selectedElement);

    // Parse current transform
    let rotate = 0, scaleX = 1, scaleY = 1, skewX = 0, skewY = 0, translateX = 0, translateY = 0;
    const transform = cs.transform;
    if (transform && transform !== 'none') {
      const matrix = transform.match(/matrix\(([^)]+)\)/);
      if (matrix) {
        const values = matrix[1].split(',').map(Number);
        rotate = Math.round(Math.atan2(values[1], values[0]) * (180 / Math.PI));
        scaleX = Math.sqrt(values[0] * values[0] + values[1] * values[1]);
        scaleY = Math.sqrt(values[2] * values[2] + values[3] * values[3]);
      }
    }

    const panel = document.createElement('div');
    panel.className = 'lumos-transform-editor lumos-ui';
    panel.innerHTML = `
      <div style="padding:16px;border-bottom:1px solid #27272a;display:flex;align-items:center;justify-content:space-between">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="color:#8b5cf6">${icons.rotate}</span>
          <span style="font-weight:600;color:#fafafa">Transform</span>
        </div>
        <button class="lumos-close-transform" style="background:none;border:none;color:#71717a;cursor:pointer">${icons.close}</button>
      </div>
      <div style="padding:16px">
        <div style="display:flex;justify-content:center;margin-bottom:20px">
          <div class="lumos-transform-preview"></div>
        </div>
        <div class="lumos-transform-slider-row">
          <label>Rotate</label>
          <input type="range" min="-180" max="180" value="${rotate}" data-prop="rotate" />
          <input type="number" value="${rotate}" data-prop="rotate" />°
        </div>
        <div class="lumos-transform-slider-row">
          <label>Scale X</label>
          <input type="range" min="0" max="200" value="${scaleX * 100}" data-prop="scaleX" />
          <input type="number" value="${Math.round(scaleX * 100)}" data-prop="scaleX" />%
        </div>
        <div class="lumos-transform-slider-row">
          <label>Scale Y</label>
          <input type="range" min="0" max="200" value="${scaleY * 100}" data-prop="scaleY" />
          <input type="number" value="${Math.round(scaleY * 100)}" data-prop="scaleY" />%
        </div>
        <div class="lumos-transform-slider-row">
          <label>Skew X</label>
          <input type="range" min="-45" max="45" value="${skewX}" data-prop="skewX" />
          <input type="number" value="${skewX}" data-prop="skewX" />°
        </div>
        <div class="lumos-transform-slider-row">
          <label>Skew Y</label>
          <input type="range" min="-45" max="45" value="${skewY}" data-prop="skewY" />
          <input type="number" value="${skewY}" data-prop="skewY" />°
        </div>
        <div class="lumos-transform-slider-row">
          <label>Translate X</label>
          <input type="range" min="-100" max="100" value="${translateX}" data-prop="translateX" />
          <input type="number" value="${translateX}" data-prop="translateX" />px
        </div>
        <div class="lumos-transform-slider-row">
          <label>Translate Y</label>
          <input type="range" min="-100" max="100" value="${translateY}" data-prop="translateY" />
          <input type="number" value="${translateY}" data-prop="translateY" />px
        </div>
        <div style="display:flex;gap:8px;margin-top:16px">
          <button class="lumos-reset-transform" style="flex:1;padding:10px;background:#27272a;border:none;border-radius:6px;color:#fafafa;cursor:pointer">Reset</button>
        </div>
      </div>
    `;

    document.body.appendChild(panel);

    const preview = panel.querySelector('.lumos-transform-preview');

    function updateTransform() {
      const r = panel.querySelector('input[data-prop="rotate"]').value;
      const sx = panel.querySelector('input[data-prop="scaleX"]').value / 100;
      const sy = panel.querySelector('input[data-prop="scaleY"]').value / 100;
      const skx = panel.querySelector('input[data-prop="skewX"]').value;
      const sky = panel.querySelector('input[data-prop="skewY"]').value;
      const tx = panel.querySelector('input[data-prop="translateX"]').value;
      const ty = panel.querySelector('input[data-prop="translateY"]').value;

      const transformValue = `translate(${tx}px, ${ty}px) rotate(${r}deg) scale(${sx}, ${sy}) skew(${skx}deg, ${sky}deg)`;

      preview.style.transform = transformValue;
      applyStyle(selectedElement, 'transform', transformValue);
    }

    panel.querySelectorAll('input[type="range"]').forEach(range => {
      range.oninput = () => {
        const prop = range.dataset.prop;
        panel.querySelector(`input[type="number"][data-prop="${prop}"]`).value = range.value;
        updateTransform();
      };
    });

    panel.querySelectorAll('input[type="number"]').forEach(num => {
      num.onchange = () => {
        const prop = num.dataset.prop;
        panel.querySelector(`input[type="range"][data-prop="${prop}"]`).value = num.value;
        updateTransform();
      };
    });

    panel.querySelector('.lumos-reset-transform').onclick = () => {
      panel.querySelectorAll('input[data-prop="rotate"]').forEach(i => i.value = 0);
      panel.querySelectorAll('input[data-prop="scaleX"]').forEach(i => i.value = 100);
      panel.querySelectorAll('input[data-prop="scaleY"]').forEach(i => i.value = 100);
      panel.querySelectorAll('input[data-prop="skewX"]').forEach(i => i.value = 0);
      panel.querySelectorAll('input[data-prop="skewY"]').forEach(i => i.value = 0);
      panel.querySelectorAll('input[data-prop="translateX"]').forEach(i => i.value = 0);
      panel.querySelectorAll('input[data-prop="translateY"]').forEach(i => i.value = 0);
      updateTransform();
    };

    panel.querySelector('.lumos-close-transform').onclick = () => panel.remove();
  }

  // ============================================
  // POSITION EDITOR
  // ============================================
  function openPositionEditor() {
    if (!selectedElement) {
      showToast('Select an element first', 'warning');
      return;
    }

    document.querySelector('.lumos-position-editor')?.remove();
    const cs = getComputedStyle(selectedElement);
    const currentPosition = cs.position || 'static';

    const panel = document.createElement('div');
    panel.className = 'lumos-position-editor lumos-ui';
    panel.innerHTML = `
      <div style="padding:16px;border-bottom:1px solid #27272a;display:flex;align-items:center;justify-content:space-between">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="color:#8b5cf6">${icons.mapPin}</span>
          <span style="font-weight:600;color:#fafafa">Position</span>
        </div>
        <button class="lumos-close-position" style="background:none;border:none;color:#71717a;cursor:pointer">${icons.close}</button>
      </div>
      <div style="padding:16px">
        <div class="lumos-position-type-grid">
          ${['static', 'relative', 'absolute', 'fixed', 'sticky'].map(p => `
            <button class="lumos-position-type-btn ${currentPosition === p ? 'active' : ''}" data-position="${p}">${p}</button>
          `).join('')}
        </div>
        <div style="margin-top:16px">
          <div style="font-size:11px;color:#71717a;margin-bottom:8px;text-transform:uppercase">Offsets</div>
          <div class="lumos-position-offsets">
            <div class="lumos-offset-input">
              <label>Top</label>
              <input type="text" value="${cs.top !== 'auto' ? cs.top : ''}" data-prop="top" placeholder="auto" />
            </div>
            <div class="lumos-offset-input">
              <label>Right</label>
              <input type="text" value="${cs.right !== 'auto' ? cs.right : ''}" data-prop="right" placeholder="auto" />
            </div>
            <div class="lumos-offset-input">
              <label>Bottom</label>
              <input type="text" value="${cs.bottom !== 'auto' ? cs.bottom : ''}" data-prop="bottom" placeholder="auto" />
            </div>
            <div class="lumos-offset-input">
              <label>Left</label>
              <input type="text" value="${cs.left !== 'auto' ? cs.left : ''}" data-prop="left" placeholder="auto" />
            </div>
          </div>
        </div>
        <div style="margin-top:16px">
          <div style="font-size:11px;color:#71717a;margin-bottom:8px;text-transform:uppercase">Z-Index</div>
          <input type="text" value="${cs.zIndex !== 'auto' ? cs.zIndex : ''}" data-prop="zIndex" placeholder="auto" style="width:100%;padding:8px;background:#18181b;border:1px solid #27272a;border-radius:6px;color:#fafafa" />
        </div>
      </div>
    `;

    document.body.appendChild(panel);

    panel.querySelectorAll('.lumos-position-type-btn').forEach(btn => {
      btn.onclick = () => {
        panel.querySelectorAll('.lumos-position-type-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        applyStyle(selectedElement, 'position', btn.dataset.position);
      };
    });

    panel.querySelectorAll('.lumos-offset-input input, input[data-prop="zIndex"]').forEach(input => {
      input.onchange = () => {
        const prop = input.dataset.prop;
        const value = input.value || 'auto';
        applyStyle(selectedElement, prop, value);
      };
    });

    panel.querySelector('.lumos-close-position').onclick = () => panel.remove();
  }

  // ============================================
  // BORDER EDITOR
  // ============================================
  function openBorderEditor() {
    if (!selectedElement) {
      showToast('Select an element first', 'warning');
      return;
    }

    document.querySelector('.lumos-border-editor')?.remove();
    const cs = getComputedStyle(selectedElement);

    const panel = document.createElement('div');
    panel.className = 'lumos-border-editor lumos-ui';
    panel.innerHTML = `
      <div style="padding:16px;border-bottom:1px solid #27272a;display:flex;align-items:center;justify-content:space-between">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="color:#8b5cf6">${icons.square}</span>
          <span style="font-weight:600;color:#fafafa">Border</span>
        </div>
        <button class="lumos-close-border" style="background:none;border:none;color:#71717a;cursor:pointer">${icons.close}</button>
      </div>
      <div style="padding:16px">
        <div class="lumos-border-sides">
          <button class="lumos-border-side-btn active" data-side="all">All</button>
          <button class="lumos-border-side-btn" data-side="top">Top</button>
          <button class="lumos-border-side-btn" data-side="right">Right</button>
          <button class="lumos-border-side-btn" data-side="bottom">Bottom</button>
          <button class="lumos-border-side-btn" data-side="left">Left</button>
        </div>
        <div class="lumos-border-preview-box" style="border:${cs.border}">Preview</div>
        <div style="margin-bottom:16px">
          <div style="font-size:11px;color:#71717a;margin-bottom:8px">Width</div>
          <input type="range" min="0" max="20" value="${parseInt(cs.borderWidth) || 0}" class="lumos-border-width" style="width:100%;accent-color:#8b5cf6" />
          <div style="display:flex;justify-content:space-between;font-size:10px;color:#71717a;margin-top:4px">
            <span>0px</span>
            <span class="lumos-border-width-value">${parseInt(cs.borderWidth) || 0}px</span>
            <span>20px</span>
          </div>
        </div>
        <div style="margin-bottom:16px">
          <div style="font-size:11px;color:#71717a;margin-bottom:8px">Style</div>
          <div class="lumos-border-style-grid">
            ${['none', 'solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset'].map(s => `
              <button class="lumos-border-style-btn ${cs.borderStyle === s ? 'active' : ''}" data-style="${s}">${s}</button>
            `).join('')}
          </div>
        </div>
        <div style="margin-bottom:16px">
          <div style="font-size:11px;color:#71717a;margin-bottom:8px">Color</div>
          <div style="display:flex;gap:8px;align-items:center">
            <input type="color" value="${rgbToHex(cs.borderColor) || '#000000'}" class="lumos-border-color" style="width:40px;height:32px;border:none;border-radius:4px;cursor:pointer" />
            <input type="text" value="${rgbToHex(cs.borderColor) || '#000000'}" class="lumos-border-color-text" style="flex:1;padding:8px;background:#18181b;border:1px solid #27272a;border-radius:6px;color:#fafafa;font-size:12px" />
          </div>
        </div>
        <div>
          <div style="font-size:11px;color:#71717a;margin-bottom:8px">Radius</div>
          <input type="range" min="0" max="50" value="${parseInt(cs.borderRadius) || 0}" class="lumos-border-radius" style="width:100%;accent-color:#8b5cf6" />
          <div style="display:flex;justify-content:space-between;font-size:10px;color:#71717a;margin-top:4px">
            <span>0px</span>
            <span class="lumos-border-radius-value">${parseInt(cs.borderRadius) || 0}px</span>
            <span>50px</span>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(panel);

    let activeSide = 'all';
    const preview = panel.querySelector('.lumos-border-preview-box');

    function updateBorder() {
      const width = panel.querySelector('.lumos-border-width').value + 'px';
      const style = panel.querySelector('.lumos-border-style-btn.active')?.dataset.style || 'solid';
      const color = panel.querySelector('.lumos-border-color').value;
      const radius = panel.querySelector('.lumos-border-radius').value + 'px';

      panel.querySelector('.lumos-border-width-value').textContent = width;
      panel.querySelector('.lumos-border-radius-value').textContent = radius;

      if (activeSide === 'all') {
        applyStyle(selectedElement, 'border', `${width} ${style} ${color}`);
        preview.style.border = `${width} ${style} ${color}`;
      } else {
        const prop = `border${activeSide.charAt(0).toUpperCase() + activeSide.slice(1)}`;
        applyStyle(selectedElement, prop, `${width} ${style} ${color}`);
        preview.style[prop] = `${width} ${style} ${color}`;
      }

      applyStyle(selectedElement, 'borderRadius', radius);
      preview.style.borderRadius = radius;
    }

    panel.querySelectorAll('.lumos-border-side-btn').forEach(btn => {
      btn.onclick = () => {
        panel.querySelectorAll('.lumos-border-side-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeSide = btn.dataset.side;
      };
    });

    panel.querySelectorAll('.lumos-border-style-btn').forEach(btn => {
      btn.onclick = () => {
        panel.querySelectorAll('.lumos-border-style-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        updateBorder();
      };
    });

    panel.querySelector('.lumos-border-width').oninput = updateBorder;
    panel.querySelector('.lumos-border-radius').oninput = updateBorder;
    panel.querySelector('.lumos-border-color').oninput = (e) => {
      panel.querySelector('.lumos-border-color-text').value = e.target.value;
      updateBorder();
    };
    panel.querySelector('.lumos-border-color-text').onchange = (e) => {
      panel.querySelector('.lumos-border-color').value = e.target.value;
      updateBorder();
    };

    panel.querySelector('.lumos-close-border').onclick = () => panel.remove();
  }

  // ============================================
  // CURSOR PICKER
  // ============================================
  function openCursorPicker() {
    if (!selectedElement) {
      showToast('Select an element first', 'warning');
      return;
    }

    document.querySelector('.lumos-cursor-picker')?.remove();
    const cs = getComputedStyle(selectedElement);
    const currentCursor = cs.cursor || 'auto';

    const cursors = [
      'auto', 'default', 'pointer', 'wait', 'text', 'move', 'help', 'not-allowed',
      'crosshair', 'grab', 'grabbing', 'zoom-in', 'zoom-out', 'copy', 'alias',
      'cell', 'context-menu', 'progress', 'col-resize', 'row-resize',
      'n-resize', 's-resize', 'e-resize', 'w-resize', 'ne-resize', 'nw-resize',
      'se-resize', 'sw-resize', 'ew-resize', 'ns-resize', 'nesw-resize', 'nwse-resize',
      'all-scroll', 'no-drop', 'vertical-text', 'none'
    ];

    const panel = document.createElement('div');
    panel.className = 'lumos-cursor-picker lumos-ui';
    panel.innerHTML = `
      <div style="padding:16px;border-bottom:1px solid #27272a;display:flex;align-items:center;justify-content:space-between">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="color:#8b5cf6">${icons.mousePointer}</span>
          <span style="font-weight:600;color:#fafafa">Cursor</span>
        </div>
        <button class="lumos-close-cursor" style="background:none;border:none;color:#71717a;cursor:pointer">${icons.close}</button>
      </div>
      <div style="padding:16px">
        <div class="lumos-cursor-preview" style="cursor:${currentCursor}">
          <span style="color:#71717a;font-size:10px">${currentCursor}</span>
        </div>
        <div class="lumos-cursor-grid">
          ${cursors.map(c => `
            <button class="lumos-cursor-btn ${currentCursor === c ? 'active' : ''}" data-cursor="${c}" style="cursor:${c}">${c}</button>
          `).join('')}
        </div>
      </div>
    `;

    document.body.appendChild(panel);

    const preview = panel.querySelector('.lumos-cursor-preview');

    panel.querySelectorAll('.lumos-cursor-btn').forEach(btn => {
      btn.onclick = () => {
        panel.querySelectorAll('.lumos-cursor-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const cursor = btn.dataset.cursor;
        preview.style.cursor = cursor;
        preview.querySelector('span').textContent = cursor;
        applyStyle(selectedElement, 'cursor', cursor);
      };
    });

    panel.querySelector('.lumos-close-cursor').onclick = () => panel.remove();
  }

  // ============================================
  // OVERFLOW EDITOR
  // ============================================
  function openOverflowEditor() {
    if (!selectedElement) {
      showToast('Select an element first', 'warning');
      return;
    }

    document.querySelector('.lumos-overflow-editor')?.remove();
    const cs = getComputedStyle(selectedElement);

    const panel = document.createElement('div');
    panel.className = 'lumos-overflow-editor lumos-ui';
    panel.innerHTML = `
      <div style="padding:16px;border-bottom:1px solid #27272a;display:flex;align-items:center;justify-content:space-between">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="color:#8b5cf6">${icons.scrollIcon}</span>
          <span style="font-weight:600;color:#fafafa">Overflow</span>
        </div>
        <button class="lumos-close-overflow" style="background:none;border:none;color:#71717a;cursor:pointer">${icons.close}</button>
      </div>
      <div style="padding:16px">
        <div class="lumos-overflow-axis">
          <div class="lumos-overflow-axis-label">Overflow X</div>
          <div class="lumos-overflow-options">
            ${['visible', 'hidden', 'scroll', 'auto'].map(o => `
              <button class="lumos-overflow-btn ${cs.overflowX === o ? 'active' : ''}" data-axis="x" data-value="${o}">${o}</button>
            `).join('')}
          </div>
        </div>
        <div class="lumos-overflow-axis">
          <div class="lumos-overflow-axis-label">Overflow Y</div>
          <div class="lumos-overflow-options">
            ${['visible', 'hidden', 'scroll', 'auto'].map(o => `
              <button class="lumos-overflow-btn ${cs.overflowY === o ? 'active' : ''}" data-axis="y" data-value="${o}">${o}</button>
            `).join('')}
          </div>
        </div>
        <div class="lumos-overflow-axis" style="margin-bottom:0">
          <div class="lumos-overflow-axis-label">Both Axes</div>
          <div class="lumos-overflow-options">
            ${['visible', 'hidden', 'scroll', 'auto', 'clip'].map(o => `
              <button class="lumos-overflow-btn" data-axis="both" data-value="${o}">${o}</button>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(panel);

    panel.querySelectorAll('.lumos-overflow-btn').forEach(btn => {
      btn.onclick = () => {
        const axis = btn.dataset.axis;
        const value = btn.dataset.value;

        if (axis === 'both') {
          panel.querySelectorAll('.lumos-overflow-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          applyStyle(selectedElement, 'overflow', value);
        } else {
          panel.querySelectorAll(`.lumos-overflow-btn[data-axis="${axis}"]`).forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const prop = axis === 'x' ? 'overflowX' : 'overflowY';
          applyStyle(selectedElement, prop, value);
        }
      };
    });

    panel.querySelector('.lumos-close-overflow').onclick = () => panel.remove();
  }

  // ============================================
  // DISPLAY EDITOR
  // ============================================
  function openDisplayEditor() {
    if (!selectedElement) {
      showToast('Select an element first', 'warning');
      return;
    }

    document.querySelector('.lumos-display-editor')?.remove();
    const cs = getComputedStyle(selectedElement);

    const displayOptions = [
      { value: 'block', icon: '▮', label: 'Block' },
      { value: 'inline', icon: '─', label: 'Inline' },
      { value: 'inline-block', icon: '▯', label: 'Inline Block' },
      { value: 'flex', icon: '⟷', label: 'Flex' },
      { value: 'inline-flex', icon: '↔', label: 'Inline Flex' },
      { value: 'grid', icon: '▦', label: 'Grid' },
      { value: 'inline-grid', icon: '⊞', label: 'Inline Grid' },
      { value: 'none', icon: '∅', label: 'None' },
      { value: 'contents', icon: '◇', label: 'Contents' }
    ];

    const visibilityOptions = [
      { value: 'visible', label: 'Visible' },
      { value: 'hidden', label: 'Hidden' },
      { value: 'collapse', label: 'Collapse' }
    ];

    const panel = document.createElement('div');
    panel.className = 'lumos-display-editor lumos-ui';
    panel.innerHTML = `
      <div style="padding:16px;border-bottom:1px solid #27272a;display:flex;align-items:center;justify-content:space-between">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="color:#8b5cf6">${icons.eye}</span>
          <span style="font-weight:600;color:#fafafa">Display & Visibility</span>
        </div>
        <button class="lumos-close-display" style="background:none;border:none;color:#71717a;cursor:pointer">${icons.close}</button>
      </div>
      <div style="padding:16px">
        <div style="font-size:11px;color:#71717a;margin-bottom:8px;text-transform:uppercase">Display</div>
        <div class="lumos-display-grid">
          ${displayOptions.map(d => `
            <button class="lumos-display-btn ${cs.display === d.value ? 'active' : ''}" data-value="${d.value}">
              <div class="lumos-display-btn-icon">${d.icon}</div>
              ${d.label}
            </button>
          `).join('')}
        </div>
        <div style="font-size:11px;color:#71717a;margin:16px 0 8px;text-transform:uppercase">Visibility</div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
          ${visibilityOptions.map(v => `
            <button class="lumos-display-btn lumos-visibility-btn ${cs.visibility === v.value ? 'active' : ''}" data-value="${v.value}">${v.label}</button>
          `).join('')}
        </div>
        <div style="font-size:11px;color:#71717a;margin:16px 0 8px;text-transform:uppercase">Opacity</div>
        <div style="display:flex;align-items:center;gap:12px">
          <input type="range" min="0" max="100" value="${parseFloat(cs.opacity) * 100}" class="lumos-opacity-slider" style="flex:1;accent-color:#8b5cf6" />
          <span class="lumos-opacity-value" style="font-size:12px;color:#fafafa;width:40px">${Math.round(parseFloat(cs.opacity) * 100)}%</span>
        </div>
      </div>
    `;

    document.body.appendChild(panel);

    panel.querySelectorAll('.lumos-display-btn:not(.lumos-visibility-btn)').forEach(btn => {
      btn.onclick = () => {
        panel.querySelectorAll('.lumos-display-btn:not(.lumos-visibility-btn)').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        applyStyle(selectedElement, 'display', btn.dataset.value);
      };
    });

    panel.querySelectorAll('.lumos-visibility-btn').forEach(btn => {
      btn.onclick = () => {
        panel.querySelectorAll('.lumos-visibility-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        applyStyle(selectedElement, 'visibility', btn.dataset.value);
      };
    });

    panel.querySelector('.lumos-opacity-slider').oninput = (e) => {
      const value = e.target.value / 100;
      panel.querySelector('.lumos-opacity-value').textContent = `${e.target.value}%`;
      applyStyle(selectedElement, 'opacity', value);
    };

    panel.querySelector('.lumos-close-display').onclick = () => panel.remove();
  }

  // ============================================
  // FLEX ITEM EDITOR
  // ============================================
  function openFlexItemEditor() {
    if (!selectedElement) {
      showToast('Select an element first', 'warning');
      return;
    }

    const parent = selectedElement.parentElement;
    const parentDisplay = getComputedStyle(parent).display;
    if (!parentDisplay.includes('flex')) {
      showToast('Parent must be a flex container', 'warning');
      return;
    }

    document.querySelector('.lumos-flex-item-editor')?.remove();
    const cs = getComputedStyle(selectedElement);

    const alignOptions = ['auto', 'flex-start', 'center', 'flex-end', 'stretch', 'baseline'];

    const panel = document.createElement('div');
    panel.className = 'lumos-flex-item-editor lumos-ui';
    panel.innerHTML = `
      <div style="padding:16px;border-bottom:1px solid #27272a;display:flex;align-items:center;justify-content:space-between">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="color:#8b5cf6">${icons.flexGrow}</span>
          <span style="font-weight:600;color:#fafafa">Flex Item</span>
        </div>
        <button class="lumos-close-flex" style="background:none;border:none;color:#71717a;cursor:pointer">${icons.close}</button>
      </div>
      <div style="padding:16px">
        <div class="lumos-flex-row">
          <label>Flex Grow</label>
          <input type="number" min="0" value="${cs.flexGrow}" data-prop="flexGrow" />
        </div>
        <div class="lumos-flex-row">
          <label>Flex Shrink</label>
          <input type="number" min="0" value="${cs.flexShrink}" data-prop="flexShrink" />
        </div>
        <div class="lumos-flex-row">
          <label>Flex Basis</label>
          <input type="text" value="${cs.flexBasis}" data-prop="flexBasis" placeholder="auto" />
        </div>
        <div class="lumos-flex-row">
          <label>Order</label>
          <input type="number" value="${cs.order}" data-prop="order" />
        </div>
        <div class="lumos-flex-row" style="flex-direction:column;align-items:stretch">
          <label style="width:auto;margin-bottom:8px">Align Self</label>
          <div class="lumos-flex-align-grid">
            ${alignOptions.map(a => `
              <button class="lumos-flex-align-btn ${cs.alignSelf === a ? 'active' : ''}" data-value="${a}">${a.replace('flex-', '')}</button>
            `).join('')}
          </div>
        </div>
        <div style="display:flex;gap:8px;margin-top:16px;padding-top:16px;border-top:1px solid #27272a">
          <button class="lumos-flex-preset" data-preset="grow" style="flex:1;padding:10px;background:#27272a;border:none;border-radius:6px;color:#fafafa;cursor:pointer;font-size:11px">Grow</button>
          <button class="lumos-flex-preset" data-preset="shrink" style="flex:1;padding:10px;background:#27272a;border:none;border-radius:6px;color:#fafafa;cursor:pointer;font-size:11px">Shrink</button>
          <button class="lumos-flex-preset" data-preset="none" style="flex:1;padding:10px;background:#27272a;border:none;border-radius:6px;color:#fafafa;cursor:pointer;font-size:11px">None</button>
          <button class="lumos-flex-preset" data-preset="auto" style="flex:1;padding:10px;background:#27272a;border:none;border-radius:6px;color:#fafafa;cursor:pointer;font-size:11px">Auto</button>
        </div>
      </div>
    `;

    document.body.appendChild(panel);

    panel.querySelectorAll('input').forEach(input => {
      input.onchange = () => {
        applyStyle(selectedElement, input.dataset.prop, input.value);
      };
    });

    panel.querySelectorAll('.lumos-flex-align-btn').forEach(btn => {
      btn.onclick = () => {
        panel.querySelectorAll('.lumos-flex-align-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        applyStyle(selectedElement, 'alignSelf', btn.dataset.value);
      };
    });

    panel.querySelectorAll('.lumos-flex-preset').forEach(btn => {
      btn.onclick = () => {
        const preset = btn.dataset.preset;
        const presets = {
          grow: { flexGrow: 1, flexShrink: 1, flexBasis: '0%' },
          shrink: { flexGrow: 0, flexShrink: 1, flexBasis: 'auto' },
          none: { flexGrow: 0, flexShrink: 0, flexBasis: 'auto' },
          auto: { flexGrow: 1, flexShrink: 1, flexBasis: 'auto' }
        };
        Object.entries(presets[preset]).forEach(([prop, value]) => {
          applyStyle(selectedElement, prop, value);
          const input = panel.querySelector(`input[data-prop="${prop}"]`);
          if (input) input.value = value;
        });
        showToast(`Applied flex: ${preset}`, 'success');
      };
    });

    panel.querySelector('.lumos-close-flex').onclick = () => panel.remove();
  }

  // ============================================
  // ASPECT RATIO EDITOR
  // ============================================
  function openAspectRatioEditor() {
    if (!selectedElement) {
      showToast('Select an element first', 'warning');
      return;
    }

    document.querySelector('.lumos-aspect-editor')?.remove();
    const cs = getComputedStyle(selectedElement);
    const currentRatio = cs.aspectRatio || 'auto';

    const presets = [
      { ratio: '1/1', label: 'Square', w: 40, h: 40 },
      { ratio: '4/3', label: '4:3', w: 48, h: 36 },
      { ratio: '16/9', label: '16:9', w: 48, h: 27 },
      { ratio: '21/9', label: '21:9', w: 56, h: 24 },
      { ratio: '3/2', label: '3:2', w: 48, h: 32 },
      { ratio: '2/3', label: '2:3', w: 32, h: 48 },
      { ratio: '9/16', label: '9:16', w: 27, h: 48 },
      { ratio: '3/4', label: '3:4', w: 36, h: 48 },
      { ratio: 'auto', label: 'Auto', w: 40, h: 40 }
    ];

    const panel = document.createElement('div');
    panel.className = 'lumos-aspect-editor lumos-ui';
    panel.innerHTML = `
      <div style="padding:16px;border-bottom:1px solid #27272a;display:flex;align-items:center;justify-content:space-between">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="color:#8b5cf6">${icons.ratio}</span>
          <span style="font-weight:600;color:#fafafa">Aspect Ratio</span>
        </div>
        <button class="lumos-close-aspect" style="background:none;border:none;color:#71717a;cursor:pointer">${icons.close}</button>
      </div>
      <div style="padding:16px">
        <div class="lumos-aspect-presets">
          ${presets.map(p => `
            <div class="lumos-aspect-preset ${currentRatio === p.ratio ? 'active' : ''}" data-ratio="${p.ratio}">
              <div class="lumos-aspect-preset-box" style="width:${p.w}px;height:${p.h}px"></div>
              <div class="lumos-aspect-preset-label">${p.label}</div>
            </div>
          `).join('')}
        </div>
        <div class="lumos-aspect-custom">
          <span style="color:#a1a1aa;font-size:12px">Custom:</span>
          <input type="number" min="1" value="16" class="lumos-aspect-w" />
          <span>/</span>
          <input type="number" min="1" value="9" class="lumos-aspect-h" />
          <button class="lumos-apply-custom-ratio" style="padding:8px 16px;background:#8b5cf6;border:none;border-radius:6px;color:white;cursor:pointer;font-size:11px">Apply</button>
        </div>
      </div>
    `;

    document.body.appendChild(panel);

    panel.querySelectorAll('.lumos-aspect-preset').forEach(preset => {
      preset.onclick = () => {
        panel.querySelectorAll('.lumos-aspect-preset').forEach(p => p.classList.remove('active'));
        preset.classList.add('active');
        applyStyle(selectedElement, 'aspectRatio', preset.dataset.ratio);
      };
    });

    panel.querySelector('.lumos-apply-custom-ratio').onclick = () => {
      const w = panel.querySelector('.lumos-aspect-w').value;
      const h = panel.querySelector('.lumos-aspect-h').value;
      const ratio = `${w}/${h}`;
      panel.querySelectorAll('.lumos-aspect-preset').forEach(p => p.classList.remove('active'));
      applyStyle(selectedElement, 'aspectRatio', ratio);
      showToast(`Applied aspect ratio: ${ratio}`, 'success');
    };

    panel.querySelector('.lumos-close-aspect').onclick = () => panel.remove();
  }

  // ============================================
  // BACKGROUND EDITOR
  // ============================================
  function openBackgroundEditor() {
    if (!selectedElement) {
      showToast('Select an element first', 'warning');
      return;
    }

    document.querySelector('.lumos-background-editor')?.remove();
    const cs = getComputedStyle(selectedElement);

    const panel = document.createElement('div');
    panel.className = 'lumos-background-editor lumos-ui';
    panel.innerHTML = `
      <div style="padding:16px;border-bottom:1px solid #27272a;display:flex;align-items:center;justify-content:space-between">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="color:#8b5cf6">${icons.image}</span>
          <span style="font-weight:600;color:#fafafa">Background</span>
        </div>
        <button class="lumos-close-bg" style="background:none;border:none;color:#71717a;cursor:pointer">${icons.close}</button>
      </div>
      <div class="lumos-bg-tabs">
        <button class="lumos-bg-tab active" data-tab="color">Color</button>
        <button class="lumos-bg-tab" data-tab="gradient">Gradient</button>
        <button class="lumos-bg-tab" data-tab="image">Image</button>
      </div>
      <div class="lumos-bg-content" data-active-tab="color">
        <div class="lumos-bg-preview" style="background:${cs.backgroundColor}"></div>

        <!-- Color Tab -->
        <div class="lumos-bg-color-content">
          <div style="display:flex;gap:8px;align-items:center">
            <input type="color" value="${rgbToHex(cs.backgroundColor) || '#ffffff'}" class="lumos-bg-color-picker" style="width:50px;height:40px;border:none;border-radius:6px;cursor:pointer" />
            <input type="text" value="${rgbToHex(cs.backgroundColor) || '#ffffff'}" class="lumos-bg-color-text" style="flex:1;padding:10px;background:#18181b;border:1px solid #27272a;border-radius:6px;color:#fafafa;font-size:12px" />
          </div>
          <div style="margin-top:12px">
            <div style="font-size:10px;color:#71717a;margin-bottom:8px">QUICK COLORS</div>
            <div style="display:flex;flex-wrap:wrap;gap:6px">
              ${['#ffffff', '#000000', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', 'transparent'].map(c => `
                <div class="lumos-quick-bg-color" data-color="${c}" style="width:28px;height:28px;background:${c};border:1px solid #27272a;border-radius:4px;cursor:pointer;${c === 'transparent' ? 'background-image:linear-gradient(45deg,#ccc 25%,transparent 25%),linear-gradient(-45deg,#ccc 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#ccc 75%),linear-gradient(-45deg,transparent 75%,#ccc 75%);background-size:8px 8px;background-position:0 0,0 4px,4px -4px,-4px 0' : ''}"></div>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- Gradient Tab -->
        <div class="lumos-bg-gradient-content" style="display:none">
          <div style="margin-bottom:12px">
            <div style="font-size:10px;color:#71717a;margin-bottom:8px">TYPE</div>
            <div style="display:flex;gap:6px">
              <button class="lumos-gradient-type-btn active" data-type="linear" style="flex:1;padding:8px;background:#27272a;border:1px solid #3f3f46;border-radius:6px;color:#fafafa;cursor:pointer;font-size:11px">Linear</button>
              <button class="lumos-gradient-type-btn" data-type="radial" style="flex:1;padding:8px;background:#18181b;border:1px solid #27272a;border-radius:6px;color:#a1a1aa;cursor:pointer;font-size:11px">Radial</button>
            </div>
          </div>
          <div style="margin-bottom:12px">
            <div style="font-size:10px;color:#71717a;margin-bottom:8px">ANGLE</div>
            <div style="display:flex;align-items:center;gap:8px">
              <input type="range" min="0" max="360" value="135" class="lumos-gradient-angle" style="flex:1;accent-color:#8b5cf6" />
              <span class="lumos-gradient-angle-value" style="font-size:11px;color:#fafafa;width:40px">135°</span>
            </div>
          </div>
          <div style="margin-bottom:12px">
            <div style="font-size:10px;color:#71717a;margin-bottom:8px">COLORS</div>
            <div style="display:flex;gap:8px">
              <input type="color" value="#3b82f6" class="lumos-gradient-color-1" style="width:50px;height:36px;border:none;border-radius:4px;cursor:pointer" />
              <input type="color" value="#8b5cf6" class="lumos-gradient-color-2" style="width:50px;height:36px;border:none;border-radius:4px;cursor:pointer" />
            </div>
          </div>
          <button class="lumos-apply-gradient" style="width:100%;padding:10px;background:#8b5cf6;border:none;border-radius:6px;color:white;cursor:pointer;font-size:12px">Apply Gradient</button>
        </div>

        <!-- Image Tab -->
        <div class="lumos-bg-image-content" style="display:none">
          <div style="margin-bottom:12px">
            <div style="font-size:10px;color:#71717a;margin-bottom:8px">IMAGE URL</div>
            <input type="text" class="lumos-bg-url-input" placeholder="https://example.com/image.jpg" />
          </div>
          <div style="margin-bottom:12px">
            <div style="font-size:10px;color:#71717a;margin-bottom:8px">SIZE</div>
            <div class="lumos-bg-size-grid">
              ${['cover', 'contain', 'auto', '100% 100%', '50%', 'repeat'].map(s => `
                <button class="lumos-bg-size-btn ${cs.backgroundSize === s ? 'active' : ''}" data-size="${s}">${s}</button>
              `).join('')}
            </div>
          </div>
          <div>
            <div style="font-size:10px;color:#71717a;margin-bottom:8px">POSITION</div>
            <div class="lumos-bg-position-grid">
              ${['↖', '↑', '↗', '←', '•', '→', '↙', '↓', '↘'].map((icon, i) => {
                const positions = ['top left', 'top center', 'top right', 'center left', 'center center', 'center right', 'bottom left', 'bottom center', 'bottom right'];
                return `<button class="lumos-bg-position-btn" data-position="${positions[i]}">${icon}</button>`;
              }).join('')}
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(panel);

    const preview = panel.querySelector('.lumos-bg-preview');

    // Tab switching
    panel.querySelectorAll('.lumos-bg-tab').forEach(tab => {
      tab.onclick = () => {
        panel.querySelectorAll('.lumos-bg-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const activeTab = tab.dataset.tab;
        panel.querySelector('.lumos-bg-color-content').style.display = activeTab === 'color' ? 'block' : 'none';
        panel.querySelector('.lumos-bg-gradient-content').style.display = activeTab === 'gradient' ? 'block' : 'none';
        panel.querySelector('.lumos-bg-image-content').style.display = activeTab === 'image' ? 'block' : 'none';
      };
    });

    // Color tab
    panel.querySelector('.lumos-bg-color-picker').oninput = (e) => {
      const color = e.target.value;
      panel.querySelector('.lumos-bg-color-text').value = color;
      preview.style.background = color;
      applyStyle(selectedElement, 'backgroundColor', color);
    };

    panel.querySelector('.lumos-bg-color-text').onchange = (e) => {
      const color = e.target.value;
      panel.querySelector('.lumos-bg-color-picker').value = color;
      preview.style.background = color;
      applyStyle(selectedElement, 'backgroundColor', color);
    };

    panel.querySelectorAll('.lumos-quick-bg-color').forEach(btn => {
      btn.onclick = () => {
        const color = btn.dataset.color;
        panel.querySelector('.lumos-bg-color-picker').value = color === 'transparent' ? '#ffffff' : color;
        panel.querySelector('.lumos-bg-color-text').value = color;
        preview.style.background = color;
        applyStyle(selectedElement, 'backgroundColor', color);
      };
    });

    // Gradient tab
    function updateGradientPreview() {
      const type = panel.querySelector('.lumos-gradient-type-btn.active').dataset.type;
      const angle = panel.querySelector('.lumos-gradient-angle').value;
      const color1 = panel.querySelector('.lumos-gradient-color-1').value;
      const color2 = panel.querySelector('.lumos-gradient-color-2').value;
      const gradient = type === 'linear'
        ? `linear-gradient(${angle}deg, ${color1}, ${color2})`
        : `radial-gradient(circle, ${color1}, ${color2})`;
      preview.style.background = gradient;
    }

    panel.querySelectorAll('.lumos-gradient-type-btn').forEach(btn => {
      btn.onclick = () => {
        panel.querySelectorAll('.lumos-gradient-type-btn').forEach(b => {
          b.classList.remove('active');
          b.style.background = '#18181b';
          b.style.borderColor = '#27272a';
          b.style.color = '#a1a1aa';
        });
        btn.classList.add('active');
        btn.style.background = '#27272a';
        btn.style.borderColor = '#3f3f46';
        btn.style.color = '#fafafa';
        updateGradientPreview();
      };
    });

    panel.querySelector('.lumos-gradient-angle').oninput = (e) => {
      panel.querySelector('.lumos-gradient-angle-value').textContent = `${e.target.value}°`;
      updateGradientPreview();
    };

    panel.querySelectorAll('.lumos-gradient-color-1, .lumos-gradient-color-2').forEach(input => {
      input.oninput = updateGradientPreview;
    });

    panel.querySelector('.lumos-apply-gradient').onclick = () => {
      const type = panel.querySelector('.lumos-gradient-type-btn.active').dataset.type;
      const angle = panel.querySelector('.lumos-gradient-angle').value;
      const color1 = panel.querySelector('.lumos-gradient-color-1').value;
      const color2 = panel.querySelector('.lumos-gradient-color-2').value;
      const gradient = type === 'linear'
        ? `linear-gradient(${angle}deg, ${color1}, ${color2})`
        : `radial-gradient(circle, ${color1}, ${color2})`;
      applyStyle(selectedElement, 'background', gradient);
      showToast('Gradient applied', 'success');
    };

    // Image tab
    panel.querySelector('.lumos-bg-url-input').onchange = (e) => {
      const url = e.target.value;
      if (url) {
        preview.style.backgroundImage = `url(${url})`;
        applyStyle(selectedElement, 'backgroundImage', `url(${url})`);
      }
    };

    panel.querySelectorAll('.lumos-bg-size-btn').forEach(btn => {
      btn.onclick = () => {
        panel.querySelectorAll('.lumos-bg-size-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const size = btn.dataset.size;
        if (size === 'repeat') {
          applyStyle(selectedElement, 'backgroundRepeat', 'repeat');
          applyStyle(selectedElement, 'backgroundSize', 'auto');
        } else {
          applyStyle(selectedElement, 'backgroundRepeat', 'no-repeat');
          applyStyle(selectedElement, 'backgroundSize', size);
        }
        preview.style.backgroundSize = size === 'repeat' ? 'auto' : size;
      };
    });

    panel.querySelectorAll('.lumos-bg-position-btn').forEach(btn => {
      btn.onclick = () => {
        panel.querySelectorAll('.lumos-bg-position-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const position = btn.dataset.position;
        applyStyle(selectedElement, 'backgroundPosition', position);
        preview.style.backgroundPosition = position;
      };
    });

    panel.querySelector('.lumos-close-bg').onclick = () => panel.remove();
  }

  // ============================================
  // OUTLINE EDITOR
  // ============================================
  function openOutlineEditor() {
    if (!selectedElement) {
      showToast('Select an element first', 'warning');
      return;
    }

    document.querySelector('.lumos-outline-editor')?.remove();
    const cs = getComputedStyle(selectedElement);

    const panel = document.createElement('div');
    panel.className = 'lumos-outline-editor lumos-ui';
    panel.innerHTML = `
      <div style="padding:16px;border-bottom:1px solid #27272a;display:flex;align-items:center;justify-content:space-between">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="color:#8b5cf6">${icons.outlineIcon}</span>
          <span style="font-weight:600;color:#fafafa">Outline</span>
        </div>
        <button class="lumos-close-outline" style="background:none;border:none;color:#71717a;cursor:pointer">${icons.close}</button>
      </div>
      <div style="padding:16px">
        <div class="lumos-outline-preview" style="outline:${cs.outline}">Preview</div>
        <div style="margin-bottom:16px">
          <div style="font-size:11px;color:#71717a;margin-bottom:8px">Width</div>
          <input type="range" min="0" max="10" value="${parseInt(cs.outlineWidth) || 0}" class="lumos-outline-width" style="width:100%;accent-color:#8b5cf6" />
          <div style="display:flex;justify-content:space-between;font-size:10px;color:#71717a;margin-top:4px">
            <span>0px</span><span class="lumos-outline-width-val">${parseInt(cs.outlineWidth) || 0}px</span><span>10px</span>
          </div>
        </div>
        <div style="margin-bottom:16px">
          <div style="font-size:11px;color:#71717a;margin-bottom:8px">Style</div>
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px">
            ${['none', 'solid', 'dashed', 'dotted', 'double'].map(s => `
              <button class="lumos-outline-style-btn" data-style="${s}" style="padding:8px;background:${cs.outlineStyle === s ? '#8b5cf6' : '#18181b'};border:1px solid ${cs.outlineStyle === s ? '#8b5cf6' : '#27272a'};border-radius:6px;color:${cs.outlineStyle === s ? 'white' : '#a1a1aa'};font-size:10px;cursor:pointer">${s}</button>
            `).join('')}
          </div>
        </div>
        <div style="margin-bottom:16px">
          <div style="font-size:11px;color:#71717a;margin-bottom:8px">Color</div>
          <div style="display:flex;gap:8px;align-items:center">
            <input type="color" value="${rgbToHex(cs.outlineColor) || '#000000'}" class="lumos-outline-color" style="width:40px;height:32px;border:none;border-radius:4px;cursor:pointer" />
            <input type="text" value="${rgbToHex(cs.outlineColor) || '#000000'}" class="lumos-outline-color-text" style="flex:1;padding:8px;background:#18181b;border:1px solid #27272a;border-radius:6px;color:#fafafa;font-size:12px" />
          </div>
        </div>
        <div>
          <div style="font-size:11px;color:#71717a;margin-bottom:8px">Offset</div>
          <input type="range" min="0" max="20" value="${parseInt(cs.outlineOffset) || 0}" class="lumos-outline-offset" style="width:100%;accent-color:#8b5cf6" />
          <div style="display:flex;justify-content:space-between;font-size:10px;color:#71717a;margin-top:4px">
            <span>0px</span><span class="lumos-outline-offset-val">${parseInt(cs.outlineOffset) || 0}px</span><span>20px</span>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(panel);

    const preview = panel.querySelector('.lumos-outline-preview');

    function updateOutline() {
      const width = panel.querySelector('.lumos-outline-width').value + 'px';
      const style = panel.querySelector('.lumos-outline-style-btn[style*="#8b5cf6"]')?.dataset.style || 'solid';
      const color = panel.querySelector('.lumos-outline-color').value;
      const offset = panel.querySelector('.lumos-outline-offset').value + 'px';

      panel.querySelector('.lumos-outline-width-val').textContent = width;
      panel.querySelector('.lumos-outline-offset-val').textContent = offset;

      preview.style.outline = `${width} ${style} ${color}`;
      preview.style.outlineOffset = offset;

      applyStyle(selectedElement, 'outline', `${width} ${style} ${color}`);
      applyStyle(selectedElement, 'outlineOffset', offset);
    }

    panel.querySelector('.lumos-outline-width').oninput = updateOutline;
    panel.querySelector('.lumos-outline-offset').oninput = updateOutline;

    panel.querySelectorAll('.lumos-outline-style-btn').forEach(btn => {
      btn.onclick = () => {
        panel.querySelectorAll('.lumos-outline-style-btn').forEach(b => {
          b.style.background = '#18181b';
          b.style.borderColor = '#27272a';
          b.style.color = '#a1a1aa';
        });
        btn.style.background = '#8b5cf6';
        btn.style.borderColor = '#8b5cf6';
        btn.style.color = 'white';
        updateOutline();
      };
    });

    panel.querySelector('.lumos-outline-color').oninput = (e) => {
      panel.querySelector('.lumos-outline-color-text').value = e.target.value;
      updateOutline();
    };

    panel.querySelector('.lumos-close-outline').onclick = () => panel.remove();
  }

  // ============================================
  // TEXT FORMATTING TOOLBAR
  // ============================================
  function showTextToolbar() {
    if (!selectedElement) {
      showToast('Select an element first', 'warning');
      return;
    }

    document.querySelector('.lumos-text-toolbar')?.remove();
    const rect = selectedElement.getBoundingClientRect();
    const cs = getComputedStyle(selectedElement);

    const toolbar = document.createElement('div');
    toolbar.className = 'lumos-text-toolbar lumos-ui';
    toolbar.style.cssText = `left:${rect.left}px;top:${rect.top - 50}px`;

    toolbar.innerHTML = `
      <button class="lumos-text-toolbar-btn ${cs.fontWeight >= 600 ? 'active' : ''}" data-prop="fontWeight" data-on="700" data-off="400" title="Bold">B</button>
      <button class="lumos-text-toolbar-btn ${cs.fontStyle === 'italic' ? 'active' : ''}" data-prop="fontStyle" data-on="italic" data-off="normal" title="Italic" style="font-style:italic">I</button>
      <button class="lumos-text-toolbar-btn ${cs.textDecoration.includes('underline') ? 'active' : ''}" data-prop="textDecoration" data-on="underline" data-off="none" title="Underline" style="text-decoration:underline">U</button>
      <button class="lumos-text-toolbar-btn ${cs.textDecoration.includes('line-through') ? 'active' : ''}" data-prop="textDecoration" data-on="line-through" data-off="none" title="Strikethrough" style="text-decoration:line-through">S</button>
      <div class="lumos-text-toolbar-divider"></div>
      <button class="lumos-text-toolbar-btn ${cs.textAlign === 'left' ? 'active' : ''}" data-prop="textAlign" data-value="left" title="Align Left">⫷</button>
      <button class="lumos-text-toolbar-btn ${cs.textAlign === 'center' ? 'active' : ''}" data-prop="textAlign" data-value="center" title="Align Center">≡</button>
      <button class="lumos-text-toolbar-btn ${cs.textAlign === 'right' ? 'active' : ''}" data-prop="textAlign" data-value="right" title="Align Right">⫸</button>
      <div class="lumos-text-toolbar-divider"></div>
      <button class="lumos-text-toolbar-btn ${cs.textTransform === 'uppercase' ? 'active' : ''}" data-prop="textTransform" data-on="uppercase" data-off="none" title="Uppercase">AA</button>
      <button class="lumos-text-toolbar-btn ${cs.textTransform === 'capitalize' ? 'active' : ''}" data-prop="textTransform" data-on="capitalize" data-off="none" title="Capitalize">Aa</button>
    `;

    document.body.appendChild(toolbar);

    toolbar.querySelectorAll('.lumos-text-toolbar-btn').forEach(btn => {
      btn.onclick = () => {
        const prop = btn.dataset.prop;
        if (btn.dataset.value) {
          // Alignment buttons
          toolbar.querySelectorAll(`[data-prop="${prop}"]`).forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          applyStyle(selectedElement, prop, btn.dataset.value);
        } else {
          // Toggle buttons
          const isActive = btn.classList.toggle('active');
          applyStyle(selectedElement, prop, isActive ? btn.dataset.on : btn.dataset.off);
        }
      };
    });

    // Close on click outside
    setTimeout(() => {
      document.addEventListener('click', function handler(e) {
        if (!toolbar.contains(e.target)) {
          toolbar.remove();
          document.removeEventListener('click', handler);
        }
      });
    }, 10);
  }

  // ============================================
  // TRANSITION PRESETS
  // ============================================
  function openTransitionPresets() {
    if (!selectedElement) {
      showToast('Select an element first', 'warning');
      return;
    }

    document.querySelector('.lumos-transition-editor')?.remove();

    const presets = [
      { name: 'Instant', value: 'none' },
      { name: 'Fast', value: 'all 0.15s ease' },
      { name: 'Normal', value: 'all 0.3s ease' },
      { name: 'Slow', value: 'all 0.5s ease' },
      { name: 'Ease In', value: 'all 0.3s ease-in' },
      { name: 'Ease Out', value: 'all 0.3s ease-out' },
      { name: 'Ease In Out', value: 'all 0.3s ease-in-out' },
      { name: 'Bounce', value: 'all 0.5s cubic-bezier(0.68,-0.55,0.265,1.55)' },
      { name: 'Elastic', value: 'all 0.6s cubic-bezier(0.68,-0.6,0.32,1.6)' },
      { name: 'Spring', value: 'all 0.4s cubic-bezier(0.175,0.885,0.32,1.275)' }
    ];

    const panel = document.createElement('div');
    panel.className = 'lumos-transition-editor lumos-ui';
    panel.innerHTML = `
      <div style="padding:16px;border-bottom:1px solid #27272a;display:flex;align-items:center;justify-content:space-between">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="color:#8b5cf6">${icons.timer}</span>
          <span style="font-weight:600;color:#fafafa">Transition Presets</span>
        </div>
        <button class="lumos-close-transition" style="background:none;border:none;color:#71717a;cursor:pointer">${icons.close}</button>
      </div>
      <div style="padding:16px">
        <div class="lumos-transition-preset-grid">
          ${presets.map(p => `
            <div class="lumos-transition-preset" data-transition="${p.value}">
              <div class="lumos-transition-preset-name">${p.name}</div>
              <div class="lumos-transition-preset-preview"></div>
            </div>
          `).join('')}
        </div>
        <div style="margin-top:16px;padding-top:16px;border-top:1px solid #27272a">
          <div style="font-size:11px;color:#71717a;margin-bottom:8px">Custom</div>
          <div style="display:flex;gap:8px">
            <input type="text" class="lumos-transition-custom" placeholder="all 0.3s ease" style="flex:1;padding:10px;background:#18181b;border:1px solid #27272a;border-radius:6px;color:#fafafa;font-size:12px" />
            <button class="lumos-apply-transition" style="padding:10px 16px;background:#8b5cf6;border:none;border-radius:6px;color:white;cursor:pointer;font-size:12px">Apply</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(panel);

    panel.querySelectorAll('.lumos-transition-preset').forEach(preset => {
      preset.onclick = () => {
        applyStyle(selectedElement, 'transition', preset.dataset.transition);
        showToast('Transition applied', 'success');
      };
    });

    panel.querySelector('.lumos-apply-transition').onclick = () => {
      const value = panel.querySelector('.lumos-transition-custom').value;
      if (value) {
        applyStyle(selectedElement, 'transition', value);
        showToast('Custom transition applied', 'success');
      }
    };

    panel.querySelector('.lumos-close-transition').onclick = () => panel.remove();
  }

  // ============================================
  // OBJECT FIT CONTROLS
  // ============================================
  function openObjectFitEditor() {
    if (!selectedElement) {
      showToast('Select an element first', 'warning');
      return;
    }

    if (!['IMG', 'VIDEO', 'CANVAS'].includes(selectedElement.tagName)) {
      showToast('Select an image or video element', 'warning');
      return;
    }

    document.querySelector('.lumos-object-fit-editor')?.remove();
    const cs = getComputedStyle(selectedElement);

    const options = ['fill', 'contain', 'cover', 'none', 'scale-down'];

    const panel = document.createElement('div');
    panel.className = 'lumos-object-fit-editor lumos-ui';
    panel.innerHTML = `
      <div style="padding:16px;border-bottom:1px solid #27272a;display:flex;align-items:center;justify-content:space-between">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="color:#8b5cf6">${icons.cropIcon}</span>
          <span style="font-weight:600;color:#fafafa">Object Fit</span>
        </div>
        <button class="lumos-close-objfit" style="background:none;border:none;color:#71717a;cursor:pointer">${icons.close}</button>
      </div>
      <div style="padding:16px">
        <div class="lumos-object-fit-grid">
          ${options.map(o => `
            <button class="lumos-object-fit-btn ${cs.objectFit === o ? 'active' : ''}" data-fit="${o}">
              <div class="lumos-object-fit-preview" style="object-fit:${o}"></div>
              ${o}
            </button>
          `).join('')}
        </div>
        <div style="margin-top:16px;padding-top:16px;border-top:1px solid #27272a">
          <div style="font-size:11px;color:#71717a;margin-bottom:8px">Object Position</div>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:4px">
            ${['top left', 'top center', 'top right', 'center left', 'center center', 'center right', 'bottom left', 'bottom center', 'bottom right'].map((pos, i) => {
              const icons = ['↖', '↑', '↗', '←', '•', '→', '↙', '↓', '↘'];
              return `<button class="lumos-obj-pos-btn" data-pos="${pos}" style="padding:10px;background:#18181b;border:1px solid #27272a;border-radius:4px;color:#71717a;font-size:14px;cursor:pointer">${icons[i]}</button>`;
            }).join('')}
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(panel);

    panel.querySelectorAll('.lumos-object-fit-btn').forEach(btn => {
      btn.onclick = () => {
        panel.querySelectorAll('.lumos-object-fit-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        applyStyle(selectedElement, 'objectFit', btn.dataset.fit);
      };
    });

    panel.querySelectorAll('.lumos-obj-pos-btn').forEach(btn => {
      btn.onclick = () => {
        applyStyle(selectedElement, 'objectPosition', btn.dataset.pos);
        showToast(`Position: ${btn.dataset.pos}`, 'success');
      };
    });

    panel.querySelector('.lumos-close-objfit').onclick = () => panel.remove();
  }

  // ============================================
  // CLIP PATH EDITOR
  // ============================================
  function openClipPathEditor() {
    if (!selectedElement) {
      showToast('Select an element first', 'warning');
      return;
    }

    document.querySelector('.lumos-clip-path-editor')?.remove();

    const shapes = [
      { name: 'None', value: 'none', shape: 'border-radius:0' },
      { name: 'Circle', value: 'circle(50% at 50% 50%)', shape: 'border-radius:50%' },
      { name: 'Ellipse', value: 'ellipse(50% 40% at 50% 50%)', shape: 'border-radius:50%/40%' },
      { name: 'Inset', value: 'inset(10%)', shape: 'border-radius:0;width:32px;height:32px;margin:4px auto' },
      { name: 'Triangle', value: 'polygon(50% 0%, 0% 100%, 100% 100%)', shape: 'clip-path:polygon(50% 0%, 0% 100%, 100% 100%)' },
      { name: 'Pentagon', value: 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)', shape: 'clip-path:polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)' },
      { name: 'Hexagon', value: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)', shape: 'clip-path:polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)' },
      { name: 'Star', value: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)', shape: 'clip-path:polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' },
      { name: 'Rhombus', value: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)', shape: 'clip-path:polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' },
      { name: 'Chevron', value: 'polygon(0% 0%, 75% 0%, 100% 50%, 75% 100%, 0% 100%, 25% 50%)', shape: 'clip-path:polygon(0% 0%, 75% 0%, 100% 50%, 75% 100%, 0% 100%, 25% 50%)' },
      { name: 'Arrow', value: 'polygon(0% 20%, 60% 20%, 60% 0%, 100% 50%, 60% 100%, 60% 80%, 0% 80%)', shape: 'clip-path:polygon(0% 20%, 60% 20%, 60% 0%, 100% 50%, 60% 100%, 60% 80%, 0% 80%)' },
      { name: 'Cross', value: 'polygon(10% 25%, 35% 25%, 35% 0%, 65% 0%, 65% 25%, 90% 25%, 90% 50%, 65% 50%, 65% 100%, 35% 100%, 35% 50%, 10% 50%)', shape: 'clip-path:polygon(10% 25%, 35% 25%, 35% 0%, 65% 0%, 65% 25%, 90% 25%, 90% 50%, 65% 50%, 65% 100%, 35% 100%, 35% 50%, 10% 50%)' }
    ];

    const panel = document.createElement('div');
    panel.className = 'lumos-clip-path-editor lumos-ui';
    panel.innerHTML = `
      <div style="padding:16px;border-bottom:1px solid #27272a;display:flex;align-items:center;justify-content:space-between">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="color:#8b5cf6">${icons.scissors}</span>
          <span style="font-weight:600;color:#fafafa">Clip Path</span>
        </div>
        <button class="lumos-close-clip" style="background:none;border:none;color:#71717a;cursor:pointer">${icons.close}</button>
      </div>
      <div style="padding:16px">
        <div class="lumos-clip-path-grid">
          ${shapes.map(s => `
            <div class="lumos-clip-path-btn" data-clip="${s.value}">
              <div class="lumos-clip-path-shape" style="${s.shape}"></div>
              <div class="lumos-clip-path-label">${s.name}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    document.body.appendChild(panel);

    panel.querySelectorAll('.lumos-clip-path-btn').forEach(btn => {
      btn.onclick = () => {
        panel.querySelectorAll('.lumos-clip-path-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        applyStyle(selectedElement, 'clipPath', btn.dataset.clip);
      };
    });

    panel.querySelector('.lumos-close-clip').onclick = () => panel.remove();
  }

  // ============================================
  // BLEND MODE PICKER
  // ============================================
  function openBlendModePicker() {
    if (!selectedElement) {
      showToast('Select an element first', 'warning');
      return;
    }

    document.querySelector('.lumos-blend-mode-editor')?.remove();
    const cs = getComputedStyle(selectedElement);
    const currentBlend = cs.mixBlendMode || 'normal';

    const blendModes = [
      'normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten',
      'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'difference',
      'exclusion', 'hue', 'saturation', 'color', 'luminosity'
    ];

    const panel = document.createElement('div');
    panel.className = 'lumos-blend-mode-editor lumos-ui';
    panel.innerHTML = `
      <div style="padding:16px;border-bottom:1px solid #27272a;display:flex;align-items:center;justify-content:space-between">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="color:#8b5cf6">${icons.blendMode}</span>
          <span style="font-weight:600;color:#fafafa">Blend Mode</span>
        </div>
        <button class="lumos-close-blend" style="background:none;border:none;color:#71717a;cursor:pointer">${icons.close}</button>
      </div>
      <div style="padding:16px">
        <div class="lumos-blend-preview">
          <div class="lumos-blend-preview-layer1"></div>
          <div class="lumos-blend-preview-layer2" style="mix-blend-mode:${currentBlend}"></div>
        </div>
        <div class="lumos-blend-mode-grid">
          ${blendModes.map(m => `
            <button class="lumos-blend-mode-btn ${currentBlend === m ? 'active' : ''}" data-blend="${m}">${m}</button>
          `).join('')}
        </div>
      </div>
    `;

    document.body.appendChild(panel);

    const layer2 = panel.querySelector('.lumos-blend-preview-layer2');

    panel.querySelectorAll('.lumos-blend-mode-btn').forEach(btn => {
      btn.onclick = () => {
        panel.querySelectorAll('.lumos-blend-mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const blend = btn.dataset.blend;
        layer2.style.mixBlendMode = blend;
        applyStyle(selectedElement, 'mixBlendMode', blend);
      };
    });

    panel.querySelector('.lumos-close-blend').onclick = () => panel.remove();
  }

  // ============================================
  // QUICK CONTROLS (pointer-events, user-select, scroll-behavior)
  // ============================================
  function openQuickControls() {
    if (!selectedElement) {
      showToast('Select an element first', 'warning');
      return;
    }

    document.querySelector('.lumos-quick-controls')?.remove();
    const cs = getComputedStyle(selectedElement);

    const panel = document.createElement('div');
    panel.className = 'lumos-quick-controls lumos-ui';
    panel.innerHTML = `
      <div style="padding:16px;border-bottom:1px solid #27272a;display:flex;align-items:center;justify-content:space-between">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="color:#8b5cf6">${icons.settings}</span>
          <span style="font-weight:600;color:#fafafa">Quick Controls</span>
        </div>
        <button class="lumos-close-quick" style="background:none;border:none;color:#71717a;cursor:pointer">${icons.close}</button>
      </div>
      <div>
        <div class="lumos-quick-control-row">
          <span class="lumos-quick-control-label">Pointer Events</span>
          <div class="lumos-quick-control-value">
            <button class="lumos-quick-toggle ${cs.pointerEvents !== 'none' ? 'active' : ''}" data-prop="pointerEvents" data-on="auto" data-off="none"></button>
          </div>
        </div>
        <div class="lumos-quick-control-row">
          <span class="lumos-quick-control-label">User Select</span>
          <div class="lumos-quick-control-value">
            <button class="lumos-quick-toggle ${cs.userSelect !== 'none' ? 'active' : ''}" data-prop="userSelect" data-on="auto" data-off="none"></button>
          </div>
        </div>
        <div class="lumos-quick-control-row">
          <span class="lumos-quick-control-label">Smooth Scroll</span>
          <div class="lumos-quick-control-value">
            <button class="lumos-quick-toggle ${cs.scrollBehavior === 'smooth' ? 'active' : ''}" data-prop="scrollBehavior" data-on="smooth" data-off="auto"></button>
          </div>
        </div>
        <div class="lumos-quick-control-row">
          <span class="lumos-quick-control-label">Backface Visible</span>
          <div class="lumos-quick-control-value">
            <button class="lumos-quick-toggle ${cs.backfaceVisibility !== 'hidden' ? 'active' : ''}" data-prop="backfaceVisibility" data-on="visible" data-off="hidden"></button>
          </div>
        </div>
        <div class="lumos-quick-control-row">
          <span class="lumos-quick-control-label">Will Change</span>
          <div class="lumos-quick-control-value" style="gap:4px">
            <button class="lumos-mini-btn" data-prop="willChange" data-value="auto" style="padding:4px 8px;background:#18181b;border:1px solid #27272a;border-radius:4px;color:#a1a1aa;font-size:10px;cursor:pointer">Auto</button>
            <button class="lumos-mini-btn" data-prop="willChange" data-value="transform" style="padding:4px 8px;background:#18181b;border:1px solid #27272a;border-radius:4px;color:#a1a1aa;font-size:10px;cursor:pointer">Transform</button>
            <button class="lumos-mini-btn" data-prop="willChange" data-value="opacity" style="padding:4px 8px;background:#18181b;border:1px solid #27272a;border-radius:4px;color:#a1a1aa;font-size:10px;cursor:pointer">Opacity</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(panel);

    panel.querySelectorAll('.lumos-quick-toggle').forEach(toggle => {
      toggle.onclick = () => {
        const isActive = toggle.classList.toggle('active');
        applyStyle(selectedElement, toggle.dataset.prop, isActive ? toggle.dataset.on : toggle.dataset.off);
      };
    });

    panel.querySelectorAll('.lumos-mini-btn').forEach(btn => {
      btn.onclick = () => {
        applyStyle(selectedElement, btn.dataset.prop, btn.dataset.value);
        showToast(`will-change: ${btn.dataset.value}`, 'success');
      };
    });

    panel.querySelector('.lumos-close-quick').onclick = () => panel.remove();
  }

  // ============================================
  // TYPOGRAPHY EDITOR (Letter/Word Spacing, Line Height)
  // ============================================
  function openTypographyEditor() {
    if (!selectedElement) {
      showToast('Select an element first', 'warning');
      return;
    }

    document.querySelector('.lumos-typography-editor')?.remove();
    const cs = getComputedStyle(selectedElement);

    const panel = document.createElement('div');
    panel.className = 'lumos-typography-editor lumos-ui';
    panel.innerHTML = `
      <div style="padding:16px;border-bottom:1px solid #27272a;display:flex;align-items:center;justify-content:space-between">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="color:#8b5cf6">${icons.letterSpacing}</span>
          <span style="font-weight:600;color:#fafafa">Typography</span>
        </div>
        <button class="lumos-close-typo" style="background:none;border:none;color:#71717a;cursor:pointer">${icons.close}</button>
      </div>
      <div style="padding:16px">
        <div class="lumos-typo-row">
          <label>Letter Spacing</label>
          <input type="range" min="-5" max="20" step="0.5" value="${parseFloat(cs.letterSpacing) || 0}" data-prop="letterSpacing" data-unit="px" />
          <span class="lumos-typo-value">${parseFloat(cs.letterSpacing) || 0}px</span>
        </div>
        <div class="lumos-typo-row">
          <label>Word Spacing</label>
          <input type="range" min="-5" max="30" step="1" value="${parseFloat(cs.wordSpacing) || 0}" data-prop="wordSpacing" data-unit="px" />
          <span class="lumos-typo-value">${parseFloat(cs.wordSpacing) || 0}px</span>
        </div>
        <div class="lumos-typo-row">
          <label>Line Height</label>
          <input type="range" min="0.5" max="3" step="0.1" value="${parseFloat(cs.lineHeight) / parseFloat(cs.fontSize) || 1.5}" data-prop="lineHeight" data-unit="" />
          <span class="lumos-typo-value">${(parseFloat(cs.lineHeight) / parseFloat(cs.fontSize) || 1.5).toFixed(1)}</span>
        </div>
        <div class="lumos-typo-row">
          <label>Text Indent</label>
          <input type="range" min="0" max="100" step="5" value="${parseFloat(cs.textIndent) || 0}" data-prop="textIndent" data-unit="px" />
          <span class="lumos-typo-value">${parseFloat(cs.textIndent) || 0}px</span>
        </div>
        <div class="lumos-typo-row">
          <label>Tab Size</label>
          <input type="range" min="1" max="8" step="1" value="${parseInt(cs.tabSize) || 4}" data-prop="tabSize" data-unit="" />
          <span class="lumos-typo-value">${parseInt(cs.tabSize) || 4}</span>
        </div>
        <div style="margin-top:16px;padding-top:16px;border-top:1px solid #27272a">
          <div style="font-size:10px;color:#71717a;margin-bottom:8px;text-transform:uppercase">White Space</div>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px">
            ${['normal', 'nowrap', 'pre', 'pre-wrap', 'pre-line', 'break-spaces'].map(ws => `
              <button class="lumos-ws-btn" data-value="${ws}" style="padding:8px;background:${cs.whiteSpace === ws ? '#8b5cf6' : '#18181b'};border:1px solid ${cs.whiteSpace === ws ? '#8b5cf6' : '#27272a'};border-radius:6px;color:${cs.whiteSpace === ws ? 'white' : '#a1a1aa'};font-size:9px;cursor:pointer">${ws}</button>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(panel);

    panel.querySelectorAll('input[type="range"]').forEach(input => {
      input.oninput = () => {
        const prop = input.dataset.prop;
        const unit = input.dataset.unit;
        const value = input.value + unit;
        input.nextElementSibling.textContent = value || input.value;
        applyStyle(selectedElement, prop, value || input.value);
      };
    });

    panel.querySelectorAll('.lumos-ws-btn').forEach(btn => {
      btn.onclick = () => {
        panel.querySelectorAll('.lumos-ws-btn').forEach(b => {
          b.style.background = '#18181b';
          b.style.borderColor = '#27272a';
          b.style.color = '#a1a1aa';
        });
        btn.style.background = '#8b5cf6';
        btn.style.borderColor = '#8b5cf6';
        btn.style.color = 'white';
        applyStyle(selectedElement, 'whiteSpace', btn.dataset.value);
      };
    });

    panel.querySelector('.lumos-close-typo').onclick = () => panel.remove();
  }

  // ============================================
  // GRID TEMPLATE BUILDER
  // ============================================
  function openGridBuilder() {
    if (!selectedElement) {
      showToast('Select an element first', 'warning');
      return;
    }

    document.querySelector('.lumos-grid-builder')?.remove();
    const cs = getComputedStyle(selectedElement);

    const panel = document.createElement('div');
    panel.className = 'lumos-grid-builder lumos-ui';
    panel.innerHTML = `
      <div style="padding:16px;border-bottom:1px solid #27272a;display:flex;align-items:center;justify-content:space-between">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="color:#8b5cf6">${icons.gridTemplate}</span>
          <span style="font-weight:600;color:#fafafa">Grid Builder</span>
        </div>
        <button class="lumos-close-grid-builder" style="background:none;border:none;color:#71717a;cursor:pointer">${icons.close}</button>
      </div>
      <div style="padding:16px">
        <div class="lumos-grid-preview" id="lumos-grid-preview"></div>
        <div class="lumos-grid-controls">
          <div class="lumos-grid-control">
            <label>Columns</label>
            <input type="number" min="1" max="12" value="3" class="lumos-grid-cols" />
          </div>
          <div class="lumos-grid-control">
            <label>Rows</label>
            <input type="number" min="1" max="12" value="2" class="lumos-grid-rows" />
          </div>
          <div class="lumos-grid-control">
            <label>Column Gap</label>
            <input type="text" value="16px" class="lumos-grid-col-gap" />
          </div>
          <div class="lumos-grid-control">
            <label>Row Gap</label>
            <input type="text" value="16px" class="lumos-grid-row-gap" />
          </div>
        </div>
        <div style="margin-top:16px">
          <div style="font-size:10px;color:#71717a;margin-bottom:8px;text-transform:uppercase">Column Template</div>
          <input type="text" value="repeat(3, 1fr)" class="lumos-grid-template-cols" style="width:100%;padding:8px;background:#18181b;border:1px solid #27272a;border-radius:6px;color:#fafafa;font-size:12px;font-family:monospace" />
        </div>
        <div style="margin-top:12px">
          <div style="font-size:10px;color:#71717a;margin-bottom:8px;text-transform:uppercase">Row Template</div>
          <input type="text" value="repeat(2, 1fr)" class="lumos-grid-template-rows" style="width:100%;padding:8px;background:#18181b;border:1px solid #27272a;border-radius:6px;color:#fafafa;font-size:12px;font-family:monospace" />
        </div>
        <div style="display:flex;gap:8px;margin-top:16px">
          <button class="lumos-apply-grid" style="flex:1;padding:10px;background:#8b5cf6;border:none;border-radius:6px;color:white;cursor:pointer;font-size:12px">Apply Grid</button>
          <button class="lumos-make-grid" style="padding:10px 16px;background:#27272a;border:none;border-radius:6px;color:#fafafa;cursor:pointer;font-size:12px">Make Grid</button>
        </div>
      </div>
    `;

    document.body.appendChild(panel);

    const preview = panel.querySelector('#lumos-grid-preview');

    function updatePreview() {
      const cols = parseInt(panel.querySelector('.lumos-grid-cols').value) || 3;
      const rows = parseInt(panel.querySelector('.lumos-grid-rows').value) || 2;
      preview.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
      preview.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
      preview.innerHTML = Array(cols * rows).fill('<div class="lumos-grid-preview-cell"></div>').join('');
      panel.querySelector('.lumos-grid-template-cols').value = `repeat(${cols}, 1fr)`;
      panel.querySelector('.lumos-grid-template-rows').value = `repeat(${rows}, 1fr)`;
    }

    updatePreview();

    panel.querySelector('.lumos-grid-cols').onchange = updatePreview;
    panel.querySelector('.lumos-grid-rows').onchange = updatePreview;

    panel.querySelector('.lumos-make-grid').onclick = () => {
      applyStyle(selectedElement, 'display', 'grid');
      showToast('Display set to grid', 'success');
    };

    panel.querySelector('.lumos-apply-grid').onclick = () => {
      const templateCols = panel.querySelector('.lumos-grid-template-cols').value;
      const templateRows = panel.querySelector('.lumos-grid-template-rows').value;
      const colGap = panel.querySelector('.lumos-grid-col-gap').value;
      const rowGap = panel.querySelector('.lumos-grid-row-gap').value;

      applyStyle(selectedElement, 'display', 'grid');
      applyStyle(selectedElement, 'gridTemplateColumns', templateCols);
      applyStyle(selectedElement, 'gridTemplateRows', templateRows);
      applyStyle(selectedElement, 'columnGap', colGap);
      applyStyle(selectedElement, 'rowGap', rowGap);
      showToast('Grid applied', 'success');
    };

    panel.querySelector('.lumos-close-grid-builder').onclick = () => panel.remove();
  }

  // ============================================
  // 3D/PERSPECTIVE EDITOR
  // ============================================
  function open3DEditor() {
    if (!selectedElement) {
      showToast('Select an element first', 'warning');
      return;
    }

    document.querySelector('.lumos-3d-editor')?.remove();
    const cs = getComputedStyle(selectedElement);

    const panel = document.createElement('div');
    panel.className = 'lumos-3d-editor lumos-ui';
    panel.innerHTML = `
      <div style="padding:16px;border-bottom:1px solid #27272a;display:flex;align-items:center;justify-content:space-between">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="color:#8b5cf6">${icons.cube3d}</span>
          <span style="font-weight:600;color:#fafafa">3D Transform</span>
        </div>
        <button class="lumos-close-3d" style="background:none;border:none;color:#71717a;cursor:pointer">${icons.close}</button>
      </div>
      <div style="padding:16px">
        <div class="lumos-3d-preview"></div>
        <div class="lumos-3d-row">
          <label>Perspective</label>
          <input type="range" min="100" max="2000" value="1000" data-prop="perspective" />
          <span>1000px</span>
        </div>
        <div class="lumos-3d-row">
          <label>Rotate X</label>
          <input type="range" min="-180" max="180" value="0" data-prop="rotateX" />
          <span>0°</span>
        </div>
        <div class="lumos-3d-row">
          <label>Rotate Y</label>
          <input type="range" min="-180" max="180" value="0" data-prop="rotateY" />
          <span>0°</span>
        </div>
        <div class="lumos-3d-row">
          <label>Rotate Z</label>
          <input type="range" min="-180" max="180" value="0" data-prop="rotateZ" />
          <span>0°</span>
        </div>
        <div class="lumos-3d-row">
          <label>Translate Z</label>
          <input type="range" min="-200" max="200" value="0" data-prop="translateZ" />
          <span>0px</span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-top:16px">
          <button class="lumos-3d-style" data-value="flat" style="padding:10px;background:#18181b;border:1px solid #27272a;border-radius:6px;color:#a1a1aa;cursor:pointer;font-size:11px">Flat</button>
          <button class="lumos-3d-style" data-value="preserve-3d" style="padding:10px;background:#18181b;border:1px solid #27272a;border-radius:6px;color:#a1a1aa;cursor:pointer;font-size:11px">Preserve 3D</button>
        </div>
        <button class="lumos-reset-3d" style="width:100%;padding:10px;background:#27272a;border:none;border-radius:6px;color:#fafafa;cursor:pointer;font-size:12px;margin-top:12px">Reset</button>
      </div>
    `;

    document.body.appendChild(panel);

    const preview = panel.querySelector('.lumos-3d-preview');

    function update3D() {
      const perspective = panel.querySelector('[data-prop="perspective"]').value;
      const rotateX = panel.querySelector('[data-prop="rotateX"]').value;
      const rotateY = panel.querySelector('[data-prop="rotateY"]').value;
      const rotateZ = panel.querySelector('[data-prop="rotateZ"]').value;
      const translateZ = panel.querySelector('[data-prop="translateZ"]').value;

      const transform = `perspective(${perspective}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg) translateZ(${translateZ}px)`;

      preview.style.transform = transform;
      applyStyle(selectedElement, 'transform', transform);
    }

    panel.querySelectorAll('input[type="range"]').forEach(input => {
      input.oninput = () => {
        const prop = input.dataset.prop;
        const unit = prop === 'perspective' || prop === 'translateZ' ? 'px' : '°';
        input.nextElementSibling.textContent = input.value + unit;
        update3D();
      };
    });

    panel.querySelectorAll('.lumos-3d-style').forEach(btn => {
      btn.onclick = () => {
        applyStyle(selectedElement, 'transformStyle', btn.dataset.value);
        showToast(`Transform style: ${btn.dataset.value}`, 'success');
      };
    });

    panel.querySelector('.lumos-reset-3d').onclick = () => {
      panel.querySelectorAll('input[type="range"]').forEach(input => {
        if (input.dataset.prop === 'perspective') input.value = 1000;
        else input.value = 0;
        input.nextElementSibling.textContent = input.value + (input.dataset.prop === 'perspective' || input.dataset.prop === 'translateZ' ? 'px' : '°');
      });
      update3D();
    };

    panel.querySelector('.lumos-close-3d').onclick = () => panel.remove();
  }

  // ============================================
  // SCROLL SNAP CONTROLS
  // ============================================
  function openScrollSnapEditor() {
    if (!selectedElement) {
      showToast('Select an element first', 'warning');
      return;
    }

    document.querySelector('.lumos-scroll-snap-editor')?.remove();
    const cs = getComputedStyle(selectedElement);

    const panel = document.createElement('div');
    panel.className = 'lumos-scroll-snap-editor lumos-ui';
    panel.innerHTML = `
      <div style="padding:16px;border-bottom:1px solid #27272a;display:flex;align-items:center;justify-content:space-between">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="color:#8b5cf6">${icons.scrollSnap}</span>
          <span style="font-weight:600;color:#fafafa">Scroll Snap</span>
        </div>
        <button class="lumos-close-snap" style="background:none;border:none;color:#71717a;cursor:pointer">${icons.close}</button>
      </div>
      <div style="padding:16px">
        <div class="lumos-snap-section">
          <div class="lumos-snap-section-label">Container Type</div>
          <div class="lumos-snap-grid">
            ${['none', 'x mandatory', 'y mandatory', 'x proximity', 'y proximity', 'both mandatory'].map(type => `
              <button class="lumos-snap-btn" data-type="${type}">${type}</button>
            `).join('')}
          </div>
        </div>
        <div class="lumos-snap-section">
          <div class="lumos-snap-section-label">Child Alignment</div>
          <div class="lumos-snap-grid">
            ${['none', 'start', 'center', 'end'].map(align => `
              <button class="lumos-snap-btn lumos-snap-align" data-align="${align}">${align}</button>
            `).join('')}
          </div>
        </div>
        <div class="lumos-snap-section" style="margin-bottom:0">
          <div class="lumos-snap-section-label">Scroll Behavior</div>
          <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:6px">
            <button class="lumos-snap-btn lumos-scroll-behavior" data-behavior="auto">Auto</button>
            <button class="lumos-snap-btn lumos-scroll-behavior" data-behavior="smooth">Smooth</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(panel);

    panel.querySelectorAll('.lumos-snap-btn:not(.lumos-snap-align):not(.lumos-scroll-behavior)').forEach(btn => {
      btn.onclick = () => {
        panel.querySelectorAll('.lumos-snap-btn:not(.lumos-snap-align):not(.lumos-scroll-behavior)').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        applyStyle(selectedElement, 'scrollSnapType', btn.dataset.type);
      };
    });

    panel.querySelectorAll('.lumos-snap-align').forEach(btn => {
      btn.onclick = () => {
        panel.querySelectorAll('.lumos-snap-align').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        applyStyle(selectedElement, 'scrollSnapAlign', btn.dataset.align);
      };
    });

    panel.querySelectorAll('.lumos-scroll-behavior').forEach(btn => {
      btn.onclick = () => {
        panel.querySelectorAll('.lumos-scroll-behavior').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        applyStyle(selectedElement, 'scrollBehavior', btn.dataset.behavior);
      };
    });

    panel.querySelector('.lumos-close-snap').onclick = () => panel.remove();
  }

  // ============================================
  // WRITING MODE EDITOR
  // ============================================
  function openWritingModeEditor() {
    if (!selectedElement) {
      showToast('Select an element first', 'warning');
      return;
    }

    document.querySelector('.lumos-writing-mode-editor')?.remove();
    const cs = getComputedStyle(selectedElement);

    const panel = document.createElement('div');
    panel.className = 'lumos-writing-mode-editor lumos-ui';
    panel.innerHTML = `
      <div style="padding:16px;border-bottom:1px solid #27272a;display:flex;align-items:center;justify-content:space-between">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="color:#8b5cf6">${icons.writingMode}</span>
          <span style="font-weight:600;color:#fafafa">Writing Mode</span>
        </div>
        <button class="lumos-close-writing" style="background:none;border:none;color:#71717a;cursor:pointer">${icons.close}</button>
      </div>
      <div style="padding:16px">
        <div class="lumos-writing-preview">Sample Text 示例文本</div>
        <div style="font-size:10px;color:#71717a;margin-bottom:8px;text-transform:uppercase">Writing Mode</div>
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:6px;margin-bottom:16px">
          ${['horizontal-tb', 'vertical-rl', 'vertical-lr', 'sideways-rl'].map(mode => `
            <button class="lumos-writing-btn" data-mode="${mode}" style="padding:10px;background:${cs.writingMode === mode ? '#8b5cf6' : '#18181b'};border:1px solid ${cs.writingMode === mode ? '#8b5cf6' : '#27272a'};border-radius:6px;color:${cs.writingMode === mode ? 'white' : '#a1a1aa'};font-size:10px;cursor:pointer">${mode}</button>
          `).join('')}
        </div>
        <div style="font-size:10px;color:#71717a;margin-bottom:8px;text-transform:uppercase">Direction</div>
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:6px;margin-bottom:16px">
          <button class="lumos-dir-btn" data-dir="ltr" style="padding:10px;background:${cs.direction === 'ltr' ? '#8b5cf6' : '#18181b'};border:1px solid ${cs.direction === 'ltr' ? '#8b5cf6' : '#27272a'};border-radius:6px;color:${cs.direction === 'ltr' ? 'white' : '#a1a1aa'};font-size:11px;cursor:pointer">LTR →</button>
          <button class="lumos-dir-btn" data-dir="rtl" style="padding:10px;background:${cs.direction === 'rtl' ? '#8b5cf6' : '#18181b'};border:1px solid ${cs.direction === 'rtl' ? '#8b5cf6' : '#27272a'};border-radius:6px;color:${cs.direction === 'rtl' ? 'white' : '#a1a1aa'};font-size:11px;cursor:pointer">← RTL</button>
        </div>
        <div style="font-size:10px;color:#71717a;margin-bottom:8px;text-transform:uppercase">Text Orientation</div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px">
          ${['mixed', 'upright', 'sideways'].map(orient => `
            <button class="lumos-orient-btn" data-orient="${orient}" style="padding:10px;background:#18181b;border:1px solid #27272a;border-radius:6px;color:#a1a1aa;font-size:10px;cursor:pointer">${orient}</button>
          `).join('')}
        </div>
      </div>
    `;

    document.body.appendChild(panel);

    const preview = panel.querySelector('.lumos-writing-preview');

    panel.querySelectorAll('.lumos-writing-btn').forEach(btn => {
      btn.onclick = () => {
        panel.querySelectorAll('.lumos-writing-btn').forEach(b => {
          b.style.background = '#18181b';
          b.style.borderColor = '#27272a';
          b.style.color = '#a1a1aa';
        });
        btn.style.background = '#8b5cf6';
        btn.style.borderColor = '#8b5cf6';
        btn.style.color = 'white';
        preview.style.writingMode = btn.dataset.mode;
        applyStyle(selectedElement, 'writingMode', btn.dataset.mode);
      };
    });

    panel.querySelectorAll('.lumos-dir-btn').forEach(btn => {
      btn.onclick = () => {
        panel.querySelectorAll('.lumos-dir-btn').forEach(b => {
          b.style.background = '#18181b';
          b.style.borderColor = '#27272a';
          b.style.color = '#a1a1aa';
        });
        btn.style.background = '#8b5cf6';
        btn.style.borderColor = '#8b5cf6';
        btn.style.color = 'white';
        preview.style.direction = btn.dataset.dir;
        applyStyle(selectedElement, 'direction', btn.dataset.dir);
      };
    });

    panel.querySelectorAll('.lumos-orient-btn').forEach(btn => {
      btn.onclick = () => {
        preview.style.textOrientation = btn.dataset.orient;
        applyStyle(selectedElement, 'textOrientation', btn.dataset.orient);
        showToast(`Text orientation: ${btn.dataset.orient}`, 'success');
      };
    });

    panel.querySelector('.lumos-close-writing').onclick = () => panel.remove();
  }

  // ============================================
  // WORD BREAK EDITOR
  // ============================================
  function openWordBreakEditor() {
    if (!selectedElement) {
      showToast('Select an element first', 'warning');
      return;
    }

    document.querySelector('.lumos-word-break-editor')?.remove();
    const cs = getComputedStyle(selectedElement);

    const panel = document.createElement('div');
    panel.className = 'lumos-word-break-editor lumos-ui';
    panel.innerHTML = `
      <div style="padding:16px;border-bottom:1px solid #27272a;display:flex;align-items:center;justify-content:space-between">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="color:#8b5cf6">${icons.wordBreak}</span>
          <span style="font-weight:600;color:#fafafa">Word Break</span>
        </div>
        <button class="lumos-close-wordbreak" style="background:none;border:none;color:#71717a;cursor:pointer">${icons.close}</button>
      </div>
      <div style="padding:16px">
        <div class="lumos-word-break-preview">ThisIsAVeryLongWordThatShouldBreakSomewhere</div>
        <div style="font-size:10px;color:#71717a;margin-bottom:8px;text-transform:uppercase">Word Break</div>
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:6px;margin-bottom:16px">
          ${['normal', 'break-all', 'keep-all', 'break-word'].map(wb => `
            <button class="lumos-wb-btn" data-value="${wb}" style="padding:10px;background:${cs.wordBreak === wb ? '#8b5cf6' : '#18181b'};border:1px solid ${cs.wordBreak === wb ? '#8b5cf6' : '#27272a'};border-radius:6px;color:${cs.wordBreak === wb ? 'white' : '#a1a1aa'};font-size:10px;cursor:pointer">${wb}</button>
          `).join('')}
        </div>
        <div style="font-size:10px;color:#71717a;margin-bottom:8px;text-transform:uppercase">Overflow Wrap</div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:16px">
          ${['normal', 'break-word', 'anywhere'].map(ow => `
            <button class="lumos-ow-btn" data-value="${ow}" style="padding:10px;background:#18181b;border:1px solid #27272a;border-radius:6px;color:#a1a1aa;font-size:10px;cursor:pointer">${ow}</button>
          `).join('')}
        </div>
        <div style="font-size:10px;color:#71717a;margin-bottom:8px;text-transform:uppercase">Hyphens</div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px">
          ${['none', 'manual', 'auto'].map(h => `
            <button class="lumos-hyphens-btn" data-value="${h}" style="padding:10px;background:#18181b;border:1px solid #27272a;border-radius:6px;color:#a1a1aa;font-size:10px;cursor:pointer">${h}</button>
          `).join('')}
        </div>
      </div>
    `;

    document.body.appendChild(panel);

    const preview = panel.querySelector('.lumos-word-break-preview');

    panel.querySelectorAll('.lumos-wb-btn').forEach(btn => {
      btn.onclick = () => {
        panel.querySelectorAll('.lumos-wb-btn').forEach(b => {
          b.style.background = '#18181b';
          b.style.borderColor = '#27272a';
          b.style.color = '#a1a1aa';
        });
        btn.style.background = '#8b5cf6';
        btn.style.borderColor = '#8b5cf6';
        btn.style.color = 'white';
        preview.style.wordBreak = btn.dataset.value;
        applyStyle(selectedElement, 'wordBreak', btn.dataset.value);
      };
    });

    panel.querySelectorAll('.lumos-ow-btn').forEach(btn => {
      btn.onclick = () => {
        preview.style.overflowWrap = btn.dataset.value;
        applyStyle(selectedElement, 'overflowWrap', btn.dataset.value);
        showToast(`Overflow wrap: ${btn.dataset.value}`, 'success');
      };
    });

    panel.querySelectorAll('.lumos-hyphens-btn').forEach(btn => {
      btn.onclick = () => {
        applyStyle(selectedElement, 'hyphens', btn.dataset.value);
        showToast(`Hyphens: ${btn.dataset.value}`, 'success');
      };
    });

    panel.querySelector('.lumos-close-wordbreak').onclick = () => panel.remove();
  }

  // ============================================
  // RESIZE CONTROL
  // ============================================
  function openResizeEditor() {
    if (!selectedElement) {
      showToast('Select an element first', 'warning');
      return;
    }

    document.querySelector('.lumos-resize-editor')?.remove();
    const cs = getComputedStyle(selectedElement);

    const options = [
      { value: 'none', icon: '⊘', label: 'None' },
      { value: 'both', icon: '⤡', label: 'Both' },
      { value: 'horizontal', icon: '↔', label: 'Horizontal' },
      { value: 'vertical', icon: '↕', label: 'Vertical' }
    ];

    const panel = document.createElement('div');
    panel.className = 'lumos-resize-editor lumos-ui';
    panel.innerHTML = `
      <div style="padding:16px;border-bottom:1px solid #27272a;display:flex;align-items:center;justify-content:space-between">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="color:#8b5cf6">${icons.resizeIcon}</span>
          <span style="font-weight:600;color:#fafafa">Resize</span>
        </div>
        <button class="lumos-close-resize" style="background:none;border:none;color:#71717a;cursor:pointer">${icons.close}</button>
      </div>
      <div style="padding:16px">
        <div class="lumos-resize-grid">
          ${options.map(o => `
            <button class="lumos-resize-btn ${cs.resize === o.value ? 'active' : ''}" data-resize="${o.value}">
              <div class="lumos-resize-icon">${o.icon}</div>
              ${o.label}
            </button>
          `).join('')}
        </div>
        <p style="margin-top:12px;font-size:10px;color:#71717a;text-align:center">Note: Requires overflow to be set to auto, scroll, or hidden.</p>
      </div>
    `;

    document.body.appendChild(panel);

    panel.querySelectorAll('.lumos-resize-btn').forEach(btn => {
      btn.onclick = () => {
        panel.querySelectorAll('.lumos-resize-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        applyStyle(selectedElement, 'resize', btn.dataset.resize);
        // Also ensure overflow is set
        if (btn.dataset.resize !== 'none') {
          const currentOverflow = getComputedStyle(selectedElement).overflow;
          if (currentOverflow === 'visible') {
            applyStyle(selectedElement, 'overflow', 'auto');
          }
        }
      };
    });

    panel.querySelector('.lumos-close-resize').onclick = () => panel.remove();
  }

  // ============================================
  // ADD NEW COMMANDS TO PALETTE
  // ============================================
  commands.push(
    { id: 'animation', label: 'Animation Editor', icon: 'film', action: openAnimationEditor },
    { id: 'layout-panel', label: 'Quick Layout', icon: 'layout', action: openLayoutPanel },
    { id: 'css-vars', label: 'CSS Variables', icon: 'code', action: openCSSVariablesPanel },
    { id: 'eyedropper', label: 'Color Eyedropper', icon: 'droplet', action: toggleEyedropper },
    { id: 'rulers', label: 'Toggle Rulers', icon: 'ruler', action: toggleRulers },
    { id: 'spacing-viz', label: 'Spacing Visualizer', icon: 'spacing', action: toggleSpacingVisualizer },
    { id: 'spacing-guides', label: 'Spacing Guides', icon: 'move', action: toggleSpacingGuides },
    { id: 'quick-bar', label: 'Toggle Quick Bar', icon: 'zap', action: toggleQuickBar },
    { id: 'select-parent', label: 'Select Parent', icon: 'arrowUp', shortcut: '⌥↑', action: selectParent },
    { id: 'select-child', label: 'Select Child', icon: 'arrowDown', shortcut: '⌥↓', action: selectFirstChild },
    { id: 'screenshot', label: 'Screenshot Element', icon: 'camera', action: captureElement },
    { id: 'box-shadow', label: 'Box Shadow Editor', icon: 'shadow', action: openBoxShadowEditor },
    { id: 'filter', label: 'Filter Editor', icon: 'sliders', action: openFilterEditor },
    { id: 'focus-mode', label: 'Toggle Focus Mode', icon: 'focus', shortcut: 'F', action: toggleFocusMode },
    { id: 'compare', label: 'Compare Styles', icon: 'gitCompare', action: openStyleComparison },
    { id: 'compare-start', label: 'Start Comparison', icon: 'gitCompare', action: startStyleComparison },
    { id: 'z-index', label: 'Z-Index Manager', icon: 'layersIcon', action: openZIndexManager },
    { id: 'css-audit', label: 'CSS Audit', icon: 'fileSearch', action: runCSSAudit },
    { id: 'dark-mode', label: 'Toggle Dark Mode', icon: 'moon', action: toggleDarkModePreview },
    { id: 'text-shadow', label: 'Text Shadow Editor', icon: 'textCursor', action: openTextShadowEditor },
    { id: 'transform', label: 'Transform Editor', icon: 'rotate', action: openTransformEditor },
    { id: 'position', label: 'Position Editor', icon: 'mapPin', action: openPositionEditor },
    { id: 'border', label: 'Border Editor', icon: 'square', action: openBorderEditor },
    { id: 'cursor', label: 'Cursor Picker', icon: 'mousePointer', action: openCursorPicker },
    { id: 'overflow', label: 'Overflow Controls', icon: 'scrollIcon', action: openOverflowEditor },
    { id: 'display', label: 'Display & Visibility', icon: 'eye', action: openDisplayEditor },
    { id: 'flex-item', label: 'Flex Item Controls', icon: 'flexGrow', action: openFlexItemEditor },
    { id: 'aspect-ratio', label: 'Aspect Ratio', icon: 'ratio', action: openAspectRatioEditor },
    { id: 'background', label: 'Background Editor', icon: 'image', action: openBackgroundEditor },
    { id: 'outline', label: 'Outline Editor', icon: 'outlineIcon', action: openOutlineEditor },
    { id: 'text-toolbar', label: 'Text Formatting', icon: 'type', shortcut: 'T', action: showTextToolbar },
    { id: 'transitions', label: 'Transition Presets', icon: 'timer', action: openTransitionPresets },
    { id: 'object-fit', label: 'Object Fit', icon: 'cropIcon', action: openObjectFitEditor },
    { id: 'clip-path', label: 'Clip Path Shapes', icon: 'scissors', action: openClipPathEditor },
    { id: 'blend-mode', label: 'Blend Mode', icon: 'blendMode', action: openBlendModePicker },
    { id: 'quick-controls', label: 'Quick Controls', icon: 'settings', action: openQuickControls },
    { id: 'typography', label: 'Typography Editor', icon: 'letterSpacing', action: openTypographyEditor },
    { id: 'grid-builder', label: 'Grid Builder', icon: 'gridTemplate', action: openGridBuilder },
    { id: '3d-editor', label: '3D Transform', icon: 'cube3d', action: open3DEditor },
    { id: 'scroll-snap', label: 'Scroll Snap', icon: 'scrollSnap', action: openScrollSnapEditor },
    { id: 'writing-mode', label: 'Writing Mode', icon: 'writingMode', action: openWritingModeEditor },
    { id: 'word-break', label: 'Word Break', icon: 'wordBreak', action: openWordBreakEditor },
    { id: 'resize', label: 'Resize Control', icon: 'resizeIcon', action: openResizeEditor }
  );

  // Focus mode keyboard shortcut
  document.addEventListener('keydown', e => {
    if (e.key === 'f' && !e.metaKey && !e.ctrlKey && !e.altKey) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (commandPaletteOpen) return;
      toggleFocusMode();
    }
    // Text toolbar shortcut
    if (e.key === 't' && !e.metaKey && !e.ctrlKey && !e.altKey) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (commandPaletteOpen) return;
      showTextToolbar();
    }
  });

  // ============================================
  // INITIALIZE ADDITIONAL FEATURES
  // ============================================
  setTimeout(() => {
    addNavigatorSearch();
    applySettings();
    if (!hasSeenOnboarding) {
      setTimeout(showOnboarding, 1000);
    }
  }, 100);

  // Initialize
  setTimeout(loadPersistedChanges, 500);
  googleFonts.slice(0, 5).forEach(loadGoogleFont); // Preload popular fonts
  console.log('[Lumos] Inspector ready. Press ⌘K for commands, ? for shortcuts.');
})();

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
  console.log('[Lumos] Inspector ready. Click the purple button or press ⌘K to start.');
})();

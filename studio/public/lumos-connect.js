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
      </div>

      <div class="lumos-inspect-toggle">
        <span class="lumos-inspect-label">${icons.cursor} Select Element</span>
        <div class="lumos-switch"></div>
      </div>

      <div class="lumos-element-info" style="display:none"></div>

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

  // Initialize
  setTimeout(loadPersistedChanges, 500);
  console.log('[Lumos] Inspector ready. Click the purple button to start.');
})();

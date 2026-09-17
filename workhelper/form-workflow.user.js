// ==UserScript==
// @name         表单工作流助手
// @namespace    http://tampermonkey.net/
// @version      3.0.39
// @description  支持多标签页、动态下拉框、弹框操作、Ant Design组件的表单自动填写
// @author       wangyingcheng
// @match        *://*/crediosweb/*
// @match        *://*/cas/login*
// @include      *://*:*/cas/login*
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_setClipboard
// @grant        GM_notification
// @grant        GM_openInTab
// @grant        GM_xmlhttpRequest
// @grant        GM_deleteValue
// @grant        unsafeWindow
// @connect      yingchengwang.github.io
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    function injectStyles() {
        // Inject custom theme styles
        GM_addStyle(`
        /* ========== Design Tokens (语义化配色变量) ==========
           挂在 :root 使模态框（挂在 body 下、不在 #workflow-panel 内）也能引用。
           变量名统一 --wf-* 前缀，避免污染宿主页面。
           修改主色/状态色只需调整此处，全局生效；为暗色模式铺路。 */
        :root {
            /* 品牌 */
            --wf-brand: #667eea;
            --wf-brand-2: #764ba2;
            --wf-brand-gradient: linear-gradient(135deg, var(--wf-brand) 0%, var(--wf-brand-2) 100%);
            --wf-brand-shadow: rgba(102, 126, 234, 0.45);
            --wf-brand-shadow-hover: rgba(102, 126, 234, 0.55);

            /* 主色 / 当前态 / info（蓝）—— 唯一功能性主色 */
            --wf-primary: #4299e1;
            --wf-primary-dark: #3182ce;
            --wf-primary-darker: #2b6cb0;
            --wf-primary-text: #2a4365;
            --wf-primary-light: #ebf8ff;
            --wf-primary-border: #90cdf4;
            --wf-primary-border-light: #bee3f8;
            --wf-primary-focus: rgba(66, 153, 225, 0.15);

            /* 成功 / 完成态 / 启用开关（绿） */
            --wf-success: #2f855a;
            --wf-success-hover: #276749;
            --wf-success-accent: #48bb78;
            --wf-success-light: #f0fff4;
            --wf-success-border: #9ae6b4;
            --wf-success-text: #22543d;

            /* 错误 / 停止（红） */
            --wf-error: #c53030;
            --wf-error-hover: #9b2c2c;
            --wf-error-accent: #fc8181;
            --wf-error-light: #fff5f5;
            --wf-error-soft: #ffe5e5;
            --wf-error-soft-hover: #ffc8c8;
            --wf-error-text: #742a2a;

            /* 手动 / 警告（橙） */
            --wf-warning: #c05621;
            --wf-warning-hover: #9c4221;
            --wf-warning-accent: #dd6b20;
            --wf-warning-light: #fffaf0;
            --wf-warning-border: #fbd38d;
            --wf-warning-text: #744210;

            /* 跳过（黄） */
            --wf-skip-text: #975a16;
            --wf-skip-light: #fff9db;
            --wf-skip-light-hover: #ffec99;

            /* 说明按钮（紫） */
            --wf-desc-text: #553c9a;
            --wf-desc-light: #f3e8ff;
            --wf-desc-light-hover: #e0d4ff;

            /* 表面 */
            --wf-surface: #ffffff;
            --wf-surface-muted: #f7fafc;
            --wf-surface-2: #fafbfc;
            --wf-surface-3: #f8f9fc;

            /* 边框 */
            --wf-border: #e2e8f0;
            --wf-border-muted: #edf2f7;
            --wf-border-strong: #cbd5e0;

            /* 文字 */
            --wf-text: #1a202c;
            --wf-text-heading: #2d3748;
            --wf-text-secondary: #4a5568;
            --wf-text-muted: #718096;
            --wf-text-faint: #a0aec0;

            /* 日志区（暗色片段） */
            --wf-log-bg: #1a202c;
            --wf-log-text: #e2e8f0;
            --wf-log-muted: #a0aec0;
            --wf-log-border: #4a5568;
            --wf-log-success: #68d391;
            --wf-log-error: #fc8181;
            --wf-log-info: #90cdf4;
            --wf-log-warning: #fbd38d;

            /* 遮罩 */
            --wf-overlay: rgba(0, 0, 0, 0.4);

            /* 圆角刻度（统一收敛到 sm/md/lg/xl + pill/circle） */
            --wf-radius-sm: 4px;       /* 徽章/小标签/小按钮 */
            --wf-radius-md: 6px;       /* 按钮/输入框/步骤项 */
            --wf-radius-lg: 8px;       /* 卡片/信息条/分区 */
            --wf-radius-xl: 12px;      /* 面板/模态框 */
            --wf-radius-pill: 999px;   /* 开关/状态药丸 */
            --wf-radius-circle: 50%;   /* 圆形图标/连接点 */
        }

        /* ========== Scoped box-sizing ========== */
        #workflow-panel *, #workflow-panel *::before, #workflow-panel *::after {
            box-sizing: border-box;
        }

        /* ========== Floating Button ========== */
        #workflow-floating-btn {
            position: fixed;
            bottom: 24px;
            right: 24px;
            width: 52px;
            height: 52px;
            border: none;
            border-radius:var(--wf-radius-circle);
            background: var(--wf-brand-gradient);
            color: white;
            font-size: 20px;
            cursor: grab;
            box-shadow: 0 6px 20px var(--wf-brand-shadow);
            z-index: 99998;
            transition: transform 0.2s, box-shadow 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        #workflow-floating-btn:hover {
            transform: scale(1.1) translateY(-2px);
            box-shadow: 0 8px 28px var(--wf-brand-shadow-hover);
        }
        #workflow-floating-btn.dragging {
            cursor: grabbing;
        }

        /* ========== Panel Container ========== */
        #workflow-panel {
            position: fixed;
            top: 16px;
            right: 16px;
            width: 720px;
            height: 540px;
            z-index: 99999;
            display: flex;
            flex-direction: column;
            border-radius:var(--wf-radius-xl);
            overflow: hidden;
            box-shadow: 0 12px 48px rgba(0, 0, 0, 0.15), 0 2px 8px rgba(0, 0, 0, 0.1);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 13px;
            background: var(--wf-surface);
        }

        #workflow-panel.minimized {
            width: auto !important;
            min-width: 220px;
            height: auto !important;
        }

        #workflow-panel.minimized .wf-panel-body {
            display: none;
        }

        #workflow-panel.narrow .wf-sidebar {
            display: none;
        }

        /* ========== Panel Header ========== */
        #workflow-panel .wf-panel-header {
            background: var(--wf-brand-gradient);
            padding: 10px 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: move;
            user-select: none;
            flex-shrink: 0;
        }

        #workflow-panel .wf-panel-header .wf-title {
            color: white;
            font-weight: 600;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        #workflow-panel .wf-panel-header .wf-version {
            font-size: 10px;
            background: rgba(255,255,255,0.2);
            padding: 1px 6px;
            border-radius:var(--wf-radius-lg);
            color: rgba(255,255,255,0.9);
        }

        #workflow-panel .wf-panel-header .wf-header-btns {
            display: flex;
            gap: 6px;
        }

        #workflow-panel .wf-panel-header .wf-header-btn {
            width: 24px;
            height: 24px;
            border: none;
            border-radius:var(--wf-radius-md);
            background: rgba(255,255,255,0.15);
            color: white;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            transition: background 0.15s;
        }

        #workflow-panel .wf-panel-header .wf-header-btn:hover {
            background: rgba(255,255,255,0.3);
        }

        /* ========== Panel Body ========== */
        #workflow-panel .wf-panel-body {
            display: flex;
            flex: 1;
            min-height: 0;
            overflow: hidden;
        }

        /* ========== Main Content Area ========== */
        #workflow-panel .wf-main {
            flex: 1;
            display: flex;
            flex-direction: column;
            min-width: 0;
            overflow: hidden;
            padding: 12px;
            gap: 10px;
        }

        /* Info bar */
        #workflow-panel .wf-info-bar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 12px;
            background: var(--wf-surface-3);
            border-radius:var(--wf-radius-lg);
            border: 1px solid var(--wf-border-muted);
        }

        #workflow-panel .wf-info-bar .wf-name {
            font-weight: 600;
            font-size: 13px;
            color: var(--wf-text-heading);
        }

        #workflow-panel .wf-info-bar .wf-status {
            font-size: 11px;
            color: var(--wf-text-muted);
            padding: 2px 8px;
            background: white;
            border-radius:var(--wf-radius-pill);
            border: 1px solid var(--wf-border);
        }

        /* Progress */
        #workflow-panel .wf-progress-section {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        #workflow-panel .wf-progress-bar {
            flex: 1;
            height: 5px;
            background: var(--wf-border);
            border-radius:var(--wf-radius-sm);
            overflow: hidden;
        }

        #workflow-panel .wf-progress-fill {
            height: 100%;
            background: var(--wf-brand-gradient);
            border-radius:var(--wf-radius-sm);
            transition: width 0.3s ease;
        }

        #workflow-panel .wf-progress-text {
            font-size: 11px;
            color: var(--wf-text-muted);
            white-space: nowrap;
            min-width: 60px;
            text-align: right;
        }

        /* Action buttons */
        #workflow-panel .wf-action-btns {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }

        #workflow-panel .wf-action-btns .wf-btn-row {
            display: flex;
            gap: 6px;
        }

        #workflow-panel .wf-action-btns .wf-btn-row .wf-btn {
            flex: 1;
            text-align: center;
            justify-content: center;
        }

        #workflow-panel .wf-action-btns .wf-btn {
            padding: 5px 12px;
            border: none;
            border-radius:var(--wf-radius-md);
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.15s;
            display: inline-flex;
            align-items: center;
            gap: 4px;
        }

        #workflow-panel .wf-btn:active {
            transform: scale(0.96);
        }

        #workflow-panel .wf-btn-start {
            background: var(--wf-success);
            color: white;
            font-weight: 600;
        }
        #workflow-panel .wf-btn-start:hover { background: var(--wf-success-hover); }

        #workflow-panel .wf-btn-stop {
            background: var(--wf-error);
            color: white;
        }
        #workflow-panel .wf-btn-stop:hover { background: var(--wf-error-hover); }

        #workflow-panel .wf-btn-reset {
            background: var(--wf-error-soft);
            color: var(--wf-error);
        }
        #workflow-panel .wf-btn-reset:hover { background: var(--wf-error-soft-hover); }

        #workflow-panel .wf-btn-skip {
            background: var(--wf-skip-light);
            color: var(--wf-skip-text);
        }
        #workflow-panel .wf-btn-skip:hover { background: var(--wf-skip-light-hover); }

        #workflow-panel .wf-btn-desc {
            background: var(--wf-desc-light);
            color: var(--wf-desc-text);
        }
        #workflow-panel .wf-btn-desc:hover { background: var(--wf-desc-light-hover); }

        /* User action waiting */
        #workflow-panel .wf-user-action {
            padding: 10px 14px;
            background: var(--wf-warning-light);
            border: 1px solid var(--wf-warning-border);
            border-radius:var(--wf-radius-lg);
            text-align: center;
        }

        #workflow-panel .wf-user-action .wf-user-msg {
            font-size: 13px;
            color: var(--wf-warning);
            font-weight: 500;
            margin-bottom: 8px;
        }

        #workflow-panel .wf-user-action .wf-btn-continue {
            background: var(--wf-success);
            color: white;
            border: none;
            padding: 5px 16px;
            border-radius:var(--wf-radius-md);
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
        }
        #workflow-panel .wf-user-action .wf-btn-continue:hover { background: var(--wf-success-hover); }

        /* ========== Step List ========== */
        #workflow-panel .wf-step-list-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 6px 10px;
            background: var(--wf-surface-muted);
            border-radius:var(--wf-radius-md);
            cursor: pointer;
            user-select: none;
            font-size: 12px;
            color: var(--wf-text-secondary);
            font-weight: 600;
            transition: background 0.15s;
        }

        #workflow-panel .wf-step-list-header:hover {
            background: var(--wf-border-muted);
        }

        #workflow-panel .wf-step-list-header .toggle-arrow {
            transition: transform 0.2s;
            font-size: 10px;
        }

        #workflow-panel .wf-step-list-wrapper {
            flex: 1;
            display: flex;
            flex-direction: column;
            min-height: 0;
            overflow: hidden;
        }

        #workflow-panel .wf-step-list-wrapper.collapsed .wf-step-list {
            display: none;
        }

        #workflow-panel .wf-step-list-wrapper.collapsed #wf-connections {
            display: none;
        }

        #workflow-panel .wf-step-list-wrapper.collapsed .toggle-arrow {
            transform: rotate(-90deg);
        }

        #workflow-panel .wf-step-list {
            flex: 1;
            overflow-y: auto;
            padding: 4px 0;
            position: relative;
        }

        #workflow-panel .wf-step-list::-webkit-scrollbar {
            width: 4px;
        }
        #workflow-panel .wf-step-list::-webkit-scrollbar-thumb {
            background: var(--wf-border-strong);
            border-radius:var(--wf-radius-sm);
        }

        /* Step item */
        #workflow-panel .wf-step-item {
            margin-bottom: 4px;
            margin-right: 10px;
            border-radius:var(--wf-radius-md);
            background: var(--wf-surface-muted);
            border: 1px solid var(--wf-border);
            overflow: hidden;
            transition: all 0.15s;
        }

        #workflow-panel .wf-step-item.current {
            background: var(--wf-primary-light);
            border-color: var(--wf-primary-border);
            border-left: 3px solid var(--wf-primary);
        }

        #workflow-panel .wf-step-item.completed {
            background: var(--wf-success-light);
            border-color: var(--wf-success-border);
            border-left: 3px solid var(--wf-success-accent);
        }

        #workflow-panel .wf-step-item.bypassed {
            opacity: 0.5;
            background: var(--wf-surface-muted);
        }

        #workflow-panel .wf-step-item.bypassed .wf-step-name {
            text-decoration: line-through;
            color: var(--wf-text-faint);
        }

        #workflow-panel .wf-step-header {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 6px 10px;
            cursor: pointer;
            user-select: none;
        }

        #workflow-panel .wf-step-header:hover {
            background: rgba(0,0,0,0.02);
        }

        #workflow-panel .wf-step-icon {
            width: 18px;
            height: 18px;
            border-radius:var(--wf-radius-circle);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 9px;
            background: var(--wf-border-strong);
            color: white;
            flex-shrink: 0;
        }

        #workflow-panel .wf-step-item.current .wf-step-icon {
            background: var(--wf-primary);
        }
        #workflow-panel .wf-step-item.completed .wf-step-icon {
            background: var(--wf-success-accent);
        }

        #workflow-panel .wf-step-toggle {
            font-size: 9px;
            color: var(--wf-text-muted);
            transition: transform 0.2s;
        }

        #workflow-panel .wf-step-item.collapsed .wf-step-toggle {
            transform: rotate(-90deg);
        }

        #workflow-panel .wf-step-name {
            flex: 1;
            font-size: 12px;
            font-weight: 500;
            color: var(--wf-text-heading);
        }

        #workflow-panel .wf-step-controls {
            display: flex;
            align-items: center;
            gap: 4px;
        }

        #workflow-panel .wf-step-ctrl-btn {
            padding: 2px 6px;
            font-size: 10px;
            border: 1px solid var(--wf-border);
            background: white;
            border-radius:var(--wf-radius-sm);
            cursor: pointer;
            color: var(--wf-text-secondary);
            transition: all 0.15s;
        }

        #workflow-panel .wf-step-ctrl-btn:hover {
            background: var(--wf-border-muted);
            border-color: var(--wf-border-strong);
        }

        /* Actions list */
        #workflow-panel .wf-step-item.collapsed .wf-actions-list {
            display: none;
        }

        #workflow-panel .wf-actions-list {
            padding: 2px 10px 8px 32px;
            display: flex;
            flex-direction: column;
            gap: 2px;
        }

        #workflow-panel .wf-action-item {
            display: flex;
            align-items: center;
            gap: 5px;
            padding: 4px 8px;
            background: white;
            border-radius:var(--wf-radius-sm);
            border-left: 2px solid var(--wf-border);
            transition: all 0.15s;
            position: relative;
        }

        #workflow-panel .wf-step-item.completed .wf-action-item {
            border-left-color: var(--wf-success-border);
        }
        #workflow-panel .wf-step-item.current .wf-action-item {
            border-left-color: var(--wf-primary-border);
        }

        #workflow-panel .wf-action-item.current-action {
            background: var(--wf-primary-light);
            border-left-color: var(--wf-primary);
            border-left-width: 3px;
        }

        #workflow-panel .wf-action-item.error-action {
            background: var(--wf-error-light);
            border-left-color: var(--wf-error-accent);
            border-left-width: 3px;
        }

        #workflow-panel .wf-action-item.bypassed {
            opacity: 0.45;
        }

        #workflow-panel .wf-action-exec-btn {
            width: 18px;
            height: 18px;
            padding: 0;
            font-size: 9px;
            background: var(--wf-surface-muted);
            color: var(--wf-success-accent);
            border: 1px solid var(--wf-border);
            border-radius:var(--wf-radius-sm);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            transition: all 0.15s;
            order: 999;
        }
        #workflow-panel .wf-action-exec-btn:hover {
            background: var(--wf-success-light);
            border-color: var(--wf-success-border);
        }

        #workflow-panel .wf-action-content {
            flex: 1;
            min-width: 0;
            display: flex;
            flex-direction: column;
            gap: 1px;
        }

        #workflow-panel .wf-action-type {
            display: inline-block;
            font-size: 10px;
            font-weight: 600;
            color: var(--wf-text-muted);
            background: var(--wf-surface-muted);
            padding: 1px 4px;
            border-radius:var(--wf-radius-sm);
            text-transform: uppercase;
            letter-spacing: 0.3px;
            border: 1px solid var(--wf-border);
            line-height: 1.2;
            margin-left: 6px;
            vertical-align: middle;
        }

        #workflow-panel .wf-action-desc {
            font-size: 12px;
            font-weight: 500;
            color: var(--wf-text);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            display: flex;
            align-items: center;
        }

        #workflow-panel .wf-action-meta {
            font-size: 9px;
            color: var(--wf-text-muted);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        /* Small action buttons */
        #workflow-panel .wf-action-sm-btn {
            padding: 1px 5px;
            font-size: 9px;
            border: 1px solid var(--wf-border);
            background: white;
            border-radius:var(--wf-radius-sm);
            cursor: pointer;
            color: var(--wf-text-secondary);
            white-space: nowrap;
            transition: all 0.15s;
            flex-shrink: 0;
        }
        #workflow-panel .wf-action-sm-btn:hover {
            background: var(--wf-surface-muted);
            border-color: var(--wf-border-strong);
        }
        #workflow-panel .wf-action-sm-btn.edit-btn {
            color: var(--wf-warning-accent);
            border-color: var(--wf-warning-border);
        }
        #workflow-panel .wf-action-sm-btn.edit-btn:hover {
            background: var(--wf-warning-light);
        }
        #workflow-panel .wf-action-sm-btn.highlight-btn {
            color: var(--wf-primary-dark);
            border-color: var(--wf-primary-border);
        }
        #workflow-panel .wf-action-sm-btn.highlight-btn:hover {
            background: var(--wf-primary-light);
        }
        #workflow-panel .wf-action-sm-btn.jump-btn {
            color: var(--wf-success-accent);
            border-color: var(--wf-success-border);
            font-size: 10px;
            line-height: 1;
        }
        #workflow-panel .wf-action-sm-btn.jump-btn:hover {
            background: var(--wf-success-light);
        }

        /* Unified toggle switch - 统一的开关样式 */
        /* ========== Toggle 开关 ========== */
        #workflow-panel .wf-toggle {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s;
            flex-shrink: 0;
            user-select: none;
            font-size: 14px;
            position: relative;
        }

        /* 滑块开关（启用/禁用） */
        #workflow-panel .wf-toggle-enable {
            width: 32px;
            height: 18px;
            background: var(--wf-surface-muted);
            border: 1px solid var(--wf-border);
            border-radius: var(--wf-radius-pill);
            padding: 0;
            box-sizing: border-box;
            position: relative;
        }

        /* 滑块内的圆形指示器 */
        #workflow-panel .wf-toggle-enable::after {
            content: '';
            position: absolute;
            width: 12px;
            height: 12px;
            background: white;
            border-radius: 50%;
            top: 50%;
            left: 2px;
            transform: translateY(-50%);
            transition: left 0.2s;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        /* 启用时，滑块右移 + 背景绿色 */
        #workflow-panel .wf-toggle-enable.active {
            background: var(--wf-success);
            border-color: var(--wf-success-hover);
        }

        #workflow-panel .wf-toggle-enable.active::after {
            left: 18px;
        }

        #workflow-panel .wf-toggle-enable:hover {
            border-color: var(--wf-border-strong);
        }

        /* 手动开关（手图标） */
        #workflow-panel .wf-toggle-manual {
            width: 24px;
            height: 24px;
            color: var(--wf-text-muted);
            opacity: 0.5;
        }

        /* 手动激活时，图标亮起 + 橙色 */
        #workflow-panel .wf-toggle-manual.active {
            color: var(--wf-warning);
            opacity: 1;
        }

        #workflow-panel .wf-toggle-manual:hover {
            opacity: 0.8;
        }

        /* 缓存开关（卡片索引盒图标，仅上传动作）—— 点亮=缓存已启用；关闭时暗淡，参考手动开关样式 */
        #workflow-panel .wf-toggle-cache {
            width: 24px;
            height: 24px;
            color: var(--wf-text-muted);
            opacity: 0.5;
        }
        #workflow-panel .wf-toggle-cache.active {
            color: var(--wf-primary);
            opacity: 1;
        }
        #workflow-panel .wf-toggle-cache:hover {
            opacity: 0.8;
        }


        /* ========== Sidebar ========== */
        #workflow-panel .wf-sidebar {
            width: 240px;
            min-width: 200px;
            border-left: 1px solid var(--wf-border-muted);
            display: flex;
            flex-direction: column;
            padding: 12px;
            gap: 10px;
            background: var(--wf-surface-2);
            overflow: hidden;
        }

        #workflow-panel .wf-sidebar-section {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }

        #workflow-panel .wf-sidebar-title {
            font-size: 11px;
            font-weight: 600;
            color: var(--wf-text-secondary);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        #workflow-panel .wf-sidebar .wf-select {
            width: 100%;
            padding: 5px 8px;
            border: 1px solid var(--wf-border);
            border-radius:var(--wf-radius-md);
            font-size: 12px;
            background: white;
            color: var(--wf-text-heading);
            cursor: pointer;
        }
        #workflow-panel .wf-sidebar .wf-select:focus {
            outline: none;
            border-color: var(--wf-primary);
            box-shadow: 0 0 0 2px var(--wf-primary-focus);
        }

        #workflow-panel .wf-sidebar .wf-sm-btns {
            display: flex;
            gap: 4px;
            flex-wrap: wrap;
        }

        #workflow-panel .wf-sidebar .wf-sm-btn {
            padding: 4px 8px;
            font-size: 11px;
            border: 1px solid var(--wf-border);
            background: white;
            border-radius:var(--wf-radius-md);
            cursor: pointer;
            color: var(--wf-text-secondary);
            transition: all 0.15s;
        }
        #workflow-panel .wf-sidebar .wf-sm-btn:hover {
            background: var(--wf-border-muted);
            border-color: var(--wf-border-strong);
        }

        #workflow-panel .wf-sidebar .wf-edit-config-btn {
            width: 100%;
            padding: 6px 10px;
            border: 1px dashed var(--wf-border-strong);
            background: white;
            border-radius:var(--wf-radius-md);
            cursor: pointer;
            color: var(--wf-primary);
            font-size: 12px;
            font-weight: 500;
            transition: all 0.15s;
            text-align: center;
        }
        #workflow-panel .wf-sidebar .wf-edit-config-btn:hover {
            background: var(--wf-primary-light);
            border-color: var(--wf-primary);
        }

        /* Log area */
        #workflow-panel .wf-log-section {
            flex: 1;
            display: flex;
            flex-direction: column;
            min-height: 0;
            overflow: hidden;
        }

        #workflow-panel .wf-log-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 4px;
        }

        #workflow-panel .wf-log-area {
            flex: 1;
            background: var(--wf-log-bg);
            color: var(--wf-log-text);
            padding: 8px 10px;
            border-radius:var(--wf-radius-md);
            overflow-y: auto;
            font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
            font-size: 10px;
            line-height: 1.5;
        }

        #workflow-panel .wf-log-area::-webkit-scrollbar {
            width: 4px;
        }
        #workflow-panel .wf-log-area::-webkit-scrollbar-thumb {
            background: var(--wf-log-border);
            border-radius:var(--wf-radius-sm);
        }

        #workflow-panel .log-item {
            padding: 2px 0;
            border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        #workflow-panel .log-item:last-child { border-bottom: none; }
        #workflow-panel .log-item.success { color: var(--wf-log-success); }
        #workflow-panel .log-item.error { color: var(--wf-log-error); }
        #workflow-panel .log-item.info { color: var(--wf-log-info); }
        #workflow-panel .log-item.warning { color: var(--wf-log-warning); }

        /* ========== Resize Handles ========== */
        #workflow-panel .resize-handle {
            position: absolute;
            width: 16px;
            height: 16px;
            z-index: 10;
        }
        #workflow-panel .resize-handle-br { bottom: 0; right: 0; cursor: nwse-resize; }
        #workflow-panel .resize-handle-bl { bottom: 0; left: 0; cursor: nesw-resize; }
        #workflow-panel .resize-handle-tr { top: 0; right: 0; cursor: nesw-resize; }
        #workflow-panel .resize-handle-tl { top: 0; left: 0; cursor: nwse-resize; }

        /* ========== Highlight Animation ========== */
        @keyframes highlightPulse {
            0%, 100% { box-shadow: 0 0 0 2px rgba(66, 153, 225, 0.5); }
            50% { box-shadow: 0 0 0 6px rgba(66, 153, 225, 0.2); }
        }

        .workflow-highlight-element {
            animation: highlightPulse 1s ease-in-out infinite;
            outline: 2px solid var(--wf-primary) !important;
        }

        /* ========== Modal Overrides ========== */
        @keyframes wfModalFadeIn {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
        }

        .wf-modal .wf-modal-dialog {
            animation: wfModalFadeIn 0.2s ease-out;
        }

        /* ========== 键盘焦点环（可达性）==========
           仅键盘 Tab 聚焦时显示焦点环，鼠标点击不显示（避免视觉噪音）。
           ID 作用域优先级高于 .wf-select:focus 的 outline:none，
           故 select 键盘聚焦时焦点环仍会显示（叠加其 box-shadow 聚焦环）。
           输入框的内联 outline:none 已移除，使本规则生效。 */
        #workflow-panel :focus-visible,
        #workflow-floating-btn:focus-visible,
        .wf-modal :focus-visible,
        #config-editor-modal :focus-visible,
        #visual-editor-modal :focus-visible,
        #wf-confirm-overlay :focus-visible {
            outline: 2px solid var(--wf-primary);
            outline-offset: 2px;
        }
    `);
    }

    // 状态管理 - 全局状态变量及 getter/setter
    const STATE_STORAGE_KEY = 'workflow_autofill_state';
    const RUNTIME_OVERRIDES_KEY = 'workflow_runtime_overrides';

    let workflow = null;
    let workflowList = [];
    let activeWorkflowId = null;
    let isRunning = false;
    let stopRequested = false;
    let currentStepIndex = -1;
    let currentActionIndex = -1;
    let dragData = { isDragging: false, hasDragged: false, startX: 0, startY: 0, startRight: 20, startTop: 20 };

    // 浮动按钮位置状态
    let floatingBtnPosition = { right: 24, bottom: 24 };
    let floatingBtnDragData = { isDragging: false, startX: 0, startY: 0, startRight: 0, startBottom: 0 };
    let logs = [];
    let autoContinue = false;
    let lastUrl = window.location.href;
    let workflowCompleted = false;
    let waitingForUserAction = false;
    let pendingAction = null;
    let currentValueEditAction = null;
    let currentSelectorEditAction = null;
    let autoContinueTimer = null;
    let resizeData = {
        isResizing: false,
        corner: null,
        startMouseX: 0,
        startMouseY: 0,
        startWidth: 0,
        startHeight: 0,
        anchorLeft: 0,
        anchorTop: 0
    };

    // Goto 跳转状态
    let gotoTarget = null;
    let gotoJustJumped = false;

    // 运行时覆盖
    let runtimeOverrides = {};

    // 运行时变量：由 extract / setVariable 动作写入，重置工作流时清空
    let runtimeVariables = {};
    function setRuntimeVariables(v) { runtimeVariables = v; }

    // 自动匹配待执行标记：工作流执行完毕后需要自动匹配，跳转到新页面时使用
    // 跨页面持久化，保存到 GM 存储
    let autoMatchPending = false;
    function setAutoMatchPending(v) { autoMatchPending = v; }

    // Setters
    function setWorkflow(v) { workflow = v; }
    function setWorkflowList(v) { workflowList = v; }
    function setActiveWorkflowId(v) { activeWorkflowId = v; }
    function setIsRunning(v) { isRunning = v; }
    function setStopRequested(v) { stopRequested = v; }
    function setCurrentStepIndex(v) { currentStepIndex = v; }
    function setCurrentActionIndex(v) { currentActionIndex = v; }
    function setFloatingBtnPosition(v) { floatingBtnPosition = v; }
    function setLogs(v) { logs = v; }
    function setAutoContinue(v) { autoContinue = v; }
    function setLastUrl(v) { lastUrl = v; }
    function setWorkflowCompleted(v) { workflowCompleted = v; }
    function setWaitingForUserAction(v) { waitingForUserAction = v; }
    function setPendingAction(v) { pendingAction = v; }
    function setCurrentValueEditAction(v) { currentValueEditAction = v; }
    function setCurrentSelectorEditAction(v) { currentSelectorEditAction = v; }
    function setAutoContinueTimer(v) { autoContinueTimer = v; }
    function setGotoTarget(v) { gotoTarget = v; }
    function setGotoJustJumped(v) { gotoJustJumped = v; }
    function setRuntimeOverrides(v) { runtimeOverrides = v; }

    // 状态存储（跨标签页）
    function saveState() {
        const stateData = {
            workflowName: workflow ? workflow.name : '',
            currentStepIndex: currentStepIndex,
            currentActionIndex: currentActionIndex,
            isRunning: isRunning,
            autoContinue: autoContinue,
            workflowCompleted: workflowCompleted,
            // 运行时变量随执行状态一起持久化，确保翻页后内容不丢失
            runtimeVariables: runtimeVariables,
            // 自动匹配待执行标记：工作流完成后跳转到新页面时使用
            autoMatchPending: autoMatchPending,
            timestamp: Date.now()
        };
        GM_setValue(STATE_STORAGE_KEY, stateData);
    }

    function loadState() {
        try {
            const stored = GM_getValue(STATE_STORAGE_KEY);
            if (stored) {
                return stored;
            }
        } catch (e) {
            console.error('Failed to load state:', e);
        }
        return null;
    }

    function clearState() {
        GM_setValue(STATE_STORAGE_KEY, null);
    }

    // 运行时覆盖管理
    function initRuntimeOverrides() {
        setRuntimeOverrides(GM_getValue(RUNTIME_OVERRIDES_KEY, {}));
    }

    function saveRuntimeOverrides() {
        GM_setValue(RUNTIME_OVERRIDES_KEY, runtimeOverrides);
    }

    function getWorkflowOverrides(workflowId) {
        if (!runtimeOverrides[workflowId]) {
            runtimeOverrides[workflowId] = { steps: {}, actions: {} };
        }
        return runtimeOverrides[workflowId];
    }

    function getStepOverride(workflowId, stepIndex, key) {
        const ov = runtimeOverrides[workflowId];
        if (!ov || !ov.steps || !ov.steps[stepIndex]) return undefined;
        return ov.steps[stepIndex][key];
    }

    function setStepOverride(workflowId, stepIndex, key, value) {
        const ov = getWorkflowOverrides(workflowId);
        if (!ov.steps[stepIndex]) ov.steps[stepIndex] = {};
        ov.steps[stepIndex][key] = value;
        saveRuntimeOverrides();
    }

    function getActionOverride(workflowId, stepIndex, actionIndex, key) {
        const ov = runtimeOverrides[workflowId];
        if (!ov || !ov.actions) return undefined;
        const actionKey = `${stepIndex}-${actionIndex}`;
        if (!ov.actions[actionKey]) return undefined;
        return ov.actions[actionKey][key];
    }

    function setActionOverride(workflowId, stepIndex, actionIndex, key, value) {
        const ov = getWorkflowOverrides(workflowId);
        const actionKey = `${stepIndex}-${actionIndex}`;
        if (!ov.actions[actionKey]) ov.actions[actionKey] = {};
        ov.actions[actionKey][key] = value;
        saveRuntimeOverrides();
    }

    function clearWorkflowOverrides(workflowId) {
        delete runtimeOverrides[workflowId];
        saveRuntimeOverrides();
    }

    // 获取有效值（运行时覆盖 > 配置值 > 默认值）
    function getEffectiveStepBypass(stepIndex) {
        const override = getStepOverride(activeWorkflowId, stepIndex, 'bypass');
        if (override !== undefined) return override;
        const step = workflow.steps[stepIndex];
        return step.bypass || false;
    }

    function getEffectiveActionBypass(stepIndex, actionIndex) {
        const override = getActionOverride(activeWorkflowId, stepIndex, actionIndex, 'bypass');
        if (override !== undefined) return override;
        const action = workflow.steps[stepIndex].actions[actionIndex];
        return action.bypass || false;
    }

    function getEffectiveActionWaitUser(stepIndex, actionIndex) {
        const override = getActionOverride(activeWorkflowId, stepIndex, actionIndex, 'waitUserAction');
        if (override !== undefined) return override;
        const action = workflow.steps[stepIndex].actions[actionIndex];
        return action.waitUserAction || false;
    }

    function getEffectiveActionValue(stepIndex, actionIndex) {
        const override = getActionOverride(activeWorkflowId, stepIndex, actionIndex, 'value');
        if (override !== undefined) return override;
        const action = workflow.steps[stepIndex].actions[actionIndex];
        return action.value;
    }

    // 获取生效选择器（运行时覆盖优先，供执行器与 UI 共用）
    function getEffectiveActionSelector(stepIndex, actionIndex) {
        const override = getActionOverride(activeWorkflowId, stepIndex, actionIndex, 'selector');
        if (override !== undefined) return override;
        const action = workflow.steps[stepIndex].actions[actionIndex];
        return action.selector;
    }

    // 获取上传动作的有效缓存开关（运行时覆盖优先；默认启用，cache 显式为 false 时禁用）
    function getEffectiveActionCache(stepIndex, actionIndex) {
        const override = getActionOverride(activeWorkflowId, stepIndex, actionIndex, 'cache');
        if (override !== undefined) return override;
        const action = workflow.steps[stepIndex].actions[actionIndex];
        return action.cache !== false;
    }

    // 默认工作流配置 - 根据你的需求修改
    const DEFAULT_WORKFLOW = {
        name: "测试工作流",
        version: "1.0.0",
        enabled: true,
        group: "",                   // 分组名称，空字符串归入"未分组"
        order: 0,                    // 组内排序权重，数字越小越靠前
        description: "这是一个测试工作流，用于演示表单自动填写功能。\n\n使用步骤：\n1. 打开目标网页\n2. 点击工作流面板的「开始执行」按钮\n3. 脚本会自动填写表单\n4. 如遇错误可手动处理后点击「继续」",

        // 全局变量（可在动作中使用 ${变量名} 引用）
        variables: {
            username: "test_user",
            email: "test@example.com",
            phone: "13800138000",
            password: "Test123456",
            city: "深圳市",
            address: "广东省深圳市南山区"
        },

        // 执行配置
        execution: {
            stepDelay: 300,                  // 动作间延迟
            onError: "continue",             // 错误处理: "continue" (继续执行)、"stop" (停止执行) 或 "manual" (等待用户手动处理)
            autoMatchOnComplete: false,      // 整个工作流执行完毕后，是否根据当前页面 URL 快速匹配并切换到匹配的工作流（等同点击面板⚡图标）
            autoMatchDelay: 800              // 自动匹配前的延迟时间（毫秒），用于等待页面跳转完成。默认 800ms，适用于登录后跳转等场景
        },

        // 步骤序列
        steps: [
            {
                name: "步骤1: 基础信息填写",
                actions: [
                    { type: "fill", selector: "#username", value: "${username}" },
                    { type: "fill", selector: "#email", value: "${email}" },
                    { type: "select", selector: "#city", value: "${city}" },
                    { type: "click", selector: "#nextBtn" }
                ]
            },
            {
                name: "步骤2: 详细信息",
                actions: [
                    { type: "fill", selector: "#phone", value: "${phone}" },
                    { type: "fill", selector: "#code", value: "123456" },
                    { type: "click", selector: "#submitBtn" }
                ]
            }
        ]
    };

    function addLog(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        logs.push({ timestamp, message, type });
        if (logs.length > 100) logs.shift();
        renderLogs();
        console.log(`[工作流] ${message}`);
    }

    function renderLogs() {
        const logArea = document.getElementById('workflow-log-area');
        if (!logArea) return;

        logArea.innerHTML = logs.map(log => `
        <div class="log-item ${log.type}">
            <span style="color: var(--wf-log-muted);">[${log.timestamp}]</span> ${log.message}
        </div>
    `).join('');

        logArea.scrollTop = logArea.scrollHeight;
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // 安全地调度自动继续执行，清除之前的 pending timer 防止竞态
    // 注意: executeWorkflow 由外部注入，避免循环依赖
    let _executeWorkflow = null;
    function setExecuteWorkflowRef(fn) { _executeWorkflow = fn; }

    function scheduleAutoContinue(delayMs) {
        if (autoContinueTimer) {
            clearTimeout(autoContinueTimer);
            setAutoContinueTimer(null);
        }
        setAutoContinueTimer(setTimeout(() => {
            setAutoContinueTimer(null);
            if (!isRunning && autoContinue && !stopRequested) {
                if (_executeWorkflow) _executeWorkflow(true);
            }
        }, delayMs));
    }

    function replaceVariables(str, variables) {
        if (typeof str !== 'string') return str;
        // 整个字符串就是单个变量引用时，直接返回原始值（保留数组、数字等类型，避免被 replace 强转成字符串）
        const singleVarMatch = str.match(/^\$\{(\w+)\}$/);
        if (singleVarMatch) {
            const key = singleVarMatch[1];
            return variables[key] !== undefined ? variables[key] : str;
        }
        return str.replace(/\$\{(\w+)\}/g, (match, key) => {
            return variables[key] !== undefined ? variables[key] : match;
        });
    }

    function getElement(selector, timeout = 5000, index = 0) {
        return new Promise((resolve, reject) => {
            const isXPath = selector.startsWith('/') || selector.startsWith('(');

            if (isXPath) {
                const element = getElementByXPath(selector);
                if (element) { resolve(element); return; }

                const startTime = Date.now();
                const interval = setInterval(() => {
                    if (stopRequested) {
                        clearInterval(interval);
                        reject(new Error(`Stopped: ${selector}`));
                        return;
                    }
                    const el = getElementByXPath(selector);
                    if (el) {
                        clearInterval(interval);
                        resolve(el);
                    } else if (Date.now() - startTime > timeout) {
                        clearInterval(interval);
                        reject(new Error(`Element not found: ${selector}`));
                    }
                }, 100);
            } else {
                const findByIndex = () => {
                    if (index > 0) {
                        const els = document.querySelectorAll(selector);
                        return els.length > index ? els[index] : null;
                    }
                    return document.querySelector(selector);
                };

                const element = findByIndex();
                if (element) { resolve(element); return; }

                const startTime = Date.now();
                const interval = setInterval(() => {
                    if (stopRequested) {
                        clearInterval(interval);
                        reject(new Error(`Stopped: ${selector}`));
                        return;
                    }
                    const el = findByIndex();
                    if (el) {
                        clearInterval(interval);
                        resolve(el);
                    } else if (Date.now() - startTime > timeout) {
                        clearInterval(interval);
                        reject(new Error(`Element not found: ${selector} (index: ${index})`));
                    }
                }, 100);
            }
        });
    }

    function getElementByXPath(xpath) {
        const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        return result.singleNodeValue;
    }

    // 统计选择器匹配到的元素数量（支持 CSS 选择器与 XPath），用于高亮排查等场景
    function countElements(selector) {
        if (!selector) return 0;
        const isXPath = selector.startsWith('/') || selector.startsWith('(');
        if (isXPath) {
            try {
                const result = document.evaluate(selector, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
                return result.snapshotLength;
            } catch (e) {
                return 0;
            }
        }
        try {
            return document.querySelectorAll(selector).length;
        } catch (e) {
            return 0;
        }
    }

    function waitForElement(selector, timeout = 5000) {
        return getElement(selector, timeout);
    }

    // 取选择器匹配到的全部元素（支持 CSS 选择器与 XPath），用于 extract 的 all 批量模式
    function getAllElements(selector) {
        if (!selector) return [];
        const isXPath = selector.startsWith('/') || selector.startsWith('(');
        if (isXPath) {
            try {
                const result = document.evaluate(selector, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
                const els = [];
                for (let i = 0; i < result.snapshotLength; i++) els.push(result.snapshotItem(i));
                return els;
            } catch (e) {
                return [];
            }
        }
        try {
            return Array.from(document.querySelectorAll(selector));
        } catch (e) {
            return [];
        }
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // 剪贴板写入：系统能力封装，供 copy 动作与模态框复制按钮共用
    // 优先 GM_setClipboard（油猴标准能力，无手势/焦点/secure context 要求，不受页面 CSP 限制），
    // 降级 navigator.clipboard（需 secure context），最后 execCommand 兜底。
    // 返回实际使用的方式，供执行日志展示。

    async function writeClipboard(text, mimeType = 'text') {
        if (typeof GM_setClipboard === 'function') {
            GM_setClipboard(text, mimeType);
            return 'GM_setClipboard';
        }
        if (navigator.clipboard && window.isSecureContext) {
            try {
                if (mimeType === 'html' && typeof ClipboardItem !== 'undefined') {
                    await navigator.clipboard.write([new ClipboardItem({
                        'text/html': new Blob([text], { type: 'text/html' }),
                        'text/plain': new Blob([text], { type: 'text/plain' })
                    })]);
                } else {
                    await navigator.clipboard.writeText(text);
                }
                return 'clipboard-api';
            } catch (e) {
                // 权限不足等，继续降级
            }
        }
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0;';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        let ok = false;
        try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
        ta.remove();
        if (!ok) throw new Error('剪贴板写入失败（GM_setClipboard / Clipboard API / execCommand 均不可用）');
        return 'execCommand';
    }

    // 轻量级 Toast 通知 + 确认对话框（替代 alert/confirm）

    let toastContainer = null;

    function ensureContainer() {
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'wf-toast-container';
            toastContainer.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:200000;display:flex;flex-direction:column;align-items:center;gap:8px;pointer-events:none;';
            document.body.appendChild(toastContainer);
        }
        return toastContainer;
    }

    /**
     * 显示 toast 通知
     * @param {string} message
     * @param {'success'|'error'|'warning'|'info'} type
     * @param {number} duration - 显示时长（ms）
     */
    function showToast(message, type = 'info', duration = 3000) {
        const container = ensureContainer();

        const colors = {
            success: { bg: 'var(--wf-success-light)', border: 'var(--wf-success-border)', color: 'var(--wf-success-text)', icon: '✓' },
            error: { bg: 'var(--wf-error-light)', border: 'var(--wf-error-accent)', color: 'var(--wf-error-text)', icon: '✗' },
            warning: { bg: 'var(--wf-warning-light)', border: 'var(--wf-warning-border)', color: 'var(--wf-warning-text)', icon: '⚠' },
            info: { bg: 'var(--wf-primary-light)', border: 'var(--wf-primary-border)', color: 'var(--wf-primary-text)', icon: 'ℹ' }
        };

        const c = colors[type] || colors.info;

        const toast = document.createElement('div');
        toast.style.cssText = `
        padding: 10px 18px;
        background: ${c.bg};
        border: 1px solid ${c.border};
        border-radius:var(--wf-radius-lg);
        color: ${c.color};
        font-size: 13px;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        pointer-events: auto;
        opacity: 0;
        transform: translateY(-8px);
        transition: opacity 0.2s, transform 0.2s;
        max-width: 400px;
        text-align: center;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
        toast.textContent = `${c.icon} ${message}`;

        container.appendChild(toast);

        // fade in
        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateY(0)';
        });

        // auto dismiss
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-8px)';
            setTimeout(() => toast.remove(), 200);
        }, duration);
    }

    /**
     * 显示确认对话框（替代 confirm）
     * @param {string} message
     * @param {object} options
     * @returns {Promise<boolean>}
     */
    function showConfirm(message, options = {}) {
        const { title = '确认操作', confirmText = '确定', cancelText = '取消', type = 'warning' } = options;

        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.id = 'wf-confirm-overlay';
            overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:200001;display:flex;align-items:center;justify-content:center;background:var(--wf-overlay);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;';

            // P0: 确认按钮实色白字用 -600/-700 档，确保对比度达标
            const colors = {
                warning: { btn: 'var(--wf-warning)', hover: 'var(--wf-warning-hover)' },
                danger: { btn: 'var(--wf-error)', hover: 'var(--wf-error-hover)' },
                info: { btn: 'var(--wf-primary-dark)', hover: 'var(--wf-primary-darker)' }
            };
            const c = colors[type] || colors.warning;

            const dialog = document.createElement('div');
            dialog.style.cssText = `
            background: var(--wf-surface);
            border-radius:var(--wf-radius-xl);
            box-shadow: 0 20px 60px rgba(0,0,0,0.2);
            padding: 24px;
            min-width: 320px;
            max-width: 420px;
            animation: wfModalFadeIn 0.15s ease-out;
        `;

            dialog.innerHTML = `
            <div style="font-size:16px;font-weight:600;color:var(--wf-text);margin-bottom:12px;">${title}</div>
            <div style="font-size:14px;color:var(--wf-text-secondary);line-height:1.5;margin-bottom:20px;">${message}</div>
            <div style="display:flex;justify-content:flex-end;gap:8px;">
                <button id="wf-confirm-cancel" style="padding:7px 16px;border:1px solid var(--wf-border);background:var(--wf-surface);border-radius:var(--wf-radius-md);font-size:13px;cursor:pointer;color:var(--wf-text-secondary);transition:background 0.15s;">${cancelText}</button>
                <button id="wf-confirm-ok" style="padding:7px 16px;border:none;background:${c.btn};color:white;border-radius:var(--wf-radius-md);font-size:13px;font-weight:500;cursor:pointer;transition:background 0.15s;">${confirmText}</button>
            </div>
        `;

            overlay.appendChild(dialog);
            document.body.appendChild(overlay);

            const cancelBtn = dialog.querySelector('#wf-confirm-cancel');
            const okBtn = dialog.querySelector('#wf-confirm-ok');

            function close(result) {
                overlay.remove();
                resolve(result);
            }

            cancelBtn.onclick = () => close(false);
            okBtn.onclick = () => close(true);
            overlay.onclick = (e) => { if (e.target === overlay) close(false); };

            // keyboard
            function onKey(e) {
                if (e.key === 'Escape') { document.removeEventListener('keydown', onKey); close(false); }
                if (e.key === 'Enter') { document.removeEventListener('keydown', onKey); close(true); }
            }
            document.addEventListener('keydown', onKey);

            okBtn.focus();
        });
    }

    // 当前活动模态框实例：stopWorkflow 等外部事件需要强制关闭挂起的模态框，
    // 避免 await 它的动作 Promise 永久挂起、卡死工作流
    let activeModal = null;

    /**
     * 强制关闭当前活动模态框（结果为 'forced'），无活动模态框时静默
     */
    function closeActiveModal() {
        if (activeModal) activeModal.close('forced');
    }

    /**
     * 通用模态框（showConfirm 的扩展版：支持任意已转义 HTML 内容、复制按钮、超时自动关闭）
     * @param {object} options
     * @param {string} options.title - 标题
     * @param {string} options.contentHtml - 内容 HTML（调用方负责 escapeHtml，防 XSS）
     * @param {'ok'|'okCancel'} options.buttons - 按钮组：仅确定 / 确定+取消
     * @param {number} options.width - 最大宽度（px）
     * @param {number} options.timeout - >0 时到时自动关闭并 resolve('timeout')
     * @param {string|null} options.copyText - 提供时展示"复制"按钮（复用 writeClipboard）
     * @returns {Promise<'ok'|'cancel'|'timeout'|'forced'>}
     */
    function showModal(options = {}) {
        const {
            title = '提示',
            contentHtml = '',
            buttons = 'ok',
            okText = '确定',
            cancelText = '取消',
            width = 460,
            timeout = 0,
            copyText = null
        } = options;

        // 防御：同一时刻只保留一个模态框（工作流顺序执行，正常不会叠加）
        closeActiveModal();

        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.id = 'wf-modal-overlay';
            overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:200001;display:flex;align-items:center;justify-content:center;background:var(--wf-overlay);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;';

            const dialog = document.createElement('div');
            dialog.style.cssText = `
            background: var(--wf-surface);
            border-radius:var(--wf-radius-xl);
            box-shadow: 0 20px 60px rgba(0,0,0,0.2);
            padding: 20px 24px;
            min-width: 320px;
            max-width: ${width}px;
            animation: wfModalFadeIn 0.15s ease-out;
        `;

            // 关闭语义：okCancel 模式下 Escape/遮罩点击视为取消；ok 模式下视为确定（关闭即确认）
            const hasCancel = buttons === 'okCancel';
            const dismissAs = hasCancel ? 'cancel' : 'ok';

            const copyBtnHtml = copyText !== null
                ? `<button id="wf-modal-copy" style="padding:4px 10px;border:1px solid var(--wf-border);background:var(--wf-surface);border-radius:var(--wf-radius-md);font-size:12px;cursor:pointer;color:var(--wf-text-secondary);transition:all 0.15s;" title="复制内容到剪贴板">📋 复制</button>`
                : '';

            dialog.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:12px;">
                <div style="font-size:16px;font-weight:600;color:var(--wf-text);">${title}</div>
                ${copyBtnHtml}
            </div>
            <div style="max-height:60vh;overflow:auto;margin-bottom:20px;">${contentHtml}</div>
            <div style="display:flex;justify-content:flex-end;gap:8px;">
                ${hasCancel ? `<button id="wf-modal-cancel" style="padding:7px 16px;border:1px solid var(--wf-border);background:var(--wf-surface);border-radius:var(--wf-radius-md);font-size:13px;cursor:pointer;color:var(--wf-text-secondary);transition:background 0.15s;">${cancelText}</button>` : ''}
                <button id="wf-modal-ok" style="padding:7px 16px;border:none;background:var(--wf-primary-dark);color:white;border-radius:var(--wf-radius-md);font-size:13px;font-weight:500;cursor:pointer;transition:background 0.15s;">${okText}</button>
            </div>
        `;

            overlay.appendChild(dialog);
            document.body.appendChild(overlay);

            const okBtn = dialog.querySelector('#wf-modal-ok');
            const cancelBtn = dialog.querySelector('#wf-modal-cancel');
            const copyBtn = dialog.querySelector('#wf-modal-copy');

            let timer = null;

            function close(result) {
                if (!overlay.isConnected) return;
                clearTimeout(timer);
                document.removeEventListener('keydown', onKey);
                overlay.remove();
                if (activeModal && activeModal.overlay === overlay) activeModal = null;
                resolve(result);
            }

            okBtn.onclick = () => close('ok');
            if (cancelBtn) cancelBtn.onclick = () => close('cancel');
            overlay.onclick = (e) => { if (e.target === overlay) close(dismissAs); };

            if (copyBtn) {
                copyBtn.onclick = async () => {
                    try {
                        await writeClipboard(copyText, 'text');
                        copyBtn.textContent = '✓ 已复制';
                        copyBtn.style.color = 'var(--wf-success-text)';
                        setTimeout(() => {
                            copyBtn.textContent = '📋 复制';
                            copyBtn.style.color = 'var(--wf-text-secondary)';
                        }, 1500);
                    } catch (e) {
                        copyBtn.textContent = '✗ 失败';
                        setTimeout(() => { copyBtn.textContent = '📋 复制'; }, 1500);
                    }
                };
            }

            // keyboard
            function onKey(e) {
                if (e.key === 'Escape') close(dismissAs);
                if (e.key === 'Enter') close('ok');
            }
            document.addEventListener('keydown', onKey);

            // 超时自动关闭
            if (timeout > 0) {
                timer = setTimeout(() => close('timeout'), timeout);
            }

            activeModal = { overlay, close };
            okBtn.focus();
        });
    }

    // 模拟完整的鼠标点击事件流
    async function simulateClick(element) {
        if (!element) return;

        const win = element.ownerDocument?.defaultView || window;

        const mouseDownEvent = new MouseEvent('mousedown', {
            bubbles: true, cancelable: true, view: win, buttons: 1, button: 0, clientX: 0, clientY: 0
        });
        element.dispatchEvent(mouseDownEvent);

        await sleep(50);

        if (element.focus) element.focus();

        await sleep(50);

        const mouseUpEvent = new MouseEvent('mouseup', {
            bubbles: true, cancelable: true, view: win, buttons: 0, button: 0, clientX: 0, clientY: 0
        });
        element.dispatchEvent(mouseUpEvent);

        await sleep(50);

        const clickEvent = new MouseEvent('click', {
            bubbles: true, cancelable: true, view: win, buttons: 0, button: 0, detail: 1, clientX: 0, clientY: 0
        });
        element.dispatchEvent(clickEvent);
    }

    // 查找下拉框
    function findDropdown(triggerElement) {
        const dropdownId = triggerElement.getAttribute('aria-controls') ||
                           triggerElement.getAttribute('aria-owns');
        if (dropdownId) {
            const dropdown = document.getElementById(dropdownId);
            if (dropdown) {
                console.log('[findDropdown] 通过 aria-controls/aria-owns 找到:', dropdownId);
                return dropdown;
            }
        }

        const dropdownSelectors = [
            '[role="listbox"]',
            '.ant-select-dropdown:not(.ant-select-dropdown-hidden)',
            '.el-select-dropdown',
            '.dropdown-menu',
            '.select-dropdown',
            'div[class*="dropdown"]'
        ];

        for (const sel of dropdownSelectors) {
            const dropdowns = document.querySelectorAll(sel);
            for (const dropdown of dropdowns) {
                if (dropdown.style.display !== 'none' &&
                    dropdown.style.visibility !== 'hidden' &&
                    !dropdown.classList.contains('hidden')) {
                    console.log('[findDropdown] 通过选择器找到:', sel);
                    return dropdown;
                }
            }
        }

        return null;
    }

    // 判断下拉框是否打开
    function isDropdownOpen(dropdown) {
        if (!dropdown) return false;

        const isVisible = dropdown.style.display !== 'none' &&
                        dropdown.style.visibility !== 'hidden' &&
                        !dropdown.classList.contains('hidden') &&
                        !dropdown.classList.contains('ant-select-dropdown-hidden');

        const hasOptions = dropdown.querySelectorAll('[role="option"], .item, .option').length > 0;

        return isVisible && hasOptions;
    }

    function evaluateCondition(cond) {
        const vars = Object.assign({}, workflow.variables, runtimeVariables);
        const value = cond.value !== undefined ? replaceVariables(cond.value, vars) : '';
        const selector = cond.selector ? replaceVariables(cond.selector, vars) : cond.selector;

        switch (cond.type) {
            case 'alwaysTrue':
                return true;

            case 'alwaysFalse':
                return false;

            case 'elementExists':
                return !!document.querySelector(selector);

            case 'elementVisible': {
                const el = document.querySelector(selector);
                return el && el.offsetParent !== null;
            }

            case 'elementText': {
                const textEl = document.querySelector(selector);
                if (!textEl) return false;
                const text = (textEl.textContent || '').trim();
                console.log('text', text);

                switch (cond.match) {
                    case 'eq': return text === value;
                    case 'contains': return text.includes(value);
                    case 'notEmpty': return text !== '';
                    case 'empty': return text === '';
                    case 'regex': return new RegExp(value, 'i').test(text);
                    default: return false;
                }
            }

            case 'elementAttribute': {
                const attrEl = document.querySelector(selector);
                if (!attrEl) return false;
                const BOOL_PROPS = ['checked', 'disabled', 'readonly', 'selected', 'hidden', 'required'];
                const attrName = cond.attribute || '';
                const attrValue = BOOL_PROPS.includes(attrName.toLowerCase())
                    ? String(!!attrEl[attrName])
                    : attrEl.getAttribute(attrName);
                // attrValue 恒为字符串，统一将比较值 stringify，兼容 JSON 中写 true/false/数字
                const cmpValue = String(value);

                switch (cond.match) {
                    case 'eq': return attrValue === cmpValue;
                    case 'contains':
                        if (!attrValue) return false;
                        if (attrName.toLowerCase() === 'class') {
                            return attrEl.classList.contains(cmpValue);
                        }
                        return attrValue.includes(cmpValue);
                    case 'notEmpty': return attrValue !== null && attrValue !== '';
                    case 'empty': return attrValue === null || attrValue === '';
                    case 'regex': return attrValue ? new RegExp(cmpValue, 'i').test(attrValue) : false;
                    default: return false;
                }
            }

            case 'urlMatch': {
                const url = location.href;
                switch (cond.match) {
                    case 'eq': return url === value;
                    case 'contains': return url.includes(value);
                    case 'notEmpty': return url !== '';
                    case 'empty': return url === '';
                    case 'regex': return new RegExp(value, 'i').test(url);
                    default: return url.includes(value);
                }
            }

            case 'variableMatch': {
                const varValue = vars[cond.name];
                const varStr = varValue !== undefined && varValue !== null ? String(varValue) : '';
                switch (cond.match) {
                    case 'eq': return compareValues(varStr, value, 'eq');
                    case 'contains': return varStr.includes(value);
                    case 'notEmpty': return varStr !== '';
                    case 'empty': return varStr === '';
                    case 'regex': return new RegExp(value, 'i').test(varStr);
                    case 'lt': return compareValues(varStr, value, 'lt');
                    case 'gt': return compareValues(varStr, value, 'gt');
                    case 'lte': return compareValues(varStr, value, 'lte');
                    case 'gte': return compareValues(varStr, value, 'gte');
                    default: return compareValues(varStr, value, 'eq');
                }
            }

            default:
                return false;
        }
    }

    function compareValues(left, right, op) {
        const leftNum = Number(left);
        const rightNum = Number(right);
        const isNumeric = !isNaN(leftNum) && !isNaN(rightNum) &&
            !String(left).match(/^0+[1-9]/) &&
            !String(right).match(/^0+[1-9]/);

        const a = isNumeric ? leftNum : left;
        const b = isNumeric ? rightNum : right;

        switch (op) {
            case 'eq': return a == b;
            case 'lt': return a < b;
            case 'gt': return a > b;
            case 'lte': return a <= b;
            case 'gte': return a >= b;
            default: return false;
        }
    }

    // 解析 goto 目标 id，返回 { stepIndex, actionIndex }
    function resolveTargetId(id) {
        if (!id || !workflow) return null;

        for (let s = 0; s < workflow.steps.length; s++) {
            const step = workflow.steps[s];
            if (step.actions) {
                for (let a = 0; a < step.actions.length; a++) {
                    if (step.actions[a].id === id) {
                        return { stepIndex: s, actionIndex: a };
                    }
                }
            }
        }

        for (let s = 0; s < workflow.steps.length; s++) {
            if (workflow.steps[s].id === id) {
                return { stepIndex: s, actionIndex: 0 };
            }
        }

        return null;
    }

    // 条件值显示：如实 stringify，避免布尔 false 被 || 吞成空串、布尔 true 伪装成字符串
    function fmtConditionValue(v) {
        return v === undefined || v === null ? '' : String(v);
    }

    function formatCondition(cond) {
        switch (cond.type) {
            case 'alwaysTrue': return `总是为真`;
            case 'alwaysFalse': return `总是为假`;
            case 'elementExists': return `存在 ${cond.selector}`;
            case 'elementVisible': return `可见 ${cond.selector}`;
            case 'elementText': return `文本 ${cond.match} "${fmtConditionValue(cond.value)}"`;
            case 'elementAttribute': return `属性 ${cond.selector} [${cond.attribute}] ${cond.match} "${fmtConditionValue(cond.value)}"`;
            case 'urlMatch': return `URL ${cond.match || 'contains'} "${fmtConditionValue(cond.value)}"`;
            case 'variableMatch': return `变量 ${cond.name} ${cond.match || 'eq'} "${fmtConditionValue(cond.value)}"`;
            default: return cond.type;
        }
    }

    // 获取动作的值（优先使用运行时修改的值）
    function getActionValue(action, stepIdx, actionIdx) {
        const si = currentStepIndex;
        const ai = currentActionIndex;
        if (si >= 0 && ai >= 0) {
            const override = getActionOverride(activeWorkflowId, si, ai, 'value');
            if (override !== undefined) return override;
        }
        return action.value;
    }

    // 解析 ## 位置语法：##1 第1个、##last 最后一个、##random 随机一个（基于可见且未禁用的选项列表）
    // 返回 null 表示不是位置语法，走普通文本匹配
    const parsePositionSpec = (value) => {
        if (typeof value !== 'string') return null;
        const match = value.match(/^##(\d+|last|random)$/);
        if (!match) return null;
        if (match[1] === 'last') return { kind: 'last' };
        if (match[1] === 'random') return { kind: 'random' };
        const n = parseInt(match[1], 10);
        return n >= 1 ? { kind: 'index', index: n } : null;
    };

    // 按位置语法从选项列表中取目标选项，越界/无选项返回 null
    const pickByPosition = (options, spec) => {
        if (!spec || options.length === 0) return null;
        let idx;
        if (spec.kind === 'last') idx = options.length - 1;
        else if (spec.kind === 'random') idx = Math.floor(Math.random() * options.length);
        else idx = spec.index - 1;
        return (idx >= 0 && idx < options.length) ? options[idx] : null;
    };

    // ============ 上传文件缓存 ============
    // 按 URL 缓存云端文件的二进制内容（base64 编码存入 GM 存储），避免同一文件重复下载。
    // 每个上传动作可通过 cache 字段控制：默认启用；设为 false 时本次不读缓存并清除该 URL 的旧缓存，
    // 用于强制重新拉取（如云端文件已更新），避免缓存一直不变。
    const UPLOAD_CACHE_KEY = 'workflow_upload_cache';

    function getUploadCache() {
        return GM_getValue(UPLOAD_CACHE_KEY, {}) || {};
    }

    function saveUploadCache(cache) {
        GM_setValue(UPLOAD_CACHE_KEY, cache);
    }

    // ArrayBuffer → base64 字符串（分块拼接，避免超大文件一次性 String.fromCharCode 栈溢出）
    function arrayBufferToBase64(buffer) {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const chunkSize = 8192;
        for (let i = 0; i < bytes.length; i += chunkSize) {
            binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
        }
        return btoa(binary);
    }

    // base64 字符串 → ArrayBuffer
    function base64ToArrayBuffer(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    }

    // ============ extract 辅助 ============
    // 读取元素指定来源的值（textContent/value/innerHTML/任意 DOM 属性）
    const readElementValue = (element, attr) => {
        if (attr === 'textContent') return element.textContent ?? '';
        if (attr === 'value') return element.value ?? '';
        if (attr === 'innerHTML') return element.innerHTML ?? '';
        return element.getAttribute(attr) ?? '';
    };

    // transform 后处理（数组逐项应用）
    // 支持：trim / trim-newlines / number（数值化，去千分位，失败保留原串）/
    //       split:分隔符（转数组，逐项 trim，丢弃空项）/ json（解析失败保留原串）/ regex:正则
    const applyTransform = (rawValue, transform) => {
        if (Array.isArray(rawValue)) {
            return transform ? rawValue.map(item => applyTransform(item, transform)) : rawValue;
        }
        let result = String(rawValue);
        if (!transform) return result;
        if (transform === 'trim') return result.trim();
        if (transform === 'trim-newlines') return result.replace(/[\r\n]+/g, ' ').trim();
        if (transform === 'number') {
            // 去掉千分位（中英文逗号）与空白后数值化；失败保留原字符串，避免 NaN 污染后续插值
            const n = parseFloat(result.replace(/[,\s，]/g, ''));
            return isNaN(n) ? result : n;
        }
        if (transform === 'json') {
            try { return JSON.parse(result); } catch (e) { return result; }
        }
        if (typeof transform === 'string' && transform.startsWith('split:')) {
            return result.split(transform.slice('split:'.length))
                .map(s => s.trim())
                .filter(s => s !== '');
        }
        if (typeof transform === 'string' && transform.startsWith('regex:')) {
            // 格式 "regex:(.+)" — 取第一个捕获组，若无捕获组则取整体匹配
            const pattern = transform.slice('regex:'.length);
            const match = result.match(new RegExp(pattern));
            if (match) {
                return match[1] !== undefined ? match[1] : match[0];
            }
            return '';
        }
        return result;
    };

    // 日志值预览：数组/对象 JSON 化并截断，避免刷屏
    const truncateForLog = (value, max = 60) => {
        const str = (typeof value === 'object' && value !== null) ? JSON.stringify(value) : String(value);
        return `"${str.slice(0, max)}${str.length > max ? '…' : ''}"`;
    };

    // 按 spec 提取单个来源的值（url / urlParam / DOM 单元素 / DOM 全部匹配）
    // spec 即 extract 动作本身或 fields 模式中的单个字段定义
    async function extractValue(spec, variables) {
        let rawValue;

        if (spec.attribute === 'url') {
            // 提取整个当前 URL
            rawValue = location.href;
        } else if (typeof spec.attribute === 'string' && spec.attribute.startsWith('urlParam:')) {
            // 提取 URL 查询参数，如 urlParam:id
            const paramName = spec.attribute.slice('urlParam:'.length);
            rawValue = new URLSearchParams(location.search).get(paramName) ?? '';
        } else {
            // 从 DOM 元素提取
            const selector = replaceVariables(spec.selector, variables);
            if (!selector) {
                throw new Error('extract 动作缺少 selector 字段（非 url/urlParam 来源时必填）');
            }
            if (spec.all) {
                // 批量模式：等待首个匹配出现后收集全部（CSS 与 XPath 均支持）→ 数组
                await getElement(selector, spec.timeout || 5000, 0);
                rawValue = getAllElements(selector).map(el => readElementValue(el, spec.attribute || 'textContent'));
            } else {
                const element = await getElement(selector, spec.timeout || 5000, spec.index || 0);
                rawValue = readElementValue(element, spec.attribute || 'textContent');
            }
        }

        return applyTransform(rawValue, spec.transform);
    }

    // 变量值展示格式化：对象/数组 JSON 化，undefined/null 显示占位（modal 键值表用）
    const formatVariableValue = (v) => {
        if (v === undefined || v === null) return '(未定义)';
        if (typeof v === 'object') return JSON.stringify(v, null, 2);
        return String(v);
    };

    const actionExecutors = {
        // 填写输入框
        fill: async function(action, variables) {
            const selector = replaceVariables(action.selector, variables);
            const value = replaceVariables(getActionValue(action), variables);
            const index = action.index || 0;

            const element = await getElement(selector, 5000, index);
            element.focus();
            element.value = value;
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
            element.blur();

            const indexSuffix = index > 0 ? ` [${index}]` : '';
            addLog(`✓ 填写 ${selector}${indexSuffix}: ${value}`, 'success');
        },

        // 通用下拉框选择
        select: async function(action, variables, config) {
            const selector = replaceVariables(action.selector, variables);
            const rawValue = replaceVariables(getActionValue(action), variables);
            const index = action.index || 0;
            const waitAfterClick = action.waitAfterClick || 500;
            const maxAttempts = action.maxAttempts || 3;

            // 规范化值：支持字符串或字符串数组
            const values = Array.isArray(rawValue) ? rawValue : [rawValue];

            console.log('[select] 开始执行下拉选择');
            console.log('[select] selector:', selector, 'values:', values);

            let triggerElement = await getElement(selector, 5000, index);

            // 处理原生 select 元素
            if (triggerElement.tagName === 'SELECT') {
                await simulateClick(triggerElement);
                await sleep(waitAfterClick);

                let foundValue = null;
                let selectedOption = null;
                const allOptions = Array.from(triggerElement.querySelectorAll('option'));
                const enabledOptions = allOptions.filter(o => !o.disabled);
                for (const value of values) {
                    const spec = parsePositionSpec(value);
                    if (spec) {
                        const option = pickByPosition(enabledOptions, spec);
                        if (option) {
                            triggerElement.value = option.value;
                            foundValue = value;
                            selectedOption = option;
                        }
                    } else {
                        for (const option of enabledOptions) {
                            if (option.value === value || option.textContent.trim() === value) {
                                triggerElement.value = option.value;
                                foundValue = value;
                                selectedOption = option;
                                break;
                            }
                        }
                    }
                    if (foundValue) break;
                }

                if (foundValue) {
                    triggerElement.dispatchEvent(new Event('change', { bubbles: true }));
                    const allValues = values.length > 1 ? ` [尝试: ${values.join(', ')}]` : '';
                    const posHint = parsePositionSpec(foundValue) ? ` → "${selectedOption.textContent.trim()}"` : '';
                    addLog(`✓ 选择选项: ${foundValue}${posHint}${allValues}`, 'success');
                    return;
                } else {
                    addLog(`✗ 未找到选项: ${values.join(', ')}`, 'error');
                    throw new Error(`未找到选项: ${values.join(', ')}`);
                }
            }

            // 找到实际的点击目标
            let clickableTarget = triggerElement;
            let searchInput = null;

            if (triggerElement.tagName === 'INPUT') {
                clickableTarget = triggerElement.closest('[role="combobox"]') ||
                                  triggerElement.closest('.ant-select') ||
                                  triggerElement.closest('.el-select') ||
                                  triggerElement.closest('.select-wrapper') ||
                                  triggerElement.closest('div[class*="select"]') ||
                                  triggerElement;
                searchInput = triggerElement;
            }

            const arrow = clickableTarget.querySelector('.ant-select-arrow, .ant-select-arrow-icon, .el-icon-arrow-down, .arrow, [class*="arrow"], [class*="icon"][class*="down"]');
            if (arrow) {
                clickableTarget = arrow;
            }

            // 模拟点击打开下拉框
            let dropdown = null;
            let isOpen = false;

            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                clickableTarget.focus();
                await sleep(100);
                await simulateClick(clickableTarget);
                await sleep(waitAfterClick);

                dropdown = findDropdown(clickableTarget);
                isOpen = isDropdownOpen(dropdown);

                if (!isOpen && searchInput) {
                    searchInput.focus();
                    await sleep(100);
                    await simulateClick(searchInput);
                    await sleep(waitAfterClick);
                    dropdown = findDropdown(clickableTarget);
                    isOpen = isDropdownOpen(dropdown);
                }

                if (isOpen) break;
                await sleep(300);
            }

            if (!isOpen) {
                throw new Error('下拉框打开失败，无法选择选项');
            }

            // 收集当前可见且未禁用的选项（按选择器优先级取第一组命中的）
            const collectVisibleOptions = () => {
                const optionSelectors = [
                    '[role="option"]',
                    '.ant-select-item-option',
                    '.el-select-dropdown__item',
                    '.el-option',
                    '.dropdown-item',
                    '.option',
                    'li',
                    'div[class*="item"]',
                    'div[class*="option"]'
                ];

                for (const optSel of optionSelectors) {
                    const options = document.querySelectorAll(optSel);
                    if (options.length > 0) {
                        const visible = [];
                        for (const option of options) {
                            const rect = option.getBoundingClientRect();
                            const isVisible = rect.width > 0 && rect.height > 0 &&
                                            option.style.display !== 'none' &&
                                            option.style.visibility !== 'hidden';
                            if (!isVisible) continue;
                            const isDisabled = option.getAttribute('aria-disabled') === 'true' ||
                                               option.classList.contains('ant-select-item-option-disabled') ||
                                               option.classList.contains('disabled') ||
                                               option.classList.contains('is-disabled');
                            if (isDisabled) continue;
                            visible.push(option);
                        }
                        if (visible.length > 0) return visible;
                    }
                }
                return [];
            };

            // 查找并点击选项（支持多个备选值，## 位置语法或文本/data-value 匹配）
            const findOption = () => {
                const visibleOptions = collectVisibleOptions();
                for (const value of values) {
                    const spec = parsePositionSpec(value);
                    if (spec) {
                        const option = pickByPosition(visibleOptions, spec);
                        if (option) {
                            return { element: option, matchedValue: value };
                        }
                    } else {
                        for (const option of visibleOptions) {
                            const optionText = option.textContent.trim();
                            const optionValue = option.getAttribute('data-value') ||
                                               option.getAttribute('value') ||
                                               option.getAttribute('title') || '';
                            if (optionText === value || optionValue === value) {
                                return { element: option, matchedValue: value };
                            }
                        }
                    }
                }
                return null;
            };

            let targetResult = findOption();

            if (!targetResult) {
                const scrollContainer = dropdown.querySelector('[style*="overflow"], .rc-virtual-list-holder, .el-virtual-scroll, .scrollbar');
                if (scrollContainer) {
                    scrollContainer.scrollTop = 0;
                    await sleep(300);
                    targetResult = findOption();
                }
            }

            if (targetResult) {
                await simulateClick(targetResult.element);
                await sleep(300);
                const allValues = values.length > 1 ? ` [尝试: ${values.join(', ')}]` : '';
                const posHint = parsePositionSpec(targetResult.matchedValue) ? ` → "${targetResult.element.textContent.trim()}"` : '';
                addLog(`✓ 选择选项: ${targetResult.matchedValue}${posHint}${allValues}`, 'success');
            } else {
                addLog(`✗ 未找到选项: ${values.join(', ')}`, 'error');
                clickableTarget.click();
                throw new Error(`未找到选项: ${values.join(', ')}`);
            }
        },

        // 点击
        click: async function(action, variables) {
            const selector = replaceVariables(action.selector, variables);
            const index = action.index || 0;

            const element = await getElement(selector, 5000, index);
            await simulateClick(element);

            const indexSuffix = index > 0 ? ` [${index}]` : '';
            addLog(`✓ 点击 ${selector}${indexSuffix}`, 'success');
        },

        // 勾选复选框
        check: async function(action, variables) {
            const selector = replaceVariables(action.selector, variables);
            const checked = action.checked !== false;
            const index = action.index || 0;

            const element = await getElement(selector, 5000, index);
            if (element.checked !== checked) {
                element.click();
                addLog(`✓ ${checked ? '勾选' : '取消勾选'} ${selector}`, 'success');
            }
        },

        // 选择单选框
        radio: async function(action, variables) {
            const name = replaceVariables(action.name, variables);
            const value = replaceVariables(getActionValue(action), variables);

            const element = await getElement(`input[type="radio"][name="${name}"][value="${value}"]`);
            if (!element.checked) {
                element.click();
                addLog(`✓ 选择单选框 ${name}=${value}`, 'success');
            }
        },

        // 等待元素
        waitFor: async function(action, variables, config) {
            const selector = replaceVariables(action.selector, variables);
            const timeout = action.timeout || 5000;

            addLog(`→ 等待元素: ${selector}`, 'info');
            await waitForElement(selector, timeout);
            addLog(`✓ 元素已出现: ${selector}`, 'success');
        },

        // 固定等待
        wait: async function(action) {
            const ms = action.ms || 1000;
            addLog(`→ 等待 ${ms}ms`, 'info');
            await sleep(ms);
        },

        // 滚动到元素
        scroll: async function(action, variables) {
            const selector = replaceVariables(action.selector, variables);
            const element = await getElement(selector);

            const block = action.block || 'center';
            const inline = action.inline || 'nearest';

            element.scrollIntoView({ behavior: 'smooth', block, inline });
            await sleep(300);

            addLog(`→ 滚动到 ${selector} (block:${block})`, 'success');
        },

        // 聚焦元素
        focus: async function(action, variables) {
            const selector = replaceVariables(action.selector, variables);
            const element = await getElement(selector);
            element.focus();
            await sleep(100);
            addLog(`✓ 聚焦 ${selector}`, 'success');
        },

        // 滚动到指定位置
        scrollTo: async function(action) {
            const target = action.target || 'top';
            const behavior = action.behavior || 'smooth';

            if (target === 'top') {
                window.scrollTo({ top: 0, behavior: behavior });
                addLog(`→ 滚动到页面顶部`, 'info');
            } else if (target === 'bottom') {
                window.scrollTo({ top: document.body.scrollHeight, behavior: behavior });
                addLog(`→ 滚动到页面底部`, 'info');
            } else if (typeof target === 'number') {
                window.scrollTo({ top: target, behavior: behavior });
                addLog(`→ 滚动到位置 ${target}px`, 'info');
            }
            await sleep(300);
        },

        // 相对滚动
        scrollBy: async function(action) {
            const x = action.x || 0;
            const y = action.y || 0;
            const behavior = action.behavior || 'smooth';

            window.scrollBy({ top: y, left: x, behavior: behavior });
            await sleep(300);
            addLog(`→ 滚动偏移 x:${x}, y:${y}`, 'info');
        },

        // 悬停元素
        hover: async function(action, variables) {
            const selector = replaceVariables(action.selector, variables);
            const element = await getElement(selector);

            element.dispatchEvent(new MouseEvent('mouseenter', {
                view: window, bubbles: true, cancelable: true
            }));
            await sleep(action.duration || 500);
            addLog(`→ 悬停 ${selector}`, 'info');
        },

        // 高亮元素
        highlight: async function(action, variables) {
            const selector = replaceVariables(action.selector, variables);
            const duration = action.duration || 8000;
            const color = action.color || 'rgba(255, 0, 0, 0.25)';
            const borderColor = action.borderColor || '#ff0000';

            const element = await getElement(selector);

            // 输出选择器匹配到的元素数量，便于排查选择器是否精确
            const matchCount = countElements(selector);
            addLog(`🔍 选择器 "${selector}" 匹配到 ${matchCount} 个元素`, 'info');

            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            await sleep(300);

            const rect = element.getBoundingClientRect();
            const overlay = document.createElement('div');
            overlay.className = 'workflow-highlight-overlay';
            overlay.style.cssText = `
            position: fixed;
            top: ${rect.top - 3}px;
            left: ${rect.left - 3}px;
            width: ${rect.width + 6}px;
            height: ${rect.height + 6}px;
            border: 3px solid ${borderColor};
            background: ${color};
            z-index: 999999;
            pointer-events: none;
            border-radius:var(--wf-radius-sm);
            box-shadow: 0 0 10px ${borderColor}, 0 0 20px ${borderColor}44;
            animation: workflow-highlight-pulse 0.8s ease-in-out infinite alternate;
        `;

            const label = document.createElement('div');
            label.style.cssText = `
            position: absolute;
            top: -24px;
            left: 0;
            background: ${borderColor};
            color: white;
            font-size: 11px;
            padding: 2px 8px;
            border-radius:var(--wf-radius-sm);
            white-space: nowrap;
            font-family: monospace;
        `;
            label.textContent = selector;
            overlay.appendChild(label);

            if (!document.getElementById('workflow-highlight-style')) {
                const style = document.createElement('style');
                style.id = 'workflow-highlight-style';
                style.textContent = `
                @keyframes workflow-highlight-pulse {
                    from { opacity: 0.7; }
                    to { opacity: 1; }
                }
            `;
                document.head.appendChild(style);
            }

            document.body.appendChild(overlay);
            addLog(`✓ 高亮 ${selector} (${duration}ms)`, 'success');

            await sleep(duration);
            overlay.remove();
        },

        // 自定义脚本
        custom: async function(action, variables) {
            if (typeof action.fn === 'function') {
                await action.fn(document, variables);
                addLog(`✓ 执行自定义脚本`, 'success');
            } else if (action.code) {
                eval(action.code);
                addLog(`✓ 执行自定义代码`, 'success');
            }
        },

        // URL替换
        urlReplace: async function(action, variables) {
            const find = replaceVariables(action.find, variables);
            const replace = replaceVariables(action.replace, variables);
            const useRegex = action.useRegex || false;
            const navigate = action.navigate !== false;

            const currentUrl = window.location.href;
            let newUrl;

            if (useRegex) {
                const regex = new RegExp(find);
                newUrl = currentUrl.replace(regex, replace);
            } else {
                newUrl = currentUrl.replace(find, replace);
            }

            if (newUrl === currentUrl) {
                addLog(`⚠ URL未发生变化，未匹配到: ${find}`, 'warning');
                return;
            }

            addLog(`✓ URL替换: ${find} → ${replace}`, 'success');

            if (navigate) {
                saveState();
                window.location.href = newUrl;
                await new Promise(() => {});
            }
        },

        // 条件判断 + goto 跳转
        condition: async function(action, variables) {
            const result = evaluateCondition(action.condition);
            const condDesc = formatCondition(action.condition);
            addLog(`🔀 条件判断: ${condDesc} → ${result ? '真' : '假'}`, 'info');

            const targetId = result ? action.gotoTrue : action.gotoFalse;
            if (targetId) {
                const target = resolveTargetId(targetId);
                if (!target) {
                    throw new Error(`goto 目标不存在: ${targetId}`);
                }
                setGotoTarget(target);
                addLog(`→ 跳转到: ${targetId}`, 'info');
            }
        },

        // 从页面元素或 URL 提取值并写入运行时变量
        // 三种模式：
        //   1. fields：一次提取多个变量 { 变量名: { selector, attribute, transform, ... } }
        //   2. all:true：收集选择器全部匹配项 → 数组变量
        //   3. 普通：单元素 / url / urlParam 提取（原有行为）
        extract: async function(action, variables) {
            // fields 模式：逐字段提取并分别写入对应变量
            if (action.fields && typeof action.fields === 'object') {
                const entries = Object.entries(action.fields);
                if (!entries.length) throw new Error('extract 的 fields 不能为空');
                const results = [];
                for (const [varName, spec] of entries) {
                    const value = await extractValue(spec, variables);
                    variables[varName] = value;
                    results.push(`${varName} = ${truncateForLog(value)}`);
                }
                addLog(`✓ 批量提取 ${entries.length} 个字段: ${results.join('；')}`, 'success');
                return;
            }

            const targetVar = action.variable;
            if (!targetVar) {
                throw new Error('extract 动作缺少 variable 字段');
            }

            const result = await extractValue(action, variables);

            // failIfEmpty：空值（空串/空数组）直接报错，便于配合 onError 及时暴露选择器失效
            const isEmpty = result === '' || result === null || result === undefined ||
                            (Array.isArray(result) && result.length === 0);
            if (action.failIfEmpty && isEmpty) {
                throw new Error(`提取结果为空: ${action.selector || action.attribute || ''} → ${targetVar}`);
            }

            // 写入运行时变量（通过 variables 引用直接赋值，对象由 engine 传入）
            variables[targetVar] = result;

            const allSuffix = action.all ? ` [全部 ${Array.isArray(result) ? result.length : 0} 项]` : '';
            const indexSuffix = (!action.all && action.index > 0) ? ` [${action.index}]` : '';
            const attrLabel = action.attribute || 'textContent';
            addLog(`✓ 提取 ${action.selector || attrLabel}${indexSuffix}${allSuffix} → ${targetVar} = ${truncateForLog(result)}`, 'success');
        },

        // 模态框展示数据：content 自由文本或 variables 键值表（均支持 ${变量} 插值）。
        // 默认等待用户关闭后继续；buttons 为 okCancel 且用户点"取消"时，
        // 按 onCancel 决定继续 / 停止 / goto 跳转（复用 condition 的 goto 机制）
        modal: async function(action, variables) {
            const title = escapeHtml(String(replaceVariables(String(action.title || '提示'), variables)));

            // 构建内容与可复制的纯文本（优先 content，其次 variables 键值表）
            let contentHtml = '';
            let copyText = '';
            if (action.content !== undefined && action.content !== null) {
                copyText = String(replaceVariables(String(action.content), variables));
                contentHtml = `<div style="font-size:14px;color:var(--wf-text-secondary);line-height:1.6;white-space:pre-wrap;word-break:break-word;">${escapeHtml(copyText)}</div>`;
            } else if (Array.isArray(action.variables) && action.variables.length) {
                const rows = action.variables.map(name => {
                    const display = formatVariableValue(variables[name]);
                    return `<tr>
                    <td style="padding:6px 12px 6px 0;font-size:13px;color:var(--wf-text);font-weight:500;vertical-align:top;white-space:nowrap;">${escapeHtml(name)}</td>
                    <td style="padding:6px 0;font-size:13px;color:var(--wf-text-secondary);vertical-align:top;white-space:pre-wrap;word-break:break-all;max-width:300px;max-height:140px;overflow:auto;">${escapeHtml(display)}</td>
                </tr>`;
                }).join('');
                contentHtml = `<table style="border-collapse:collapse;">${rows}</table>`;
                copyText = action.variables.map(name => `${name} = ${formatVariableValue(variables[name])}`).join('\n');
            } else {
                contentHtml = `<div style="font-size:13px;color:var(--wf-text-faint);">（无内容：请配置 content 或 variables 字段）</div>`;
            }

            const modalPromise = showModal({
                title,
                contentHtml,
                buttons: action.buttons === 'okCancel' ? 'okCancel' : 'ok',
                okText: action.okText,
                cancelText: action.cancelText,
                width: action.width,
                timeout: action.timeout || 0,
                copyText: action.copyButton !== false && copyText ? copyText : null
            });

            // waitClose:false —— 弹出后不等待立即继续（过程播报，可配合 timeout 自动关闭）
            if (action.waitClose === false) {
                addLog(`✓ 弹出模态框: ${action.title || '提示'}`, 'success');
                return;
            }

            const result = await modalPromise;
            if (result === 'timeout') {
                addLog(`⏱ 模态框超时自动关闭: ${action.title || '提示'}`, 'info');
                return;
            }
            if (result === 'forced') {
                addLog(`模态框已随工作流停止而关闭: ${action.title || '提示'}`, 'info');
                return;
            }
            if (result === 'ok') {
                addLog(`✓ 用户已确认模态框: ${action.title || '提示'}`, 'success');
                return;
            }

            // 用户点了"取消"：按 onCancel 处理（continue / stop / goto 目标 id）
            addLog(`⊘ 用户取消了模态框: ${action.title || '提示'}`, 'warning');
            const onCancel = action.onCancel;
            if (!onCancel || onCancel === 'continue') return;
            // 停止请求时不再处理跳转，避免停止后流程被 goto 续命
            if (stopRequested) return;
            if (onCancel === 'stop') {
                setStopRequested(true);
                addLog(`模态框取消，按配置停止工作流`, 'warning');
                return;
            }
            const target = resolveTargetId(onCancel);
            if (!target) {
                throw new Error(`modal onCancel 目标不存在: ${onCancel}`);
            }
            setGotoTarget(target);
            addLog(`→ 跳转到: ${onCancel}`, 'info');
        },

        // 将变量内容写入系统剪贴板（GM_setClipboard 优先，降级链见 clipboard.js）
        copy: async function(action, variables) {
            const raw = replaceVariables(action.value !== undefined ? String(action.value) : '', variables);
            // 插值结果可能是数组/对象（单一变量引用保留原始类型），统一序列化避免 "[object Object]"
            const text = (raw !== null && typeof raw === 'object') ? JSON.stringify(raw, null, 2) : String(raw);
            const mimeType = action.mimeType === 'html' ? 'html' : 'text';
            const via = await writeClipboard(text, mimeType);
            addLog(`✓ 已写入剪贴板（${text.length} 字符，${via}）`, 'success');
        },

        // 设置或修改运行时变量
        setVariable: async function(action, variables) {
            const targetVar = action.variable;
            if (!targetVar) {
                throw new Error('setVariable 动作缺少 variable 字段');
            }

            const op = action.op || 'set';
            const current = variables[targetVar];

            let result;
            switch (op) {
                case 'set':
                    result = replaceVariables(action.value !== undefined ? String(action.value) : '', variables);
                    break;
                case 'append': {
                    const appendStr = replaceVariables(action.value !== undefined ? String(action.value) : '', variables);
                    result = (current !== undefined && current !== null ? String(current) : '') + appendStr;
                    break;
                }
                case 'increment': {
                    const n = parseFloat(current);
                    result = isNaN(n) ? 1 : n + (parseFloat(action.step) || 1);
                    break;
                }
                case 'decrement': {
                    const n = parseFloat(current);
                    result = isNaN(n) ? -1 : n - (parseFloat(action.step) || 1);
                    break;
                }
                case 'clear':
                    result = '';
                    break;
                default:
                    throw new Error(`setVariable: 未知 op "${op}"`);
            }

            variables[targetVar] = result;
            const preview = String(result);
            addLog(`✓ 变量 ${targetVar} [${op}] → "${preview.slice(0, 60)}${preview.length > 60 ? '…' : ''}"`, 'success');
        },

        // 将变量内容触发文件下载
        download: async function(action, variables) {
            const filename = replaceVariables(action.filename || 'download.txt', variables);
            const content = replaceVariables(action.content !== undefined ? String(action.content) : '', variables);
            const mimeType = action.mimeType || 'text/plain;charset=utf-8';

            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 1000);

            addLog(`✓ 下载文件: ${filename}（${(content.length / 1024).toFixed(1)} KB）`, 'success');
        },

        // 从云端 URL 拉取文件并注入页面的 <input type="file">
        // 原理：网页上传底层都是 input[type=file]，系统级文件选择对话框无法被脚本控制，
        // 故绕过对话框，用 DataTransfer 把 File 直接塞进 input.files 再触发 change，
        // 框架（Ant/Element/原生）会照常把文件传到业务服务器。
        // 缓存：按 URL 缓存文件二进制，避免同一文件重复下载。cache 字段控制（默认 true），
        // 设为 false 时本次不读缓存并清除该 URL 的旧缓存，用于强制重新拉取。
        upload: async function(action, variables) {
            const selector = replaceVariables(action.selector, variables);
            const url = replaceVariables(action.url, variables);
            const filename = replaceVariables(action.filename || 'upload.bin', variables);
            const mimeType = action.mimeType ? replaceVariables(action.mimeType, variables) : '';
            const waitAfterUpload = action.waitAfterUpload || 2000;
            const index = action.index || 0;
            // 缓存控制：默认启用，显式设为 false 时禁用并清除该 URL 的旧缓存
            const useCache = action.cache !== false;

            let arrayBuffer;

            if (useCache) {
                // 尝试命中缓存
                const cached = getUploadCache()[url];
                if (cached) {
                    addLog(`→ 命中缓存: ${url}`, 'info');
                    arrayBuffer = base64ToArrayBuffer(cached.data);
                }
            } else {
                // cache:false —— 清除该 URL 的缓存，强制重新拉取，避免缓存一直不变
                const cache = getUploadCache();
                if (cache[url]) {
                    delete cache[url];
                    saveUploadCache(cache);
                    addLog(`→ 已清空缓存: ${url}`, 'info');
                } else {
                    addLog(`→ 未启用缓存: ${url}`, 'info');
                }
            }

            // 缓存未命中或被禁用时，从云端请求
            if (!arrayBuffer) {
                // 1. 用 GM_xmlhttpRequest 获取二进制（可跨域、绕过 CSP；@connect 需覆盖目标域名）
                addLog(`→ 从云端请求文件: ${url}`, 'info');
                arrayBuffer = await new Promise((resolve, reject) => {
                    GM_xmlhttpRequest({
                        method: 'GET',
                        url,
                        responseType: 'arraybuffer',
                        timeout: 30000,
                        onload: (res) => res.status >= 200 && res.status < 300
                            ? resolve(res.response)
                            : reject(new Error(`云端请求失败: HTTP ${res.status}`)),
                        onerror: () => reject(new Error('云端请求失败: 网络错误')),
                        ontimeout: () => reject(new Error('云端请求超时')),
                    });
                });

                // 启用缓存时写入（cache:false 不写回，确保下次仍重新拉取）
                if (useCache) {
                    try {
                        const cache = getUploadCache();
                        cache[url] = {
                            data: arrayBufferToBase64(arrayBuffer),
                            timestamp: Date.now()
                        };
                        saveUploadCache(cache);
                        addLog(`→ 已缓存文件: ${url}（${(arrayBuffer.byteLength / 1024).toFixed(1)} KB）`, 'info');
                    } catch (e) {
                        // 大文件可能超出 GM 存储限制，缓存失败不影响上传
                        addLog(`⚠ 缓存写入失败: ${e.message}`, 'warning');
                    }
                }
            }

            // 2. 构造 File —— 用 unsafeWindow 与页面同上下文，避免框架 instanceof File 检查失败
            const win = (typeof unsafeWindow !== 'undefined') ? unsafeWindow : window;
            const blob = new win.Blob([arrayBuffer], { type: mimeType || undefined });
            const file = new win.File([blob], filename, { type: blob.type || undefined });
            const dt = new win.DataTransfer();
            dt.items.add(file);

            // 3. 注入到 <input type="file"> 并触发 change，框架据此上传到业务服务器
            const input = await getElement(selector, 5000, index);
            if (input.tagName !== 'INPUT' || input.type !== 'file') {
                throw new Error(`目标不是文件输入框: ${selector}`);
            }
            input.files = dt.files;
            input.dispatchEvent(new Event('change', { bubbles: true }));
            addLog(`✓ 上传文件: ${filename}（${(arrayBuffer.byteLength / 1024).toFixed(1)} KB）→ ${selector}`, 'success');

            // 4. 等待框架把文件传到业务服务器完成
            await sleep(waitAfterUpload);
        },

        // 空操作（占位符/跳转目标）
        noop: async function(action) {
            if (action.description) {
                addLog(`· ${action.description}`, 'info');
            }
        },

        // 刷新页面
        reload: async function(action) {
            addLog(`✓ 刷新页面`, 'success');
            saveState();
            location.reload();
            await new Promise(() => {});
        }
    };

    // 合并静态变量与运行时变量，运行时变量优先级更高
    function getMergedVariables() {
        return Object.assign({}, workflow.variables, runtimeVariables);
    }
    // updateUI 由外部注入，避免循环依赖
    let _updateUI$4 = null;
    function setUpdateUIRef$4(fn) { _updateUI$4 = fn; }
    function updateUI$5() { if (_updateUI$4) _updateUI$4(); }

    async function executeAction(action, variables, config, stepIndex, actionIndex) {
        if (stopRequested) return;

        // 应用运行时覆盖（选择器、上传缓存）：构造浅拷贝替换字段，不影响原 action
        let effectiveAction = action;
        if (stepIndex !== undefined && actionIndex !== undefined) {
            const overrides = {};
            if (action.selector !== undefined) {
                const effectiveSelector = getEffectiveActionSelector(stepIndex, actionIndex);
                if (effectiveSelector !== action.selector) overrides.selector = effectiveSelector;
            }
            // 上传缓存覆盖：cache 字段，true 启用 / false 禁用（强制重新拉取）
            if (action.type === 'upload') {
                const effectiveCache = getEffectiveActionCache(stepIndex, actionIndex);
                if (effectiveCache !== (action.cache !== false)) overrides.cache = effectiveCache;
            }
            if (Object.keys(overrides).length) {
                effectiveAction = Object.assign({}, action, overrides);
            }
        }

        const executor = actionExecutors[effectiveAction.type];
        if (executor) {
            await executor(effectiveAction, variables, config);
        } else {
            addLog(`✗ 未知动作类型: ${effectiveAction.type}`, 'error');
        }
    }

    // 工作流全部步骤执行完毕后的收尾：若开启 autoMatchOnComplete，
    // 则根据当前页面 URL 快速匹配并切换到匹配的工作流（等同点击面板⚡图标）。
    // 注意：匹配命中时会切换工作流，switchWorkflow 会停止当前运行并重置状态，故仅在整流完成时调用。
    // 为适配登录后跳转等场景，设置 autoMatchPending 标记，由新页面加载后的 url-monitor 检测并执行匹配。
    function maybeAutoMatchAfterComplete() {
        if (workflow?.execution?.autoMatchOnComplete) {
            // 立即设置"待匹配"标记并保存，供新页面加载后检测使用
            addLog(`→ 工作流执行完毕，设置待匹配标记（当前 URL: ${location.href}）`, 'info');
            setAutoMatchPending(true);
            saveState();

            // 同时在旧页面尝试立即匹配（适用于不跳转或同页面完成场景）
            // 使用 setTimeout 给予短暂时间让页面跳转触发，如果跳转则此 setTimeout 会被中断
            const delay = workflow.execution.autoMatchDelay || 800;
            setTimeout(() => {
                if (!isRunning && autoMatchPending) {  // 仍处于待匹配状态说明没跳转
                    addLog(`→ 未检测到页面跳转，在当前页面执行自动匹配`, 'info');
                    setAutoMatchPending(false);
                    saveState();
                    autoMatchWorkflow();
                }
            }, delay);
        }
    }

    async function runActionLoop(stepIndex, startIndex, options = {}) {
        const { checkWaitUser = true } = options;
        const step = workflow.steps[stepIndex];
        const stepOnError = step.onError || workflow.execution.onError || 'continue';

        for (let actionIndex = startIndex; actionIndex < step.actions.length; actionIndex++) {
            const action = step.actions[actionIndex];
            setCurrentActionIndex(actionIndex);
            updateUI$5();

            if (stopRequested) {
                addLog(`执行已停止`, 'info');
                return 'stopped';
            }

            if (checkWaitUser) {
                const shouldWaitForUser = getEffectiveActionWaitUser(stepIndex, actionIndex);
                if (shouldWaitForUser) {
                    setWaitingForUserAction(true);
                    setPendingAction({ stepIndex, actionIndex });
                    addLog(`⏸ 等待用户手动操作: ${action.description || action.type}`, 'info');
                    setIsRunning(false);
                    updateUI$5();
                    saveState();
                    return 'paused';
                }
            }

            const actionBypassed = getEffectiveActionBypass(stepIndex, actionIndex);
            if (actionBypassed) {
                addLog(`⊘ 跳过绕过的动作: ${action.description || action.type}`, 'info');
                continue;
            }

            const actionOnError = action.onError || stepOnError;

            try {
                // 每次执行前重新合并，确保上一个 extract 写入的值对后续动作可见
                const mergedVars = getMergedVariables();
                await executeAction(action, mergedVars, workflow, stepIndex, actionIndex);
                // extract 动作会直接写入 mergedVars，将新变量同步回 runtimeVariables
                setRuntimeVariables(Object.assign({}, runtimeVariables, mergedVars));
                await sleep(workflow.execution.stepDelay);
                saveState();
            } catch (e) {
                addLog(`动作执行失败: ${e.message}`, 'error');
                if (actionOnError === 'stop') {
                    addLog(`配置为遇错停止，执行已终止`, 'warning');
                    return 'stopped';
                } else if (actionOnError === 'manual') {
                    setWaitingForUserAction(true);
                    setPendingAction({ stepIndex, actionIndex, error: e.message });
                    addLog(`⚠ 需要您手动处理错误，完成后点击继续`, 'warning');
                    setIsRunning(false);
                    updateUI$5();
                    tryHighlightErrorAction(action);
                    saveState();
                    return 'paused';
                }
            }

            if (gotoTarget) {
                const target = gotoTarget;
                setGotoTarget(null);
                return { type: 'goto', stepIndex: target.stepIndex, actionIndex: target.actionIndex };
            }

            updateUI$5();
        }

        return 'completed';
    }

    async function executeWorkflow(autoMode = false) {
        if (!workflow || isRunning) return;

        setIsRunning(true);
        setStopRequested(false);
        setGotoTarget(null);

        // 手动跳转到具体动作（jumpToAction 设置了 gotoJustJumped 与动作指针）：
        // 需在此保留，避免被下方重置逻辑清空，使执行从指定动作开始而非步骤开头。
        const jumpToActionMode = !autoMode && gotoJustJumped && currentActionIndex >= 0;
        if (!jumpToActionMode) {
            setGotoJustJumped(false);
        }

        if (!autoMode) {
            // 重新开始时重置所有状态
            setLogs([]);
            setAutoContinue(true);
            // 先检查是否已完成，再重置
            const wasCompleted = workflowCompleted;
            setWorkflowCompleted(false);
            // 如果工作流已完成，重置到第一步；否则尊重用户已跳转选择的步骤
            if (wasCompleted || currentStepIndex === -1) {
                setCurrentStepIndex(0);
            }
            if (!jumpToActionMode) {
                setCurrentActionIndex(-1);
            }
            addLog(`开始执行工作流: ${workflow.name} (自动继续模式)`, 'info');
        } else {
            addLog(`URL变化，自动继续执行工作流`, 'info');
        }

        if (currentStepIndex === -1) {
            setCurrentStepIndex(0);
        }

        while (true) {
            const step = workflow.steps[currentStepIndex];
            if (!step) break;

            const stepBypassed = getEffectiveStepBypass(currentStepIndex);
            if (stepBypassed) {
                addLog(`⊘ 跳过绕过的步骤: ${step.name}`, 'info');
                if (currentStepIndex < workflow.steps.length - 1) {
                    setCurrentStepIndex(currentStepIndex + 1);
                    continue;
                } else {
                    setWorkflowCompleted(true);
                    setAutoContinue(false);
                    addLog(`🎉 工作流 "${workflow.name}" 已完成所有步骤！`, 'success');
                    maybeAutoMatchAfterComplete();
                    break;
                }
            }

            addLog(`执行步骤 ${currentStepIndex + 1}: ${step.name}`, 'info');
            updateUI$5();
            saveState();

            const startActionIndex = (currentActionIndex >= 0 && (autoMode || gotoJustJumped))
                ? currentActionIndex + (gotoJustJumped ? 0 : 1)
                : 0;

            setGotoJustJumped(false);

            const result = await runActionLoop(currentStepIndex, startActionIndex);
            if (result === 'paused') {
                setIsRunning(false);
                updateUI$5();
                return;
            }
            if (result === 'stopped') break;

            if (result && result.type === 'goto') {
                setCurrentStepIndex(result.stepIndex);
                setCurrentActionIndex(result.actionIndex);
                setGotoJustJumped(true);
                addLog(`→ 跳转到步骤 ${result.stepIndex + 1}，动作 ${result.actionIndex + 1}`, 'info');
                continue;
            }

            setCurrentActionIndex(-1);

            if (!stopRequested) {
                const isLastStep = currentStepIndex === workflow.steps.length - 1;
                if (isLastStep) {
                    setWorkflowCompleted(true);
                    setAutoContinue(false);
                    setCurrentStepIndex(workflow.steps.length);
                    setCurrentActionIndex(-1);
                    saveState();
                    addLog(`🎉 工作流 "${workflow.name}" 已完成所有步骤！`, 'success');
                    addLog(`所有步骤已完成，您可以点击"重置状态"开始新流程`, 'info');
                    maybeAutoMatchAfterComplete();
                    break;
                } else {
                    setCurrentStepIndex(currentStepIndex + 1);
                    addLog(`步骤 "${step.name}" 执行完成`, 'success');
                    updateUI$5();
                    saveState();

                    if (autoContinue) {
                        addLog(`自动继续执行下一步...`, 'info');
                        scheduleAutoContinue(workflow.execution.stepDelay + 500);
                        break;
                    }
                }
            } else {
                break;
            }
        }

        setIsRunning(false);
        updateUI$5();
        saveState();
    }

    function stopWorkflow() {
        if (isRunning) {
            setStopRequested(true);
            // 强制关闭挂起的模态框（modal 动作 await 中），解除阻塞避免流程卡死
            closeActiveModal();
            addLog(`正在停止...`, 'info');
        }
        setAutoContinue(false);
        if (autoContinueTimer) {
            clearTimeout(autoContinueTimer);
            setAutoContinueTimer(null);
        }
        setWaitingForUserAction(false);
        setPendingAction(null);
        setRuntimeVariables({});
        addLog(`自动继续模式已关闭`, 'info');
        updateUI$5();
        saveState();
    }

    function tryHighlightErrorAction(action) {
        if (!action || !action.selector) return;
        try {
            actionExecutors.highlight(action, workflow.variables).catch(() => {});
        } catch (e) {
            // 静默忽略
        }
    }

    function resumeAfterUserAction() {
        if (!pendingAction) return;

        const { stepIndex, actionIndex } = pendingAction;
        setWaitingForUserAction(false);
        setPendingAction(null);

        console.log('[resumeAfterUserAction] Resume from step', stepIndex, 'action', actionIndex + 1);
        addLog(`✓ 用户操作完成，继续执行`, 'success');
        updateUI$5();

        continueWorkflowFrom(stepIndex, actionIndex + 1);
    }

    async function continueWorkflowFrom(stepIndex, startActionIndex) {
        if (!workflow || isRunning) return;

        addLog(`继续执行步骤 ${stepIndex + 1}，从动作 ${startActionIndex + 1} 开始`, 'info');

        setIsRunning(true);
        setStopRequested(false);
        setCurrentStepIndex(stepIndex);
        setCurrentActionIndex(startActionIndex);
        setGotoTarget(null);

        while (true) {
            const step = workflow.steps[currentStepIndex];
            if (!step) break;

            // 检查步骤是否被绕过
            const stepBypassed = getEffectiveStepBypass(currentStepIndex);
            if (stepBypassed) {
                addLog(`⊘ 跳过绕过的步骤: ${step.name}`, 'info');
                const isLastStep = currentStepIndex === workflow.steps.length - 1;
                if (isLastStep) {
                    setWorkflowCompleted(true);
                    setAutoContinue(false);
                    addLog(`🎉 工作流 "${workflow.name}" 已完成所有步骤！`, 'success');
                    break;
                } else {
                    setCurrentStepIndex(currentStepIndex + 1);
                    startActionIndex = 0;
                    continue;
                }
            }

            const result = await runActionLoop(currentStepIndex, startActionIndex);
            if (result === 'paused') {
                setIsRunning(false);
                updateUI$5();
                return;
            }
            if (result === 'stopped') break;

            if (result && result.type === 'goto') {
                setCurrentStepIndex(result.stepIndex);
                setCurrentActionIndex(result.actionIndex);
                startActionIndex = result.actionIndex;
                addLog(`→ 跳转到步骤 ${result.stepIndex + 1}，动作 ${result.actionIndex + 1}`, 'info');
                continue;
            }

            setCurrentActionIndex(-1);

            if (!stopRequested) {
                const isLastStep = currentStepIndex === workflow.steps.length - 1;
                if (isLastStep) {
                    setWorkflowCompleted(true);
                    setAutoContinue(false);
                    addLog(`🎉 工作流 "${workflow.name}" 已完成所有步骤！`, 'success');
                    maybeAutoMatchAfterComplete();
                    break;
                } else {
                    setCurrentStepIndex(currentStepIndex + 1);
                    addLog(`步骤 "${step.name}" 执行完成`, 'success');
                    updateUI$5();
                    saveState();

                    if (autoContinue) {
                        addLog(`自动继续执行下一步...`, 'info');
                        scheduleAutoContinue(workflow.execution.stepDelay + 500);
                    } else {
                        addLog(`自动继续已关闭，请手动点击"开始执行"`, 'info');
                    }
                    break;
                }
            } else {
                break;
            }
        }

        setIsRunning(false);
        updateUI$5();
        saveState();
    }

    function resetWorkflow() {
        stopWorkflow();
        setCurrentStepIndex(-1);
        setCurrentActionIndex(-1);
        setAutoContinue(false);
        setWorkflowCompleted(false);
        setRuntimeVariables({});
        clearState();
        setLogs([]);
        addLog(`工作流已重置`, 'info');
        updateUI$5();
    }

    // updateUI 由外部注入
    let _updateUI$3 = null;
    function setUpdateUIRef$3(fn) { _updateUI$3 = fn; }
    function updateUI$4() { if (_updateUI$3) _updateUI$3(); }

    function loadWorkflowList() {
        const savedList = GM_getValue('workflow_list');
        const savedActiveId = GM_getValue('active_workflow_id');

        if (savedList && Array.isArray(savedList) && savedList.length > 0) {
            setWorkflowList(savedList);
            setActiveWorkflowId(savedActiveId || workflowList[0].id);
            let migrated = false;
            workflowList.forEach(wf => {
                if (wf.steps) {
                    wf.steps.forEach(step => {
                        if ('runtimeBypass' in step) { delete step.runtimeBypass; migrated = true; }
                        if (step.actions) {
                            step.actions.forEach(action => {
                                if ('runtimeBypass' in action) { delete action.runtimeBypass; migrated = true; }
                                if ('runtimeWaitUserAction' in action) { delete action.runtimeWaitUserAction; migrated = true; }
                                if ('runtimeValue' in action) { delete action.runtimeValue; migrated = true; }
                            });
                        }
                    });
                }
            });
            if (migrated) saveWorkflowList();
        } else {
            const oldConfig = GM_getValue('workflow_config');
            if (oldConfig) {
                const migratedWf = { ...oldConfig, id: String(Date.now()) };
                setWorkflowList([migratedWf]);
                setActiveWorkflowId(migratedWf.id);
                saveWorkflowList();
                GM_setValue('workflow_config', null);
            } else {
                const defaultWf = JSON.parse(JSON.stringify(DEFAULT_WORKFLOW));
                defaultWf.id = String(Date.now());
                setWorkflowList([defaultWf]);
                setActiveWorkflowId(defaultWf.id);
                saveWorkflowList();
            }
        }

        setWorkflow(workflowList.find(w => w.id === activeWorkflowId) || workflowList[0]);
        setActiveWorkflowId(workflow.id);
    }

    function saveWorkflowList() {
        GM_setValue('workflow_list', workflowList);
        GM_setValue('active_workflow_id', activeWorkflowId);
    }

    function switchWorkflow(id) {
        const target = workflowList.find(w => w.id === id);
        if (!target) return;

        if (isRunning) {
            setStopRequested(true);
        }
        if (autoContinueTimer) {
            clearTimeout(autoContinueTimer);
            setAutoContinueTimer(null);
        }

        setActiveWorkflowId(id);
        setWorkflow(target);
        GM_setValue('active_workflow_id', activeWorkflowId);

        setIsRunning(false);
        setStopRequested(false);
        setAutoContinue(false);
        setCurrentStepIndex(-1);
        setCurrentActionIndex(-1);
        setWorkflowCompleted(false);
        setWaitingForUserAction(false);
        setPendingAction(null);
        setLogs([]);
        clearState();

        updateUI$4();
        renderLogs();
        updateWorkflowSelect();
        updateWorkflowInfoDisplay();
        addLog(`已切换到工作流: ${workflow.name}`, 'success');
    }

    function createNewWorkflow() {
        const newWf = JSON.parse(JSON.stringify(DEFAULT_WORKFLOW));
        newWf.id = String(Date.now());
        const existingNames = new Set(workflowList.map(w => w.name));
        let idx = workflowList.length + 1;
        let name = `工作流${idx}`;
        while (existingNames.has(name)) {
            idx++;
            name = `工作流${idx}`;
        }
        newWf.name = name;
        newWf.group = '';
        newWf.order = 0;
        newWf.version = '1.0.0';
        workflowList.push(newWf);
        saveWorkflowList();
        switchWorkflow(newWf.id);
        addLog(`已创建工作流: ${newWf.name}`, 'success');
    }

    function deleteWorkflow(id) {
        if (workflowList.length <= 1) {
            showToast('至少需要保留一个工作流', 'warning');
            return;
        }
        const idx = workflowList.findIndex(w => w.id === id);
        if (idx === -1) return;

        const name = workflowList[idx].name;
        workflowList.splice(idx, 1);
        clearWorkflowOverrides(id);

        if (activeWorkflowId === id) {
            saveWorkflowList();
            switchWorkflow(workflowList[0].id);
        } else {
            saveWorkflowList();
            updateWorkflowSelect();
        }
        addLog(`已删除工作流: ${name}`, 'info');
    }

    function updateWorkflowSelect() {
        const select = document.getElementById('workflow-select');
        if (!select) return;

        const groups = {};
        workflowList.forEach(w => {
            const g = w.group || '未分组';
            if (!groups[g]) groups[g] = [];
            groups[g].push(w);
        });

        Object.values(groups).forEach(list => list.sort((a, b) => (a.order || 0) - (b.order || 0)));

        const groupNames = Object.keys(groups).sort((a, b) => {
            if (a === '未分组') return 1;
            if (b === '未分组') return -1;
            return a.localeCompare(b);
        });

        const hasMultipleGroups = groupNames.length > 1 || (groupNames.length === 1 && groupNames[0] !== '未分组');

        const renderOption = (w) => {
            const selected = w.id === activeWorkflowId ? 'selected' : '';
            return `<option value="${w.id}" ${selected}>${escapeHtml(w.name)}</option>`;
        };

        if (hasMultipleGroups) {
            select.innerHTML = groupNames.map(g => {
                const options = groups[g].map(renderOption).join('');
                return `<optgroup label="${g}">${options}</optgroup>`;
            }).join('');
        } else {
            select.innerHTML = workflowList
                .slice()
                .sort((a, b) => (a.order || 0) - (b.order || 0))
                .map(renderOption)
                .join('');
        }
    }

    function updateWorkflowInfoDisplay() {
        const nameEl = document.querySelector('#workflow-panel .wf-name');
        if (nameEl && workflow) {
            const groupTag = workflow.group ? ` <span style="font-size:10px;opacity:0.7;background:rgba(255,255,255,0.15);padding:1px 5px;border-radius:var(--wf-radius-sm);">${escapeHtml(workflow.group)}</span>` : '';
            nameEl.innerHTML = `📋 ${escapeHtml(workflow.name)}${groupTag} <span id="workflow-config-version" style="font-size:10px;color:var(--wf-text-faint);">v${escapeHtml(workflow.version || '1.0.0')}</span>`;
        }
    }

    /**
     * 根据当前页面 URL 快速匹配工作流。
     *
     * 每个工作流可配置 urlMatchers 字段（可选），格式：
     *   urlMatchers: [
     *     { match: ["keyword1", "keyword2"], exclude: ["keyword3"] }
     *   ]
     * 匹配逻辑：URL 包含所有 match 关键词，且不包含任何 exclude 关键词，则视为命中。
     * 多条规则满足其一即命中。
     * 按 workflowList 顺序取第一个命中的工作流，自动切换。
     */
    function autoMatchWorkflow() {
        const url = window.location.href;
        const matched = workflowList.find(wf => {
            if (!wf.urlMatchers || !Array.isArray(wf.urlMatchers) || wf.urlMatchers.length === 0) {
                return false;
            }
            return wf.urlMatchers.some(rule => {
                const matchKeywords = Array.isArray(rule.match) ? rule.match : [];
                const excludeKeywords = Array.isArray(rule.exclude) ? rule.exclude : [];
                const allMatched = matchKeywords.every(kw => url.includes(kw));
                const anyExcluded = excludeKeywords.some(kw => url.includes(kw));
                return allMatched && !anyExcluded;
            });
        });

        if (!matched) {
            showToast('未找到匹配当前页面的工作流', 'warning');
            return;
        }
        if (matched.id === activeWorkflowId) {
            showToast(`当前已是匹配的工作流：${matched.name}`, 'info');
            return;
        }
        switchWorkflow(matched.id);
        showToast(`已自动匹配：${matched.name}`, 'success');
    }

    // updateUI 由外部注入
    let _updateUI$2 = null;
    function setUpdateUIRef$2(fn) { _updateUI$2 = fn; }
    function updateUI$3() { if (_updateUI$2) _updateUI$2(); }

    function jumpToStep(stepIndex) {
        if (isRunning) {
            addLog('工作流正在运行中，请先停止', 'warning');
            return;
        }
        setCurrentStepIndex(stepIndex);
        setCurrentActionIndex(-1);
        addLog(`已跳转到步骤 ${stepIndex + 1}: ${workflow.steps[stepIndex].name}`, 'info');
        updateUI$3();
        saveState();
    }

    // 手动跳转到具体动作：将执行指针定位到指定动作，随后点击「开始」即从该动作起执行。
    // 复用 gotoJustJumped 语义（executeWorkflow 据此从该动作而非下一个动作开始），不依赖动作 id。
    function jumpToAction(stepIndex, actionIndex) {
        if (isRunning) {
            addLog('工作流正在运行中，请先停止', 'warning');
            return;
        }
        const step = workflow.steps[stepIndex];
        const action = step && step.actions && step.actions[actionIndex];
        if (!action) {
            addLog(`动作 ${stepIndex + 1}.${actionIndex + 1} 不存在`, 'error');
            return;
        }
        setCurrentStepIndex(stepIndex);
        setCurrentActionIndex(actionIndex);
        setWorkflowCompleted(false);
        // 标记 gotoJustJumped，使 executeWorkflow 保留动作指针并从该动作开始
        setGotoJustJumped(true);
        addLog(`已跳转到步骤 ${stepIndex + 1}，动作 ${actionIndex + 1}: ${action.description || action.type}`, 'info');
        updateUI$3();
        saveState();
    }

    async function executeSingleStep(stepIndex) {
        if (!workflow || isRunning) {
            addLog('工作流正在运行中，请先停止', 'warning');
            return;
        }

        console.log('[Single Step] Executing step:', stepIndex);

        const step = workflow.steps[stepIndex];
        if (!step) {
            addLog(`步骤 ${stepIndex + 1} 不存在`, 'error');
            return;
        }

        const stepBypassed = getEffectiveStepBypass(stepIndex);
        if (stepBypassed) {
            addLog(`⊘ 步骤已被绕过，不执行: ${step.name}`, 'warning');
            return;
        }

        console.log('[Single Step] Step to execute:', step);
        addLog(`开始执行单步: ${step.name} (${step.actions?.length || 0} 个动作)`, 'info');

        setCurrentStepIndex(stepIndex);
        setIsRunning(true);
        setStopRequested(false);
        updateUI$3();

        try {
            let startActionIndex = 0;
            while (true) {
                const result = await runActionLoop(stepIndex, startActionIndex, { checkWaitUser: false });
                if (result === 'paused') {
                    return;
                }
                if (result && result.type === 'goto') {
                    if (result.stepIndex === stepIndex) {
                        startActionIndex = result.actionIndex;
                        addLog(`→ 跳转到动作 ${result.actionIndex + 1}`, 'info');
                        continue;
                    } else {
                        addLog(`→ 跳转目标在步骤 ${result.stepIndex + 1}，单步模式下不跨步骤执行`, 'warning');
                        break;
                    }
                }
                if (result === 'completed') {
                    addLog(`✓ 步骤 "${step.name}" 执行完成`, 'success');
                }
                break;
            }
        } catch (e) {
            console.error('[Single Step] Error:', e);
            addLog(`步骤执行失败: ${e.message}`, 'error');
        } finally {
            setIsRunning(false);
            setCurrentActionIndex(-1);
            updateUI$3();
        }
    }

    async function executeSingleAction(stepIndex, actionIndex) {
        if (!workflow || isRunning) {
            addLog('工作流正在运行中，请先停止', 'warning');
            return;
        }

        const step = workflow.steps[stepIndex];
        if (!step) {
            addLog(`步骤 ${stepIndex + 1} 不存在`, 'error');
            return;
        }

        const action = step.actions[actionIndex];
        if (!action) {
            addLog(`动作 ${actionIndex + 1} 不存在`, 'error');
            return;
        }

        addLog(`执行动作 [${stepIndex + 1}.${actionIndex + 1}]: ${action.type} - ${action.description || action.selector || ''}`, 'info');

        setIsRunning(true);
        setStopRequested(false);
        updateUI$3();

        try {
            await executeAction(action, workflow.variables, workflow, stepIndex, actionIndex);
            addLog(`✓ 动作 "${action.type}" 执行完成`, 'success');
        } catch (e) {
            console.error('[Single Action] Error:', e);
            addLog(`✗ 动作执行失败: ${e.message}`, 'error');
        } finally {
            setIsRunning(false);
            updateUI$3();
        }
    }

    // updateUI 由外部注入
    let _updateUI$1 = null;
    function setUpdateUIRef$1(fn) { _updateUI$1 = fn; }
    function updateUI$2() { if (_updateUI$1) _updateUI$1(); }

    function openConfigEditor() {
        console.log('[Config Editor] Opening config editor...');
        const existingModal = document.getElementById('config-editor-modal');
        if (existingModal) {
            existingModal.remove();
            return;
        }

        // Modal overlay
        const modal = document.createElement('div');
        modal.id = 'config-editor-modal';
        modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:100000;display:flex;align-items:center;justify-content:center;background:var(--wf-overlay);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;';
        modal.innerHTML = `
        <div style="background:var(--wf-surface);border-radius:var(--wf-radius-xl);box-shadow:0 20px 60px rgba(0,0,0,0.2);width:90%;max-width:680px;max-height:85vh;display:flex;flex-direction:column;animation:wfModalFadeIn 0.15s ease-out;">
            <div style="display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:1px solid var(--wf-border-muted);">
                <div style="font-size:15px;font-weight:600;color:var(--wf-text);">📝 工作流配置编辑器</div>
                <button data-action="close" style="width:24px;height:24px;border:none;background:var(--wf-surface-muted);border-radius:var(--wf-radius-md);cursor:pointer;font-size:14px;color:var(--wf-text-muted);display:flex;align-items:center;justify-content:center;">×</button>
            </div>
            <div style="flex:1;padding:16px 20px;min-height:0;overflow:hidden;display:flex;">
                <textarea id="config-textarea" style="width:100%;height:100%;min-height:50vh;padding:12px;border:1px solid var(--wf-border);border-radius:var(--wf-radius-lg);font-family:Consolas,Monaco,'Courier New',monospace;font-size:12px;line-height:1.5;resize:none;transition:border-color 0.15s;" placeholder="在此输入工作流配置 (JSON格式)..."></textarea>
            </div>
            <div style="display:flex;justify-content:flex-end;gap:8px;padding:12px 20px;border-top:1px solid var(--wf-border-muted);">
                <button data-action="import" style="padding:7px 14px;border:1px solid var(--wf-border);background:var(--wf-surface);border-radius:var(--wf-radius-md);font-size:12px;cursor:pointer;color:var(--wf-text-secondary);">📁 导入文件</button>
                <button data-action="cancel" style="padding:7px 14px;border:1px solid var(--wf-border);background:var(--wf-surface);border-radius:var(--wf-radius-md);font-size:12px;cursor:pointer;color:var(--wf-text-secondary);">取消</button>
                <button data-action="save" style="padding:7px 14px;border:none;background:var(--wf-primary);color:white;border-radius:var(--wf-radius-md);font-size:12px;font-weight:500;cursor:pointer;">💾 保存配置</button>
            </div>
        </div>
    `;

        document.body.appendChild(modal);

        const textarea = document.getElementById('config-textarea');
        textarea.value = JSON.stringify(workflow, null, 2);

        textarea.addEventListener('keydown', function(e) {
            if (e.key === 'Tab') {
                e.preventDefault();
                const start = this.selectionStart;
                const end = this.selectionEnd;
                this.value = this.value.substring(0, start) + '    ' + this.value.substring(end);
                this.selectionStart = this.selectionEnd = start + 4;
            }
        });

        function closeModal() {
            modal.remove();
        }

        // Click outside to close
        modal.addEventListener('click', (e) => {
            if (e.target === modal) { closeModal(); return; }
            const action = e.target.dataset.action;
            if (!action) return;

            if (action === 'close' || action === 'cancel') {
                closeModal();
            } else if (action === 'save') {
                const config = textarea.value;
                try {
                    const parsed = JSON.parse(config);
                    parsed.id = activeWorkflowId;
                    setWorkflow(parsed);
                    const idx = workflowList.findIndex(w => w.id === activeWorkflowId);
                    if (idx !== -1) {
                        workflowList[idx] = workflow;
                    }
                    saveWorkflowList();
                    // 清空该工作流的运行时覆盖（开关状态、临时值修改等），以最新 JSON 配置为准
                    clearWorkflowOverrides(activeWorkflowId);
                    addLog(`配置已更新 - 工作流: ${workflow.name}, 步骤数: ${workflow.steps?.length || 0}`, 'success');
                    updateUI$2();
                    updateWorkflowSelect();
                    updateWorkflowInfoDisplay();
                    renderLogs();
                    closeModal();
                    showToast(`配置已保存，步骤数: ${workflow.steps?.length || 0}`, 'success');
                } catch (e) {
                    console.error('[Config Editor] Parse error:', e);
                    showToast(`配置格式错误: ${e.message}`, 'error', 5000);
                }
            } else if (action === 'import') {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.json';
                input.onchange = (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                            textarea.value = event.target.result;
                        };
                        reader.readAsText(file);
                    }
                };
                input.click();
            }
        });

        modal.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                const saveBtn = modal.querySelector('[data-action="save"]');
                if (saveBtn) saveBtn.click();
            }
            if (e.key === 'Escape') {
                closeModal();
            }
        });
    }

    let _updateUI = null;
    function setUpdateUIRef(fn) { _updateUI = fn; }
    function updateUI$1() { if (_updateUI) _updateUI(); }

    const ACTION_TYPE_LABELS = { fill: '填写', select: '下拉选择', click: '点击', check: '勾选', radio: '单选', waitFor: '等待元素', wait: '等待', scroll: '滚动到元素', focus: '聚焦', scrollTo: '滚动页面', scrollBy: '相对滚动', hover: '悬停', highlight: '高亮', custom: '自定义脚本', urlReplace: 'URL替换', condition: '条件判断', noop: '空操作', extract: '提取变量', setVariable: '设置变量', download: '下载文件', upload: '上传文件' };

    const S = {
        input: 'width:100%;padding:6px 10px;border:1px solid var(--wf-border);border-radius:var(--wf-radius-md);font-size:13px;transition:border-color 0.15s;',
        label: 'display:block;font-size:12px;color:var(--wf-text-secondary);margin-bottom:4px;font-weight:500;',
        row: 'margin-bottom:14px;',
        card: 'background:var(--wf-surface);border:1px solid var(--wf-border);border-radius:var(--wf-radius-lg);padding:16px;margin-bottom:12px;',
        btn: 'padding:6px 12px;border:1px solid var(--wf-border);background:var(--wf-surface);border-radius:var(--wf-radius-md);font-size:12px;cursor:pointer;color:var(--wf-text-secondary);transition:all 0.15s;',
        btnPrimary: 'padding:6px 16px;border:none;background:var(--wf-primary);color:white;border-radius:var(--wf-radius-md);font-size:12px;font-weight:500;cursor:pointer;',
        tab: 'padding:10px 18px;border:none;background:transparent;font-size:13px;cursor:pointer;color:var(--wf-text-muted);border-bottom:2px solid transparent;transition:all 0.2s;',
        tabActive: 'color:var(--wf-primary);border-bottom-color:var(--wf-primary);font-weight:600;',
    };

    function openVisualEditor(initialTab = 'info') {
        const existing = document.getElementById('visual-editor-modal');
        if (existing) { existing.remove(); return; }

        const wc = JSON.parse(JSON.stringify(workflow));
        if (!wc.execution) wc.execution = { stepDelay: 500, onError: 'continue' };
        if (!wc.steps) wc.steps = [];
        if (!wc.variables) wc.variables = {};
        if (!wc.enabled) wc.enabled = true;

        let activeTab = initialTab;

        const TABS = [
            { id: 'info', label: '📋 基本信息' },
            { id: 'variables', label: '🔧 变量管理' },
            { id: 'execution', label: '⚙️ 执行管理' },
            { id: 'steps', label: '🎯 步骤流程' },
        ];

        const modal = document.createElement('div');
        modal.id = 'visual-editor-modal';
        modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:100000;display:flex;align-items:center;justify-content:center;background:var(--wf-overlay);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;';

        modal.innerHTML = `
    <div style="background:var(--wf-surface);border-radius:var(--wf-radius-xl);box-shadow:0 20px 60px rgba(0,0,0,0.25);width:92%;max-width:920px;height:90vh;display:flex;flex-direction:column;animation:wfModalFadeIn 0.15s ease-out;overflow:hidden;">
        <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 24px;border-bottom:1px solid var(--wf-border-muted);flex-shrink:0;background:var(--wf-brand-gradient);">
            <div style="font-size:15px;font-weight:600;color:white;">🛠️ 可视化编辑器</div>
            <div style="display:flex;gap:8px;align-items:center;">
                <button id="ve-advanced-btn" style="padding:5px 10px;border:1px solid rgba(255,255,255,0.3);background:rgba(255,255,255,0.2);border-radius:var(--wf-radius-md);font-size:11px;cursor:pointer;color:white;transition:all 0.15s;">📝 高级模式</button>
                <button id="ve-close-btn" style="width:26px;height:26px;border:none;background:rgba(255,255,255,0.2);border-radius:var(--wf-radius-circle);cursor:pointer;font-size:16px;color:white;display:flex;align-items:center;justify-content:center;">×</button>
            </div>
        </div>
        <div id="ve-tabs" style="display:flex;gap:0;padding:0 24px;border-bottom:1px solid var(--wf-border-muted);background:var(--wf-surface-muted);flex-shrink:0;"></div>
        <div id="ve-content" style="flex:1;display:flex;min-height:0;overflow:hidden;"></div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 24px;border-top:1px solid var(--wf-border-muted);flex-shrink:0;background:var(--wf-surface-muted);">
            <button id="ve-json-toggle" style="${S.btn}">📋 预览JSON</button>
            <div style="display:flex;gap:8px;">
                <button id="ve-cancel-btn" style="${S.btn}">取消</button>
                <button id="ve-save-btn" style="${S.btnPrimary}">💾 保存</button>
            </div>
        </div>
    </div>`;

        document.body.appendChild(modal);

        function renderTabs() {
            const tabsContainer = document.getElementById('ve-tabs');
            tabsContainer.innerHTML = TABS.map(tab =>
                `<button class="ve-tab" data-tab="${tab.id}" style="${S.tab} ${activeTab === tab.id ? S.tabActive : ''}">${tab.label}</button>`
            ).join('');
            tabsContainer.querySelectorAll('.ve-tab').forEach(btn => {
                btn.onclick = () => {
                    activeTab = btn.dataset.tab;
                    renderTabs();
                    renderContent();
                };
            });
        }

        function renderContent() {
            const content = document.getElementById('ve-content');
            if (activeTab === 'info') renderInfoPanel(content);
            else if (activeTab === 'variables') renderVariablesPanel(content);
            else if (activeTab === 'execution') renderExecutionPanel(content);
            else if (activeTab === 'steps') renderStepsPanel(content);
        }

        // 基本信息 - 改进样式
        function renderInfoPanel(container) {
            container.innerHTML = `
        <div style="flex:1;padding:24px;overflow-y:auto;background:var(--wf-surface-muted);">
            <div style="max-width:640px;margin:0 auto;">
                <div style="${S.card}">
                    <h3 style="font-size:14px;font-weight:600;color:var(--wf-text-heading);margin-bottom:20px;border-bottom:1px solid var(--wf-border-muted);padding-bottom:12px;">基本设置</h3>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                        <div><label style="${S.label}">工作流名称 <span style="color:var(--wf-error);">*</span></label><input id="ve-name" type="text" value="${(wc.name || '').replace(/"/g, '&quot;')}" style="${S.input}" placeholder="输入工作流名称"></div>
                        <div><label style="${S.label}">版本号</label><input id="ve-version" type="text" value="${(wc.version || '1.0.0').replace(/"/g, '&quot;')}" style="${S.input}" placeholder="1.0.0"></div>
                        <div><label style="${S.label}">分组</label><input id="ve-group" type="text" value="${(wc.group || '').replace(/"/g, '&quot;')}" style="${S.input}" placeholder="留空表示未分组"></div>
                        <div><label style="${S.label}">排序</label><input id="ve-order" type="number" value="${wc.order || 0}" style="${S.input}"></div>
                    </div>
                    <div style="margin-top:16px;">
                        <label style="display:flex;align-items:center;gap:8px;margin-bottom:8px;"><input type="checkbox" id="ve-enabled" ${wc.enabled !== false ? 'checked' : ''} style="width:16px;height:16px;margin:0;"> <span style="font-size:13px;color:var(--wf-text-secondary);">启用此工作流</span></label>
                    </div>
                </div>
                <div style="${S.card}">
                    <h3 style="font-size:14px;font-weight:600;color:var(--wf-text-heading);margin-bottom:12px;">使用说明</h3>
                    <textarea id="ve-description" style="${S.input}height:360px;resize:vertical;font-family:inherit;line-height:1.5;" placeholder="描述此工作流的用途和使用方法...">${(wc.description || '').replace(/</g, '&lt;')}</textarea>
                </div>
            </div>
        </div>`;
            container.querySelector('#ve-name').oninput = (e) => { wc.name = e.target.value; };
            container.querySelector('#ve-version').oninput = (e) => { wc.version = e.target.value; };
            container.querySelector('#ve-group').oninput = (e) => { wc.group = e.target.value; };
            container.querySelector('#ve-order').oninput = (e) => { wc.order = Number(e.target.value); };
            container.querySelector('#ve-enabled').onchange = (e) => { wc.enabled = e.target.checked; };
            container.querySelector('#ve-description').oninput = (e) => { wc.description = e.target.value; };
        }

        // 统计每个变量在工作流中被引用的位置（按 action 去重）
        // 覆盖三种引用方式：${var} 插值、setVariable/extract 的 variable 字段、variableMatch 条件的变量名
        let varRefs = new Map();

        function collectVarRefs() {
            const refs = new Map();
            const addAction = (varName, stepName, action) => {
                if (!refs.has(varName)) refs.set(varName, []);
                const list = refs.get(varName);
                if (!list.some(r => r.action === action)) list.push({ stepName, action });
            };
            (wc.steps || []).forEach(step => {
                (step.actions || []).forEach(action => {
                    // ${var} 插值：递归扫描动作的所有字符串字段（含嵌套的 condition 对象）
                    const scan = (obj) => {
                        Object.values(obj || {}).forEach(v => {
                            if (typeof v === 'string') {
                                const re = /\$\{(\w+)\}/g;
                                let m;
                                while ((m = re.exec(v))) addAction(m[1], step.name, action);
                            } else if (v && typeof v === 'object') {
                                scan(v);
                            }
                        });
                    };
                    scan(action);
                    // setVariable / extract 直接读写变量名字段
                    if ((action.type === 'setVariable' || action.type === 'extract') && action.variable) {
                        addAction(action.variable, step.name, action);
                    }
                    // extract fields 模式：各字段名即写入的变量名
                    if (action.type === 'extract' && action.fields) {
                        Object.keys(action.fields).forEach(name => addAction(name, step.name, action));
                    }
                    // modal 的 variables 列表按变量名引用
                    if (action.type === 'modal' && Array.isArray(action.variables)) {
                        action.variables.forEach(name => addAction(name, step.name, action));
                    }
                    // 条件判断 variableMatch 按变量名匹配
                    if (action.condition && action.condition.type === 'variableMatch' && action.condition.name) {
                        addAction(action.condition.name, step.name, action);
                    }
                });
            });
            return refs;
        }

        // 变量引用徽章：展示该变量被引用的 action 数量
        function varRefBadgeHtml(key) {
            const n = (varRefs.get(key) || []).length;
            const base = 'padding:3px 10px;border-radius:var(--wf-radius-pill);font-size:11px;flex-shrink:0;white-space:nowrap;';
            const attr = `data-var-key="${key.replace(/"/g, '&quot;')}"`;
            if (!n) return `<span class="ve-var-ref-badge" ${attr} style="${base}background:var(--wf-surface-muted);color:var(--wf-text-faint);border:1px solid var(--wf-border);">未引用</span>`;
            return `<span class="ve-var-ref-badge" ${attr} style="${base}background:var(--wf-primary-light);color:var(--wf-primary-darker);border:1px solid var(--wf-primary-border-light);cursor:help;">🔗 ${n} 处引用</span>`;
        }

        function removeVarRefTooltip() {
            const t = document.getElementById('ve-var-ref-tooltip');
            if (t) t.remove();
        }

        // 悬停徽章时展示引用该变量的 action 的 description
        function bindVarRefTooltips(container) {
            container.querySelectorAll('.ve-var-ref-badge').forEach(badge => {
                badge.onmouseenter = () => {
                    const key = badge.dataset.varKey;
                    const list = varRefs.get(key) || [];
                    removeVarRefTooltip();
                    if (!list.length) return;

                    const items = list.map((r, i) => {
                        const label = r.action.description
                            ? escapeHtml(r.action.description)
                            : `${escapeHtml(ACTION_TYPE_LABELS[r.action.type] || r.action.type || '未知')}（无描述）`;
                        return `<div style="display:flex;gap:6px;align-items:baseline;padding:3px 0;font-size:12px;line-height:1.5;">
                        <span style="color:var(--wf-text-faint);flex-shrink:0;">${i + 1}.</span>
                        <span><span style="color:var(--wf-primary);">[${escapeHtml(r.stepName || '')}]</span> ${label}</span>
                    </div>`;
                    }).join('');

                    const tooltip = document.createElement('div');
                    tooltip.id = 've-var-ref-tooltip';
                    tooltip.style.cssText = 'position:fixed;z-index:100001;max-width:400px;padding:10px 12px;background:var(--wf-text-heading);color:var(--wf-border);border-radius:var(--wf-radius-lg);box-shadow:0 4px 16px rgba(0,0,0,0.3);font-family:inherit;pointer-events:none;';
                    tooltip.innerHTML = `
                    <div style="font-size:12px;font-weight:600;margin-bottom:6px;color:white;">🔗 <code style="font-family:monospace;">${escapeHtml(key)}</code> 被 ${list.length} 个动作引用：</div>
                    ${items}`;
                    document.body.appendChild(tooltip);

                    const rect = badge.getBoundingClientRect();
                    let top = rect.bottom + 6;
                    if (top + tooltip.offsetHeight > window.innerHeight - 8) {
                        top = rect.top - tooltip.offsetHeight - 6;
                    }
                    const left = Math.max(8, Math.min(rect.left, window.innerWidth - tooltip.offsetWidth - 8));
                    tooltip.style.top = `${Math.max(8, top)}px`;
                    tooltip.style.left = `${left}px`;
                };
                badge.onmouseleave = removeVarRefTooltip;
            });
        }

        // 变量管理 - 修复
        function renderVariablesPanel(container) {
            removeVarRefTooltip();
            varRefs = collectVarRefs();
            const vars = wc.variables || {};
            const varEntries = Object.entries(vars);

            container.innerHTML = `
        <div style="flex:1;padding:24px;overflow-y:auto;background:var(--wf-surface-muted);">
            <div style="max-width:640px;margin:0 auto;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                    <h3 style="font-size:14px;font-weight:600;color:var(--wf-text-heading);">变量列表 (${varEntries.length})</h3>
                    <button id="ve-add-var" style="${S.btn}">+ 添加变量</button>
                </div>
                ${varEntries.length === 0 ? '<div style="text-align:center;padding:40px;color:var(--wf-text-faint);font-size:12px;background:var(--wf-surface);border:1px dashed var(--wf-border-strong);border-radius:var(--wf-radius-lg);">暂无变量，点击上方按钮添加</div>' : ''}
                <div id="ve-var-list">${varEntries.map(([k, v], i) => `
                    <div class="ve-var-row" style="${S.card}display:flex;gap:12px;align-items:center;">
                        <div style="flex:1;"><input type="text" value="${k.replace(/"/g, '&quot;')}" data-idx="${i}" data-role="key" data-old-key="${k}" style="${S.input}" placeholder="变量名"></div>
                        <div style="flex:1;"><input type="text" value="${String(v).replace(/"/g, '&quot;')}" data-idx="${i}" data-role="value" style="${S.input}" placeholder="变量值"></div>
                        ${varRefBadgeHtml(k)}
                        <button data-idx="${i}" class="ve-var-del" style="padding:6px 10px;border:none;background:var(--wf-error-light);color:var(--wf-error);border-radius:var(--wf-radius-md);cursor:pointer;font-size:12px;">删除</button>
                    </div>
                `).join('')}
                <div style="margin-top:16px;padding:12px;background:var(--wf-primary-light);border-radius:var(--wf-radius-lg);font-size:12px;color:var(--wf-text-secondary);border:1px solid var(--wf-primary-border-light);">
                    <strong>使用提示：</strong> 在工作流中使用 <code style="background:var(--wf-surface);padding:2px 6px;border-radius:var(--wf-radius-sm);font-family:monospace;">\u0024{变量名}</code> 来引用变量值
                </div>
            </div>
        </div>`;

            container.querySelector('#ve-add-var').onclick = () => {
                const list = container.querySelector('#ve-var-list');
                const idx = Object.keys(wc.variables).length;
                const newKey = `newVar${idx + 1}`;
                wc.variables[newKey] = '';

                const row = document.createElement('div');
                row.className = 've-var-row';
                row.style.cssText = `${S.card}display:flex;gap:12px;align-items:center;`;
                row.innerHTML = `
                <div style="flex:1;"><input type="text" value="${newKey}" data-idx="${idx}" data-role="key" data-old-key="${newKey}" style="${S.input}" placeholder="变量名"></div>
                <div style="flex:1;"><input type="text" data-idx="${idx}" data-role="value" style="${S.input}" placeholder="变量值"></div>
                ${varRefBadgeHtml(newKey)}
                <button data-idx="${idx}" class="ve-var-del" style="padding:6px 10px;border:none;background:var(--wf-error-light);color:var(--wf-error);border-radius:var(--wf-radius-md);cursor:pointer;font-size:12px;">删除</button>`;
                list.appendChild(row);

                // 重新绑定所有事件
                bindVarEvents(container);
                bindVarRefTooltips(container);

                // 聚焦到变量名输入框
                const keyInput = row.querySelector('[data-role="key"]');
                keyInput.focus();
                keyInput.select();
            };
            bindVarEvents(container);
            bindVarRefTooltips(container);
        }

        function bindVarEvents(container) {
            // 删除按钮
            container.querySelectorAll('.ve-var-del').forEach(btn => {
                btn.onclick = () => {
                    const rows = container.querySelectorAll('.ve-var-row');
                    const row = rows[parseInt(btn.dataset.idx)];
                    const keyInput = row.querySelector('[data-role="key"]');
                    const oldKey = keyInput.dataset.oldKey || keyInput.value;
                    if (oldKey && wc.variables.hasOwnProperty(oldKey)) {
                        delete wc.variables[oldKey];
                    }
                    renderVariablesPanel(container);
                };
            });

            // 变量名输入 - 处理重命名
            container.querySelectorAll('[data-role="key"]').forEach(el => {
                const oldKey = el.dataset.oldKey || el.value;
                el.onchange = () => {
                    const newKey = el.value.trim();
                    const row = el.closest('.ve-var-row');
                    const valInput = row.querySelector('[data-role="value"]');
                    const value = valInput.value;

                    if (!newKey) {
                        showToast('变量名不能为空', 'error');
                        el.value = oldKey;
                        return;
                    }

                    if (oldKey && newKey !== oldKey && wc.variables.hasOwnProperty(oldKey)) {
                        delete wc.variables[oldKey];
                    }
                    wc.variables[newKey] = value;
                    el.dataset.oldKey = newKey;
                    renderVariablesPanel(container);
                };
            });

            // 变量值输入
            container.querySelectorAll('[data-role="value"]').forEach(el => {
                el.onchange = () => {
                    const row = el.closest('.ve-var-row');
                    const keyInput = row.querySelector('[data-role="key"]');
                    const key = keyInput.value || keyInput.dataset.oldKey;
                    if (key) {
                        wc.variables[key] = el.value;
                    }
                };
            });
        }

        // 执行管理 - 改进样式
        function renderExecutionPanel(container) {
            container.innerHTML = `
        <div style="flex:1;padding:24px;overflow-y:auto;background:var(--wf-surface-muted);">
            <div style="max-width:540px;margin:0 auto;">
                <div style="${S.card}">
                    <h3 style="font-size:14px;font-weight:600;color:var(--wf-text-heading);margin-bottom:16px;">执行设置</h3>
                    <div style="${S.row}">
                        <label style="${S.label}">步骤间延迟 (毫秒)</label>
                        <input id="ve-stepdelay" type="number" value="${wc.execution.stepDelay || 500}" style="${S.input}">
                        <div style="font-size:11px;color:var(--wf-text-muted);margin-top:4px;">每个动作执行完毕后等待的时间</div>
                    </div>
                    <div style="${S.row}">
                        <label style="${S.label}">错误处理策略</label>
                        <select id="ve-onerror" style="${S.input}">
                            <option value="continue" ${wc.execution.onError === 'continue' ? 'selected' : ''}>继续执行</option>
                            <option value="stop" ${wc.execution.onError === 'stop' ? 'selected' : ''}>停止执行</option>
                            <option value="manual" ${wc.execution.onError === 'manual' ? 'selected' : ''}>手动处理</option>
                        </select>
                        <div style="font-size:11px;color:var(--wf-text-muted);margin-top:4px;">遇到错误时的处理方式</div>
                    </div>
                    <div style="${S.row}">
                        <label style="font-size:13px;display:flex;align-items:center;gap:6px;cursor:pointer;">
                            <input id="ve-automatch" type="checkbox" ${wc.execution.autoMatchOnComplete ? 'checked' : ''} style="width:16px;height:16px;margin:0;">
                            执行完毕后自动匹配工作流
                        </label>
                        <div style="font-size:11px;color:var(--wf-text-muted);margin-top:4px;">整个工作流全部步骤执行完毕后，根据当前页面 URL 快速匹配并切换到匹配的工作流。适用于登录后跳转等场景。</div>
                    </div>
                    ${wc.execution.autoMatchOnComplete ? `
                    <div style="${S.row}">
                        <label style="${S.label}">自动匹配延迟（毫秒）</label>
                        <input id="ve-automatch-delay" type="number" value="${wc.execution.autoMatchDelay || 800}" style="${S.input}">
                        <div style="font-size:11px;color:var(--wf-text-muted);margin-top:4px;">等待页面跳转完成的时间。默认 800ms，可根据网络情况调整。</div>
                    </div>` : ''}
                </div>
                <div style="margin-top:16px;padding:16px;background:var(--wf-surface-muted);border-radius:var(--wf-radius-lg);font-size:12px;color:var(--wf-text-secondary);">
                    <div style="font-weight:600;margin-bottom:8px;">策略说明</div>
                    <ul style="margin:0;padding-left:20px;color:var(--wf-text-muted);line-height:1.6;">
                        <li><strong>继续执行</strong>：跳过错误动作，继续执行后续步骤</li>
                        <li><strong>停止执行</strong>：遇到错误时立即停止整个工作流</li>
                        <li><strong>手动处理</strong>：暂停工作流，等待用户处理后手动继续</li>
                    </ul>
                </div>
            </div>
        </div>`;
            container.querySelector('#ve-stepdelay').oninput = (e) => { wc.execution.stepDelay = Number(e.target.value); };
            container.querySelector('#ve-onerror').onchange = (e) => { wc.execution.onError = e.target.value; };
            container.querySelector('#ve-automatch').onchange = (e) => {
                wc.execution.autoMatchOnComplete = e.target.checked;
                renderExecutionPanel(container);  // 重新渲染以显示/隐藏延迟输入框
            };
            const delayInput = container.querySelector('#ve-automatch-delay');
            if (delayInput) {
                delayInput.oninput = (e) => { wc.execution.autoMatchDelay = Number(e.target.value); };
            }
        }

        // 步骤流程 - 已移除
        function renderStepsPanel(container) {
            container.innerHTML = `
        <div style="flex:1;padding:40px;display:flex;align-items:center;justify-content:center;">
            <div style="text-align:center;color:var(--wf-text-faint);">
                <div style="font-size:48px;margin-bottom:16px;">🚧</div>
                <div style="font-size:14px;">步骤流程编辑功能已移除</div>
                <div style="font-size:12px;margin-top:8px;">请使用"高级模式"编辑工作流配置</div>
                <button id="ve-to-advanced-btn" style="margin-top:16px;padding:8px 16px;border:none;background:var(--wf-primary);color:white;border-radius:var(--wf-radius-md);font-size:12px;cursor:pointer;">切换到高级模式</button>
            </div>
        </div>`;
            container.querySelector('#ve-to-advanced-btn').onclick = () => {
                document.getElementById('ve-advanced-btn').click();
            };
        }

        // 初始渲染
        renderTabs();
        renderContent();

        // 按钮事件
        function closeModal() { removeVarRefTooltip(); modal.remove(); }
        document.getElementById('ve-close-btn').onclick = closeModal;
        document.getElementById('ve-cancel-btn').onclick = closeModal;
        document.getElementById('ve-advanced-btn').onclick = () => { closeModal(); openConfigEditor(); };

        document.getElementById('ve-json-toggle').onclick = () => {
            const content = document.getElementById('ve-content');
            const isShowing = content.querySelector('#ve-json-preview');
            if (isShowing) {
                renderContent();
                document.getElementById('ve-json-toggle').textContent = '📋 预览JSON';
            } else {
                content.innerHTML = `<div id="ve-json-preview" style="flex:1;padding:24px;overflow:auto;background:var(--wf-surface-muted);"><pre style="font-size:12px;line-height:1.5;color:var(--wf-text-heading);font-family:Consolas,Monaco,monospace;white-space:pre-wrap;">${JSON.stringify(wc, null, 2).replace(/</g, '&lt;')}</pre></div>`;
                document.getElementById('ve-json-toggle').textContent = '📋 返回编辑';
            }
        };

        document.getElementById('ve-save-btn').onclick = () => {
            if (!wc.name || !wc.name.trim()) { showToast('工作流名称不能为空', 'error'); return; }
            wc.id = activeWorkflowId;
            setWorkflow(wc);
            const idx = workflowList.findIndex(w => w.id === activeWorkflowId);
            if (idx !== -1) workflowList[idx] = workflow;
            saveWorkflowList();
            addLog(`配置已更新(可视化) - 工作流: ${wc.name}, 步骤数: ${wc.steps.length}`, 'success');
            updateUI$1();
            updateWorkflowSelect();
            updateWorkflowInfoDisplay();
            renderLogs();
            modal.remove();
            showToast(`配置已保存，步骤数: ${wc.steps.length}`, 'success');
        };

        modal.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
        modal.onclick = (e) => { if (e.target === modal) closeModal(); };

        return;
    }

    /**
     * 自动更新检查模块
     * 每小时检查一次 GitHub Pages 上的版本信息，发现新版本时提醒用户
     */

    // ⚠️ 需要配置：将这些 URL 改为你的实际地址
    const CONFIG = {
        // GitHub Pages 上的 version.json 地址
        versionUrl: 'https://yingchengwang.github.io/pub/workhelper/version.json',

        // 脚本主页（用户点击"更新"时打开的页面）
        scriptUrl: 'https://yingchengwang.github.io/pub/workhelper/form-workflow.user.js',

        // 工作流版本信息地址（GitHub Pages 上的 workflow-versions.json）
        workflowVersionsUrl: 'https://yingchengwang.github.io/pub/workhelper/workflow-versions.json',

        // 检查间隔（毫秒）：20分钟 = 1200000
        checkInterval: 20 * 60 * 1000,
    };

    // 存储键名
    const KEYS = {
        lastCheck: 'updater_lastCheck',
        dismissedVersion: 'updater_dismissedVersion',
        workflowLastCheck: 'workflow_updater_lastCheck',
    };

    // 定时器引用
    let updateTimer = null;
    let workflowUpdateTimer = null;

    /**
     * 启动自动更新检查（在页面加载时调用一次）
     */
    function startAutoCheck() {
        // 立即检查一次
        performUpdateCheck();
        performWorkflowUpdateCheck();
    }

    /**
     * 执行脚本更新检查并调度下一次
     */
    async function performUpdateCheck() {
        const result = await checkUpdateCore();
        if (result && result.hasUpdate) {
            window.wfHasUpdate = true;
        }
        // 调度下一次检查
        scheduleNextUpdateCheck();
    }

    /**
     * 执行工作流更新检查并调度下一次
     */
    async function performWorkflowUpdateCheck() {
        const result = await checkWorkflowUpdateCore();
        if (result && result.hasUpdate) {
            window.wfWorkflowUpdate = true;
        }
        // 调度下一次检查
        scheduleNextWorkflowUpdateCheck();
    }

    /**
     * 调度下一次脚本更新检查
     */
    function scheduleNextUpdateCheck() {
        if (updateTimer) clearTimeout(updateTimer);
        updateTimer = setTimeout(() => {
            console.log('[AutoCheck] 开始定时检查脚本更新...');
            performUpdateCheck();
        }, CONFIG.checkInterval);
        console.log(`[AutoCheck] 下次脚本更新检查将在 ${CONFIG.checkInterval / 1000 / 60} 分钟后执行`);
    }

    /**
     * 调度下一次工作流更新检查
     */
    function scheduleNextWorkflowUpdateCheck() {
        if (workflowUpdateTimer) clearTimeout(workflowUpdateTimer);
        workflowUpdateTimer = setTimeout(() => {
            console.log('[AutoCheck] 开始定时检查工作流更新...');
            performWorkflowUpdateCheck();
        }, CONFIG.checkInterval);
        console.log(`[AutoCheck] 下次工作流更新检查将在 ${CONFIG.checkInterval / 1000 / 60} 分钟后执行`);
    }

    /**
     * 使用 GM_xmlhttpRequest 获取 JSON（绕过 CSP 限制）
     * 添加时间戳参数避免缓存
     */
    function fetchJson(url) {
        // 添加缓存破坏参数
        const cacheBuster = `_t=${Date.now()}`;
        const separator = url.includes('?') ? '&' : '?';
        const urlWithCacheBuster = url + separator + cacheBuster;

        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: urlWithCacheBuster,
                onload: (response) => {
                    if (response.status >= 200 && response.status < 300) {
                        try {
                            const data = JSON.parse(response.responseText);
                            resolve(data);
                        } catch (e) {
                            reject(new Error(`解析 JSON 失败: ${e.message}`));
                        }
                    } else {
                        reject(new Error(`HTTP ${response.status}`));
                    }
                },
                onerror: (e) => {
                    reject(new Error('网络请求失败'));
                },
                ontimeout: () => {
                    reject(new Error('请求超时'));
                },
                timeout: 10000
            });
        });
    }

    /**
     * 手动检查更新（返回结果给 UI 显示）
     * @returns {Promise<object>}
     */
    async function manualCheckUpdate() {
        const currentVersion = getCurrentVersion();

        try {
            const data = await fetchJson(CONFIG.versionUrl);

            return {
                hasUpdate: isNewer(data.version, currentVersion),
                current: currentVersion,
                latest: data.version,
                changelog: data.changelog,
                updatedAt: data.updatedAt || null,
                scriptUrl: CONFIG.scriptUrl
            };
        } catch (e) {
            throw new Error(`检查更新失败: ${e.message}`);
        }
    }

    /**
     * 自动检查是否有新版本可用（后台静默检查）
     * @returns {Promise<object>} 返回检查结果 { hasUpdate: boolean, latest: string, current: string, changelog: string, scriptUrl: string }
     */
    async function checkUpdateCore() {
        const lastCheck = GM_getValue(KEYS.lastCheck, 0);
        const now = Date.now();
        const currentVersion = getCurrentVersion();

        console.log(`[Updater] 开始检查更新，当前版本: ${currentVersion}`);
        console.log(`[Updater] 上次检查时间: ${new Date(lastCheck).toLocaleString()}`);
        console.log(`[Updater] 当前时间: ${new Date(now).toLocaleString()}`);
        console.log(`[Updater] 距离上次检查: ${Math.floor((now - lastCheck) / 1000 / 60)} 分钟`);
        console.log(`[Updater] 检查间隔: ${CONFIG.checkInterval / 1000 / 60} 分钟`);

        // 未到检查时间
        if (now - lastCheck < CONFIG.checkInterval) {
            console.log(`[Updater] 未到检查时间，跳过本次检查`);
            // 即使不到检查时间，也返回是否有未处理的更新
            const dismissed = GM_getValue(KEYS.dismissedVersion, '');
            console.log(`[Updater] 已忽略版本: ${dismissed || '无'}`);
            return { hasUpdate: false, current: currentVersion };
        }

        // 更新检查时间
        GM_setValue(KEYS.lastCheck, now);
        console.log(`[Updater] 开始请求版本信息: ${CONFIG.versionUrl}`);

        try {
            const data = await fetchJson(CONFIG.versionUrl);
            console.log(`[Updater] 获取到版本信息:`, data);

            // 检查是否是新版本
            if (isNewer(data.version, currentVersion)) {
                console.log(`[Updater] 版本比较: ${data.version} > ${currentVersion} (有新版本)`);
                // 检查用户是否已忽略此版本
                const dismissed = GM_getValue(KEYS.dismissedVersion, '');
                if (dismissed === data.version) {
                    console.log(`[Updater] 版本 ${data.version} 已被用户忽略`);
                    return { hasUpdate: false, current: currentVersion };
                }

                // 静默提醒：通过 UI 标记而不是弹窗
                console.log(`[Updater] 发现新版本 ${data.version}`);
                const result = {
                    hasUpdate: true,
                    latest: data.version,
                    current: currentVersion,
                    changelog: data.changelog,
                    scriptUrl: CONFIG.scriptUrl
                };
                // 通知 UI 显示更新提示
                if (updateCallback) {
                    updateCallback(result);
                }
                return result;
            } else {
                console.log(`[Updater] 已是最新版本 ${currentVersion}`);
                return { hasUpdate: false, current: currentVersion };
            }
        } catch (e) {
            console.error('[Updater] 检查更新失败:', e.message);
            return { hasUpdate: false, error: e.message };
        }
    }

    /**
     * 设置有新版本可用的回调（用于通知 UI）
     */
    let updateCallback = null;
    function setUpdateCallback(callback) {
        updateCallback = callback;
    }

    /**
     * 检查工作流是否有新版本
     * @returns {Promise<object>} 返回检查结果 { hasUpdate: boolean, workflows: array }
     */
    async function checkWorkflowUpdateCore() {
        const lastCheck = GM_getValue(KEYS.workflowLastCheck, 0);
        const now = Date.now();

        console.log(`[WorkflowUpdater] 开始检查工作流更新`);
        console.log(`[WorkflowUpdater] 上次检查时间: ${new Date(lastCheck).toLocaleString()}`);

        // 未到检查时间，跳过
        if (now - lastCheck < CONFIG.checkInterval) {
            console.log(`[WorkflowUpdater] 未到检查时间，跳过本次检查`);
            return { hasUpdate: false, workflows: [] };
        }

        // 更新检查时间
        GM_setValue(KEYS.workflowLastCheck, now);

        try {
            const data = await fetchJson(CONFIG.workflowVersionsUrl);
            console.log(`[WorkflowUpdater] 获取到工作流版本信息:`, data);

            // 获取本地存储的工作流列表
            const localWorkflows = GM_getValue('workflow_list', []);
            if (!localWorkflows || localWorkflows.length === 0) {
                console.log(`[WorkflowUpdater] 没有本地工作流`);
                return { hasUpdate: false, workflows: [] };
            }

            // 检查哪些工作流有更新（使用工作流名称作为标识）
            const updatedWorkflows = [];
            localWorkflows.forEach(localWf => {
                const remoteInfo = data.workflows?.[localWf.name];
                if (remoteInfo && isNewer(remoteInfo.version, localWf.version || '0')) {
                    updatedWorkflows.push({
                        id: localWf.id,
                        name: localWf.name,
                        currentVersion: localWf.version,
                        latestVersion: remoteInfo.version,
                        downloadUrl: remoteInfo.url,
                        changelog: remoteInfo.changelog
                    });
                    console.log(`[WorkflowUpdater] 工作流「${localWf.name}」有更新: ${localWf.version} -> ${remoteInfo.version}`);
                }
            });

            if (updatedWorkflows.length > 0) {
                console.log(`[WorkflowUpdater] 发现 ${updatedWorkflows.length} 个工作流有更新`);
                const result = {
                    hasUpdate: true,
                    workflows: updatedWorkflows
                };
                // 通知 UI 显示更新提示
                if (updateCallback) {
                    updateCallback(result);
                }
                return result;
            }

            console.log(`[WorkflowUpdater] 所有工作流已是最新版本`);
            return { hasUpdate: false, workflows: [] };
        } catch (e) {
            console.error('[WorkflowUpdater] 检查工作流更新失败:', e.message);
            return { hasUpdate: false, workflows: [], error: e.message };
        }
    }

    /**
     * 获取云端工作流列表（用于 UI 展示）
     * @returns {Promise<object>} 返回云端工作流列表
     */
    async function getRemoteWorkflows() {
        try {
            const data = await fetchJson(CONFIG.workflowVersionsUrl);
            // 获取本地工作流列表
            const localWorkflows = GM_getValue('workflow_list', []);

            // 为每个云端工作流添加本地版本信息
            const workflows = Object.entries(data.workflows || {}).map(([name, info]) => {
                const localWf = localWorkflows.find(w => w.name === name);
                return {
                    name,
                    version: info.version,
                    url: info.url,
                    changelog: info.changelog,
                    updatedAt: info.updatedAt || null,
                    localVersion: localWf?.version || null,
                    hasUpdate: localWf && isNewer(info.version, localWf.version || '0'),
                    isInstalled: !!localWf
                };
            });

            return { workflows };
        } catch (e) {
            console.error('[WorkflowUpdater] 获取云端工作流列表失败:', e.message);
            return { workflows: [], error: e.message };
        }
    }

    /**
     * 从云端下载并导入工作流
     * @param {string} workflowName - 工作流名称
     * @returns {Promise<object>} 返回导入结果
     */
    async function downloadWorkflow(workflowName) {
        try {
            const data = await fetchJson(CONFIG.workflowVersionsUrl);
            const workflowInfo = data.workflows?.[workflowName];
            if (!workflowInfo) {
                throw new Error('工作流不存在');
            }

            // 下载工作流配置
            const workflowConfig = await fetchJson(workflowInfo.url);

            return {
                success: true,
                workflow: workflowConfig
            };
        } catch (e) {
            console.error('[WorkflowUpdater] 下载工作流失败:', e.message);
            return { success: false, error: e.message };
        }
    }

    /**
     * 获取当前脚本版本
     */
    function getCurrentVersion() {
        // 从 GM_info 获取版本号
        if (GM_info && GM_info.script && GM_info.script.version) {
            return GM_info.script.version;
        }

        // 备用：从 meta.js 的 banner 中解析（rollup 打包后版本在文件头部）
        const match = /\/\/ @version\s+(.+)/.exec(document.querySelector('script')?.textContent || '');
        return match ? match[1].trim() : '0.0.0';
    }

    /**
     * 比较版本号，返回 latest 是否比 current 新
     * 支持语义化版本比较，如 "1.2.10" > "1.2.9"
     */
    function isNewer(latest, current) {
        const parse = (v) => v.split('.').map(n => parseInt(n, 10) || 0);
        const [lMajor, lMinor = 0, lPatch = 0] = parse(latest);
        const [cMajor, cMinor = 0, cPatch = 0] = parse(current);

        if (lMajor !== cMajor) return lMajor > cMajor;
        if (lMinor !== cMinor) return lMinor > cMinor;
        return lPatch > cPatch;
    }

    // 导出别名，保持向后兼容
    const checkUpdate = checkUpdateCore;
    const checkWorkflowUpdate = checkWorkflowUpdateCore;

    // ============================================
    // UI 创建
    // ============================================
    function createUI() {
        if (document.getElementById('workflow-panel')) return;

        // 加载多工作流配置
        try {
            loadWorkflowList();
            console.log('[Config Load] Loaded workflow list, count:', workflowList.length, 'active:', workflow.name);
        } catch (e) {
            console.error('[Config Load] Error loading config:', e);
            setWorkflow(JSON.parse(JSON.stringify(DEFAULT_WORKFLOW)));
            workflow.id = String(Date.now());
            setWorkflowList([workflow]);
            setActiveWorkflowId(workflow.id);
        }

        // 加载状态
        const savedState = loadState();
        let shouldAutoResume = false;
        const STATE_EXPIRE_MS = 5 * 60 * 1000;
        if (savedState && savedState.workflowName === workflow.name &&
            savedState.timestamp && (Date.now() - savedState.timestamp) < STATE_EXPIRE_MS) {
            setCurrentStepIndex(savedState.currentStepIndex);
            if (savedState.workflowCompleted) {
                setWorkflowCompleted(true);
            }
            // 恢复运行时变量（跨页导航后内容不丢失）
            if (savedState.runtimeVariables && typeof savedState.runtimeVariables === 'object') {
                setRuntimeVariables(savedState.runtimeVariables);
            }
            // 恢复自动匹配待执行标记
            if (savedState.autoMatchPending) {
                setAutoMatchPending(savedState.autoMatchPending);
            }
            const stepsLength = workflow?.steps?.length || 0;
            const hasUnfinishedSteps = savedState.currentStepIndex < stepsLength;
            const wasRunning = savedState.isRunning || savedState.autoContinue;
            if (wasRunning && (savedState.currentActionIndex >= 0 || hasUnfinishedSteps)) {
                setCurrentActionIndex(savedState.currentActionIndex);
                shouldAutoResume = true;
                if (savedState.autoContinue !== undefined) {
                    setAutoContinue(savedState.autoContinue);
                }
            }
        } else if (savedState && savedState.timestamp && (Date.now() - savedState.timestamp) >= STATE_EXPIRE_MS) {
            clearState();
        }

        // 浮动按钮 - 先移除旧的，避免事件监听器累积
        const oldBtn = document.getElementById('workflow-floating-btn');
        if (oldBtn) oldBtn.remove();

        const floatingBtn = document.createElement('button');
        floatingBtn.id = 'workflow-floating-btn';
        floatingBtn.innerHTML = '📝';
        floatingBtn.title = '表单工作流';
        let hasDraggedFloatingBtn = false;

        floatingBtn.onclick = (e) => {
            if (hasDraggedFloatingBtn) {
                hasDraggedFloatingBtn = false;
                return;
            }
            const panel = document.getElementById('workflow-panel');
            if (panel) panel.remove();
            else createUI();
        };

        // 加载保存的浮动按钮位置
        const savedBtnPos = GM_getValue('floating_btn_position');
        if (savedBtnPos) {
            setFloatingBtnPosition(savedBtnPos);
        }

        // 应用位置到浮动按钮
        floatingBtn.style.right = floatingBtnPosition.right + 'px';
        floatingBtn.style.bottom = floatingBtnPosition.bottom + 'px';

        // 浮动按钮拖拽
        floatingBtn.addEventListener('mousedown', (e) => {
            hasDraggedFloatingBtn = false;
            floatingBtnDragData.isDragging = true;
            floatingBtnDragData.startX = e.clientX;
            floatingBtnDragData.startY = e.clientY;
            floatingBtnDragData.startRight = parseFloat(floatingBtn.style.right) || 0;
            floatingBtnDragData.startBottom = parseFloat(floatingBtn.style.bottom) || 0;
            floatingBtn.classList.add('dragging');
            e.preventDefault();
        });

        document.body.appendChild(floatingBtn);

        // 主面板
        const panel = document.createElement('div');
        panel.id = 'workflow-panel';
        panel.innerHTML = `
        <div class="wf-panel-header">
            <div class="wf-title">
                <span>📝</span>
                <span>工作流助手</span>
                <span class="wf-version">v${GM_info.script.version}</span>
            </div>
            <div class="wf-header-btns">
                <button class="wf-header-btn wf-update-btn" id="update-check-btn">
                    更新
                    <span class="wf-update-dot" id="update-dot" style="display:none;"></span>
                </button>
                <button class="wf-header-btn" id="minimize-btn" title="最小化">−</button>
                <button class="wf-header-btn" id="close-btn" title="关闭">×</button>
            </div>
        </div>
        <div class="wf-panel-body" id="panel-body">
            <div class="wf-main">
                <div class="wf-info-bar">
                    <div class="wf-name" id="workflow-name-display">📋 ${workflow.name} <span id="workflow-config-version" style="font-size:10px;color:var(--wf-text-faint);">v${workflow.version || '1.0.0'}</span></div>
                    <div class="wf-status" id="workflow-status">准备就绪</div>
                </div>

                <div class="wf-progress-section">
                    <div class="wf-progress-bar">
                        <div class="wf-progress-fill" id="progress-fill"></div>
                    </div>
                    <div class="wf-progress-text" id="progress-text">等待开始...</div>
                </div>

                <div class="wf-action-btns">
                    <div class="wf-btn-row">
                        <button class="wf-btn wf-btn-start" id="start-btn">▶ 开始</button>
                        <button class="wf-btn wf-btn-stop" id="stop-btn">⏹ 停止</button>
                    </div>
                    <div class="wf-btn-row">
                        <button class="wf-btn wf-btn-reset" id="reset-btn">↺ 重置</button>
                        <button class="wf-btn wf-btn-desc" id="desc-btn">📖 说明</button>
                    </div>
                    <div class="wf-btn-row">
                        <button class="wf-btn wf-btn-vars" id="vars-btn" style="width:100%;">🔧 变量替换</button>
                    </div>
                </div>

                <div class="wf-user-action" id="user-action-waiting" style="display:none;">
                    <div class="wf-user-msg" id="user-action-message">⏸ 等待您手动完成操作...</div>
                    <button class="wf-btn-continue" id="continue-btn">✓ 完成操作，继续执行</button>
                </div>

                <div class="wf-step-list-wrapper" id="step-list-wrapper" style="position:relative;overflow:hidden;display:flex;flex-direction:column;min-height:0;">
                    <div class="wf-step-list-header" id="step-list-toggle">
                        <span>📋 步骤列表</span>
                        <span class="toggle-arrow">▼</span>
                    </div>
                    <div style="flex:1;position:relative;overflow:hidden;">
                        <svg id="wf-connections" style="position:absolute;top:0;left:0;right:0;bottom:0;pointer-events:none;z-index:5;"></svg>
                        <div class="wf-step-list" id="step-list" style="position:absolute;top:0;left:0;right:0;bottom:0;overflow-y:auto;padding:4px 0;z-index:2;"></div>
                    </div>
                </div>
            </div>

            <div class="wf-sidebar">
                <div class="wf-sidebar-section">
                    <div class="wf-sidebar-title">工作流管理</div>
                    <div style="display:flex;gap:4px;align-items:center;">
                        <select id="workflow-select" class="wf-select" style="flex:1;min-width:0;"></select>
                        <button id="wf-automatch-btn" class="wf-sm-btn" title="根据当前页面 URL 快速匹配工作流" style="flex-shrink:0;padding:4px 7px;font-size:13px;">⚡</button>
                    </div>
                    <div style="display:flex;gap:4px;margin-top:8px;">
                        <button id="wf-new-btn" class="wf-sm-btn" style="flex:1;padding:6px 8px;font-size:11px;white-space:nowrap;">➕ 新建</button>
                        <button id="wf-delete-btn" class="wf-sm-btn" style="flex:1;padding:6px 8px;font-size:11px;white-space:nowrap;">🗑 删除</button>
                        <button class="wf-edit-config-btn" id="edit-config-btn" style="flex:1;padding:6px 8px;font-size:11px;white-space:nowrap;">✏️ 编辑配置</button>
                    </div>
                </div>
                <div class="wf-log-section">
                    <div class="wf-log-header">
                        <span class="wf-sidebar-title">执行日志</span>
                        <button id="clear-logs-btn" class="wf-sm-btn" style="padding:2px 6px;">🗑</button>
                    </div>
                    <div class="wf-log-area" id="workflow-log-area"></div>
                </div>
            </div>
        </div>
        <div class="resize-handle resize-handle-tl" id="resize-handle-tl"></div>
        <div class="resize-handle resize-handle-tr" id="resize-handle-tr"></div>
        <div class="resize-handle resize-handle-bl" id="resize-handle-bl"></div>
        <div class="resize-handle resize-handle-br" id="resize-handle-br"></div>
    `;

        document.body.appendChild(panel);

        // 创建值编辑模态框
        const valueEditModal = document.createElement('div');
        valueEditModal.id = 'value-edit-modal';
        valueEditModal.className = 'wf-modal';
        valueEditModal.style.cssText = 'display:none;position:fixed;top:0;left:0;width:100%;height:100%;z-index:100000;background:var(--wf-overlay);display:none;align-items:center;justify-content:center;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;';
        valueEditModal.innerHTML = `
        <div class="wf-modal-dialog" style="background:var(--wf-surface);border-radius:var(--wf-radius-xl);box-shadow:0 20px 60px rgba(0,0,0,0.2);padding:20px;min-width:300px;max-width:420px;animation:wfModalFadeIn 0.15s ease-out;">
            <div style="font-size:15px;font-weight:600;color:var(--wf-text);margin-bottom:14px;">✏️ 修改值</div>
            <div style="margin-bottom:12px;">
                <label for="value-edit-input" style="display:block;font-size:12px;color:var(--wf-text-secondary);margin-bottom:4px;">新值:</label>
                <input type="text" id="value-edit-input" style="width:100%;padding:7px 10px;border:1px solid var(--wf-border);border-radius:var(--wf-radius-md);font-size:13px;transition:border-color 0.15s;" placeholder="输入新值，数组格式如: [&quot;a&quot;, &quot;b&quot;]">
                <div id="value-edit-resolved" style="font-size:12px;color:var(--wf-text-faint);margin-top:6px;display:none;">
                    实际值：<span id="value-edit-resolved-value" style="color:var(--wf-text-secondary);font-weight:500;"></span>
                </div>
            </div>
            <div style="font-size:11px;color:var(--wf-text-muted);margin-bottom:14px;line-height:1.4;">
                💡 提示：select 类型支持数组格式，尝试多个值直到匹配，如 <code style="background:var(--wf-surface-muted);padding:1px 4px;border-radius:var(--wf-radius-sm);">[&quot;选项1&quot;, &quot;选项2&quot;]</code>；也支持按位置选择：<code style="background:var(--wf-surface-muted);padding:1px 4px;border-radius:var(--wf-radius-sm);">##1</code> 第1项、<code style="background:var(--wf-surface-muted);padding:1px 4px;border-radius:var(--wf-radius-sm);">##last</code> 最后一项、<code style="background:var(--wf-surface-muted);padding:1px 4px;border-radius:var(--wf-radius-sm);">##random</code> 随机
            </div>
            <div style="display:flex;justify-content:flex-end;gap:8px;">
                <button id="value-edit-cancel" style="padding:6px 14px;border:1px solid var(--wf-border);background:var(--wf-surface);border-radius:var(--wf-radius-md);font-size:12px;cursor:pointer;color:var(--wf-text-secondary);">取消</button>
                <button id="value-edit-confirm" style="padding:6px 14px;border:none;background:var(--wf-primary);color:white;border-radius:var(--wf-radius-md);font-size:12px;font-weight:500;cursor:pointer;">确定</button>
            </div>
        </div>
    `;
        document.body.appendChild(valueEditModal);

        valueEditModal.onclick = (e) => { if (e.target === valueEditModal) closeValueEditModal(); };
        valueEditModal.querySelector('#value-edit-cancel').onclick = closeValueEditModal;
        valueEditModal.querySelector('#value-edit-confirm').onclick = confirmValueEdit;

        function closeValueEditModal() {
            valueEditModal.style.display = 'none';
            setCurrentValueEditAction(null);
        }

        function confirmValueEdit() {
            if (!currentValueEditAction) return;
            const input = document.getElementById('value-edit-input');
            const rawValue = input.value.trim();
            if (!rawValue) {
                closeValueEditModal();
                return;
            }

            // 尝试解析为数组（JSON 格式）
            let newValue = rawValue;
            if (rawValue.startsWith('[') && rawValue.endsWith(']')) {
                try {
                    const parsed = JSON.parse(rawValue);
                    if (Array.isArray(parsed)) {
                        newValue = parsed;
                    }
                } catch (e) {
                    // 解析失败，使用原始字符串
                    console.warn('值编辑 JSON 解析失败，使用原始字符串:', e);
                }
            }

            const { stepIndex, actionIndex } = currentValueEditAction;
            const action = workflow.steps[stepIndex].actions[actionIndex];
            const displayValue = Array.isArray(newValue) ? `[${newValue.join(', ')}]` : newValue;

            // 检测当前生效值（override 优先）是否是单一变量引用，如 ${mobilePhoneNo}
            const currentValue = getEffectiveActionValue(stepIndex, actionIndex);
            const varRefMatch = typeof currentValue === 'string' && currentValue.match(/^\$\{(\w+)\}$/);
            // 新值本身也是变量引用时（如用户输入 ${username}），不触发修改变量的弹窗，直接写 override
            const newValueIsVarRef = typeof newValue === 'string' && /^\$\{(\w+)\}$/.test(newValue);

            if (varRefMatch && !newValueIsVarRef) {
                const varName = varRefMatch[1];
                closeValueEditModal();
                showConfirm(
                    `是否修改变量 <code style="background:var(--wf-surface-muted);padding:1px 5px;border-radius:var(--wf-radius-sm);font-size:13px;">\${${varName}}</code> 的值？` +
                    `<div style="margin-top:10px;display:flex;flex-direction:column;gap:6px;">` +
                    `<div style="font-size:13px;color:var(--wf-text-secondary);background:var(--wf-surface-muted);border-radius:var(--wf-radius-md);padding:7px 10px;">` +
                    `<strong style="color:var(--wf-text-heading);">仅改当前：</strong>只覆盖此动作，不影响其他引用该变量的动作</div>` +
                    `<div style="font-size:13px;color:var(--wf-text-secondary);background:var(--wf-surface-muted);border-radius:var(--wf-radius-md);padding:7px 10px;">` +
                    `<strong style="color:var(--wf-text-heading);">修改变量：</strong>同时影响所有引用 \${${varName}} 的动作</div>` +
                    `</div>`,
                    {
                        title: '修改方式',
                        confirmText: '修改变量',
                        cancelText: '仅改当前',
                        type: 'info'
                    }
                ).then(modifyVar => {
                    if (modifyVar) {
                        // 修改变量值，影响所有引用该变量的动作
                        workflow.variables[varName] = newValue;
                        // 同步到 workflowList
                        const wfInList = workflowList.find(w => w.id === activeWorkflowId);
                        if (wfInList) wfInList.variables[varName] = newValue;
                        saveWorkflowList();
                        addLog(`已修改变量 ${varName} -> ${displayValue}`, 'info');
                    } else {
                        // 仅覆盖当前 action
                        setActionOverride(activeWorkflowId, stepIndex, actionIndex, 'value', newValue);
                        addLog(`已修改值(覆盖): ${action.description || action.type} -> ${displayValue}`, 'info');
                    }
                    saveState();
                    updateUI();
                });
            } else {
                setActionOverride(activeWorkflowId, stepIndex, actionIndex, 'value', newValue);
                saveState();
                updateUI();
                addLog(`已修改值: ${action.description || action.type} -> ${displayValue}`, 'info');
                closeValueEditModal();
            }
        }

        // 创建选择器编辑模态框
        const selectorEditModal = document.createElement('div');
        selectorEditModal.id = 'selector-edit-modal';
        selectorEditModal.className = 'wf-modal';
        selectorEditModal.style.cssText = 'display:none;position:fixed;top:0;left:0;width:100%;height:100%;z-index:100000;background:var(--wf-overlay);display:none;align-items:center;justify-content:center;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;';
        selectorEditModal.innerHTML = `
        <div class="wf-modal-dialog" style="background:var(--wf-surface);border-radius:var(--wf-radius-xl);box-shadow:0 20px 60px rgba(0,0,0,0.2);padding:20px;min-width:320px;max-width:480px;animation:wfModalFadeIn 0.15s ease-out;">
            <div style="font-size:15px;font-weight:600;color:var(--wf-text);margin-bottom:14px;">🎯 修改选择器</div>
            <div style="margin-bottom:12px;">
                <label for="selector-edit-input" style="display:block;font-size:12px;color:var(--wf-text-secondary);margin-bottom:4px;">选择器:</label>
                <input type="text" id="selector-edit-input" style="width:100%;padding:7px 10px;border:1px solid var(--wf-border);border-radius:var(--wf-radius-md);font-size:13px;font-family:Consolas,monospace;transition:border-color 0.15s;" placeholder="CSS 选择器 或 XPath（以 / 或 ( 开头）">
                <div id="selector-edit-resolved" style="font-size:12px;color:var(--wf-text-faint);margin-top:6px;display:none;">
                    解析值：<span id="selector-edit-resolved-value" style="color:var(--wf-text-secondary);font-weight:500;"></span>
                </div>
            </div>
            <div style="font-size:11px;color:var(--wf-text-muted);margin-bottom:14px;line-height:1.4;">
                💡 提示：支持 CSS 选择器或 XPath；含 <code style="background:var(--wf-surface-muted);padding:1px 4px;border-radius:var(--wf-radius-sm);">\${变量}</code> 时显示实际解析值。此修改为运行时覆盖，重置工作流后恢复原配置。
            </div>
            <div style="display:flex;justify-content:flex-end;gap:8px;">
                <button id="selector-edit-cancel" style="padding:6px 14px;border:1px solid var(--wf-border);background:var(--wf-surface);border-radius:var(--wf-radius-md);font-size:12px;cursor:pointer;color:var(--wf-text-secondary);">取消</button>
                <button id="selector-edit-confirm" style="padding:6px 14px;border:none;background:var(--wf-primary);color:white;border-radius:var(--wf-radius-md);font-size:12px;font-weight:500;cursor:pointer;">确定</button>
            </div>
        </div>
    `;
        document.body.appendChild(selectorEditModal);

        selectorEditModal.onclick = (e) => { if (e.target === selectorEditModal) closeSelectorEditModal(); };
        selectorEditModal.querySelector('#selector-edit-cancel').onclick = closeSelectorEditModal;
        selectorEditModal.querySelector('#selector-edit-confirm').onclick = confirmSelectorEdit;

        function closeSelectorEditModal() {
            selectorEditModal.style.display = 'none';
            setCurrentSelectorEditAction(null);
        }

        function confirmSelectorEdit() {
            if (!currentSelectorEditAction) return;
            const input = document.getElementById('selector-edit-input');
            const newValue = input.value.trim();
            const { stepIndex, actionIndex } = currentSelectorEditAction;
            const action = workflow.steps[stepIndex].actions[actionIndex];

            if (!newValue) {
                closeSelectorEditModal();
                return;
            }

            setActionOverride(activeWorkflowId, stepIndex, actionIndex, 'selector', newValue);
            saveState();
            updateUI();
            addLog(`已修改选择器(覆盖): ${action.description || action.type} -> ${newValue}`, 'info');
            closeSelectorEditModal();
        }

        // 创建说明模态框
        const descriptionModal = document.createElement('div');
        descriptionModal.id = 'description-modal';
        descriptionModal.className = 'wf-modal';
        descriptionModal.style.cssText = 'display:none;position:fixed;top:0;left:0;width:100%;height:100%;z-index:100000;background:var(--wf-overlay);display:none;align-items:center;justify-content:center;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;';
        descriptionModal.innerHTML = `
        <div class="wf-modal-dialog" style="background:var(--wf-surface);border-radius:var(--wf-radius-xl);box-shadow:0 20px 60px rgba(0,0,0,0.2);padding:24px;min-width:360px;max-width:520px;max-height:70vh;display:flex;flex-direction:column;animation:wfModalFadeIn 0.15s ease-out;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
                <div style="font-size:15px;font-weight:600;color:var(--wf-text);">📖 使用说明</div>
                <button id="description-close" style="width:24px;height:24px;border:none;background:var(--wf-surface-muted);border-radius:var(--wf-radius-md);cursor:pointer;font-size:14px;color:var(--wf-text-muted);display:flex;align-items:center;justify-content:center;">×</button>
            </div>
            <div id="description-content" style="flex:1;overflow-y:auto;font-size:13px;line-height:1.6;color:var(--wf-text-secondary);"></div>
        </div>
    `;
        document.body.appendChild(descriptionModal);

        descriptionModal.onclick = (e) => { if (e.target === descriptionModal) descriptionModal.style.display = 'none'; };
        descriptionModal.querySelector('#description-close').onclick = () => { descriptionModal.style.display = 'none'; };

        function showDescription() {
            const content = document.getElementById('description-content');
            const desc = workflow.description || '暂无使用说明';
            let html = desc
                .replace(/\n\n/g, '</p><p>')
                .replace(/\n/g, '<br>')
                .replace(/^\s*-\s+(.*$)/gm, '<li>$1</li>')
                .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
            if (!html.startsWith('<p>') && !html.startsWith('<ul>')) {
                html = '<p>' + html + '</p>';
            }
            content.innerHTML = html;
            descriptionModal.style.display = 'flex';
        }

        // 创建更新检查模态框
        const updateModal = document.createElement('div');
        updateModal.id = 'update-modal';
        updateModal.className = 'wf-modal';
        updateModal.style.cssText = 'display:none;position:fixed;top:0;left:0;width:100%;height:100%;z-index:100001;background:var(--wf-overlay);align-items:center;justify-content:center;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;';
        updateModal.innerHTML = `
        <div class="wf-modal-dialog" style="background:var(--wf-surface);border-radius:var(--wf-radius-xl);box-shadow:0 20px 60px rgba(0,0,0,0.2);padding:24px;min-width:500px;max-width:720px;max-height:80vh;display:flex;flex-direction:column;animation:wfModalFadeIn 0.15s ease-out;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                <div style="font-size:16px;font-weight:600;color:var(--wf-text);">🔄 检查更新</div>
                <button id="update-modal-close" style="width:28px;height:28px;border:none;background:var(--wf-surface-muted);border-radius:var(--wf-radius-md);cursor:pointer;font-size:16px;color:var(--wf-text-muted);display:flex;align-items:center;justify-content:center;">×</button>
            </div>
            <div style="display:flex;border-bottom:1px solid var(--wf-border);margin-bottom:16px;">
                <button class="update-tab active" data-tab="script" style="flex:1;padding:10px;border:none;background:transparent;font-size:14px;font-weight:500;color:var(--wf-primary);border-bottom:2px solid var(--wf-primary);cursor:pointer;">脚本更新</button>
                <button class="update-tab" data-tab="workflow" style="flex:1;padding:10px;border:none;background:transparent;font-size:14px;font-weight:500;color:var(--wf-text-muted);border-bottom:2px solid transparent;cursor:pointer;">工作流更新</button>
            </div>
            <div id="update-tab-script" class="update-tab-content" style="flex:1;overflow-y:auto;">
                <div id="script-update-status" style="text-align:center;padding:20px;color:var(--wf-text-muted);">点击下方按钮检查更新</div>
                <div style="display:flex;justify-content:center;gap:10px;margin-top:16px;">
                    <button id="check-script-update-btn" style="padding:8px 20px;border:none;background:var(--wf-primary);color:white;border-radius:var(--wf-radius-md);font-size:13px;font-weight:500;cursor:pointer;transition:background 0.15s;">检查更新</button>
                </div>
            </div>
            <div id="update-tab-workflow" class="update-tab-content" style="flex:1;overflow-y:auto;display:none;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding:0 8px;">
                    <span style="font-size:13px;color:var(--wf-text-muted);">云端工作流列表</span>
                    <button id="refresh-workflow-list-btn" style="padding:6px 16px;border:none;background:var(--wf-primary);color:white;border-radius:var(--wf-radius-md);font-size:12px;font-weight:500;cursor:pointer;transition:background 0.15s;">⟳ 刷新</button>
                </div>
                <div id="workflow-update-status" style="padding:8px;">
                    <div style="text-align:center;padding:40px 20px;color:var(--wf-text-muted);">点击「刷新」按钮获取云端工作流</div>
                </div>
            </div>
        </div>
    `;

        // Tab 切换样式
        const tabStyles = document.createElement('style');
        tabStyles.textContent = `
        .update-tab:hover { color: var(--wf-primary) !important; }
        .update-tab.active { color: var(--wf-primary) !important; border-bottom-color: var(--wf-primary) !important; }
        .update-tab:not(.active) { color: var(--wf-text-muted) !important; border-bottom-color: transparent !important; }
    `;
        document.head.appendChild(tabStyles);

        document.body.appendChild(updateModal);

        // Tab 切换逻辑
        const tabs = updateModal.querySelectorAll('.update-tab');
        const tabContents = updateModal.querySelectorAll('.update-tab-content');

        tabs.forEach(tab => {
            tab.onclick = () => {
                tabs.forEach(t => t.classList.remove('active'));
                tabContents.forEach(c => c.style.display = 'none');
                tab.classList.add('active');
                const targetTab = tab.dataset.tab;
                updateModal.querySelector(`#update-tab-${targetTab}`).style.display = 'block';

                // 切换到工作流标签时，自动加载云端工作流
                if (targetTab === 'workflow') {
                    loadRemoteWorkflows();
                }
            };
        });

        updateModal.onclick = (e) => { if (e.target === updateModal) updateModal.style.display = 'none'; };
        updateModal.querySelector('#update-modal-close').onclick = () => { updateModal.style.display = 'none'; };

        // 显示更新模态框
        function showUpdateModal() {
            updateModal.style.display = 'flex';
            // 重置状态
            document.getElementById('script-update-status').innerHTML = '<div style="text-align:center;padding:20px;color:var(--wf-text-muted);">点击下方按钮检查更新</div>';
            document.getElementById('workflow-update-status').innerHTML = '<div style="text-align:center;padding:40px 20px;color:var(--wf-text-muted);">点击「刷新」按钮获取云端工作流</div>';
        }

        // 检查脚本更新
        async function checkScriptUpdate() {
            const statusEl = document.getElementById('script-update-status');
            statusEl.innerHTML = '<div style="text-align:center;padding:20px;color:var(--wf-primary);">⟳ 正在检查更新...</div>';

            try {
                const result = await manualCheckUpdate();
                const currentVersion = result.current;

                if (result.hasUpdate) {
                    statusEl.innerHTML = `
                    <div style="padding:16px;background:var(--wf-success-light);border-radius:var(--wf-radius-lg);border:1px solid var(--wf-success-border);margin-bottom:16px;">
                        <div style="font-size:14px;font-weight:600;color:var(--wf-success-text);margin-bottom:8px;">✓ 发现新版本！</div>
                        <div style="font-size:13px;color:var(--wf-success);">
                            <div>当前版本：<strong>v${currentVersion}</strong></div>
                            <div>最新版本：<strong>v${result.latest}</strong></div>
                        </div>
                    </div>

                    <div style="padding:12px;background:var(--wf-primary-light);border-radius:var(--wf-radius-lg);border:1px solid var(--wf-primary-border);margin-bottom:16px;">
                        <div style="font-size:13px;font-weight:600;color:var(--wf-primary-darker);margin-bottom:6px;">📝 更新内容：</div>
                        ${result.updatedAt ? `<div style="font-size:12px;color:var(--wf-success);margin-bottom:6px;">更新于 ${result.updatedAt}</div>` : ''}
                        <div style="font-size:13px;color:var(--wf-primary-text);white-space:pre-line;">${result.changelog || '详见更新日志'}</div>
                    </div>

                    <div style="display:flex;justify-content:center;gap:10px;">
                        <button id="goto-update-btn" style="padding:8px 20px;border:none;background:var(--wf-success-accent);color:white;border-radius:var(--wf-radius-md);font-size:13px;font-weight:500;cursor:pointer;transition:background 0.15s;">立即更新</button>
                    </div>
                `;

                    // 定义"立即更新"按钮的点击处理函数
                    const handleGotoUpdate = () => {
                        // 显示确认对话框（含更新步骤，步骤1进行中）
                        statusEl.innerHTML = `
                        <div style="padding:20px;background:var(--wf-warning-light);border-radius:var(--wf-radius-xl);border:2px solid var(--wf-warning-border);">
                            <div style="font-size:15px;font-weight:600;color:var(--wf-warning-hover);margin-bottom:12px;display:flex;align-items:center;gap:8px;">
                                <span style="font-size:18px;">⚡</span>
                                <span>确认更新脚本？</span>
                            </div>
                            <div style="font-size:13px;color:var(--wf-warning-hover);margin-bottom:16px;line-height:1.6;">
                                点击「确认」后将自动跳转到油猴管理界面
                            </div>
                            ${renderUpdateSteps(1)}
                            <div style="display:flex;justify-content:center;gap:12px;">
                                <button id="cancel-update-btn" style="padding:8px 20px;border:1px solid var(--wf-border-strong);background:var(--wf-surface);color:var(--wf-text-secondary);border-radius:var(--wf-radius-lg);font-size:13px;font-weight:500;cursor:pointer;transition:all 0.2s;">取消</button>
                                <button id="confirm-update-btn" style="padding:8px 20px;border:none;background:var(--wf-warning);color:white;border-radius:var(--wf-radius-lg);font-size:13px;font-weight:600;cursor:pointer;transition:all 0.2s;box-shadow:0 2px 4px rgba(237,137,54,0.3);">确认</button>
                            </div>
                        </div>
                    `;
                        // 取消按钮：关闭模态框
                        statusEl.querySelector('#cancel-update-btn').onclick = () => {
                            document.getElementById('update-modal').style.display = 'none';
                        };
                        // 确认按钮：执行更新并显示后续引导
                        statusEl.querySelector('#confirm-update-btn').onclick = () => {
                            // 隐藏更新提示点
                            const dot = document.getElementById('update-dot');
                            if (dot) dot.style.display = 'none';
                            // 打开油猴界面
                            GM_openInTab(result.scriptUrl, { active: true });
                            // 显示更新进度引导（步骤2进行中）
                            showUpdateProgressGuide(statusEl);
                        };
                    };

                    // 绑定"立即更新"按钮的点击事件
                    statusEl.querySelector('#goto-update-btn').onclick = handleGotoUpdate;
                } else {
                    // 已是最新版本，隐藏绿点
                    const dot = document.getElementById('update-dot');
                    if (dot) dot.style.display = 'none';
                    window.wfHasUpdate = false;

                    statusEl.innerHTML = `
                    <div style="padding:20px;background:var(--wf-surface-muted);border-radius:var(--wf-radius-lg);border:1px solid var(--wf-border);">
                        <div style="font-size:14px;font-weight:600;color:var(--wf-text-heading);margin-bottom:8px;">✓ 已是最新版本</div>
                        <div style="font-size:13px;color:var(--wf-text-secondary);">
                            当前版本 <strong>v${currentVersion}</strong>
                        </div>
                    </div>
                `;
                }
            } catch (e) {
                statusEl.innerHTML = `
                <div style="padding:20px;background:var(--wf-error-light);border-radius:var(--wf-radius-lg);border:1px solid var(--wf-error-accent);">
                    <div style="font-size:14px;font-weight:600;color:var(--wf-error-text);margin-bottom:8px;">✗ 检查失败</div>
                    <div style="font-size:13px;color:var(--wf-error-text);">${e.message}</div>
                </div>
            `;
            }
        }

        // 渲染更新步骤引导（统一样式）
        // currentStep: 当前进行中的步骤序号 (1/2/3)，小于该序号为已完成，大于为未开始
        function renderUpdateSteps(currentStep) {
            const steps = [
                { num: 1, text: '点击立即更新自动跳转到油猴管理界面' },
                { num: 2, text: '在新标签页中，点击<span style="background:var(--wf-error-soft);color:var(--wf-error);padding:2px 8px;border-radius:var(--wf-radius-sm);font-weight:600;margin:0 4px;">「Override/重新安装」</span>按钮更新脚本' },
                { num: 3, text: '回到此页面，点击「刷新页面」按钮' }
            ];

            const stepsHtml = steps.map(step => {
                let bg, borderColor, iconBg, iconContent, textColor;
                if (step.num < currentStep) {
                    // 已完成
                    bg = 'var(--wf-success-light)'; borderColor = 'var(--wf-success-border)'; iconBg = 'var(--wf-success-accent)';
                    iconContent = '✓'; textColor = 'var(--wf-success)';
                } else if (step.num === currentStep) {
                    // 当前进行中
                    bg = 'var(--wf-primary-light)'; borderColor = 'var(--wf-primary-border)'; iconBg = 'var(--wf-primary)';
                    iconContent = step.num; textColor = 'var(--wf-primary-darker)';
                } else {
                    // 未开始
                    bg = 'var(--wf-surface-muted)'; borderColor = 'var(--wf-border)'; iconBg = 'var(--wf-border-strong)';
                    iconContent = step.num; textColor = 'var(--wf-text-faint)';
                }
                return `
                <div style="display:flex;align-items:flex-start;gap:10px;padding:12px;background:${bg};border-radius:var(--wf-radius-lg);border:1px solid ${borderColor};">
                    <div style="flex-shrink:0;width:24px;height:24px;background:${iconBg};color:white;border-radius:var(--wf-radius-circle);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;">${iconContent}</div>
                    <div style="flex:1;font-size:13px;color:${textColor};line-height:1.5;">${step.text}</div>
                </div>
            `;
            }).join('');

            return `
            <div style="margin-bottom:16px;">
                <div style="font-size:14px;font-weight:600;color:var(--wf-text-heading);margin-bottom:12px;display:flex;align-items:center;gap:8px;">
                    <span style="font-size:16px;">📋</span>
                    <span>更新步骤</span>
                </div>
                <div style="display:flex;flex-direction:column;gap:10px;">
                    ${stepsHtml}
                </div>
            </div>
        `;
        }

        // 显示更新进度引导
        function showUpdateProgressGuide(container) {
            container.innerHTML = `
            <div style="padding:20px;">
                ${renderUpdateSteps(2)}
                <button id="refresh-page-btn" style="width:100%;padding:10px 24px;border:none;background:var(--wf-primary);color:white;border-radius:var(--wf-radius-lg);font-size:14px;font-weight:600;cursor:pointer;transition:all 0.2s;box-shadow:0 2px 4px rgba(66,153,225,0.3);">
                    🔄 刷新页面
                </button>
            </div>
        `;
            container.querySelector('#refresh-page-btn').onclick = () => {
                location.reload();
            };
        }

        // 加载云端工作流列表
        async function loadRemoteWorkflows() {
            const statusEl = document.getElementById('workflow-update-status');
            statusEl.innerHTML = '<div style="text-align:center;padding:20px;color:var(--wf-primary);">⟳ 正在获取云端工作流...</div>';

            try {
                const result = await getRemoteWorkflows();

                if (result.error) {
                    statusEl.innerHTML = `
                    <div style="padding:20px;background:var(--wf-error-light);border-radius:var(--wf-radius-lg);border:1px solid var(--wf-error-accent);">
                        <div style="font-size:14px;font-weight:600;color:var(--wf-error-text);margin-bottom:8px;">✗ 获取失败</div>
                        <div style="font-size:13px;color:var(--wf-error-text);">${result.error}</div>
                    </div>
                `;
                    return;
                }

                if (!result.workflows || result.workflows.length === 0) {
                    statusEl.innerHTML = `
                    <div style="padding:20px;background:var(--wf-surface-muted);border-radius:var(--wf-radius-lg);border:1px solid var(--wf-border);">
                        <div style="font-size:14px;color:var(--wf-text-secondary);">暂无云端工作流</div>
                    </div>
                `;
                    return;
                }

                // 渲染工作流列表
                const workflowListHtml = result.workflows.map(wf => {
                    // statusColor 用于 ${statusColor}20 / ${statusColor}40 透明度拼接，必须为 hex 字面量（var() 无法拼接后缀）
                    const statusColor = wf.hasUpdate ? '#48bb78' : (wf.isInstalled ? '#4299e1' : '#718096');
                    const statusText = wf.hasUpdate ? '有更新' : (wf.isInstalled ? '已安装' : '未安装');
                    const buttonText = wf.hasUpdate ? '更新' : (wf.isInstalled ? '重新安装' : '安装');
                    const buttonColor = wf.hasUpdate ? 'var(--wf-success-accent)' : 'var(--wf-primary)';
                    const rowStyle = wf.hasUpdate ? 'background:var(--wf-success-light);border-color:var(--wf-success-border);' : '';

                    return `
                    <div style="display:flex;align-items:center;gap:12px;padding:12px;margin-bottom:8px;border-radius:var(--wf-radius-lg);border:1px solid var(--wf-border);${rowStyle}">
                        <div style="flex:1;min-width:0;">
                            <div style="font-size:14px;font-weight:600;color:var(--wf-text);margin-bottom:4px;">${escapeHtml(wf.name)}</div>
                            <div style="font-size:12px;color:var(--wf-text-muted);">
                                云端 v${wf.version}${wf.localVersion ? ` | 本地 v${wf.localVersion}` : ''}${wf.updatedAt ? `<span style="color:var(--wf-success);"> | 更新于 ${escapeHtml(wf.updatedAt)}</span>` : ''}
                            </div>
                            ${wf.changelog ? `<div style="font-size:12px;color:var(--wf-text-secondary);margin-top:4px;white-space:pre-line;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${escapeHtml(wf.changelog)}</div>` : ''}
                        </div>
                        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex-shrink:0;">
                            <span style="font-size:12px;padding:2px 8px;border-radius:var(--wf-radius-sm);background:${statusColor}20;color:${statusColor};border:1px solid ${statusColor}40;">${statusText}</span>
                            <button class="download-workflow-btn" data-name="${escapeHtml(wf.name)}" style="padding:6px 14px;border:none;background:${buttonColor};color:white;border-radius:var(--wf-radius-md);font-size:12px;font-weight:500;cursor:pointer;transition:background 0.15s;white-space:nowrap;">${buttonText}</button>
                        </div>
                    </div>
                `;
                }).join('');

                statusEl.innerHTML = `
                <div style="padding:8px;">
                    ${workflowListHtml}
                </div>
            `;

                // 检查是否还有待更新的工作流，如果没有则隐藏绿点
                const hasAnyUpdate = result.workflows?.some(w => w.hasUpdate);
                if (!hasAnyUpdate) {
                    const dot = document.getElementById('update-dot');
                    if (dot) dot.style.display = 'none';
                    window.wfWorkflowUpdate = false;
                }

                // 绑定下载按钮事件
                statusEl.querySelectorAll('.download-workflow-btn').forEach(btn => {
                    btn.onclick = async () => {
                        const workflowName = btn.dataset.name;
                        btn.textContent = '下载中...';
                        btn.disabled = true;

                        const result = await downloadWorkflow(workflowName);
                        if (result.success) {
                            // 导入工作流
                            const newWf = result.workflow;
                            newWf.id = String(Date.now());
                            const existingNames = new Set(workflowList.map(w => w.name));

                            // 如果工作流名称已存在，询问是否覆盖
                            const existingIndex = workflowList.findIndex(w => w.name === newWf.name);
                            if (existingIndex !== -1) {
                                const confirmed = await showConfirm(`工作流「${newWf.name}」已存在，是否覆盖？`, {
                                    title: '覆盖确认',
                                    type: 'warning',
                                    confirmText: '覆盖',
                                    cancelText: '取消'
                                });
                                if (!confirmed) {
                                    btn.textContent = buttonText;
                                    btn.disabled = false;
                                    return;
                                }
                                // 覆盖现有工作流，保留 ID
                                newWf.id = workflowList[existingIndex].id;
                                workflowList[existingIndex] = newWf;

                                // 如果更新的是当前激活的工作流，同步更新 state.workflow
                                if (activeWorkflowId === newWf.id) {
                                    setWorkflow(newWf);
                                }

                                addLog(`工作流「${newWf.name}」已更新`, 'success');
                            } else {
                                workflowList.push(newWf);
                                addLog(`工作流「${newWf.name}」已安装`, 'success');
                            }

                            saveWorkflowList();
                            updateWorkflowSelect();
                            updateWorkflowInfoDisplay();
                            btn.textContent = '完成';

                            // 刷新列表并检查是否还有待更新的工作流
                            setTimeout(async () => {
                                await loadRemoteWorkflows();
                                // 检查是否还有待更新的工作流
                                const remoteResult = await getRemoteWorkflows();
                                const hasAnyUpdate = remoteResult.workflows?.some(w => w.hasUpdate);
                                if (!hasAnyUpdate) {
                                    // 没有待更新的工作流了，隐藏绿点
                                    const dot = document.getElementById('update-dot');
                                    if (dot) dot.style.display = 'none';
                                    window.wfWorkflowUpdate = false;
                                }
                            }, 1000);
                        } else {
                            btn.textContent = '失败';
                            showToast(`下载失败：${result.error}`, 'error');
                            setTimeout(() => {
                                btn.textContent = buttonText;
                                btn.disabled = false;
                            }, 2000);
                        }
                    };
                });

            } catch (e) {
                statusEl.innerHTML = `
                <div style="padding:20px;background:var(--wf-error-light);border-radius:var(--wf-radius-lg);border:1px solid var(--wf-error-accent);">
                    <div style="font-size:14px;font-weight:600;color:var(--wf-error-text);margin-bottom:8px;">✗ 加载失败</div>
                    <div style="font-size:13px;color:var(--wf-error-text);">${e.message}</div>
                </div>
            `;
            }
        }

        // 绑定事件
        const minimizeBtn = document.getElementById('minimize-btn');
        minimizeBtn.onclick = (e) => { e.stopPropagation(); toggleMinimize(); };

        panel.querySelector('.wf-panel-header').addEventListener('click', (e) => {
            if (dragData.hasDragged) { dragData.hasDragged = false; return; }
            if (panel.classList.contains('minimized') && e.target !== minimizeBtn && e.target !== document.getElementById('close-btn')) {
                toggleMinimize();
            }
        });

        function toggleMinimize() {
            panel.classList.toggle('minimized');
            const btn = document.getElementById('minimize-btn');
            const panelBody = document.getElementById('panel-body');
            if (panel.classList.contains('minimized')) {
                btn.textContent = '+';
                btn.title = '展开';
                panel.dataset.savedWidth = panel.style.width;
                panel.dataset.savedHeight = panel.style.height;
                panel.style.width = '';
                panel.style.height = '';
                panelBody.style.display = 'none';
            } else {
                btn.textContent = '−';
                btn.title = '最小化';
                if (panel.dataset.savedWidth) panel.style.width = panel.dataset.savedWidth;
                if (panel.dataset.savedHeight) panel.style.height = panel.dataset.savedHeight;
                panelBody.style.display = '';
            }
        }

        document.getElementById('close-btn').onclick = () => { panel.remove(); };
        document.getElementById('start-btn').onclick = () => { executeWorkflow(); };
        document.getElementById('stop-btn').onclick = () => { stopWorkflow(); };
        document.getElementById('reset-btn').onclick = async () => { if (await showConfirm('确定要重置工作流状态吗？', { title: '重置工作流', type: 'danger', confirmText: '重置' })) resetWorkflow(); };
        document.getElementById('desc-btn').onclick = () => { showDescription(); };
        document.getElementById('vars-btn').onclick = () => { openVisualEditor('variables'); };
        document.getElementById('update-check-btn').onclick = () => { showUpdateModal(); };
        document.getElementById('check-script-update-btn').onclick = () => { checkScriptUpdate(); };
        document.getElementById('refresh-workflow-list-btn').onclick = () => { loadRemoteWorkflows(); };
        document.getElementById('continue-btn').onclick = () => { resumeAfterUserAction(); };

        document.getElementById('step-list-toggle').onclick = () => {
            document.getElementById('step-list-wrapper').classList.toggle('collapsed');
        };

        // 监听步骤列表滚动事件，重新渲染连线
        document.getElementById('step-list').addEventListener('scroll', () => {
            requestAnimationFrame(() => {
                renderWorkflowConnections();
            });
        });

        document.getElementById('edit-config-btn').onclick = () => { openVisualEditor(); };

        const clearLogsBtn = document.getElementById('clear-logs-btn');
        if (clearLogsBtn) {
            clearLogsBtn.onclick = () => { setLogs([]); renderLogs(); };
        }

        // 工作流管理
        updateWorkflowSelect();
        document.getElementById('workflow-select').onchange = (e) => { switchWorkflow(e.target.value); };
        document.getElementById('wf-new-btn').onclick = () => { createNewWorkflow(); };
        document.getElementById('wf-delete-btn').onclick = async () => {
            if (await showConfirm(`确定要删除工作流「${workflow.name}」吗？`, { title: '删除工作流', type: 'danger', confirmText: '删除' })) deleteWorkflow(activeWorkflowId);
        };
        document.getElementById('wf-automatch-btn').onclick = () => { autoMatchWorkflow(); };

        // 缩放
        function startResize(e, corner) {
            const rect = panel.getBoundingClientRect();
            let anchorLeft, anchorTop;
            switch (corner) {
                case 'tl': anchorLeft = rect.right; anchorTop = rect.bottom; break;
                case 'tr': anchorLeft = rect.left; anchorTop = rect.bottom; break;
                case 'bl': anchorLeft = rect.right; anchorTop = rect.top; break;
                case 'br': anchorLeft = rect.left; anchorTop = rect.top; break;
            }
            resizeData.isResizing = true;
            resizeData.corner = corner;
            resizeData.startMouseX = e.clientX;
            resizeData.startMouseY = e.clientY;
            resizeData.startWidth = rect.width;
            resizeData.startHeight = rect.height;
            resizeData.anchorLeft = anchorLeft;
            resizeData.anchorTop = anchorTop;
            e.preventDefault();
            e.stopPropagation();
        }

        document.getElementById('resize-handle-tl').addEventListener('mousedown', (e) => startResize(e, 'tl'));
        document.getElementById('resize-handle-tr').addEventListener('mousedown', (e) => startResize(e, 'tr'));
        document.getElementById('resize-handle-bl').addEventListener('mousedown', (e) => startResize(e, 'bl'));
        document.getElementById('resize-handle-br').addEventListener('mousedown', (e) => startResize(e, 'br'));

        document.addEventListener('mousemove', (e) => {
            if (resizeData.isResizing) {
                const dx = e.clientX - resizeData.startMouseX;
                const dy = e.clientY - resizeData.startMouseY;
                const corner = resizeData.corner;
                let newWidth = resizeData.startWidth;
                let newHeight = resizeData.startHeight;
                if (corner === 'tl' || corner === 'bl') newWidth -= dx; else newWidth += dx;
                if (corner === 'tl' || corner === 'tr') newHeight -= dy; else newHeight += dy;
                const minW = 400, minH = 300;
                if (newWidth < minW) newWidth = minW;
                if (newHeight < minH) newHeight = minH;
                panel.style.width = newWidth + 'px';
                panel.style.height = newHeight + 'px';
                if (newWidth < 560) panel.classList.add('narrow'); else panel.classList.remove('narrow');
                let newPanelLeft, newPanelTop;
                switch (corner) {
                    case 'tl': newPanelLeft = resizeData.anchorLeft - newWidth; newPanelTop = resizeData.anchorTop - newHeight; break;
                    case 'tr': newPanelLeft = resizeData.anchorLeft; newPanelTop = resizeData.anchorTop - newHeight; break;
                    case 'bl': newPanelLeft = resizeData.anchorLeft - newWidth; newPanelTop = resizeData.anchorTop; break;
                    case 'br': newPanelLeft = resizeData.anchorLeft; newPanelTop = resizeData.anchorTop; break;
                }
                panel.style.top = newPanelTop + 'px';
                panel.style.right = (window.innerWidth - newPanelLeft - newWidth) + 'px';
            }

            // 浮动按钮拖拽
            if (floatingBtnDragData.isDragging) {
                const dx = e.clientX - floatingBtnDragData.startX;
                const dy = e.clientY - floatingBtnDragData.startY;

                // 检测是否有实际拖动（位移超过 3px）
                if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
                    hasDraggedFloatingBtn = true;
                }

                let newRight = floatingBtnDragData.startRight - dx;
                let newBottom = floatingBtnDragData.startBottom - dy;

                // 限制在窗口范围内
                const maxRight = window.innerWidth - 52;
                const maxBottom = window.innerHeight - 52;
                if (newRight < 0) newRight = 0;
                if (newRight > maxRight) newRight = maxRight;
                if (newBottom < 0) newBottom = 0;
                if (newBottom > maxBottom) newBottom = maxBottom;

                floatingBtn.style.right = newRight + 'px';
                floatingBtn.style.bottom = newBottom + 'px';
            }
        });

        document.addEventListener('mouseup', () => {
            if (resizeData.isResizing) {
                resizeData.isResizing = false;
                // 缩放结束后重新渲染连线
                requestAnimationFrame(() => {
                    renderWorkflowConnections();
                });
            }
            if (dragData.isDragging) dragData.isDragging = false;

            // 浮动按钮拖拽结束
            if (floatingBtnDragData.isDragging) {
                floatingBtnDragData.isDragging = false;
                // 保存位置
                const newPos = {
                    right: parseFloat(floatingBtn.style.right),
                    bottom: parseFloat(floatingBtn.style.bottom)
                };
                setFloatingBtnPosition(newPos);
                GM_setValue('floating_btn_position', newPos);
            }
            // 无条件移除 dragging class，确保状态一致
            const btn = document.getElementById('workflow-floating-btn');
            if (btn) btn.classList.remove('dragging');
        });

        setupDrag(panel);
        updateUI();
        renderLogs();

        // 添加更新按钮样式
        const updateBtnStyle = document.createElement('style');
        updateBtnStyle.textContent = `
        .wf-update-btn {
            position: relative;
            width: auto !important;
            min-width: 24px;
            padding: 0 8px !important;
            white-space: nowrap;
        }
        .wf-update-dot {
            position: absolute;
            top: 4px;
            right: 4px;
            width: 8px;
            height: 8px;
            background: var(--wf-success-accent);
            border-radius:var(--wf-radius-circle);
            border: 2px solid white;
        }
        .wf-update-badge {
            background: var(--wf-error);
            color: white;
            font-size: 10px;
            padding: 2px 6px;
            border-radius:var(--wf-radius-pill);
            margin-left: 6px;
            font-weight: 500;
        }
    `;
        document.head.appendChild(updateBtnStyle);

        // 检查是否已检测到更新（由 index.js 统一管理）
        const hasScriptUpdate = window.wfHasUpdate;
        const hasWorkflowUpdate = window.wfWorkflowUpdate;
        if (hasScriptUpdate || hasWorkflowUpdate) {
            const dot = document.getElementById('update-dot');
            if (dot) dot.style.display = 'inline';
        }

        if (shouldAutoResume) {
            addLog(`页面加载完成，自动恢复执行... (步骤${currentStepIndex + 1})`, 'info');
            scheduleAutoContinue(1000);
        }
    }

    // ============================================
    // UI 更新
    // ============================================
    function updateUI() {
        const status = document.getElementById('workflow-status');
        const progressFill = document.getElementById('progress-fill');
        const progressText = document.getElementById('progress-text');
        const startBtn = document.getElementById('start-btn');
        const stepList = document.getElementById('step-list');

        if (!workflow || workflow.steps.length === 0) return;

        const totalSteps = workflow.steps.length;

        // 更新状态
        if (isRunning) {
            status.textContent = '执行中...';
        } else if (stopRequested) {
            status.textContent = '已停止';
        } else if (workflowCompleted) {
            status.textContent = '✅ 已完成';
            startBtn.textContent = '🔄 重新开始';
        } else {
            status.textContent = currentStepIndex >= 0 ?
                `步骤 ${currentStepIndex + 1}` : '就绪';
            startBtn.textContent = '▶ 开始';
        }

        // 更新用户操作等待UI
        const userActionWaiting = document.getElementById('user-action-waiting');
        if (userActionWaiting) {
            if (waitingForUserAction && pendingAction) {
                userActionWaiting.style.display = 'block';
                const action = workflow.steps[pendingAction.stepIndex].actions[pendingAction.actionIndex];
                const messageEl = document.getElementById('user-action-message');
                const continueBtn = document.getElementById('continue-btn');
                if (messageEl) {
                    if (pendingAction.error) {
                        messageEl.textContent = `⚠ 动作失败: ${action.description || action.type}`;
                        messageEl.style.color = 'var(--wf-error)';
                        if (continueBtn) continueBtn.textContent = '✓ 已处理，继续';
                    } else {
                        messageEl.textContent = `⏸ 请手动完成: ${action.description || action.type}`;
                        messageEl.style.color = 'var(--wf-warning)';
                        if (continueBtn) continueBtn.textContent = '✓ 完成，继续';
                    }
                }
            } else {
                userActionWaiting.style.display = 'none';
            }
        }

        // 更新进度
        let completedSteps = currentStepIndex >= 0 ? currentStepIndex : 0;
        if (workflowCompleted) completedSteps = totalSteps;
        const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;
        progressFill.style.width = `${progress}%`;
        progressText.textContent = `${completedSteps}/${totalSteps}`;

        // 更新步骤列表
        if (stepList) {
            stepList.innerHTML = workflow.steps.map((step, stepIndex) => {
                let stepClassName = 'wf-step-item';
                let stepIcon = '○';

                let isCollapsed = step.collapsed !== undefined ? step.collapsed :
                    (currentStepIndex < 0 ? true : stepIndex !== currentStepIndex);

                if (workflowCompleted || stepIndex < currentStepIndex) {
                    stepClassName += ' completed';
                    stepIcon = '✓';
                } else if (stepIndex === currentStepIndex) {
                    stepClassName += ' current';
                    stepIcon = '▶';
                }

                if (isCollapsed) stepClassName += ' collapsed';

                const stepBypassed = getEffectiveStepBypass(stepIndex);
                if (stepBypassed) {
                    stepClassName += ' bypassed';
                    stepIcon = '⊘';
                }

                // 动作列表
                const actionsHtml = (step.actions || []).map((action, actionIndex) => {
                    const actionType = action.type || 'unknown';
                    const actionDesc = action.description || actionType;
                    let actionMeta = '';
                    const effectiveSelector = getEffectiveActionSelector(stepIndex, actionIndex);
                    if (effectiveSelector) {
                        const hasOverride = effectiveSelector !== action.selector;
                        actionMeta = `<span class="wf-action-selector-edit" data-step="${stepIndex}" data-action="${actionIndex}" title="点击修改选择器${hasOverride ? '（已覆盖）' : ''}" style="cursor:pointer;">${escapeHtml(effectiveSelector)}${hasOverride ? ' <span style="color:var(--wf-primary);">●</span>' : ''}</span>`;
                    } else if (actionType === 'wait') {
                        actionMeta = `${action.ms || 1000}ms`;
                    } else if (actionType === 'urlReplace' && action.find) {
                        actionMeta = `${escapeHtml(action.find)} → ${escapeHtml(action.replace || '')}`;
                    } else if (actionType === 'condition' && action.condition) {
                        const condDesc = formatCondition(action.condition);
                        const gotoTrue = action.gotoTrue ? `→${action.gotoTrue}` : '';
                        const gotoFalse = action.gotoFalse ? `→${action.gotoFalse}` : '';
                        actionMeta = `${escapeHtml(condDesc)} | ${escapeHtml(gotoTrue || '继续')} / ${escapeHtml(gotoFalse || '继续')}`;
                    } else if (actionType === 'modal') {
                        const cancelGoto = action.buttons === 'okCancel' && action.onCancel && action.onCancel !== 'continue' && action.onCancel !== 'stop'
                            ? ` | 取消→${action.onCancel}` : '';
                        actionMeta = `${escapeHtml(action.title || '')}${cancelGoto}`;
                    } else if (actionType === 'copy') {
                        actionMeta = `${escapeHtml(action.value || '')} → 剪贴板`;
                    }

                    const isCurrentAction = stepIndex === currentStepIndex && actionIndex === currentActionIndex;
                    const actionBypassed = getEffectiveActionBypass(stepIndex, actionIndex);
                    const isErrorAction = pendingAction && pendingAction.error &&
                        pendingAction.stepIndex === stepIndex && pendingAction.actionIndex === actionIndex;

                    let actionItemClass = 'wf-action-item';
                    if (isCurrentAction) actionItemClass += ' current-action';
                    if (isErrorAction) actionItemClass += ' error-action';
                    if (actionBypassed) actionItemClass += ' bypassed';

                    // waitUserAction toggle - 手动开关
                    const hasWaitUser = action.waitUserAction !== undefined;
                    const runtimeWaitUser = hasWaitUser ? getEffectiveActionWaitUser(stepIndex, actionIndex) : false;
                    let waitToggleHtml = '';
                    if (hasWaitUser) {
                        waitToggleHtml = `<div class="wf-toggle wf-toggle-manual ${runtimeWaitUser ? 'active' : ''}" data-wait-step="${stepIndex}" data-wait-action="${actionIndex}" title="${runtimeWaitUser ? '手动模式：点击切换为自动' : '自动模式：点击切换为手动'}">🖐</div>`;
                    }

                    // 缓存开关 - 仅上传动作（默认启用缓存；点亮=缓存已启用，关闭时暗淡，参考手动开关样式）
                    let cacheToggleHtml = '';
                    if (actionType === 'upload') {
                        const cacheEnabled = getEffectiveActionCache(stepIndex, actionIndex);
                        cacheToggleHtml = `<div class="wf-toggle wf-toggle-cache ${cacheEnabled ? 'active' : ''}" data-cache-step="${stepIndex}" data-cache-action="${actionIndex}" title="${cacheEnabled ? '缓存已启用：点击禁用（强制重新拉取云端文件）' : '缓存已禁用：点击启用缓存'}">🗃️</div>`;
                    }

                    // Bypass toggle - 启用开关
                    const bypassToggleHtml = `<div class="wf-toggle wf-toggle-enable ${actionBypassed ? '' : 'active'}" data-bypass-step="${stepIndex}" data-bypass-action="${actionIndex}" title="${actionBypassed ? '已禁用：点击启用' : '已启用：点击禁用'}"></div>`;

                    // Value edit button
                    let valueEditHtml = '';
                    if (actionType === 'fill' || actionType === 'select') {
                        const currentValue = getEffectiveActionValue(stepIndex, actionIndex);
                        // 格式化显示值（数组显示为简写形式）
                        const formatValue = (val) => {
                            if (Array.isArray(val)) {
                                if (val.length === 0) return '[]';
                                if (val.length === 1) return `[${val[0]}]`;
                                return `[${val[0]}...]`; // 显示第一个元素并省略其他
                            }
                            return String(val);
                        };
                        valueEditHtml = `<button class="wf-action-sm-btn edit-btn action-value-edit-btn" data-step="${stepIndex}" data-action="${actionIndex}">✏ ${escapeHtml(formatValue(currentValue).substring(0, 10))}</button>`;
                    }

                    // Highlight button
                    let highlightHtml = '';
                    if (action.selector) {
                        highlightHtml = `<button class="wf-action-sm-btn highlight-btn action-highlight-btn" data-step="${stepIndex}" data-action="${actionIndex}">💡</button>`;
                    }

                    // Jump button - 跳转到该动作（点击「开始」后从此动作执行）
                    const jumpHtml = `<button class="wf-action-sm-btn jump-btn action-jump-btn" data-step="${stepIndex}" data-action="${actionIndex}" title="跳转到该动作">📍</button>`;

                    const actionTypeDisplay = actionType === 'condition' ? '🔀' : actionType === 'noop' ? '·' : actionType === 'reload' ? '🔄' : actionType;

                    // 条件判断动作添加连接点
                    const isCondition = actionType === 'condition';
                    let connectorHtml = '';
                    if (isCondition) {
                        const alwaysTrue = action.condition?.type === 'alwaysTrue';
                        const alwaysFalse = action.condition?.type === 'alwaysFalse';
                        const trueConnector = !alwaysFalse ? `<div class="wf-connector wf-connector-true" data-branch="true" data-step-idx="${stepIndex}" data-action-idx="${actionIndex}" style="position:absolute;left:-8px;top:50%;transform:translateY(-50%);width:12px;height:12px;background:var(--wf-success-accent);border:2px solid white;border-radius:var(--wf-radius-circle);box-shadow:0 2px 4px rgba(0,0,0,0.15);z-index:10;" title="为真跳转"></div>` : '';
                        const falseConnector = !alwaysTrue ? `<div class="wf-connector wf-connector-false" data-branch="false" data-step-idx="${stepIndex}" data-action-idx="${actionIndex}" style="position:absolute;right:-8px;top:50%;transform:translateY(-50%);width:12px;height:12px;background:var(--wf-error);border:2px solid white;border-radius:var(--wf-radius-circle);box-shadow:0 2px 4px rgba(0,0,0,0.15);z-index:10;" title="为假跳转"></div>` : '';
                        connectorHtml = trueConnector + falseConnector;
                    }

                    return `
                    <div class="${actionItemClass}" data-step="${stepIndex}" data-action="${actionIndex}" style="${isCondition ? 'position:relative;' : ''}">
                        <button class="wf-action-exec-btn action-exec-btn" data-step="${stepIndex}" data-action="${actionIndex}" title="执行">▶</button>
                        <div class="wf-action-content">
                            <div class="wf-action-desc">
                                <span>${escapeHtml(actionDesc)}</span>
                                <span class="wf-action-type">${actionTypeDisplay}</span>
                            </div>
                            ${actionMeta ? `<div class="wf-action-meta">${actionMeta}</div>` : ''}
                        </div>
                        ${highlightHtml}${valueEditHtml}${waitToggleHtml}${cacheToggleHtml}${bypassToggleHtml}${jumpHtml}
                        ${connectorHtml}
                    </div>
                `;
                }).join('');

                return `
                <div class="${stepClassName}" data-step-index="${stepIndex}">
                    <div class="wf-step-header" data-toggle-step="${stepIndex}">
                        <span class="wf-step-icon">${stepIcon}</span>
                        <span class="wf-step-toggle">▼</span>
                        <span class="wf-step-name">${step.name}</span>
                        <div class="wf-step-controls">
                            <div class="wf-toggle wf-toggle-enable ${stepBypassed ? '' : 'active'} bypass-step-toggle" data-bypass-step="${stepIndex}" title="${stepBypassed ? '已禁用：点击启用' : '已启用：点击禁用'}"></div>
                            <button class="wf-step-ctrl-btn step-jump-btn" data-step="${stepIndex}" title="跳转">📍</button>
                            <button class="wf-step-ctrl-btn step-exec-btn" data-step="${stepIndex}" title="执行">▶</button>
                        </div>
                    </div>
                    <div class="wf-actions-list">${actionsHtml}</div>
                </div>
            `;
            }).join('');

            // 绑定步骤折叠/展开
            stepList.querySelectorAll('.wf-step-header[data-toggle-step]').forEach(header => {
                header.onclick = (e) => {
                    if (e.target.classList.contains('step-exec-btn') ||
                        e.target.classList.contains('step-jump-btn') ||
                        e.target.classList.contains('wf-toggle') ||
                        e.target.closest('.wf-toggle')) return;
                    const idx = parseInt(header.dataset.toggleStep);
                    const stepEl = header.closest('.wf-step-item');
                    stepEl.classList.toggle('collapsed');
                    workflow.steps[idx].collapsed = stepEl.classList.contains('collapsed');
                    // 折叠状态改变时重新渲染连线
                    renderWorkflowConnections();
                };
            });

            // 跳转按钮
            stepList.querySelectorAll('.step-jump-btn').forEach(btn => {
                btn.onclick = (e) => { e.stopPropagation(); jumpToStep(parseInt(btn.dataset.step)); };
            });

            // 执行步骤按钮
            stepList.querySelectorAll('.step-exec-btn').forEach(btn => {
                btn.onclick = (e) => { e.stopPropagation(); executeSingleStep(parseInt(btn.dataset.step)); };
            });

            // 执行动作按钮
            stepList.querySelectorAll('.action-exec-btn').forEach(btn => {
                btn.onclick = (e) => {
                    e.stopPropagation();
                    executeSingleAction(parseInt(btn.dataset.step), parseInt(btn.dataset.action));
                };
            });

            // 高亮按钮
            stepList.querySelectorAll('.action-highlight-btn').forEach(btn => {
                btn.onclick = async (e) => {
                    e.stopPropagation();
                    const stepIndex = parseInt(btn.dataset.step);
                    const actionIndex = parseInt(btn.dataset.action);
                    try {
                        const selector = getEffectiveActionSelector(stepIndex, actionIndex);
                        await actionExecutors.highlight({ selector, duration: 4000 }, workflow.variables);
                    } catch (err) {
                        addLog(`✗ 高亮失败: ${err.message}`, 'error');
                    }
                };
            });

            // 跳转按钮 - 跳转到该动作
            stepList.querySelectorAll('.action-jump-btn').forEach(btn => {
                btn.onclick = (e) => {
                    e.stopPropagation();
                    jumpToAction(parseInt(btn.dataset.step), parseInt(btn.dataset.action));
                };
            });

            // waitUserAction toggle - 手动开关
            stepList.querySelectorAll('.wf-toggle.wf-toggle-manual[data-wait-step]').forEach(toggle => {
                toggle.onclick = (e) => {
                    e.stopPropagation();
                    const stepIndex = parseInt(toggle.dataset.waitStep);
                    const actionIndex = parseInt(toggle.dataset.waitAction);
                    const action = workflow.steps[stepIndex].actions[actionIndex];
                    const currentVal = getEffectiveActionWaitUser(stepIndex, actionIndex);
                    const newVal = !currentVal;
                    setActionOverride(activeWorkflowId, stepIndex, actionIndex, 'waitUserAction', newVal);
                    toggle.classList.toggle('active', newVal);
                    saveState();
                    addLog(`已${newVal ? '开启' : '关闭'}等待手动操作: ${action.description || action.type}`, 'info');
                };
            });

            // 缓存开关 - 上传动作
            stepList.querySelectorAll('.wf-toggle.wf-toggle-cache[data-cache-step]').forEach(toggle => {
                toggle.onclick = (e) => {
                    e.stopPropagation();
                    const stepIndex = parseInt(toggle.dataset.cacheStep);
                    const actionIndex = parseInt(toggle.dataset.cacheAction);
                    const action = workflow.steps[stepIndex].actions[actionIndex];
                    const currentVal = getEffectiveActionCache(stepIndex, actionIndex);
                    const newVal = !currentVal;
                    setActionOverride(activeWorkflowId, stepIndex, actionIndex, 'cache', newVal);
                    saveState();
                    updateUI();
                    addLog(`已${newVal ? '启用' : '禁用'}缓存: ${action.description || action.type}`, 'info');
                };
            });

            // 值编辑按钮
            stepList.querySelectorAll('.action-value-edit-btn').forEach(btn => {
                btn.onclick = (e) => {
                    e.stopPropagation();
                    const stepIndex = parseInt(btn.dataset.step);
                    const actionIndex = parseInt(btn.dataset.action);
                    setCurrentValueEditAction({ stepIndex, actionIndex });
                    const modal = document.getElementById('value-edit-modal');
                    const input = document.getElementById('value-edit-input');
                    const resolvedDiv = document.getElementById('value-edit-resolved');
                    const resolvedValue = document.getElementById('value-edit-resolved-value');
                    const currentValue = getEffectiveActionValue(stepIndex, actionIndex);
                    // 数组值显示为 JSON 字符串
                    input.value = Array.isArray(currentValue) ? JSON.stringify(currentValue) : (currentValue || '');

                    // 检查是否是变量引用，如果是则显示实际值
                    const varMatch = typeof currentValue === 'string' && currentValue.match(/\$\{(\w+)\}/);
                    if (varMatch) {
                        const resolved = replaceVariables(currentValue, workflow.variables);
                        // 只有解析出值且与原值不同时才显示（避免未定义变量的误导）
                        if (resolved !== currentValue && resolved !== undefined) {
                            resolvedValue.textContent = Array.isArray(resolved) ? JSON.stringify(resolved) : resolved;
                            resolvedDiv.style.display = 'block';
                        } else {
                            resolvedDiv.style.display = 'none';
                        }
                    } else {
                        resolvedDiv.style.display = 'none';
                    }

                    modal.style.display = 'flex';
                    input.focus();
                    input.select();
                };
            });

            // 选择器点击编辑
            stepList.querySelectorAll('.wf-action-selector-edit').forEach(el => {
                el.onclick = (e) => {
                    e.stopPropagation();
                    const stepIndex = parseInt(el.dataset.step);
                    const actionIndex = parseInt(el.dataset.action);
                    setCurrentSelectorEditAction({ stepIndex, actionIndex });
                    const modal = document.getElementById('selector-edit-modal');
                    const input = document.getElementById('selector-edit-input');
                    const resolvedDiv = document.getElementById('selector-edit-resolved');
                    const resolvedValue = document.getElementById('selector-edit-resolved-value');
                    const currentValue = getEffectiveActionSelector(stepIndex, actionIndex);
                    input.value = currentValue || '';
                    // 若含变量引用，显示实际解析值
                    const varMatch = typeof currentValue === 'string' && currentValue.match(/\$\{(\w+)\}/);
                    if (varMatch) {
                        const resolved = replaceVariables(currentValue, workflow.variables);
                        if (resolved !== currentValue && resolved !== undefined) {
                            resolvedValue.textContent = resolved;
                            resolvedDiv.style.display = 'block';
                        } else {
                            resolvedDiv.style.display = 'none';
                        }
                    } else {
                        resolvedDiv.style.display = 'none';
                    }
                    modal.style.display = 'flex';
                    input.focus();
                    input.select();
                };
            });

            // 步骤绕过开关
            stepList.querySelectorAll('.bypass-step-toggle').forEach(toggle => {
                toggle.onclick = (e) => {
                    e.stopPropagation();
                    const stepIndex = parseInt(toggle.dataset.bypassStep);
                    const step = workflow.steps[stepIndex];
                    const currentVal = getEffectiveStepBypass(stepIndex);
                    const newVal = !currentVal;
                    setStepOverride(activeWorkflowId, stepIndex, 'bypass', newVal);
                    saveState();
                    updateUI();
                    addLog(`${newVal ? '已绕过' : '已启用'}步骤: ${step.name}`, 'info');
                };
            });

            // 动作启用开关
            stepList.querySelectorAll('.wf-toggle.wf-toggle-enable[data-bypass-step][data-bypass-action]').forEach(toggle => {
                if (toggle.dataset.waitStep) return; // skip manual toggles
                toggle.onclick = (e) => {
                    e.stopPropagation();
                    const stepIndex = parseInt(toggle.dataset.bypassStep);
                    const actionIndex = parseInt(toggle.dataset.bypassAction);
                    const action = workflow.steps[stepIndex].actions[actionIndex];
                    const currentVal = getEffectiveActionBypass(stepIndex, actionIndex);
                    const newVal = !currentVal;
                    setActionOverride(activeWorkflowId, stepIndex, actionIndex, 'bypass', newVal);
                    saveState();
                    updateUI();
                    addLog(`${newVal ? '已绕过' : '已启用'}动作: ${action.description || action.type}`, 'info');
                };
            });

            // 自动滚动到当前步骤/动作
            if (isRunning && currentStepIndex >= 0) {
                let target = stepList.querySelector('.wf-action-item.current-action') ||
                             stepList.querySelector('.wf-step-item.current');
                if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }

        // 渲染条件连线
        renderWorkflowConnections();

        updateWorkflowInfoDisplay();
    }

    // 渲染工作流条件连线
    function renderWorkflowConnections() {
        const svg = document.getElementById('wf-connections');
        const stepList = document.getElementById('step-list');
        if (!svg || !stepList) return;

        svg.innerHTML = '';
        if (!workflow || !workflow.steps) return;

        // 设置SVG尺寸：宽度增加右侧空间（80px），高度与父容器相同
        const svgParent = svg.parentElement;
        const parentRect = svgParent.getBoundingClientRect();
        // 为右侧连线增加额外空间
        const extraWidth = 20;
        svg.style.width = (parentRect.width + extraWidth) + 'px';
        svg.style.height = parentRect.height + 'px';
        svg.setAttribute('width', parentRect.width + extraWidth);
        svg.setAttribute('height', parentRect.height);

        svg.getBoundingClientRect();
        workflow.steps.forEach((step, stepIdx) => {
            if (!step.actions) return;
            step.actions.forEach((action, actionIdx) => {
                if (action.type !== 'condition') return;

                // 检查步骤是否折叠
                const stepItem = document.querySelector(`.wf-step-item[data-step-index="${stepIdx}"]`);
                if (stepItem && stepItem.classList.contains('collapsed')) {
                    return;
                }

                // 查找连接点
                const trueConnector = document.querySelector(`.wf-connector-true[data-step-idx="${stepIdx}"][data-action-idx="${actionIdx}"]`);
                const falseConnector = document.querySelector(`.wf-connector-false[data-step-idx="${stepIdx}"][data-action-idx="${actionIdx}"]`);

                if (trueConnector && action.gotoTrue) {
                    const target = findNodeByGoto(action.gotoTrue);
                    if (target) {
                        // 检查目标元素是否可见
                        const targetStepIdx = parseInt(target.element.closest('.wf-step-item')?.dataset.stepIndex);
                        const targetStepItem = document.querySelector(`.wf-step-item[data-step-index="${targetStepIdx}"]`);
                        if (targetStepItem && targetStepItem.classList.contains('collapsed')) ; else {
                            drawWorkflowConnection(svg, trueConnector, target.element, '#48bb78');
                        }
                    }
                }

                if (falseConnector && action.gotoFalse) {
                    const target = findNodeByGoto(action.gotoFalse);
                    if (target) {
                        // 检查目标元素是否可见
                        const targetStepIdx = parseInt(target.element.closest('.wf-step-item')?.dataset.stepIndex);
                        const targetStepItem = document.querySelector(`.wf-step-item[data-step-index="${targetStepIdx}"]`);
                        if (targetStepItem && targetStepItem.classList.contains('collapsed')) ; else {
                            drawWorkflowConnection(svg, falseConnector, target.element, '#e53e3e');
                        }
                    }
                }
            });
        });
    }

    function findNodeByGoto(goto) {
        if (!goto) return null;

        console.log('[findNodeByGoto] 查找目标:', goto);

        // 检查是否是动作ID格式
        if (!/^\d+(-\d+)?$/.test(goto)) {
            console.log('[findNodeByGoto] 使用动作ID格式');
            return findNodeByActionId(goto);
        }

        // 解析索引格式: "步骤-动作"
        const parts = goto.split('-');
        if (parts.length < 2) return null;

        const stepIdx = parseInt(parts[0]) - 1;
        const actionStr = parts[1];

        if (!actionStr || actionStr === '') {
            // 跳转到步骤头部
            const node = document.querySelector(`.wf-step-item[data-step-index="${stepIdx}"]`);
            console.log('[findNodeByGoto] 查找步骤节点:', stepIdx, '结果:', !!node);
            return node ? { element: node } : null;
        } else {
            // 跳转到具体动作
            const actionIdx = parseInt(actionStr) - 1;
            const node = document.querySelector(`.wf-action-item[data-step="${stepIdx}"][data-action="${actionIdx}"]`);
            console.log('[findNodeByGoto] 查找动作节点:', stepIdx, actionIdx, '结果:', !!node);
            return node ? { element: node } : null;
        }
    }

    function findNodeByActionId(actionId) {
        console.log('[findNodeByActionId] 查找动作ID:', actionId);
        for (let stepIdx = 0; stepIdx < workflow.steps.length; stepIdx++) {
            const step = workflow.steps[stepIdx];
            if (!step.actions) continue;

            for (let actionIdx = 0; actionIdx < step.actions.length; actionIdx++) {
                const action = step.actions[actionIdx];
                if (action.id === actionId) {
                    const node = document.querySelector(`.wf-action-item[data-step="${stepIdx}"][data-action="${actionIdx}"]`);
                    console.log('[findNodeByActionId] 找到匹配，查找DOM节点:', stepIdx, actionIdx, '结果:', !!node);
                    if (node) {
                        return { element: node };
                    }
                }
            }
        }
        console.log('[findNodeByActionId] 未找到匹配的节点');
        return null;
    }

    function drawWorkflowConnection(svg, fromElement, toElement, color) {
        const svgRect = svg.getBoundingClientRect();
        const fromRect = fromElement.getBoundingClientRect();
        const toRect = toElement.getBoundingClientRect();

        // 检测连接点类型
        const branch = fromElement.dataset.branch || 'true';
        const isTrue = branch === 'true';

        // 计算起点坐标（相对于SVG）
        let x1, y1;
        if (isTrue) {
            x1 = fromRect.left - svgRect.left;
            y1 = fromRect.top + fromRect.height / 2 - svgRect.top;
        } else {
            x1 = fromRect.right - svgRect.left;
            y1 = fromRect.top + fromRect.height / 2 - svgRect.top;
        }

        // 计算终点坐标（相对于SVG）
        // 终点是目标步骤的边缘（不含圆点偏移），这样箭头和连线都在步骤边缘
        let x2, y2;
        if (isTrue) {
            // 左侧：目标步骤左边
            x2 = toRect.left - svgRect.left;
            y2 = toRect.top + toRect.height / 2 - svgRect.top;
        } else {
            // 右侧：目标步骤右边
            x2 = toRect.right - svgRect.left;
            y2 = toRect.top + toRect.height / 2 - svgRect.top;
        }

        // 使用横竖横连线样式：横→竖→横
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const horizontalOffset = 5; // 横向偏移量
        let d;
        if (isTrue) {
            // 左侧连线：向左横行 → 垂直到目标高度 → 向右横行到目标
            d = `M ${x1} ${y1} L ${x1 - horizontalOffset} ${y1} L ${x1 - horizontalOffset} ${y2} L ${x2} ${y2}`;
        } else {
            // 右侧连线：向右横行 → 垂直到目标高度 → 向左横行到目标
            d = `M ${x1} ${y1} L ${x1 + horizontalOffset} ${y1} L ${x1 + horizontalOffset} ${y2} L ${x2} ${y2}`;
        }
        path.setAttribute('d', d);
        path.setAttribute('stroke', color);
        path.setAttribute('stroke-width', '2');
        path.setAttribute('fill', 'none');
        path.setAttribute('opacity', '0.6');
        svg.appendChild(path);

        // 添加箭头：顶点朝向连接点，底边垂直
        const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        const arrowSize = 8;
        let points;
        if (isTrue) {
            // 左侧分支：从左边来，箭头顶点向右
            points = [
                [x2, y2],              // 顶点
                [x2 - arrowSize, y2 - arrowSize / 2],  // 左上
                [x2 - arrowSize, y2 + arrowSize / 2]   // 左下
            ];
        } else {
            // 右侧分支：从右边来，箭头顶点向左
            points = [
                [x2, y2],              // 顶点
                [x2 + arrowSize, y2 - arrowSize / 2],  // 右上
                [x2 + arrowSize, y2 + arrowSize / 2]   // 右下
            ];
        }
        arrow.setAttribute('points', points.map(p => p.join(',')).join(' '));
        arrow.setAttribute('fill', color);
        arrow.setAttribute('opacity', '0.6');
        svg.appendChild(arrow);
    }

    // ============================================
    // 拖拽设置
    // ============================================
    function setupDrag(panel) {
        const header = panel.querySelector('.wf-panel-header');

        header.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'BUTTON') return;
            dragData.isDragging = true;
            dragData.hasDragged = false;
            dragData.startX = e.clientX;
            dragData.startY = e.clientY;
            dragData.startRight = parseFloat(panel.style.right) || 0;
            dragData.startTop = parseFloat(panel.style.top) || 0;
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!dragData.isDragging) return;
            if (resizeData.isResizing) return;

            const deltaX = e.clientX - dragData.startX;
            const deltaY = e.clientY - dragData.startY;

            if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
                dragData.hasDragged = true;
            }

            let newRight = dragData.startRight - deltaX;
            let newTop = dragData.startTop + deltaY;

            const maxRight = window.innerWidth - 100;
            if (newRight < 0) newRight = 0;
            if (newRight > maxRight) newRight = maxRight;
            if (newTop < 0) newTop = 0;
            if (newTop > window.innerHeight - 50) newTop = window.innerHeight - 50;

            panel.style.right = newRight + 'px';
            panel.style.top = newTop + 'px';
        });
    }

    function observeUrlChange() {
        function onUrlChange() {
            const currentUrl = window.location.href;
            if (currentUrl !== lastUrl) {
                setLastUrl(currentUrl);

                if (autoContinue && workflow && workflow.enabled) {
                    addLog(`检测到 URL 变化: ${currentUrl}`, 'info');
                    scheduleAutoContinue(1000);
                }

                // 检测跨页面跳转后的自动匹配需求
                if (autoMatchPending && workflowList?.length > 0) {
                    addLog(`→ 检测到待匹配标记，在新页面执行自动匹配（当前 URL: ${currentUrl}）`, 'info');
                    setAutoMatchPending(false);
                    saveState();
                    autoMatchWorkflow();
                }
            }
        }

        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;

        history.pushState = function(...args) {
            originalPushState.apply(this, args);
            onUrlChange();
        };

        history.replaceState = function(...args) {
            originalReplaceState.apply(this, args);
            onUrlChange();
        };

        window.addEventListener('popstate', onUrlChange);
        window.addEventListener('hashchange', onUrlChange);
    }

    // 注入样式
    injectStyles();

    // 初始化运行时覆盖
    initRuntimeOverrides();

    // 加载工作流列表
    loadWorkflowList();

    // 注入跨模块依赖引用（解决循环依赖）
    setExecuteWorkflowRef(executeWorkflow);
    setUpdateUIRef$4(updateUI);
    setUpdateUIRef$2(updateUI);
    setUpdateUIRef$3(updateUI);
    setUpdateUIRef$1(updateUI);
    setUpdateUIRef(updateUI);

    // 设置更新回调：当检测到新版本时，在更新按钮上显示绿点
    setUpdateCallback((result) => {
        if (result && result.hasUpdate) {
            // 先设置全局状态，供 UI 初始化时检查
            // 判断是脚本更新还是工作流更新
            if (result.workflows) {
                window.wfWorkflowUpdate = true;
                console.log('[Update] 检测到工作流更新，设置全局状态');
            } else {
                window.wfHasUpdate = true;
                console.log('[Update] 检测到脚本更新，设置全局状态');
            }

            // 尝试立即显示绿点（如果 UI 已创建）
            const dot = document.getElementById('update-dot');
            if (dot) {
                dot.style.display = 'inline';
                console.log('[Update] 绿点已显示');
            } else {
                console.log('[Update] UI 未创建，等待 UI 初始化时显示绿点');
            }
        }
    });

    // 初始化 UI
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            createUI();
            observeUrlChange();
        });
    } else {
        setTimeout(() => {
            createUI();
            observeUrlChange();
        }, 500);
    }

    // 启动自动更新检查（内部会调度后续检查）
    startAutoCheck();

    // 调试辅助函数：在控制台调用 wf.clearUpdateCheck() 来清除更新检查时间
    // 使用 unsafeWindow 将函数暴露到页面全局作用域，使其可在浏览器控制台中访问
    if (typeof unsafeWindow !== 'undefined') {
        unsafeWindow.wf = {
            // 清除脚本更新检查时间
            clearScriptUpdateCheck: () => GM_deleteValue('updater_lastCheck'),
            // 清除工作流更新检查时间
            clearWorkflowUpdateCheck: () => GM_deleteValue('workflow_updater_lastCheck'),
            // 清除所有更新检查时间（脚本+工作流）
            clearUpdateCheck: () => {
                GM_deleteValue('updater_lastCheck');
                GM_deleteValue('workflow_updater_lastCheck');
            },
            // 清除已忽略的脚本版本
            clearDismissedVersion: () => GM_deleteValue('updater_dismissedVersion'),
            // 强制检查脚本更新
            forceCheckScriptUpdate: () => {
                GM_deleteValue('updater_lastCheck');
                return checkUpdate();
            },
            // 强制检查工作流更新
            forceCheckWorkflowUpdate: () => {
                GM_deleteValue('workflow_updater_lastCheck');
                return checkWorkflowUpdate();
            },
            // 强制检查所有更新
            forceCheckUpdate: () => {
                GM_deleteValue('updater_lastCheck');
                GM_deleteValue('workflow_updater_lastCheck');
                checkUpdate();
                checkWorkflowUpdate();
            }
        };
    }

})();

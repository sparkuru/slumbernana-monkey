export function injectStyles() {
    GM_addStyle(`
        .synctv-ext-panel {
            position: fixed;
            top: 50%;
            right: 20px;
            transform: translateY(-50%);
            z-index: 10000;
            font-family: -apple-system, system-ui, sans-serif;
        }

        .ext-fab-button {
            width: 56px;
            height: 56px;
            border-radius: 50%;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border: none;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .ext-fab-button:hover {
            transform: scale(1.1);
            box-shadow: 0 6px 20px rgba(0,0,0,0.4);
        }

        .ext-settings-panel {
            position: absolute;
            right: 70px;
            top: 0;
            width: 360px;
            max-height: 600px;
            background: rgba(30, 30, 30, 0.95);
            backdrop-filter: blur(20px);
            border-radius: 16px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.5);
            overflow: hidden;
            transform-origin: right center;
            animation: slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateX(20px) scale(0.95);
            }
            to {
                opacity: 1;
                transform: translateX(0) scale(1);
            }
        }

        .panel-header {
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            font-size: 18px;
            font-weight: 600;
        }

        .panel-content {
            padding: 16px;
            max-height: 500px;
            overflow-y: auto;
        }

        .setting-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px;
            margin-bottom: 8px;
            background: rgba(255,255,255,0.05);
            border-radius: 8px;
            transition: background 0.2s;
        }

        .setting-item:hover {
            background: rgba(255,255,255,0.1);
        }

        .setting-label {
            color: #e0e0e0;
            font-size: 14px;
        }

        .setting-desc {
            color: #999;
            font-size: 12px;
            margin-top: 4px;
        }

        .toggle-switch {
            position: relative;
            width: 48px;
            height: 24px;
            background: #555;
            border-radius: 12px;
            cursor: pointer;
            transition: background 0.3s;
        }

        .toggle-switch.active {
            background: #667eea;
        }

        .toggle-slider {
            position: absolute;
            top: 2px;
            left: 2px;
            width: 20px;
            height: 20px;
            background: white;
            border-radius: 50%;
            transition: transform 0.3s;
        }

        .toggle-switch.active .toggle-slider {
            transform: translateX(24px);
        }

        .synctv-notification {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 6px;
            z-index: 10001;
            color: white;
            animation: slideInNotification 0.3s ease;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }

        .synctv-notification.info {
            background: #4caf50;
        }

        .synctv-notification.error {
            background: #f44336;
        }

        .synctv-notification.warning {
            background: #ff9800;
        }

        @keyframes slideInNotification {
            from {
                opacity: 0;
                transform: translateX(100%);
            }
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }
    `);
}

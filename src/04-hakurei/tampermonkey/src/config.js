const DEFAULT_CONFIG = {
    danmaku: {
        enabled: true,
        opacity: 0.8,
        speed: 5,
        fontSize: 25,
        showOnLoad: true,
        sources: {
            bilibili: true,
            dandanplay: true
        }
    },

    bilibili: {
        autoProxy: true,
        autoSelectSingle: true,
        autoShared: true
    },

    baiduUA: {
        enabled: true,
        customUA: 'pan.baidu.com'
    },

    backgroundMute: {
        enabled: true,
        resumeOnFocus: true
    },

    ui: {
        showSettings: true,
        position: 'right'
    },

    api: {
        proxyServer: 'http://localhost:3000',
        timeout: 10000
    }
};

class Config {
    constructor() {
        this.cache = {};
        this.loadAll();
    }

    loadAll() {
        const keys = GM_listValues();
        keys.forEach(key => {
            this.cache[key] = GM_getValue(key);
        });
    }

    get(path, defaultValue) {
        const keys = path.split('.');
        let value = this.cache;

        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            } else {
                value = this._getDefault(path);
                break;
            }
        }

        return value !== undefined ? value : defaultValue;
    }

    set(path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        let target = this.cache;

        for (const key of keys) {
            if (!(key in target)) {
                target[key] = {};
            }
            target = target[key];
        }

        target[lastKey] = value;
        GM_setValue(path, value);
    }

    _getDefault(path) {
        const keys = path.split('.');
        let value = DEFAULT_CONFIG;

        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            } else {
                return undefined;
            }
        }

        return value;
    }

    reset(path) {
        if (path) {
            const defaultValue = this._getDefault(path);
            this.set(path, defaultValue);
        } else {
            const keys = GM_listValues();
            keys.forEach(key => GM_deleteValue(key));
            this.cache = {};
            this.loadAll();
        }
    }
}

export const config = new Config();
export { DEFAULT_CONFIG };

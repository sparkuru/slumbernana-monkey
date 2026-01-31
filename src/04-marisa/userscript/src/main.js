import { config } from './config.js';
import { DanmakuManager } from './modules/danmaku/index.js';
import { BilibiliEnhancer } from './modules/bilibili/index.js';
import { BaiduUAManager } from './modules/baidu-ua/index.js';
import { BackgroundMuteManager } from './modules/background-mute/index.js';
import { UIManager } from './modules/ui/index.js';
import { waitForElement } from './utils/dom.js';
import { injectStyles } from './utils/styles.js';

const script_name = 'marisa';
console.log(`[${script_name}] Initializing...`);

injectStyles();

const managers = {
    ui: null,
    danmaku: null,
    bilibili: null,
    baiduUA: null,
    bgMute: null
};

async function initialize() {
    managers.ui = new UIManager();
    managers.ui.init();

    if (config.get('danmaku.enabled')) {
        managers.danmaku = new DanmakuManager();
    }

    if (config.get('bilibili.autoProxy')) {
        managers.bilibili = new BilibiliEnhancer();
    }

    if (config.get('baiduUA.enabled')) {
        managers.baiduUA = new BaiduUAManager();
    }

    if (config.get('backgroundMute.enabled')) {
        managers.bgMute = new BackgroundMuteManager();
    }

    await waitForArtplayer();
}

async function waitForArtplayer() {
    await waitForElement('.artplayer', async (artElement) => {
        const art = artElement.art || window.art;

        if (!art) {
            console.warn(`[${script_name}] Artplayer instance not found`);
            return;
        }

        console.log(`[${script_name}] Artplayer detected:`, art);

        if (managers.danmaku) {
            await managers.danmaku.init(art);
        }

        if (managers.bgMute) {
            managers.bgMute.init(art);
        }

        art.on('video:loadedmetadata', () => {
            console.log(`[${script_name}] Video loaded:`, art.option.url);

            if (managers.danmaku) {
                managers.danmaku.handleVideoLoad(art);
            }

            if (managers.baiduUA) {
                managers.baiduUA.handleVideoLoad(art.option.url);
            }
        });
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}

console.log(`[${script_name}] Loaded successfully`);

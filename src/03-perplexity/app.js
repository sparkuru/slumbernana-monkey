// ==UserScript==
// @name         Perplexity Chinese 适配
// @namespace    https://tampermonkey.net/
// @version      0.1
// @description  为 Perplexity 应用中文环境适配
// @author       wkyuu
// @match        https://www.perplexity.ai/*
// @match        https://perplexity.ai/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=perplexity.ai
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const fontFamily = [
        '"Noto Sans CJK SC"',
		'MonoLisa',
        '"WenQuanYi Micro Hei"',
        'system-ui',
        '-apple-system',
        'BlinkMacSystemFont',
        '"Segoe UI"',
        'sans-serif',
    ].join(', ');

    const style = document.createElement('style');
    style.textContent = `
        * {
            font-family: ${fontFamily} !important;
        }
    `;
    document.documentElement.appendChild(style);
})();

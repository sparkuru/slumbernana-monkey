// ==UserScript==
// @name         Taobao Greener
// @namespace    http://tampermonkey.net/
// @version      0.1.0
// @description  Remove Taobao floating promotions, popups, and ad containers
// @author       wkyuu
// @match        https://taobao.com/*
// @match        https://*.taobao.com/*
// @match        https://tmall.com/*
// @match        https://*.tmall.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=taobao.com
// @grant        none
// ==/UserScript==

(function () {
	'use strict';

	const STYLE_ID = 'taobao-greener-style';
	const REMOVAL_SELECTORS = [
		'#J_TBPC_POP_home',
		'.custom-pop-tmpl-wrapper',
		'[id*="J_Tanx"]',
		'[id*="tanx"]',
		'[class*="tanx"]',
		'[class*="adzone"]',
		'[class*="ad-zone"]',
		'[class*="advert"]',
		'[data-spm*="ad"]',
		'iframe[src*="tanx.com"]',
		'iframe[src*="alimama.com"]',
		'.tb-live-entry',
		'.jipiao-entry',
		'.ww-light',
		'.site-nav-bd-r .site-nav-pipe',
		'.mui-mbar',
		'.J_SiteNavLogin',
		'.J_TbLazyload[data-ks-lazyload-custom]'
	];
	let cleanupTimer = null;
	let observer = null;

	function injectStyle() {
		if (document.getElementById(STYLE_ID)) {
			return;
		}

		const style = document.createElement('style');
		style.id = STYLE_ID;
		style.textContent = `
			${REMOVAL_SELECTORS.join(',\n\t\t\t')} {
				display: none !important;
			}

			body {
				overflow-x: hidden !important;
			}
		`;
		document.head.appendChild(style);
	}

	function removeElements() {
		REMOVAL_SELECTORS.forEach(selector => {
			document.querySelectorAll(selector).forEach(element => element.remove());
		});
	}

	function removeOversizedFixedOverlays() {
		document.querySelectorAll('body > div, body > section').forEach(element => {
			const style = window.getComputedStyle(element);
			const rect = element.getBoundingClientRect();
			const isHighLayer = Number(style.zIndex) >= 1000;
			const isFixedOverlay = ['fixed', 'sticky'].includes(style.position) && isHighLayer;
			const coversPage = rect.width >= window.innerWidth * 0.5 && rect.height >= window.innerHeight * 0.25;

			if (isFixedOverlay && coversPage && !element.matches('#J_SiteNav, #J_Col_Main, #content')) {
				element.remove();
			}
		});
	}

	function cleanup() {
		removeElements();
		removeOversizedFixedOverlays();
	}

	function scheduleCleanup() {
		if (cleanupTimer) {
			return;
		}

		cleanupTimer = setTimeout(() => {
			cleanupTimer = null;
			cleanup();
		}, 120);
	}

	function startObserver() {
		if (!document.body || observer) {
			return;
		}

		observer = new MutationObserver(mutations => {
			if (mutations.some(mutation => mutation.addedNodes.length > 0)) {
				scheduleCleanup();
			}
		});

		observer.observe(document.body, {
			childList: true,
			subtree: true
		});
	}

	function initialize() {
		injectStyle();
		cleanup();
		startObserver();
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', initialize);
	} else {
		initialize();
	}
})();

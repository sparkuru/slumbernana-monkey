// ==UserScript==
// @name         Jingdong Greener
// @namespace    http://tampermonkey.net/
// @version      0.1.0
// @description  Remove Jingdong floating promotions, coupon prompts, and ad containers
// @author       wkyuu
// @match        https://jd.com/*
// @match        https://*.jd.com/*
// @match        https://jingdong.com/*
// @match        https://*.jingdong.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=jd.com
// @grant        none
// ==/UserScript==

(function () {
	'use strict';

	const STYLE_ID = 'jingdong-greener-style';
	const REMOVAL_SELECTORS = [
		'.umc-equity',
		'#J_promotional-top',
		'#J_event_lk',
		'#J_coupop',
		'#J-global-toolbar',
		'.J-global-toolbar',
		'.jdm-toolbar-wrap',
		'.toolbar-wrap',
		'.jdm-tbar-panel',
		'.mod_coupon',
		'.mod_actmark',
		'.J_f',
		'.J_event',
		'.J_promWrap',
		'.J_promotional-top',
		'.left-fixtool',
		'.right-sidebar',
		'[class*="adbox"]',
		'[class*="advert"]',
		'[class*="promotion"]',
		'iframe[src*="ad"]'
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

	function removeBlockingDialogs() {
		document.querySelectorAll('body > div').forEach(element => {
			const style = window.getComputedStyle(element);
			const rect = element.getBoundingClientRect();
			const isBlockingLayer = ['fixed', 'sticky'].includes(style.position) && Number(style.zIndex) >= 1000;
			const hasCouponText = /优惠券|红包|新人|会员|PLUS/.test(element.textContent || '');
			const coversPage = rect.width >= window.innerWidth * 0.35 && rect.height >= window.innerHeight * 0.2;

			if (isBlockingLayer && hasCouponText && coversPage) {
				element.remove();
			}
		});
	}

	function cleanup() {
		removeElements();
		removeBlockingDialogs();
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

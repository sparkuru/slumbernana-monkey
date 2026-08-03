// ==UserScript==
// @name         Jingdong Greener
// @namespace    http://tampermonkey.net/
// @version      0.1.1
// @description  Clean Jingdong item URLs and remove floating promotions, coupon prompts, and ad containers
// @author       wkyuu
// @match        https://jd.com/*
// @match        https://*.jd.com/*
// @match        https://jingdong.com/*
// @match        https://*.jingdong.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=jd.com
// @grant        none
// @run-at       document-start
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
		'[id^="qr"][name^="exist-"]',
		'[id^="qr"][style*="position:fixed"]',
		'[id^="qr"][style*="position: fixed"]',
		'[name^="exist-"][style*="position:fixed"]',
		'[name^="exist-"][style*="position: fixed"]',
		'[class*="adbox"]',
		'[class*="advert"]',
		'[class*="promotion"]',
		'iframe[src*="ad"]'
	];
	const ITEM_HOST = 'item.jd.com';
	const PRODUCT_TRACKING_PARAMS = new Set(['pcdk', 'spmtag', 'rid', 'cu']);
	let cleanupTimer = null;
	let normalizeTimer = null;
	let observer = null;

	function getCleanUrl(urlText) {
		try {
			const url = new URL(urlText, window.location.origin);

			if (url.hostname.toLowerCase() === ITEM_HOST) {
				[...url.searchParams.keys()].forEach(parameter => {
					const normalizedParameter = parameter.toLowerCase();
					if (PRODUCT_TRACKING_PARAMS.has(normalizedParameter) || normalizedParameter.startsWith('utm_')) {
						url.searchParams.delete(parameter);
					}
				});

				return url.href;
			}

			return urlText;
		} catch {
			return urlText;
		}
	}

	function normalizeAddressBar() {
		const cleanUrl = getCleanUrl(window.location.href);
		if (cleanUrl === window.location.href) {
			return;
		}

		window.history.replaceState(window.history.state, document.title, cleanUrl);
	}

	function scheduleAddressBarNormalize() {
		if (normalizeTimer) {
			return;
		}

		normalizeTimer = window.setTimeout(() => {
			normalizeTimer = null;
			normalizeAddressBar();
		}, 50);
	}

	function patchHistoryMethod(methodName) {
		const originalMethod = window.history[methodName];
		window.history[methodName] = function (...args) {
			const result = originalMethod.apply(this, args);
			scheduleAddressBarNormalize();
			return result;
		};
	}

	function installAddressBarCleaner() {
		normalizeAddressBar();
		patchHistoryMethod('pushState');
		patchHistoryMethod('replaceState');
		window.addEventListener('popstate', scheduleAddressBarNormalize);
	}

	function normalizeLink(link) {
		const cleanUrl = getCleanUrl(link.href);

		if (cleanUrl !== link.href) {
			link.href = cleanUrl;
		}
	}

	function normalizeLinks(root = document) {
		if (root instanceof HTMLAnchorElement) {
			normalizeLink(root);
		}

		if (typeof root.querySelectorAll !== 'function') {
			return;
		}

		root.querySelectorAll('a[href]').forEach(normalizeLink);
	}

	function normalizeEventLink(event) {
		const target = event.target;
		const element = target instanceof Element ? target : target?.parentElement;
		const link = element?.closest('a[href]');
		if (link instanceof HTMLAnchorElement) {
			normalizeLink(link);
		}
	}

	function installLinkEventCleaner() {
		['pointerdown', 'mousedown', 'click'].forEach(eventName => {
			document.addEventListener(eventName, normalizeEventLink, true);
		});
	}

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
		normalizeLinks();
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
			if (mutations.some(mutation => mutation.addedNodes.length > 0 || mutation.type === 'attributes')) {
				scheduleCleanup();
			}
		});

		observer.observe(document.body, {
			attributes: true,
			attributeFilter: ['href'],
			childList: true,
			subtree: true
		});
	}

	function installEarlyCleaners() {
		installAddressBarCleaner();
		installLinkEventCleaner();
	}

	function initializePageCleanup() {
		injectStyle();
		cleanup();
		startObserver();
	}

	installEarlyCleaners();

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', initializePageCleanup);
	} else {
		initializePageCleanup();
	}
})();

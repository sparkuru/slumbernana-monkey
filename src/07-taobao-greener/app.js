// ==UserScript==
// @name         Taobao Greener
// @namespace    http://tampermonkey.net/
// @version      0.1.7
// @description  Clean Taobao item URLs and remove floating promotions, popups, and ad containers
// @author       wkyuu
// @match        https://taobao.com/*
// @match        https://*.taobao.com/*
// @match        https://tmall.com/*
// @match        https://*.tmall.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=taobao.com
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
	'use strict';

	const ITEM_ID_PATTERN = /^\d+$/;
	const ITEM_PATH_PATTERN = /^\/item\.htm$/i;
	const SKU_ID_PATTERN = /^\d+$/;
	const TAOBAO_HOST_PATTERN = /(^|\.)taobao\.com$/i;
	const TMALL_HOST_PATTERN = /(^|\.)tmall\.com$/i;
	const TRACKING_PARAMS = [
		'appUid',
		'spm'
	];
	const DETAIL_CLEAN_DELAY_MS = 3000;
	const MODAL_NAME_PATTERN = /(^|[-_])(dialog|float|layer|mask|modal|overlay|pop|popup)([-_]|$)/i;
	const STYLE_ID = 'taobao-greener-style';
	const REMOVAL_SELECTORS = [
		'#J_TBPC_POP_home',
		'#J_TBPC_POP_detail',
		'.custom-pop-tmpl-wrapper',
		'[id^="qr"][name^="exist-"]',
		'[id^="qr"][style*="position:fixed"]',
		'[id^="qr"][style*="position: fixed"]',
		'[name^="exist-"][style*="position:fixed"]',
		'[name^="exist-"][style*="position: fixed"]',
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
	let normalizeTimer = null;
	let observer = null;

	function buildCleanItemUrl(origin, id, skuId) {
		const params = new URLSearchParams({ id });
		if (skuId && SKU_ID_PATTERN.test(skuId)) {
			params.set('skuId', skuId);
		}

		return `${origin}/item.htm?${params.toString()}`;
	}

	function getCleanUrl(urlText, options = {}) {
		const { cleanItemDetail = true } = options;
		let url;
		try {
			url = new URL(urlText, window.location.origin);
		} catch {
			return urlText;
		}

		const isTaobaoHost = TAOBAO_HOST_PATTERN.test(url.hostname);
		const isTmallHost = TMALL_HOST_PATTERN.test(url.hostname);
		if (!isTaobaoHost && !isTmallHost) {
			return urlText;
		}

		const id = url.searchParams.get('id');
		const skuId = url.searchParams.get('skuId');
		const isTaobaoItemPage = url.hostname === 'item.taobao.com' && ITEM_PATH_PATTERN.test(url.pathname);
		const isTmallItemPage = url.hostname === 'detail.tmall.com' && ITEM_PATH_PATTERN.test(url.pathname);
		const isSimbaClick = url.hostname === 'click.mz.simba.taobao.com' && /^\/necpm$/i.test(url.pathname);
		if (id && ITEM_ID_PATTERN.test(id)) {
			if (isTaobaoItemPage && cleanItemDetail) {
				return buildCleanItemUrl('https://item.taobao.com', id, skuId);
			}

			if (isTmallItemPage && cleanItemDetail) {
				return buildCleanItemUrl('https://detail.tmall.com', id, skuId);
			}

			if (isSimbaClick) {
				return buildCleanItemUrl('https://item.taobao.com', id, skuId);
			}
		}

		if (isTmallHost) {
			const cleanUrl = new URL(url.href);
			TRACKING_PARAMS.forEach(param => cleanUrl.searchParams.delete(param));
			return cleanUrl.href;
		}

		return urlText;
	}

	function isItemDetailUrl(urlText) {
		try {
			const url = new URL(urlText, window.location.origin);
			return (url.hostname === 'item.taobao.com' || url.hostname === 'detail.tmall.com')
				&& ITEM_PATH_PATTERN.test(url.pathname)
				&& ITEM_ID_PATTERN.test(url.searchParams.get('id') || '');
		} catch {
			return false;
		}
	}

	function normalizeAddressBar() {
		const cleanUrl = getCleanUrl(window.location.href);
		if (cleanUrl === window.location.href) {
			return;
		}

		const cleanLocation = new URL(cleanUrl);
		if (cleanLocation.origin === window.location.origin) {
			window.history.replaceState(window.history.state, document.title, cleanUrl);
			return;
		}

		window.location.replace(cleanUrl);
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
		if (isItemDetailUrl(window.location.href)) {
			window.setTimeout(normalizeAddressBar, DETAIL_CLEAN_DELAY_MS);
		} else {
			normalizeAddressBar();
		}
		patchHistoryMethod('pushState');
		patchHistoryMethod('replaceState');
		window.addEventListener('popstate', scheduleAddressBarNormalize);
	}

	function normalizeLink(link) {
		const cleanUrl = getCleanUrl(link.href, { cleanItemDetail: false });
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

	function isHighFixedLayer(element) {
		const style = window.getComputedStyle(element);
		const zIndex = Number(style.zIndex);
		return style.position === 'fixed' && Number.isFinite(zIndex) && zIndex >= 1000;
	}

	function removeFixedQrPopups() {
		document.querySelectorAll('canvas[id^="mscan"], [id^="qr"], [name^="exist-"]').forEach(candidate => {
			const element = candidate.closest('[id^="qr"], [name^="exist-"]') || candidate.parentElement?.parentElement;
			if (element && isHighFixedLayer(element)) {
				element.remove();
			}
		});
	}

	function isModalLikeOverlay(element) {
		const signature = `${element.id} ${element.className}`;
		return element.getAttribute('role') === 'dialog'
			|| element.getAttribute('aria-modal') === 'true'
			|| MODAL_NAME_PATTERN.test(signature);
	}

	function removeModalLikeOverlays() {
		document.querySelectorAll('body > div, body > section').forEach(element => {
			const rect = element.getBoundingClientRect();
			const coversPage = rect.width >= window.innerWidth * 0.5 && rect.height >= window.innerHeight * 0.25;

			if (isHighFixedLayer(element) && coversPage && isModalLikeOverlay(element)) {
				element.remove();
			}
		});
	}

	function cleanup() {
		normalizeLinks();
		removeElements();
		removeFixedQrPopups();
		removeModalLikeOverlays();
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

// ==UserScript==
// @name         Taobao Greener
// @namespace    http://tampermonkey.net/
// @version      0.2.0
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
	const SIMBA_CLICK_HOST_PATTERN = /^click(?:\.[a-z0-9-]+)*\.simba\.taobao\.com$/i;
	const SIMBA_CLICK_PATH_PATTERN = /^\/(?:cc_im|necpm)$/i;
	const SEARCH_PATH_PATTERN = /^\/search$/i;
	const CUSTOMER_SERVICE_ENTRY_SELECTOR = '[data-name="webww2"]';
	const CUSTOMER_SERVICE_URL = 'https://market.m.taobao.com/app/im/chat/index.html';
	const SEARCH_KEEP_PARAMS = [
		'q',
		'page',
		'tab'
	];
	const TRACKING_PARAMS = [
		'appUid',
		'spm'
	];
	const DETAIL_CLEAN_DELAY_MS = 3000;
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
		'.site-nav-bd-r .site-nav-pipe',
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

	function getNestedSearchParam(url, paramName) {
		const directValue = url.searchParams.get(paramName);
		if (directValue) {
			return directValue;
		}

		for (const value of url.searchParams.values()) {
			const nestedValue = new URLSearchParams(value).get(paramName);
			if (nestedValue) {
				return nestedValue;
			}
		}

		return null;
	}

	function getCleanSearchUrl(url) {
		const cleanUrl = new URL(url.origin + url.pathname);
		SEARCH_KEEP_PARAMS.forEach(param => {
			const value = url.searchParams.get(param);
			if (value) {
				cleanUrl.searchParams.set(param, value);
			}
		});

		if (cleanUrl.searchParams.get('page') === '1') {
			cleanUrl.searchParams.delete('page');
		}

		if (cleanUrl.searchParams.get('tab') === 'all') {
			cleanUrl.searchParams.delete('tab');
		}

		return cleanUrl.href;
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

		const id = getNestedSearchParam(url, 'id');
		const skuId = getNestedSearchParam(url, 'skuId');
		const isTaobaoSearchPage = url.hostname === 's.taobao.com' && SEARCH_PATH_PATTERN.test(url.pathname);
		const isTaobaoItemPage = url.hostname === 'item.taobao.com' && ITEM_PATH_PATTERN.test(url.pathname);
		const isTmallItemPage = url.hostname === 'detail.tmall.com' && ITEM_PATH_PATTERN.test(url.pathname);
		const isSimbaClick = SIMBA_CLICK_HOST_PATTERN.test(url.hostname) && SIMBA_CLICK_PATH_PATTERN.test(url.pathname);
		if (isTaobaoSearchPage) {
			return getCleanSearchUrl(url);
		}

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

	function getCustomerServiceContext() {
		const itemData = window.__ICE_APP_CONTEXT__?.loaderData?.home?.data?.res;
		const trigger = document.querySelector('#aliww-click-trigger, #aliww-click-trigger-new');
		const itemId = itemData?.item?.itemId || trigger?.dataset.item || getNestedSearchParam(new URL(window.location.href), 'id');
		const encryptUid = itemData?.seller?.encryptUid || trigger?.dataset.encryptuid;

		if (!ITEM_ID_PATTERN.test(itemId || '') || !encryptUid) {
			return null;
		}

		return { itemId, encryptUid };
	}

	function getCustomerServiceUrl() {
		const context = getCustomerServiceContext();
		if (!context) {
			return null;
		}

		const url = new URL(CUSTOMER_SERVICE_URL);
		url.searchParams.set('gid', context.itemId);
		url.searchParams.set('encryptUid', context.encryptUid);
		url.searchParams.set('bizType', '11001');
		url.searchParams.set('extraParams', JSON.stringify({
			pageSource: 'taobao_pc',
			itemId: context.itemId,
			extParams: {}
		}));
		url.searchParams.set('sceneParams', JSON.stringify({
			source: 'light',
			pageSource: 'taobao_pc',
			toRole: 'seller'
		}));
		url.searchParams.set('type', 'PC_WEB');
		url.hash = '/';
		return url.href;
	}

	function openCustomerService(event) {
		if (!event.isTrusted) {
			return;
		}

		const target = event.target;
		const element = target instanceof Element ? target : target?.parentElement;
		const entry = element?.closest(CUSTOMER_SERVICE_ENTRY_SELECTOR);
		const url = entry && getCustomerServiceUrl();
		if (!url) {
			return;
		}

		event.preventDefault();
		event.stopImmediatePropagation();
		const chatWindow = window.open(url, '_blank');
		if (chatWindow) {
			chatWindow.opener = null;
			return;
		}

		window.location.assign(url);
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
		document.addEventListener('click', openCustomerService, true);
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

	function cleanup() {
		normalizeLinks();
		removeElements();
		removeFixedQrPopups();
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

// ==UserScript==
// @name         Jingdong Greener
// @namespace    http://tampermonkey.net/
// @version      0.1.2
// @description  Clean Jingdong URLs and remove floating promotions, coupon prompts, and ad containers
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
	const SHARE_BUTTON_ID = 'jingdong-greener-share';
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
	const SEARCH_HOST = 'search.jd.com';
	const SEARCH_PATH_PATTERN = /^\/Search$/i;
	const PRODUCT_TRACKING_PARAMS = new Set(['pcdk', 'spmtag', 'rid', 'cu']);
	const SEARCH_TRACKING_PARAMS = new Set(['enc', 'pvid', 'themecolor', 'from', 'spmtag', 'wq']);
	let cleanupTimer = null;
	let normalizeTimer = null;
	let resetShareButtonTimer = null;
	let observer = null;

	function getCleanUrl(urlText) {
		try {
			const url = new URL(urlText, window.location.origin);
			const hostname = url.hostname.toLowerCase();

			if (hostname === ITEM_HOST) {
				[...url.searchParams.keys()].forEach(parameter => {
					const normalizedParameter = parameter.toLowerCase();
					if (PRODUCT_TRACKING_PARAMS.has(normalizedParameter) || normalizedParameter.startsWith('utm_')) {
						url.searchParams.delete(parameter);
					}
				});

				return url.href;
			}

			if (hostname === SEARCH_HOST && SEARCH_PATH_PATTERN.test(url.pathname)) {
				[...url.searchParams.keys()].forEach(parameter => {
					const normalizedParameter = parameter.toLowerCase();
					if (SEARCH_TRACKING_PARAMS.has(normalizedParameter) || normalizedParameter.startsWith('utm_')) {
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

	function isItemDetailUrl(urlText) {
		try {
			const url = new URL(urlText, window.location.origin);
			return url.hostname.toLowerCase() === ITEM_HOST && /^\/\d+\.html$/i.test(url.pathname);
		} catch {
			return false;
		}
	}

	function getItemTitle() {
		const itemTitle = document.querySelector('.sku-name')?.textContent || document.title;
		const title = itemTitle.replace(/\s*[-_|]\s*京东.*$/u, '').trim();
		return title || '京东商品';
	}

	async function copyToClipboard(text) {
		if (navigator.clipboard?.writeText) {
			await navigator.clipboard.writeText(text);
			return;
		}

		const textarea = document.createElement('textarea');
		textarea.value = text;
		textarea.setAttribute('readonly', '');
		textarea.style.cssText = 'position:fixed;opacity:0;pointer-events:none;';
		document.body.appendChild(textarea);
		textarea.select();
		const copied = document.execCommand('copy');
		textarea.remove();
		if (!copied) {
			throw new Error('Clipboard copy failed');
		}
	}

	function setShareButtonState(state) {
		const button = document.getElementById(SHARE_BUTTON_ID);
		if (!(button instanceof HTMLButtonElement)) {
			return;
		}

		const labels = {
			default: '复制商品链接',
			copied: '链接已复制',
			failed: '复制失败'
		};
		button.dataset.state = state;
		button.setAttribute('aria-label', labels[state]);
		button.title = labels[state];
	}

	function copyItemShareLink(event) {
		event.preventDefault();
		event.stopPropagation();
		const shareText = `${getItemTitle()}\n${getCleanUrl(window.location.href)}`;
		copyToClipboard(shareText)
			.then(() => setShareButtonState('copied'))
			.catch(() => setShareButtonState('failed'))
			.finally(() => {
				window.clearTimeout(resetShareButtonTimer);
				resetShareButtonTimer = window.setTimeout(() => setShareButtonState('default'), 1600);
			});
	}

	function findNativeSidebarItem() {
		const labels = ['我的', '客服', '桌面版'];
		const candidates = Array.from(document.querySelectorAll('a, button, [role="button"], div'));

		for (const label of labels) {
			const labelElement = candidates.find(element => element.textContent?.trim() === label);
			for (let element = labelElement; element && element !== document.body; element = element.parentElement) {
				const rect = element.getBoundingClientRect();
				if (rect.width <= 100
					&& rect.height >= 48
					&& rect.height <= 100
					&& rect.right >= window.innerWidth - 160) {
					return element;
				}
			}
		}

		return null;
	}

	function matchNativeSidebarItemSize(button, sidebarItem) {
		const { width, height } = sidebarItem.getBoundingClientRect();
		if (width <= 0 || height <= 0) {
			return;
		}

		button.style.flexBasis = `${height}px`;
		button.style.height = `${height}px`;
		button.style.width = `${width}px`;
	}

	function installShareButton() {
		if (!isItemDetailUrl(window.location.href) || document.getElementById(SHARE_BUTTON_ID)) {
			return;
		}

		const sidebarItem = findNativeSidebarItem();
		if (!sidebarItem?.parentElement) {
			return;
		}

		const button = document.createElement('button');
		button.id = SHARE_BUTTON_ID;
		button.type = 'button';
		button.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M14 5l5 5-5 5M19 10H9a4 4 0 0 0-4 4v5"/></svg><span>分享</span>';
		button.addEventListener('click', copyItemShareLink);
		matchNativeSidebarItemSize(button, sidebarItem);
		sidebarItem.insertAdjacentElement('afterend', button);
		setShareButtonState('default');
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

			#${SHARE_BUTTON_ID} {
				align-items: center;
				appearance: none;
				background: transparent;
				border: 0;
				color: #666;
				cursor: pointer;
				display: flex;
				flex-direction: column;
				font: 12px/16px Arial, sans-serif;
				flex: 0 0 72px;
				height: 72px;
				justify-content: center;
				padding: 0;
				position: relative;
				transition: background-color 160ms ease, color 160ms ease;
				width: 56px;
			}

			#${SHARE_BUTTON_ID} svg {
				height: 24px;
				fill: none;
				margin-bottom: 4px;
				stroke: currentColor;
				stroke-linecap: round;
				stroke-linejoin: round;
				stroke-width: 1.8;
				width: 24px;
			}

			#${SHARE_BUTTON_ID}:hover {
				color: #e1251b;
			}

			#${SHARE_BUTTON_ID}::after {
				background: #1f1f1f;
				border-radius: 6px;
				color: #fff;
				content: attr(aria-label);
				font-size: 12px;
				line-height: 1;
				opacity: 0;
				padding: 7px 8px;
				pointer-events: none;
				position: absolute;
				right: calc(100% + 8px);
				top: 50%;
				transform: translate(4px, -50%);
				transition: opacity 160ms ease, transform 160ms ease;
				white-space: nowrap;
			}

			#${SHARE_BUTTON_ID}:hover::after,
			#${SHARE_BUTTON_ID}[data-state="copied"]::after,
			#${SHARE_BUTTON_ID}[data-state="failed"]::after {
				opacity: 1;
				transform: translate(0, -50%);
			}

			#${SHARE_BUTTON_ID}[data-state="copied"] {
				color: #198754;
			}

			#${SHARE_BUTTON_ID}[data-state="failed"] {
				color: #e1251b;
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
		installShareButton();
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

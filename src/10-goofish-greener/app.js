// ==UserScript==
// @name         Goofish Greener
// @namespace    http://tampermonkey.net/
// @version      0.1.0
// @description  Clean Goofish URLs, keep chat links working, and copy item share links
// @author       wkyuu
// @match        https://goofish.com/*
// @match        https://*.goofish.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=goofish.com
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
	'use strict';

	const GOOFISH_HOST_PATTERN = /(^|\.)goofish\.com$/i;
	const ITEM_ID_PATTERN = /^\d+$/;
	const SEARCH_PATH_PATTERN = /^\/search$/i;
	const ITEM_PATH_PATTERN = /^\/item$/i;
	const CHAT_PATH_PATTERN = /^\/im$/i;
	const PERSONAL_PATH_PATTERN = /^\/personal$/i;
	const SHARE_BUTTON_ID = 'goofish-greener-share';
	const SURVEY_SELECTOR = '[class*="surveyWrap--"]';
	const STYLE_ID = 'goofish-greener-style';
	let normalizeTimer = null;
	let shareButtonTimer = null;
	let resetShareButtonTimer = null;
	let observer = null;

	function isValidId(value) {
		return ITEM_ID_PATTERN.test(value || '');
	}

	function createGoofishUrl(pathname) {
		return new URL(pathname, 'https://www.goofish.com');
	}

	function getCleanUrl(urlText) {
		let url;
		try {
			url = new URL(urlText, window.location.origin);
		} catch {
			return urlText;
		}

		if (!GOOFISH_HOST_PATTERN.test(url.hostname)) {
			return urlText;
		}

		if (SEARCH_PATH_PATTERN.test(url.pathname)) {
			const cleanUrl = createGoofishUrl('/search');
			const query = url.searchParams.get('q');
			if (query) {
				cleanUrl.searchParams.set('q', query);
			}
			return cleanUrl.href;
		}

		if (ITEM_PATH_PATTERN.test(url.pathname)) {
			const cleanUrl = createGoofishUrl('/item');
			const itemId = url.searchParams.get('id');
			const categoryId = url.searchParams.get('categoryId');
			if (isValidId(itemId)) {
				cleanUrl.searchParams.set('id', itemId);
			}
			if (isValidId(categoryId)) {
				cleanUrl.searchParams.set('categoryId', categoryId);
			}
			return cleanUrl.href;
		}

		if (CHAT_PATH_PATTERN.test(url.pathname)) {
			const cleanUrl = createGoofishUrl('/im');
			const itemId = url.searchParams.get('itemId');
			const peerUserId = url.searchParams.get('peerUserId');
			if (isValidId(itemId)) {
				cleanUrl.searchParams.set('itemId', itemId);
			}
			if (isValidId(peerUserId)) {
				cleanUrl.searchParams.set('peerUserId', peerUserId);
			}
			return cleanUrl.href;
		}

		if (PERSONAL_PATH_PATTERN.test(url.pathname)) {
			const cleanUrl = createGoofishUrl('/personal');
			const userId = url.searchParams.get('userId');
			if (isValidId(userId)) {
				cleanUrl.searchParams.set('userId', userId);
			}
			return cleanUrl.href;
		}

		return urlText;
	}

	function isItemPage(urlText) {
		try {
			const url = new URL(urlText, window.location.origin);
			return GOOFISH_HOST_PATTERN.test(url.hostname)
				&& ITEM_PATH_PATTERN.test(url.pathname)
				&& isValidId(url.searchParams.get('id'));
		} catch {
			return false;
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

	function removeSurveyPopups(root = document) {
		if (root instanceof Element && root.matches(SURVEY_SELECTOR)) {
			root.remove();
			return;
		}

		if (typeof root.querySelectorAll !== 'function') {
			return;
		}

		root.querySelectorAll(SURVEY_SELECTOR).forEach(element => element.remove());
	}

	function getClickedLink(event) {
		const target = event.target;
		const element = target instanceof Element ? target : target?.parentElement;
		return element?.closest('a[href]') || null;
	}

	function normalizeEventLink(event) {
		const link = getClickedLink(event);
		if (link instanceof HTMLAnchorElement) {
			normalizeLink(link);
		}
	}

	function isChatUrl(urlText) {
		try {
			const url = new URL(urlText, window.location.origin);
			return GOOFISH_HOST_PATTERN.test(url.hostname)
				&& CHAT_PATH_PATTERN.test(url.pathname)
				&& isValidId(url.searchParams.get('itemId'))
				&& isValidId(url.searchParams.get('peerUserId'));
		} catch {
			return false;
		}
	}

	function openChat(event) {
		if (!event.isTrusted || event.defaultPrevented) {
			return;
		}

		const link = getClickedLink(event);
		if (!(link instanceof HTMLAnchorElement) || !isChatUrl(link.href)) {
			return;
		}

		normalizeLink(link);
		event.preventDefault();
		event.stopImmediatePropagation();
		const chatWindow = window.open(link.href, '_blank');
		if (chatWindow) {
			chatWindow.opener = null;
			return;
		}

		window.location.assign(link.href);
	}

	function getItemTitle() {
		const title = document.title.replace(/\s*[_-]\s*闲鱼.*$/u, '').trim();
		return title && title !== '闲鱼' ? title : '闲鱼商品';
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
		const cleanUrl = getCleanUrl(window.location.href);
		const shareText = `${getItemTitle()}\n${cleanUrl}`;
		copyToClipboard(shareText)
			.then(() => setShareButtonState('copied'))
			.catch(() => setShareButtonState('failed'))
			.finally(() => {
				window.clearTimeout(resetShareButtonTimer);
				resetShareButtonTimer = window.setTimeout(() => setShareButtonState('default'), 1600);
			});
	}

	function findSidebarItemsRoot() {
		const container = document.querySelector('[data-spm="sidebar"] [class*="sidebar-item-container"]');
		if (!container) {
			return null;
		}

		return Array.from(container.children).find(element => element.textContent?.includes('商品码')) || null;
	}

	function installShareButton() {
		if (!isItemPage(window.location.href) || document.getElementById(SHARE_BUTTON_ID)) {
			return;
		}

		const sidebarItemsRoot = findSidebarItemsRoot();
		if (!sidebarItemsRoot) {
			return;
		}

		const button = document.createElement('button');
		button.id = SHARE_BUTTON_ID;
		button.type = 'button';
		button.innerHTML = '<span class="goofish-greener-share-icon"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M14 5l5 5-5 5M19 10H9a4 4 0 0 0-4 4v5"/></svg></span><span class="goofish-greener-share-text">分享</span>';
		button.addEventListener('click', copyItemShareLink);
		const itemCodeEntry = Array.from(sidebarItemsRoot.children).find(element => element.textContent?.includes('商品码'));
		if (itemCodeEntry) {
			itemCodeEntry.insertAdjacentElement('afterend', button);
		} else {
			sidebarItemsRoot.appendChild(button);
		}
		setShareButtonState('default');
	}

	function scheduleShareButtonInstall() {
		if (shareButtonTimer) {
			return;
		}

		shareButtonTimer = window.setTimeout(() => {
			shareButtonTimer = null;
			installShareButton();
		}, 80);
	}

	function injectStyle() {
		if (document.getElementById(STYLE_ID)) {
			return;
		}

		const style = document.createElement('style');
		style.id = STYLE_ID;
		style.textContent = `
			${SURVEY_SELECTOR} {
				display: none !important;
			}

			#${SHARE_BUTTON_ID} {
				align-items: center;
				appearance: none;
				background: transparent;
				border: 0;
				box-sizing: border-box;
				color: #1f1f1f;
				cursor: pointer;
				display: flex;
				flex-wrap: wrap;
				height: 72px;
				justify-content: center;
				padding: 0;
				position: relative;
				width: 58px;
			}

			#${SHARE_BUTTON_ID}::before {
				border-top: 1px solid #e8e8e8;
				content: '';
				position: absolute;
				top: 0;
				width: 34px;
			}

			#${SHARE_BUTTON_ID} .goofish-greener-share-icon {
				align-items: center;
				display: flex;
				height: 26px;
				justify-content: center;
				margin-top: 14px;
				width: 26px;
			}

			#${SHARE_BUTTON_ID} svg {
				height: 24px;
				fill: none;
				stroke: currentColor;
				stroke-linecap: round;
				stroke-linejoin: round;
				stroke-width: 1.8;
				width: 24px;
			}

			#${SHARE_BUTTON_ID} .goofish-greener-share-text {
				align-items: center;
				display: flex;
				font-size: 12px;
				font-weight: 500;
				height: 16px;
				justify-content: center;
				margin-bottom: 13px;
				margin-top: 4px;
				width: 48px;
			}

			#${SHARE_BUTTON_ID}:hover {
				color: #f58300;
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
				transform: translate(-4px, -50%);
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
				color: #32833b;
			}

			#${SHARE_BUTTON_ID}[data-state="failed"] {
				color: #c93b3b;
			}
		`;
		document.head.appendChild(style);
	}

	function startObserver() {
		if (!document.body || observer) {
			return;
		}

		observer = new MutationObserver(mutations => {
			if (!mutations.some(mutation => mutation.addedNodes.length > 0)) {
				return;
			}

			mutations.forEach(mutation => mutation.addedNodes.forEach(node => {
				normalizeLinks(node);
				removeSurveyPopups(node);
			}));
			scheduleShareButtonInstall();
		});
		observer.observe(document.body, {
			childList: true,
			subtree: true
		});
	}

	function installEarlyCleaners() {
		normalizeAddressBar();
		patchHistoryMethod('pushState');
		patchHistoryMethod('replaceState');
		window.addEventListener('popstate', scheduleAddressBarNormalize);
		['pointerdown', 'mousedown', 'click'].forEach(eventName => {
			document.addEventListener(eventName, normalizeEventLink, true);
		});
		document.addEventListener('click', openChat, true);
	}

	function initializePage() {
		injectStyle();
		normalizeLinks();
		removeSurveyPopups();
		installShareButton();
		startObserver();
	}

	installEarlyCleaners();

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', initializePage);
	} else {
		initializePage();
	}
})();

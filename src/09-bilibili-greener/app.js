// ==UserScript==
// @name         Bilibili Greener
// @namespace    http://tampermonkey.net/
// @version      0.1.0
// @description  Clean Bilibili video URLs and copied share links
// @author       wkyuu
// @match        https://bilibili.com/*
// @match        https://www.bilibili.com/*
// @match        https://m.bilibili.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=bilibili.com
// @grant        none
// ==/UserScript==

(function () {
	'use strict';

	const VIDEO_URL_PATTERN = /https?:\/\/(?:www\.|m\.)?bilibili\.com\/video\/(?:BV[a-zA-Z0-9]+|av\d+)\/?(?:\?[^\s【】「」『』（）()<>]*)?(?:#[^\s【】「」『』（）()<>]*)?/gi;
	const VIDEO_PATH_PATTERN = /^\/video\/((?:BV[a-zA-Z0-9]+)|(?:av\d+))\/?/i;
	let normalizeTimer = null;

	function getCleanVideoUrl(urlText) {
		let url;
		try {
			url = new URL(urlText, window.location.origin);
		} catch {
			return urlText;
		}

		if (!/(^|\.)bilibili\.com$/i.test(url.hostname)) {
			return urlText;
		}

		const match = url.pathname.match(VIDEO_PATH_PATTERN);
		if (!match) {
			return urlText;
		}

		return `${url.origin}/video/${match[1]}/`;
	}

	function cleanBilibiliText(text) {
		return text.replace(VIDEO_URL_PATTERN, matchedUrl => getCleanVideoUrl(matchedUrl));
	}

	function normalizeAddressBar() {
		const cleanUrl = getCleanVideoUrl(window.location.href);
		if (cleanUrl !== window.location.href) {
			window.history.replaceState(window.history.state, document.title, cleanUrl);
		}
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

	function installClipboardWriteTextCleaner() {
		if (!navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') {
			return;
		}

		const originalWriteText = navigator.clipboard.writeText.bind(navigator.clipboard);
		const writeCleanText = text => originalWriteText(cleanBilibiliText(String(text)));

		try {
			Object.defineProperty(navigator.clipboard, 'writeText', {
				configurable: true,
				value: writeCleanText
			});
		} catch {
			try {
				navigator.clipboard.writeText = writeCleanText;
			} catch {}
		}
	}

	function installCopyEventCleaner() {
		document.addEventListener('copy', event => {
			const selection = window.getSelection();
			const selectedText = selection ? selection.toString() : '';
			if (!selectedText || !event.clipboardData) {
				return;
			}

			const cleanText = cleanBilibiliText(selectedText);
			if (cleanText === selectedText) {
				return;
			}

			event.clipboardData.setData('text/plain', cleanText);
			event.preventDefault();
			event.stopImmediatePropagation();
		}, true);
	}

	function initialize() {
		installAddressBarCleaner();
		installClipboardWriteTextCleaner();
		installCopyEventCleaner();
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', initialize);
	} else {
		initialize();
	}
})();

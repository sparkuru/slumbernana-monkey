// ==UserScript==
// @name         GitHub Greener
// @namespace    http://tampermonkey.net/
// @version      0.1.0
// @description  Hide low-value GitHub dashboard feed items and noisy prompts
// @author       wkyuu
// @match        https://github.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=github.com
// @grant        none
// ==/UserScript==

(function () {
	'use strict';

	const STYLE_ID = 'github-greener-style';
	const BLOCKED_ACCOUNTS = new Set([
		'cheezcharmer',
		'Dimples1337',
		'zaohmeing',
		'zhaohmng-outlook-com',
		'codin-stuffs',
		'zpc1314521',
		'b0LBwZ7r5HOeh6CBMuQIhVu3-s-random-fork',
		'panbinibn',
		'pxvr-official',
		'cirosantilli'
	].map(account => account.toLowerCase()));
	const FEED_CARD_SELECTORS = [
		'[data-testid="dashboard-feed-card"]',
		'[data-testid="news-feed-card"]',
		'article',
		'div.Box-sc-62in7e-0'
	];
	const NOISY_SELECTORS = [
		'[data-testid="dashboard-changelog"]',
		'[data-testid="dashboard-feed-filter"]',
		'.js-notice',
		'.js-notice-dismiss'
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
			[data-greener-hidden="true"],
			[data-testid="dashboard-changelog"],
			[data-testid="dashboard-feed-filter"] {
				display: none !important;
			}
		`;
		document.head.appendChild(style);
	}

	function getAccountFromHref(href) {
		try {
			const url = new URL(href, window.location.origin);
			if (url.hostname !== 'github.com') {
				return null;
			}

			const [account] = url.pathname.split('/').filter(Boolean);
			return account ? account.toLowerCase() : null;
		} catch (_) {
			return null;
		}
	}

	function cardContainsBlockedAccount(card) {
		return Array.from(card.querySelectorAll('a[href^="/"], a[href^="https://github.com/"]')).some(link => {
			const account = getAccountFromHref(link.getAttribute('href'));
			return account && BLOCKED_ACCOUNTS.has(account);
		});
	}

	function hideBlockedFeedCards() {
		FEED_CARD_SELECTORS.forEach(selector => {
			document.querySelectorAll(selector).forEach(card => {
				if (cardContainsBlockedAccount(card)) {
					card.dataset.greenerHidden = 'true';
				}
			});
		});
	}

	function hideNoisyElements() {
		NOISY_SELECTORS.forEach(selector => {
			document.querySelectorAll(selector).forEach(element => {
				element.dataset.greenerHidden = 'true';
			});
		});
	}

	function cleanup() {
		hideBlockedFeedCards();
		hideNoisyElements();
	}

	function scheduleCleanup() {
		if (cleanupTimer) {
			return;
		}

		cleanupTimer = setTimeout(() => {
			cleanupTimer = null;
			cleanup();
		}, 100);
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

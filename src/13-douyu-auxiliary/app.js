// ==UserScript==
// @name         Douyu Auxiliary
// @namespace    http://tampermonkey.net/
// @version      0.1.0
// @description  douyu 页面辅助脚本
// @author       wkyuu
// @match        https://douyu.com/*
// @match        https://www.douyu.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=douyu.com
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
	'use strict';

	const STYLE_ID = 'douyu-auxiliary-style';
	const REMOVAL_SELECTORS = [
		'.interactive__8Ht4-',
		'.activeContainer__8Qxzw',
		'.snapbar__TUgkE'
	];
	const REMOVAL_SELECTOR = REMOVAL_SELECTORS.join(',');

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
		`;
		document.head.appendChild(style);
	}

	function removeElements(root = document) {
		if (root instanceof Element && root.matches(REMOVAL_SELECTOR)) {
			root.remove();
			return;
		}

		if (typeof root.querySelectorAll !== 'function') {
			return;
		}

		root.querySelectorAll(REMOVAL_SELECTOR).forEach(element => element.remove());
	}

	function initialize() {
		injectStyle();
		removeElements();

		const observer = new MutationObserver(mutations => {
			mutations.forEach(mutation => {
				if (mutation.type === 'attributes') {
					removeElements(mutation.target);
				} else {
					mutation.addedNodes.forEach(removeElements);
				}
			});
		});
		observer.observe(document.body, {
			attributes: true,
			attributeFilter: ['class'],
			childList: true,
			subtree: true
		});
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', initialize, { once: true });
	} else {
		initialize();
	}
})();

// ==UserScript==
// @name         Zhihu Optimization
// @namespace    http://tampermonkey.net/
// @version      0.1.1b
// @description  Zhihu Optimization
// @author       wkyuu
// @match        https://zhihu.com/*
// @match        https://www.zhihu.com/*
// @grant        none
// ==/UserScript==

(function () {
	'use strict';

	function removeElementByTestId(testId) {
		const element = document.querySelector(`[data-testid="${testId}"]`);
		if (element) {
			const parentContainer = element.closest('div[class*="css-"]');
			if (parentContainer) {
				parentContainer.remove();
			} else {
				element.remove();
			}
		}
	}

	function removeElementByAriaLabel(ariaLabel) {
		const element = document.querySelector(`[aria-label="${ariaLabel}"]`);
		if (element) {
			const parentDiv = element.closest('div');
			if (parentDiv) {
				parentDiv.remove();
			}
		}
	}

	function injectCustomCSS() {
		const style = document.createElement('style');
		style.textContent = `
			.Search-container {
				width: 100% !important;
				justify-content: center !important;
				max-width: none !important;
			}
			.SearchMain {
				width: 80% !important;
			}
		`;
		document.head.appendChild(style);
	}

	function modifySearchContainer() {
		const searchContainer = document.querySelector('.Search-container');
		if (searchContainer) {
			searchContainer.style.setProperty('width', '100%', 'important');
			searchContainer.style.setProperty('justify-content', 'center', 'important');
			searchContainer.style.setProperty('max-width', 'none', 'important');
		}
	}

	function modifySearchMain() {
		const searchMain = document.querySelector('#SearchMain');
		if (searchMain) {
			searchMain.style.setProperty('width', '80%', 'important');
		}
	}

	function removeElementByHref(href) {
		const element = document.querySelector(`a[href="${href}"]`);
		if (element) {
			element.remove();
		}
	}

	function removeElementByClass(className) {
		const element = document.querySelector(`.${className}`);
		if (element) {
			element.remove();
		}
	}

	function optimizeZhihu() {
		removeElementByTestId('Block:zhida_message_block');
		removeElementByAriaLabel('边栏锚点');
		modifySearchContainer();
		modifySearchMain();
		removeElementByHref('https://zhida.zhihu.com/');
		removeElementByClass('SearchBar-askContainer');
		removeElementByHref('https://www.zhihu.com/consult');
		removeElementByHref('https://www.zhihu.com/education/learning');
	}

	function initializeOptimization() {
		injectCustomCSS();
		optimizeZhihu();
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', initializeOptimization);
	} else {
		initializeOptimization();
	}

	const observer = new MutationObserver(function (mutations) {
		let shouldOptimize = false;
		mutations.forEach(function (mutation) {
			if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
				for (let node of mutation.addedNodes) {
					if (node.nodeType === Node.ELEMENT_NODE) {
						if (node.querySelector && (
							node.querySelector('[data-testid="Block:zhida_message_block"]') ||
							node.querySelector('[aria-label="边栏锚点"]') ||
							node.querySelector('.Search-container') ||
							node.querySelector('#SearchMain') ||
							node.querySelector('a[href="https://zhida.zhihu.com/"]') ||
							node.querySelector('.SearchBar-askContainer') ||
							node.querySelector('a[href="https://www.zhihu.com/consult"]') ||
							node.querySelector('a[href="https://www.zhihu.com/education/learning"]')
						)) {
							shouldOptimize = true;
							break;
						}
					}
				}
			}
		});

		if (shouldOptimize) {
			setTimeout(optimizeZhihu, 100);
		}
	});

	observer.observe(document.body, {
		childList: true,
		subtree: true
	});

})();
// ==UserScript==
// @name         Zhihu Optimization
// @namespace    http://tampermonkey.net/
// @version      0.2.1b
// @description  去除掉知乎的一些无意义内容，优化界面显示效果
// @author       wkyuu
// @match        https://zhihu.com/*
// @match        https://www.zhihu.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=zhihu.com
// @grant        none
// ==/UserScript==

(function () {
	'use strict';

	const header_width = '80vw';
	const container_width = '100vw';
	const content_column_width = '80vw';

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
			.AppHeader > div:first-child {
				width: ${header_width} !important;
				max-width: none !important;
				margin: 0 auto !important;
			}
			.Search-container {
				width: ${container_width} !important;
				justify-content: center !important;
				max-width: none !important;
			}
			.SearchMain {
				width: ${content_column_width} !important;
			}
			.Topstory-container {
				width: ${container_width} !important;
				justify-content: center !important;
				max-width: none !important;
			}
			.Topstory-mainColumn {
				width: ${content_column_width} !important;
			}
			.Question-main {
				width: ${container_width} !important;
				justify-content: center !important;
				max-width: none !important;
			}
			.Question-mainColumn {
				width: ${content_column_width} !important;
			}
		`;
		document.head.appendChild(style);
	}

	function modifyAppHeader() {
		const appHeader = document.querySelector('.AppHeader');
		if (appHeader) {
			const firstDiv = appHeader.querySelector('div:first-child');
			if (firstDiv) {
				firstDiv.style.setProperty('width', header_width, 'important');
				firstDiv.style.setProperty('max-width', 'none', 'important');
				firstDiv.style.setProperty('margin', '0 auto', 'important');
			}
		}
	}

	function modifySearchContainer() {
		const searchContainer = document.querySelector('.Search-container');
		if (searchContainer) {
			searchContainer.style.setProperty('width', container_width, 'important');
			searchContainer.style.setProperty('justify-content', 'center', 'important');
			searchContainer.style.setProperty('max-width', 'none', 'important');
		}
	}

	function modifySearchMain() {
		const searchMain = document.querySelector('#SearchMain');
		if (searchMain) {
			searchMain.style.setProperty('width', content_column_width, 'important');
		}
	}

	function removeWriteAreaCard() {
		const writeAreaCard = document.querySelector('.WriteArea.Card');
		if (writeAreaCard) {
			writeAreaCard.remove();
		}
	}

	function modifyTopstoryContainer() {
		const topstoryContainer = document.querySelector('.Topstory-container');
		if (topstoryContainer) {
			topstoryContainer.style.setProperty('width', container_width, 'important');
			topstoryContainer.style.setProperty('justify-content', 'center', 'important');
			topstoryContainer.style.setProperty('max-width', 'none', 'important');
		}
	}

	function modifyTopstoryMainColumnCard() {
		const topstoryMainColumnCard = document.querySelector('.Topstory-mainColumn');
		if (topstoryMainColumnCard) {
			topstoryMainColumnCard.style.setProperty('width', content_column_width, 'important');
		}
	}

	function modifyQuestionMain() {
		const questionMain = document.querySelector('.Question-main');
		if (questionMain) {
			questionMain.style.setProperty('width', container_width, 'important');
			questionMain.style.setProperty('justify-content', 'center', 'important');
			questionMain.style.setProperty('max-width', 'none', 'important');
		}
	}

	function modifyQuestionMainColumn() {
		const questionMainColumn = document.querySelector('.Question-mainColumn');
		if (questionMainColumn) {
			questionMainColumn.style.setProperty('width', content_column_width, 'important');
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
		removeWriteAreaCard();
		modifyTopstoryContainer();
		modifyTopstoryMainColumnCard();
		modifyQuestionMain();
		modifyQuestionMainColumn();
		modifyAppHeader();
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
							node.querySelector('a[href="https://www.zhihu.com/education/learning"]') ||
							node.querySelector('.WriteArea.Card') ||
							node.querySelector('.Topstory-container') ||
							node.querySelector('.Topstory-mainColumn') ||
							node.querySelector('.AppHeader')
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
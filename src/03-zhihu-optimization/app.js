// ==UserScript==
// @name         Zhihu Optimization
// @namespace    http://tampermonkey.net/
// @version      0.2.1b
// @description  Remove unnecessary content and optimize Zhihu interface display
// @author       wkyuu
// @match        https://zhihu.com/*
// @match        https://www.zhihu.com/*
// @match        https://zhuanlan.zhihu.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=zhihu.com
// @grant        none
// ==/UserScript==

(function () {
	'use strict';

	const HEADER_WIDTH = '80vw';
	const CONTAINER_WIDTH = '100vw';
	const CONTENT_COLUMN_WIDTH = '80vw';

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
				width: ${HEADER_WIDTH} !important;
				max-width: none !important;
				margin: 0 auto !important;
			}
			.Search-container {
				width: ${CONTAINER_WIDTH} !important;
				justify-content: center !important;
				max-width: none !important;
			}
			.SearchMain {
				width: ${CONTENT_COLUMN_WIDTH} !important;
			}
			.Topstory-container {
				width: ${CONTAINER_WIDTH} !important;
				justify-content: center !important;
				max-width: none !important;
			}
			.Topstory-mainColumn {
				width: ${CONTENT_COLUMN_WIDTH} !important;
			}
			.Container {
				max-width: none !important;
			}
			.Question-main {
				width: ${CONTAINER_WIDTH} !important;
				justify-content: center !important;
				max-width: none !important;
			}
			.Question-mainColumn {
				width: ${CONTENT_COLUMN_WIDTH} !important;
			}
			.Post-Row-Content {
				width: ${CONTAINER_WIDTH} !important;
				justify-content: center !important;
			}
			.Post-Row-Content-left {
				width: ${CONTENT_COLUMN_WIDTH} !important;
				justify-content: center !important;
			}
			.Post-Author {
				justify-content: space-between !important;
			}
			.Post-Row-Content-left-article > div[class*="css-"] {
				width: 100% !important;
				max-width: none !important;
			}
		`;
		document.head.appendChild(style);
	}

	function modifyAppHeader() {
		const appHeader = document.querySelector('.AppHeader');
		if (appHeader) {
			const firstDiv = appHeader.querySelector('div:first-child');
			if (firstDiv) {
				firstDiv.style.setProperty('width', HEADER_WIDTH, 'important');
				firstDiv.style.setProperty('max-width', 'none', 'important');
				firstDiv.style.setProperty('margin', '0 auto', 'important');
			}
		}
	}

	function modifySearchContainer() {
		const searchContainer = document.querySelector('.Search-container');
		if (searchContainer) {
			searchContainer.style.setProperty('width', CONTAINER_WIDTH, 'important');
			searchContainer.style.setProperty('justify-content', 'center', 'important');
			searchContainer.style.setProperty('max-width', 'none', 'important');
		}
	}

	function modifySearchMain() {
		const searchMain = document.querySelector('#SearchMain');
		if (searchMain) {
			searchMain.style.setProperty('width', CONTENT_COLUMN_WIDTH, 'important');
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
			topstoryContainer.style.setProperty('width', CONTAINER_WIDTH, 'important');
			topstoryContainer.style.setProperty('justify-content', 'center', 'important');
			topstoryContainer.style.setProperty('max-width', 'none', 'important');
		}
	}

	function modifyTopstoryMainColumnCard() {
		const topstoryMainColumnCard = document.querySelector('.Topstory-mainColumn');
		if (topstoryMainColumnCard) {
			topstoryMainColumnCard.style.setProperty('width', CONTENT_COLUMN_WIDTH, 'important');
		}
	}

	function modifyContainer() {
		const container = document.querySelector('.Container');
		if (container) {
			container.style.setProperty('max-width', 'none', 'important');
		}
	}

	function modifyQuestionMain() {
		const questionMain = document.querySelector('.Question-main');
		if (questionMain) {
			questionMain.style.setProperty('width', CONTAINER_WIDTH, 'important');
			questionMain.style.setProperty('justify-content', 'center', 'important');
			questionMain.style.setProperty('max-width', 'none', 'important');
		}
	}

	function modifyQuestionMainColumn() {
		const questionMainColumn = document.querySelector('.Question-mainColumn');
		if (questionMainColumn) {
			questionMainColumn.style.setProperty('width', CONTENT_COLUMN_WIDTH, 'important');
		}
	}

	function modifyDynamicCssElements() {
		const dynamicElements = document.querySelectorAll('.Post-Row-Content-left-article > div[class*="css-"]');
		dynamicElements.forEach(element => {
			element.style.setProperty('width', '100%', 'important');
			element.style.setProperty('max-width', 'none', 'important');
		});
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
		removeElementByClass('Post-Sub.Post-NormalSub');
		removeElementByHref('https://www.zhihu.com/consult');
		removeElementByHref('https://www.zhihu.com/education/learning');
		removeWriteAreaCard();
		modifyTopstoryContainer();
		modifyTopstoryMainColumnCard();
		modifyContainer();
		modifyQuestionMain();
		modifyQuestionMainColumn();
		modifyAppHeader();
		modifyDynamicCssElements();
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
							node.querySelector('.AppHeader') ||
							node.querySelector('.Post-Row-Content-left-article > div[class*="css-"]')
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
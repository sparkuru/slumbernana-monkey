// ==UserScript==
// @name         Zhihu Greener
// @namespace    http://tampermonkey.net/
// @version      0.2.8
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
	const STYLE_ID = 'zhihu-greener-style';
	const ANSWER_ITEM_SELECTOR = '.ContentItem.AnswerItem, .AnswerItem[itemprop="answer"]';
	const COPY_BUTTON_SELECTOR = '[data-zhihu-greener-copy-answer]';
	const INLINE_ZHIDA_LINK_SELECTOR = [
		'.RichContent a[href*="//zhida.zhihu.com"]',
		'.RichText a[href*="//zhida.zhihu.com"]',
		'[itemprop="text"] a[href*="//zhida.zhihu.com"]'
	].join(',');
	const ZHIDA_MESSAGE_SELECTORS = [
		'[data-testid="Block:zhida_message_block"]',
		'[data-testid="Button:zhida_message_block_jump_entrance_top"]'
	];
	const REMOVAL_RULES = [
		{ selector: '.AppHeader-TabsLink[href*="//zhida.zhihu.com"]' },
		{ selector: '.AppHeader a[href="https://zhida.zhihu.com/"]' },
		{ selector: '[aria-label="边栏锚点"]', closest: 'div' },
		{ selector: 'a[href="https://www.zhihu.com/consult"]' },
		{ selector: 'a[href*="/consult"]' },
		{ selector: 'a[href="https://www.zhihu.com/education/learning"]' },
		{ selector: 'a[href*="/education/learning"]' },
		{ selector: '.SearchBar-askContainer' },
		{ selector: '.WriteArea.Card' },
		{ selector: '.SearchSideBar' },
		{ selector: '.Question-sideColumn' },
		{ selector: '.Topstory-sideBar' },
		{ selector: '.GlobalSideBar' },
		{ selector: '.Pc-Business-Card-PcTopFeedBanner' },
		{ selector: '.Pc-Business-Card-PcRightBanner' },
		{ selector: '.Pc-Business-Card-PcFeedAd' },
		{ selector: '.TopstoryItem--advertCard' },
		{ selector: '.Pc-feedAd-new', closest: '.TopstoryItem' },
		{ selector: '.Pc-card' },
		{ selector: '.Footer' },
		{ selector: '.Question-sideColumnFooter' },
		{ selector: '.Recommendations-Main' },
		{ selector: '.AppHeader-notifications' },
		{ selector: '.AppHeader-messages' },
		{ selector: '.AppHeader-userInfo' },
		{ selector: '.CornerButtons' },
		{ selector: '.OpenInAppButton' },
		{ selector: '.DownloadGuide' },
		{ selector: '.MobileModal' },
		{ selector: '[data-tooltip="解释这篇内容"]' },
		{ selector: '.ZDI--FourPointedStar16' }
	];
	const WIDTH_SELECTORS = [
		'.AppHeader',
		'.Search-container',
		'#SearchMain',
		'.SearchMain',
		'.Topstory-container',
		'.Topstory-mainColumn',
		'.Container',
		'.Question-main',
		'.Question-mainColumn',
		'.Post-Row-Content-left-article > div[class*="css-"]'
	];
	const WATCH_SELECTORS = [...new Set([
		...REMOVAL_RULES.map(rule => rule.selector),
		ANSWER_ITEM_SELECTOR,
		INLINE_ZHIDA_LINK_SELECTOR,
		...ZHIDA_MESSAGE_SELECTORS,
		'[data-testid="Button:zhida_message_corner_mark_btn"]',
		...WIDTH_SELECTORS
	])];
	let optimizeTimer = null;
	let observer = null;
	let copyHandlerInstalled = false;

	function removeElementsBySelector(selector, closestSelector) {
		document.querySelectorAll(selector).forEach(element => {
			const target = closestSelector ? element.closest(closestSelector) : element;
			if (target) {
				target.remove();
			}
		});
	}

	function unwrapElementsBySelector(selector) {
		document.querySelectorAll(selector).forEach(element => {
			element.replaceWith(...element.childNodes);
		});
	}

	function removeZhidaMessageBlocks() {
		document.querySelectorAll(ZHIDA_MESSAGE_SELECTORS.join(',')).forEach(element => {
			const target = element.closest('.css-shliqe') ||
				element.closest('[data-testid="Block:zhida_message_block"]') ||
				element.closest('div[class*="css-"]');
			if (target) {
				target.remove();
			}
		});

		document.querySelectorAll('[data-testid="Button:zhida_message_corner_mark_btn"]').forEach(element => {
			const target = element.closest('.css-vurnku') || element.closest('.Popover') || element;
			target.remove();
		});
	}

	function removeSignFlowModals() {
		document.querySelectorAll('.Modal-wrapper, .Modal-enter-done').forEach(modal => {
			if (modal.querySelector('.SignFlow, .Login-content, .SignFlow-account, .Login-socialButtonGroup')) {
				modal.remove();
			}
		});
		document.documentElement.style.removeProperty('overflow');
		document.body.style.removeProperty('overflow');
	}

	function isEditableElement(element) {
		return element && (
			element.isContentEditable ||
			element.matches('input, textarea, [contenteditable="true"]')
		);
	}

	function removeCopyWatermark() {
		if (copyHandlerInstalled) {
			return;
		}

		copyHandlerInstalled = true;
		document.addEventListener('copy', event => {
			if (isEditableElement(document.activeElement)) {
				return;
			}

			const selectedText = window.getSelection().toString();
			if (!selectedText.trim()) {
				return;
			}

			event.clipboardData.setData('text/plain', selectedText);
			event.preventDefault();
			event.stopImmediatePropagation();
		}, true);
	}

	function injectCustomCSS() {
		if (document.getElementById(STYLE_ID)) {
			return;
		}

		const style = document.createElement('style');
		style.id = STYLE_ID;
		style.textContent = `
			body {
				overflow-x: hidden !important;
			}
			.AppHeader > div:first-child {
				width: ${HEADER_WIDTH} !important;
				max-width: none !important;
				margin: 0 auto !important;
			}
			.AppHeader-TabsLink[href*="//zhida.zhihu.com"],
			.AppHeader-TabsLink[href*="/consult"],
			.AppHeader-TabsLink[href*="/education/learning"],
			.AppHeader-notifications,
			.AppHeader-messages,
			.AppHeader-userInfo,
			.SearchBar-askContainer {
				display: none !important;
			}
			.ZhihuGreener-copyButton {
				margin-left: 20px !important;
			}
			.Search-container {
				width: ${CONTAINER_WIDTH} !important;
				justify-content: center !important;
				max-width: none !important;
			}
			#SearchMain,
			.SearchMain {
				width: ${CONTENT_COLUMN_WIDTH} !important;
				max-width: none !important;
			}
			.Topstory-container {
				width: ${CONTAINER_WIDTH} !important;
				justify-content: center !important;
				max-width: none !important;
			}
			.Topstory-mainColumn {
				width: ${CONTENT_COLUMN_WIDTH} !important;
				max-width: none !important;
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
				max-width: none !important;
			}
			.Post-Row-Content {
				width: ${CONTAINER_WIDTH} !important;
				justify-content: center !important;
			}
			.Post-Row-Content-left {
				width: ${CONTENT_COLUMN_WIDTH} !important;
				justify-content: center !important;
				max-width: none !important;
			}
			.Post-Author {
				justify-content: space-between !important;
			}
			.Post-Row-Content-left-article > div[class*="css-"] {
				width: 100% !important;
				max-width: none !important;
			}
			.SearchSideBar,
			.Question-sideColumn,
			.Topstory-sideBar,
			.GlobalSideBar,
			.Footer,
			.Question-sideColumnFooter,
			.Recommendations-Main,
			.Pc-Business-Card-PcTopFeedBanner,
			.Pc-Business-Card-PcRightBanner,
			.Pc-Business-Card-PcFeedAd,
			.TopstoryItem--advertCard,
			.Pc-feedAd-new,
			.Pc-card,
			.CornerButtons,
			.OpenInAppButton,
			.DownloadGuide,
			.MobileModal,
			[data-testid="Block:zhida_message_block"],
			.css-shliqe:has([data-testid^="Button:zhida_message_"]),
			[data-testid="Button:zhida_message_block_jump_entrance_top"],
			[data-testid="Button:zhida_message_corner_mark_btn"],
			[data-tooltip="解释这篇内容"],
			.ZDI--FourPointedStar16,
			[aria-label="边栏锚点"] {
				display: none !important;
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
		const searchMain = document.querySelector('#SearchMain, .SearchMain');
		if (searchMain) {
			searchMain.style.setProperty('width', CONTENT_COLUMN_WIDTH, 'important');
			searchMain.style.setProperty('max-width', 'none', 'important');
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
			topstoryMainColumnCard.style.setProperty('max-width', 'none', 'important');
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
			questionMainColumn.style.setProperty('max-width', 'none', 'important');
		}
	}

	function modifyDynamicCssElements() {
		const dynamicElements = document.querySelectorAll('.Post-Row-Content-left-article > div[class*="css-"]');
		dynamicElements.forEach(element => {
			element.style.setProperty('width', '100%', 'important');
			element.style.setProperty('max-width', 'none', 'important');
		});
	}

	function getAnswerText(answerItem) {
		const content = answerItem.querySelector(
			'.RichText[itemprop="text"], [itemprop="text"].RichText, .RichContent-inner .RichText'
		);
		if (!content) {
			return '';
		}

		return (content.innerText || content.textContent || '')
			.replace(/[\u200B-\u200D\uFEFF]/g, '')
			.replace(/\r\n?/g, '\n')
			.replace(/[ \t]+\n/g, '\n')
			.trim();
	}

	function fallbackCopyText(text) {
		const textarea = document.createElement('textarea');
		textarea.value = text;
		textarea.setAttribute('readonly', '');
		textarea.style.position = 'fixed';
		textarea.style.top = '-10000px';
		document.body.appendChild(textarea);
		textarea.select();
		document.execCommand('copy');
		textarea.remove();
	}

	async function copyText(text) {
		if (navigator.clipboard && window.isSecureContext) {
			await navigator.clipboard.writeText(text);
			return;
		}

		fallbackCopyText(text);
	}

	function showCopyButtonStatus(button, text) {
		const originalText = button.dataset.originalText || button.textContent;
		button.dataset.originalText = originalText;
		button.textContent = text;
		window.setTimeout(() => {
			button.textContent = originalText;
			button.disabled = false;
		}, 1200);
	}

	async function copyAnswerText(event) {
		event.preventDefault();
		event.stopPropagation();

		const button = event.currentTarget;
		const answerItem = button.closest(ANSWER_ITEM_SELECTOR);
		const answerText = answerItem ? getAnswerText(answerItem) : '';
		if (!answerText) {
			showCopyButtonStatus(button, '无正文');
			return;
		}

		button.disabled = true;
		try {
			await copyText(answerText);
			showCopyButtonStatus(button, '已复制');
		} catch {
			showCopyButtonStatus(button, '复制失败');
		}
	}

	function createCopyButton() {
		const button = document.createElement('button');
		button.type = 'button';
		button.className = 'Button ContentItem-action Button--plain Button--withLabel ZhihuGreener-copyButton';
		button.dataset.zhihuGreenerCopyAnswer = 'true';
		button.textContent = '复制';
		button.addEventListener('click', copyAnswerText);
		return button;
	}

	function getAnswerActionBar(answerItem) {
		return answerItem.querySelector('.ContentItem-actions.RichContent-actions > .ContentItem-actions') ||
			answerItem.querySelector('.RichContent > .ContentItem-actions > .ContentItem-actions') ||
			answerItem.querySelector('.ContentItem-actions > .ContentItem-actions') ||
			answerItem.querySelector('.ContentItem-actions');
	}

	function addAnswerCopyButtons() {
		document.querySelectorAll(ANSWER_ITEM_SELECTOR).forEach(answerItem => {
			if (answerItem.querySelector(COPY_BUTTON_SELECTOR)) {
				return;
			}

			const actionBar = getAnswerActionBar(answerItem);
			if (actionBar && actionBar.tagName !== 'BUTTON') {
				actionBar.appendChild(createCopyButton());
			}
		});
	}

	function removeUnwantedElements() {
		unwrapElementsBySelector(INLINE_ZHIDA_LINK_SELECTOR);
		removeZhidaMessageBlocks();
		REMOVAL_RULES.forEach(rule => {
			removeElementsBySelector(rule.selector, rule.closest);
		});
	}

	function greenZhihu() {
		removeUnwantedElements();
		removeSignFlowModals();
		modifySearchContainer();
		modifySearchMain();
		modifyTopstoryContainer();
		modifyTopstoryMainColumnCard();
		modifyContainer();
		modifyQuestionMain();
		modifyQuestionMainColumn();
		modifyAppHeader();
		modifyDynamicCssElements();
		addAnswerCopyButtons();
	}

	function scheduleGreening() {
		if (optimizeTimer) {
			return;
		}

		optimizeTimer = setTimeout(() => {
			optimizeTimer = null;
			greenZhihu();
		}, 100);
	}

	function initializeGreener() {
		injectCustomCSS();
		removeCopyWatermark();
		greenZhihu();
		startObserver();
	}

	function nodeContainsWatchedSelector(node) {
		return WATCH_SELECTORS.some(selector => node.matches(selector) || node.querySelector(selector));
	}

	function startObserver() {
		if (!document.body || observer) {
			return;
		}

		observer = new MutationObserver(function (mutations) {
			let shouldOptimize = false;
			mutations.forEach(function (mutation) {
				if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
					for (let node of mutation.addedNodes) {
						if (node.nodeType === Node.ELEMENT_NODE && nodeContainsWatchedSelector(node)) {
							shouldOptimize = true;
							break;
						}
					}
				}
			});

			if (shouldOptimize) {
				scheduleGreening();
			}
		});

		observer.observe(document.body, {
			childList: true,
			subtree: true
		});
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', initializeGreener);
	} else {
		initializeGreener();
	}

})();

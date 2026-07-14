// ==UserScript==
// @name         Zhihu Greener
// @namespace    http://tampermonkey.net/
// @version      0.4.0
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
	const ARTICLE_IMAGE_WIDTH = '80%';
	const NAV_SETTINGS_ID = 'zhihu-greener-nav-settings';
	const NAV_SETTINGS_STORAGE_KEY = 'zhihu-greener-hidden-header-nav-items';
	const HEADER_NAV_ITEMS = [
		{ key: 'follow', label: '关注' },
		{ key: 'recommend', label: '推荐' },
		{ key: 'hot', label: '热榜' },
		{ key: 'column', label: '专栏' },
		{ key: 'ring', label: '圈子' },
		{ key: 'aiWorks', label: 'AI Works' },
		{ key: 'story', label: '故事' }
	];
	const POST_LAYOUT_VARIABLES = {
		'--app-max-width': CONTENT_COLUMN_WIDTH,
		'--app-width': CONTENT_COLUMN_WIDTH,
		'--container-width': CONTENT_COLUMN_WIDTH,
		'--container-main-column-width': CONTENT_COLUMN_WIDTH,
		'--right-sidebar-width': '0px'
	};
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
		{ selector: '.Post-Row-Content-right' },
		{ selector: '.Post-SideBar' },
		{ selector: '.Post-SideBarSticky' },
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
		'.Post-Row-Content',
		'.Post-Row-Content-left',
		'.Post-Row-Content-left-article',
		'.Post-Main.Post-NormalMain',
		'.Post-RichTextContainer',
		'.Post-content',
		'.AppHeader nav a',
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
	let hiddenHeaderNavItems = loadHiddenHeaderNavItems();

	function loadHiddenHeaderNavItems() {
		try {
			const storedItems = JSON.parse(window.localStorage.getItem(NAV_SETTINGS_STORAGE_KEY));
			return Array.isArray(storedItems) ? new Set(storedItems) : new Set();
		} catch {
			return new Set();
		}
	}

	function saveHiddenHeaderNavItems() {
		try {
			window.localStorage.setItem(NAV_SETTINGS_STORAGE_KEY, JSON.stringify([...hiddenHeaderNavItems]));
		} catch {
			// Ignore unavailable browser storage; the current-page setting still works.
		}
	}

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
			:root {
				--app-max-width: ${CONTENT_COLUMN_WIDTH} !important;
				--app-width: ${CONTENT_COLUMN_WIDTH} !important;
				--container-width: ${CONTENT_COLUMN_WIDTH} !important;
				--container-main-column-width: ${CONTENT_COLUMN_WIDTH} !important;
				--right-sidebar-width: 0px !important;
			}
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
			.ZhihuGreener-hiddenHeaderNav {
				display: none !important;
			}
			#${NAV_SETTINGS_ID} {
				position: fixed;
				right: 24px;
				bottom: 24px;
				z-index: 1000;
				font-size: 14px;
			}
			#${NAV_SETTINGS_ID} button {
				border: 0;
				border-radius: 6px;
				background: #1772f6;
				color: #fff;
				cursor: pointer;
				padding: 8px 12px;
			}
			#${NAV_SETTINGS_ID} .ZhihuGreener-navPanel {
				display: none;
				position: absolute;
				right: 0;
				bottom: 42px;
				width: 150px;
				padding: 12px;
				border-radius: 8px;
				background: #fff;
				box-shadow: 0 4px 18px rgba(0, 0, 0, 0.16);
			}
			#${NAV_SETTINGS_ID}.is-open .ZhihuGreener-navPanel {
				display: block;
			}
			#${NAV_SETTINGS_ID} .ZhihuGreener-navPanel label {
				display: flex;
				align-items: center;
				gap: 6px;
				padding: 4px 0;
				color: #373a40;
				cursor: pointer;
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
				width: ${CONTENT_COLUMN_WIDTH} !important;
				max-width: none !important;
				justify-content: center !important;
				margin: 0 auto !important;
			}
			.Post-Row-Content-left {
				width: 100% !important;
				max-width: none !important;
				margin: 0 auto !important;
				padding-right: 0 !important;
				box-sizing: border-box !important;
			}
			.Post-Row-Content-left-article,
			.Post-Main.Post-NormalMain,
			.Post-RichTextContainer {
				width: 100% !important;
				max-width: none !important;
				margin-left: auto !important;
				margin-right: auto !important;
			}
			.Post-content {
				width: 100% !important;
				min-width: 0 !important;
			}
			.Post-content > div:has(.Post-Main.Post-NormalMain) {
				width: ${CONTENT_COLUMN_WIDTH} !important;
				min-width: 0 !important;
				max-width: none !important;
				margin-left: auto !important;
				margin-right: auto !important;
			}
			.Post-content > div:has(> .Post-Main.Post-NormalMain),
			.Post-content > div:has(+ .Post-Main.Post-NormalMain),
			.Post-content > div:has(+ .Post-Main.Post-NormalMain) > div {
				width: 100% !important;
				min-width: 0 !important;
				max-width: none !important;
			}
			.Post-RichText figure {
				display: flex !important;
				justify-content: center !important;
			}
			.Post-RichText figure > img,
			.Post-RichText img.content_image,
			.Post-RichText img.origin_image {
				display: block !important;
				width: ${ARTICLE_IMAGE_WIDTH} !important;
				max-width: ${ARTICLE_IMAGE_WIDTH} !important;
				height: auto !important;
				margin-left: auto !important;
				margin-right: auto !important;
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
			.Post-Row-Content-right,
			.Post-SideBar,
			.Post-SideBarSticky,
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

	function applyHeaderNavVisibility() {
		document.querySelectorAll('.AppHeader nav a').forEach(link => {
			const item = HEADER_NAV_ITEMS.find(candidate => link.textContent.trim().startsWith(candidate.label));
			if (item) {
				link.classList.toggle('ZhihuGreener-hiddenHeaderNav', hiddenHeaderNavItems.has(item.key));
			}
		});
	}

	function createHeaderNavSettings() {
		if (document.getElementById(NAV_SETTINGS_ID)) {
			return;
		}

		const settings = document.createElement('div');
		settings.id = NAV_SETTINGS_ID;
		const toggleButton = document.createElement('button');
		toggleButton.type = 'button';
		toggleButton.textContent = '导航';
		toggleButton.setAttribute('aria-expanded', 'false');

		const panel = document.createElement('div');
		panel.className = 'ZhihuGreener-navPanel';
		const allItemsLabel = document.createElement('label');
		const allItemsToggle = document.createElement('input');
		allItemsToggle.type = 'checkbox';
		allItemsLabel.append(allItemsToggle, '隐藏全部');
		panel.appendChild(allItemsLabel);

		const itemToggles = new Map();
		HEADER_NAV_ITEMS.forEach(item => {
			const label = document.createElement('label');
			const checkbox = document.createElement('input');
			checkbox.type = 'checkbox';
			checkbox.dataset.headerNavItem = item.key;
			label.append(checkbox, `隐藏「${item.label}」`);
			panel.appendChild(label);
			itemToggles.set(item.key, checkbox);
		});

		const render = () => {
			itemToggles.forEach((checkbox, key) => {
				checkbox.checked = hiddenHeaderNavItems.has(key);
			});
			allItemsToggle.checked = hiddenHeaderNavItems.size === HEADER_NAV_ITEMS.length;
		};

		toggleButton.addEventListener('click', () => {
			const isOpen = settings.classList.toggle('is-open');
			toggleButton.setAttribute('aria-expanded', String(isOpen));
		});
		allItemsToggle.addEventListener('change', () => {
			hiddenHeaderNavItems = allItemsToggle.checked
				? new Set(HEADER_NAV_ITEMS.map(item => item.key))
				: new Set();
			saveHiddenHeaderNavItems();
			applyHeaderNavVisibility();
			render();
		});
		panel.addEventListener('change', event => {
			const checkbox = event.target;
			if (!(checkbox instanceof HTMLInputElement) || !checkbox.dataset.headerNavItem) {
				return;
			}
			if (checkbox.checked) {
				hiddenHeaderNavItems.add(checkbox.dataset.headerNavItem);
			} else {
				hiddenHeaderNavItems.delete(checkbox.dataset.headerNavItem);
			}
			saveHiddenHeaderNavItems();
			applyHeaderNavVisibility();
			render();
		});

		settings.append(toggleButton, panel);
		document.body.appendChild(settings);
		render();
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

	function modifyPostLayout() {
		if (!document.body.classList.contains('PostIndex-body')) {
			return;
		}

		Object.entries(POST_LAYOUT_VARIABLES).forEach(([name, value]) => {
			document.documentElement.style.setProperty(name, value, 'important');
		});

		const postContent = document.querySelector('.Post-content');
		if (postContent) {
			postContent.style.setProperty('width', '100%', 'important');
			postContent.style.setProperty('min-width', '0', 'important');
		}

		const postMain = document.querySelector('.Post-Main.Post-NormalMain');
		if (!postMain) {
			return;
		}

		const postColumn = postMain.parentElement;
		const postLayout = postColumn && postColumn.parentElement;
		if (postLayout) {
			postLayout.style.setProperty('width', CONTENT_COLUMN_WIDTH, 'important');
			postLayout.style.setProperty('min-width', '0', 'important');
			postLayout.style.setProperty('max-width', 'none', 'important');
			postLayout.style.setProperty('margin-left', 'auto', 'important');
			postLayout.style.setProperty('margin-right', 'auto', 'important');
		}
		if (postColumn) {
			postColumn.style.setProperty('width', '100%', 'important');
			postColumn.style.setProperty('min-width', '0', 'important');
			postColumn.style.setProperty('max-width', 'none', 'important');
		}

		const titleImageContainer = postMain.previousElementSibling;
		if (titleImageContainer) {
			titleImageContainer.style.setProperty('width', ARTICLE_IMAGE_WIDTH, 'important');
			titleImageContainer.style.setProperty('max-width', 'none', 'important');
			titleImageContainer.style.setProperty('margin-left', 'auto', 'important');
			titleImageContainer.style.setProperty('margin-right', 'auto', 'important');
			Array.from(titleImageContainer.children).forEach(element => {
				element.style.setProperty('width', '100%', 'important');
				element.style.setProperty('max-width', 'none', 'important');
			});
		}

		document.querySelectorAll('.Post-Main.Post-NormalMain, .Post-RichTextContainer').forEach(element => {
			element.style.setProperty('width', '100%', 'important');
			element.style.setProperty('max-width', 'none', 'important');
			element.style.setProperty('margin-left', 'auto', 'important');
			element.style.setProperty('margin-right', 'auto', 'important');
		});
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
		modifyPostLayout();
		modifyAppHeader();
		applyHeaderNavVisibility();
		createHeaderNavSettings();
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

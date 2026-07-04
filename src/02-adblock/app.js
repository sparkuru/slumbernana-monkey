// ==UserScript==
// @name         Universal Adblock Plus Rules Converter
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  Universal Adblock Plus rules parser and converter
// @author       wkyuu
// @match        https://github.com/*
// @match        https://taobao.com/*
// @match        https://jd.com/*
// @match        https://zhipin.com/*
// @match        https://douban.com/*
// @match        https://xueqiu.com/*
// @grant        none
// ==/UserScript==

(function () {
	'use strict';

	const title = "62in7e-0"
	const keywords = [
		"fXzjPH",
		"eLyVAI"
	]

	const craps = [
		"cheezcharmer",
		"Dimples1337",
		"zaohmeing",
		"zhaohmng-outlook-com",
		"codin-stuffs",
		"zpc1314521",
		"b0LBwZ7r5HOeh6CBMuQIhVu3-s-random-fork",
		"panbinibn",
		"pxvr-official",
		"cirosantilli"
	]

	const githubRules = keywords.flatMap(keyword =>
		craps.map(crap => `github.com#?#div.Box-sc-${title}.${keyword}:-abp-has(a:-abp-contains(${crap}))`)
	)
	const generalRules = [
		'taobao.com##div[id="J_TBPC_POP_home"]',
		'taobao.com##div.custom-pop-tmpl-wrapper',
		'jd.com##div.umc-equity',
		'zhipin.com##div.dialog-wrap.dialog-account-safe',
		'douban.com##div.ui-overlay-mask',
		'xueqiu.com##div.modals.dimmer.js-shown',
		'xueqiu.com##footer[id="footer_footer_2F1"]'
	];
	const allRules = [...githubRules, ...generalRules];

	// Adblock Plus rule parser
	class AdblockRuleParser {
		constructor() {
			this.parsedRules = [];
		}

		// Parse a single Adblock Plus rule
		parseRule(rule) {
			const parsed = {
				domains: [],
				selector: '',
				contains: null,
				has: null,
				type: 'simple'
			};

			// Handle different rule types
			if (rule.includes('##')) {
				// Simple element hiding rule: domain.com##selector
				const [domainPart, selectorPart] = rule.split('##');
				parsed.domains = this.parseDomains(domainPart);
				parsed.selector = selectorPart;
				parsed.type = 'element_hiding';
			} else if (rule.includes('#?#')) {
				// Extended element hiding rule: domain.com#?#selector:-abp-has(...)
				const [domainPart, selectorPart] = rule.split('#?#');
				parsed.domains = this.parseDomains(domainPart);

				// Parse extended selector with conditions
				const conditions = this.parseExtendedSelector(selectorPart);
				parsed.selector = conditions.selector;
				parsed.contains = conditions.contains;
				parsed.has = conditions.has;
				parsed.type = 'extended_element_hiding';
			}

			return parsed;
		}

		// Parse domain part (supports wildcards and subdomains)
		parseDomains(domainPart) {
			const domains = [];
			const parts = domainPart.split(',');

			parts.forEach(part => {
				part = part.trim();
				if (part.includes('*')) {
					// Handle wildcard domains
					const baseDomain = part.replace(/\*/g, '');
					domains.push(baseDomain);
					domains.push('*.' + baseDomain);
				} else {
					domains.push(part);
					domains.push('*.' + part);
				}
			});

			return domains;
		}

		// Parse extended selector with conditions
		parseExtendedSelector(selectorPart) {
			const result = {
				selector: '',
				contains: null,
				has: null
			};

			// Split by :-abp- conditions
			const parts = selectorPart.split(':-abp-');
			result.selector = parts[0];

			// Parse conditions
			for (let i = 1; i < parts.length; i++) {
				const condition = parts[i];
				if (condition.startsWith('has(')) {
					result.has = this.parseHasCondition(condition);
				} else if (condition.startsWith('contains(')) {
					result.contains = this.parseContainsCondition(condition);
				}
			}

			return result;
		}

		// Parse :-abp-has() condition
		parseHasCondition(condition) {
			const match = condition.match(/has\(([^)]+)\)/);
			if (match) {
				return match[1];
			}
			return null;
		}

		// Parse :-abp-contains() condition
		parseContainsCondition(condition) {
			const match = condition.match(/contains\(([^)]+)\)/);
			if (match) {
				return match[1];
			}
			return null;
		}

		// Parse all rules
		parseAllRules(rules) {
			this.parsedRules = rules.map(rule => this.parseRule(rule));
			return this.parsedRules;
		}
	}

	// Rule executor
	class RuleExecutor {
		constructor(parsedRules) {
			this.parsedRules = parsedRules;
			this.currentDomain = window.location.hostname;
		}

		// Check if domain matches rule
		domainMatches(ruleDomains) {
			return ruleDomains.some(domain => {
				if (domain.startsWith('*.')) {
					const baseDomain = domain.substring(2);
					return this.currentDomain === baseDomain || this.currentDomain.endsWith('.' + baseDomain);
				}
				return this.currentDomain === domain || this.currentDomain.endsWith('.' + domain);
			});
		}

		// Hide element with multiple strategies
		hideElement(element) {
			element.style.display = 'none';
			element.style.visibility = 'hidden';
			element.style.opacity = '0';
			element.style.height = '0';
			element.style.overflow = 'hidden';
			element.style.position = 'absolute';
			element.style.left = '-9999px';
		}

		// Execute simple element hiding rule
		executeElementHidingRule(rule) {
			if (!this.domainMatches(rule.domains)) return;

			const elements = document.querySelectorAll(rule.selector);
			elements.forEach(element => {
				this.hideElement(element);
			});
		}

		// Execute extended element hiding rule
		executeExtendedElementHidingRule(rule) {
			if (!this.domainMatches(rule.domains)) return;

			const containers = document.querySelectorAll(rule.selector);
			containers.forEach(container => {
				let shouldHide = false;

				// Check contains condition
				if (rule.contains) {
					const text = container.textContent || '';
					if (text.includes(rule.contains)) {
						shouldHide = true;
					}
				}

				// Check has condition
				if (rule.has && !shouldHide) {
					const hasSelector = rule.has;
					const hasElements = container.querySelectorAll(hasSelector);
					hasElements.forEach(hasElement => {
						if (rule.contains) {
							const text = hasElement.textContent || '';
							if (text.includes(rule.contains)) {
								shouldHide = true;
							}
						} else {
							shouldHide = true;
						}
					});
				}

				if (shouldHide) {
					this.hideElement(container);
				}
			});
		}

		// Execute all applicable rules
		executeRules() {
			this.parsedRules.forEach(rule => {
				if (rule.type === 'element_hiding') {
					this.executeElementHidingRule(rule);
				} else if (rule.type === 'extended_element_hiding') {
					this.executeExtendedElementHidingRule(rule);
				}
			});
		}
	}

	// Initialize and run
	const parser = new AdblockRuleParser();
	const parsedRules = parser.parseAllRules(allRules);
	const executor = new RuleExecutor(parsedRules);

	// Main execution function
	function executeBlocking() {
		executor.executeRules();
	}

	// Run immediately
	executeBlocking();

	// Run on DOM changes (for dynamic content)
	const observer = new MutationObserver(function (mutations) {
		let shouldRun = false;
		mutations.forEach(function (mutation) {
			if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
				shouldRun = true;
			}
		});

		if (shouldRun) {
			setTimeout(executeBlocking, 100);
		}
	});

	// Start observing
	if (document.body) {
		observer.observe(document.body, {
			childList: true,
			subtree: true
		});
	}

	// Run on page load
	window.addEventListener('load', executeBlocking);

	// Run on navigation (for SPA)
	window.addEventListener('popstate', executeBlocking);

	// Run when DOM is ready
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', executeBlocking);
	} else {
		executeBlocking();
	}

})();

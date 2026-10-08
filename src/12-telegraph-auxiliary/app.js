// ==UserScript==
// @name         Telegraph Auxiliary
// @namespace    http://tampermonkey.net/
// @version      0.1.1
// @description  telegraph 页面辅助脚本
// @author       wkyuu
// @match        https://telegra.ph/*
// @require      https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js
// @grant        GM_xmlhttpRequest
// @grant        GM_download
// @grant        GM_registerMenuCommand
// @connect      *
// @run-at       document-idle
// @noframes
// ==/UserScript==

(function () {
	'use strict';

	const PANEL_ID = 'telegraph-auxiliary';

	function sanitizeFilename(title) {
		let name = title.replace(/[\\/:*?"<>|\u0000-\u001f\u007f]/g, '_')
			.replace(/\s+/g, ' ').trim();
		// ZIP entry names also need to fit Windows paths and UTF-8 filesystem limits.
		const encoder = new TextEncoder();
		while (encoder.encode(name).length > 180) {
			name = Array.from(name).slice(0, -1).join('');
		}
		name = name.replace(/[. ]+$/, '') || 'telegraph';
		if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(name)) {
			name = `_${name}`;
		}
		return name;
	}

	function absoluteUrl(value, baseUrl, protocols = ['http:', 'https:']) {
		if (!value || !value.trim()) {
			return '';
		}
		try {
			const url = new URL(value.trim(), baseUrl);
			return protocols.includes(url.protocol) ? url.href : '';
		} catch {
			return '';
		}
	}

	function createPageContext(doc = document, win = window) {
		function query(selector, root = doc) {
			return root?.querySelector(selector) || null;
		}

		function queryAll(selector, root = doc) {
			return Array.from(root?.querySelectorAll(selector) || []);
		}

		function getArticle() {
			return query('#_tl_editor') || query('.tl_article_content');
		}

		function getHeader() {
			return query('.tl_article_header');
		}

		function getMetadata() {
			const article = getArticle();
			const title = (query('h1', getHeader())?.textContent || query('h1', article)?.textContent
				|| doc.title.replace(/\s*[–—-]\s*Telegraph\s*$/i, '')).trim() || 'telegraph';
			const time = query('meta[property="article:published_time"], meta[name="article:published_time"]')?.content
				|| query('.tl_article_header time, time')?.getAttribute('datetime')
				|| query('.tl_article_header time, time')?.textContent || '';
			const author = query('meta[property="article:author"]')?.content
				|| query('[rel="author"], address a', getHeader())?.textContent
				|| query('address', article)?.textContent || '';
			return { title, time: time.trim(), author: author.trim(), url: win.location.href };
		}

		function getImages(root = getArticle()) {
			return queryAll('img', root).map((node, index) => ({
				node, index: index + 1,
				url: absoluteUrl(node.getAttribute('src') || node.getAttribute('data-src'), win.location.href)
			}));
		}

		function snapshot() {
			const article = getArticle();
			if (!article || (!article.textContent.trim() && !query('img, iframe, video, audio', article))) {
				throw new Error('未找到 Telegraph 正文，请在已发布的文章页面使用。');
			}
			return { ...getMetadata(), content: article.cloneNode(true) };
		}

		return { document: doc, window: win, query, queryAll, getArticle, getHeader, getMetadata, getImages, snapshot };
	}

	function abortError() {
		return new DOMException('已取消下载', 'AbortError');
	}

	function requestBinary(url, signal, timeout = 30000) {
		return new Promise((resolve, reject) => {
			if (signal.aborted) {
				reject(abortError());
				return;
			}
			let request;
			let settled = false;
			const finish = (callback, value) => {
				if (settled) return;
				settled = true;
				signal.removeEventListener('abort', cancel);
				callback(value);
			};
			const cancel = () => {
				finish(reject, abortError());
				request?.abort();
			};
			signal.addEventListener('abort', cancel, { once: true });
			try {
				request = GM_xmlhttpRequest({
					method: 'GET', url, responseType: 'arraybuffer', timeout,
					onload: response => {
						if (response.status < 200 || response.status >= 300) {
							finish(reject, new Error(`HTTP ${response.status}`));
							return;
						}
						const data = response.response;
						const type = (response.responseHeaders?.match(/^content-type:\s*([^;\r\n]+)/im)?.[1] || '').trim().toLowerCase();
						if (!data || !data.byteLength) {
							finish(reject, new Error('资源响应为空'));
						} else {
							finish(resolve, { data, type });
						}
					},
					onerror: () => finish(reject, new Error('网络错误或资源访问未获授权')),
					ontimeout: () => finish(reject, new Error('下载超时')),
					onabort: () => finish(reject, abortError())
				});
			} catch (error) {
				finish(reject, error);
			}
		});
	}

	function delay(milliseconds, signal) {
		return new Promise((resolve, reject) => {
			if (signal.aborted) { reject(abortError()); return; }
			const cancel = () => { window.clearTimeout(timer); reject(abortError()); };
			const timer = window.setTimeout(() => {
				signal.removeEventListener('abort', cancel);
				resolve();
			}, milliseconds);
			signal.addEventListener('abort', cancel, { once: true });
		});
	}

	function downloadArchive(blob, name, signal) {
		return new Promise((resolve, reject) => {
			if (signal.aborted) { reject(abortError()); return; }
			if (typeof GM_download !== 'function') {
				reject(new Error('脚本管理器未提供下载接口，请更新脚本或手动保存'));
				return;
			}
			const errors = {
				not_enabled: '脚本管理器的下载功能未启用',
				not_whitelisted: '脚本管理器未允许下载 .zip 文件',
				not_permitted: '脚本管理器未获得浏览器下载权限',
				not_supported: '当前浏览器或脚本管理器不支持此下载方式',
				not_succeeded: '下载未启动、被取消或保存失败'
			};
			let request;
			let settled = false;
			const finish = (callback, value) => {
				if (settled) return;
				settled = true;
				signal.removeEventListener('abort', cancel);
				callback(value);
			};
			const cancel = () => {
				finish(reject, abortError());
				request?.abort();
			};
			signal.addEventListener('abort', cancel, { once: true });
			try {
				request = GM_download({
					url: blob, name, saveAs: true,
					onload: () => finish(resolve),
					onerror: error => finish(reject, new Error(errors[error?.error] || error?.error || '保存失败')),
					ontimeout: () => finish(reject, new Error('保存超时'))
				});
			} catch (error) {
				finish(reject, error);
			}
		});
	}

	function createToolbar() {
		const panel = document.createElement('div');
		panel.id = PANEL_ID;
		const shadow = panel.attachShadow({ mode: 'open' });
		shadow.innerHTML = `<style>
			:host { position: fixed; right: 16px; bottom: 16px; z-index: 2147483647; }
			.panel { box-sizing: border-box; max-width: min(310px, calc(100vw - 32px)); padding: 12px;
				background: #fff; color: #222; border: 1px solid #ddd; border-radius: 10px;
				box-shadow: 0 3px 16px #0002; font: 14px/1.5 system-ui, sans-serif; }
			section + section { border-top: 1px solid #eee; margin-top: 12px; padding-top: 12px; }
			.title { display: block; margin-bottom: 8px; }
			.actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
			button { padding: 7px 12px; border: 0; border-radius: 6px; cursor: pointer;
				background: #222; color: #fff; font: inherit; }
			button:disabled { opacity: .5; cursor: wait; } .secondary { background: #eee; color: #222; }
			a { color: #2677a8; } .status { margin-top: 8px; font-size: 12px; overflow-wrap: anywhere; }
			[hidden] { display: none !important; }
		</style><div class="panel"></div>`;
		document.body.append(panel);

		function addSection(feature) {
			const section = document.createElement('section');
			section.dataset.feature = feature.id;
			const title = document.createElement('strong');
			title.className = 'title';
			title.textContent = feature.title;
			const actions = document.createElement('div');
			actions.className = 'actions';
			const status = document.createElement('div');
			status.className = 'status';
			status.setAttribute('role', 'status');
			status.setAttribute('aria-live', 'polite');
			section.append(title, actions, status);
			shadow.querySelector('.panel').append(section);

			return {
				addButton(label, onClick, { className = '', hidden = false } = {}) {
					const button = document.createElement('button');
					button.type = 'button';
					button.textContent = label;
					button.className = className;
					button.hidden = hidden;
					button.addEventListener('click', onClick);
					actions.append(button);
					return button;
				},
				addLink(label, { className = '', hidden = false } = {}) {
					const link = document.createElement('a');
					link.textContent = label;
					link.className = className;
					link.hidden = hidden;
					actions.append(link);
					return link;
				},
				setStatus(text) { status.textContent = text; }
			};
		}

		return { addSection };
	}

	const PageArchiveFeature = {
		id: 'page-archive',
		title: '页面归档',
		isAvailable: context => Boolean(context.page.getArticle()),
		mount(context, section) {
			const CONCURRENCY = 3;
			const RETRIES = 3;
			const REQUEST_TIMEOUT = 30000;
			const MIME_EXTENSIONS = {
				'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png',
				'image/webp': 'webp', 'image/gif': 'gif', 'image/bmp': 'bmp',
				'image/avif': 'avif', 'image/svg+xml': 'svg', 'image/tiff': 'tiff',
				'image/x-icon': 'ico'
			};
			const CONTENT_TAGS = new Set([
				'P', 'BR', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'ADDRESS', 'A',
				'B', 'STRONG', 'I', 'EM', 'U', 'S', 'DEL', 'BLOCKQUOTE', 'PRE', 'CODE',
				'UL', 'OL', 'LI', 'HR', 'FIGURE', 'FIGCAPTION', 'IMG', 'DIV', 'SPAN'
			]);
			const OFFLINE_STYLE = `
				body { margin: 32px auto; padding: 0 20px; max-width: 860px; color: #222;
					font: 18px/1.7 Georgia, "Noto Serif CJK SC", serif; overflow-wrap: anywhere; }
				h1 { font-size: 32px; line-height: 1.3; } a { color: #2677a8; }
				.archive-meta, figcaption { color: #666; font: 14px/1.6 sans-serif; }
				img { display: block; max-width: 100%; height: auto; margin: 16px auto; }
				figure { margin: 24px 0; } blockquote { border-left: 3px solid #ddd; padding-left: 20px; }
				pre { white-space: pre-wrap; background: #f5f5f5; padding: 16px; }
				.archive-missing { color: #a33; border: 1px dashed #c99; padding: 12px; }
			`;
			let activeController = null;
			let archiveUrl = null;
			let archiveSummary = '';
			const setStatus = section.setStatus;

			function captureArchive() {
				const snapshot = context.page.snapshot();
				return {
					...snapshot, savedAt: new Date().toISOString(),
					images: context.page.getImages(snapshot.content).map(image => ({ ...image, file: null, error: null }))
				};
			}

			async function downloadImage(url, signal) {
				if (!url) throw new Error('图片地址为空或不支持');
				for (let attempt = 1; attempt <= RETRIES; attempt++) {
					try {
						const response = await context.resources.requestBinary(url, signal, REQUEST_TIMEOUT);
						const { type } = response;
						if (type && !type.startsWith('image/') && type !== 'application/octet-stream' && type !== 'binary/octet-stream') {
							throw new Error(`响应不是图片：${type}`);
						}
						return response;
					} catch (error) {
						if (signal.aborted || error.name === 'AbortError' || attempt === RETRIES) throw error;
						await context.resources.delay(1000 * attempt, signal);
					}
				}
			}

			function imageExtension(type, url, data) {
				if (MIME_EXTENSIONS[type]) return MIME_EXTENSIONS[type];
				const bytes = new Uint8Array(data);
				if (bytes[0] === 0xff && bytes[1] === 0xd8) return 'jpg';
				if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'png';
				const signature = String.fromCharCode(...bytes.slice(0, 12));
				if (/^GIF8[79]a/.test(signature)) return 'gif';
				if (signature.startsWith('RIFF') && signature.slice(8) === 'WEBP') return 'webp';
				return new URL(url).pathname.match(/\.(jpg|jpeg|png|webp|gif|bmp|avif|svg|tiff?|ico)$/i)?.[1].toLowerCase() || 'img';
			}

			async function downloadImages(page, folder, signal) {
				let nextIndex = 0;
				let completed = 0;
				const width = Math.max(4, String(page.images.length).length);
				async function worker() {
					while (nextIndex < page.images.length) {
						if (signal.aborted) throw abortError();
						const image = page.images[nextIndex++];
						try {
							const { data, type } = await downloadImage(image.url, signal);
							if (signal.aborted) throw abortError();
							image.file = `${String(image.index).padStart(width, '0')}.${imageExtension(type, image.url, data)}`;
							folder.file(image.file, data, { compression: 'STORE' });
						} catch (error) {
							if (signal.aborted || error.name === 'AbortError') throw error;
							image.error = error.message || String(error);
						}
						completed++;
						setStatus(`下载图片 ${completed}/${page.images.length}`);
					}
				}
				await Promise.all(Array.from({ length: Math.min(CONCURRENCY, page.images.length) }, worker));
			}

			function createOfflineHtml(page) {
				const offline = context.page.document.implementation.createHTMLDocument(page.title);
				offline.documentElement.lang = context.page.document.documentElement.lang || 'zh-CN';
				const charset = offline.createElement('meta');
				charset.setAttribute('charset', 'utf-8');
				offline.head.prepend(charset);
				const viewport = offline.createElement('meta');
				viewport.name = 'viewport';
				viewport.content = 'width=device-width, initial-scale=1';
				offline.head.append(viewport);
				const style = offline.createElement('style');
				style.textContent = OFFLINE_STYLE;
				offline.head.append(style);
				const heading = offline.createElement('h1');
				heading.textContent = page.title;
				const metadata = offline.createElement('p');
				metadata.className = 'archive-meta';
				metadata.textContent = [page.author, page.time].filter(Boolean).join(' · ');
				const source = offline.createElement('a');
				source.href = page.url;
				source.textContent = '原文链接';
				metadata.append(offline.createElement('br'), source);
				offline.body.append(heading, metadata);
				const imageMap = new Map(page.images.map(image => [image.node, image]));

				// Rebuild only article elements so editor controls, scripts and remote embeds stay out of the archive.
				function appendContent(node, parent) {
					if (node.nodeType === Node.TEXT_NODE) {
						parent.append(offline.createTextNode(node.textContent));
						return;
					}
					if (node.nodeType !== Node.ELEMENT_NODE) return;
					if (['SCRIPT', 'STYLE', 'LINK', 'META', 'OBJECT', 'FORM', 'INPUT', 'BUTTON'].includes(node.tagName)) return;
					if (['IFRAME', 'VIDEO', 'AUDIO'].includes(node.tagName)) {
						const url = context.resources.resolveUrl(node.getAttribute('src') || node.querySelector('source')?.getAttribute('src'), page.url);
						const link = offline.createElement(url ? 'a' : 'p');
						if (url) link.href = url;
						link.textContent = '嵌入内容（需联网查看）';
						parent.append(link);
						return;
					}
					if (!CONTENT_TAGS.has(node.tagName)) {
						for (const child of node.childNodes) appendContent(child, parent);
						return;
					}
					const element = offline.createElement(node.tagName.toLowerCase());
					if (node.tagName === 'IMG') {
						const image = imageMap.get(node);
						if (!image?.file) {
							const missing = offline.createElement('span');
							missing.className = 'archive-missing';
							missing.textContent = `图片 ${image?.index || ''} 未保存：${image?.error || '地址不可用'} `;
							if (image?.url) {
								const link = offline.createElement('a');
								link.href = image.url;
								link.textContent = '原图链接';
								missing.append(link);
							}
							parent.append(missing);
							return;
						}
						element.setAttribute('src', image.file);
						element.alt = node.getAttribute('alt') || `图片 ${image.index}`;
					} else if (node.tagName === 'A') {
						const href = node.getAttribute('href') || '';
						const url = href.startsWith('#') ? href : context.resources.resolveUrl(href, page.url, ['http:', 'https:', 'mailto:', 'tel:']);
						if (url) element.setAttribute('href', url);
					}
					if (node.id) element.id = node.id;
					if (['ltr', 'rtl', 'auto'].includes(node.getAttribute('dir'))) element.dir = node.getAttribute('dir');
					for (const child of node.childNodes) appendContent(child, element);
					parent.append(element);
				}
				const content = offline.createElement('article');
				for (const node of page.content.childNodes) {
					if (node.nodeType === Node.ELEMENT_NODE && (node.tagName === 'ADDRESS'
						|| node.tagName === 'H1' && node.textContent.trim() === page.title)) continue;
					appendContent(node, content);
				}
				offline.body.append(content);
				return `<!DOCTYPE html>\n${offline.documentElement.outerHTML}`;
			}

			function writeMetadata(page, folder) {
				const failures = page.images.filter(image => image.error);
				const readme = [
					`url: ${page.url}`, `title: ${page.title}`, `time: ${page.time}`,
					`author: ${page.author}`, `saved_at: ${page.savedAt}`,
					`images: ${page.images.length}`, `downloaded: ${page.images.length - failures.length}`,
					`failed: ${failures.length}`, '',
					'解压后打开 index.html 阅读；图片按正文出现顺序编号。',
					'仅保存当前页的正文和图片；文章链接、视频与嵌入内容需联网查看。'
				].join('\n');
				folder.file('readme.txt', `${readme}\n`);
				folder.file('manifest.json', JSON.stringify({
					url: page.url, title: page.title, time: page.time, author: page.author,
					savedAt: page.savedAt,
					images: page.images.map(({ index, url, file, error }) => ({ index, url, file, error }))
				}, null, 2));
				if (failures.length) {
					folder.file('failed-images.txt', failures.map(image =>
						`${image.index}\t${image.url || '(无有效地址)'}\t${image.error}`).join('\n') + '\n');
				}
				folder.file('index.html', createOfflineHtml(page));
			}

			function releaseArchive() {
				if (archiveUrl) URL.revokeObjectURL(archiveUrl);
				archiveUrl = null;
				archiveSummary = '';
				ui.save.hidden = true;
				ui.save.removeAttribute('href');
			}

			function saveArchiveManually(event) {
				event.preventDefault();
				if (!archiveUrl) return;
				// Keep the fallback in the click handler so it retains the user's activation.
				const link = context.page.document.createElement('a');
				link.href = archiveUrl;
				link.download = ui.save.download;
				link.hidden = true;
				context.page.document.body.append(link);
				link.click();
				link.remove();
				setStatus(`已请求浏览器保存 ZIP，请检查下载列表或保存对话框。${archiveSummary}`);
			}

			async function saveCurrentPage() {
				if (activeController) return;
				const controller = new AbortController();
				activeController = controller;
				ui.download.disabled = true;
				ui.cancel.hidden = false;
				releaseArchive();
				try {
					if (typeof JSZip !== 'function') throw new Error('ZIP 组件未加载，请刷新页面后重试。');
					const page = captureArchive();
					const name = context.files.sanitizeFilename(page.title);
					const zip = new JSZip();
					const folder = zip.folder(name);
					setStatus(`下载图片 0/${page.images.length}`);
					await downloadImages(page, folder, controller.signal);
					if (controller.signal.aborted) throw abortError();
					ui.cancel.hidden = true;
					writeMetadata(page, folder);
					const blob = await zip.generateAsync({
						type: 'blob', compression: 'DEFLATE',
						compressionOptions: { level: 6 }, streamFiles: true
					}, progress => {
						setStatus(`打包中 ${Math.floor(progress.percent)}%`);
					});
					if (controller.signal.aborted) throw abortError();
					archiveUrl = URL.createObjectURL(blob);
					ui.save.href = archiveUrl;
					ui.save.download = `${name}.zip`;
					ui.save.hidden = false;
					const failures = page.images.filter(image => image.error).length;
					archiveSummary = failures
						? `${failures}/${page.images.length} 张图片未能归档，详见包内清单。`
						: `包内包含 ${page.images.length} 张图片。`;
					ui.cancel.hidden = false;
					setStatus(`ZIP 已生成，正在请求保存，请留意保存对话框。${archiveSummary}`);
					await downloadArchive(blob, `${name}.zip`, controller.signal);
					setStatus(`ZIP 下载完成：${name}.zip。${archiveSummary}`);
				} catch (error) {
					if (error.name === 'AbortError') {
						setStatus(archiveUrl ? '已取消自动保存；ZIP 已保留，可点击“手动保存 ZIP”。' : '已取消下载。');
					} else {
						setStatus(archiveUrl
							? `ZIP 已生成，但自动保存失败：${error.message || error}。请点击“手动保存 ZIP”。${archiveSummary}`
							: `保存失败：${error.message || error}`);
					}
				} finally {
					activeController = null;
					ui.download.disabled = false;
					ui.cancel.hidden = true;
				}
			}

			const ui = {
				download: section.addButton('下载本页 ZIP', saveCurrentPage, { className: 'download' }),
				cancel: section.addButton('取消', () => activeController?.abort(), { className: 'cancel secondary', hidden: true }),
				save: section.addLink('手动保存 ZIP', { className: 'save', hidden: true })
			};
			ui.save.addEventListener('click', saveArchiveManually);
			setStatus('保存正文、图片与来源信息');
			GM_registerMenuCommand('下载当前 Telegraph 页面 ZIP', saveCurrentPage);
			return {
				onPageHide() {
					activeController?.abort();
					releaseArchive();
				}
			};
		}
	};

	// Features provide id, title, optional isAvailable(context), and mount(context, section).
	// mount shares page/resources/files and may return onPageHide/onPageShow lifecycle hooks.
	const FEATURES = [PageArchiveFeature];

	function initialize() {
		if (document.getElementById(PANEL_ID)) return;
		const context = {
			page: createPageContext(),
			resources: { resolveUrl: absoluteUrl, requestBinary, delay },
			files: { sanitizeFilename }
		};
		const features = FEATURES.filter(feature => !feature.isAvailable || feature.isAvailable(context));
		if (!features.length) return;
		const toolbar = createToolbar();
		const lifecycles = [];
		for (const feature of features) {
			const section = toolbar.addSection(feature);
			try {
				lifecycles.push(feature.mount(context, section) || {});
			} catch (error) {
				section.setStatus(`初始化失败：${error.message || error}`);
			}
		}
		window.addEventListener('pagehide', () => {
			for (const lifecycle of lifecycles) lifecycle.onPageHide?.();
		});
		window.addEventListener('pageshow', () => {
			for (const lifecycle of lifecycles) lifecycle.onPageShow?.();
		});
	}

	initialize();
})();

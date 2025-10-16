// ==UserScript==
// @name         HedgeDoc 宽度自动调整
// @namespace    https://tampermonkey.net/
// @version      0.1
// @description  因为 hedgedoc 在线协作时，其宽度自动限制为 758px，不太方便，所以自动将 HedgeDoc 主要容器宽度改为 80%
// @author       wkyuu
// 下面这个修改成希望修改的 self-host 域名
// @match        https://md.majo.im/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=md.majo.im
// @grant        none
// ==/UserScript==

/*
修改 <div class="ui-infobar container-fluid unselectable hidden-print"> ... </div>
.ui-infobar {
    position: relative;
    z-index: 2;
    max-width: 758px; -> 80%
    margin-top: 25px;
    margin-bottom: -25px;
    color: #777;
}

修改 <div id="doc" class="markdown-body container-fluid"> ... </div>
.markdown-body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
    padding-top: 40px;
    padding-bottom: 40px;
    max-width: 758px; -> 80%
    overflow: visible !important;
}
*/


(function () {
    'use strict';

    const width = '80vw';

    function adjustWidth() {
        const style = document.createElement('style');
        style.textContent = `
            .ui-infobar {
                max-width: ${width} !important;
            }
            .markdown-body {
                max-width: ${width} !important;
            }
            /* ensure other possible containers also use the same width */
            .container-fluid {
                max-width: ${width} !important;
            }
        `;
        document.head.appendChild(style);
    }

    // execute after page loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', adjustWidth);
    } else {
        adjustWidth();
    }
})();
export function waitForElement(selector, callback, maxWait = 10000) {
    const startTime = Date.now();

    const checkElement = () => {
        const element = typeof selector === 'string'
            ? document.querySelector(selector)
            : window[selector];

        if (element) {
            observer.disconnect();
            callback(element);
        } else if (Date.now() - startTime > maxWait) {
            observer.disconnect();
            console.error('[SyncTV Extended] Element not found:', selector);
        }
    };

    const observer = new MutationObserver(checkElement);

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    checkElement();
}

export function createElement(html) {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    return template.content.firstChild;
}

export function removeElement(selector) {
    const element = typeof selector === 'string'
        ? document.querySelector(selector)
        : selector;

    if (element && element.parentNode) {
        element.parentNode.removeChild(element);
    }
}

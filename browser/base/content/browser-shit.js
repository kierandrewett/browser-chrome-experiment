const { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
const { E10SUtils } = ChromeUtils.import("resource://gre/modules/E10SUtils.jsm");

window.docShell.treeOwner
    .QueryInterface(Ci.nsIInterfaceRequestor)
    .getInterface(Ci.nsIAppWindow).XULBrowserWindow = window.XULBrowserWindow;

async function getBrowser(uri) {
    let browser = document.getElementById("webext-panels-browser");
    if (browser) {
        return Promise.resolve(browser);
    }

    let stack = document.getElementById("webext-panels-stack");
    if (!stack) {
        stack = document.createXULElement("stack");
        stack.setAttribute("flex", "1");
        stack.setAttribute("id", "webext-panels-stack");
        document.body.appendChild(stack);
    }

    browser = document.createXULElement("browser");
    browser.setAttribute("id", "webext-panels-browser");
    browser.setAttribute("type", "content");
    browser.setAttribute("flex", "1");
    browser.setAttribute("context", "contentAreaContextMenu");
    browser.setAttribute("tooltip", "aHTMLTooltip");
    browser.setAttribute("autocompletepopup", "PopupAutoComplete");
    browser.setAttribute("selectmenulist", "ContentSelectDropdown");
    browser.setAttribute("message", "true");
    browser.setAttribute("messagemanagergroup", "browsers");
    browser.setAttribute("remote", "true");
    
    let oa = E10SUtils.predictOriginAttributes({ browser });

    browser.setAttribute(
        "remoteType",
        E10SUtils.getRemoteTypeForURI(
            uri,
            window.docShell.QueryInterface(Ci.nsILoadContext)
                .useRemoteTabs,
            false,
            E10SUtils.DEFAULT_REMOTE_TYPE,
            null,
            oa
        )
    );
    browser.setAttribute("maychangeremoteness", "true");

    stack.appendChild(browser);

    browser.addEventListener(
        "DoZoomEnlargeBy10",
        () => {
            let { ZoomManager } = browser.ownerGlobal;
            let zoom = browser.fullZoom;
            zoom += 0.1;
            if (zoom > ZoomManager.MAX) {
                zoom = ZoomManager.MAX;
            }
            browser.fullZoom = zoom;
        },
        true
    );
    browser.addEventListener(
        "DoZoomReduceBy10",
        () => {
            let { ZoomManager } = browser.ownerGlobal;
            let zoom = browser.fullZoom;
            zoom -= 0.1;
            if (zoom < ZoomManager.MIN) {
                zoom = ZoomManager.MIN;
            }
            browser.fullZoom = zoom;
        },
        true
    );

    browser.addEventListener("DidChangeBrowserRemoteness", console.log);
    return Promise.resolve(browser);
}

// Stub tabbrowser implementation for use by the tab-modal alert code.
var gBrowser = {
    get selectedBrowser() {
        return document.getElementById("webext-panels-browser");
    },

    getTabForBrowser(browser) {
        return null;
    },

    getTabModalPromptBox(browser) {
        if (!browser.tabModalPromptBox) {
            browser.tabModalPromptBox = new TabModalPromptBox(browser);
        }
            return browser.tabModalPromptBox;
    },
};

window.addEventListener("DOMContentLoaded", () => {
    getBrowser("https://dothq.co").then(browser => {
        let uri = Services.io.newURI("https://dothq.co");
        let triggeringPrincipal = Services.scriptSecurityManager.getSystemPrincipal();
        browser.loadURI(uri.spec, { triggeringPrincipal });
    })
})
/**
@UCF @param {"prop":"JsChrome.load","ucfobj":true,"disable":true} @UCF
*/
({
    async init() {
        setUnloadMap(Symbol("unreadTabs"), this.destructor, this);
        gBrowser.tabContainer.addEventListener("TabSelect", this);
        await delayedStartupPromise;
        window.gReduceMotionOverride = false;
    },
    handleEvent({ target }) {
        if (target.hasAttribute("notselectedsinceload")) target.removeAttribute("notselectedsinceload");
    },
    destructor() {
        gBrowser.tabContainer.removeEventListener("TabSelect", this);
    },
}).init();

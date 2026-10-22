/**
@UCF @param {"prop":"JsChrome.DOMContentLoaded","ucfobj":true,"disable":true} @UCF
@UCF @param {"prop":"JsChrome.load","ucfobj":true,"disable":true} @UCF
*/
(async () => ({
    JsChrome_DOMContentLoaded() {
        window.gReduceMotionOverride = false;
    },
    JsChrome_load() {
        setUnloadMap(Symbol("unreadTabs"), this.destructor, this);
        gBrowser.tabContainer.addEventListener("TabSelect", this);
    },
    handleEvent({ target }) {
        target.setAttribute("notselectedsinceload", "false");
    },
    destructor() {
        gBrowser.tabContainer.removeEventListener("TabSelect", this);
    },
})[getProp]())();

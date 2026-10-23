/**
@UCF @param {"prop":"JsChrome.load","ucfobj":true,"disable":true} @UCF
*/
(async (
    delay = 3000, // Delayed hide
) => ({
    tid: null,
    init() {
        gBrowser.tabpanels.addEventListener("findbaropen", this);
        window.addEventListener("keydown", this, true);
        setUnloadMap(Symbol(), this.destructor, this);
    },
    TabClose: class {
        constructor(e) {
            this.tid = null;
            var findbar = this.findbar = e.target;
            var parent = this.parent = findbar.parentElement;
            setUnloadMap(this.symbol = Symbol(), this.destructor, this);
            parent.addEventListener("findbarclose", this);
            parent.addEventListener("mousedown", this);
            (this.tab = gBrowser.getTabForBrowser(findbar._browser)).addEventListener("TabClose", this);
        }
        destructor() {
            this.parent.removeEventListener("findbarclose", this);
            this.parent.removeEventListener("mousedown", this);
            this.tab.removeEventListener("TabClose", this);
        }
        handleEvent(e) {
            clearTimeout(this.tid);
            if (e.type === "mousedown") {
                if (e.target.closest?.("findbar") == this.findbar) return;
                this.tid = setTimeout(() => {
                    this.destructor();
                    getDelUnloadMap(this.symbol, true);
                    if (!this.findbar.hidden) this.findbar.close();
                }, delay);
                return;
            }
            this.destructor();
            getDelUnloadMap(this.symbol, true);
        }
    },
    keydown(e) {
        if (e.getModifierState("Control") && e.code === "KeyF" && !e.altKey && !e.shiftKey) {
            if (this.tid !== null) return e.preventDefault();
            this.tid = setTimeout(() => {
                this.tid = null;
            }, 1000);
            if (window.gFindBarInitialized && !gFindBar.hidden) {
                e.preventDefault();
                gFindBar.close();
            }
        }
    },
    findbaropen(e) {
        new this.TabClose(e);
    },
    handleEvent(e) {
        this[e.type](e);
    },
    destructor() {
        gBrowser.tabpanels.removeEventListener("findbaropen", this);
        window.removeEventListener("keydown", this, true);
    },
}).init())();

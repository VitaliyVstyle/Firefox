var PREF_BRANCH = "extensions.long_left_click.", extension, objectMap = new Map();
ChromeUtils.defineLazyGetter(this, "windowTracker", () => ChromeUtils.importESModule("resource://gre/modules/ExtensionParent.sys.mjs").ExtensionParent.apiManager.global.windowTracker);
ChromeUtils.defineLazyGetter(this, "CustomizableUI", () => {
    try {
        return ChromeUtils.importESModule("moz-src:///browser/components/customizableui/CustomizableUI.sys.mjs").CustomizableUI;
    } catch {
        return ChromeUtils.importESModule("resource:///modules/CustomizableUI.sys.mjs").CustomizableUI;
    }
});
var lgltck = {
    prefs: null,
    timeChrome: 500,
    backgroundCm: false,
    nextToCurrentCm: true,
    closeMenus: false,
    userContextId: false,
    enableChrome: true,
    enableContent: true,
    runningclick: false,
    get timer() {
        delete this.timer;
        return this.timer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
    },
    init() {
        var branch = Services.prefs.getDefaultBranch(PREF_BRANCH);
        branch.setBoolPref("enableChrome", true);
        branch.setBoolPref("enableContent", true);
        branch.setIntPref("timeContent", 500);
        branch.setIntPref("timeChrome", 500);
        branch.setBoolPref("backgroundCm", false);
        branch.setBoolPref("backgroundCnt", false);
        branch.setBoolPref("nextToCurrentCm", true);
        branch.setBoolPref("nextToCurrentCnt", true);
        branch.setBoolPref("referrer", true);
        branch.setBoolPref("enableImages", true);
        branch.setBoolPref("closeMenus", false);
        branch.setBoolPref("userContextId", false);
        var prefs = this.prefs = Services.prefs.getBranch(PREF_BRANCH);
        this.timeChrome = prefs.getIntPref("timeChrome");
        this.backgroundCm = prefs.getBoolPref("backgroundCm");
        this.nextToCurrentCm = prefs.getBoolPref("nextToCurrentCm");
        this.closeMenus = prefs.getBoolPref("closeMenus");
        this.userContextId = prefs.getBoolPref("userContextId");
        if (this.enableChrome = prefs.getBoolPref("enableChrome")) this.registerChrome();
        if (this.enableContent = prefs.getBoolPref("enableContent")) this.registerContent();
        Services.prefs.addObserver(PREF_BRANCH, this);
    },
    registerChrome() {
        this.loadWin_ = this.loadWin.bind(this);
        this.unloadWin_ = this.unloadWin.bind(this);
        windowTracker.addOpenListener(this.loadWin_);
        this.callWithEachWindow(win => this.loadWin_(win));
        windowTracker.addCloseListener(this.unloadWin_);
    },
    unregisterChrome() {
        windowTracker.removeOpenListener(this.loadWin_);
        windowTracker.removeCloseListener(this.unloadWin_);
        this.callWithEachWindow(win => this.unloadWin_(win));
    },
    loadWin(win) {
        var winId = windowTracker.getId(win);
        var obj = new longLClick(win);
        objectMap.set(winId, obj);
    },
    unloadWin(win) {
        var winId = windowTracker.getId(win);
        objectMap.get(winId).unload();
        objectMap.delete(winId);
    },
    async registerContent() {
        Services.io.getProtocolHandler("resource")
            .QueryInterface(Ci.nsIResProtocolHandler)
            .setSubstitution("long_left_click", Services.io.newURI(extension.resourceURL));
        ChromeUtils.registerWindowActor("LLCWinActor", {
            parent: {
                esModuleURI: "resource://long_left_click/LLCWinActorParent.mjs",
            },
            child: {
                esModuleURI: "resource://long_left_click/LLCWinActorChild.mjs",
                events: {
                    mousedown: { capture: true },
                    mouseup: { capture: true },
                    dragstart: { capture: true },
                    selectstart: { capture: true },
                },
            },
            allFrames: true,
            safeForUntrustedWebProcess: true,
            messageManagerGroups: ["browsers"],
        });
        CustomizableUI.createWidget({
            id: "l-clicks-image-page",
            label: extension.localeData.localizeMessage("cipLabel"),
            tooltiptext: extension.localeData.localizeMessage("cipTooltiptext"),
            localized: false,
            defaultArea: CustomizableUI.AREA_NAVBAR,
            onCreated(btn) {
                btn.style.setProperty("list-style-image", 'url("resource://long_left_click/svg/long-click.svg")', "important");
            },
            onCommand(e) {
                if (lgltck.runningclick) return;
                lgltck.runningclick = true;
                var win = e.view;
                win.gBrowser.selectedBrowser.browsingContext.currentWindowGlobal.getActor("LLCWinActor")
                    .sendQuery("LLCWinActor:getenableImages").then(state => {
                        lgltck.sendMessageToAll(win, "LLCWinActor:enableImages", { img: !state }, true);
                        lgltck.runningclick = false;
                    });
            }
        });
    },
    async unregisterContent() {
        ChromeUtils.unregisterWindowActor("LLCWinActor");
        CustomizableUI.destroyWidget("l-clicks-image-page");
        Services.io.getProtocolHandler("resource")
            .QueryInterface(Ci.nsIResProtocolHandler)
            .setSubstitution("long_left_click", null);
    },
    callWithEachWindow(func) {
        for (let win of windowTracker.browserWindows())
            try {
                func(win);
            } catch (e) {
                console.error(e);
            }
    },
    observe(subject, topic, pref) {
        ({
            "extensions.long_left_click.timeChrome": () => {
                var time = this.timeChrome = this.prefs.getIntPref("timeChrome");
                objectMap.forEach(obj => obj.setMouseDown(time));
            },
            "extensions.long_left_click.timeContent": () => {
                this.callWithEachWindow(win => this.sendMessageToAll(win, "LLCWinActor:timeContent", { time: this.prefs.getIntPref("timeContent") }));
            },
            "extensions.long_left_click.backgroundCm": () => {
                this.backgroundCm = this.prefs.getBoolPref("backgroundCm");
            },
            "extensions.long_left_click.backgroundCnt": () => {
                this.callWithEachWindow(win => this.sendMessageToAll(win, "LLCWinActor:backgroundCnt", { backg: this.prefs.getBoolPref("backgroundCnt") }));
            },
            "extensions.long_left_click.nextToCurrentCm": () => {
                this.nextToCurrentCm = this.prefs.getBoolPref("nextToCurrentCm");
            },
            "extensions.long_left_click.nextToCurrentCnt": () => {
                this.callWithEachWindow(win => this.sendMessageToAll(win, "LLCWinActor:nextToCurrentCnt", { next: this.prefs.getBoolPref("nextToCurrentCnt") }));
            },
            "extensions.long_left_click.referrer": () => {
                this.callWithEachWindow(win => this.sendMessageToAll(win, "LLCWinActor:referrer", { ref: this.prefs.getBoolPref("referrer") }));
            },
            "extensions.long_left_click.enableImages": () => {
                this.callWithEachWindow(win => this.sendMessageToAll(win, "LLCWinActor:enableImages", { img: this.prefs.getBoolPref("enableImages") }));
            },
            "extensions.long_left_click.closeMenus": () => {
                this.closeMenus = this.prefs.getBoolPref("closeMenus");
            },
            "extensions.long_left_click.userContextId": () => {
                this.userContextId = this.prefs.getBoolPref("userContextId");
            },
            "extensions.long_left_click.enableChrome": () => {
                if (this.enableChrome = this.prefs.getBoolPref("enableChrome")) this.registerChrome();
                else this.unregisterChrome();
            },
            "extensions.long_left_click.enableContent": () => {
                if (this.enableContent = this.prefs.getBoolPref("enableContent")) this.registerContent();
                else this.unregisterContent();
            },
        })[pref]?.();
    },
    sendMessageToAll(win, message, data, selected = false) {
        var browsers = !selected ? win.gBrowser.browsers : [win.gBrowser.selectedBrowser];
        for (let browser of browsers) {
            let contextsToVisit = [browser.browsingContext];
            while (contextsToVisit.length) {
                let currentContext = contextsToVisit.pop();
                let global = currentContext?.currentWindowGlobal;
                if (!global) continue;
                let actor = global.getActor("LLCWinActor");
                actor.sendAsyncMessage(message, data);
                contextsToVisit.push(...currentContext.children);
            }
        }
    },
    getPref(name) {
        var type = Services.prefs.getPrefType(name);
        switch (type) {
            case Services.prefs.PREF_BOOL:
                return Services.prefs.getBoolPref(name);
            case Services.prefs.PREF_INT:
                return Services.prefs.getIntPref(name);
            case Services.prefs.PREF_STRING:
                return Services.prefs.getStringPref(name);
        }
    },
    setPref(name, value) {
        var type = Services.prefs.getPrefType(name);
        switch (type) {
            case Services.prefs.PREF_BOOL:
                Services.prefs.setBoolPref(name, value);
                break;
            case Services.prefs.PREF_INT:
                Services.prefs.setIntPref(name, value);
                break;
            case Services.prefs.PREF_STRING:
                Services.prefs.setStringPref(name, value);
                break;
        }
    },
    uninit() {
        if (this.enableChrome) this.unregisterChrome();
        if (this.enableContent) this.unregisterContent();
        Services.prefs.removeObserver(PREF_BRANCH, this);
    }
};
class longLClick {
    constructor(win) {
        this.win = win;
        this.handle_ = this.handle.bind(this);
        var arrayelem = this.arrayelem = win.document.querySelectorAll("toolbar,#sidebar-box,#st_toolbox,popupset#mainPopupSet");
        for (let elem of arrayelem)
            ["mousedown", "mouseup", "dragstart"].forEach(type => elem.addEventListener(type, this, true));
    }
    openLink(e, node) {
        var link;
        this.options = { once: true, capture: true };
        if (node.matches(":is(menupopup,panel,#PlacesToolbarItems) :scope:is(menuitem,toolbarbutton)")) {
            if (node._placesNode?.type === Ci.nsINavHistoryResultNode.RESULT_TYPE_URI) link = node._placesNode.uri;
            else if (node.hasAttribute("targetURI")) link = node.getAttribute("targetURI");
            this.options.mozSystemGroup = true;
        } else if (node.matches("treechildren.sidebar-placesTreechildren")) {
            let tree = node.parentElement, cell = tree.getCellAt(e.clientX, e.clientY);
            if (cell.row === -1 || cell.childElt === "twisty") return;
            let row = tree.view.nodeForTreeIndex(cell.row);
            if (row.type === Ci.nsINavHistoryResultNode.RESULT_TYPE_URI) link = row.uri;
        } else if (node.matches("[id^='fxview-tab-row-']")) {
            let a = node.parentElement;
            if (a.matches(":any-link")) link = a.href;
        } else return;
        if (!link || link.startsWith("javascript:")) return;
        this.addListeners();
        var { gBrowser } = this.win;
        var { selectedTab } = gBrowser;
        var params = {
            triggeringPrincipal: Services.scriptSecurityManager.getSystemPrincipal(),
            userContextId: lgltck.userContextId ? selectedTab.userContextId : 0,
        };
        params.index = params.tabIndex = lgltck.nextToCurrentCm ? ((selectedTab.index ?? selectedTab._tPos) + 1) : null;
        var tab = gBrowser.addTab(link, params);
        if (!lgltck.backgroundCm) gBrowser.selectedTab = tab;
    }
    handle(e) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        this.delListeners_ = null;
        if (this.options.mozSystemGroup && lgltck.closeMenus) this.hidePopup(e.target);
    }
    addListeners() {
        this.win.addEventListener("click", this.handle_, this.options);
        this.win.addEventListener("mouseup", this.handle_, this.options);
        this.delListeners_ = this.delListeners;
    }
    delListeners() {
        this.win.removeEventListener("click", this.handle_, this.options);
        this.win.removeEventListener("mouseup", this.handle_, this.options);
        this.delListeners_ = null;
    }
    hidePopup(elm, loc) {
        if (!elm || typeof elm !== "object" || (loc = elm.localName) === "toolbar") return;
        if (loc === "menupopup" || loc === "panel") elm.hidePopup();
        this.hidePopup(elm.parentElement);
    }
    handleEvent(e) {
        this[e.type](e);
    }
    mouseup(e) {
        if (e.button) return;
        lgltck.timer.cancel();
    }
    dragstart(e) {
        this.delListeners_?.();
        if (e.button) return;
        lgltck.timer.cancel();
    }
    setMouseDown(time) {
        this.mousedown = time > 50 ? this.mousedown_ : this.mousedown__;
    }
    mousedown(e) {
        this.mousedown = lgltck.timeChrome > 50 ? this.mousedown_ : this.mousedown__;
        this.mousedown(e);
    }
    mousedown_(e) {
        this.delListeners_?.();
        if (e.button) return;
        lgltck.timer.cancel();
        if (e.shiftKey || e.altKey || e.ctrlKey) return;
        var node = e.composedTarget || e.target;
        if (!node) return;
        lgltck.timer.initWithCallback(() => this.openLink(e, node), lgltck.timeChrome, Ci.nsITimer.TYPE_ONE_SHOT);
    }
    mousedown__(e) {
        this.delListeners_?.();
        if (e.button) return;
        lgltck.timer.cancel();
        if (e.shiftKey || e.altKey || e.ctrlKey) return;
        var node = e.composedTarget || e.target;
        if (!node) return;
        this.openLink(e, node);
    }
    unload() {
        this.delListeners_?.();
        for (let elem of this.arrayelem)
            ["mousedown", "mouseup", "dragstart"].forEach(type => elem.removeEventListener(type, this, true));
    }
}
this.LongLeftClick = class extends ExtensionAPI {
    onStartup() {
        extension = this.extension;
        lgltck.init();
    }
    onShutdown(reason) {
        if (reason !== "APP_SHUTDOWN") lgltck.uninit();
    }
    getAPI() {
        return {
            LongLeftClick: {
                getPref(arr) {
                    return arr.map(name => [name, lgltck.getPref(name)]);
                },
                setPref(arr) {
                    arr.forEach(nv => lgltck.setPref(nv[0], nv[1]));
                }
            }
        };
    }
};

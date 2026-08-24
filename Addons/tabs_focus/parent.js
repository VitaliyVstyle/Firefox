var PREF_BRANCH = "extensions.tabs_focus.", objectMap = new Map();
ChromeUtils.defineLazyGetter(this, "windowTracker", () => ChromeUtils.importESModule("resource://gre/modules/ExtensionParent.sys.mjs")
    .ExtensionParent.apiManager.global.windowTracker);
var tabs_focus = {
    delay: 150,
    returndelay: 50,
    previewmode: false,
    clickreloadtab: false,
    init() {
        var branch = Services.prefs.getDefaultBranch(PREF_BRANCH);
        branch.setIntPref("delay", 150);
        branch.setBoolPref("previewmode", false);
        branch.setIntPref("returndelay", 50);
        branch.setBoolPref("clickreloadtab", false);
        var prefs = this.prefs = Services.prefs.getBranch(PREF_BRANCH);
        var delay = prefs.getIntPref("delay");
        if (delay < 10) prefs.setIntPref("delay", (delay = 150));
        this.delay = delay;
        var returndelay = prefs.getIntPref("returndelay");
        if (returndelay < 5) prefs.setIntPref("returndelay", (returndelay = 50));
        this.returndelay = returndelay;
        this.previewmode = prefs.getBoolPref("previewmode");
        this.clickreloadtab = prefs.getBoolPref("clickreloadtab");
        this.loadWin = this.loadWin.bind(this);
        this.unloadWin = this.unloadWin.bind(this);
        windowTracker.addOpenListener(this.loadWin);
        this.eachWin(win => this.loadWin(win));
        windowTracker.addCloseListener(this.unloadWin);
        Services.prefs.addObserver(PREF_BRANCH, this);
    },
    loadWin(win) {
        var winId = windowTracker.getId(win);
        var obj = new Tabsfocus(win);
        objectMap.set(winId, obj);
    },
    unloadWin(win) {
        var winId = windowTracker.getId(win);
        objectMap.get(winId).unload(this.previewmode);
        objectMap.delete(winId);
    },
    eachWin(func) {
        for (let win of windowTracker.browserWindows())
            try {
                func(win);
            } catch(e) {
                console.error(e);
            }
    },
    observe(subject, topic, pref) {
        ({
            "extensions.tabs_focus.delay": () => {
                var delay = this.prefs.getIntPref("delay");
                if (delay < 10) this.prefs.setIntPref("delay", (delay = 150));
                this.delay = delay;
            },
            "extensions.tabs_focus.returndelay": () => {
                var returndelay = this.prefs.getIntPref("returndelay");
                if (returndelay < 5) this.prefs.setIntPref("returndelay", (returndelay = 50));
                this.returndelay = returndelay;
            },
            "extensions.tabs_focus.previewmode": () => {
                var oldprevmode = this.previewmode;
                var newprevmode = this.prefs.getBoolPref("previewmode");
                for (let [winId, obj] of objectMap) {
                    obj.unload(oldprevmode);
                    obj.load(newprevmode);
                }
                this.previewmode = newprevmode;
            },
            "extensions.tabs_focus.clickreloadtab": () => {
                this.clickreloadtab = this.prefs.getBoolPref("clickreloadtab");
            }
        })[pref]?.();
    },
    GetPref(name) {
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
    SetPref(name, value) {
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
        windowTracker.removeOpenListener(this.loadWin);
        windowTracker.removeCloseListener(this.unloadWin);
        this.eachWin(win => this.unloadWin(win));
        Services.prefs.removeObserver(PREF_BRANCH, this);
    }
};
class Tabsfocus {
    constructor(win) {
        this.tid = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
        this.type = this.tid.TYPE_ONE_SHOT;
        var gb = this.gb = win.gBrowser;
        this.tabs = gb.tabContainer;
        this.reload = win.document.querySelector("commandset#mainCommandSet > command[id='Browser:Reload']");
        this.load(tabs_focus.previewmode);
    }
    load(pmode = false) {
        var {tabs} = this;
        if (!pmode) {
            this.__onMouseIn = this.onMouseIn;
            this.__onMouseOut = this.onMouseOut;
            this.__onMouseDown = this.onMouseDown;
        } else {
            this.pwTid = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
            this.__onMouseIn = this._onMouseIn;
            this.__onMouseOut = this._onMouseOut;
            this.__onMouseDown = this._onMouseDown;
            this._onTabCloseHide = this.onTabCloseHide.bind(this);
            tabs.addEventListener("TabClose", this._onTabCloseHide);
            tabs.addEventListener("TabHide", this._onTabCloseHide);
            this._onTabSelect = this.onTabSelect.bind(this);
            tabs.addEventListener("TabSelect", this._onTabSelect);
            this.pwTab = this.gb.selectedTab;
        }
        this.__onMouseIn = this.__onMouseIn.bind(this);
        tabs.addEventListener("mouseover", this.__onMouseIn);
        this.__onMouseOut = this.__onMouseOut.bind(this);
        tabs.addEventListener("mouseout", this.__onMouseOut);
        this.__onMouseDown = this.__onMouseDown.bind(this);
        tabs.addEventListener("mousedown", this.__onMouseDown, true);
    }
    unload(pmode = false) {
        var {tabs} = this;
        tabs.removeEventListener("mouseover", this.__onMouseIn);
        tabs.removeEventListener("mouseout", this.__onMouseOut);
        tabs.removeEventListener("mousedown", this.__onMouseDown, true);
        if (!pmode) return;
        tabs.removeEventListener("TabClose", this._onTabCloseHide);
        tabs.removeEventListener("TabHide", this._onTabCloseHide);
        tabs.removeEventListener("TabSelect", this._onTabSelect);
    }
    callback(e) {
        var tab = e.target.closest?.("tab:not([selected])");
        if (tab) this.gb.selectedTab = tab;
    }
    previewCallback() {
        this.gb.selectedTab = this.pwTab;
    }
    onMouseIn(e) {
        this.tid.initWithCallback(() => this.callback(e), tabs_focus.delay, this.type);
    }
    _onMouseIn(e) {
        this.pwTid.cancel();
        this.tid.initWithCallback(() => this.callback(e), tabs_focus.delay, this.type);
    }
    onMouseOut() {
        this.tid.cancel();
    }
    _onMouseOut() {
        this.tid.cancel();
        this.pwTid.initWithCallback(() => this.previewCallback(), tabs_focus.returndelay, this.type);
    }
    onMouseDown(e) {
        this.tid.cancel();
        var tab = e.target.closest?.("tab[selected]");
        if (!tab) return;
        if (tabs_focus.clickreloadtab && e.button === 0
            && e.composedTarget.matches("tab :not(toolbarbutton, image:not(.tab-icon-image)):scope")) this.reload.doCommand();
    }
    _onMouseDown(e) {
        this.tid.cancel();
        this.pwTid.cancel();
        var tab = e.target.closest?.("tab[selected]");
        if (!tab) return;
        if (tabs_focus.clickreloadtab && e.button === 0 && this.pwTab == tab
            && e.composedTarget.matches("tab :not(toolbarbutton, image:not(.tab-icon-image)):scope")) this.reload.doCommand();
        this.pwTab = tab;
    }
    onTabCloseHide(e) {
        if (e.target == this.pwTab) this.pwTab = this.gb.selectedTab;
    }
    onTabSelect(e) {
        if (!this.tid.callback) this.pwTab = e.target;
    }
}

this.TabsFocus = class extends ExtensionAPI {
    onStartup() {
        tabs_focus.init();
    }
    onShutdown(reason) {
        if (reason !== "APP_SHUTDOWN") tabs_focus.uninit();
    }
    getAPI() {
        return {
            TabsFocus: {
                getPref(arr) {
                    return arr.map(name => [name, tabs_focus.GetPref(name)]);
                },
                setPref(arr) {
                    arr.forEach(nv => tabs_focus.SetPref(nv[0], nv[1]));
                }
            }
        };
    }
};

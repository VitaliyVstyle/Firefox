
const chromeUrl = "chrome://ucf-url/content/ucf/";
const dataUrl = "chrome://ucf-url/content/data/";
const { UcfPrefs } = ChromeUtils.importESModule(`${chromeUrl}UcfPrefs.mjs`);
ChromeUtils.defineLazyGetter(this, "UcfSSS", () => Cc["@mozilla.org/content/style-sheet-service;1"].getService(Ci.nsIStyleSheetService));
ChromeUtils.defineLazyGetter(this, "VER", () => parseInt(Services.appinfo.platformVersion));
ChromeUtils.defineLazyGetter(this, "OS", () => {
    var { OS } = Services.appinfo;
    switch (OS) {
        case "Linux":
            return "linux";
        case "WINNT":
            return "windows";
        case "Darwin":
            return "macos";
        default:
            return OS.toLowerCase();
    }
});
const ucf = {
    get css_all_chrome() {
        this.initCustom();
        UcfPrefs.initAboutPrefs("prefs_tb.xhtml", "ucf-url");
        UcfPrefs.initAboutPrefs("data.xhtml", "ucf-url-data", true);
        delete this.css_all_chrome;
        return this.css_all_chrome = UcfPrefs.prefs.css_all_chrome;
    },
    get css_chrome() {
        delete this.css_chrome;
        return this.css_chrome = UcfPrefs.prefs.css_chrome;
    },
    get customSandbox() {
        delete this.customSandbox;
        var scope = this.customSandbox = Cu.Sandbox(Services.scriptSecurityManager.getSystemPrincipal(), {
            sandboxName: "UCF:JsBackground",
            wantComponents: true,
            wantExportHelpers: true,
            freezeBuiltins: false,
            sandboxPrototype: UcfPrefs.global,
        });
        scope.UcfPrefs = UcfPrefs;
        scope.getProp = "JsBackground";
        ChromeUtils.defineESModuleGetters(scope, {
            XPCOMUtils: "resource://gre/modules/XPCOMUtils.sys.mjs",
            AddonManager: "resource://gre/modules/AddonManager.sys.mjs",
            ExtensionParent: "resource://gre/modules/ExtensionParent.sys.mjs",
            AppConstants: "resource://gre/modules/AppConstants.sys.mjs",
            E10SUtils: "resource://gre/modules/E10SUtils.sys.mjs",
            FileUtils: "resource://gre/modules/FileUtils.sys.mjs",
            PlacesUtils: "resource://gre/modules/PlacesUtils.sys.mjs",
        });
        ChromeUtils.defineLazyGetter(scope, "CustomizableUI", () => {
            try {
                return ChromeUtils.importESModule("moz-src:///browser/components/customizableui/CustomizableUI.sys.mjs").CustomizableUI;
            } catch {
                return ChromeUtils.importESModule("resource:///modules/CustomizableUI.sys.mjs").CustomizableUI;
            }
        });
        ChromeUtils.defineLazyGetter(scope, "console", () => UcfPrefs.global.console.createInstance({
            prefix: "UCF:JsBackground",
        }));
        return scope;
    },
    async _CssAllChrome(prefs) {
        UcfPrefs._CssAllChrome = UcfPrefs.global.structuredClone(prefs.CssAllChrome).filter(p => {
            var { disable, path, isos, ver } = p;
            if (!disable && (!isos || isos.includes(OS)) && (!ver || (!ver.min || ver.min <= VER) && (!ver.max || ver.max >= VER))) {
                p.path = `${dataUrl}${path}`;
                this.preloadSheet(p);
                return true;
            }
        });
    },
    async _CssChrome(prefs) {
        UcfPrefs._CssChrome = UcfPrefs.global.structuredClone(prefs.CssChrome).filter(p => {
            var { disable, path, isos, ver } = p;
            if (!disable && (!isos || isos.includes(OS)) && (!ver || (!ver.min || ver.min <= VER) && (!ver.max || ver.max >= VER))) {
                p.path = `${dataUrl}${path}`;
                this.preloadSheet(p);
                return true;
            }
        });
    },
    async _CssAllFrame(prefs) {
        UcfPrefs._CssAllFrame = UcfPrefs.global.structuredClone(prefs.CssAllFrame).filter(p => {
            var { disable, path, type, isos, ver } = p;
            if (!disable && (!isos || isos.includes(OS)) && (!ver || (!ver.min || ver.min <= VER) && (!ver.max || ver.max >= VER))) {
                this.registerSheet(p.path = `${dataUrl}${path}`, type);
                return true;
            }
        });
    },
    async _JsChrome(prefs) {
        var pfs = UcfPrefs._JsChrome = UcfPrefs.global.structuredClone(prefs.JsChrome);
        for (let type in pfs)
            UcfPrefs._JsChrome[type] = pfs[type].filter(p => {
                var { disable, path, isos, ver } = p;
                if (!disable && (!isos || isos.includes(OS)) && (!ver || (!ver.min || ver.min <= VER) && (!ver.max || ver.max >= VER))) {
                    try {
                        p.path = `${dataUrl}${path}`;
                        return true;
                    } catch (e) { Cu.reportError(e); }
                }
            });
    },
    async _JsAllChrome(prefs) {
        var pfs = UcfPrefs._JsAllChrome = UcfPrefs.global.structuredClone(prefs.JsAllChrome);
        for (let type in pfs)
            UcfPrefs._JsAllChrome[type] = pfs[type].filter(p => {
                var { disable, path, isos, ver, urlregxp } = p;
                if (!disable && (!isos || isos.includes(OS)) && (!ver || (!ver.min || ver.min <= VER) && (!ver.max || ver.max >= VER))) {
                    try {
                        p.path = `${dataUrl}${path}`;
                        p.urlregxp &&= new RegExp(urlregxp);
                        return true;
                    } catch (e) { Cu.reportError(e); }
                }
            });
    },
    _addObs() {
        Services.obs.addObserver(this, "domwindowopened");
    },
    _removeObs() {
        Services.obs.removeObserver(this, "domwindowopened");
    },
    init() {
        delete this.init;
        this._addObs();
        UcfPrefs.manifestPath = manifestPath;
        UcfPrefs._initPrefs;
        var { prefs } = UcfPrefs;
        if (prefs.safemode || !Services.appinfo.inSafeMode) {
            UcfPrefs._ucf = this;
            if (prefs.css_chrome) this._CssChrome(prefs);
            if (prefs.css_all_chrome) this._CssAllChrome(prefs);
            if (prefs.css_all_frame) this._CssAllFrame(prefs);
            if (prefs.js_chrome) this._JsChrome(prefs);
            if (prefs.js_all_chrome) this._JsAllChrome(prefs);
            if (prefs.css_js_content) {
                let cssjs = UcfPrefs._CssJsContent = {};
                cssjs.CssContent = UcfPrefs.global.structuredClone(prefs.CssContent).filter(p => {
                    var { disable, path, isos, ver } = p;
                    if (!disable && (!isos || isos.includes(OS)) && (!ver || (!ver.min || ver.min <= VER) && (!ver.max || ver.max >= VER))) {
                        p.path = `${dataUrl}${path}`;
                        return true;
                    }
                });
                let pfs = cssjs.JsContent = UcfPrefs.global.structuredClone(prefs.JsContent);
                for (let type in pfs)
                    cssjs.JsContent[type] = pfs[type].filter(p => {
                        var { disable, path, isos, ver, urlregxp } = p;
                        if (!disable && (!isos || isos.includes(OS)) && (!ver || (!ver.min || ver.min <= VER) && (!ver.max || ver.max >= VER))) {
                            try {
                                p.path = `${dataUrl}${path}`;
                                p.urlregxp &&= new RegExp(urlregxp);
                                return true;
                            } catch (e) { Cu.reportError(e); }
                        }
                    });
                let actorOptions = {
                    parent: {
                        esModuleURI: `${chromeUrl}UcfWinActorParent.mjs`,
                    },
                    child: {
                        esModuleURI: `${chromeUrl}UcfWinActorChild.mjs`,
                        events: {
                            DOMWindowCreated: { capture: true },
                            DOMContentLoaded: {},
                            pageshow: {},
                        },
                    },
                    allFrames: true,
                    safeForUntrustedWebProcess: true,
                };
                let group = prefs.css_js_content_groups;
                if (group.length) actorOptions.messageManagerGroups = group;
                let matches = prefs.css_js_content_matches;
                if (matches.length) actorOptions.matches = matches;
                ChromeUtils.registerWindowActor("UcfWinActor", actorOptions);
            }
        } else {
            prefs.js_background = false;
            prefs.js_chrome = false;
            prefs.js_all_chrome = false;
            prefs.css_all_chrome = false;
            prefs.css_all_frame = false;
            prefs.css_js_content = false;
        }
    },
    async preloadSheet(p) {
        p.type = UcfSSS[p.type];
        p.sheet = async function () {
            this.sheet = async func => func(await this._preload, this.type);
            this._preload = (async () => {
                try {
                    return this._preload = await UcfSSS.preloadSheetAsync(Services.io.newURI(this.path), this.type);
                } catch {
                    this.sheet = await (() => { });
                    return this._preload = await null;
                }
            })();
        };
        p.sheet();
    },
    async registerSheet(path, type) {
        var uri = Services.io.newURI(path), t = UcfSSS[type];
        if (!UcfSSS.sheetRegistered(uri, t)) UcfSSS.loadAndRegisterSheet(uri, t);
        return uri;
    },
    unregisterSheet(uri, type) {
        var t = UcfSSS[type];
        if (UcfSSS.sheetRegistered(uri, t)) UcfSSS.unregisterSheet(uri, t);
    },
    observe(win, topic, data) {
        new UCF(win);
    },
    async initCustom() {
        delete this.initCustom;
        var enable = UcfPrefs.prefs.js_background;
        var { loadSubScript } = Services.scriptloader;
        UcfPrefs._JsBackground = UcfPrefs.global.structuredClone(UcfPrefs.prefs.JsBackground).filter(p => {
            var { disable, force, path, isos, ver, module } = p;
            if ((enable || force) && !disable && (!isos || isos.includes(OS)) && (!ver || (!ver.min || ver.min <= VER) && (!ver.max || ver.max >= VER))) {
                try {
                    let scope = this.customSandbox;
                    path = p.path = `${dataUrl}${path}`;
                    switch (!module || Object.prototype.toString.call(module).slice(8, -1)) {
                        case true:
                            loadSubScript(path, scope);
                            break;
                        case "Object":
                            if (module.parent) module.parent.esModuleURI = path;
                            if (module.child) module.child.esModuleURI = path;
                            ChromeUtils.registerWindowActor(module.name || path.replace(/^.+\/([^\.]+).+/, "$1"), module);
                            break;
                        case "Array":
                            let mod = ChromeUtils.importESModule(path);
                            for (let str of module) {
                                let md = mod;
                                for (let m of str.split("."))
                                    md = md[m];
                                md(scope, path);
                            }
                            break;
                        case "Boolean":
                            if (/\.mjs$/.test(path)) ChromeUtils.importESModule(path);
                            break;
                    }
                    return true;
                } catch (e) { Cu.reportError(e); }
            }
        });
    },
};
class UCF {
    constructor(win) {
        this.win = win;
        win.windowRoot.addEventListener("DOMDocElementInserted", this);
    }
    handleEvent(e) {
        var w = e.target.defaultView, { href } = w.location;
        if (this.win == w) {
            this.handleEvent = this.handle;
            w.addEventListener("unload", () => this.win.windowRoot.removeEventListener("DOMDocElementInserted", this), { once: true });
        }
        if (!w.isChromeWindow || href === "about:blank") return;
        new InitWin(w, href);
    }
    handle(e) {
        var w = e.target.defaultView, { href } = w.location;
        if (!w.isChromeWindow || href === "about:blank") return;
        new InitWin(w, href);
    }
}
class InitWin {
    constructor(win, href) {
        if ((this.principal = win.document.nodePrincipal).isSystemPrincipal) win.UcfPrefs = UcfPrefs;
        this.win = win;
        if (ucf.css_all_chrome) this.addCssAllChrome(win.windowUtils.addSheet);
        if (href === "chrome://messenger/content/messenger.xhtml") {
            if (ucf.css_chrome) this.addCssChrome(win.windowUtils.addSheet);
            win.addEventListener("DOMContentLoaded", async e => {
                var [{ value }] = await UcfPrefs.l10nFormatMessages("ucf/locales", "main.ftl", ["ucf-open-about-config-button"]);
                var icon = `${chromeUrl}svg/prefs.svg`;
                win.document.querySelector("menuitem#addonsManager")?.after((() => {
                    var mitem = win.document.createXULElement("menuitem");
                    mitem.setAttribute("label", value);
                    mitem.id = "ucf-open-about-config-mitem";
                    mitem.className = "menuitem-iconic";
                    mitem.style.cssText = `--menuitem-icon:url("${icon}");list-style-image:url("${icon}");-moz-context-properties:fill,stroke,fill-opacity;stroke:currentColor;fill-opacity:var(--toolbarbutton-icon-fill-opacity,.8);`;
                    mitem.addEventListener("command", e => UcfPrefs.openHavingURI(e.view, "about:ucf-url", true));
                    return mitem;
                })());
                win.document.querySelector("toolbarbutton#appmenu_addons")?.after((() => {
                    var btn = win.document.createXULElement("toolbarbutton");
                    btn.setAttribute("label", value);
                    btn.id = "ucf-open-about-config-btn";
                    btn.className = "subviewbutton subviewbutton-iconic";
                    btn.style.cssText = `list-style-image:url("${icon}");`;
                    btn.addEventListener("command", e => UcfPrefs.openHavingURI(e.view, "about:ucf-url", true));
                    return btn;
                })());
            }, { once: true });
            if (UcfPrefs.prefs.js_chrome) {
                this.prop = "JsChrome_DOMContentLoaded";
                win.addEventListener("DOMContentLoaded", e => this.addJsChrome(e.type), { once: true });
                win.addEventListener("load", e => {
                    this.prop = "JsChrome_load";
                    if (this.isObj) this.obj.getProp = "JsChrome_load";
                    this.addJsChrome("load");
                }, { once: true });
            }
        }
        if (UcfPrefs.prefs.js_all_chrome) {
            this.propAll = "JsAllChrome_DOMContentLoaded";
            win.addEventListener("DOMContentLoaded", e => this.addJsAllChrome(e.type, href), { once: true });
            win.addEventListener("load", e => {
                this.propAll = "JsAllChrome_load";
                if (this.isObjAll) this.objAll.getProp = "JsAllChrome_load";
                this.addJsAllChrome("load", href);
            }, { once: true });
        }
    }
    get obj() {
        var { win, principal, prop } = this, ob = (new CreateObj(win, principal, "ucf_js_chrome_win", "UCF:JsChrome", prop)).obj;
        Object.defineProperty(this, "obj", { configurable: true, writable: true, value: ob, });
        this.isObj = true;
        return ob;
    }
    get objAll() {
        var { win, principal, propAll } = this, ob = (new CreateObj(win, principal, "ucf_js_all_chrome_win", "UCF:JsAllChrome", propAll)).obj;
        Object.defineProperty(this, "objAll", { configurable: true, writable: true, value: ob, });
        this.isObjAll = true;
        return ob;
    }
    async addCssAllChrome(func) {
        for (let p of UcfPrefs._CssAllChrome)
            p.sheet(func);
    }
    async addCssChrome(func) {
        for (let p of UcfPrefs._CssChrome)
            p.sheet(func);
    }
    addJsChrome(type) {
        var { loadSubScript } = Services.scriptloader;
        for (let { ucfobj, path } of UcfPrefs._JsChrome[type]) {
            try {
                loadSubScript(path, ucfobj ? this.obj : this.win);
            } catch (e) { Cu.reportError(e); }
        }
    }
    addJsAllChrome(type, href) {
        var { loadSubScript } = Services.scriptloader;
        for (let { urlregxp, ucfobj, path } of UcfPrefs._JsAllChrome[type]) {
            try {
                if (!urlregxp || urlregxp.test(href)) loadSubScript(path, ucfobj ? this.objAll : this.win);
            } catch (e) { Cu.reportError(e); }
        }
    }
}
class CreateObj {
    constructor(win, principal, defineAs, sandboxName, prop = "", ob) {
        var opts = {
            sandboxName,
            wantComponents: true,
            wantExportHelpers: true,
            wantXrays: true,
            freezeBuiltins: false,
            sameZoneAs: win,
            sandboxPrototype: win,
        };
        var addListener = () => {
            addListener = () => { }
            win.addEventListener("unload", this.destructor.bind(this), { once: true });
        };
        if (principal.isSystemPrincipal) {
            ob = Cu.createObjectIn(win, { defineAs });
            ChromeUtils.defineLazyGetter(ob, "sandboxWinSysPrincipal", () => {
                var sandbox = Cu.Sandbox(principal, opts);
                Object.defineProperty(sandbox.Function.prototype, "toSource", { configurable: true, writable: true, value: win.Function.prototype.toSource });
                Object.defineProperty(sandbox.Object.prototype, "toSource", { configurable: true, writable: true, value: win.Object.prototype.toSource });
                Object.defineProperty(sandbox.Array.prototype, "toSource", { configurable: true, writable: true, value: win.Array.prototype.toSource });
                this.isSandboxSys = true;
                addListener();
                return sandbox;
            });
        } else {
            opts.wantComponents = false;
            ob = Cu.Sandbox([principal], opts);
            this.isSandboxExp = true;
            addListener();
        }
        ob.getProp = prop;
        Cu.exportFunction((...args) => {
            this.unloadMap = new Map();
            Cu.exportFunction(this.setMap.bind(this), ob, { defineAs: "setUnloadMap" });
            addListener();
            this.setMap(...args);
        }, ob, { defineAs: "setUnloadMap" });
        Cu.exportFunction(this.getMap.bind(this), ob, { defineAs: "getDelUnloadMap" });
        this.obj = ob;
    }
    setMap(key, func, context) {
        this.unloadMap.set(key, { func, context });
    }
    getMap(key, del) {
        var val = this.unloadMap.get(key);
        if (val && del) this.unloadMap.delete(key);
        return val;
    }
    destructor() {
        this.unloadMap.forEach((val, key) => {
            try { val.func.call(val.context, key); } catch (e) { Cu.reportError(e); }
        });
        this.unloadMap.clear();
        if (this.isSandboxSys) {
            Cu.nukeSandbox(this.obj.sandboxWinSysPrincipal);
            this.obj.sandboxWinSysPrincipal = null;
        }
        if (this.isSandboxExp) Cu.nukeSandbox(this.obj);
        this.unloadMap = this.obj = null;
    }
}
ucf.init();

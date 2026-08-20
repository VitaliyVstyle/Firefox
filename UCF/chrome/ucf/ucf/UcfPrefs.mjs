
export var UcfPrefs = {
    default: {
        // ▼ Default settings ▼
        toolbars_enable: true,
        t_enable: true,
        t_collapsed: false,
        t_next_navbar: true,
        t_autohide: false,
        t_showdelay: 300,
        t_hidedelay: 2000,
        t_hoversel: "#nav-bar",
        v_enable: true,
        v_collapsed: false,
        v_bar_start: true,
        v_autohide: false,
        v_mouseenter_sidebar: true,
        v_fullscreen: true,
        v_showdelay: 300,
        v_hidedelay: 2000,
        b_enable: true,
        b_collapsed: false,
        safemode: false,
        css_js_content: false,
        css_js_content_groups: ["browsers"],
        css_js_content_matches: ["about:*", "moz-extension://*", "chrome://*"],
        css_all_chrome: true,
        css_all_frame: false,
        js_background: false,
        js_chrome: true,
        js_all_chrome: false,
        editor_path: "",
        editor_args: "",
        folder_editor_path: "",
        folder_editor_args: "",
        CssAllChrome: [],
        CssAllFrame: [],
        CssContent: [],
        JsBackground: [],
        JsChrome: {
            DOMContentLoaded: [],
            load: [],
        },
        JsAllChrome: {
            DOMContentLoaded: [],
            load: [],
        },
        JsContent: {
            DOMWindowCreated: [],
            DOMContentLoaded: [],
            pageshow: [],
        },
        // ▲ Default settings ▲
    },
    prefs: {},
    TOPIC_PREFS: "ucf-topic-prefs",
    _l10nMap: new Map(),
    get global() {
        delete this.global;
        return this.global = globalThis;
    },
    get customSandbox() {
        delete this.customSandbox;
        return this.customSandbox = this._ucf?.customSandbox;
    },
    get dbg() { // by Dumby
        delete this.dbg;
        var sandbox = Cu.Sandbox(Cu.getObjectPrincipal(this), { freshCompartment: true });
        Cc["@mozilla.org/jsdebugger;1"].createInstance(Ci.IJSDebugger).addClass(sandbox);
        var dbg = new sandbox.Debugger();
        var g = globalThis;
        var gref = dbg.gref = dbg.makeGlobalObjectReference(g);
        var envRef = function (name) {
            var val = this.find(name).getVariable(name);
            return val.unsafeDereference?.() || val;
        }
        dbg.ref = (arg, func, glob) => {
            var go = glob === undefined ? g : glob || Cu.getGlobalForObject(func);
            var has = dbg.hasDebuggee(go);
            has || dbg.addDebuggee(go);
            try {
                var ref = go == g ? gref : dbg.makeGlobalObjectReference(go);
                var env = ref.makeDebuggeeValue(func).environment;

                var cn = arg.constructor.name;
                if (cn == "Object") for (var name in arg) try {
                    env.find(name).setVariable(name, ref.makeDebuggeeValue(arg[name]));
                } catch (err) { Cu.reportError(err); }

                else return cn == "Array" ? arg.map(envRef, env) : envRef.call(env, arg);
            } catch (ex) { Cu.reportError(ex); } finally { has || dbg.removeDebuggee(go); }
        }
        return this.dbg = dbg;
    },
    get prefsPath() {
        delete this.prefsPath;
        return this.prefsPath = this.manifestPath.replace(/ucf\.manifest$/, "prefs.json");
    },
    get alertsService() {
        delete this.alertsService;
        return this.alertsService = Cc["@mozilla.org/alerts-service;1"].getService(Ci.nsIAlertsService);
    },
    get showAlert() {
        delete this.showAlert;
        var { alertsService } = this;
        var Notification = Components.Constructor("@mozilla.org/alert-notification;1", "nsIAlertNotification");
        var Timer = Components.Constructor("@mozilla.org/timer;1", "nsITimer");
        var gNextId = 1;
        var gTidMap = new Map();
        var gIdMap = new Map();
        var setTimeout = (func, ms, ...args) => {
            var id = gNextId++;
            var tid = new Timer;
            tid.initWithCallback(() => {
                gTidMap.delete(id);
                func.apply(null, args);
            }, ms, tid.TYPE_ONE_SHOT);
            gTidMap.set(id, tid);
            return id;
        };
        var clearTimeout = id => {
            if (!gTidMap.has(id)) return;
            gTidMap.get(id).cancel();
            gTidMap.delete(id);
        };
        if ("initWithObject" in new Notification()) {
            if ("fetchDecodedImage" in ChromeUtils) return this.showAlert = async (opts = {}, obs) => {
                if (opts.imageURL && !opts.image) {
                    try {
                        let uri = Services.io.newURI(opts.imageURL);
                        let channel = Services.io.newChannelFromURI(uri, null, Services.scriptSecurityManager.getSystemPrincipal(), null, Ci.nsILoadInfo.SEC_ALLOW_CROSS_ORIGIN_SEC_CONTEXT_IS_NULL, Ci.nsIContentPolicy.TYPE_IMAGE);
                        channel.loadInfo.allowDeprecatedSystemRequests = true;
                        opts.image = await ChromeUtils.fetchDecodedImage(uri, channel);
                    } catch { opts.imageURL = undefined; }
                }
                var alert = new Notification();
                var alertTimeout = opts.name && opts.alertTimeout;
                if (alertTimeout) {
                    opts.requireInteraction = true;
                    if (gIdMap.has(opts.name)) {
                        clearTimeout(gIdMap.get(opts.name));
                        gIdMap.delete(opts.name);
                    }
                }
                alert.initWithObject(opts);
                alertsService.showAlert(alert, obs);
                if (alertTimeout) gIdMap.set(opts.name, setTimeout(() => {
                    alertsService.closeAlert(opts.name);
                    gIdMap.delete(opts.name);
                }, alertTimeout));
            };
            return this.showAlert = async (opts = {}, obs) => {
                var alert = new Notification();
                var alertTimeout = opts.name && opts.alertTimeout;
                if (alertTimeout) {
                    opts.requireInteraction = true;
                    if (gIdMap.has(opts.name)) {
                        clearTimeout(gIdMap.get(opts.name));
                        gIdMap.delete(opts.name);
                    }
                }
                alert.initWithObject(opts);
                alertsService.showAlert(alert, obs);
                if (alertTimeout) gIdMap.set(opts.name, setTimeout(() => {
                    alertsService.closeAlert(opts.name);
                    gIdMap.delete(opts.name);
                }, alertTimeout));
            };
        }
        return this.showAlert = async ({ name, imageURL, title, text, textClickable, cookie, dir, lang, data, principal, inPrivateBrowsing, requireInteraction, silent, vibrate = [], actions, opaqueRelaunchData, alertTimeout } = {}, obs) => {
            var alert = new Notification();
            alertTimeout = name && alertTimeout;
            if (alertTimeout && gIdMap.has(name)) {
                clearTimeout(gIdMap.get(name));
                gIdMap.delete(name);
            }
            alert.init(name, imageURL, title, text, textClickable, cookie, dir, lang, data, principal, inPrivateBrowsing, (alertTimeout ? true : requireInteraction), silent, vibrate);
            if (actions) alert.actions = actions;
            if (opaqueRelaunchData) alert.opaqueRelaunchData = opaqueRelaunchData;
            alertsService.showAlert(alert, obs);
            if (alertTimeout) gIdMap.set(name, setTimeout(() => {
                alertsService.closeAlert(name);
                gIdMap.delete(name);
            }, alertTimeout));
        };
    },
    get closeAlert() {
        delete this.closeAlert;
        var { alertsService } = this;
        return this.closeAlert = (...args) => alertsService.closeAlert(...args);
    },
    get initPrefs() {
        delete this.initPrefs;
        Object.assign(this.prefs, this.default);
        try {
            Object.assign(this.prefs, JSON.parse(Cu.readUTF8URI(Services.io.newURI("chrome://user_chrome_files/content/prefs.json"))));
        } catch {
            this.writeJSON(this.default);
        }
    },
    get _rebootSet() {
        delete this._rebootSet;
        return this._rebootSet = new Set();
    },
    get _l10nLocales() {
        delete this._l10nLocales;
        var locales = Services.locale.appLocalesAsBCP47;
        if (!locales.includes("en-US")) locales.push("en-US");
        return this._l10nLocales = locales;
    },
    async writeJSON(config = this.prefs, path = this.prefsPath) {
        try {
            await IOUtils.writeJSON(path, config, { tmpPath: `${path}.tmp`, mode: "overwrite" });
        } catch (e) { Cu.reportError(e); }
    },
    getPref(pref, val) {
        return this.prefs[pref] ?? val;
    },
    async setPrefs(pref, val) {
        var mwrite = false;
        if (typeof pref === "string") {
            if (this.prefs[pref] === val) return;
            mwrite = true;
            this.prefs[pref] = val;
            Services.obs.notifyObservers(null, this.TOPIC_PREFS, pref);
        } else if (Array.isArray(pref))
            for (let [p, v] of pref) {
                if (this.prefs[p] === v) continue;
                mwrite = true;
                this.prefs[p] = v;
                Services.obs.notifyObservers(null, this.TOPIC_PREFS, p);
            }
        if (!mwrite) return;
        await this.writeJSON();
    },
    l10nDoMLocalization(path, file) {
        var { l10nDMap, l10nRegistry } = this._l10nRegistry(path);
        return l10nDMap.get(file) || l10nDMap.set(file, new DOMLocalization([file], false, l10nRegistry)).get(file);
    },
    l10nFormatMessages(path, file, keys) {
        var { l10nMap, l10nRegistry } = this._l10nRegistry(path);
        return (l10nMap.get(file) || ({
            async l10n() {
                l10nMap.set(file, this);
                this.l10n = async () => this._l10n;
                return this._l10n = (async () => this._l10n = await (new Localization([file], false, l10nRegistry)).formatMessages(keys))();
            },
        })).l10n();
    },
    restartApp(nocache = false) {
        var cancelQuit = Cc["@mozilla.org/supports-PRBool;1"].createInstance(Ci.nsISupportsPRBool);
        Services.obs.notifyObservers(cancelQuit, "quit-application-requested", "restart");
        if (cancelQuit.data) return false;
        if (nocache) Services.appinfo.invalidateCachesOnRestart();
        var { startup } = Services;
        startup.quit(startup.eAttemptQuit | startup.eRestart);
    },
    openHavingURI(win, url, having) {
        switch (Services.appinfo.ID) {
            case "{ec8030f7-c20a-464f-9b0e-13a3a9e97384}": // Firefox or etc.
                win = (win.top?.opener && !win.top.opener.closed) ? win.top.opener : Services.wm.getMostRecentWindow("navigator:browser");
                if (win) {
                    let triggeringPrincipal = Services.scriptSecurityManager.getSystemPrincipal();
                    if (having) win.switchToTabHavingURI(url, true, { relatedToCurrent: true, triggeringPrincipal });
                    else {
                        let params = { triggeringPrincipal };
                        params.index = params.tabIndex = win.gBrowser.selectedTab._tPos + 1;
                        win.gBrowser.selectedTab = win.gBrowser.addTab(url, params);
                    }
                }
                break;
            case "{3550f703-e582-4d05-9a08-453d09bdfdc6}": // Thunderbird
                win = (win.top?.opener && !win.top.opener.closed) ? win.top.opener : Services.wm.getMostRecentWindow("mail:3pane");
                if (win) win.document.querySelector("#tabmail")?.openTab("contentTab", { url });
                break;
        }
    },
    async initAboutPrefs(file, description, hide) {
        var newFactory = new AboutPrefs(file, description, hide);
        Components.manager.QueryInterface(Ci.nsIComponentRegistrar)
            .registerFactory(newFactory.classID, description, newFactory.contractID, newFactory);
    },
    _l10nRegistry(path) {
        var { _l10nMap, _l10nLocales } = this;
        return (_l10nMap.get(path) || ({
            l10nMap: new Map(),
            l10nDMap: new Map(),
            get l10nRegistry() {
                delete this.l10nRegistry;
                _l10nMap.set(path, this);
                var reg = new L10nRegistry();
                reg.registerSources([
                    new L10nFileSource(
                        path,
                        "app",
                        _l10nLocales,
                        `chrome://user_chrome_files/content/${path}/{locale}/`
                    ),
                ]);
                return this.l10nRegistry = reg;
            },
        }));
    },
    _viewToolbars(win, externalToolbars) {
        var newStrFn = "";
        var ovtc = win.onViewToolbarCommand;
        if (typeof ovtc === "function") {
            let strFn = `${ovtc}`, regExr = /(BrowserUsageTelemetry\s*\.\s*recordToolbarVisibility\s*\(\s*toolbarId.+?\)\s*\;)/g;
            if (regExr.test(strFn)) newStrFn = `window.onViewToolbarCommand = ${strFn.replace(/^(async\s)?.*?\(/, `$1function ${ovtc.name}(`)
                .replace(regExr, 'if (!/ucf-additional-.+?-bar/.test(toolbarId)) { $1 }')};`;
        }
        if (externalToolbars) {
            let ovtps = win.ToolbarContextMenu?.onViewToolbarsPopupShowing;
            if (typeof ovtps === "function") this._viewToolbarsPopup(win.ToolbarContextMenu, ovtps);
            else if (typeof (ovtps = win.onViewToolbarsPopupShowing) === "function") newStrFn += "\nUcfPrefs._viewToolbarsPopup(window, onViewToolbarsPopupShowing);";
        }
        this._viewToolbars = () => newStrFn;
        return newStrFn;
    },
    _viewToolbarsPopup(obj, ovtps) {
        obj.onViewToolbarsPopupShowing = function () {
            var func = ovtps.apply(obj, arguments);
            var popup = arguments[0].target;
            if (/toolbar-context-menu|view-menu-popup|customization-toolbar-menu/.test(popup.id)) {
                let win = popup.documentGlobal;
                let Item = arguments[1] || popup.querySelector(":scope > :nth-last-child(1 of [toolbarId])")?.nextElementSibling;
                for (let toolbar of win.ucf_toolbars_win.toolbars.externalToolbars) {
                    if (toolbar.id === "ucf-additional-vertical-bar" && popup.id === "customization-toolbar-menu") continue;
                    let mItem = win.document.createXULElement("menuitem");
                    mItem.setAttribute("id", `toggle_${toolbar.id}`);
                    mItem.setAttribute("toolbarId", toolbar.id);
                    mItem.setAttribute("type", "checkbox");
                    mItem.setAttribute("label", toolbar.getAttribute("toolbarname"));
                    if (!toolbar.collapsed) mItem.setAttribute("checked", true);
                    mItem.setAttribute("accesskey", toolbar.getAttribute("accesskey"));
                    if (popup.id !== "toolbar-context-menu") mItem.setAttribute("key", toolbar.getAttribute("key"));
                    if (Item) Item.before(mItem);
                    else popup.append(mItem);
                    mItem.addEventListener("command", win.onViewToolbarCommand);
                }
            }
            return func;
        };
    },
};
class AboutPrefs {
    constructor(file, description, hide) {
        this.newuri = Services.io.newURI(`chrome://user_chrome_files/content/ucf/${file}`);
        this.classDescription = `about:${description}`;
        this.classID = Components.ID(Services.uuid.generateUUID().toString());
        this.contractID = `@mozilla.org/network/protocol/about;1?what=${description}`;
        this.QueryInterface = ChromeUtils.generateQI([Ci.nsIAboutModule]);
        this.geturiflags = !hide ? Ci.nsIAboutModule.ALLOW_SCRIPT : (Ci.nsIAboutModule.ALLOW_SCRIPT | Ci.nsIAboutModule.HIDE_FROM_ABOUTABOUT);
    }
    newChannel(uri, loadInfo) {
        var chan = Services.io.newChannelFromURIWithLoadInfo(this.newuri, loadInfo);
        chan.owner = Services.scriptSecurityManager.getSystemPrincipal();
        return chan;
    }
    getURIFlags() {
        return this.geturiflags;
    }
    getChromeURI() {
        return this.newuri;
    }
    createInstance(iid) {
        return this.QueryInterface(iid);
    }
}

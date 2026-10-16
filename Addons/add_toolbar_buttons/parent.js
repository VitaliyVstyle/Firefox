var atb_branch = "extensions.add_toolbar_buttons.", atb_ps, atb_ext, atb_uri, atb_locale;
ChromeUtils.defineESModuleGetters(this, {
    CustomizableUI: "moz-src:///browser/components/customizableui/CustomizableUI.sys.mjs",
    PlacesUtils: "resource://gre/modules/PlacesUtils.sys.mjs",
    AddonManager: "resource://gre/modules/AddonManager.sys.mjs",
    ExtensionParent: "resource://gre/modules/ExtensionParent.sys.mjs",
    NetUtil: "resource://gre/modules/NetUtil.sys.mjs",
});
ChromeUtils.defineLazyGetter(this, "GlobalManager", () => ExtensionParent.GlobalManager);
ChromeUtils.defineLazyGetter(this, "Timer", () => Components.Constructor("@mozilla.org/timer;1", "nsITimer"));
var winWeakMap = new WeakMap();
var gNextId = 0;
var gTidMap = new Map();
var setTimeout = (func, ms, ...args) => {
    var id = ++gNextId;
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
var add_bar_btns = {
    initialized: false,
    bookMgrRun: false,
    bookmarksInsertRemove: false,
    registerActor: false,
    get clipboard() {
        delete this.clipboard;
        return this.clipboard = Cc["@mozilla.org/widget/clipboardhelper;1"].getService(Ci.nsIClipboardHelper);
    },
    get global() {
        delete this.global;
        return this.global = Cu.getGlobalForObject(Cu);
    },
    get styleSS() {
        delete this.styleSS;
        return this.styleSS = Cc["@mozilla.org/content/style-sheet-service;1"].getService(Ci.nsIStyleSheetService);
    },
    get idnService() {
        delete this.idnService;
        return this.idnService = Cc["@mozilla.org/network/idn-service;1"].getService(Ci.nsIIDNService);
    },
    get atb_branch() {
        delete this.atb_branch;
        return this.atb_branch = atb_ps.getBranch(atb_branch);
    },
    get permissions_default_image() {
        delete this.permissions_default_image;
        try {
            return this.permissions_default_image = atb_ps.getIntPref("permissions.default.image");
        } catch { }
        return this.permissions_default_image = null;
    },
    get javascript_enabled() {
        delete this.javascript_enabled;
        try {
            return this.javascript_enabled = atb_ps.getBoolPref("javascript.enabled");
        } catch { }
        return this.javascript_enabled = null;
    },
    get media_autoplay_default() {
        delete this.media_autoplay_default;
        try {
            return this.media_autoplay_default = atb_ps.getIntPref("media.autoplay.default");
        } catch { }
        return this.media_autoplay_default = null;
    },
    get browser_zoom_full() {
        delete this.browser_zoom_full;
        try {
            return this.browser_zoom_full = atb_ps.getBoolPref("browser.zoom.full");
        } catch { }
        return this.browser_zoom_full = null;
    },
    get network_cookie_cookieBehavior() {
        delete this.network_cookie_cookieBehavior;
        try {
            return this.network_cookie_cookieBehavior = atb_ps.getIntPref("network.cookie.cookieBehavior");
        } catch { }
        return this.network_cookie_cookieBehavior = null;
    },
    get network_proxy_type() {
        delete this.network_proxy_type;
        try {
            return this.network_proxy_type = atb_ps.getIntPref("network.proxy.type");
        } catch { }
        return this.network_proxy_type = null;
    },
    get image_animation_mode() {
        delete this.image_animation_mode;
        try {
            return this.image_animation_mode = atb_ps.getCharPref("image.animation_mode");
        } catch { }
        return this.image_animation_mode = null;
    },
    get anim_func() {
        delete this.anim_func;
        return this.anim_func = this.atb_branch.getBoolPref("obs.animfunc");
    },
    get animationCSS() {
        return `@namespace url("http://www.w3.org/1999/xhtml");
@namespace svg url("http://www.w3.org/2000/svg");
@-moz-document regexp("^(?:https?|ftp|file):.*") {
*, *::before, *::after, svg|* {
${!this.anim_func ? `transition: none !important;
animation: none !important;`
                : `transition-timing-function: step-start !important;
animation-timing-function: step-start !important;`}
}
}`;
    },
    get anim_css() {
        delete this.anim_css;
        var _anim_css = this.atb_branch.getBoolPref("obs.animation");
        this.cssFileToUserContent(this.animationCSS, _anim_css);
        return this.anim_css = _anim_css;
    },
    get show_version() {
        delete this.show_version;
        return this.show_version = this.atb_branch.getBoolPref("obs.showversion");
    },
    get show_description() {
        delete this.show_description;
        return this.show_description = this.atb_branch.getBoolPref("obs.showdescription");
    },
    get user_permissions() {
        delete this.user_permissions;
        return this.user_permissions = this.atb_branch.getBoolPref("obs.userpermissions");
    },
    get show_hidden() {
        delete this.show_hidden;
        return this.show_hidden = this.atb_branch.getBoolPref("obs.showhidden");
    },
    get show_disabled() {
        delete this.show_disabled;
        return this.show_disabled = this.atb_branch.getBoolPref("obs.showdisabled");
    },
    get enabled_first() {
        delete this.enabled_first;
        return this.enabled_first = this.atb_branch.getBoolPref("obs.enabledfirst");
    },
    get exceptions_listset() {
        delete this.exceptions_listset;
        var str = this.atb_branch.getStringPref("obs.exceptionslistset").trim();
        return this.exceptions_listset = new Set(str ? str.split(/\s+/) : []);
    },
    get exceptions_type_listarr() {
        delete this.exceptions_type_listarr;
        var str = this.atb_branch.getStringPref("obs.exceptionstypelistarr").trim();
        var arr = ["extension", "theme", "locale", "dictionary", "plugin", "mlmodel"];
        if (!str) return this.exceptions_type_listarr = arr;
        var set = new Set(str.split(/\s+/));
        return this.exceptions_type_listarr = arr.filter(type => !set.has(type));
    },
    get max_width_main_item() {
        delete this.max_width_main_item;
        return this.max_width_main_item = this.atb_branch.getIntPref("obs.maxwidthmainitem");
    },
    get max_height_popup() {
        delete this.max_height_popup;
        return this.max_height_popup = this.atb_branch.getIntPref("obs.maxheightpopup");
    },
    get alert_timeout() {
        delete this.alert_timeout;
        return this.alert_timeout = this.atb_branch.getIntPref("obs.alerttimeout") * 1000;
    },
    get media_volume_scale() {
        delete this.media_volume_scale;
        let volume = parseFloat(atb_ps.getCharPref("media.volume_scale"));
        if (isNaN(volume)) volume = 0;
        return this.media_volume_scale = volume;
    },
    get sound_volume_step() {
        delete this.sound_volume_step;
        return this.sound_volume_step = this.atb_branch.getIntPref("obs.soundvolumestep") / 100;
    },
    get SearchService() {
        delete this.SearchService;
        return this.SearchService = (Services.search ?? ChromeUtils.importESModule("moz-src:///toolkit/components/search/SearchService.sys.mjs").SearchService);
    },
    obsprefs: [
        "permissions.default.image", "image.animation_mode", "javascript.enabled", "media.autoplay.default",
        "media.volume_scale", "browser.zoom.full", "network.cookie.cookieBehavior", "network.proxy.type"
    ],
    init() {
        if (this.initialized) return;
        this.initialized = true;
        var branch = atb_ps.getDefaultBranch(atb_branch);
        branch.setBoolPref("newtab", false);
        branch.setBoolPref("doreload", false);
        branch.setBoolPref("alertnotification", true);
        branch.setBoolPref("bookmarksindex", false);
        branch.setBoolPref("bookmarkssortrevers", false);
        branch.setBoolPref("obs.animation", true);
        branch.setBoolPref("obs.animfunc", false);
        branch.setBoolPref("obs.showversion", true);
        branch.setBoolPref("obs.showdescription", true);
        branch.setBoolPref("obs.userpermissions", true);
        branch.setBoolPref("obs.showhidden", true);
        branch.setBoolPref("obs.showdisabled", true);
        branch.setBoolPref("obs.enabledfirst", true);
        branch.setIntPref("obs.maxwidthmainitem", 16);
        branch.setIntPref("obs.maxheightpopup", 0);
        branch.setIntPref("obs.alerttimeout", 0);
        branch.setIntPref("toggleproxy", 5);
        branch.setIntPref("toggleproxy2", 0);
        branch.setIntPref("maxrequests", 50);
        branch.setIntPref("maxtimeout", 30);
        branch.setIntPref("bookmarksparentguid", 0);
        branch.setIntPref("bookmarkssorttype", 0);
        branch.setIntPref("obs.soundvolumestep", 2);
        branch.setStringPref("obs.exceptionslistset", "");
        branch.setStringPref("obs.exceptionstypelistarr", "");
        Services.io.getProtocolHandler("resource")
            .QueryInterface(Ci.nsIResProtocolHandler)
            .setSubstitution("add_toolbar_buttons", Services.io.newURI(atb_ext.resourceURL));
        CustomizableUI.addListener(this);
        for (let win of CustomizableUI.windows)
            this.onWindowOpened(win);
        this.obsprefs.forEach(pref => {
            if (atb_ps.getPrefType(pref) !== atb_ps.PREF_INVALID) atb_ps.addObserver(pref, this);
        });
        atb_ps.addObserver("extensions.add_toolbar_buttons.obs.", this);
        this.widgets = [
            {
                id: "atb-image-toggle",
                type: "custom",
                label: atb_locale.localizeMessage("atbImageToggleL"),
                tooltiptext: atb_locale.localizeMessage("atbImageToggleT"),
                localized: false,
                onBuild(doc) {
                    var trbn = doc.createXULElement("toolbarbutton");
                    trbn.id = this.id;
                    trbn.className = "toolbarbutton-1 chromeclass-toolbar-additional";
                    trbn.setAttribute("label", this.label);
                    trbn.toggleAttribute("context", true);
                    trbn.setAttribute("tooltiptext", this.tooltiptext);
                    var image = add_bar_btns.permissions_default_image;
                    if (image !== null) {
                        trbn.setAttribute("activated", image);
                        trbn.onclick = e => {
                            switch (e.button) {
                                case 0:
                                    add_bar_btns.prefToggleNumber("permissions.default.image", [1, 2, 1]);
                                    add_bar_btns.checkBrowserReload(e.view);
                                    break;
                                case 1:
                                case 2:
                                    add_bar_btns.sendAsyncMessages(e.view, "ATBWinActor:PageImages");
                            }
                        };
                    }
                    return trbn;
                }
            },
            {
                id: "atb-stop-animation",
                type: "custom",
                label: atb_locale.localizeMessage("atbStopAnimationL"),
                tooltiptext: atb_locale.localizeMessage("atbStopAnimationT"),
                localized: false,
                onBuild(doc) {
                    var trbn = doc.createXULElement("toolbarbutton");
                    trbn.id = this.id;
                    trbn.className = "toolbarbutton-1 chromeclass-toolbar-additional badged-button";
                    trbn.setAttribute("badged", "true");
                    trbn.setAttribute("constrain-size", "true");
                    trbn.setAttribute("label", this.label);
                    trbn.toggleAttribute("context", true);
                    trbn.setAttribute("tooltiptext", this.tooltiptext);
                    var image = add_bar_btns.image_animation_mode;
                    if (image !== null) {
                        trbn.setAttribute("activated", add_bar_btns.anim_css);
                        trbn.setAttribute("badge", image.substring(0, 3));
                        trbn.setAttribute("badgeStyle", "background: light-dark(oklch(62% 0.25 260), oklch(65% 0.25 260)); color: oklch(1 0 0); font-size: 10px; font-weight: normal; line-height: 10px; box-shadow: none; text-shadow: none; padding-block: 0 1px !important; padding-inline: 2px !important; min-width: 0 !important;");
                        trbn.onclick = e => {
                            switch (e.button) {
                                case 0:
                                    if (!e.shiftKey) add_bar_btns.extensionPrefToggleStatus("obs.animation");
                                    else {
                                        add_bar_btns.prefToggleString("image.animation_mode", ["normal", "none", "once"]);
                                        add_bar_btns.checkBrowserReload(e.view);
                                    }
                                    break;
                                case 1:
                                    add_bar_btns.prefToggleString("image.animation_mode", ["normal", "none"]);
                                    add_bar_btns.checkBrowserReload(e.view);
                                    break;
                                case 2:
                                    add_bar_btns.sendAsyncMessages(e.view, "ATBWinActor:ImageAnimationMode");
                            }
                        };
                    }
                    return trbn;
                }
            },
            {
                id: "atb-autoplay",
                type: "custom",
                label: atb_locale.localizeMessage("atbAutoplayL"),
                tooltiptext: atb_locale.localizeMessage("atbAutoplayT"),
                localized: false,
                onBuild(doc) {
                    var autoplay = add_bar_btns.media_autoplay_default;
                    var trbn = doc.createXULElement("toolbarbutton");
                    trbn.id = this.id;
                    trbn.className = "toolbarbutton-1 chromeclass-toolbar-additional";
                    trbn.setAttribute("label", this.label);
                    trbn.toggleAttribute("context", true);
                    trbn.setAttribute("tooltiptext", this.tooltiptext);
                    if (autoplay !== null) {
                        trbn.setAttribute("activated", autoplay);
                        trbn.onclick = e => {
                            switch (e.button) {
                                case 0:
                                    add_bar_btns.prefToggleNumber("media.autoplay.default", [1, 5, 0, 0, 0, 0]);
                                    add_bar_btns.checkBrowserReload(e.view);
                                    break;
                                case 1:
                                case 2:
                                    add_bar_btns.sendAsyncMessages(e.view, "ATBWinActor:PageMedia");
                            }
                        };
                    }
                    return trbn;
                }
            },
            {
                id: "atb-javascript",
                type: "custom",
                label: atb_locale.localizeMessage("atbJavascriptL"),
                tooltiptext: atb_locale.localizeMessage("atbJavascriptT"),
                localized: false,
                onBuild(doc) {
                    var trbn = doc.createXULElement("toolbarbutton");
                    trbn.id = this.id;
                    trbn.className = "toolbarbutton-1 chromeclass-toolbar-additional";
                    trbn.setAttribute("label", this.label);
                    trbn.toggleAttribute("context", true);
                    trbn.setAttribute("tooltiptext", this.tooltiptext);
                    var javascript = add_bar_btns.javascript_enabled;
                    if (javascript !== null) {
                        trbn.setAttribute("activated", javascript);
                        trbn.onclick = e => {
                            switch (e.button) {
                                case 0:
                                    add_bar_btns.prefToggleStatus("javascript.enabled");
                                    add_bar_btns.checkBrowserReload(e.view);
                                    break;
                                case 1:
                                case 2:
                                    add_bar_btns.sendAsyncMessagesJavaScript(e.view, "ATBWinActor:PageJavaScript");
                            }
                        };
                    }
                    return trbn;
                }
            },
            {
                id: "atb-cookie-toggle",
                type: "custom",
                label: atb_locale.localizeMessage("atbCookieToggleL"),
                tooltiptext: atb_locale.localizeMessage("atbCookieToggleT"),
                localized: false,
                onBuild(doc) {
                    var trbn = doc.createXULElement("toolbarbutton");
                    trbn.id = this.id;
                    trbn.className = "toolbarbutton-1 chromeclass-toolbar-additional badged-button";
                    trbn.setAttribute("badged", "true");
                    trbn.setAttribute("constrain-size", "true");
                    trbn.setAttribute("label", this.label);
                    trbn.toggleAttribute("context", true);
                    trbn.setAttribute("tooltiptext", this.tooltiptext);
                    var cookieBehavior = add_bar_btns.network_cookie_cookieBehavior;
                    if (cookieBehavior !== null) {
                        trbn.setAttribute("badge", cookieBehavior);
                        trbn.setAttribute("badgeStyle", `background: ${cookieBehavior !== 2 ? "light-dark(oklch(62% 0.25 260), oklch(65% 0.25 260))" : "light-dark(oklch(50% 0.25 0), oklch(70% 0.25 0))"}; color: oklch(1 0 0); font-size: 10px; font-weight: normal; line-height: 10px; box-shadow: none; text-shadow: none; padding-block: 0 1px !important; padding-inline: 2px !important; min-width: 0 !important;`);
                        trbn.onclick = e => {
                            switch (e.button) {
                                case 0:
                                    if (!e.shiftKey) add_bar_btns.prefToggleNumber("network.cookie.cookieBehavior", [1, 2, 3, 4, 5, 0]);
                                    else add_bar_btns.delCookies(e.view, this.id);
                                    break;
                                case 1:
                                    add_bar_btns.delCookies(e.view, this.id);
                                    break;
                                case 2:
                                    add_bar_btns.viewCookies(e.view);
                            }
                        };
                    }
                    return trbn;
                }
            },
            {
                id: "atb-zoom-toggle",
                type: "custom",
                label: atb_locale.localizeMessage("atbZoomToggleL"),
                tooltiptext: atb_locale.localizeMessage("atbZoomToggleT"),
                localized: false,
                onBuild(doc) {
                    var trbn = doc.createXULElement("toolbarbutton");
                    trbn.id = this.id;
                    trbn.className = "toolbarbutton-1 chromeclass-toolbar-additional";
                    trbn.setAttribute("label", this.label);
                    trbn.setAttribute("tooltiptext", this.tooltiptext);
                    var zoom = add_bar_btns.browser_zoom_full;
                    if (zoom !== null) {
                        trbn.setAttribute("activated", zoom);
                        trbn.onclick = e => {
                            if (e.button === 0) doc.defaultView.ZoomManager.toggleZoom();
                        };
                    }
                    return trbn;
                }
            },
            {
                id: "atb-combined-toggle-proxy",
                type: "custom",
                label: atb_locale.localizeMessage("atbToggleProxy"),
                tooltiptext: atb_locale.localizeMessage("atbToggleProxy"),
                localized: false,
                onBuild(doc) {
                    var trim = doc.createXULElement("toolbaritem");
                    trim.id = this.id;
                    trim.className = "toolbaritem-combined-buttons atb-combined-buttons chromeclass-toolbar-additional";
                    trim.setAttribute("label", this.label);
                    trim.setAttribute("type", "custom");
                    var trbn_0 = doc.createXULElement("toolbarbutton");
                    trbn_0.id = "atb-toggle-proxy";
                    trbn_0.className = "toolbarbutton-1 atb-combined-buttons-toolbarbutton";
                    trbn_0.setAttribute("label", this.label);
                    trbn_0.setAttribute("tooltiptext", this.tooltiptext);
                    trbn_0.toggleAttribute("context", true);
                    trim.append(trbn_0);
                    var trbn_1 = doc.createXULElement("toolbarbutton");
                    trbn_1.id = "atb-toggle-proxy-menu";
                    trbn_1.className = "toolbarbutton-1 atb-combined-buttons-dropmarker";
                    trbn_1.setAttribute("type", "menu");
                    trbn_1.setAttribute("label", "");
                    trbn_1.setAttribute("tooltiptext", atb_locale.localizeMessage("atbToggleProxyT"));
                    trbn_1.toggleAttribute("context", true);
                    var mupp = doc.createXULElement("menupopup");
                    mupp.id = "atb-toggle-proxy-popup";
                    var npt = add_bar_btns.network_proxy_type;
                    if (npt !== null) {
                        let sym = Symbol(), symb = Symbol();
                        let map = winWeakMap.get(doc.defaultView);
                        map.addListener(Symbol(), trbn_0, "command", this.toggleTheProxy.bind(add_bar_btns));
                        map.addListener(Symbol(), trbn_1, "contextmenu", this.openProxyWin.bind(add_bar_btns));
                        map.addListener(sym, mupp, "popupshowing", this.buildMenu.bind(this, map, sym));
                        map.addListener(symb, trbn_1, "mousedown", this.setPosition.bind(this, map, symb, mupp));
                        trim.setAttribute("activated", npt);
                    }
                    trbn_1.append(mupp);
                    trim.append(trbn_1);
                    return trim;
                },
                setPosition(map, sym, mupp, e) {
                    map.delListener(sym);
                    var { left, width } = e.target.getBoundingClientRect();
                    mupp.setAttribute("position", (width / 2 + left) < (e.view.innerWidth / 2) ? "after_start" : "after_end");
                    mupp.setAttribute("flip", "both");
                },
                buildMenu(map, sym, e) {
                    map.delListener(sym);
                    var mupp = e.currentTarget;
                    var doc = e.view.document;
                    map.addListener(Symbol(), mupp, "command", this.setProxyValue.bind(add_bar_btns));
                    var muim_0 = doc.createXULElement("menuitem");
                    muim_0.setAttribute("label", atb_locale.localizeMessage("atbToggleProxyM0"));
                    muim_0.setAttribute("type", "radio");
                    muim_0.setAttribute("value", "0");
                    mupp.append(muim_0);
                    var muim_1 = doc.createXULElement("menuitem");
                    muim_1.setAttribute("label", atb_locale.localizeMessage("atbToggleProxyM1"));
                    muim_1.setAttribute("type", "radio");
                    muim_1.setAttribute("value", "1");
                    mupp.append(muim_1);
                    var muim_2 = doc.createXULElement("menuitem");
                    muim_2.setAttribute("label", atb_locale.localizeMessage("atbToggleProxyM2"));
                    muim_2.setAttribute("type", "radio");
                    muim_2.setAttribute("value", "2");
                    mupp.append(muim_2);
                    var muim_3 = doc.createXULElement("menuitem");
                    muim_3.setAttribute("label", atb_locale.localizeMessage("atbToggleProxyM4"));
                    muim_3.setAttribute("type", "radio");
                    muim_3.setAttribute("value", "4");
                    mupp.append(muim_3);
                    var muim_4 = doc.createXULElement("menuitem");
                    muim_4.setAttribute("label", atb_locale.localizeMessage("atbToggleProxyM5"));
                    muim_4.setAttribute("type", "radio");
                    muim_4.setAttribute("value", "5");
                    mupp.append(muim_4);
                    mupp.append(doc.createXULElement("menuseparator"));
                    var muim_5 = doc.createXULElement("menuitem");
                    muim_5.setAttribute("label", atb_locale.localizeMessage("atbToggleProxyMS"));
                    map.addListener(Symbol(), muim_5, "command", this.openProxyWin.bind(add_bar_btns));
                    this.popupshowing.call(add_bar_btns, { currentTarget: mupp });
                    map.addListener(sym, mupp, "popupshowing", this.popupshowing.bind(add_bar_btns));
                    mupp.append(muim_5);
                },
                toggleTheProxy(e) {
                    var proxyState = atb_ps.getIntPref("network.proxy.type"),
                        toggleproxy = this.atb_branch.getIntPref("toggleproxy"),
                        toggleproxy2 = this.atb_branch.getIntPref("toggleproxy2");
                    atb_ps.setIntPref("network.proxy.type", (proxyState == toggleproxy2) ? toggleproxy : toggleproxy2);
                    this.checkBrowserReload(e.view);
                },
                setProxyValue(e) {
                    e.stopPropagation();
                    atb_ps.setIntPref("network.proxy.type", +e.target.getAttribute("value"));
                    this.checkBrowserReload(e.view);
                },
                async openProxyWin(e) {
                    e.stopPropagation();
                    if (e.target != e.currentTarget) return;
                    var win = e.view;
                    var type = "aTaB:ProxyWin";
                    var w = Services.wm.getMostRecentWindow(type);
                    if (!w) {
                        let url = "chrome://browser/content/preferences/dialogs/connection.xhtml", id = "ConnectionsWin";
                        let { xulStore: xs } = Services;
                        let sx = +xs.getValue(url, id, "screenX") || xs.setValue(url, id, "screenX", 1) || 1;
                        let sy = +xs.getValue(url, id, "screenY") || xs.setValue(url, id, "screenY", 1) || 1;
                        let wh = +xs.getValue(url, id, "width") || xs.setValue(url, id, "width", 600) || 600;
                        let ht = +xs.getValue(url, id, "height") || xs.setValue(url, id, "height", 600) || 600;
                        let sm = xs.getValue(url, id, "sizemode");
                        w = win.openDialog(url, type, `chrome,dialog=no,resizable,screenX=${sx},screenY=${sy},width=${wh},height=${ht}`);
                        w.opener = win;
                        w.opener.gSubDialog = {
                            _dialogs: []
                        };
                        if (sm === "maximized") w.windowRoot.addEventListener("MozUpdateWindowPos", () => w.maximize(), { once: true, capture: true });
                        await new Promise(resolve => w.windowRoot.addEventListener("DOMContentLoaded", resolve, { once: true }));
                        let docEl = w.document.documentElement;
                        docEl.id = id;
                        docEl.setAttribute("type", "prefwindow");
                        docEl.setAttribute("windowtype", type);
                        docEl.setAttribute("persist", "screenX screenY width height sizemode lastSelected");
                    }
                    w.focus();
                },
                popupshowing(e) {
                    var proxyState = atb_ps.getIntPref("network.proxy.type"), popup = e.currentTarget;
                    for (let item of popup.querySelectorAll("menuitem")) {
                        if (+item.getAttribute("value") === proxyState) {
                            item.toggleAttribute("checked", true);
                            break;
                        }
                    }
                },
            },
            {
                id: "atb-combined-undo-tab",
                type: "custom",
                label: atb_locale.localizeMessage("atbUndoTabL"),
                tooltiptext: atb_locale.localizeMessage("atbUndoTabT"),
                localized: false,
                onBuild(doc) {
                    var trim = doc.createXULElement("toolbaritem");
                    trim.id = this.id;
                    trim.className = "toolbaritem-combined-buttons atb-combined-buttons chromeclass-toolbar-additional";
                    trim.setAttribute("label", this.label);
                    trim.setAttribute("type", "custom");
                    var trbn_0 = doc.createXULElement("toolbarbutton");
                    trbn_0.id = "atb-undo-tab";
                    trbn_0.className = "toolbarbutton-1 atb-combined-buttons-toolbarbutton";
                    trbn_0.setAttribute("label", this.label);
                    trbn_0.setAttribute("tooltiptext", this.tooltiptext);
                    trbn_0.toggleAttribute("context", true);
                    var map = winWeakMap.get(doc.defaultView);
                    map.addListener(Symbol(), trbn_0, "click", this.btnClick.bind(add_bar_btns));
                    trim.append(trbn_0);
                    var trbn_1 = doc.createXULElement("toolbarbutton");
                    trbn_1.id = "atb-undo-tab-menu";
                    trbn_1.className = "toolbarbutton-1 atb-combined-buttons-dropmarker";
                    trbn_1.setAttribute("type", "menu");
                    trbn_1.setAttribute("label", "");
                    trbn_1.setAttribute("tooltiptext", atb_locale.localizeMessage("atbUndoTabT0"));
                    trbn_1.toggleAttribute("context", true);
                    map.addListener(Symbol(), trbn_1, "contextmenu", this.contextmenu.bind(add_bar_btns));
                    var mupp = doc.createXULElement("menupopup");
                    mupp.id = "mupp-undo-tab-popup";
                    mupp.setAttribute("tooltip", "bhTooltip");
                    mupp.setAttribute("popupsinherittooltip", true);
                    var sym = Symbol(), symb = Symbol();
                    map.addListener(sym, mupp, "popupshowing", this.buildMenu.bind(this, map, sym));
                    map.addListener(symb, trbn_1, "mousedown", this.setPosition.bind(this, map, symb, mupp));
                    trbn_1.append(mupp);
                    trim.append(trbn_1);
                    return trim;
                },
                btnClick(e) {
                    switch (e.button) {
                        case 0:
                        case 1:
                            e.view.SessionWindowUI.undoCloseTab(e.view);
                            break;
                        case 2:
                            e.view.SessionWindowUI.undoCloseWindow(0);
                    }
                },
                contextmenu(e) {
                    e.view.PlacesCommandHook.showPlacesOrganizer("History");
                },
                setPosition(map, sym, mupp, e) {
                    map.delListener(sym);
                    var { left, width } = e.target.getBoundingClientRect();
                    mupp.setAttribute("position", (width / 2 + left) < (e.view.innerWidth / 2) ? "after_start" : "after_end");
                    mupp.setAttribute("flip", "both");
                },
                buildMenu(map, sym, e) {
                    map.delListener(sym);
                    var mupp_0 = e.currentTarget;
                    var doc = e.view.document;
                    var muim_0 = doc.createXULElement("menuitem");
                    muim_0.id = "muim-undo-all-history";
                    muim_0.className = "atb-menuitem";
                    muim_0.setAttribute("label", atb_locale.localizeMessage("atbUndoTabM0"));
                    map.addListener(Symbol(), muim_0, "command", e => {
                        e.stopPropagation();
                        e.view.PlacesCommandHook.showPlacesOrganizer("History");
                    });
                    mupp_0.append(muim_0);
                    var muim_1 = doc.createXULElement("menuitem");
                    muim_1.id = "muim-open-sanitize";
                    muim_1.className = "atb-menuitem";
                    muim_1.setAttribute("label", atb_locale.localizeMessage("atbUndoTabM1"));
                    map.addListener(Symbol(), muim_1, "command", e => {
                        e.stopPropagation();
                        e.view.Sanitizer.showUI(e.view);
                    });
                    mupp_0.append(muim_1);
                    var muim_2 = doc.createXULElement("menuitem");
                    muim_2.id = "muim-restore-last-session";
                    muim_2.className = "atb-menuitem";
                    muim_2.setAttribute("hidden", "true");
                    muim_2.setAttribute("label", atb_locale.localizeMessage("atbUndoTabM2"));
                    map.addListener(Symbol(), muim_2, "command", e => {
                        e.stopPropagation();
                        e.view.SessionStore.restoreLastSession();
                    });
                    mupp_0.append(muim_2);
                    var menu_0 = doc.createXULElement("menu");
                    menu_0.id = "menu-recently-closed-win";
                    menu_0.className = "atb-menu";
                    menu_0.setAttribute("hidden", "true");
                    menu_0.setAttribute("label", atb_locale.localizeMessage("atbUndoTabM3"));
                    var mupp_1 = doc.createXULElement("menupopup");
                    var muim_3 = doc.createXULElement("menuitem");
                    muim_3.id = "muim-recently-closed-win";
                    muim_3.className = "atb-menuitem";
                    muim_3.setAttribute("hidden", "true");
                    muim_3.setAttribute("label", atb_locale.localizeMessage("atbUndoTabM4"));
                    map.addListener(Symbol(), muim_3, "command", e => {
                        e.stopPropagation();
                        var { SessionStore } = e.view;
                        for (let { closedId } of SessionStore.getClosedWindowData())
                            SessionStore.forgetClosedWindowById(closedId);
                    });
                    mupp_1.append(muim_3);
                    var musr_0 = doc.createXULElement("menuseparator");
                    musr_0.id = "musr-recently-closed-win";
                    musr_0.className = "atb-menuseparator";
                    musr_0.setAttribute("hidden", "true");
                    mupp_1.append(musr_0);
                    map.addListener(Symbol(), mupp_1, "popupshowing", e => {
                        if (e.currentTarget != e.target) return;
                        var win = e.view;
                        for (let item of mupp_1.querySelectorAll(":scope > :not(.atb-menuitem, .atb-menu, .atb-menuseparator)"))
                            item.remove();
                        if (win.SessionStore.getClosedWindowCount() === 0) {
                            muim_3.setAttribute("hidden", "true");
                            musr_0.setAttribute("hidden", "true");
                            return;
                        }
                        muim_3.removeAttribute("hidden");
                        musr_0.removeAttribute("hidden");
                        mupp_1.append(win.RecentlyClosedTabsAndWindowsMenuUtils.getWindowsFragment(win, "menuitem"));
                        menu_0.removeAttribute("hidden");
                    });
                    menu_0.append(mupp_1);
                    mupp_0.append(menu_0);
                    var musr_1 = doc.createXULElement("menuseparator");
                    musr_1.className = "atb-menuseparator";
                    musr_1.setAttribute("hidden", "true");
                    mupp_0.append(musr_1);
                    var muim_4 = doc.createXULElement("menuitem");
                    muim_4.id = "muim-recently-closed-tabs";
                    muim_4.className = "atb-menuitem";
                    muim_4.setAttribute("hidden", "true");
                    muim_4.setAttribute("label", atb_locale.localizeMessage("atbUndoTabM5"));
                    map.addListener(Symbol(), muim_4, "command", e => {
                        e.stopPropagation();
                        var { SessionStore } = e.view;
                        for (let { id, sourceWindowId, tabs: [{ sourceClosedId }] } of (SessionStore.getClosedTabGroups?.() || []))
                            SessionStore.forgetClosedTabGroup({ sourceWindowId, sourceClosedId }, id);
                        for (let { closedId } of SessionStore.getClosedTabDataForWindow(e.view))
                            SessionStore.forgetClosedTabById(closedId);
                        for (let { closedId, sourceClosedId } of SessionStore.getClosedTabDataFromClosedWindows())
                            SessionStore.forgetClosedTabById(closedId, { sourceClosedId });
                    });
                    mupp_0.append(muim_4);
                    var musr_2 = doc.createXULElement("menuseparator");
                    musr_2.id = "musr-recently-closed-tabs";
                    musr_2.className = "atb-menuseparator";
                    musr_2.setAttribute("hidden", "true");
                    mupp_0.append(musr_2);
                    var popupshowing = e => {
                        if (e.target != mupp_0) return;
                        var { SessionStore } = e.view;
                        if (SessionStore.getClosedWindowCount() === 0) menu_0.setAttribute("hidden", "true");
                        else menu_0.removeAttribute("hidden");
                        if (!SessionStore.canRestoreLastSession) muim_2.setAttribute("hidden", "true");
                        else muim_2.removeAttribute("hidden");
                        for (let item of mupp_0.querySelectorAll(":scope > :not(.atb-menuitem, .atb-menu, .atb-menuseparator)"))
                            item.remove();
                        if (SessionStore.getClosedTabCount() === 0) {
                            musr_1.setAttribute("hidden", "true");
                            muim_4.setAttribute("hidden", "true");
                            musr_2.setAttribute("hidden", "true");
                            return;
                        }
                        musr_1.removeAttribute("hidden");
                        muim_4.removeAttribute("hidden");
                        musr_2.removeAttribute("hidden");
                        var tabsFragment = e.view.RecentlyClosedTabsAndWindowsMenuUtils.getTabsFragment(e.view, "menuitem");
                        mupp_0.append(tabsFragment);
                    };
                    popupshowing(e);
                    map.addListener(sym, mupp_0, "popupshowing", popupshowing);
                }
            },
            {
                id: "atb-combined-bookmarks-mgr",
                type: "custom",
                label: atb_locale.localizeMessage("atbBookmarksMgrL"),
                tooltiptext: atb_locale.localizeMessage("atbBookmarksMgrT"),
                localized: false,
                onBuild(doc) {
                    var trim = doc.createXULElement("toolbaritem");
                    trim.id = this.id;
                    trim.className = "toolbaritem-combined-buttons atb-combined-buttons chromeclass-toolbar-additional";
                    trim.setAttribute("label", this.label);
                    trim.setAttribute("type", "custom");
                    trim.setAttribute("activated", !add_bar_btns.bookMgrRun);
                    var trbn_0 = doc.createXULElement("toolbarbutton");
                    trbn_0.id = "atb-bookmarks-mgr";
                    trbn_0.className = "toolbarbutton-1 atb-combined-buttons-toolbarbutton";
                    trbn_0.setAttribute("label", atb_locale.localizeMessage("atbBookmarksMgrNopopL"));
                    trbn_0.setAttribute("tooltiptext", atb_locale.localizeMessage("atbBookmarksMgrNopopT"));
                    trbn_0.toggleAttribute("context", true);
                    var map = winWeakMap.get(doc.defaultView);
                    map.addListener(Symbol(), trbn_0, "click", this.btnClick.bind(add_bar_btns));
                    trim.append(trbn_0);
                    var trbn_1 = doc.createXULElement("toolbarbutton");
                    trbn_1.id = "atb-bookmarks-mgr-menu";
                    trbn_1.className = "toolbarbutton-1 atb-combined-buttons-dropmarker";
                    trbn_1.setAttribute("type", "menu");
                    trbn_1.setAttribute("label", this.label);
                    trbn_1.setAttribute("tooltiptext", this.tooltiptext);
                    trbn_1.toggleAttribute("context", true);
                    var mupp = doc.createXULElement("menupopup");
                    mupp.id = "atb-bookmarks-mgr-popup";
                    var sym = Symbol(), symb = Symbol();
                    map.addListener(sym, mupp, "popupshowing", this.buildMenu.bind(this, map, sym));
                    map.addListener(symb, trbn_1, "mousedown", this.setPosition.bind(this, map, symb, mupp));
                    trbn_1.append(mupp);
                    trim.append(trbn_1);
                    return trim;
                },
                btnClick(e) {
                    if (this.bookMgrRun) return;
                    switch (e.button) {
                        case 0:
                            this.bookmarkNoPopup(e.view);
                            break;
                        case 1:
                        case 2:
                            e.view.PlacesCommandHook.bookmarkTabs(e.view.gBrowser.selectedTabs);
                    }
                },
                command(e) {
                    var im = e.target;
                    switch (im.dataset.id) {
                        case "atb-bindex":
                            im.replaceWith(im);
                            this.atb_branch.setBoolPref("bookmarksindex", im.hasAttribute("checked"));
                            break;
                        case "atb-orgr":
                            e.view.PlacesCommandHook.showPlacesOrganizer("BookmarksMenu");
                            break;
                        case "atb-fav":
                            im.replaceWith(im);
                            this.atb_branch.setBoolPref("alertnotification", im.hasAttribute("checked"));
                            break;
                        case "atb-favsearch":
                            this.favSearchStart();
                            break;
                        case "atb-asort":
                            im.replaceWith(im);
                            this.atb_branch.setBoolPref("bookmarkssortrevers", im.hasAttribute("checked"));
                            break;
                        case "atb-bsort":
                            this.bookmarksSort();
                    }
                },
                contextmenu(e) {
                    var pref = [1, 2, 0][this.atb_branch.getIntPref("bookmarkssorttype")];
                    this.atb_branch.setIntPref("bookmarkssorttype", pref);
                    e.target.setAttribute("label", atb_locale.localizeMessage(["atbBookmarksSortName", "atbBookmarksSortLoc", "atbBookmarksSortAdd"][pref]));
                },
                popupshowing(e) {
                    var mupp = e.currentTarget;
                    var { atb_branch } = this;
                    mupp.atb_bindex.toggleAttribute("checked", atb_branch.getBoolPref("bookmarksindex"));
                    mupp.atb_fav.toggleAttribute("checked", atb_branch.getBoolPref("alertnotification"));
                    mupp.atb_sort.toggleAttribute("checked", atb_branch.getBoolPref("bookmarkssortrevers"));
                    mupp.atb_sort.nextElementSibling.setAttribute("label", atb_locale.localizeMessage(["atbBookmarksSortName", "atbBookmarksSortLoc", "atbBookmarksSortAdd"][atb_branch.getIntPref("bookmarkssorttype")]));
                },
                setPosition(map, sym, mupp, e) {
                    map.delListener(sym);
                    var { left, width } = e.target.getBoundingClientRect();
                    mupp.setAttribute("position", (width / 2 + left) < (e.view.innerWidth / 2) ? "after_start" : "after_end");
                    mupp.setAttribute("flip", "both");
                },
                buildMenu(map, sym, e) {
                    map.delListener(sym);
                    var mupp = e.currentTarget;
                    var doc = e.view.document;
                    var mugp_0 = doc.createXULElement("menugroup");
                    var muim_0 = doc.createXULElement("menuitem");
                    muim_0.setAttribute("type", "checkbox");
                    muim_0.setAttribute("closemenu", "none");
                    muim_0.setAttribute("tooltiptext", atb_locale.localizeMessage("bookmarksindex"));
                    muim_0.dataset.id = "atb-bindex";
                    mupp.atb_bindex = muim_0;
                    mugp_0.append(muim_0);
                    var muim_1 = doc.createXULElement("menuitem");
                    muim_1.setAttribute("label", atb_locale.localizeMessage("atbBookmarksMgrT"));
                    muim_1.dataset.id = "atb-orgr";
                    mugp_0.append(muim_1);
                    mupp.append(mugp_0);
                    var mugp_1 = doc.createXULElement("menugroup");
                    var muim_2 = doc.createXULElement("menuitem");
                    muim_2.setAttribute("type", "checkbox");
                    muim_2.setAttribute("closemenu", "none");
                    muim_2.setAttribute("tooltiptext", atb_locale.localizeMessage("alertnotification"));
                    muim_2.dataset.id = "atb-fav";
                    mupp.atb_fav = muim_2;
                    mugp_1.append(muim_2);
                    var muim_3 = doc.createXULElement("menuitem");
                    muim_3.setAttribute("label", atb_locale.localizeMessage("atbBookmarksFav"));
                    muim_3.dataset.id = "atb-favsearch";
                    mugp_1.append(muim_3);
                    mupp.append(mugp_1);
                    var mugp_2 = doc.createXULElement("menugroup");
                    var muim_4 = doc.createXULElement("menuitem");
                    muim_4.setAttribute("type", "checkbox");
                    muim_4.setAttribute("closemenu", "none");
                    muim_4.setAttribute("tooltiptext", atb_locale.localizeMessage("atbBookmarksSortRev"));
                    muim_4.dataset.id = "atb-asort";
                    mupp.atb_sort = muim_4;
                    mugp_2.append(muim_4);
                    var muim_5 = doc.createXULElement("menuitem");
                    muim_5.setAttribute("tooltiptext", atb_locale.localizeMessage("atbBookmarksMgrSortT"));
                    muim_5.dataset.id = "atb-bsort";
                    map.addListener(Symbol(), muim_5, "contextmenu", this.contextmenu.bind(add_bar_btns));
                    mugp_2.append(muim_5);
                    mupp.append(mugp_2);
                    this.popupshowing.call(add_bar_btns, { currentTarget: mupp });
                    map.addListener(sym, mupp, "popupshowing", this.popupshowing.bind(add_bar_btns));
                    map.addListener(Symbol(), mupp, "command", this.command.bind(add_bar_btns));
                },
            },
            {
                id: "atb-newtab",
                type: "custom",
                label: atb_locale.localizeMessage("atbNewtabL"),
                tooltiptext: atb_locale.localizeMessage("atbNewtabT"),
                localized: false,
                onBuild(doc) {
                    var trbn = doc.createXULElement("toolbarbutton");
                    trbn.id = this.id;
                    trbn.className = "toolbarbutton-1 chromeclass-toolbar-additional";
                    trbn.setAttribute("label", this.label);
                    trbn.setAttribute("context", "new-tab-button-popup");
                    trbn.setAttribute("tooltiptext", this.tooltiptext);
                    trbn.onclick = e => {
                        if (e.button === 0 || e.button === 1) e.view.BrowserCommands.openTab({ event: e });
                    };
                    return trbn;
                }
            },
            {
                id: "atb-close-other-tabs",
                type: "custom",
                label: atb_locale.localizeMessage("atbCloseOtherTabsL"),
                tooltiptext: atb_locale.localizeMessage("atbCloseOtherTabsT"),
                localized: false,
                onBuild(doc) {
                    var trbn = doc.createXULElement("toolbarbutton");
                    trbn.id = this.id;
                    trbn.className = "toolbarbutton-1 chromeclass-toolbar-additional";
                    trbn.setAttribute("label", this.label);
                    trbn.toggleAttribute("context", true);
                    trbn.setAttribute("tooltiptext", this.tooltiptext);
                    trbn.onclick = e => {
                        switch (e.button) {
                            case 0:
                                add_bar_btns.closeStartTabs(e.view);
                                break;
                            case 1:
                                add_bar_btns.closeTabsDomain(e.view);
                                break;
                            case 2:
                                add_bar_btns.closeEndTabs(e.view);
                        }
                    };
                    return trbn;
                }
            },
            {
                id: "atb-close-all-tabs",
                type: "custom",
                label: atb_locale.localizeMessage("atbCloseAllTabsL"),
                tooltiptext: atb_locale.localizeMessage("atbCloseAllTabsT"),
                localized: false,
                onBuild(doc) {
                    var trbn = doc.createXULElement("toolbarbutton");
                    trbn.id = this.id;
                    trbn.className = "toolbarbutton-1 chromeclass-toolbar-additional";
                    trbn.setAttribute("label", this.label);
                    trbn.toggleAttribute("context", true);
                    trbn.setAttribute("tooltiptext", this.tooltiptext);
                    trbn.onclick = e => {
                        switch (e.button) {
                            case 0:
                                if (!e.shiftKey) add_bar_btns.closeAllTabs(e.view);
                                else e.view.gBrowser.removeAllTabsBut(e.view.gBrowser.selectedTab);
                                break;
                            case 1:
                                add_bar_btns.closeOtherWindow(e.view);
                                break;
                            case 2:
                                add_bar_btns.closeTabsDomain(e.view, true);
                        }
                    };
                    return trbn;
                }
            },
            {
                id: "atb-restart-app",
                type: "custom",
                label: atb_locale.localizeMessage("atbRestartAppL"),
                tooltiptext: atb_locale.localizeMessage("atbRestartAppT"),
                localized: false,
                onBuild(doc) {
                    var trbn = doc.createXULElement("toolbarbutton");
                    trbn.id = this.id;
                    trbn.className = "toolbarbutton-1 chromeclass-toolbar-additional";
                    trbn.setAttribute("label", this.label);
                    trbn.toggleAttribute("context", true);
                    trbn.setAttribute("tooltiptext", this.tooltiptext);
                    trbn.onclick = e => {
                        switch (e.button) {
                            case 0:
                                add_bar_btns.restartApp();
                                break;
                            case 1:
                                e.view.safeModeRestart();
                                break;
                            case 2:
                                add_bar_btns.restartApp(true);
                        }
                    };
                    return trbn;
                }
            },
            {
                id: "atb-about-config",
                type: "custom",
                label: "about:config",
                tooltiptext: atb_locale.localizeMessage("atbAboutConfigT"),
                localized: false,
                onBuild(doc) {
                    var trbn = doc.createXULElement("toolbarbutton");
                    trbn.id = this.id;
                    trbn.className = "toolbarbutton-1 chromeclass-toolbar-additional";
                    trbn.setAttribute("label", this.label);
                    trbn.toggleAttribute("context", true);
                    trbn.setAttribute("tooltiptext", this.tooltiptext);
                    trbn.onclick = e => {
                        switch (e.button) {
                            case 0:
                                if (!e.shiftKey) add_bar_btns.loadURL(e.view, "about:config");
                                else add_bar_btns.openClipboardConfigTab(e.view);
                                break;
                            case 1:
                                add_bar_btns.openClipboardConfigTab(e.view);
                                break;
                            case 2:
                                add_bar_btns.openSelectedConfigTab(e.view);
                        }
                    };
                    return trbn;
                }
            },
            {
                id: "atb-about-downloads",
                type: "custom",
                label: atb_locale.localizeMessage("atbAboutDownloadsL"),
                tooltiptext: atb_locale.localizeMessage("atbAboutDownloadsT"),
                localized: false,
                onBuild(doc) {
                    var trbn = doc.createXULElement("toolbarbutton");
                    trbn.id = this.id;
                    trbn.className = "toolbarbutton-1 chromeclass-toolbar-additional";
                    trbn.setAttribute("label", this.label);
                    trbn.toggleAttribute("context", true);
                    trbn.setAttribute("tooltiptext", this.tooltiptext);
                    trbn.onclick = e => {
                        var win = e.view;
                        switch (e.button) {
                            case 0:
                                win.DownloadsPanel.showDownloadsHistory();
                                break;
                            case 1:
                                try {
                                    atb_ps.getComplexValue("browser.download.lastDir", Ci.nsIFile).launch();
                                } catch {
                                    Services.dirsvc.get("DfltDwnld", Ci.nsIFile).launch();
                                }
                                break;
                            case 2:
                                if (!e.shiftKey) {
                                    win.DownloadsCommon.getData(win, true)._promiseList.then(res => {
                                        var ds = res._downloads, i = ds.length;
                                        while (i--) {
                                            let file = new win.FileUtils.File(ds[i].target.path);
                                            if (!file.exists()) continue;
                                            win.DownloadsCommon.showDownloadedFile(file);
                                            break;
                                        }
                                    });
                                } else
                                    try {
                                        atb_ps.getComplexValue("browser.download.lastDir", Ci.nsIFile).launch();
                                    } catch {
                                        Services.dirsvc.get("DfltDwnld", Ci.nsIFile).launch();
                                    }
                        }
                    };
                    return trbn;
                }
            },
            {
                id: "atb-about-about",
                label: "about:about",
                tooltiptext: atb_locale.localizeMessage("atbAboutAboutT"),
                localized: false,
                onClick(e) {
                    switch (e.button) {
                        case 0:
                            add_bar_btns.loadURL(e.view, "about:about");
                            break;
                        case 1:
                            add_bar_btns.loadURL(e.view, "about:about", true);
                    }
                }
            },
            {
                id: "atb-clear-data",
                label: atb_locale.localizeMessage("atbClearDataL"),
                tooltiptext: atb_locale.localizeMessage("atbClearDataT"),
                localized: false,
                onCommand(e) {
                    e.view.Sanitizer.showUI(e.view);
                }
            },
            {
                id: "atb-preferences",
                label: atb_locale.localizeMessage("atbPreferencesL"),
                tooltiptext: atb_locale.localizeMessage("atbPreferencesT"),
                localized: false,
                onClick(e) {
                    switch (e.button) {
                        case 0:
                            e.view.switchToTabHavingURI(`${atb_uri}options.xhtml`, true, {
                                triggeringPrincipal: atb_ext.principal,
                            });
                            break;
                        case 1:
                            e.view.openPreferences();
                    }
                }
            },
            {
                id: "atb-snap-back",
                type: "custom",
                label: atb_locale.localizeMessage("atbSnapBackL"),
                tooltiptext: atb_locale.localizeMessage("atbSnapBackT"),
                localized: false,
                onBuild(doc) {
                    var trbn = doc.createXULElement("toolbarbutton");
                    trbn.id = this.id;
                    trbn.className = "toolbarbutton-1 chromeclass-toolbar-additional";
                    trbn.setAttribute("label", this.label);
                    trbn.toggleAttribute("context", true);
                    trbn.setAttribute("tooltiptext", this.tooltiptext);
                    trbn.onclick = e => {
                        var win = e.view, wn;
                        switch (e.button) {
                            case 0:
                                wn = win.gBrowser.webNavigation;
                                if (wn.canGoBack) wn.gotoIndex(0);
                                break;
                            case 1:
                                win.gURLBar.handleCommand(e);
                                break;
                            case 2:
                                wn = win.gBrowser.webNavigation;
                                if (wn.canGoForward) win.SessionStore.getSessionHistory(win.gBrowser.selectedTab, data => wn.gotoIndex(data.entries.length - 1));
                        }
                    };
                    return trbn;
                }
            },
            {
                id: "atb-top-page",
                label: atb_locale.localizeMessage("atbTopPageL"),
                tooltiptext: atb_locale.localizeMessage("atbTopPageT"),
                localized: false,
                onCommand(e) {
                    add_bar_btns.sendAsyncMessages(e.view, "ATBWinActor:ScrollTop");
                }
            },
            {
                id: "atb-bottom-page",
                label: atb_locale.localizeMessage("atbBottomPageL"),
                tooltiptext: atb_locale.localizeMessage("atbBottomPageT"),
                localized: false,
                onCommand(e) {
                    add_bar_btns.sendAsyncMessages(e.view, "ATBWinActor:ScrollBottom");
                }
            },
            {
                id: "atb-up-page",
                label: atb_locale.localizeMessage("atbUpPageL"),
                tooltiptext: atb_locale.localizeMessage("atbUpPageT"),
                localized: false,
                onCommand(e) {
                    add_bar_btns.sendAsyncMessages(e.view, "ATBWinActor:ScrollPageUp");
                }
            },
            {
                id: "atb-down-page",
                label: atb_locale.localizeMessage("atbDownPageL"),
                tooltiptext: atb_locale.localizeMessage("atbDownPageT"),
                localized: false,
                onCommand(e) {
                    add_bar_btns.sendAsyncMessages(e.view, "ATBWinActor:ScrollPageDown");
                }
            },
            {
                id: "atb-find-bar",
                type: "custom",
                label: atb_locale.localizeMessage("atbFindBarL"),
                tooltiptext: atb_locale.localizeMessage("atbFindBarT"),
                localized: false,
                onBuild(doc) {
                    var trbn = doc.createXULElement("toolbarbutton");
                    trbn.id = this.id;
                    trbn.className = "toolbarbutton-1 chromeclass-toolbar-additional";
                    trbn.setAttribute("label", this.label);
                    trbn.toggleAttribute("context", true);
                    trbn.setAttribute("tooltiptext", this.tooltiptext);
                    trbn.onclick = e => {
                        switch (e.button) {
                            case 0:
                                if (!e.shiftKey) add_bar_btns.findBarFind(e.view);
                                else add_bar_btns.findBarPaste(e.view);
                                break;
                            case 1:
                                add_bar_btns.findBarPaste(e.view);
                                break;
                            case 2:
                                add_bar_btns.findBarCopyPaste(e.view);
                        }
                    };
                    return trbn;
                }
            },
            {
                id: "atb-clear-bar",
                type: "custom",
                label: atb_locale.localizeMessage("atbClearBarL"),
                tooltiptext: atb_locale.localizeMessage("atbClearBarT"),
                localized: false,
                onBuild(doc) {
                    var trbn = doc.createXULElement("toolbarbutton");
                    trbn.id = this.id;
                    trbn.className = "toolbarbutton-1 chromeclass-toolbar-additional";
                    trbn.setAttribute("label", this.label);
                    trbn.toggleAttribute("context", true);
                    trbn.setAttribute("tooltiptext", this.tooltiptext);
                    trbn.onclick = e => {
                        switch (e.button) {
                            case 0:
                                add_bar_btns.clearUrlBar(e.view);
                                break;
                            case 1:
                                add_bar_btns.clearAllBar(e.view);
                                break;
                            case 2:
                                add_bar_btns.clearSearchBar(e.view);
                        }
                    };
                    return trbn;
                }
            },
            {
                id: "atb-paste-and-go",
                type: "custom",
                label: atb_locale.localizeMessage("atbPasteAndGoL"),
                tooltiptext: atb_locale.localizeMessage("atbPasteAndGoT"),
                localized: false,
                onBuild(doc) {
                    var trbn = doc.createXULElement("toolbarbutton");
                    trbn.id = this.id;
                    trbn.className = "toolbarbutton-1 chromeclass-toolbar-additional";
                    trbn.setAttribute("label", this.label);
                    trbn.toggleAttribute("context", true);
                    trbn.setAttribute("tooltiptext", this.tooltiptext);
                    trbn.onclick = e => {
                        switch (e.button) {
                            case 0:
                                add_bar_btns.loadURLFromClipboard(e.view);
                                break;
                            case 1:
                                add_bar_btns.loadURLFromClipboard(e.view, true);
                                break;
                            case 2:
                                add_bar_btns.searchFromClipboard(e.view);
                        }
                    };
                    return trbn;
                }
            },
            {
                id: "atb-copy-and-go",
                type: "custom",
                label: atb_locale.localizeMessage("atbCopyAndGoL"),
                tooltiptext: atb_locale.localizeMessage("atbCopyAndGoT"),
                localized: false,
                onBuild(doc) {
                    var trbn = doc.createXULElement("toolbarbutton");
                    trbn.id = this.id;
                    trbn.className = "toolbarbutton-1 chromeclass-toolbar-additional";
                    trbn.setAttribute("label", this.label);
                    trbn.toggleAttribute("context", true);
                    trbn.setAttribute("tooltiptext", this.tooltiptext);
                    trbn.onclick = e => {
                        switch (e.button) {
                            case 0:
                                add_bar_btns.copyLoadURL(e.view);
                                break;
                            case 1:
                                add_bar_btns.copyLoadURL(e.view, true);
                                break;
                            case 2:
                                if (!e.shiftKey) add_bar_btns.copyCurrentURI(e.view, `${this.id}-url`);
                                else add_bar_btns.copyDomainURI(e.view, `${this.id}-domain`);
                        }
                    };
                    return trbn;
                }
            },
            {
                id: "atb-profilefolder",
                type: "custom",
                label: atb_locale.localizeMessage("atbProfilefolderL"),
                tooltiptext: atb_locale.localizeMessage("atbProfilefolderT"),
                localized: false,
                onBuild(doc) {
                    var trbn = doc.createXULElement("toolbarbutton");
                    trbn.id = this.id;
                    trbn.className = "toolbarbutton-1 chromeclass-toolbar-additional";
                    trbn.setAttribute("label", this.label);
                    trbn.toggleAttribute("context", true);
                    trbn.setAttribute("tooltiptext", this.tooltiptext);
                    trbn.onclick = e => {
                        var dirs;
                        switch (e.button) {
                            case 0:
                                dirs = Services.dirsvc.get("ProfD", Ci.nsIFile);
                                if (dirs.exists()) dirs.launch();
                                break;
                            case 1:
                                dirs = Services.dirsvc.get("GreD", Ci.nsIFile);
                                while (dirs.parent)
                                    dirs = dirs.parent;
                                dirs.launch();
                                break;
                            case 2:
                                dirs = Services.dirsvc.get("GreD", Ci.nsIFile);
                                dirs.launch();
                        }
                    };
                    return trbn;
                }
            },
            {
                id: "atb-pass-words",
                label: atb_locale.localizeMessage("atbPassWordsL"),
                tooltiptext: atb_locale.localizeMessage("atbPassWordsT"),
                localized: false,
                onCommand(e) {
                    add_bar_btns.viewPasswords(e.view);
                }
            },
            {
                id: "atb-toggle-styles",
                label: atb_locale.localizeMessage("atbToggleStylesL"),
                tooltiptext: atb_locale.localizeMessage("atbToggleStylesT"),
                localized: false,
                onCommand(e) {
                    var win = e.view;
                    try {
                        if (!!win.gBrowser.selectedBrowser.browsingContext?.authorStyleDisabledDefault) win.gPageStyleMenu.switchStyleSheet(null);
                        else win.gPageStyleMenu.disableStyle();
                    } catch { }
                }
            },
            {
                id: "atb-open-console",
                type: "custom",
                label: atb_locale.localizeMessage("atbOpenConsoleL"),
                tooltiptext: atb_locale.localizeMessage("atbOpenConsoleT"),
                localized: false,
                onBuild(doc) {
                    var trbn = doc.createXULElement("toolbarbutton");
                    trbn.id = this.id;
                    trbn.className = "toolbarbutton-1 chromeclass-toolbar-additional";
                    trbn.setAttribute("label", this.label);
                    trbn.toggleAttribute("context", true);
                    trbn.setAttribute("tooltiptext", this.tooltiptext);
                    trbn.onclick = e => {
                        switch (e.button) {
                            case 0:
                                e.target.ownerDocument.querySelector("key[id=key_browserConsole]").doCommand();
                                break;
                            case 1:
                                e.target.ownerDocument.querySelector("key[id=key_webconsole]").doCommand();
                                break;
                            case 2:
                                e.target.ownerDocument.querySelector("key[id=key_inspector]").doCommand();
                        }
                    };
                    return trbn;
                }
            },
            {
                id: "atb-text-to-link",
                type: "custom",
                label: atb_locale.localizeMessage("atbTextToLinkL"),
                tooltiptext: atb_locale.localizeMessage("atbTextToLinkT"),
                localized: false,
                onBuild(doc) {
                    var trbn = doc.createXULElement("toolbarbutton");
                    trbn.id = this.id;
                    trbn.className = "toolbarbutton-1 chromeclass-toolbar-additional";
                    trbn.setAttribute("label", this.label);
                    trbn.toggleAttribute("context", true);
                    trbn.setAttribute("tooltiptext", this.tooltiptext);
                    trbn.onclick = e => {
                        switch (e.button) {
                            case 0:
                                add_bar_btns.sendAsyncMessages(e.view, "ATBWinActor:TextToLink");
                                break;
                            case 1:
                                add_bar_btns.sendAsyncMessages(e.view, "ATBWinActor:CopyAllLinks");
                                break;
                            case 2:
                                add_bar_btns.sendAsyncMessages(e.view, "ATBWinActor:LinkPointerEvents");
                        }
                    };
                    return trbn;
                }
            },
            {
                id: "atb-addons-manager",
                label: atb_locale.localizeMessage("atbAddonsManagerL"),
                tooltiptext: atb_locale.localizeMessage("atbAddonsManagerT"),
                localized: false,
                onCommand(e) {
                    e.view.BrowserAddonUI.openAddonsMgr();
                }
            },
            {
                id: "atb-open-file",
                type: "custom",
                label: atb_locale.localizeMessage("atbOpenFileL"),
                tooltiptext: atb_locale.localizeMessage("atbOpenFileT"),
                localized: false,
                onBuild(doc) {
                    var trbn = doc.createXULElement("toolbarbutton");
                    trbn.id = this.id;
                    trbn.className = "toolbarbutton-1 chromeclass-toolbar-additional";
                    trbn.setAttribute("label", this.label);
                    trbn.toggleAttribute("context", true);
                    trbn.setAttribute("tooltiptext", this.tooltiptext);
                    trbn.onclick = e => {
                        switch (e.button) {
                            case 0:
                                e.view.BrowserCommands.openFileWindow();
                                break;
                            case 1:
                                add_bar_btns.openUChrmFiles("userContent.css", this.id);
                                break;
                            case 2:
                                add_bar_btns.openUChrmFiles("userChrome.css", this.id);
                        }
                    };
                    return trbn;
                }
            },
            {
                id: "atb-saveas",
                label: atb_locale.localizeMessage("atbSaveasL"),
                tooltiptext: atb_locale.localizeMessage("atbSaveasT"),
                localized: false,
                onCommand(e) {
                    var win = e.view;
                    win.saveBrowser(win.gBrowser.selectedBrowser);
                }
            },
            {
                id: "atb-reduce",
                type: "custom",
                label: atb_locale.localizeMessage("atbReduceL"),
                tooltiptext: atb_locale.localizeMessage("atbReduceT"),
                localized: false,
                onBuild(doc) {
                    var trbn = doc.createXULElement("toolbarbutton");
                    trbn.id = this.id;
                    trbn.className = "toolbarbutton-1 chromeclass-toolbar-additional";
                    trbn.setAttribute("label", this.label);
                    trbn.toggleAttribute("context", true);
                    trbn.setAttribute("tooltiptext", this.tooltiptext);
                    trbn.onclick = e => {
                        switch (e.button) {
                            case 0:
                                e.view.FullZoom.reduce();
                                break;
                            case 1:
                                e.view.FullZoom.enlarge();
                                break;
                            case 2:
                                e.view.FullZoom.reset();
                        }
                    };
                    return trbn;
                }
            },
            {
                id: "atb-enlarge",
                type: "custom",
                label: atb_locale.localizeMessage("atbEnlargeL"),
                tooltiptext: atb_locale.localizeMessage("atbEnlargeT"),
                localized: false,
                onBuild(doc) {
                    var trbn = doc.createXULElement("toolbarbutton");
                    trbn.id = this.id;
                    trbn.className = "toolbarbutton-1 chromeclass-toolbar-additional";
                    trbn.setAttribute("label", this.label);
                    trbn.toggleAttribute("context", true);
                    trbn.setAttribute("tooltiptext", this.tooltiptext);
                    trbn.onclick = e => {
                        switch (e.button) {
                            case 0:
                                e.view.FullZoom.enlarge();
                                break;
                            case 1:
                                e.view.FullZoom.reduce();
                                break;
                            case 2:
                                e.view.FullZoom.reset();
                        }
                    };
                    return trbn;
                }
            },
            {
                id: "atb-ext-option-menu",
                type: "custom",
                label: atb_locale.localizeMessage("atbExtOptionMenuL"),
                tooltiptext: atb_locale.localizeMessage("atbExtOptionMenuT"),
                localized: false,
                onBuild(doc) {
                    var trbn = doc.createXULElement("toolbarbutton");
                    trbn.id = this.id;
                    trbn.className = "toolbarbutton-1 chromeclass-toolbar-additional";
                    trbn.setAttribute("label", this.label);
                    trbn.setAttribute("tooltiptext", this.tooltiptext);
                    trbn.setAttribute("type", "menu");
                    var mupp = doc.createXULElement("menupopup");
                    mupp.id = `${this.id}-popup`;
                    var map = winWeakMap.get(doc.defaultView);
                    map.addListener(Symbol(), mupp, "contextmenu", e => {
                        e.preventDefault();
                        e.stopPropagation();
                    });
                    map.addListener(Symbol(), mupp, "popupshowing", this.populateMenu.bind(this, map, this.id));
                    var symb = Symbol();
                    map.addListener(symb, trbn, "mousedown", this.setPosition.bind(this, map, symb, mupp));
                    trbn.append(mupp);
                    return trbn;
                },
                setPosition(map, sym, mupp, e) {
                    map.delListener(sym);
                    var { left, width } = e.target.getBoundingClientRect();
                    mupp.setAttribute("position", (width / 2 + left) < (e.view.innerWidth / 2) ? "after_start" : "after_end");
                    mupp.setAttribute("flip", "both");
                },
                async populateMenu(map, id, e) {
                    var addons = AddonManager.getAddonsByTypes(add_bar_btns.exceptions_type_listarr);
                    var popup = e.currentTarget, doc = e.view.document;
                    var exceptions_listset = add_bar_btns.exceptions_listset,
                        enabled_first = add_bar_btns.enabled_first,
                        show_disabled = add_bar_btns.show_disabled,
                        show_hidden = add_bar_btns.show_hidden,
                        user_permissions = add_bar_btns.user_permissions,
                        show_version = add_bar_btns.show_version,
                        show_description = add_bar_btns.show_description,
                        max_width_main_item = add_bar_btns.max_width_main_item,
                        max_height_popup = add_bar_btns.max_height_popup;
                    var locale_desc = atb_locale.localizeMessage("locale_desc"),
                        locale_perm = atb_locale.localizeMessage("locale_perm"),
                        locale_opts = atb_locale.localizeMessage("locale_opts"),
                        locale_contr = atb_locale.localizeMessage("locale_contr"),
                        locale_copyid = atb_locale.localizeMessage("locale_copyid"),
                        locale_copyuuid = atb_locale.localizeMessage("locale_copyuuid"),
                        locale_home = atb_locale.localizeMessage("locale_home"),
                        locale_author = atb_locale.localizeMessage("locale_author"),
                        locale_source = atb_locale.localizeMessage("locale_source"),
                        locale_sourceext = atb_locale.localizeMessage("locale_sourceext"),
                        locale_toogle = atb_locale.localizeMessage("locale_toogle"),
                        locale_pin = atb_locale.localizeMessage("locale_pin"),
                        locale_del = atb_locale.localizeMessage("locale_del"),
                        locale_am = atb_locale.localizeMessage("locale_am"),
                        locale_amup = atb_locale.localizeMessage("locale_amup"),
                        locale_dbg = atb_locale.localizeMessage("locale_dbg");
                    var img_addons = "resource://add_toolbar_buttons/svg/addons.svg",
                        img_opts = "resource://add_toolbar_buttons/svg/preferences.svg",
                        img_copy = "resource://add_toolbar_buttons/svg/copy.svg",
                        img_open = "resource://add_toolbar_buttons/svg/user-home.svg",
                        img_view = "resource://add_toolbar_buttons/svg/view.svg",
                        img_unins = "resource://add_toolbar_buttons/svg/uninstall.svg";
                    var addonsMap = new Map();
                    var createGroup = (addon, extension) => {
                        var groop = doc.createXULElement("menugroup");
                        var uuid = (addon.isActive && extension?.uuid);
                        var widgetid = (addon.type === "extension" && addon.isActive && extension?.apiManager?.global?.browserActionFor?.(extension)?.widget?.id);
                        for (let [name, tooltip, img, lab, checkbox] of [
                            ["toogle", ("userDisabled" in addon) ? (!widgetid ? locale_toogle : `${locale_toogle}\n${locale_pin}`) : "", "", "", true],
                            ["main", `${addon.name} ${addon.version}\n${(show_description && addon.description) ? `${locale_desc} ${addon.description}\n` : ""}ID: ${addon.id}\n${uuid ? `UUID: ${uuid}\n` : ""}${(user_permissions && addon.userPermissions?.permissions?.length) ? `${locale_perm} ${addon.userPermissions.permissions.join(", ")}` : ""}`, addon.iconURL, `${addon.name} ${show_version ? addon.version : ""}`],
                            ["opts", !addon.isSystem ? `${addon.optionsURL ? `${locale_opts}\n` : ""}${locale_contr}` : "", img_opts],
                            ["open", `${addon.homepageURL ? `${locale_home}\n` : ""}${addon.creator?.url ? locale_author : ""}`, img_open],
                            ["copy", `${locale_copyid}\n${uuid ? locale_copyuuid : ""}`, img_copy],
                            ["view", ("getResourceURI" in addon) ? `${!addon.isBuiltin ? `${locale_source}\n${locale_sourceext}` : locale_source}` : "", img_view],
                            ["uninstall", ("uninstall" in addon && !addon.isSystem && !addon.isBuiltin) ? locale_del : "", img_unins]
                        ]) {
                            let item = doc.createXULElement("menuitem");
                            item.setAttribute("iname", name);
                            item.setAttribute("closemenu", "none");
                            if (lab) item.label = lab;
                            if (img) item.image = img;
                            if (checkbox) {
                                item.setAttribute("type", "checkbox");
                                if (addon.isActive) item.toggleAttribute("checked", true);
                            } else item.className = "menuitem-iconic";
                            if (tooltip) item.tooltipText = tooltip;
                            else item.disabled = true;
                            groop.append(item);
                        }
                        groop.className = `atb-type-${addon.type}`;
                        if (addon.isSystem) groop.classList.add("atb-system");
                        else if (addon.optionsURL) groop.classList.add("atb-options");
                        if (addon.isCorrectlySigned === false) groop.classList.add("atb-warning");
                        if (addon.blocklistState || !addon.isCompatible) groop.classList.add("atb-error");
                        groop._addon = addon;
                        groop._extension = extension;
                        groop._widgetid = widgetid;
                        return groop;
                    };
                    popup.style.setProperty("--v-max-width-item", `${max_width_main_item}em`);
                    popup.style.setProperty("max-height", !max_height_popup ? "none" : `${max_height_popup}em`);
                    var frag = doc.createDocumentFragment();
                    (await addons).filter(a => !a.getResourceURI?.().spec.startsWith("resource://search-extensions/")).sort((a, b) =>
                        (`${(enabled_first ? a.isActive ? "0" : "1" : "")}${a.type || ""}${a.name.toLowerCase()}` > `${(enabled_first ? b.isActive ? "0" : "1" : "")}${b.type || ""}${b.name.toLowerCase()}`) ? 1 : -1
                    ).forEach(addon => {
                        if (!exceptions_listset.has(addon.id) &&
                            (!addon.hidden || show_hidden) &&
                            (addon.isActive || show_disabled)) {
                            let extension = GlobalManager.extensionMap.get(addon.id);
                            let gp = createGroup(addon, extension);
                            frag.append(gp);
                            addonsMap.set(addon.id, gp);
                        }
                    });
                    var groop = doc.createXULElement("menugroup");
                    for (let [name, tooltip, img, lab] of [
                        ["manager", locale_amup, img_addons, locale_am],
                        ["debugging", locale_dbg, img_view, locale_dbg],
                    ]) {
                        let item = doc.createXULElement("menuitem");
                        item.className = "menuitem-iconic";
                        item.setAttribute("iname", name);
                        item.setAttribute("closemenu", "none");
                        item.label = lab;
                        item.image = img;
                        item.tooltipText = tooltip;
                        groop.append(item);
                    }
                    var sep = doc.createXULElement("menuseparator");
                    sep.id = `${id}-separator`;
                    frag.prepend(sep);
                    frag.prepend(groop);
                    popup.append(frag);
                    var sym = Symbol();
                    map.addListener(sym, popup, "click", this.handleClick.bind(this));
                    var listener = {
                        onEnabled(addon) {
                            var gp = addonsMap.get(addon.id);
                            if (gp) {
                                let g = createGroup(addon, GlobalManager.extensionMap.get(addon.id));
                                gp.replaceWith(g);
                                addonsMap.set(addon.id, g);
                            }
                        },
                        onDisabled(addon) {
                            this.onEnabled(addon);
                        },
                        onInstalled(addon) {
                            var g = createGroup(addon, GlobalManager.extensionMap.get(addon.id));
                            var gp = addonsMap.get(addon.id);
                            if (gp) gp.replaceWith(g);
                            else popup.querySelector(`:scope>#${id}-separator`).after(g);
                            addonsMap.set(addon.id, g);
                        },
                        onUninstalled(addon) {
                            var gp = addonsMap.get(addon.id);
                            if (gp) {
                                gp.remove();
                                addonsMap.delete(addon.id);
                            }
                        },
                    };
                    AddonManager.addAddonListener(listener);
                    var symph = Symbol();
                    map.addListener(symph, popup, "popuphiding", () => {
                        map.delListener(symph);
                        map.delListener(sym);
                        AddonManager.removeAddonListener(listener);
                        addonsMap.clear();
                        for (let item of popup.querySelectorAll(":scope>*"))
                            item.remove();
                    });
                },
                handleClick(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    var mi = e.target;
                    if (mi.disabled) return;
                    var win = e.view, gp = mi.parentElement, addon = gp._addon, extension = gp._extension;
                    switch (mi.getAttribute("iname")) {
                        case "main":
                            if (e.button) {
                                if (!addon.isSystem && addon.optionsURL) this.openAddonOptions(addon, win);
                                return;
                            } else if (!("userDisabled" in addon)) return;
                        case "toogle": {
                            if (e.button === 2) {
                                if (!gp._widgetid) return;
                                let shouldPinTT = CustomizableUI.getPlacementOfWidget(gp._widgetid).area === CustomizableUI.AREA_ADDONS;
                                if (shouldPinTT) win.gUnifiedExtensions._maybeMoveWidgetNodeBack(gp._widgetid);
                                win.gUnifiedExtensions.pinToToolbar(gp._widgetid, shouldPinTT);
                                return;
                            }
                            let { userDisabled } = addon;
                            addon[userDisabled ? "enable" : "disable"]({ allowSystemAddons: true });
                            switch (addon.id) {
                                case "formautofill@mozilla.org":
                                    Services.prefs.setBoolPref("dom.forms.autocomplete.formautofill", userDisabled);
                                    break;
                                case "pictureinpicture@mozilla.org":
                                    Services.prefs.setBoolPref("extensions.pictureinpicture.enable_picture_in_picture_overrides", userDisabled);
                                    break;
                                case "webcompat@mozilla.org":
                                case "webcompat-reporter@mozilla.org":
                                    Services.prefs.setBoolPref("extensions.webcompat-reporter.enabled", userDisabled);
                                    break;
                                case "screenshots@mozilla.org":
                                    Services.prefs.setBoolPref("extensions.screenshots.disabled", !userDisabled);
                            }
                            break;
                        }
                        case "opts":
                            if (!e.button) this.openAddonOptions(addon, win);
                            else win.BrowserAddonUI.openAddonsMgr(`addons://detail/${encodeURIComponent(addon.id)}`);
                            break;
                        case "copy":
                            if (!e.button) {
                                add_bar_btns.clipboard.copyStringToClipboard(addon.id, Ci.nsIClipboard.kGlobalClipboard);
                                setTimeout(() => add_bar_btns.showAlert({ name: `${addon.id}-id`, title: `ID ${atb_locale.localizeMessage("locale_clip")}`, text: addon.id, alertTimeout: add_bar_btns.alert_timeout }), 100);
                            } else if (extension?.uuid) {
                                add_bar_btns.clipboard.copyStringToClipboard(extension.uuid, Ci.nsIClipboard.kGlobalClipboard);
                                setTimeout(() => add_bar_btns.showAlert({ name: `${addon.id}-uuid`, title: `UUID ${atb_locale.localizeMessage("locale_clip")}`, text: extension.uuid, alertTimeout: add_bar_btns.alert_timeout }), 100);
                            }
                            break;
                        case "open":
                            if (!e.button) {
                                if (addon.homepageURL) win.gBrowser.selectedTab = add_bar_btns.addTab(win, addon.homepageURL);
                            } else if (addon.creator?.url) win.gBrowser.selectedTab = add_bar_btns.addTab(win, addon.creator.url);
                            break;
                        case "view":
                            if (!e.button) this.browseDir(addon, win);
                            else if (!addon.isBuiltin) this.browseDir(addon);
                            break;
                        case "uninstall":
                            if (e.button) return;
                            win.closeMenus(mi);
                            if (Services.prompt.confirm(win, null, `${atb_locale.localizeMessage("locale_del")} ${addon.name}?`)) addon.uninstall();
                            break;
                        case "manager":
                            this.openAddonsMgrOrUpdate(win, e.button, mi);
                            break;
                        case "debugging":
                            if (!e.button) win.switchToTabHavingURI("about:debugging#/runtime/this-firefox", true, { ignoreFragment: "whenComparing", triggeringPrincipal: Services.scriptSecurityManager.getSystemPrincipal(), });
                    }
                },
                async openAddonsMgrOrUpdate(win, button, mi) {
                    var page = await win.BrowserAddonUI.openAddonsMgr("addons://list/extension");
                    if (!button || !page) return;
                    win.closeMenus(mi);
                    var updateBtn = page.document.querySelector("[action=\"check-for-updates\"]");
                    if (updateBtn && !updateBtn.disabled) updateBtn.click();
                },
                openAddonOptions(addon, win) {
                    switch (addon.optionsType) {
                        case 5:
                            win.BrowserAddonUI.openAddonsMgr(`addons://detail/${encodeURIComponent(addon.id)}/preferences`);
                            break;
                        case 3:
                            win.switchToTabHavingURI(addon.optionsURL, true);
                            break;
                        case 1: {
                            let wins = Services.wm.getEnumerator(null);
                            while (wins.hasMoreElements()) {
                                let w = wins.getNext();
                                if (!w.closed && w.document.documentURI === addon.optionsURL) return w.focus();
                            }
                            win.openDialog(addon.optionsURL, addon.id, `chrome,titlebar,toolbar,centerscreen${Services.prefs.getBoolPref("browser.preferences.instantApply", false) ? ",dialog=no" : ""}`);
                        }
                    }
                },
                browseDir(addon, win) {
                    if (win) win.gBrowser.selectedTab = add_bar_btns.addTab(win, addon.getResourceURI().spec);
                    else {
                        let file = Services.io.getProtocolHandler("file")
                            .QueryInterface(Ci.nsIFileProtocolHandler)
                            .getFileFromURLSpec(addon.getResourceURI().QueryInterface(Ci.nsIJARURI).JARFile.spec);
                        if (file.exists()) file.launch();
                    }
                },
            },
            {
                id: "atb-sound-muted-all-tabs",
                type: "custom",
                label: atb_locale.localizeMessage("atbSoundMutedAllTabsL"),
                tooltiptext: atb_locale.localizeMessage("atbSoundMutedAllTabsT"),
                localized: false,
                onBuild(doc) {
                    var trbn = doc.createXULElement("toolbarbutton");
                    trbn.id = this.id;
                    trbn.className = "toolbarbutton-1 chromeclass-toolbar-additional badged-button";
                    trbn.setAttribute("label", this.label);
                    trbn.setAttribute("badged", "true");
                    trbn.setAttribute("constrain-size", "true");
                    trbn.setAttribute("badge", (add_bar_btns.media_volume_scale * 100).toFixed());
                    trbn.setAttribute("badgeStyle", "background: light-dark(oklch(62% 0.25 260), oklch(65% 0.25 260)); color: oklch(1 0 0); font-size: 10px; font-weight: normal; line-height: 10px; box-shadow: none; text-shadow: none; padding-block: 0 1px !important; padding-inline: 2px !important; min-width: 0 !important;");
                    trbn.setAttribute("tooltiptext", this.tooltiptext);
                    var map = winWeakMap.get(doc.defaultView);
                    map.addListener(Symbol(), trbn, "wheel", this.setSoundVolume.bind(add_bar_btns));
                    map.addListener(Symbol(), trbn, "click", this.btnClick.bind(add_bar_btns));
                    return trbn;
                },
                btnClick(e) {
                    var win = e.view;
                    switch (e.button) {
                        case 0:
                            if (!e.shiftKey) win.gBrowser.toggleMuteAudioOnMultiSelectedTabs(win.gBrowser.selectedTab);
                            else {
                                let tabsToToggle;
                                if (win.gBrowser.selectedTab.activeMediaBlocked) tabsToToggle = win.gBrowser.visibleTabs.filter(tab => tab.activeMediaBlocked || tab.linkedBrowser.audioMuted);
                                else {
                                    let tabMuted = win.gBrowser.selectedTab.linkedBrowser.audioMuted;
                                    tabsToToggle = win.gBrowser.visibleTabs.filter(tab => (tab.linkedBrowser.audioMuted == tabMuted && !tab.activeMediaBlocked) || (tab.activeMediaBlocked && tabMuted));
                                }
                                for (let tab of tabsToToggle)
                                    tab.toggleMuteAudio();
                            }
                            break;
                        case 1:
                            for (let tab of win.gBrowser.visibleTabs.filter(tab => !tab.selected && (tab.muted || tab.soundPlaying)))
                                win.gBrowser.removeTab(tab);
                    }
                },
                setSoundVolume(e) {
                    var pref = "media.volume_scale", gpref = parseFloat(atb_ps.getCharPref(pref)), step = this.sound_volume_step;
                    if (isNaN(gpref)) gpref = 0;
                    var val = (e.deltaY < 0) ? (gpref + step) : (gpref - step);
                    if (val < 0) val = 0;
                    else if (val > 1) val = 1;
                    atb_ps.setCharPref(pref, val.toFixed(2));
                },
            },
        ];
        this.widgets.forEach(w => {
            try {
                CustomizableUI.createWidget(w);
            } catch { }
        });
    },
    restartApp(nocache = false) {
        var cancelQuit = Cc["@mozilla.org/supports-PRBool;1"].createInstance(Ci.nsISupportsPRBool);
        Services.obs.notifyObservers(cancelQuit, "quit-application-requested", "restart");
        if (cancelQuit.data) return false;
        if (nocache) Services.appinfo.invalidateCachesOnRestart();
        var { startup } = Services;
        startup.quit(startup.eAttemptQuit | startup.eRestart);
    },
    openUChrmFiles(filename, name) {
        try {
            let file = Services.dirsvc.get("UChrm", Ci.nsIFile);
            file.append(filename);
            if (file.exists()) file.launch();
            else this.showAlert({ name, title: filename, text: atb_locale.localizeMessage("openUChrmFiles"), alertTimeout: this.alert_timeout });
        } catch { }
    },
    async bookmarkNoPopup(win) {
        if (this.bookmarksInsertRemove) return;
        this.bookmarksInsertRemove = true;
        var { bookmarks } = PlacesUtils;
        var url = win.gBrowser.selectedBrowser.currentURI.spec;
        var array = await bookmarks.search({ url });
        if (!array.length)
            try {
                await bookmarks.insert({
                    url: Services.io.newURI(url),
                    title: (win.gBrowser.contentTitle || win.gBrowser.selectedTab.label || url),
                    parentGuid: [() => bookmarks.menuGuid, () => bookmarks.toolbarGuid, () => bookmarks.unfiledGuid][this.atb_branch.getIntPref("bookmarksparentguid")](),
                    index: (!this.atb_branch.getBoolPref("bookmarksindex") ? bookmarks.DEFAULT_INDEX : 0),
                });
            } catch { }
        else
            try {
                await bookmarks.remove(array);
            } catch { }
        this.bookmarksInsertRemove = false;
    },
    closeStartTabs(win) {
        var ctab = win.gBrowser.selectedTab, tabs;
        if (ctab.multiselected) tabs = win.gBrowser.visibleTabs.filter(tab => !tab.multiselected && !tab.pinned);
        else tabs = win.gBrowser.visibleTabs.filter(tab => !tab.pinned);
        var index = tabs.indexOf(ctab);
        tabs = tabs.slice(0, (index != -1) ? index : tabs.length);
        tabs.forEach(tab => {
            win.gBrowser.removeTab(tab);
        });
    },
    closeEndTabs(win) {
        var ctab = win.gBrowser.selectedTab, tabs;
        if (ctab.multiselected) tabs = win.gBrowser.visibleTabs.filter(tab => !tab.multiselected && !tab.pinned);
        else tabs = win.gBrowser.visibleTabs.filter(tab => !tab.pinned);
        var index = tabs.indexOf(ctab);
        tabs = tabs.slice((index != -1) ? (index + 1) : 0, tabs.length);
        tabs.forEach(tab => {
            win.gBrowser.removeTab(tab);
        });
    },
    closeOtherWindow(win) {
        for (let w of CustomizableUI.windows)
            if (w != win) w.close();
    },
    addTab(win, url, params = {}) {
        params.triggeringPrincipal = Services.scriptSecurityManager.getSystemPrincipal();
        params.index = params.tabIndex = (win.gBrowser.selectedTab.index ?? win.gBrowser.selectedTab._tPos) + 1;
        return win.gBrowser.addTab(url, params);
    },
    closeAllTabs(win) {
        win.gBrowser.removeAllTabsBut(this.addTab(win, win.BROWSER_NEW_TAB_URL));
    },
    prefToggleString(pref, next) {
        var curindex = next.indexOf(atb_ps.getCharPref(pref)), maxindex = next.length - 1;
        atb_ps.setCharPref(pref, next[(curindex == maxindex || curindex == -1) ? 0 : curindex + 1]);
    },
    prefToggleNumber(pref, next) {
        atb_ps.setIntPref(pref, next[atb_ps.getIntPref(pref)]);
    },
    viewPasswords(win) {
        var uri = this.convertToDisplayIDN(this.getBaseDomain(win, win.gBrowser.selectedBrowser.currentURI));
        var params = new win.URLSearchParams({
            ...(uri && { filter: uri }),
        });
        var separator = params.toString() ? "?" : "";
        var Url = `about:logins${separator}${params}`;
        for (let tab of win.gBrowser.visibleTabs) {
            let _url = tab.linkedBrowser.currentURI.spec;
            if (_url.startsWith("about:logins")) {
                win.gBrowser.selectedTab = tab;
                if (_url !== Url) this.loadUrlBrow(tab.linkedBrowser, Url);
                return;
            }
        }
        win.gBrowser.selectedTab = this.addTab(win, Url);
    },
    checkBrowserReload(win) {
        if (this.atb_branch.getBoolPref("doreload")) win.document.querySelector("commandset#mainCommandSet > command[id='Browser:ReloadSkipCache']")?.doCommand();
    },
    cssFileToUserContent(aCss, toggle) {
        try {
            var sss = this.styleSS, url = Services.io.newURI("data:text/css;charset=utf-8," + encodeURIComponent(aCss));
            var sheetReg = sss.sheetRegistered(url, sss.USER_SHEET);
            if (!toggle && !sheetReg) sss.loadAndRegisterSheet(url, sss.USER_SHEET);
            else if (toggle && sheetReg) sss.unregisterSheet(url, sss.USER_SHEET);
        } catch (e) { console.error(e); }
    },
    loadURL(win, url, newtab = false, params = {}) {
        if (newtab || this.atb_branch.getBoolPref("newtab")) win.gBrowser.selectedTab = this.addTab(win, url, params);
        else this.loadUrlBrow(win.gBrowser.selectedBrowser, url);
    },
    loadUrlBrow(br, url) {
        br.fixupAndLoadURIString(url, {
            triggeringPrincipal: Services.scriptSecurityManager.getSystemPrincipal()
        });
    },
    readFromClipboard(win) {
        try {
            let trans = Cc["@mozilla.org/widget/transferable;1"].createInstance(Ci.nsITransferable);
            trans.init(win.docShell.QueryInterface(Ci.nsILoadContext));
            trans.addDataFlavor("text/plain");
            let { clipboard } = Services, data = {};
            clipboard.getData(trans, clipboard.kGlobalClipboard);
            trans.getTransferData("text/plain", data);
            if (data.value) return data.value.QueryInterface(Ci.nsISupportsString).data;
        } catch { }
        return "";
    },
    copyLoadURL(win, newtab = false) {
        var clip = this.readFromClipboard(win);
        win.goDoCommand("cmd_copy");
        setTimeout(() => {
            var url = this.readFromClipboard(win);
            this.loadURL(win, url, newtab, { userContextId: win.gBrowser.selectedTab.userContextId });
            if (clip && clip != url) this.clipboard.copyStringToClipboard(clip, Ci.nsIClipboard.kGlobalClipboard);
        }, 100);
    },
    prefToggleStatus(pref) {
        atb_ps.setBoolPref(pref, !atb_ps.getBoolPref(pref));
    },
    extensionPrefToggleStatus(pref) {
        var branch = this.atb_branch;
        branch.setBoolPref(pref, !branch.getBoolPref(pref));
    },
    getBaseDomain(win, uri) {
        try {
            uri = win.gURLBar.makeURIReadable(uri);
        } catch { }
        try {
            if (WebExtensionPolicy.getByURI(uri)) return "";
        } catch { }
        try {
            return Services.eTLD.getBaseDomain(uri);
        } catch { }
        try {
            return uri.asciiHost;
        } catch { }
        return "";
    },
    convertToDisplayIDN(uri) {
        try {
            return this.idnService.convertToDisplayIDN(uri, {});
        } catch { }
        return uri;
    },
    copyCurrentURI(win, name) {
        var uri = win.gURLBar.makeURIReadable(win.gBrowser.selectedBrowser.currentURI).displaySpec;
        this.clipboard.copyStringToClipboard(uri, Ci.nsIClipboard.kGlobalClipboard);
        setTimeout(() => this.showAlert({ name, title: atb_locale.localizeMessage("copyCurrentURI"), text: uri, alertTimeout: this.alert_timeout }), 100);
    },
    copyDomainURI(win, name) {
        var uri = this.convertToDisplayIDN(this.getBaseDomain(win, win.gBrowser.selectedBrowser.currentURI));
        if (!uri) return;
        this.clipboard.copyStringToClipboard(uri, Ci.nsIClipboard.kGlobalClipboard);
        setTimeout(() => this.showAlert({ name, title: atb_locale.localizeMessage("copyDomainURI"), text: uri, alertTimeout: this.alert_timeout }), 100);
    },
    loadURLFromClipboard(win, newtab = false) {
        this.loadURL(win, this.readFromClipboard(win), newtab, { userContextId: win.gBrowser.selectedTab.userContextId });
    },
    searchFromClipboard(win) {
        var eng = this.SearchService.defaultEngine;
        var data = this.readFromClipboard(win);
        var sub = eng.getSubmission(data, null);
        if (!sub) return;
        win.gBrowser.selectedTab = this.addTab(win, sub.uri.spec, { userContextId: win.gBrowser.selectedTab.userContextId });
    },
    clearUrlBar(win) {
        var urlbar = win.gURLBar || win.document.querySelector("#urlbar");
        if (!urlbar) return;
        urlbar.value = "";
        urlbar.focus();
    },
    clearSearchBar(win, nofocus) {
        for (let bar of win.document.querySelectorAll("#search-container > [id^=searchbar]")) {
            if (!(bar._observersAdded || bar._observer || bar._initialized)) continue;
            bar.value = "";
            if (!nofocus) bar.focus();
            break;
        }
    },
    clearAllBar(win) {
        this.clearSearchBar(win, true);
        this.clearUrlBar(win);
    },
    _findBarFind(findbar) {
        if (findbar.hidden) findbar.onFindCommand();
        else findbar.close();
    },
    findBarFind(win) {
        var findbar = win.gFindBar;
        if (!findbar) return win.gBrowser.getFindBar().then(bar => this._findBarFind(bar));
        this._findBarFind(findbar);
    },
    _findBarCopyPaste(win, findbar) {
        var clip = this.readFromClipboard(win);
        win.goDoCommand("cmd_copy");
        setTimeout(() => {
            var val = this.readFromClipboard(win);
            if (findbar.hidden) {
                findbar.onFindCommand();
                findbar._findField.value = val;
                findbar._find(val);
            } else {
                findbar._findField.value = val;
                findbar._find(val);
            }
            if (clip && clip != val) this.clipboard.copyStringToClipboard(clip, Ci.nsIClipboard.kGlobalClipboard);
        }, 100);
    },
    findBarCopyPaste(win) {
        var findbar = win.gFindBar;
        if (!findbar) return win.gBrowser.getFindBar().then(bar => this._findBarCopyPaste(win, bar));
        this._findBarCopyPaste(win, findbar);
    },
    _findBarPaste(win, findbar) {
        var val = this.readFromClipboard(win);
        if (findbar.hidden) {
            findbar.onFindCommand();
            findbar._findField.value = val;
            findbar._find(val);
        } else {
            findbar._findField.value = val;
            findbar._find(val);
        }
    },
    findBarPaste(win) {
        var findbar = win.gFindBar;
        if (!findbar) {
            win.gBrowser.getFindBar().then(bar => {
                this._findBarPaste(win, bar);
            });
            return;
        }
        this._findBarPaste(win, findbar);
    },
    openClipboardConfigTab(win, clip = "", copy) {
        var filter = this.readFromClipboard(win), nowarn = false, pref = "browser.aboutConfig.showWarning";
        if (copy && clip != filter) this.clipboard.copyStringToClipboard(clip, Ci.nsIClipboard.kGlobalClipboard);
        if (atb_ps.getBoolPref(pref, false)) {
            atb_ps.setBoolPref(pref, false);
            nowarn = true;
        }
        win.gBrowser.getBrowserForTab(win.gBrowser.selectedTab = this.addTab(win, "about:config"))
            .addEventListener("pageshow", e => {
                var doc = e.target;
                var input = doc?.querySelector("input#about-config-search");
                if (input && filter) {
                    input.value = filter;
                    input.focus();
                    input.dispatchEvent(new doc.defaultView.Event("input", { bubbles: true }));
                }
                if (nowarn) setTimeout(() => atb_ps.setBoolPref(pref, true), 200);
            }, { once: true });
    },
    openSelectedConfigTab(win) {
        var clip = this.readFromClipboard(win);
        win.goDoCommand("cmd_copy");
        setTimeout(() => this.openClipboardConfigTab(win, clip, true), 100);
    },
    delCookies(win, name) {
        if (!win.gIdentityHandler?._uriHasHost || win.gIdentityHandler._pageExtensionPolicy) return;
        win.SiteDataManager.hasSiteData(win.gIdentityHandler._uri.asciiHost).then(hasData => {
            if (!hasData) return this.showAlert({ name, title: atb_locale.localizeMessage("atbCookieToggleNnone"), alertTimeout: this.alert_timeout });
            var baseDomain = win.SiteDataManager.getBaseDomainFromHost(win.gIdentityHandler._uri.host);
            if (win.SiteDataManager.promptSiteDataRemoval(win, [baseDomain])) win.SiteDataManager.remove(baseDomain).then(() => this.showAlert({ name, title: atb_locale.localizeMessage("atbCookieToggleNdel"), alertTimeout: this.alert_timeout }));
        });
    },
    async viewCookies(win) {
        var type = "Browser:SiteDataSettings";
        var w = Services.wm.getMostRecentWindow(type);
        if (!w) {
            await win.SiteDataManager.updateSites();
            let url = "chrome://browser/content/preferences/dialogs/siteDataSettings.xhtml", id = "SiteDataSettingsDialog";
            let { xulStore: xs } = Services;
            let sx = +xs.getValue(url, id, "screenX") || xs.setValue(url, id, "screenX", 1) || 1;
            let sy = +xs.getValue(url, id, "screenY") || xs.setValue(url, id, "screenY", 1) || 1;
            let wh = +xs.getValue(url, id, "width") || xs.setValue(url, id, "width", 600) || 600;
            let ht = +xs.getValue(url, id, "height") || xs.setValue(url, id, "height", 500) || 500;
            let sm = xs.getValue(url, id, "sizemode");
            w = win.openDialog(url, type, `chrome,dialog=no,resizable,screenX=${sx},screenY=${sy},width=${wh},height=${ht}`);
            if (sm === "maximized") w.windowRoot.addEventListener("MozUpdateWindowPos", () => w.maximize(), { once: true, capture: true });
            await new Promise(resolve => w.windowRoot.addEventListener("DOMContentLoaded", resolve, { once: true }));
            let docEl = w.document.documentElement;
            docEl.id = id;
            docEl.setAttribute("windowtype", type);
            docEl.setAttribute("persist", "screenX screenY width height sizemode");
        }
        w.focus();
        var filter = w.document.querySelector("#searchBox");
        if (!filter) return;
        filter.value = (filter.inputEl || {}).value = this.getBaseDomain(win, win.gBrowser.selectedBrowser.currentURI);
        filter.focus();
        filter.dispatchEvent(new w.Event("input", { bubbles: true }));
    },
    _registerActor() {
        if (this.registerActor) return;
        ChromeUtils.registerWindowActor("ATBWinActor", {
            child: {
                esModuleURI: "resource://add_toolbar_buttons/ATBWinActorChild.mjs",
            },
            allFrames: true,
            safeForUntrustedWebProcess: true,
            messageManagerGroups: ["browsers"],
        });
        this.registerActor = true;
    },
    sendAsyncMessages(win, message, data) {
        this._registerActor();
        this.sendAsyncMessages = this._sendAsyncMessages;
        this.sendAsyncMessages(win, message, data);
    },
    sendAsyncMessagesJavaScript(win, message, data) {
        this._registerActor();
        this.sendAsyncMessagesJavaScript = this._sendAsyncMessagesJavaScript;
        this.sendAsyncMessagesJavaScript(win, message, data);
    },
    _sendAsyncMessagesJavaScript(win, message, data) {
        var { browsingContext } = win.gBrowser.selectedBrowser;
        var state = !browsingContext.allowJavascript;
        for (let b of browsingContext.getAllBrowsingContextsInSubtree())
            b.allowJavascript = state;
    },
    _sendAsyncMessages(win, message, data) {
        var { browsingContext } = win.gBrowser.selectedBrowser;
        var topactor = () => browsingContext.currentWindowGlobal.getActor("ATBWinActor");
        ({
            "ATBWinActor:ScrollPageUp"() {
                topactor().sendAsyncMessage(message);
            },
            "ATBWinActor:ScrollPageDown"() {
                topactor().sendAsyncMessage(message);
            },
            "ATBWinActor:ScrollTop"() {
                topactor().sendAsyncMessage(message);
            },
            "ATBWinActor:ScrollBottom"() {
                topactor().sendAsyncMessage(message);
            },
            async stateSend(getstate, check = false) {
                var state = !(await topactor().sendQuery(getstate));
                for (let actor of this)
                    await actor.sendAsyncMessage(message, { state });
                if (check) add_bar_btns.checkBrowserReload(win);
            },
            "ATBWinActor:PageJavaScript"() {
                this.stateSend("ATBWinActor:getPageJavaScript");
            },
            "ATBWinActor:PageImages"() {
                this.stateSend("ATBWinActor:getPageImages", true);
            },
            "ATBWinActor:ImageAnimationMode"() {
                this.stateSend("ATBWinActor:getImageAnimationMode");
            },
            "ATBWinActor:PageMedia"() {
                this.stateSend("ATBWinActor:getPageMedia", true);
            },
            "ATBWinActor:LinkPointerEvents"() {
                this.stateSend("ATBWinActor:getLinkPointerEvents");
            },
            "ATBWinActor:TextToLink"() {
                for (let actor of this)
                    actor.sendAsyncMessage(message);
            },
            async "ATBWinActor:CopyAllLinks"() {
                var links = "", count = 0;
                for (let actor of this) {
                    let d = await actor.sendQuery(message);
                    if (!d?.links) continue;
                    links += `${d.links}\n`;
                    count += d.count;
                }
                add_bar_btns.clipboard.copyStringToClipboard(links, Ci.nsIClipboard.kGlobalClipboard);
                setTimeout(() => add_bar_btns.showAlert({ name: message, title: atb_locale.localizeMessage("copyAllLinks"), text: `${count} ${atb_locale.localizeMessage("copyAllLinks0")}`, alertTimeout: add_bar_btns.alert_timeout }), 100);
            },
            *[Symbol.iterator]() {
                var contextsToVisit = [browsingContext];
                while (contextsToVisit.length) {
                    let currentContext = contextsToVisit.pop();
                    let global = currentContext?.currentWindowGlobal;
                    if (!global) continue;
                    yield global.getActor("ATBWinActor");
                    contextsToVisit.push(...currentContext.children);
                }
            },
        })[message]?.();
    },
    closeTabsDomain(win, select = false) {
        var gdu = this.getBaseDomain(win, win.gBrowser.selectedBrowser.currentURI);
        if (!gdu) return;
        var selTab = win.gBrowser.selectedTab;
        win.gBrowser.visibleTabs.forEach(tab => {
            if (!tab.pinned && (select || tab != selTab) && gdu === this.getBaseDomain(win, tab.linkedBrowser.currentURI)) win.gBrowser.removeTab(tab);
        });
    },
    async bookmarksSort() {
        if (this.bookMgrRun) return;
        this.bookMgrRun = true;
        this.callWithEachWindow("atb-combined-bookmarks-mgr", { activated: false });
        var rvs = this.atb_branch.getBoolPref("bookmarkssortrevers") ? -1 : 1;
        var _rvs = -1 * rvs;
        var st = [
            ["title", "uri"],
            ["uri", "title"],
            ["dateAdded", "title"],
        ][this.atb_branch.getIntPref("bookmarkssorttype")];
        var sort = async nodes => {
            var list = [], listor = [];
            for (let node of nodes) {
                node.title &&= node.title.toLowerCase();
                if ("uri" in node) {
                    node.uri = node.uri.toLowerCase();
                    list.push(node);
                } else listor.push(node);
            }
            list.sort((a, b) => (`${a[st[0]]}${a[st[1]]}` > `${b[st[0]]}${b[st[1]]}`) ? rvs : _rvs);
            for (let node of listor)
                list.splice(node.index, 0, node);
            for (let [ind, node] of list.entries()) {
                if (node.children) await sort(node.children);
                let mn = nodes.find(el => el.guid === node.guid);
                if (mn?.index === ind) continue;
                try {
                    await PlacesUtils.bookmarks.update({ guid: node.guid, index: ind });
                    nodes.splice(mn.index, 1);
                    nodes.splice(ind, 0, mn);
                    nodes.map((el, ind) => el.index = ind);
                } catch { }
            }
        };
        await sort((await PlacesUtils.promiseBookmarksTree(PlacesUtils.bookmarks.rootGuid)).children);
        this.bookMgrRun = false;
        this.callWithEachWindow("atb-combined-bookmarks-mgr", { activated: true });
    },
    async favSearchStart() {
        if (this.bookMgrRun) return;
        this.bookMgrRun = true;
        this.callWithEachWindow("atb-combined-bookmarks-mgr", { activated: false });
        var urlsList = [];
        var convert = (node, url) => {
            if (node.children) node.children.map(convert);
            else if ((url = node.uri) && /^(?:https?|ftp|file):/.test(url)) urlsList.push(url);
        };
        convert(await PlacesUtils.promiseBookmarksTree(PlacesUtils.bookmarks.rootGuid));
        var favForPage = siteURI => {
            return new Promise(resolve => {
                try {
                    siteURI = Services.io.newURI(siteURI);
                } catch {
                    resolve(null);
                }
                PlacesUtils.favicons.getFaviconForPage(siteURI).then(uri => resolve(uri === null ? siteURI : null));
            });
        };
        this.favSearchResults((await Promise.all(urlsList.map(favForPage))).filter(url => url !== null));
    },
    favComplete(favsuccesslength, favmaxlength) {
        this.bookMgrRun = false;
        this.callWithEachWindow("atb-combined-bookmarks-mgr", { activated: true });
        if (this.atb_branch.getBoolPref("alertnotification")) this.showAlert({ name: "atb-combined-bookmarks-mgr", title: atb_locale.localizeMessage("favComplete"), text: `${atb_locale.localizeMessage("favComplete0", [favsuccesslength, favmaxlength - favsuccesslength])}`, textClickable: true, requireInteraction: true });
    },
    favSearchResults(results, _favmaxlength) {
        var favmaxlength = _favmaxlength = results.length;
        var favsuccesslength = 0;
        if (!favmaxlength) {
            this.favComplete(0, 0);
            return;
        }
        var maxrequests = this.atb_branch.getIntPref("maxrequests");
        var favmaxtimeout = this.atb_branch.getIntPref("maxtimeout") * 1000;
        var { Uint8ClampedArray, Blob, FileReader, XMLHttpRequest } = this.global;
        var setFaviconForPage = async (siteURI, uri, type) => {
            var resolver = Promise.withResolvers();
            if (uri.schemeIs("data")) resolver.resolve(uri);
            else {
                let channel = NetUtil.newChannel({
                    uri,
                    loadingPrincipal: Services.scriptSecurityManager.getSystemPrincipal(),
                    securityFlags:
                        Ci.nsILoadInfo.SEC_REQUIRE_CORS_INHERITS_SEC_CONTEXT |
                        Ci.nsILoadInfo.SEC_COOKIES_INCLUDE |
                        Ci.nsILoadInfo.SEC_ALLOW_CHROME |
                        Ci.nsILoadInfo.SEC_DISALLOW_SCRIPT,
                    contentPolicyType: Ci.nsIContentPolicy.TYPE_INTERNAL_IMAGE_FAVICON,
                });
                NetUtil.asyncFetch(channel, async (input, status, request) => {
                    if (!Components.isSuccessCode(status)) {
                        resolver.reject(status);
                        return;
                    }
                    try {
                        let data = NetUtil.readInputStream(input, input.available());
                        input.close();
                        let buffer = new Uint8ClampedArray(data);
                        let blob = new Blob([buffer], { type: type || request.QueryInterface(Ci.nsIChannel).contentType });
                        let dataURL = await new Promise((resolve, reject) => {
                            let reader = new FileReader();
                            reader.onload = () => resolve(reader.result);
                            reader.onerror = e => reject(e);
                            reader.readAsDataURL(blob);
                        });
                        resolver.resolve(Services.io.newURI(dataURL));
                    } catch (e) {
                        resolver.reject(e);
                    }
                });
            }
            try {
                PlacesUtils.favicons.setFaviconForPage(siteURI, uri, await resolver.promise);
                ++favsuccesslength;
            } catch { }
        };
        var favSearchPage = async siteURI => {
            await new Promise(resolve => {
                let req = new XMLHttpRequest({ mozAnon: false });
                req.mozBackgroundRequest = true;
                req.open("GET", siteURI.spec, true);
                req.responseType = "document";
                req.overrideMimeType("text/html");
                req.timeout = favmaxtimeout;
                req.onload = async () => {
                    try {
                        let doc = req.responseXML, favURI, favType;
                        if (doc) {
                            let lastlink, is16, is32, isany;
                            for (let link of doc.head.querySelectorAll("link[href][rel~=icon]")) {
                                if (link.sizes.length) {
                                    if (link.sizes.contains("any")) isany = link;
                                    if (link.sizes.contains("32x32")) is32 = link;
                                    if (link.sizes.contains("16x16")) is16 = link;
                                }
                                lastlink = link;
                            }
                            let icon = (isany || is32 || is16 || lastlink);
                            favURI = icon?.href;
                            favType = icon?.type;
                        }
                        if (!favURI) {
                            favURI = `${req.responseURL ? Services.io.newURI(req.responseURL).prePath : siteURI.prePath}/favicon.ico`;
                            favType = "image/x-icon";
                        }
                        setFaviconForPage(siteURI, Services.io.newURI(favURI), favType);
                    } catch { }
                    resolve();
                };
                req.onabort = resolve;
                req.onerror = req.ontimeout = () => {
                    resolve();
                    req.abort();
                };
                req.send(null);
            });
            if (!(--_favmaxlength)) {
                this.favComplete(favsuccesslength, favmaxlength);
                return;
            }
            if (results.length) favSearchPage(results.shift());
        };
        results.splice(0, maxrequests).map(favSearchPage);
    },
    observe(subject, topic, pref) {
        ({
            "extensions.add_toolbar_buttons.obs.animation": () => {
                delete this.anim_css;
                var anim_css = this.anim_css = atb_ps.getBoolPref(pref);
                this.cssFileToUserContent(this.animationCSS, anim_css);
                this.callWithEachWindow("atb-stop-animation", { activated: anim_css });
            },
            "extensions.add_toolbar_buttons.obs.animfunc": () => {
                this.cssFileToUserContent(this.animationCSS, true);
                delete this.anim_func;
                this.anim_func = atb_ps.getBoolPref(pref);
                if (!this.atb_branch.getBoolPref("obs.animation"))
                    this.cssFileToUserContent(this.animationCSS, false);
            },
            "extensions.add_toolbar_buttons.obs.showversion": () => {
                delete this.show_version;
                this.show_version = atb_ps.getBoolPref(pref);
            },
            "extensions.add_toolbar_buttons.obs.showdescription": () => {
                delete this.show_description;
                this.show_description = atb_ps.getBoolPref(pref);
            },
            "extensions.add_toolbar_buttons.obs.userpermissions": () => {
                delete this.user_permissions;
                this.user_permissions = atb_ps.getBoolPref(pref);
            },
            "extensions.add_toolbar_buttons.obs.showhidden": () => {
                delete this.show_hidden;
                this.show_hidden = atb_ps.getBoolPref(pref);
            },
            "extensions.add_toolbar_buttons.obs.showdisabled": () => {
                delete this.show_disabled;
                this.show_disabled = atb_ps.getBoolPref(pref);
            },
            "extensions.add_toolbar_buttons.obs.enabledfirst": () => {
                delete this.enabled_first;
                this.enabled_first = atb_ps.getBoolPref(pref);
            },
            "extensions.add_toolbar_buttons.obs.maxwidthmainitem": () => {
                delete this.max_width_main_item;
                this.max_width_main_item = atb_ps.getIntPref(pref);
            },
            "extensions.add_toolbar_buttons.obs.maxheightpopup": () => {
                delete this.max_height_popup;
                this.max_height_popup = atb_ps.getIntPref(pref);
            },
            "extensions.add_toolbar_buttons.obs.alerttimeout": () => {
                delete this.alert_timeout;
                this.alert_timeout = atb_ps.getIntPref(pref) * 1000;
            },
            "extensions.add_toolbar_buttons.obs.exceptionslistset": () => {
                var str = atb_ps.getStringPref(pref).trim();
                delete this.exceptions_listset;
                this.exceptions_listset = new Set(str ? str.split(/\s+/) : []);
            },
            "extensions.add_toolbar_buttons.obs.exceptionstypelistarr": () => {
                var str = atb_ps.getStringPref(pref).trim();
                delete this.exceptions_type_listarr;
                var arr = ["extension", "theme", "locale", "dictionary", "plugin", "mlmodel"];
                if (!str) {
                    this.exceptions_type_listarr = arr;
                    return
                }
                var set = new Set(str.split(/\s+/));
                this.exceptions_type_listarr = arr.filter(type => !set.has(type));
            },
            "extensions.add_toolbar_buttons.obs.soundvolumestep": () => {
                delete this.sound_volume_step;
                this.sound_volume_step = atb_ps.getIntPref(pref) / 100;
            },
            "media.volume_scale": () => {
                delete this.media_volume_scale;
                var volume = parseFloat(atb_ps.getCharPref(pref));
                if (isNaN(volume))
                    volume = 0;
                this.media_volume_scale = volume;
                this.callWithEachWindow("atb-sound-muted-all-tabs", { badge: (volume * 100).toFixed() });
            },
            "permissions.default.image": () => {
                delete this.permissions_default_image;
                var permissions_default_image = this.permissions_default_image = atb_ps.getIntPref(pref);
                this.callWithEachWindow("atb-image-toggle", { activated: permissions_default_image });
            },
            "image.animation_mode": () => {
                delete this.image_animation_mode;
                var image_animation_mode = this.image_animation_mode = atb_ps.getCharPref(pref);
                this.callWithEachWindow("atb-stop-animation", { badge: image_animation_mode.substring(0, 3) });
            },
            "media.autoplay.default": () => {
                delete this.media_autoplay_default;
                var media_autoplay_default = this.media_autoplay_default = atb_ps.getIntPref(pref);
                this.callWithEachWindow("atb-autoplay", { activated: media_autoplay_default });
            },
            "javascript.enabled": () => {
                delete this.javascript_enabled;
                var javascript_enabled = this.javascript_enabled = atb_ps.getBoolPref(pref);
                this.callWithEachWindow("atb-javascript", { activated: javascript_enabled });
            },
            "network.cookie.cookieBehavior": () => {
                delete this.network_cookie_cookieBehavior;
                var network_cookie_cookieBehavior = this.network_cookie_cookieBehavior = atb_ps.getIntPref(pref);
                this.callWithEachWindow("atb-cookie-toggle", { badge: network_cookie_cookieBehavior, badgeStyle: `background: ${network_cookie_cookieBehavior !== 2 ? "light-dark(oklch(62% 0.25 260), oklch(65% 0.25 260))" : "light-dark(oklch(50% 0.25 0), oklch(70% 0.25 0))"}; color: oklch(1 0 0); font-size: 10px; font-weight: normal; line-height: 10px; box-shadow: none; text-shadow: none; padding-block: 0 1px !important; padding-inline: 2px !important; min-width: 0 !important;` });
            },
            "browser.zoom.full": () => {
                delete this.browser_zoom_full;
                var browser_zoom_full = this.browser_zoom_full = atb_ps.getBoolPref(pref);
                this.callWithEachWindow("atb-zoom-toggle", { activated: browser_zoom_full });
            },
            "network.proxy.type": () => {
                delete this.network_proxy_type;
                var network_proxy_type = this.network_proxy_type = atb_ps.getIntPref(pref);
                this.callWithEachWindow("atb-combined-toggle-proxy", { activated: network_proxy_type });
            },
        })[pref]?.();
    },
    async stylePreload(type) {
        this.stylePreload = async () => this._stylePreload;
        return this._stylePreload = (async () => {
            this.styleURI = Services.io.newURI("resource://add_toolbar_buttons/button.css");
            return this._stylePreload = await this.styleSS.preloadSheetAsync(this.styleURI, type);
        })();
    },
    async onWindowOpened(win) {
        var type = win.windowUtils.USER_SHEET;
        var preload = this.stylePreload(type);
        winWeakMap.set(win, {
            eventListeners: new Map(),
            addListener(key, elm, type, listener) {
                elm.addEventListener(type, listener);
                this.eventListeners.set(key, { elm, type, listener });
            },
            delListener(key) {
                var { eventListeners } = this;
                var getkey = eventListeners.get(key);
                if (!getkey) return;
                var { elm, type, listener } = getkey;
                elm.removeEventListener(type, listener);
                eventListeners.delete(key);
            },
        });
        win.windowUtils.addSheet(await preload, type);
    },
    async onWindowClosed(win) {
        for (let { elm, type, listener } of winWeakMap.get(win).eventListeners.values())
            elm.removeEventListener(type, listener);
        winWeakMap.delete(win);
        win.windowUtils.removeSheet(this.styleURI, win.windowUtils.USER_SHEET);
    },
    callWithEachWindow(buttonID, atr) {
        var getW = CustomizableUI.getWidget(buttonID);
        if (getW.instances.length)
            for (let { node } of getW.instances) {
                if (!node) continue;
                for (let a in atr)
                    node.setAttribute(a, atr[a]);
            }
        else
            for (let win of CustomizableUI.windows) {
                let node = getW.forWindow(win).node;
                if (!node) continue;
                for (let a in atr)
                    node.setAttribute(a, atr[a]);
            }
    },
    getPref(name) {
        var type = atb_ps.getPrefType(name);
        switch (type) {
            case atb_ps.PREF_BOOL:
                return atb_ps.getBoolPref(name);
            case atb_ps.PREF_INT:
                return atb_ps.getIntPref(name);
            case atb_ps.PREF_STRING:
                return atb_ps.getStringPref(name);
        }
    },
    setPref(name, value) {
        var type = atb_ps.getPrefType(name);
        switch (type) {
            case atb_ps.PREF_BOOL:
                atb_ps.setBoolPref(name, value);
                break;
            case atb_ps.PREF_INT:
                atb_ps.setIntPref(name, value);
                break;
            case atb_ps.PREF_STRING:
                atb_ps.setStringPref(name, value);
                break;
        }
    },
    async showAlert() {
        var alertsService = Cc["@mozilla.org/alerts-service;1"].getService(Ci.nsIAlertsService);
        var defopts = { imageURL: "resource://add_toolbar_buttons/svg/icon_large.svg", silent: true };
        var notification = Components.Constructor("@mozilla.org/alert-notification;1", "nsIAlertNotification");
        var gIdMap = new Map();
        try {
            let uri = Services.io.newURI(defopts.imageURL);
            let channel = Services.io.newChannelFromURI(uri, null, Services.scriptSecurityManager.getSystemPrincipal(), null, Ci.nsILoadInfo.SEC_ALLOW_CROSS_ORIGIN_SEC_CONTEXT_IS_NULL, Ci.nsIContentPolicy.TYPE_IMAGE);
            channel.loadInfo.allowDeprecatedSystemRequests = true;
            defopts.image = await ChromeUtils.fetchDecodedImage(uri, channel);
        } catch { defopts.imageURL = undefined; }
        this.showAlert = (opts = {}, obs) => {
            var alert = new notification();
            var alertTimeout = opts.name && opts.alertTimeout;
            if (alertTimeout) {
                opts.requireInteraction = true;
                if (gIdMap.has(opts.name)) {
                    clearTimeout(gIdMap.get(opts.name));
                    gIdMap.delete(opts.name);
                }
            }
            alert.initWithObject({ ...defopts, ...opts });
            alertsService.showAlert(alert, obs);
            if (alertTimeout) gIdMap.set(opts.name, setTimeout(() => {
                alertsService.closeAlert(opts.name);
                gIdMap.delete(opts.name);
            }, alertTimeout));
        };
        this.showAlert.apply(this, arguments);
    },
    uninit() {
        if (!this.initialized) return;
        this.obsprefs.forEach(pref => {
            try {
                if (atb_ps.getPrefType(pref) !== atb_ps.PREF_INVALID) atb_ps.removeObserver(pref, this);
            } catch { }
        });
        atb_ps.removeObserver("extensions.add_toolbar_buttons.obs.", this);
        this.widgets.forEach(({ id }) => {
            try {
                CustomizableUI.destroyWidget(id);
            } catch { }
        });
        CustomizableUI.removeListener(this);
        for (let win of CustomizableUI.windows)
            this.onWindowClosed(win);
        Services.io.getProtocolHandler("resource")
            .QueryInterface(Ci.nsIResProtocolHandler)
            .setSubstitution("add_toolbar_buttons", null);
        if (this.registerActor) ChromeUtils.unregisterWindowActor("ATBWinActor");
        this.initialized = false;
    },
};
var addToolbarButtons = class extends ExtensionAPI {
    onStartup() {
        atb_ext = this.extension;
        atb_uri = atb_ext.baseURI.spec;
        atb_locale = atb_ext.localeData;
        atb_ps = Services.prefs;
        add_bar_btns.init();
    }
    onShutdown(reason) {
        if (reason !== "APP_SHUTDOWN") add_bar_btns.uninit();
    }
    getAPI() {
        return {
            addToolbarButtons: {
                getPrefs(arr) {
                    return arr.map(name => [name, add_bar_btns.getPref(name)]);
                },
                setPrefs(arr) {
                    arr.forEach(nv => add_bar_btns.setPref(nv[0], nv[1]));
                }
            }
        };
    }
};

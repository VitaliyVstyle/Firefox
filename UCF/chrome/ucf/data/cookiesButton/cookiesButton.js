/**
@UCF @param {"prop":"JsBackground","force":true,"disable":true} @UCF
*/
(async (
    id = "ucf-cookie-toggle",
    label = "Cookies",
    tooltiptext = "0 - Allow all cookies\n1 - Block all cross-site cookies (may cause websites to break)\n2 - Block all cookies (will cause websites to break)\n3 - Block cookies from unvisited websites\n4 - Block cross-site tracking cookies\n5 - Isolate cross-site cookies\n\nL: Toggle Cookies\nShift+L|M: Delete cookies from the domain of the current page\nR: Managing cookies",
    image = "chrome://ucf-url/content/data/cookiesButton/icon.svg",
    imageURL = "chrome://ucf-url/content/data/cookiesButton/icon128.svg",
    message1 = "Cookies for the current domain have been cleared!",
    message2 = "Missing cookies from the current domain!",
    alertTimeout = 5000,

    cookiePref = "network.cookie.cookieBehavior",
) => ({
    get cookieBehavior() {
        delete this.cookieBehavior;
        try {
            let gpref = this.cookieBehavior = Services.prefs.getIntPref(cookiePref);
            Services.prefs.addObserver(cookiePref, this);
            return gpref;
        } catch { }
        return this.cookieBehavior = null;
    },
    get chromeUrl() {
        delete this.chromeUrl;
        Components.manager.QueryInterface(Ci.nsIComponentRegistrar).autoRegister(Cc["@mozilla.org/chrome/chrome-registry;1"].getService(Ci.nsIChromeRegistry)
            .convertChromeURL(Services.io.newURI("chrome://ucf-url/content/data/cookiesButton/cookiesButton.manifest")).QueryInterface(Ci.nsIFileURL).file);
        return this.chromeUrl = "chrome://ucf-url/content/data/cookiesButton/siteDataSettings.xhtml";
    },
    id, type: "custom", label, tooltiptext, defaultArea: "nav-bar", localized: false,
    onBuild(doc) {
        var btn = doc.createXULElement("toolbarbutton");
        btn.id = id;
        btn.className = "toolbarbutton-1 chromeclass-toolbar-additional";
        btn.setAttribute("label", label);
        btn.setAttribute("tooltiptext", tooltiptext);
        btn.setAttribute("badged", "true");
        btn.setAttribute("constrain-size", "true");
        btn.toggleAttribute("context", true);
        var cb = this.cookieBehavior;
        if (cb !== null) {
            this.setStyle(btn, cb);
            btn.onclick = e => {
                switch (e.button) {
                    case 0:
                        if (!e.shiftKey) this.prefToggleNumber(cookiePref, [1, 2, 3, 4, 5, 0]);
                        else this.delCookies(doc.defaultView);
                        break;
                    case 1:
                        this.delCookies(doc.defaultView);
                        break;
                    case 2:
                        this.viewCookies(e.view);
                }
            };
        }
        return btn;
    },
    init() {
        this.widget = CustomizableUI.createWidget(this);
    },
    setStyle(btn, cb) {
        btn.style.cssText = `list-style-image:url("${image}${cb === 0 ? "#0" : ""}");${cb === 2 ? "fill:light-dark(oklch(50% 0.25 0), oklch(70% 0.25 0));" : ""}`;
        btn.setAttribute("badge", cb);
        btn.setAttribute("badgeStyle", `background: ${cb !== 2 ? "light-dark(oklch(62% 0.25 260), oklch(65% 0.25 260))" : "light-dark(oklch(50% 0.25 0), oklch(70% 0.25 0))"}; color: oklch(1 0 0); font-size: 10px; font-weight: normal; line-height: 10px; box-shadow: none; text-shadow: none; padding-block: 0 1px !important; padding-inline: 2px !important; min-width: 0 !important;`);
    },
    observe() {
        var cb = this.cookieBehavior = Services.prefs.getIntPref(cookiePref);
        for (let win of CustomizableUI.windows) {
            let btn = this.widget.forWindow(win).node;
            if (btn) this.setStyle(btn, cb);
        }
    },
    async delCookies(win) {
        if (!win.gIdentityHandler?._uriHasHost || win.gIdentityHandler._pageExtensionPolicy) return;
        if (!(await win.SiteDataManager.hasSiteData(win.gIdentityHandler._uri.asciiHost)))
            return UcfPrefs.showAlert({ name: id, imageURL, title: label, text: message2, silent: true, alertTimeout });
        var baseDomain = win.SiteDataManager.getBaseDomainFromHost(win.gIdentityHandler._uri.host);
        if (win.SiteDataManager.promptSiteDataRemoval(win, [baseDomain]))
            try {
                await win.SiteDataManager.remove(baseDomain);
                UcfPrefs.showAlert({ name: id, imageURL, title: label, text: message1, silent: true, alertTimeout });
            } catch { }
    },
    prefToggleNumber(pref, next) {
        Services.prefs.setIntPref(pref, next[Services.prefs.getIntPref(pref)]);
    },
    async viewCookies(win) {
        var type = "ucf:SiteData";
        var w = Services.wm.getMostRecentWindow(type);
        if (!w) {
            await win.SiteDataManager.updateSites();
            let { xulStore: xs } = Services;
            let url = this.chromeUrl, id = "ucfSiteData";
            let sx = xs.getValue(url, id, "screenX") || null;
            let sy = xs.getValue(url, id, "screenY") || null;
            let sw = Number(xs.getValue(url, id, "width") || "700");
            let sh = Number(xs.getValue(url, id, "height") || "550");
            let sm = xs.getValue(url, id, "sizemode");
            w = win.openDialog(url, type, `chrome, dialog=no, all, ${(sx && sy) ? `screenX=${sx = Number(sx)}, screenY=${sy = Number(sy)}` : "centerscreen"}, width=${sw}, height=${sh}`);
            let resize = new Promise(resolve => w.windowRoot.addEventListener("resize", resolve, { once: true }));
            await new Promise(resolve => w.windowRoot.addEventListener("DOMDocElementInserted", resolve, { once: true }));
            let docElt = w.document.documentElement;
            docElt.id = id;
            docElt.setAttribute("persist", "screenX screenY width height sizemode");
            docElt.setAttribute("windowtype", type);
            await resize;
            if (sm === "maximized") w.maximize();
            else w.moveResize(sx ?? w.screenX, sy ?? w.screenY, sw, sh);
        }
        w.focus();
        var filter = w.document.querySelector("#searchBox");
        if (!filter || !win.gIdentityHandler?._uriHasHost || win.gIdentityHandler._pageExtensionPolicy) return;
        var host = win.SiteDataManager.getBaseDomainFromHost(win.gIdentityHandler._uri.host);
        filter.value = host;
        filter.dispatchEvent(new w.CustomEvent("MozInputSearch:search", { detail: { query: host } }));
    },
}).init())();

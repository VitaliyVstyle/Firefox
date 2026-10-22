/**
@UCF @param {"prop":"JsBackground","force":true,"disable":true} @UCF
@UCF @param {"prop":"JsAllChrome.DOMContentLoaded","ucfobj":true,"urlregxp":"^chrome:\\/\\/browser\\/content\\/preferences\\/dialogs\\/siteDataSettings\\.xhtml","disable":true} @UCF
*/
(async (
    id = "ucf-cookie-toggle",
    label = "Cookies",
    tooltiptext = "0 - Allow all cookies\n1 - Block all cross-site cookies (may cause websites to break)\n2 - Block all cookies (will cause websites to break)\n3 - Block cookies from unvisited websites\n4 - Block cross-site tracking cookies\n5 - Isolate cross-site cookies\n\nL: Toggle Cookies\nShift+L|M: Delete cookies from the domain of the current page\nR: Managing cookies",
    image = "chrome://ucf-url/content/data/cookiesButton/icon.svg",
    imageURL = "chrome://ucf-url/content/data/cookiesButton/icon128.svg",
    message1 = "Cookies for the current domain have been cleared!",
    message2 = "Missing cookies from the current domain!",
    alertTimeout = 5000, // if > 0 then alerts are closed by timer
    confirmation = true, // show notifications when deleting cookies
    confirmationSDS = true, // show notifications in SiteDataSettingsDialog when deleting cookies
    intervalSDS = 5000, // update interval in SiteDataSettingsDialog after Right-click by button
    closeWinSDS = false, // close SiteDataSettingsDialog after deleting cookies
    searchShiftSDS = false, // if SiteDataSettingsDialog window is already open, when you press Shift + Right-click: true - site domain in the search field, false - do not change the search field

    idw = "SiteDataSettingsDialog",
    typew = "Browser:SiteDataSettings",
    urlSds = "chrome://browser/content/preferences/dialogs/siteDataSettings.xhtml",
    cookiePref = "network.cookie.cookieBehavior",
) => ({
    get getSetInterval() {
        delete this.getSetInterval;
        this.hasinterval = true;
        return this.getSetInterval = this.interval;
    },
    get interval() {
        return setInterval(async () => {
            if (gSiteDataSettings._list.selectedItems.length) return;
            await SiteDataManager.updateSites();
            this.ucf_gSiteDataSettings();
        }, intervalSDS);
    },
    get cookieBehavior() {
        delete this.cookieBehavior;
        var pref = "network.cookie.cookieBehavior";
        try {
            let gpref = this.cookieBehavior = Services.prefs.getIntPref(pref);
            Services.prefs.addObserver(pref, this);
            return gpref;
        } catch { }
        return this.cookieBehavior = null;
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
                if (e.button === 0) {
                    if (!e.shiftKey) this.prefToggleNumber(cookiePref, [1, 2, 3, 4, 5, 0]);
                    else this.delCookies(doc.defaultView);
                } else if (e.button === 1) this.delCookies(doc.defaultView);
                else if (e.button === 2) this.viewCookies(e);
            };
        }
        return btn;
    },
    JsBackground() {
        this.widget = CustomizableUI.createWidget(this);
    },
    JsAllChrome_DOMContentLoaded() {
        if (window.ucf_gsitedatasettings) {
            if (ucf_gsitedatasettings.sizemode === "maximized") windowRoot.addEventListener("MozUpdateWindowPos", () => maximize(), { once: true, capture: true });
            let docEl = document.documentElement;
            docEl.id = idw;
            docEl.setAttribute("windowtype", typew);
            docEl.setAttribute("persist", "screenX screenY width height sizemode");
            window.focus();
            this.filter();
        }
        window.ucf_gSiteDataSettings = this.ucf_gSiteDataSettings.bind(this);
        setUnloadMap(Symbol(id), this.destructor, this);
        for (let btn of this.removeBtns = document.querySelectorAll("#removeSelected, #removeAll"))
            btn.addEventListener("command", this);
        if (!closeWinSDS) document.addEventListener("dialogaccept", this);
        if (!confirmationSDS) Object.assign(gSiteDataSettings, Cu.evalInSandbox(`({${gSiteDataSettings.saveChanges}})`
            .replace(/if\s*\(\!SiteDataManager\.promptSiteDataRemoval\(window,\s*promptArg\)\)\s*\{[^\{]+?\}/, ""), sandboxWinSysPrincipal));
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
        if (!(await win.SiteDataManager.hasSiteData(win.gIdentityHandler._uri.asciiHost))) {
            UcfPrefs.showAlert({ name: id, imageURL, title: label, text: message2, silent: true, alertTimeout });
            return;
        }
        var baseDomain = win.SiteDataManager.getBaseDomainFromHost(win.gIdentityHandler._uri.host);
        if (!confirmation || win.SiteDataManager.promptSiteDataRemoval(win, [baseDomain])) win.SiteDataManager.remove(baseDomain).then(() =>
            UcfPrefs.showAlert({ name: id, imageURL, title: label, text: message1, silent: true, alertTimeout }));
    },
    prefToggleNumber(pref, next) {
        Services.prefs.setIntPref(pref, next[Services.prefs.getIntPref(pref)]);
    },
    ucf_gSiteDataSettings() {
        SiteDataManager.getSites().then(sites => {
            var gsds = gSiteDataSettings;
            gsds._sites = sites;
            var col = document.querySelector("treecol[data-isCurrentSortCol=true]"), last = "data-last-sortDirection";
            col.setAttribute(last, col.getAttribute(last) === "ascending" ? "descending" : "ascending");
            gsds._sortSites(gsds._sites, col);
            gsds._buildSitesList(gsds._sites);
            this.getSetInterval;
        });
    },
    command() {
        if (this.hasinterval) clearInterval(this.getSetInterval);
    },
    dialogaccept(e) {
        e.preventDefault();
        if (!this.hasinterval) return;
        clearInterval(this.getSetInterval);
        gSiteDataSettings._list.clearSelection();
        this.getSetInterval = this.interval;
    },
    handleEvent(e) {
        this[e.type](e);
    },
    async viewCookies({ view, shiftKey }) {
        var { _uriHasHost, _pageExtensionPolicy, _uri } = view.gIdentityHandler;
        var ugsds = { _uriHasHost, _pageExtensionPolicy, _uri };
        var w = Services.wm.getMostRecentWindow(typew);
        if (!w) {
            await view.SiteDataManager.updateSites();
            let { xulStore: xs } = Services;
            let sx = +xs.getValue(urlSds, idw, "screenX") || xs.setValue(urlSds, idw, "screenX", 1) || 1;
            let sy = +xs.getValue(urlSds, idw, "screenY") || xs.setValue(urlSds, idw, "screenY", 1) || 1;
            let wh = +xs.getValue(urlSds, idw, "width") || xs.setValue(urlSds, idw, "width", 600) || 600;
            let ht = +xs.getValue(urlSds, idw, "height") || xs.setValue(urlSds, idw, "height", 500) || 500;
            ugsds.sizemode = xs.getValue(urlSds, idw, "sizemode") || true;
            w = view.openDialog(urlSds, typew, `chrome,dialog=no,resizable,${`screenX=${sx},screenY=${sy}`}${`,width=${wh},height=${ht}`}`);
            w.ucf_gsitedatasettings = ugsds;
        } else {
            w.ucf_gsitedatasettings = ugsds;
            w.ucf_gSiteDataSettings();
            w.focus();
            if (shiftKey === searchShiftSDS) this.filter(w);
        }
    },
    filter(w = window) {
        var filter = w.document.querySelector("moz-input-search");
        if (!filter) return;
        var host = (w.ucf_gsitedatasettings._uriHasHost && !w.ucf_gsitedatasettings._pageExtensionPolicy)
            ? w.SiteDataManager.getBaseDomainFromHost(w.ucf_gsitedatasettings._uri.host) : "";
        filter.value = host;
        filter.dispatchEvent(new CustomEvent("MozInputSearch:search", { detail: { query: host } }));
    },
    destructor() {
        if (this.hasinterval) clearInterval(this.getSetInterval);
        for (let btn of this.removeBtns)
            btn.removeEventListener("command", this);
        if (!closeWinSDS) document.removeEventListener("dialogaccept", this);
    },
})[getProp]())();

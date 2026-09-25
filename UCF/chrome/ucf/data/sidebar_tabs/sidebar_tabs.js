/**
@UCF @param {"prop":"JsBackground","force":true} @UCF
@UCF @param {"prop":"JsChrome.DOMContentLoaded","ucfobj":true} @UCF
@UCF @param {"prop":"JsAllChrome.load","ucfobj":true,"urlregxp":"^chrome:\\/\\/browser\\/content\\/places\\/(?:bookmarksSidebar|historySidebar|places)\\.xhtml"} @UCF
*/
(async () => {
    var
        // -- Sidebar Tabs Settings -->
        ID = "ucf_sidebar_tabs",
        ICON = "chrome://ucf-url/content/data/sidebar_tabs/icon.svg",
        [
            st_bookmarks,
            st_history,
            st_pass,
            st_pass_menu,
            st_downloads,
            st_addons,
            st_sites,
            st_sites_menu,
            st_name,
            st_tooltip,
            st_tooltip_button,
        ] = await UcfPrefs.getLocalization("data/sidebar_tabs/locales", "sidebar_tabs.ftl").formatValues([
            "st-bookmarks",
            "st-history",
            "st-pass",
            "st-pass-menu",
            "st-downloads",
            "st-addons",
            "st-sites",
            "st-sites-menu",
            "st-name",
            "st-tooltip",
            "st-tooltip-button",
        ]),
        TABS = [
            {
                label: st_bookmarks,
                img: "chrome://ucf-url/content/data/sidebar_tabs/bookmark.svg",
                src: "chrome://browser/content/places/bookmarksSidebar.xhtml",
            },
            {
                label: st_history,
                img: "chrome://ucf-url/content/data/sidebar_tabs/history.svg",
                src: "chrome://browser/content/places/historySidebar.xhtml",
            },
            {
                label: st_pass,
                img: "chrome://ucf-url/content/data/sidebar_tabs/password.svg",
                src: "chrome://global/content/megalist/megalist.html",
                menu: {
                    label: st_pass_menu,
                    icon: "chrome://ucf-url/content/data/sidebar_tabs/password.svg",
                    places: true,
                    async click(e) {
                        var murl = "chrome://global/content/megalist/megalist.html";
                        var mitem = e.currentTarget, uri;
                        if (mitem.placesShow) {
                            let { triggerNode, _view } = mitem.parentElement;
                            try { uri = Services.io.newURI((triggerNode._placesNode || _view?.selectedNode || triggerNode.triggerNode).uri); } catch { }
                        } else uri = gContextMenu?.linkURI || gBrowser.selectedBrowser.currentURI;
                        var host = this.convertToDisplayIDN(this.getBaseDomain(uri));
                        var { st_index } = mitem, mlist;
                        if (this.st_index === st_index) mlist = this.setPanel(st_index, murl, { returnBrowser: true }).contentDocument?.querySelector("megalist-alpha");
                        else mlist = await new Promise(resolve => this.setPanel(st_index, murl, { returnBrowser: true }).addEventListener("virtual-list-ready", e => resolve(e.target), { once: true }));
                        if (!mlist) return;
                        var filter = mlist.shadowRoot?.querySelector("moz-input-search");
                        if (!filter) return;
                        filter.value = host;
                        filter.dispatchEvent(new CustomEvent("MozInputSearch:search", { detail: { query: host } }));
                        filter.focus();
                    },
                },
            },
            {
                label: st_downloads,
                img: "chrome://ucf-url/content/data/sidebar_tabs/downloads.svg",
                src: "about:downloads",
            },
            {
                label: st_addons,
                img: "chrome://ucf-url/content/data/sidebar_tabs/addons.svg",
                src: "about:addons",
                attributes: 'type="content" disableglobalhistory="true" context="contentAreaContextMenu" tooltip="aHTMLTooltip" autocompletepopup="PopupAutoComplete" remote="false" maychangeremoteness="true" ',
            },
            {
                label: st_sites,
                img: "chrome://ucf-url/content/data/sidebar_tabs/globe.svg",
                src: "https://github.com/VitaliyVstyle/Firefox",
                attributes: 'messagemanagergroup="webext-browsers" type="content" disableglobalhistory="true" context="contentAreaContextMenu" tooltip="aHTMLTooltip" autocompletepopup="PopupAutoComplete" remote="true" maychangeremoteness="true" ',
                menu: {
                    label: st_sites_menu,
                    icon: ICON,
                    places: true,
                },
            },
        ],
        NAME = st_name,
        TOOLTIP = st_tooltip,
        TOOLTIP_BUTTON = st_tooltip_button,
        START = true, // ST location
        WIDTH = 400,
        AUTO_HIDE = true, // Auto hide
        SHOW_DELAY = 300,
        HIDE_DELAY = 2000,
        MIN_WIDTH = 10,
        SHOW_HIDE = true,
        HIDE_FULLSCREEN = true, // Hide in full screen mode
        PADDING_FOR_VBAR = true,
        KEY = "KeyB_true_true_false", // Keyboard shortcut for to switch Sidebar Tabs - code_ctrlKey_altKey_shiftKey
        TABS_FOCUS = true,
        TABS_LAB_WITH_IMG = false,
        TABS_TOOLTIP_ON = false,
        FOCUS_DELAY = 150;
    // <-- Sidebar Tabs Settings --
    (this[ID] = {
        last_open: "sidebar_tabs_last_open",
        last_index: "sidebar_tabs_last_index",
        toolbox_width: "sidebar_tabs_toolbox_width",
        book_url: "chrome://browser/content/places/bookmarksSidebar.xhtml",
        mlist_url: "chrome://global/content/megalist/megalist.html",
        eventListeners: new Map(),
        eventCListeners: [],
        urlsMap: new Map(),
        menusMap: new Map(),
        menus_places: false,
        showTimer: null,
        hideTimer: null,
        tid: null,
        isVisible: false,
        isMouseOver: false,
        isPanel: false,
        get idnService() {
            delete this.idnService;
            return this.idnService = Cc["@mozilla.org/network/idn-service;1"].getService(Ci.nsIIDNService);
        },
        JsBackground() {
            CustomizableUI.createWidget(this);
        },
        JsChrome_DOMContentLoaded() {
            var open = this._open = UcfPrefs.getPref(this.last_open, true);
            var docElm = document.documentElement;
            docElm.setAttribute("sidebar_tabs_start", START);
            docElm.setAttribute("sidebar_tabs_auto_hide", AUTO_HIDE);
            var str = `<vbox id="st_toolbox" class="chromeclass-extrachrome" hidden="true" hide_fullscreen="${HIDE_FULLSCREEN}" padding_for_vbar="${PADDING_FOR_VBAR}">
                <tabbox id="st_tabbox" flex="1">
                    <tabs id="st_tabs" lab_with_img="${TABS_LAB_WITH_IMG}" orient="">
                        ${this.getTabs()}
                        <toolbarbutton id="st_close_button" class="close-icon tabbable" tooltiptext="${TOOLTIP}"/>
                    </tabs>
                    <tabpanels id="st_tabpanels" flex="1">
                        ${this.panels_str}
                    </tabpanels>
                </tabbox>
            </vbox>
            <splitter id="st_splitter" class="chromeclass-extrachrome" resizebefore="sibling" resizeafter="none" hidden="true" hide_fullscreen="${HIDE_FULLSCREEN}"/>`;
            if (AUTO_HIDE)
                str = `<vbox id="st_vbox_container" class="chromeclass-extrachrome" hidden="true" hide_fullscreen="${HIDE_FULLSCREEN}">
                    <hbox id="st_hbox_container" flex="1" style="--v-sidebar-tabs-min-width:${MIN_WIDTH}px;">
                        ${str}
                        <vbox id="st_uncontrolled"></vbox>
                    </hbox>
                </vbox>`;
            var fragment = this.fragment = MozXULElement.parseXULToFragment(str);
            var importNode = document.importNode(fragment, true);
            var toolbox = this.toolbox = importNode.querySelector("#st_toolbox");
            this.splitter = importNode.querySelector("#st_splitter");
            for (let browser of toolbox.querySelectorAll("[id^=st_browser_]"))
                this[browser.id] = browser;
            this.st_tabpanels = toolbox.querySelector("#st_tabpanels");
            this.st_tabbox = toolbox.querySelector("#st_tabbox");
            this.st_close_btn = toolbox.querySelector("#st_close_button");
            document.querySelector("#sidebar-box, #sidebar-main").before(importNode);
            this.st_tabbox.handleEvent = function () { };
            this.st_tabbox.selectedIndex = this.st_index = UcfPrefs.getPref(this.last_index, 0);
            delete this.panels_str;
            setUnloadMap(ID, this.destructor, this);
            if (open) this.open();
            this.addListener("window_keydown", window, "keydown", this);
            if (this.menusMap.size) this.addListener("contentShow", document.querySelector("#contentAreaContextMenu"), "popupshowing", this.contentFirstShow.bind(this));
            if (this.menus_places) for (let pop of document.querySelectorAll("#placesContext, #sidebar-history-context-menu"))
                this.addListener(pop.placesShow = Symbol(), pop, "popupshowing", this.placesFirstShow.bind(this));
            this.show_hide = AUTO_HIDE && SHOW_HIDE;
            if (!TABS_FOCUS) return;
            var st_tabs = this.st_tabbox.querySelector("#st_tabs");
            this.addListener("st_tabs_mouseover", st_tabs, "mouseover", this);
            this.addListener("st_tabs_mouseout", st_tabs, "mouseout", this);
            this.addListener("st_tabs_mousedown", st_tabs, "mousedown", this);
        },
        JsAllChrome_load() {
            for (let [ind, { menu }] of TABS.entries()) {
                if (!menu) continue;
                menu.st_index = ind;
                this.menusMap.set(ind, menu);
                if (menu.places) this.menus_places = true;
            }
            if (!this.menus_places) return;
            for (let pop of document.querySelectorAll("#placesContext, #sidebar-history-context-menu"))
                this.addListener(pop.placesShow = Symbol(), pop, "popupshowing", this.placesFirstShow.bind(this));
        },
        id: ID,
        label: NAME,
        tooltiptext: TOOLTIP_BUTTON,
        defaultArea: "nav-bar",
        localized: false,
        onCreated(btn) {
            btn.style.setProperty("list-style-image", `url("${ICON}")`);
            btn.checked = UcfPrefs.getPref(this.last_open, true);
        },
        onCommand(e) {
            var st = e.view.ucf_js_chrome_win[ID];
            if (st.show_hide && !e.shiftKey) st.showHide();
            else st.toggle();
        },
        getTabs() {
            var str = "", panels_str = "";
            for (let [ind, { label, img, src, attributes, menu }] of TABS.entries()) {
                str += `<tab id="st_tab_${ind}" ${label ? (`label="${label}" ${TABS_TOOLTIP_ON ? `tooltiptext="${label}"` : ""}`) : ""} ${img ? `image="${img}"` : ""}/>`;
                panels_str += `<vbox id="st_container_${ind}" flex="1">
                <browser id="st_browser_${ind}" flex="1" autoscroll="false" ${attributes || ""}/>
            </vbox>`;
                this.urlsMap.set(ind, { url: src });
                if (!menu) continue;
                menu.st_index = ind;
                if (menu.click) Cu.exportFunction(menu.click.bind(this), menu, { defineAs: "click" });
                this.menusMap.set(ind, menu);
                if (menu.places) this.menus_places = true;
            }
            this.panels_str = panels_str;
            return str;
        },
        async loadURI(browser, url, options = {}) {
            if (browser.getAttribute("type") !== "content") browser.setAttribute("src", url);
            else {
                options.triggeringPrincipal ||= Services.scriptSecurityManager.getSystemPrincipal();
                browser.loadURI(Services.io.newURI(url), options);
            }
        },
        select(e, st_index) {
            if (e.target != this.st_tabpanels || (st_index = this.st_tabbox.selectedIndex) === this.st_index) return;
            var browser = this[`st_browser_${this.st_index}`];
            this.loadURI(browser, "about:blank");
            this.st_index = st_index;
            UcfPrefs.setPrefs(this.last_index, st_index);
            var width = `${UcfPrefs.getPref(`${this.toolbox_width}${st_index}`, WIDTH)}px`;
            document.documentElement.style.setProperty("--v-sidebar-tabs-width", width);
            this.toolbox.style.width = width;
            browser = this[`st_browser_${st_index}`], { url, options } = this.urlsMap.get(st_index);
            this.loadURI(browser, url, options);
        },
        open() {
            this.toolbox.hidden = this.splitter.hidden = false;
            var { st_index, st_tabpanels } = this;
            var width = `${UcfPrefs.getPref(`${this.toolbox_width}${st_index}`, WIDTH)}px`;
            document.documentElement.style.setProperty("--v-sidebar-tabs-width", width);
            this.toolbox.style.width = width;
            this.addListener("st_tabpanels_select", st_tabpanels, "select", this);
            this.addListener("splitter_command", this.splitter, "command", this);
            this.addListener("st_close_btn_command", this.st_close_btn, "command", this);
            this.addListener("st_tabpanels_domcontload", st_tabpanels, "DOMContentLoaded", this);
            if (AUTO_HIDE) {
                let st_vbox = this.st_vbox_container ||= this.toolbox.parentElement.parentElement;
                st_vbox.hidden = false;
                this.addListener("st_vbox_mouseenter", st_vbox, "mouseenter", this);
                this.addListener("st_vbox_mouseleave", st_vbox, "mouseleave", this);
                this.addListener("st_vbox_dragenter", st_vbox, "dragenter", this);
            }
            var browser = this[`st_browser_${st_index}`], { url, options } = this.urlsMap.get(st_index);
            this.loadURI(browser, url, options);
            UcfPrefs.setPrefs(this.last_open, true);
            this._open = true;
        },
        toggle() {
            if (!this._open) this.open();
            else {
                let { st_index } = this;
                this.delListener("st_tabpanels_select");
                this.delListener("splitter_command");
                this.delListener("st_close_btn_command");
                this.delListener("st_tabpanels_domcontload");
                this.toolbox.hidden = this.splitter.hidden = true;
                if (AUTO_HIDE) {
                    if (this.isVisible) {
                        this.isMouseOver = false;
                        this.isPanel = false;
                        this.hideBar(true);
                    }
                    this.delListener("st_vbox_mouseenter");
                    this.delListener("st_vbox_mouseleave");
                    this.delListener("st_vbox_dragenter");
                    this.st_vbox_container.hidden = true;
                }
                let browser = this[`st_browser_${st_index}`];
                this.loadURI(browser, "about:blank");
                UcfPrefs.setPrefs(this.last_open, false);
                this._open = false;
            }
            this.togglebutton();
        },
        togglebutton() {
            if (this.button ||= CustomizableUI.getWidget(ID)?.forWindow(window).node) this.button.checked = this._open;
        },
        setPanel(st_index, url, options = {}) {
            try {
                let browser = this[`st_browser_${st_index}`];
                if (!browser || !/^(?:https?|ftp|chrome|about|moz-extension|file):/.test(url)) throw "Missing or invalid arguments!";
                if (options.userContextId != browser.getAttribute("usercontextid")) {
                    let newbrowser = this.fragment.querySelector(`#st_browser_${st_index}`).cloneNode(false);
                    if ("userContextId" in options) newbrowser.setAttribute("usercontextid", options.userContextId);
                    browser.replaceWith(newbrowser);
                    browser = this[`st_browser_${st_index}`] = newbrowser;
                }
                this._setPanel(browser, st_index, url, options);
                if (options.returnBrowser) return browser;
            } catch (e) { console.error(e) }
        },
        async _setPanel(browser, st_index, url, options) {
            this.urlsMap.set(st_index, { url, options });
            if (this.st_tabbox.selectedIndex !== st_index) {
                this.st_tabbox.selectedIndex = st_index;
                if (!this._open) {
                    this.st_index = st_index;
                    this.open();
                    this.togglebutton();
                }
            } else if (!this._open) {
                this.open();
                this.togglebutton();
            } else this.loadURI(browser, url, options);
            if (AUTO_HIDE) {
                this.isPanel = true;
                if (!this.isVisible) this.showBar(true);
            }
        },
        showHide() {
            if (!this.isVisible) {
                if (!this._open) {
                    this.open();
                    this.togglebutton();
                }
                this.isPanel = true;
                this.showBar(true);
            } else {
                this.isPanel = false;
                this.isMouseOver = false;
                this.hideBar(true);
            }
        },
        mouseup(e) {
            if (e.button) return;
            this.isPanel = false;
            this.hideBar(true);
        },
        keydown(e) {
            if (KEY === `${e.code}_${e.getModifierState("Control")}_${e.altKey}_${e.shiftKey}`) {
                if (this.show_hide) this.showHide();
                else this.toggle();
            }
        },
        command(e) {
            switch (e.currentTarget) {
                case this.splitter: {
                    let width = Math.round(this.toolbox.getBoundingClientRect().width);
                    document.documentElement.style.setProperty("--v-sidebar-tabs-width", `${width}px`);
                    UcfPrefs.setPrefs(`${this.toolbox_width}${this.st_index}`, width);
                    break;
                }
                default:
                    this.toggle();
            }
        },
        handleEvent(e) {
            this[e.type](e);
        },
        mouseenter(e) {
            switch (e.currentTarget) {
                case this.st_vbox_container:
                    this.isMouseOver = true;
                    if (!this.isVisible) this.showBar();
                    break;
                default:
                    this.isMouseOver = false;
                    this.hideBar();
            }
        },
        mouseover(e) {
            this.tid = setTimeout(() => e.target.closest?.("tab:not([selected])")?.on_mousedown({ button: 0 }), FOCUS_DELAY);
        },
        mouseout(e) {
            clearTimeout(this.tid);
        },
        mousedown(e) {
            clearTimeout(this.tid);
        },
        dragenter(e) {
            switch (e.currentTarget) {
                case this.st_vbox_container:
                    this.isMouseOver = true;
                    if (!this.isVisible) this.showBar();
                    break;
                default:
                    this.isMouseOver = false;
                    this.hideBar(true);
            }
        },
        mouseleave() {
            clearTimeout(this.showTimer);
        },
        DOMContentLoaded(e) {
            var doc = e.target;
            switch (doc?.documentURI) {
                case this.book_url:
                    doc.querySelector("#sidebar-panel-header")?.style.setProperty("display", "none", "important");
                    break;
                case this.mlist_url:
                    doc.querySelector("megalist-alpha")?.shadowRoot?.querySelector("sidebar-panel-header")?.shadowRoot?.querySelector(".sidebar-panel-heading")?.style.setProperty("display", "none", "important");
            }
        },
        showBar(nodelay) {
            clearTimeout(this.showTimer);
            var onTimeout = () => {
                this.isVisible = true;
                var docElm = document.documentElement;
                var tabpanels = this.tabpanels ||= gBrowser.tabpanels;
                var { st_vbox_container } = this;
                docElm.style.setProperty("--v-sidebar-tabs-tabpanels-width", `${Math.round(tabpanels.getBoundingClientRect().width)}px`);
                st_vbox_container.setAttribute("sidebar_tabs_visible", "visible");
                docElm.setAttribute("sidebar_tabs_visible", "visible");
                this.addListener("tabpanels_mouseenter", tabpanels, "mouseenter", this);
                this.addListener("tabpanels_dragenter", tabpanels, "dragenter", this);
                this.addListener("tabpanels_mouseup", tabpanels, "mouseup", this);
            };
            if (!nodelay) this.showTimer = setTimeout(onTimeout, SHOW_DELAY);
            else onTimeout();
        },
        hideBar(nodelay) {
            clearTimeout(this.hideTimer);
            var docElm = document.documentElement;
            var { st_vbox_container } = this;
            st_vbox_container.setAttribute("sidebar_tabs_visible", "visible_hidden");
            docElm.setAttribute("sidebar_tabs_visible", "visible_hidden");
            var onTimeout = () => {
                if (this.isMouseOver || this.isPanel) return;
                this.delListener("tabpanels_mouseenter");
                this.delListener("tabpanels_dragenter");
                this.delListener("tabpanels_mouseup");
                st_vbox_container.setAttribute("sidebar_tabs_visible", "hidden");
                docElm.setAttribute("sidebar_tabs_visible", "hidden");
                this.isVisible = false;
            };
            if (!nodelay) this.hideTimer = setTimeout(onTimeout, HIDE_DELAY);
            else onTimeout();
        },
        addListener(key, elm, type, listener) {
            elm.addEventListener(type, listener);
            this.eventListeners.set(key, { elm, type, listener });
        },
        delListener(key) {
            var { eventListeners } = this, getkey = eventListeners.get(key);
            if (!getkey) return;
            var { elm, type, listener } = getkey;
            elm.removeEventListener(type, listener);
            eventListeners.delete(key);
        },
        addCListener(elm, type, listener) {
            elm.addEventListener(type, listener);
            this.eventCListeners.push({ elm, type, listener });
        },
        showing(e, g) {
            return (e.target != e.currentTarget || g.webExtBrowserType === "popup"
                || (g.isTextSelected || g.onEditable || g.onPassword || g.onImage || g.onVideo || g.onAudio || g.inFrame) && !g.linkURL);
        },
        contentFirstShow(e) {
            if (this.showing(e, gContextMenu)) return;
            this.delListener("contentShow");
            var pop = e.currentTarget;
            var sep = pop.querySelector(":scope > :is(#context-sep-open, menuseparator:last-of-type)");
            var frag = document.createDocumentFragment();
            for (let { label, icon, click, atrs, st_index } of this.menusMap.values()) {
                let mitem = document.createXULElement("menuitem");
                mitem.className = "ucf-st-menuitem";
                mitem.setAttribute("label", label);
                mitem.st_index = st_index;
                if (icon) {
                    mitem.className = "menuitem-iconic ucf-st-menuitem";
                    mitem.style.cssText = `--menuitem-icon:url("${icon}");-moz-context-properties:fill,stroke,fill-opacity;stroke:currentColor;fill:currentColor;fill-opacity:var(--toolbarbutton-icon-fill-opacity,.8);`;
                }
                if (atrs) for (let p in atrs)
                    mitem.setAttribute(p, atrs[p]);
                this.addCListener(mitem, "click", click || this.click.bind(this));
                frag.append(mitem);
            }
            sep.before(frag);
            this.addListener("contentShow", pop, "popupshowing", this.contentShow.bind(this));
            this.addListener("contentHide", pop, "popuphiding", this.contentHide.bind(this));
        },
        contentShow(e) {
            if (this.showing(e, gContextMenu)) return;
            for (let { elm } of this.eventCListeners)
                elm.hidden = false;
        },
        contentHide(e) {
            if (e.target != e.currentTarget) return;
            for (let { elm } of this.eventCListeners)
                elm.hidden = true;
        },
        placesFirstShow(e) {
            if (e.target != e.currentTarget) return;
            var pop = e.currentTarget;
            this.delListener(pop.placesShow);
            var sep = pop.querySelector(":scope > :is(#placesContext_openSeparator, #sidebar-history-context-open-in-private-window + menuseparator, menuseparator:last-of-type)");
            var frag = document.createDocumentFragment();
            for (let { label, icon, atrs_places, st_index, places } of this.menusMap.values()) {
                if (!places) continue;
                let mitem = document.createXULElement("menuitem");
                mitem.className = "ucf-st-menuitem";
                mitem.setAttribute("label", label);
                mitem.st_index = st_index;
                mitem.placesShow = true;
                if (icon) {
                    mitem.className = "menuitem-iconic ucf-st-menuitem";
                    mitem.style.cssText = `--menuitem-icon:url("${icon}");-moz-context-properties:fill,stroke,fill-opacity;stroke:currentColor;fill:currentColor;fill-opacity:var(--toolbarbutton-icon-fill-opacity,.8);`;
                }
                let datrs = { "selection-type": "single", "node-type": "link" };
                if (atrs_places) Object.assign(datrs, atrs_places);
                for (let p in datrs)
                    mitem.setAttribute(p, datrs[p]);
                this.addListener(Symbol(), mitem, "click", this.click_places.bind(this));
                frag.append(mitem);
            }
            sep.before(frag);
        },
        click(e) {
            var url = !(e.shiftKey || e.button === 1) ? (gContextMenu?.linkURI?.spec || gURLBar.makeURIReadable(gBrowser.selectedBrowser.currentURI).spec) : this.readFromClipboard();
            this.setPanel(e.currentTarget.st_index, url, { userContextId: gContextMenu?.contentData?.userContextId, triggeringPrincipal: gContextMenu?.principal });
        },
        click_places(e) {
            var st = Services.wm.getMostRecentBrowserWindow()?.ucf_js_chrome_win[ID];
            if (!st) return;
            var mitem = e.currentTarget;
            var { click } = st.menusMap.get(mitem.st_index);
            if (click) return click(e);
            var { triggerNode, _view } = mitem.parentElement;
            var { uri } = triggerNode._placesNode || _view?.selectedNode || triggerNode.triggerNode;
            if (!uri) return;
            st.setPanel(mitem.st_index, uri);
        },
        getBaseDomain(uri) {
            try {
                uri = gURLBar.makeURIReadable(uri);
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
        readFromClipboard() {
            try {
                let trans = Cc["@mozilla.org/widget/transferable;1"].createInstance(Ci.nsITransferable);
                trans.init(docShell.QueryInterface(Ci.nsILoadContext));
                trans.addDataFlavor("text/plain");
                let { clipboard } = Services, data = {};
                clipboard.getData(trans, clipboard.kGlobalClipboard);
                trans.getTransferData("text/plain", data);
                if (data.value) return data.value.QueryInterface(Ci.nsISupportsString).data.trim();
            } catch { }
            return "";
        },
        destructor() {
            for (let { elm, type, listener } of this.eventListeners.values())
                elm.removeEventListener(type, listener);
            for (let { elm, type, listener } of this.eventCListeners)
                elm.removeEventListener(type, listener);
        },
    })[getProp]();
})();

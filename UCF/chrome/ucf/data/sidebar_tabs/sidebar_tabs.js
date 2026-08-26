/**
@UCF @param {"prop":"JsBackground","force":true,"disable":true} @UCF
@UCF @param {"prop":"JsChrome.DOMContentLoaded","ucfobj":true,"disable":true} @UCF
*/
(async () => {
    var
        // -- Sidebar Tabs Settings -->
        ID = "ucf_sidebar_tabs",
        ICON = "chrome://ucf-url/content/data/sidebar_tabs/icon.svg",
        [
            st_bookmarks,
            st_history,
            st_downloads,
            st_addons,
            st_sites,
            st_open_sites,
            st_name,
            st_tooltip,
            st_tooltip_button,
        ] = await UcfPrefs.l10nFormatMessages("data/sidebar_tabs/locales", "sidebar_tabs.ftl", [
            "st-bookmarks",
            "st-history",
            "st-downloads",
            "st-addons",
            "st-sites",
            "st-open-sites",
            "st-name",
            "st-tooltip",
            "st-tooltip-button",
        ]),
        TABS = [
            {
                label: st_bookmarks.value,
                src: "chrome://browser/content/places/bookmarksSidebar.xhtml",
            },
            {
                label: st_history.value,
                src: "chrome://browser/content/places/historySidebar.xhtml",
            },
            {
                label: st_downloads.value,
                src: "about:downloads",
            },
            {
                label: st_addons.value,
                src: "about:addons",
                attributes: 'type="content" disableglobalhistory="true" context="contentAreaContextMenu" tooltip="aHTMLTooltip" autocompletepopup="PopupAutoComplete" remote="false" maychangeremoteness="true" ',
            },
            {
                label: st_sites.value,
                src: "https://github.com/VitaliyVstyle/Firefox",
                attributes: 'messagemanagergroup="webext-browsers" type="content" disableglobalhistory="true" context="contentAreaContextMenu" tooltip="aHTMLTooltip" autocompletepopup="PopupAutoComplete" remote="true" maychangeremoteness="true" ',
                menu: {
                    label: st_open_sites.value,
                    icon: ICON,
                }
            },
        ],
        NAME = st_name.value,
        TOOLTIP = st_tooltip.value,
        TOOLTIP_BUTTON = st_tooltip_button.value,
        START = true, // Placement
        WIDTH = 350,
        AUTO_HIDE = true, // Auto hide
        SHOW_DELAY = 300,
        HIDE_DELAY = 2000,
        MIN_WIDTH = 10,
        SHOW_HIDE = true,

        HIDE_FULLSCREEN = true, // Hide in full screen mode
        HIDE_HEADER = false,
        PADDING_FOR_VBAR = true,
        KEY = "KeyB_true_true_false", // Keyboard shortcut for to switch Sidebar Tabs - code_ctrlKey_altKey_shiftKey
        SELECTOR = "#context-sep-open",
        TABS_FOCUS = true,
        FOCUS_DELAY = 150;
    // <-- Sidebar Tabs Settings --
    (this[ID] = {
        last_open: "sidebar_tabs_last_open",
        last_index: "sidebar_tabs_last_index",
        toolbox_width: "sidebar_tabs_toolbox_width",
        book_url: "chrome://browser/content/places/bookmarksSidebar.xhtml",
        book_index: null,
        eventListeners: new Map(),
        eventCListeners: [],
        urlsMap: new Map(),
        timer: null,
        showTimer: null,
        hideTimer: null,
        tid: null,
        isVisible: false,
        isMouseOver: false,
        isPanel: false,
        JsBackground() {
            CustomizableUI.createWidget(this);
        },
        JsChrome_DOMContentLoaded() {
            var open = this._open = UcfPrefs.getPref(this.last_open, true);
            var docElm = document.documentElement;
            docElm.setAttribute("sidebar_tabs_start", START);
            docElm.setAttribute("sidebar_tabs_auto_hide", AUTO_HIDE);
            var str = `<vbox id="st_toolbox" class="chromeclass-extrachrome" hidden="true" hide_header="${HIDE_HEADER}" hide_fullscreen="${HIDE_FULLSCREEN}" padding_for_vbar="${PADDING_FOR_VBAR}">
                <hbox id="st_header" align="center">
                    <label>${NAME}</label>
                    <spacer flex="1"/>
                    <toolbarbutton id="st_close_button" class="close-icon tabbable" tooltiptext="${TOOLTIP}"/>
                </hbox>
                <tabbox id="st_tabbox" flex="1">
                    <tabs id="st_tabs">
                        ${this.getTabs()}
                    </tabs>
                    <tabpanels id="st_tabpanels" flex="1">
                        ${this.panels_str}
                    </tabpanels>
                </tabbox>
            </vbox>
            <splitter id="st_splitter" class="chromeclass-extrachrome" resizebefore="sibling" resizeafter="none" hidden="true" hide_fullscreen="${HIDE_FULLSCREEN}"/>`;
            if (AUTO_HIDE)
                str = `<vbox id="st_vbox_container" class="chromeclass-extrachrome" hidden="true" hide_fullscreen="${HIDE_FULLSCREEN}">
                    <hbox id="st_hbox_container" flex="1" style="--v-sidebar-min-width:${MIN_WIDTH}px">
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
            if (this.menus.length) this.addListener("popup_popupshowing", this.popup = document.querySelector("#contentAreaContextMenu"), "popupshowing", this);
            this.show_hide = AUTO_HIDE && SHOW_HIDE;
            if (!TABS_FOCUS) return;
            var st_tabs = this.st_tabbox.querySelector("#st_tabs");
            this.addListener("st_tabs_mouseover", st_tabs, "mouseover", this);
            this.addListener("st_tabs_mouseout", st_tabs, "mouseout", this);
            this.addListener("st_tabs_mousedown", st_tabs, "mousedown", this);
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
            var str = "", panels_str = "", menus = [];
            for (let [ind, { label, src, attributes, menu }] of TABS.entries()) {
                str += `<tab id="st_tab_${ind}" label="${label}"/>`;
                panels_str += `<vbox id="st_container_${ind}" flex="1">
                <browser id="st_browser_${ind}" flex="1" autoscroll="false" ${attributes || ""}/>
            </vbox>`;
                this.urlsMap.set(ind, { url: src });
                if (menu) {
                    menu.st_index = ind;
                    menus.push(menu);
                }
                if (src === this.book_url) this.book_index = ind;
            }
            this.panels_str = panels_str;
            this.menus = menus;
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
            if (e.target != this.st_tabpanels || (st_index = this.st_tabbox.selectedIndex) == this.st_index) return;
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
            var { st_index, book_index } = this;
            var width = `${UcfPrefs.getPref(`${this.toolbox_width}${st_index}`, WIDTH)}px`;
            document.documentElement.style.setProperty("--v-sidebar-tabs-width", width);
            this.toolbox.style.width = width;
            this.addListener("st_tabpanels_select", this.st_tabpanels, "select", this);
            this.addListener("splitter_command", this.splitter, "command", this);
            this.addListener("st_close_btn_command", this.st_close_btn, "command", this);
            if (book_index !== null) this.addListener("st_browser_domcontload", this[`st_browser_${book_index}`], "DOMContentLoaded", this);
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
                let { st_index, book_index } = this;
                this.delListener("st_tabpanels_select");
                this.delListener("splitter_command");
                this.delListener("st_close_btn_command");
                if (book_index !== null) this.delListener("st_browser_domcontload");
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
                    let newbrowser = (this[`cn_browser_${st_index}`] ||= this.fragment.querySelector(`#st_browser_${st_index}`)).cloneNode(false);
                    if ("userContextId" in options) newbrowser.setAttribute("usercontextid", options.userContextId);
                    browser.replaceWith(newbrowser);
                    browser = this[`st_browser_${st_index}`] = newbrowser;
                }
                this.urlsMap.set(st_index, { url, options });
                if (this.st_tabbox.selectedIndex !== st_index) {
                    this.st_tabbox.selectedIndex = st_index;
                    if (!this._open) {
                        this.st_index = st_index;
                        this.open();
                        this.togglebutton();
                    }
                } else {
                    if (!this._open) {
                        this.open();
                        this.togglebutton();
                    } else this.loadURI(browser, url, options);
                }
                if (AUTO_HIDE) {
                    this.isPanel = true;
                    if (!this.isVisible) this.showBar(true);
                }
            } catch (e) { console.error(e) }
        },
        click(e) {
            var url = !(e.shiftKey || e.button === 1) ? (gContextMenu?.linkURI?.spec || gURLBar.makeURIReadable(gBrowser.selectedBrowser.currentURI).spec) : this.readFromClipboard();
            var { st_index } = e.currentTarget;
            var userContextId = gContextMenu?.contentData?.userContextId;
            var triggeringPrincipal = gContextMenu?.principal;
            this.setPanel(st_index, url, { ...(userContextId ? { userContextId } : {}), ...(triggeringPrincipal ? { triggeringPrincipal } : {}) });
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
            if (doc?.documentURI !== this.book_url) return;
            doc.querySelector("#sidebar-panel-header")?.style.setProperty("display", "none", "important");
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
        popupshowing(e) {
            if (this.showing(e, gContextMenu)) return;
            var contextsel = this.popup.querySelector(`:scope > ${SELECTOR}`) || this.popup.querySelector(":scope > menuseparator:last-of-type");
            var fragment = document.createDocumentFragment();
            var itemId = 0;
            this.menus.forEach(({ label, icon, st_index }) => {
                var mitem = document.createXULElement("menuitem");
                mitem.id = `ucf-sidebar-tabs-${++itemId}`;
                mitem.className = "menuitem-iconic ucf-sidebar-tabs";
                mitem.setAttribute("label", label);
                if (icon) mitem.style.cssText = `--menuitem-icon:url("${icon}");list-style-image:url("${icon}");-moz-context-properties:fill,stroke,fill-opacity;stroke:currentColor;fill:currentColor;fill-opacity:var(--toolbarbutton-icon-fill-opacity,.8);`;
                mitem.st_index = st_index;
                fragment.append(mitem);
                this.addCListener(mitem, "click", this);
            });
            contextsel.before(fragment);
            this.popupshowing = this.itemsShow;
            this.popuphiding = this.itemsHide;
            this.addListener("popup_popuphiding", this.popup, "popuphiding", this);
        },
        itemsShow(e) {
            if (this.showing(e, gContextMenu)) return;
            for (let { elm } of this.eventCListeners)
                elm.hidden = false;
        },
        itemsHide(e) {
            if (e.target != e.currentTarget) return;
            for (let { elm } of this.eventCListeners)
                elm.hidden = true;
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
            this.eventListeners.forEach(({ elm, type, listener }) => elm.removeEventListener(type, listener));
            for (let { elm, type, listener } of this.eventCListeners)
                elm.removeEventListener(type, listener);
        },
    })[getProp]();
})();

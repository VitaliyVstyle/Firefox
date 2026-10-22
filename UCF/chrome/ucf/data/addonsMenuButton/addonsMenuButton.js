/**
@UCF @param {"prop":"JsBackground","disable":true} @UCF
*/
(async (
    id = "ucf-ext-option-menu",
    label = "Add-ons",
    tooltiptext = "Add-ons menu",
    locale_desc = "Description:",
    locale_perm = "Permissions:",
    locale_opts = "L: Settings",
    locale_contr = "R: Control",
    locale_copyid = "L: Copy ID",
    locale_copyuuid = "R: Copy UUID",
    locale_home = "L: Home page",
    locale_author = "R: Author",
    locale_source = "L: Viewing the source",
    locale_sourceext = "R: Viewing the source in external application",
    locale_toogle = "L: Enable/Disable",
    locale_pin = "R: Pin to Toolbar or unpin",
    locale_del = "Uninstall",
    locale_clip = "in the clipboard!",
    locale_am = "Add-ons Manager",
    locale_amup = "L: Add-ons Manager\nR: Check for Add-ons updates",
    locale_dbg = "Debugging Add-ons",
    img_addons = "chrome://ucf-url/content/data/addonsMenuButton/icon.svg",
    img_opts = "chrome://ucf-url/content/data/addonsMenuButton/preferences.svg",
    img_copy = "chrome://ucf-url/content/data/addonsMenuButton/copy.svg",
    img_open = "chrome://ucf-url/content/data/addonsMenuButton/user-home.svg",
    img_view = "chrome://ucf-url/content/data/addonsMenuButton/view.svg",
    img_unins = "chrome://ucf-url/content/data/addonsMenuButton/uninstall.svg",
    imageURL = "chrome://ucf-url/content/data/addonsMenuButton/icon128.svg",
    show_version = true,
    show_description = true,
    user_permissions = true,
    show_hidden = true,
    show_disabled = true,
    max_width_main_item = 16,
    max_height_popup = 0,
    enabled_first = true,
    alertTimeout = 5000,
    exceptions_ids_listset = new Set([

    ]),
    exceptions_type_listset = new Set([

    ]),
) => CustomizableUI.createWidget({
    id, label, tooltiptext, type: "custom", localized: false, defaultArea: "nav-bar",
    get clipboard() {
        delete this.clipboard;
        return this.clipboard = Cc["@mozilla.org/widget/clipboardhelper;1"].getService(Ci.nsIClipboardHelper);
    },
    get exceptions_type_listarr() {
        delete this.exceptions_type_listarr;
        var arr = ["extension", "theme", "locale", "dictionary", "plugin", "mlmodel"];
        if (!exceptions_type_listset.size) return this.exceptions_type_listarr = arr;
        return this.exceptions_type_listarr = arr.filter(type => !exceptions_type_listset.has(type));
    },
    get wsMap() {
        delete this.wsMap;
        var map = new Map();
        this.wsMap = map;
        for (let win of CustomizableUI.windows)
            this.onWindowOpened(win);
        CustomizableUI.addListener(this);
        return map;
    },
    onBuild(doc) {
        var trbn = doc.createXULElement("toolbarbutton");
        trbn.id = this.id;
        trbn.className = "toolbarbutton-1 chromeclass-toolbar-additional";
        trbn.setAttribute("label", this.label);
        trbn.setAttribute("tooltiptext", this.tooltiptext);
        trbn.setAttribute("type", "menu");
        var mupp = doc.createXULElement("menupopup");
        mupp.id = `${this.id}-popup`;
        var map = this.wsMap.get(doc.defaultView);
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
        mupp.style.setProperty("--v-max-width-item", `${max_width_main_item}em`);
        if (max_height_popup) mupp.style.setProperty("max-height", `${max_height_popup}em`);
    },
    async populateMenu(map, id, e) {
        var addons = AddonManager.getAddonsByTypes(this.exceptions_type_listarr);
        var popup = e.currentTarget, doc = e.view.document;
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
            groop.className = `ucf-type-${addon.type}`;
            if (addon.isSystem) groop.classList.add("ucf-system");
            else if (addon.optionsURL) groop.classList.add("ucf-options");
            if (addon.isCorrectlySigned === false) groop.classList.add("ucf-warning");
            if (addon.blocklistState || !addon.isCompatible) groop.classList.add("ucf-error");
            groop._addon = addon;
            groop._extension = extension;
            groop._widgetid = widgetid;
            return groop;
        };
        var { GlobalManager } = ExtensionParent;
        var frag = doc.createDocumentFragment();
        (await addons).filter(a => !a.getResourceURI?.().spec.startsWith("resource://search-extensions/")).sort((a, b) =>
            (`${(enabled_first ? a.isActive ? "0" : "1" : "")}${a.type || ""}${a.name.toLowerCase()}` > `${(enabled_first ? b.isActive ? "0" : "1" : "")}${b.type || ""}${b.name.toLowerCase()}`) ? 1 : -1
        ).forEach(addon => {
            if (!exceptions_ids_listset.has(addon.id) &&
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
                    this.clipboard.copyStringToClipboard(addon.id, Ci.nsIClipboard.kGlobalClipboard);
                    win.setTimeout(() => UcfPrefs.showAlert({ name: `${addon.id}-id`, title: `ID ${locale_clip}`, imageURL, text: addon.id, silent: true, alertTimeout }), 100);
                } else if (extension?.uuid) {
                    this.clipboard.copyStringToClipboard(extension.uuid, Ci.nsIClipboard.kGlobalClipboard);
                    win.setTimeout(() => UcfPrefs.showAlert({ name: `${addon.id}-uuid`, title: `UUID ${locale_clip}`, imageURL, text: extension.uuid, silent: true, alertTimeout }), 100);
                }
                break;
            case "open":
                if (!e.button) {
                    if (addon.homepageURL) win.gBrowser.selectedTab = this.addTab(win, addon.homepageURL);
                } else if (addon.creator?.url) win.gBrowser.selectedTab = this.addTab(win, addon.creator.url);
                break;
            case "view":
                if (!e.button) this.browseDir(addon, win);
                else if (!addon.isBuiltin) this.browseDir(addon);
                break;
            case "uninstall":
                if (e.button) return;
                win.closeMenus(mi);
                if (Services.prompt.confirm(win, null, `${locale_del} ${addon.name}?`)) addon.uninstall();
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
        if (win) win.gBrowser.selectedTab = this.addTab(win, addon.getResourceURI().spec);
        else {
            let file = Services.io.getProtocolHandler("file")
                .QueryInterface(Ci.nsIFileProtocolHandler)
                .getFileFromURLSpec(addon.getResourceURI().QueryInterface(Ci.nsIJARURI).JARFile.spec);
            if (file.exists()) file.launch();
        }
    },
    addTab(win, url, params = {}) {
        params.triggeringPrincipal = Services.scriptSecurityManager.getSystemPrincipal();
        params.index = params.tabIndex = (win.gBrowser.selectedTab.index ?? win.gBrowser.selectedTab._tPos) + 1;
        return win.gBrowser.addTab(url, params);
    },
    onWindowOpened(win) {
        this.wsMap.set(win, new this.WinClass());
    },
    onWindowClosed(win) {
        for (let { elm, type, listener } of this.wsMap.get(win).listenersMap.values())
            elm.removeEventListener(type, listener);
        this.wsMap.delete(win);
    },
    WinClass: class {
        listenersMap = new Map();
        addListener(key, elm, type, listener) {
            elm.addEventListener(type, listener);
            this.listenersMap.set(key, { elm, type, listener });
        }
        delListener(key) {
            var { listenersMap } = this;
            var getkey = listenersMap.get(key);
            if (!getkey) return;
            var { elm, type, listener } = getkey;
            elm.removeEventListener(type, listener);
            listenersMap.delete(key);
        }
    },
}))();

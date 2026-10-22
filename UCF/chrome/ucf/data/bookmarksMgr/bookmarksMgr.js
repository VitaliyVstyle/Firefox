/**
@UCF @param {"prop":"JsBackground","disable":true} @UCF
*/
(async (
    id = "ucf-combined-bookmarks-mgr",
    label = "Bookmarks",
    tooltiptext = "Managing bookmarks",
    quickBook = "Quick Bookmark",
    quickBookT = "L: Add or delete bookmarks without confirmation\nM|R: Add a group of tabs to bookmarks",
    quickBookParentGuid = "menuGuid", // menuGuid toolbarGuid unfiledGuid
    quickBookIndex = "Add to the beginning",
    sortName = "Sort bookmarks by name",
    sortLoc = "Sort bookmarks by site",
    sortAdd = "Sort bookmarks by date added",
    sortRev = "Sort in reverse order",
    sortT = "R: Switch sorting type",
    favMaxTime = 30,  // Duration before request abort in seconds
    favMaxReg = 50, // Maximum number of parallel requests
    favShowAlertT = "Notification of completion",
    favRestore = "Restore favicons",
    favAlertTitle = "Search for favicons",
    favAlertTxt = "$1 - Successfully processed!\n$2 - Failed to process.",
    imageURL = "chrome://ucf-url/content/data/bookmarksMgr/icon128.svg",
) => ({
    id, label, tooltiptext, type: "custom", defaultArea: "nav-bar", localized: false, booksMgrRun: false,
    get NetUtil() {
        delete this.NetUtil;
        return this.NetUtil = ChromeUtils.importESModule("resource://gre/modules/NetUtil.sys.mjs").NetUtil;
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
    init() {
        this.widget = CustomizableUI.createWidget(this);
    },
    onBuild(doc) {
        var trim = doc.createXULElement("toolbaritem");
        trim.id = this.id;
        trim.className = "toolbaritem-combined-buttons ucf-combined-buttons chromeclass-toolbar-additional";
        trim.setAttribute("label", this.label);
        trim.setAttribute("type", "custom");
        trim.setAttribute("activated", !this.booksMgrRun);
        var trbn_0 = doc.createXULElement("toolbarbutton");
        trbn_0.id = "ucf-bookmarks-mgr";
        trbn_0.className = "toolbarbutton-1 ucf-combined-buttons-toolbarbutton";
        trbn_0.setAttribute("label", quickBook);
        trbn_0.setAttribute("tooltiptext", quickBookT);
        trbn_0.toggleAttribute("context", true);
        var map = this.wsMap.get(doc.defaultView);
        map.addListener(Symbol(), trbn_0, "click", this.btnClick.bind(this));
        trim.append(trbn_0);
        var trbn_1 = doc.createXULElement("toolbarbutton");
        trbn_1.id = "ucf-bookmarks-mgr-menu";
        trbn_1.className = "toolbarbutton-1 ucf-combined-buttons-dropmarker";
        trbn_1.setAttribute("type", "menu");
        trbn_1.setAttribute("label", this.label);
        trbn_1.setAttribute("tooltiptext", this.tooltiptext);
        var mupp = doc.createXULElement("menupopup");
        mupp.id = "ucf-bookmarks-mgr-popup";
        var sym = Symbol(), symb = Symbol();
        map.addListener(sym, mupp, "popupshowing", this.buildMenu.bind(this, map, sym));
        map.addListener(symb, trbn_1, "mousedown", this.setPosition.bind(this, map, symb, mupp));
        trbn_1.append(mupp);
        trim.append(trbn_1);
        return trim;
    },
    btnClick(e) {
        if (this.booksMgrRun) return;
        switch (e.button) {
            case 0:
                this.quickBook(e.view);
                break;
            case 1:
            case 2:
                e.view.PlacesCommandHook.bookmarkTabs(e.view.gBrowser.selectedTabs);
        }
    },
    command(e) {
        var im = e.target;
        switch (im.dataset.id) {
            case "ucf-bindex":
                im.replaceWith(im);
                Services.prefs.setBoolPref("ucf.books_mgr.quickbkindex", im.hasAttribute("checked"));
                break;
            case "ucf-orgr":
                e.view.PlacesCommandHook.showPlacesOrganizer("BookmarksMenu");
                break;
            case "ucf-fav":
                im.replaceWith(im);
                Services.prefs.setBoolPref("ucf.books_mgr.favshowalert", im.hasAttribute("checked"));
                break;
            case "ucf-favsearch":
                this.favSearchStart();
                break;
            case "ucf-asort":
                im.replaceWith(im);
                Services.prefs.setBoolPref("ucf.books_mgr.sortrevers", im.hasAttribute("checked"));
                break;
            case "ucf-bsort":
                this.booksSort();
        }
    },
    contextmenu(e) {
        var pref = [1, 2, 0][Services.prefs.getIntPref("ucf.books_mgr.sorttype", 0)];
        Services.prefs.setIntPref("ucf.books_mgr.sorttype", pref);
        e.target.setAttribute("label", [sortName, sortLoc, sortAdd][pref]);
    },
    popupshowing(e) {
        var mupp = e.currentTarget;
        var { prefs } = Services;
        mupp.atb_bindex.toggleAttribute("checked", prefs.getBoolPref("ucf.books_mgr.quickbkindex", false));
        mupp.atb_fav.toggleAttribute("checked", prefs.getBoolPref("ucf.books_mgr.favshowalert", true));
        mupp.atb_sort.toggleAttribute("checked", prefs.getBoolPref("ucf.books_mgr.sortrevers", false));
        mupp.atb_sort.nextElementSibling.setAttribute("label", [sortName, sortLoc, sortAdd][prefs.getIntPref("ucf.books_mgr.sorttype", 0)]);
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
        muim_0.setAttribute("tooltiptext", quickBookIndex);
        muim_0.dataset.id = "ucf-bindex";
        mupp.atb_bindex = muim_0;
        mugp_0.append(muim_0);
        var muim_1 = doc.createXULElement("menuitem");
        muim_1.setAttribute("label", this.tooltiptext);
        muim_1.dataset.id = "ucf-orgr";
        mugp_0.append(muim_1);
        mupp.append(mugp_0);
        var mugp_1 = doc.createXULElement("menugroup");
        var muim_2 = doc.createXULElement("menuitem");
        muim_2.setAttribute("type", "checkbox");
        muim_2.setAttribute("closemenu", "none");
        muim_2.setAttribute("tooltiptext", favShowAlertT);
        muim_2.dataset.id = "ucf-fav";
        mupp.atb_fav = muim_2;
        mugp_1.append(muim_2);
        var muim_3 = doc.createXULElement("menuitem");
        muim_3.setAttribute("label", favRestore);
        muim_3.dataset.id = "ucf-favsearch";
        mugp_1.append(muim_3);
        mupp.append(mugp_1);
        var mugp_2 = doc.createXULElement("menugroup");
        var muim_4 = doc.createXULElement("menuitem");
        muim_4.setAttribute("type", "checkbox");
        muim_4.setAttribute("closemenu", "none");
        muim_4.setAttribute("tooltiptext", sortRev);
        muim_4.dataset.id = "ucf-asort";
        mupp.atb_sort = muim_4;
        mugp_2.append(muim_4);
        var muim_5 = doc.createXULElement("menuitem");
        muim_5.setAttribute("tooltiptext", sortT);
        muim_5.dataset.id = "ucf-bsort";
        map.addListener(Symbol(), muim_5, "contextmenu", this.contextmenu.bind(this));
        mugp_2.append(muim_5);
        mupp.append(mugp_2);
        this.popupshowing.call(this, { currentTarget: mupp });
        map.addListener(sym, mupp, "popupshowing", this.popupshowing.bind(this));
        map.addListener(Symbol(), mupp, "command", this.command.bind(this));
    },
    setBtns(activated) {
        this.booksMgrRun = activated;
        for (let win of CustomizableUI.windows) {
            let btn = this.widget.forWindow(win).node;
            if (btn) btn.setAttribute("activated", !activated);
        }
    },
    async quickBook(win) {
        if (this.booksMgrRun) return;
        this.booksMgrRun = true;
        var { bookmarks } = PlacesUtils;
        var url = win.gBrowser.selectedBrowser.currentURI.spec;
        var array = await bookmarks.search({ url });
        if (!array.length)
            try {
                await bookmarks.insert({
                    url: Services.io.newURI(url),
                    title: (win.gBrowser.contentTitle || win.gBrowser.selectedTab.label || url),
                    parentGuid: bookmarks[quickBookParentGuid],
                    index: (!Services.prefs.getBoolPref("ucf.books_mgr.quickbkindex", false) ? bookmarks.DEFAULT_INDEX : 0),
                });
            } catch { }
        else
            try {
                await bookmarks.remove(array);
            } catch { }
        this.booksMgrRun = false;
    },
    async booksSort() {
        if (this.booksMgrRun) return;
        this.setBtns(true);
        var rvs = Services.prefs.getBoolPref("ucf.books_mgr.sortrevers", false) ? -1 : 1;
        var _rvs = -1 * rvs;
        var st = [
            ["title", "uri"],
            ["uri", "title"],
            ["dateAdded", "title"],
        ][Services.prefs.getIntPref("ucf.books_mgr.sorttype", 0)];
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
        this.setBtns(false);
    },
    async favSearchStart() {
        if (this.booksMgrRun) return;
        this.setBtns(true);
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
        this.setBtns(false);
        if (Services.prefs.getBoolPref("ucf.books_mgr.favshowalert", true)) {
            let text = favAlertTxt;
            [favsuccesslength, favmaxlength - favsuccesslength].map((val, ind) => text = text.replace(`$${ind + 1}`, val));
            UcfPrefs.showAlert({ name: id, imageURL, title: favAlertTitle, text, textClickable: true, requireInteraction: true, silent: true });
        }
    },
    favSearchResults(results, _favmaxlength) {
        var favmaxlength = _favmaxlength = results.length;
        var favsuccesslength = 0;
        if (!favmaxlength) {
            this.favComplete(0, 0);
            return;
        }
        var favmaxtimeout = favMaxTime * 1000;
        var { NetUtil } = this;
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
        results.splice(0, favMaxReg).map(favSearchPage);
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
}).init())();

var animationStart = false, clickStart = false, colorCount = 0, tabsCount = 0, selectedTab;
const gridNode = document.body.children[0];
const tabsNode = gridNode.nextElementSibling;
const hostMap = new Map();
const getItemGrid = (item, tiletype = "bookmarks") => {
    var url = item.url, start = "", middle = "", end = "", newurl = new URL(url), host = newurl.hostname;
    if (host) {
        if (/^xn--|\.xn--/.test(host)) try { host = toUnicode(host); } catch { }
        let harr = host.replace(/^www\./i, "").split("."), leng = harr.length;
        if (leng > 1) {
            let index = leng - 2, befindex;
            if (leng > 2 && harr[(befindex = index - 1)].length > harr[index].length) index = befindex;
            start = harr.slice(0, index).join(".");
            middle = harr[index];
            end = harr.slice(index + 1).join(".");
        } else middle = host;
    } else if (newurl.pathname) {
        try {
            middle = host = decodeURIComponent(newurl.pathname.split("/").pop()).replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
        } catch { middle = host = newurl.pathname.split("/").pop(); }
    } else if (newurl.protocol) middle = host = newurl.protocol;
    else return "";
    var title = (item.title || "").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"), num;
    if (title === "") {
        try {
            title = decodeURIComponent(!item.filename ? (newurl.pathname || host).replace(/^\//, "") : item.filename.split("/").pop()).replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
        } catch { title = !item.filename ? (newurl.pathname || host).replace(/^\//, "") : item.filename.split("/").pop(); }
    }
    if (!hostMap.has(host)) {
        if ((++colorCount) > 18) colorCount = 1;
        num = colorCount;
        hostMap.set(host, colorCount);
    } else num = hostMap.get(host);
    return `<a href="${url}" class="ntp-link" title="${title}" data-tiletype="${tiletype}" data-id="${item.id}" style="background-color: var(--v-tile-bg-color-${num}) !important;" rel="noreferrer" target="_self">
        <div class="ntp-control-box" title="">
            <div class="ntp-actions-icon"></div><div class="ntp-close-icon"></div>
        </div>
        <div class="ntp-domain">
            <div class="ntp-domain-start" ntp-text="${start}"></div>
            <div class="ntp-domain-middle" ntp-text="${middle}"></div>
            <div class="ntp-domain-end" ntp-text="${end}"></div>
        </div>
        <div class="ntp-title" ntp-text="${title}"></div>
    </a>`;
};
const getFolderTabs = folder => `<span class="ntp-tab" title="${(folder.title || "").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")}" data-id="${folder.id}" data-count="${++tabsCount}">
        <span class="ntp-tab-icon remove-tab" title=""></span>
    </span>`;
const getOtherTabs = () => {
    var i18n = browser.i18n;
    return `<span class="ntp-tab add-tab" title="${i18n.getMessage("addTab")}" data-id="__add_tab__">
        <span class="ntp-tab-icon"></span>
    </span>
    <span class="ntp-tab" title="${i18n.getMessage("historyTab")}" data-id="__history_tab__" data-count="${++tabsCount}">
        <span class="ntp-tab-icon"></span>
    </span>
    <span class="ntp-tab" title="${i18n.getMessage("downloadsTab")}" data-id="__downloads_tab__" data-count="${++tabsCount}">
        <span class="ntp-tab-icon"></span>
    </span>
    <span class="ntp-button-edit-box">
        <span class="ntp-button-edit-icon" title="${i18n.getMessage("editButton")}"></span>
        <span class="ntp-button-options-icon" title="${i18n.getMessage("pageTitleOption")}"></span>
        <span class="ntp-button-add-tile" title="${i18n.getMessage("addCell")}"></span>
    </span>
    <span class="ntp-input-search-box" title="${i18n.getMessage("searchBookmarks")}">
        <button class="ntp-input-search-button"></button>
        <input class="ntp-input-search" spellcheck="false" autocomplete="off" type="text" placeholder="${i18n.getMessage("searchPlaceholder")}">
    </span>`;
};
const getChildFolder = async (e, tab) => {
    if (animationStart || e.button || !(tab = e.target.closest(".ntp-tab:not(.add-tab)")) || e.target.matches(".ntp-tab-icon.remove-tab")) return;
    animationStart = true;
    var docEl = document.documentElement, count = tab.dataset.count, id = tab.dataset.id,
        prevcount = selectedTab.dataset.count, searchbox = tabsNode.querySelector(".ntp-input-search-box");
    var startend = tab.hasAttribute("selected") ? "current" : (+count > +prevcount ? "end" : "start");
    selectedTab.removeAttribute("selected");
    if (id === "__downloads_tab__") {
        let res = await new Promise(async resolve => {
            var fr = null;
            var animationend = evt => {
                if (evt.animationName === `grid_enter_${startend}`) {
                    if (fr === null) fr = true;
                    else resolve(fr);
                } else if (evt.animationName === `grid_leave_${startend}`) {
                    gridNode.removeAttribute("leave");
                    gridNode.removeEventListener("animationend", animationend);
                    animationStart = false;
                }
            };
            gridNode.addEventListener("animationend", animationend);
            gridNode.setAttribute("enter", startend);
            var { limit } = await browser.storage.session.get("limit");
            var r = await browser.downloads.search({ limit, orderBy: ["-startTime"] });
            if (fr === null) fr = r;
            else resolve(r);
        });
        gridNode["innerHTML"] = res.map(item => {
            if (item.state !== "complete" || !item.url) return "";
            return getItemGrid(item, "downloads");
        }).join("");
        docEl.setAttribute("tabcount", "downloads");
        gridNode.setAttribute("leave", startend);
        gridNode.removeAttribute("enter");
        searchbox.title = browser.i18n.getMessage("searchDownloads");
    } else if (id === "__history_tab__") {
        let res = await new Promise(async resolve => {
            var fr = null;
            var animationend = evt => {
                if (evt.animationName === `grid_enter_${startend}`) {
                    if (fr === null) fr = true;
                    else resolve(fr);
                } else if (evt.animationName === `grid_leave_${startend}`) {
                    gridNode.removeAttribute("leave");
                    gridNode.removeEventListener("animationend", animationend);
                    animationStart = false;
                }
            };
            gridNode.addEventListener("animationend", animationend);
            gridNode.setAttribute("enter", startend);
            var { maxResults } = await browser.storage.session.get("maxResults");
            var r = await browser.history.search({ text: "", startTime: 0, maxResults });
            if (fr === null) fr = r;
            else resolve(r);
        });
        gridNode["innerHTML"] = res.map(item => {
            if (!item.url || !(/^(?:https?|ftp):/.test(item.url))) return "";
            return getItemGrid(item, "history");
        }).join("");
        docEl.setAttribute("tabcount", "history");
        gridNode.setAttribute("leave", startend);
        gridNode.removeAttribute("enter");
        searchbox.title = browser.i18n.getMessage("searchHistory");
    } else {
        let res = await new Promise(async resolve => {
            var fr = null;
            var animationend = evt => {
                if (evt.animationName === `grid_enter_${startend}`) {
                    if (fr === null) fr = true;
                    else resolve(fr);
                } else if (evt.animationName === `grid_leave_${startend}`) {
                    gridNode.removeAttribute("leave");
                    gridNode.removeEventListener("animationend", animationend);
                    animationStart = false;
                }
            };
            gridNode.addEventListener("animationend", animationend);
            gridNode.setAttribute("enter", startend);
            try {
                let r = await browser.bookmarks.getSubTree(id);
                if (fr === null) fr = r;
                else resolve(r);
            } catch {
                gridNode.removeEventListener("animationend", animationend);
                if (gridNode.hasAttribute("enter")) gridNode.removeAttribute("enter");
                resolve(null);
                docEl.setAttribute("tabcount", "1");
                initNTP(true);
                animationStart = false;
            }
        });
        if (!res) return;
        res = res[0];
        let child = res.children || [];
        gridNode["innerHTML"] = child.map(item => {
            if (item.type !== "bookmark" || !item.url) return "";
            return getItemGrid(item);
        }).join("");
        if (res.title !== tab.getAttribute("title")) tab.setAttribute("title", res.title);
        docEl.setAttribute("tabcount", count);
        gridNode.setAttribute("leave", startend);
        gridNode.removeAttribute("enter");
        searchbox.title = browser.i18n.getMessage("searchBookmarks");
    }
    tab.setAttribute("selected", true);
    selectedTab = tab;
    browser.storage.session.set({ selTabId: tab.dataset.id });
};
const btnsClick = async e => {
    var { target } = e;
    if (target.className === "ntp-button-edit-icon") {
        let docEl = document.documentElement;
        if (docEl.hasAttribute("config-buttons-visible")) docEl.removeAttribute("config-buttons-visible");
        else docEl.setAttribute("config-buttons-visible", true);
    } else if (target.className === "ntp-input-search-button") getSearchItems(target.nextElementSibling.value);
    else if (target.className === "ntp-button-options-icon") {
        let uri = browser.runtime.getURL("options.xhtml");
        let tab = await browser.tabs.getCurrent();
        await browser.tabs.create({ url: uri, active: true, index: ++tab.index });
    } else if (target.className === "ntp-button-add-tile") {
        let url = prompt(browser.i18n.getMessage("addCellPrompt"), "https://");
        if (!url || url === "https://") return;
        updateBookmark(url);
    } else if (target.matches(".ntp-tab-icon.remove-tab")) {
        let tab = target.parentElement;
        let conf = confirm(browser.i18n.getMessage("removeTab", tab.title));
        if (!conf) return;
        let selected = tab.hasAttribute("selected");
        await browser.bookmarks.removeTree(tab.dataset.id);
        let docEl = document.documentElement;
        if (selected) {
            docEl.setAttribute("tabcount", "1");
            initNTP(true);
            return;
        }
        tab.remove();
        tabsCount = 0;
        for (let tab of tabsNode.querySelectorAll(".ntp-tab:not(.add-tab)"))
            tab.dataset.count = ++tabsCount;
        docEl.setAttribute("tabcount", selectedTab.dataset.count);
    } else if (target = target.closest(".ntp-tab.add-tab")) {
        let name = prompt(browser.i18n.getMessage("addFolderPrompt"), "NewFolder");
        if (!name) return;
        let res = await browser.bookmarks.search({ title: "NewTabPage", url: undefined });
        if (!(res = (res.length && res[0]))) return;
        let folder = await browser.bookmarks.create({ parentId: res.id, title: name, type: "folder" });
        let temp = document.createElement("template");
        temp["innerHTML"] = getFolderTabs(folder);
        target.before(temp.content);
        tabsCount = 0;
        for (let tab of tabsNode.querySelectorAll(".ntp-tab:not(.add-tab)"))
            tab.dataset.count = ++tabsCount;
    }
};
const updateBookmark = async dataurl => {
    let tab = await browser.tabs.create({ url: dataurl, active: false, });
    browser.tabs.hide(tab.id);
    var updated = async (tabId, changeInfo, tabInfo) => {
        if (tabInfo.status !== "complete") return;
        browser.tabs.onUpdated.removeListener(updated);
        let bookmark = { parentId: selectedTab.dataset.id, title: tabInfo.title, type: "bookmark", url: tabInfo.url };
        let { index } = await browser.storage.session.get("index");
        if (index) bookmark.index = 0;
        if (tabInfo.url === "about:blank") {
            delete bookmark.title;
            bookmark.url = dataurl;
        }
        var book = await browser.bookmarks.create(bookmark);
        var temp = document.createElement("template");
        temp["innerHTML"] = getItemGrid(book);
        gridNode[!index ? "append" : "prepend"](temp.content);
        browser.tabs.remove(tab.id);
    };
    browser.tabs.onUpdated.addListener(updated, { tabId: tab.id, properties: ["title", "status"] });
};
const getSearchItems = async text => {
    if (!text) return;
    let docEl = document.documentElement;
    if (docEl.getAttribute("tabcount") === "history") {
        let { maxResults } = await browser.storage.session.get("maxResults");
        let res = await browser.history.search({ text, startTime: 0, maxResults });
        gridNode["innerHTML"] = res.map(item => {
            if (!item.url || !(/^(?:https?|ftp):/.test(item.url))) return "";
            return getItemGrid(item, "history");
        }).join("");
    } else if (docEl.getAttribute("tabcount") === "downloads") {
        let { limit } = await browser.storage.session.get("limit");
        let res = await browser.downloads.search({ query: [text], limit, orderBy: ["-startTime"] });
        gridNode["innerHTML"] = res.map(item => {
            if (item.state !== "complete" || !item.url) return "";
            return getItemGrid(item, "downloads");
        }).join("");
    } else {
        let res = await browser.bookmarks.search({ query: text });
        gridNode["innerHTML"] = res.map(item => {
            if (item.type !== "bookmark" || !item.url) return "";
            return getItemGrid(item);
        }).join("");
    }
};
const searchItems = async (e, text) => {
    if (e.code !== "Enter" || !(text = e.target.value)) return;
    var { onlineSearch } = await browser.storage.session.get("onlineSearch");
    if (!onlineSearch) getSearchItems(text);
    else {
        let tab = await browser.tabs.getCurrent();
        let { openNewTab, insertNextCurrent } = await browser.storage.session.get();
        if (openNewTab) {
            let options = {
                url: "about:blank",
                active: true,
            };
            if (insertNextCurrent) options.index = ++tab.index;
            browser.search.search({
                query: text,
                tabId: (await browser.tabs.create(options)).id
            });
        } else browser.search.search({
            query: text,
            tabId: tab.id
        });
    }
};
const getActionsClick = async (e, target, link) => {
    if (target.parentElement.className !== "ntp-control-box") {
        let tab = await browser.tabs.getCurrent();
        let { openNewTab, insertNextCurrent } = await browser.storage.session.get();
        let options = {
            url: link.href,
            cookieStoreId: tab.cookieStoreId,
        };
        if (e.getModifierState("Control") || e.metaKey) {
            options.active = false;
            if (insertNextCurrent) options.index = ++tab.index;
            await browser.tabs.create(options);
        } else if (e.shiftKey) {
            options.incognito = (await browser.windows.getCurrent()).incognito;
            await browser.windows.create(options);
        } else {
            if (openNewTab) {
                options.active = true;
                if (insertNextCurrent) options.index = ++tab.index;
                await browser.tabs.create(options);
            } else {
                delete options.cookieStoreId;
                await browser.tabs.update(tab.id, options);
            }
        }
        return;
    }
    if (link.dataset.tiletype === "bookmarks") {
        if (target.className === "ntp-close-icon") {
            await browser.bookmarks.remove(link.dataset.id);
            link.remove();
        } else if (target.className === "ntp-actions-icon") {
            let tab = await browser.tabs.getCurrent();
            let index = (e.shiftKey || e.getModifierState("Control")) ? --tab.index : ++tab.index;
            let next = await browser.tabs.query({ currentWindow: true, hidden: false, index });
            if ((next = next.length && next[0])) {
                let node = await browser.bookmarks.update(link.dataset.id, { title: next.title, url: next.url });
                link["outerHTML"] = getItemGrid(node);
            }
        }
    } else if (link.dataset.tiletype === "history" && target.className === "ntp-close-icon") {
        await browser.history.deleteUrl({ url: link.href });
        link.remove();
    } else if (link.dataset.tiletype === "downloads") {
        if (target.className === "ntp-close-icon") {
            await browser.downloads.erase({ id: +link.dataset.id });
            await browser.history.deleteUrl({ url: link.href });
            link.remove();
        } else if (target.className === "ntp-actions-icon") await browser.downloads.show(+link.dataset.id);
    }
};
const tilesClick = e => {
    e.preventDefault();
    e.stopPropagation();
    var { target } = e, link = target.closest(".ntp-link");
    if (!link || clickStart) return;
    clickStart = true;
    try {
        getActionsClick(e, target, link);
    } catch { }
    clickStart = false;
};
const toUnicode = inp => {
    const maxInt = 2147483647, base = 36, tMin = 1, tMax = 26, skew = 38, damp = 700, initialBias = 72, initialN = 128,
        delimiter = '-', baseMinusTMin = base - tMin, floor = Math.floor;
    const map = (array, callback) => {
        const result = [];
        let length = array.length;
        while (length--) {
            result[length] = callback(array[length]);
        }
        return result;
    };
    const mapDomain = (domain, callback) => {
        const parts = domain.split('@');
        let result = '';
        if (parts.length > 1) {
            result = parts[0] + '@';
            domain = parts[1];
        }
        domain = domain.replace(/[\x2E\u3002\uFF0E\uFF61]/g, '\x2E');
        const labels = domain.split('.');
        const encoded = map(labels, callback).join('.');
        return result + encoded;
    };
    const basicToDigit = codePoint => {
        if (codePoint >= 0x30 && codePoint < 0x3A) return (26 + (codePoint - 0x30));
        if (codePoint >= 0x41 && codePoint < 0x5B) return (codePoint - 0x41);
        if (codePoint >= 0x61 && codePoint < 0x7B) return (codePoint - 0x61);
        return base;
    };
    const adapt = (delta, numPoints, firstTime) => {
        let k = 0;
        delta = firstTime ? floor(delta / damp) : delta >> 1;
        delta += floor(delta / numPoints);
        for (; delta > baseMinusTMin * tMax >> 1; k += base) {
            delta = floor(delta / baseMinusTMin);
        }
        return floor(k + (baseMinusTMin + 1) * delta / (delta + skew));
    };
    const decode = input => {
        const output = [], inputLength = input.length;
        let i = 0, n = initialN, bias = initialBias, basic = input.lastIndexOf(delimiter);
        if (basic < 0) basic = 0;
        for (let j = 0; j < basic; ++j) {
            if (input.charCodeAt(j) >= 0x80) throw null;
            output.push(input.charCodeAt(j));
        }
        for (let index = basic > 0 ? basic + 1 : 0; index < inputLength;) {
            const oldi = i;
            for (let w = 1, k = base; ; k += base) {
                if (index >= inputLength) throw null;
                const digit = basicToDigit(input.charCodeAt(index++));
                if (digit >= base) throw null;
                if (digit > floor((maxInt - i) / w)) throw null;
                i += digit * w;
                const t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);
                if (digit < t) break;
                const baseMinusT = base - t;
                if (w > floor(maxInt / baseMinusT)) throw null;
                w *= baseMinusT;
            }
            const out = output.length + 1;
            bias = adapt(i - oldi, out, oldi == 0);
            if (floor(i / out) > maxInt - n) throw null;
            n += floor(i / out);
            i %= out;
            output.splice(i++, 0, n);
        }
        return String.fromCodePoint(...output);
    };
    return mapDomain(inp, str => /^xn--/.test(str) ? decode(str.slice(4).toLowerCase()) : str);
};
const initNTP = async ntpforce => {
    var folderTabs = [];
    var ntpfr = await browser.bookmarks.search({ title: "NewTabPage", url: undefined });
    if (!(ntpfr = (ntpfr.length && ntpfr[0]))) {
        let folder = await browser.bookmarks.create({ index: 0, parentId: "toolbar_____", title: "NewTabPage", type: "folder" });
        folderTabs.push(folder);
        let book = await browser.bookmarks.create({ parentId: folder.id, title: "VitaliyVstyle/Firefox", type: "bookmark", url: "https://github.com/VitaliyVstyle/Firefox" });
        gridNode["innerHTML"] = getItemGrid(book);
        tabsCount = 0;
        tabsNode["innerHTML"] = `${getFolderTabs(folder)}${getOtherTabs()}`;
        (selectedTab = tabsNode.querySelector(`[data-id="${folder.id}"]`)).setAttribute("selected", true);
        return;
    }
    folderTabs.push(ntpfr);
    var id = ntpfr.id, hasTab;
    var nodes = browser.bookmarks.getChildren(id);
    var { selTabId, sessionTabSel, maxResults, limit } = await browser.storage.session.get();
    nodes = (await nodes).map(item => {
        if (item.type === "folder") {
            folderTabs.push(item);
            if (item.id === selTabId) hasTab = true;
            return "";
        }
        if (item.type !== "bookmark" || !item.url) return "";
        return getItemGrid(item);
    }).join("");
    tabsCount = 0;
    tabsNode["innerHTML"] = `${folderTabs.map(getFolderTabs).join("")}${getOtherTabs()}`;
    if (selTabId === id || !sessionTabSel || selTabId === undefined || ntpforce) {
        gridNode["innerHTML"] = nodes;
        (selectedTab = tabsNode.querySelector(`[data-id="${id}"]`)).setAttribute("selected", true);
        return;
    }
    var docEl = document.documentElement;
    if (hasTab) {
        let res = await browser.bookmarks.getSubTree(selTabId);
        if (!res) return;
        res = res[0];
        let child = res.children || [];
        gridNode["innerHTML"] = child.map(item => {
            if (item.type !== "bookmark" || !item.url) return "";
            return getItemGrid(item);
        }).join("");
        (selectedTab = tabsNode.querySelector(`[data-id="${selTabId}"]`)).setAttribute("selected", true);
        docEl.setAttribute("tabcount", selectedTab.dataset.count);
        return;
    }
    searchbox = tabsNode.querySelector(".ntp-input-search-box");
    if (selTabId === "__history_tab__") {
        let hres = await browser.history.search({ text: "", startTime: 0, maxResults });
        gridNode["innerHTML"] = hres.map(item => {
            if (!item.url || !(/^(?:https?|ftp):/.test(item.url))) return "";
            return getItemGrid(item, "history");
        }).join("");
        (selectedTab = tabsNode.querySelector('[data-id="__history_tab__"]')).setAttribute("selected", true);
        docEl.setAttribute("tabcount", "history");
        searchbox.title = browser.i18n.getMessage("searchHistory");
        return;
    }
    if (selTabId === "__downloads_tab__") {
        let res = await browser.downloads.search({ limit, orderBy: ["-startTime"] });
        gridNode["innerHTML"] = res.map(item => {
            if (item.state !== "complete" || !item.url) return "";
            return getItemGrid(item, "downloads");
        }).join("");
        (selectedTab = tabsNode.querySelector(`[data-id="${selTabId}"]`)).setAttribute("selected", true);
        docEl.setAttribute("tabcount", "downloads");
        searchbox.title = browser.i18n.getMessage("searchDownloads");
        return;
    }
    gridNode["innerHTML"] = nodes;
    (selectedTab = tabsNode.querySelector(`[data-id="${id}"]`)).setAttribute("selected", true);
    docEl.setAttribute("tabcount", "1");
};
initNTP(false);
document.head.children[1].textContent = browser.i18n.getMessage("pageTitle");
gridNode.addEventListener("click", tilesClick, true);
tabsNode.addEventListener("click", btnsClick);
tabsNode.addEventListener("mousedown", getChildFolder);
tabsNode.addEventListener("keypress", searchItems);
window.addEventListener("unload", () => {
    gridNode.removeEventListener("click", tilesClick, true);
    tabsNode.removeEventListener("click", btnsClick);
    tabsNode.removeEventListener("mousedown", getChildFolder);
    tabsNode.removeEventListener("keypress", searchItems);
}, { once: true });

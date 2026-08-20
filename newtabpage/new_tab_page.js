var gridNode = document.body.children[0], tabsNode = gridNode.nextElementSibling;
var hostMap = new Map(), animationStart = false, colorCount = 0, tabsCount = 0, selectedTab;

function getItemGrid(item, celltype = "bookmarks") {
    var url = item.url, start = "", middle = "", end = "", newurl = new URL(url), host = newurl.hostname;
    if (host) {
        if (/^xn--|\.xn--/.test(host))
            try {
                host = toUnicode(host);
            } catch {}
        let harr = host.replace(/^www\./i, "").split("."), leng = harr.length;
        if (leng > 1) {
            let index = leng - 2, befindex;
            if (leng > 2 && harr[(befindex = index - 1)].length > harr[index].length)
                index = befindex;
            start = harr.slice(0, index).join(".");
            middle = harr[index];
            end = harr.slice(index + 1).join(".");
        } else
            middle = host;
    } else if (newurl.pathname) {
        try {
            middle = host = decodeURIComponent(newurl.pathname.split("/").pop()).replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
        } catch {
            middle = host = newurl.pathname.split("/").pop();
        }
    } else if (newurl.protocol)
        middle = host = newurl.protocol;
    else
        return "";
    var title = (item.title || "").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"), num;
    if (title === "") {
        try {
            title = decodeURIComponent(!item.filename ? (newurl.pathname || host).replace(/^\//, "") : item.filename.split("/").pop()).replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
        } catch {
            title = !item.filename ? (newurl.pathname || host).replace(/^\//, "") : item.filename.split("/").pop();
        }
    }
    if (!hostMap.has(host)) {
        if ((++colorCount) > 18)
            colorCount = 1;
        num = colorCount;
        hostMap.set(host, colorCount);
    } else
        num = hostMap.get(host);
    return `<div class="css-cell-grid" data-celltype="${celltype}" data-id="${item.id}" data-url="${url}">
        <a href="${url}" rel="noreferrer" class="css-link" title="${title}" target="_self">
            <div class="css-control-box" title="">
                <div class="css-actions-icon"></div><div class="css-close-icon"></div>
            </div>
            <div type="link" class="css-thumbnail" style="background-color: var(--v-thumb-background-color-${num}) !important;">
                <div class="css-domain">
                    <div class="css-domain-start" css-text="${start}"></div>
                    <div class="css-domain-middle" css-text="${middle}"></div>
                    <div class="css-domain-end" css-text="${end}"></div>
                </div>
            </div>
            <div class="css-title" css-text="${title}"></div>
        </a>
    </div>`;
}
function getfolderTabs(folder) {
    return `<span class="css-tab" title="${(folder.title || "").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")}" data-id="${folder.id}" data-count="${++tabsCount}">
        <span class="css-tab-icon remove-tab" title=""></span>
    </span>`;
}
function getotherTabs() {
    var i18n = browser.i18n;
    return `<span class="css-tab add-tab" title="${i18n.getMessage("addTab")}" data-id="__add_tab__">
        <span class="css-tab-icon"></span>
    </span>
    <span class="css-tab" title="${i18n.getMessage("historyTab")}" data-id="__history_tab__" data-count="${++tabsCount}">
        <span class="css-tab-icon"></span>
    </span>
    <span class="css-tab" title="${i18n.getMessage("downloadsTab")}" data-id="__downloads_tab__" data-count="${++tabsCount}">
        <span class="css-tab-icon"></span>
    </span>
    <span class="css-button-edit-box">
        <span class="css-button-edit-icon" title="${i18n.getMessage("editButton")}"></span>
        <span class="css-button-options-icon" title="${i18n.getMessage("pageTitleOption")}"></span>
        <span class="css-button-add-cell" title="${i18n.getMessage("addCell")}"></span>
    </span>
    <span class="css-input-search-box" title="${i18n.getMessage("searchBookmarks")}">
        <button class="css-input-search-button"></button>
        <input class="css-input-search" spellcheck="false" autocomplete="off" type="text" placeholder="${i18n.getMessage("searchPlaceholder")}">
    </span>`;
}
async function getChildFolder(e, tab) {
    if (animationStart || e.button != 0 || !(tab = e.target.closest(".css-tab:not(.add-tab)")) || e.target.className === "css-tab-icon remove-tab") return;
    animationStart = true;
    var docEl = document.documentElement, count = tab.dataset.count, id = tab.dataset.id,
    prevcount = selectedTab.dataset.count, searchbox = tabsNode.querySelector(".css-input-search-box");
    var rightleft = tab.hasAttribute("selected") ? "current" : (+count > +prevcount ? "right" : "left");
    selectedTab.removeAttribute("selected");
    if (id === "__downloads_tab__") {
        let res = await new Promise(async resolve => {
            var fr = null;
            var animationend = evt => {
                if (evt.animationName === `grid_enter_${rightleft}`) {
                    (fr === null) ? (fr = true) : resolve(fr);
                } else if (evt.animationName === `grid_leave_${rightleft}`) {
                    gridNode.removeAttribute("leave");
                    gridNode.removeEventListener("animationend", animationend);
                    animationStart = false;
                }
            };
            gridNode.addEventListener("animationend", animationend);
            gridNode.setAttribute("enter", rightleft);
            var {limit} = await browser.storage.session.get("limit");
            browser.downloads.search({ limit, orderBy: ["-startTime"] }).then(r => {
                (fr === null) ? (fr = r) : resolve(r);
            });
        });
        gridNode["innerHTML"] = res.map(item => {
            if (item.state != "complete" || !item.url)
                return "";
            return getItemGrid(item, "downloads");
        }).join("");
        docEl.setAttribute("tabcount", "downloads");
        gridNode.setAttribute("leave", rightleft);
        gridNode.removeAttribute("enter");
        searchbox.title = browser.i18n.getMessage("searchDownloads");
    } else if (id === "__history_tab__") {
        let res = await new Promise(async resolve => {
            var fr = null;
            var animationend = evt => {
                if (evt.animationName === `grid_enter_${rightleft}`) {
                    (fr === null) ? (fr = true) : resolve(fr);
                } else if (evt.animationName === `grid_leave_${rightleft}`) {
                    gridNode.removeAttribute("leave");
                    gridNode.removeEventListener("animationend", animationend);
                    animationStart = false;
                }
            };
            gridNode.addEventListener("animationend", animationend);
            gridNode.setAttribute("enter", rightleft);
            var {maxResults} = await browser.storage.session.get("maxResults");
            browser.history.search({ text: "", startTime: 0, maxResults }).then(r => {
                (fr === null) ? (fr = r) : resolve(r);
            });
        });
        gridNode["innerHTML"] = res.map(item => {
            if (!item.url || !(/^(?:https?|ftp):/.test(item.url)))
                return "";
            return getItemGrid(item, "history");
        }).join("");
        docEl.setAttribute("tabcount", "history");
        gridNode.setAttribute("leave", rightleft);
        gridNode.removeAttribute("enter");
        searchbox.title = browser.i18n.getMessage("searchHistory");
    } else {
        let res = await new Promise(resolve => {
            var fr = null;
            var animationend = evt => {
                if (evt.animationName === `grid_enter_${rightleft}`) {
                    (fr === null) ? (fr = true) : resolve(fr);
                } else if (evt.animationName === `grid_leave_${rightleft}`) {
                    gridNode.removeAttribute("leave");
                    gridNode.removeEventListener("animationend", animationend);
                    animationStart = false;
                }
            };
            gridNode.addEventListener("animationend", animationend);
            gridNode.setAttribute("enter", rightleft);
            browser.bookmarks.getSubTree(id).then(r => {
                (fr === null) ? (fr = r) : resolve(r);
            }, () => {
                gridNode.removeEventListener("animationend", animationend);
                if (gridNode.hasAttribute("enter"))
                    gridNode.removeAttribute("enter");
                resolve(null);
                docEl.setAttribute("tabcount", "1");
                initNTP(true);
                animationStart = false;
            });
        });
        if (!res) return;
        res = res[0];
        let child = res.children || [];
        gridNode["innerHTML"] = child.map(item => {
            if (item.type !== "bookmark" || !item.url)
                return "";
            return getItemGrid(item);
        }).join("");
        if (res.title != tab.getAttribute("title"))
            tab.setAttribute("title", res.title);
        docEl.setAttribute("tabcount", count);
        gridNode.setAttribute("leave", rightleft);
        gridNode.removeAttribute("enter");
        searchbox.title = browser.i18n.getMessage("searchBookmarks");
    }
    tab.setAttribute("selected", true);
    selectedTab = tab;
    browser.storage.session.set({selTabId: tab.dataset.id});
}
function getBtnClick(e) {
    var target = e.target;
    if (target.className === "css-button-edit-icon") {
        let docEl = document.documentElement;
        if (docEl.hasAttribute("config-buttons-visible"))
            docEl.removeAttribute("config-buttons-visible");
        else
            docEl.setAttribute("config-buttons-visible", true);
    } else if (target.className === "css-input-search-button")
        _getSearchItems(target.nextElementSibling.value);
    else if (target.className === "css-button-options-icon") {
        let uri = browser.runtime.getURL("options.xhtml");
        browser.tabs.getCurrent().then(tab => {
            browser.tabs.create({
                url: uri,
                active: true,
                index: ++tab.index
            });
        });
    } else if (target.className === "css-button-add-cell") {
        let url = prompt(browser.i18n.getMessage("addCellPrompt"), "https://");
        if (!url || url === "https://") return;
        createCellBookmark(url);
    } else if (target.className === "css-tab-icon remove-tab") {
        let tab = target.parentElement;
        let conf = confirm(browser.i18n.getMessage("removeTab", tab.title));
        if (!conf) return;
        let selected = tab.hasAttribute("selected");
        browser.bookmarks.removeTree(tab.dataset.id).then(() => {
            var docEl = document.documentElement;
            if (selected) {
                docEl.setAttribute("tabcount", "1");
                initNTP(true);
                return;
            }
            tab.remove();
            tabsCount = 0;
            for (let tab of tabsNode.querySelectorAll(".css-tab:not(.add-tab)"))
                tab.dataset.count = ++tabsCount;
            docEl.setAttribute("tabcount", selectedTab.dataset.count);
        });
    } else if (target = target.closest(".css-tab.add-tab")) {
        let name = prompt(browser.i18n.getMessage("addFolderPrompt"), "NewFolder");
        if (!name) return;
        browser.bookmarks.search({ title: "NewTabPage", url: undefined }).then(res => {
            if (!(res = (res.length && res[0]))) return;
            browser.bookmarks.create({parentId: res.id, title: name, type: "folder"}).then(folder => {
                var temp = document.createElement("template");
                temp["innerHTML"] = getfolderTabs(folder);
                target.before(temp.content);
                tabsCount = 0;
                for (let tab of tabsNode.querySelectorAll(".css-tab:not(.add-tab)"))
                    tab.dataset.count = ++tabsCount;
            });
        });
    }
}
async function createCellBookmark(dataurl) {
    let tab = await browser.tabs.create({url: dataurl, active: false,});
    browser.tabs.hide(tab.id);
    var updated = async (tabId, changeInfo, tabInfo) => {
        if (tabInfo.status != "complete") return;
        browser.tabs.onUpdated.removeListener(updated);
        let bookmark = {parentId: selectedTab.dataset.id, title: tabInfo.title, type: "bookmark", url: tabInfo.url};
        let {index} = await browser.storage.session.get("index");
        if (index)
            bookmark.index = 0;
        if (tabInfo.url === "about:blank") {
            delete bookmark.title;
            bookmark.url = dataurl;
        }
        browser.bookmarks.create(bookmark).then(book => {
            var temp = document.createElement("template");
            temp["innerHTML"] = getItemGrid(book);
            gridNode[!index ? "append" : "prepend"](temp.content);
        });
        browser.tabs.remove(tab.id);
    };
    browser.tabs.onUpdated.addListener(updated, {tabId: tab.id, properties: ["title", "status"]});
}
async function _getSearchItems(text) {
    if (!text) return;
    let docEl = document.documentElement;
    if (docEl.getAttribute("tabcount") === "history") {
        let {maxResults} = await browser.storage.session.get("maxResults");
        browser.history.search({ text, startTime: 0, maxResults }).then(res => {
            gridNode["innerHTML"] = res.map(item => {
                if (!item.url || !(/^(?:https?|ftp):/.test(item.url)))
                    return "";
                return getItemGrid(item, "history");
            }).join("");
        });
    } else if (docEl.getAttribute("tabcount") === "downloads") {
        let {limit} = await browser.storage.session.get("limit");
        browser.downloads.search({ query: [text], limit, orderBy: ["-startTime"] }).then(res => {
            gridNode["innerHTML"] = res.map(item => {
                if (item.state != "complete" || !item.url)
                    return "";
                return getItemGrid(item, "downloads");
            }).join("");
        });
    } else
        browser.bookmarks.search({ query: text }).then(res => {
            gridNode["innerHTML"] = res.map(item => {
                if (item.type != "bookmark" || !item.url)
                    return "";
                return getItemGrid(item);
            }).join("");
        });
}
async function getSearchItems(e, text) {
    if (e.code != "Enter" || !(text = e.target.value)) return;
    var {onlineSearch} = await browser.storage.session.get("onlineSearch");
    if (!onlineSearch)
        _getSearchItems(text);
    else
        browser.tabs.getCurrent().then(async tab => {
            let {openNewTab, insertNextCurrent} = await browser.storage.session.get();
            if (openNewTab) {
                let options = {
                    url: "about:blank",
                    active: true,
                };
                if (insertNextCurrent)
                    options.index = ++tab.index;
                browser.tabs.create(options).then(t => {
                    browser.search.search({
                        query: text,
                        tabId: t.id
                    });
                });
            } else
                browser.search.search({
                    query: text,
                    tabId: tab.id
                });
        });
}
async function getActionsClick(e) {
    var target = e.target, link = target.closest(".css-link");
    if (!link)
        return;
    e.preventDefault();
    e.stopPropagation();
    if (target.parentNode.className != "css-control-box") {
        let tab = await browser.tabs.getCurrent();
        if (!e.ctrlKey && !e.metaKey) {
            let {openNewTab, insertNextCurrent} = await browser.storage.session.get();
            if ((!e.shiftKey && !openNewTab) || (e.shiftKey && openNewTab))
                browser.tabs.update(tab.id, {
                    url: link.href
                });
            else {
                let options = {
                    url: link.href,
                    active: true,
                    cookieStoreId: tab.cookieStoreId,
                };
                if (insertNextCurrent)
                    options.index = ++tab.index;
                browser.tabs.create(options);
            }
        } else if (e.shiftKey)
            browser.windows.getCurrent().then(win => {
                browser.windows.create({
                    url: link.href,
                    incognito: win.incognito,
                    cookieStoreId: tab.cookieStoreId,
                });
            });
        else
            browser.tabs.create({
                url: link.href,
                active: false,
                index: ++tab.index,
                cookieStoreId: tab.cookieStoreId,
            });
        return;
    }
    var cell = link.parentNode;
    if (cell.dataset.celltype === "bookmarks") {
        if (target.className === "css-close-icon")
            browser.bookmarks.remove(cell.dataset.id).then(() => {
                cell.remove();
            });
        else if (target.className === "css-actions-icon")
            browser.tabs.getCurrent().then(tab => {
                var ind = (e.shiftKey || e.ctrlKey) ? --tab.index : ++tab.index;
                browser.tabs.query({currentWindow: true, hidden: false, index: ind }).then(next => {
                    if ((next = next.length && next[0])) {
                        browser.bookmarks.update(cell.dataset.id, { title: next.title, url: next.url }).then(node => {
                            cell["outerHTML"] = getItemGrid(node);
                        });
                    }
                });
            });
    } else if (cell.dataset.celltype === "history" && target.className === "css-close-icon") {
        cell.remove();
        browser.history.deleteUrl({url: cell.dataset.url});
    } else if (cell.dataset.celltype === "downloads") {
        if (target.className === "css-close-icon") {
            cell.remove();
            browser.downloads.erase({id: +cell.dataset.id});
            browser.history.deleteUrl({url: cell.dataset.url});
        } else if (target.className === "css-actions-icon")
            browser.downloads.show(+cell.dataset.id);
    }
}
function toUnicode(_input) {
    var maxInt = 2147483647,
	base = 36,
	tMin = 1,
	tMax = 26,
	skew = 38,
	damp = 700,
	initialBias = 72,
	initialN = 128,
	delimiter = '-',
	regexSeparators = /[\x2E\u3002\uFF0E\uFF61]/g,
	errors = {
		'overflow': 'Overflow: input needs wider integers to process',
		'not-basic': 'Illegal input >= 0x80 (not a basic code point)',
		'invalid-input': 'Invalid input'
	},
	baseMinusTMin = base - tMin,
	floor = Math.floor,
	stringFromCharCode = String.fromCharCode;
	var error = type => {
		throw new RangeError(errors[type]);
	};
	var map = (array, fn) => {
		var length = array.length;
		var result = [];
		while (length--) {
			result[length] = fn(array[length]);
		}
		return result;
	};
	var mapDomain = (string, fn) => {
		var parts = string.split('@');
		var result = '';
		if (parts.length > 1) {
			result = parts[0] + '@';
			string = parts[1];
		}
		string = string.replace(regexSeparators, '\x2E');
		var labels = string.split('.');
		var encoded = map(labels, fn).join('.');
		return result + encoded;
	};
	var ucs2encode = array => {
		return map(array, function(value) {
			var output = '';
			if (value > 0xFFFF) {
				value -= 0x10000;
				output += stringFromCharCode(value >>> 10 & 0x3FF | 0xD800);
				value = 0xDC00 | value & 0x3FF;
			}
			output += stringFromCharCode(value);
			return output;
		}).join('');
	};
	var basicToDigit = codePoint => {
		if (codePoint - 48 < 10) {
			return codePoint - 22;
		}
		if (codePoint - 65 < 26) {
			return codePoint - 65;
		}
		if (codePoint - 97 < 26) {
			return codePoint - 97;
		}
		return base;
	};
	var adapt = (delta, numPoints, firstTime) => {
		var k = 0;
		delta = firstTime ? floor(delta / damp) : delta >> 1;
		delta += floor(delta / numPoints);
		for (/* no initialization */; delta > baseMinusTMin * tMax >> 1; k += base) {
			delta = floor(delta / baseMinusTMin);
		}
		return floor(k + (baseMinusTMin + 1) * delta / (delta + skew));
	};
	var decode = input => {
		var output = [],
        inputLength = input.length,
        out,
        i = 0,
        n = initialN,
        bias = initialBias,
        basic,
        j,
        index,
        oldi,
        w,
        k,
        digit,
        t,
        baseMinusT;
		basic = input.lastIndexOf(delimiter);
		if (basic < 0) {
			basic = 0;
		}
		for (j = 0; j < basic; ++j) {
			if (input.charCodeAt(j) >= 0x80) {
				error('not-basic');
			}
			output.push(input.charCodeAt(j));
		}
		for (index = basic > 0 ? basic + 1 : 0; index < inputLength; /* no final expression */) {
            for (oldi = i, w = 1, k = base; /* no condition */; k += base) {
				if (index >= inputLength) {
					error('invalid-input');
				}
				digit = basicToDigit(input.charCodeAt(index++));
				if (digit >= base || digit > floor((maxInt - i) / w)) {
					error('overflow');
				}
				i += digit * w;
				t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);
				if (digit < t) {
					break;
				}
				baseMinusT = base - t;
				if (w > floor(maxInt / baseMinusT)) {
					error('overflow');
				}
				w *= baseMinusT;
			}
			out = output.length + 1;
			bias = adapt(i - oldi, out, oldi === 0);
			if (floor(i / out) > maxInt - n) {
				error('overflow');
			}
			n += floor(i / out);
			i %= out;
			output.splice(i++, 0, n);
		}
		return ucs2encode(output);
	};
    return mapDomain(_input, function(string) {
        return /^xn--/.test(string) ? decode(string.slice(4).toLowerCase()) : string;
    });
}
async function initNTP(ntpforce = false) {
    var folderTabs = [];
    var res = await browser.bookmarks.search({ title: "NewTabPage", url: undefined });
    if (!(res = (res.length && res[0]))) {
        let folder = await browser.bookmarks.create({index: 0, parentId: "toolbar_____", title: "NewTabPage", type: "folder"});
        folderTabs.push(folder);
        let book = await browser.bookmarks.create({parentId: folder.id, title: "VitaliyVstyle.github.io", type: "bookmark", url: "https://github.com/VitaliyVstyle/VitaliyVstyle.github.io"});
        gridNode["innerHTML"] = getItemGrid(book);
        tabsCount = 0;
        tabsNode["innerHTML"] = `${getfolderTabs(folder)}${getotherTabs()}`;
        (selectedTab = tabsNode.querySelector(`[data-id="${folder.id}"]`)).setAttribute("selected", true);
        return;
    }
    folderTabs.push(res);
    var id = res.id, hasTab;
    var nodes = await browser.bookmarks.getChildren(id);
    var {selTabId, sessionTabSel} = await browser.storage.session.get();
    nodes = nodes.map(item => {
        if (item.type === "folder") {
            folderTabs.push(item);
            if (item.id === selTabId)
                hasTab = true;
            return "";
        }
        if (item.type !== "bookmark" || !item.url)
            return "";
        return getItemGrid(item);
    }).join("");
    tabsCount = 0;
    tabsNode["innerHTML"] = `${folderTabs.map(getfolderTabs).join("")}${getotherTabs()}`;
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
            if (item.type !== "bookmark" || !item.url)
                return "";
            return getItemGrid(item);
        }).join("");
        (selectedTab = tabsNode.querySelector(`[data-id="${selTabId}"]`)).setAttribute("selected", true);
        docEl.setAttribute("tabcount", selectedTab.dataset.count);
        return;
    }
    searchbox = tabsNode.querySelector(".css-input-search-box");
    if (selTabId === "__history_tab__") {
        let {maxResults} = await browser.storage.session.get("maxResults");
        let hres = await browser.history.search({ text: "", startTime: 0, maxResults });
        gridNode["innerHTML"] = hres.map(item => {
            if (!item.url || !(/^(?:https?|ftp):/.test(item.url)))
                return "";
            return getItemGrid(item, "history");
        }).join("");
        (selectedTab = tabsNode.querySelector('[data-id="__history_tab__"]')).setAttribute("selected", true);
        docEl.setAttribute("tabcount", "history");
        searchbox.title = browser.i18n.getMessage("searchHistory");
        return;
    }
    if (selTabId === "__downloads_tab__") {
        let {limit} = await browser.storage.session.get("limit");
        let res = await browser.downloads.search({ limit, orderBy: ["-startTime"] });
        gridNode["innerHTML"] = res.map(item => {
            if (item.state != "complete" || !item.url)
                return "";
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
}
initNTP();
document.head.children[1].textContent = browser.i18n.getMessage("pageTitle");
gridNode.addEventListener("click", getActionsClick, true);
tabsNode.addEventListener("click", getBtnClick);
tabsNode.addEventListener("mousedown", getChildFolder);
tabsNode.addEventListener("keypress", getSearchItems);
window.addEventListener("unload", function() {
    gridNode.removeEventListener("click", getActionsClick, true);
    tabsNode.removeEventListener("click", getBtnClick);
    tabsNode.removeEventListener("mousedown", getChildFolder);
    tabsNode.removeEventListener("keypress", getSearchItems);
}, { once: true });

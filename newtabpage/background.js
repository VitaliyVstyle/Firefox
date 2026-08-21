var menuCreated = false;

async function createMenus() {
    menuCreated = true;
    var createRootMenu = (id, sm = false) => {
        browser.menus.create({
            id,
            title: `${browser.i18n.getMessage("addBookmarkIn")}${sm ? ":" : " NewTabPage"}`,
            contexts: ["page", "link"],
            documentUrlPatterns: ["<all_urls>"],
        });
    };
    var folderTabs = [];
    var res = await browser.bookmarks.search({ title: "NewTabPage", url: undefined });
    if (!(res = (res.length && res[0]))) {
        let folder = await browser.bookmarks.create({index: 0, parentId: "toolbar_____", title: "NewTabPage", type: "folder"});
        folderTabs.push(folder.id);
        browser.storage.session.set({folderTabs});
        createRootMenu(folder.id);
        browser.bookmarks.create({parentId: folder.id, title: "VitaliyVstyle/Firefox", type: "bookmark", url: "https://github.com/VitaliyVstyle/Firefox"});
        return;
    }
    folderTabs.push(res.id);
    var nodes = await browser.bookmarks.getChildren(res.id);
    var sm;
    var createMenu = () => {
        createRootMenu("newtab-page", true);
        browser.menus.create({
            id: res.id,
            title: "NewTabPage",
            parentId: "newtab-page",
        });
        sm = true;
        createMenu = () => {}
    };
    nodes.forEach(({id, title, type}) => {
        if (type !== "folder") return;
        folderTabs.push(id);
        createMenu();
        browser.menus.create({
            id,
            title,
            parentId: "newtab-page",
        });
    });
    browser.storage.session.set({folderTabs});
    if (!sm)
        createRootMenu(res.id);
}
async function updateMenus() {
    await browser.menus.removeAll();
    createMenus();
}
async function handleChanged(id, info) {
    var {folderTabs, createMenu} = await browser.storage.session.get({
        folderTabs: [],
        createMenu: false,
    });
    if (!createMenu) return;
    if ((info.type === "folder" || info.node?.type === "folder") && (folderTabs.includes(id) || folderTabs.includes(info.parentId) || info.title === "NewTabPage"))
        updateMenus();
}
async function handleClicked(info, tab) {
    var {index} = await browser.storage.session.get("index");
    if (info.linkUrl) {
        let tab = await browser.tabs.create({
            url: info.linkUrl,
            active: false,
        });
        browser.tabs.hide(tab.id);
        var updated = (tabId, changeInfo, tabInfo) => {
            if (tabInfo.status != "complete") return;
            browser.tabs.onUpdated.removeListener(updated);
            let bookmark = {parentId: info.menuItemId, title: tabInfo.title, type: "bookmark", url: tabInfo.url};
            if (index)
                bookmark.index = 0;
            if (tabInfo.url == "about:blank") {
                delete bookmark.title;
                bookmark.url = info.linkUrl;
            }
            browser.bookmarks.create(bookmark);
            browser.tabs.remove(tab.id);
        };
        browser.tabs.onUpdated.addListener(updated, {tabId: tab.id, properties: ["title", "status"]});
    } else {
        let bookmark = {parentId: info.menuItemId, title: tab.title, type: "bookmark", url: tab.url};
        if (index)
            bookmark.index = 0;
        browser.bookmarks.create(bookmark);
    }
}
async function handleMessage(request, sender, sendResponse) {
    await browser.menus.removeAll();
    menuCreated = false;
    if (request.createMenu)
        createMenus();
}
function handleSuspend() {
    if (menuCreated) return;
    for (let type of ["onCreated", "onRemoved", "onChanged", "onMoved"])
        browser.bookmarks[type].removeListener(handleChanged);
    browser.menus.onClicked.removeListener(handleClicked);
}
async function handleStartup() {
    var tabs = await browser.tabs.query({active: true});
    tabs.forEach(async tab => {
        if (tab.status != "complete") {
            let updated = (tabId, changeInfo, tabInfo) => {
                if (tabInfo.status != "complete") return;
                browser.tabs.onUpdated.removeListener(updated);
                if (tabInfo.url == "about:blank")
                    browser.tabs.update(tabInfo.id, {url: browser.runtime.getURL("new_tab_page.html")});
            };
            browser.tabs.onUpdated.addListener(updated, {tabId: tab.id, properties: ["status"]});
        } else if (tab.url == "about:blank")
            browser.tabs.update(tab.id, {url: browser.runtime.getURL("new_tab_page.html")});
    });
}
browser.runtime.onStartup.addListener(handleStartup);
browser.runtime.onMessage.addListener(handleMessage);
browser.runtime.onSuspend.addListener(handleSuspend);
browser.menus.onClicked.addListener(handleClicked);
browser.bookmarks.onCreated.addListener(handleChanged);
browser.bookmarks.onRemoved.addListener(handleChanged);
browser.bookmarks.onChanged.addListener(handleChanged);
browser.bookmarks.onMoved.addListener(handleChanged);
browser.storage.session.get().then(async prefs => {
    if ("createMenu" in prefs) {
        if (prefs.createMenu)
            menuCreated = true;
        return;
    }
    prefs = await browser.storage.local.get({
        createMenu: true,
        openNewTab: false,
        sessionTabSel: true,
        insertNextCurrent: true,
        onlineSearch: false,
        index: false,
        maxResults: 500,
        limit: 500,
    });
    browser.storage.session.set(prefs);
    if (prefs.createMenu)
        updateMenus();
});

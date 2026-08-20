var _menuCreated = false;
const createMenus = async ({app_array, app_icons}) => {
    var createMenu = () => {
        browser.menus.create({
            id: "async-run-applications",
            title: browser.i18n.getMessage("Openin"),
            contexts: ["page", "link", "selection"],
        });
        _menuCreated = true;
        createMenu = () => {}
    };
    for (let [key, {disable, clipboard, title, path, iconpath}] of app_array.entries()) {
        if (disable) continue;
        createMenu();
        let menu = {
            id: `${key}`,
            title: `${title}${!clipboard ? "" : " (clipboard)"}`,
            parentId: "async-run-applications",
        };
        if (app_icons) {
            let icon = iconpath || `moz-icon://${await browser.AsyncRunApp.toFileURI(path)}`;
            if (!/\?size=.*$/.test(icon))
                menu.icons = {
                    16: `${icon}?size=16`,
                    32: `${icon}?size=32`,
                };
            else
                menu.icons = {
                    16: `${icon}`,
                    32: `${icon}`,
                };
        }
        browser.menus.create(menu);
    }
};
const updateMenus = async prefs => {
    await browser.menus.removeAll();
    _menuCreated = false;
    createMenus(prefs);
};
const handleClicked = async (info, tab) => {
    var {app_array} = await browser.storage.session.get("app_array");
    var ind = Number(info.menuItemId);
    var lastfpdir = await browser.AsyncRunApp.runApp(app_array[ind], info, tab);
    if (lastfpdir) {
        app_array[ind].lastfpdir = lastfpdir;
        await browser.storage.local.set({app_array});
        await browser.storage.session.set({app_array});
    }
};
const handleMessage = request => {
    updateMenus(request);
};
const handleSuspend = () => {
    if (_menuCreated) return;
    browser.menus.onClicked.removeListener(handleClicked);
};
const handleStartup = () => {}
browser.runtime.onStartup.addListener(handleStartup);
browser.runtime.onMessage.addListener(handleMessage);
browser.runtime.onSuspend.addListener(handleSuspend);
browser.menus.onClicked.addListener(handleClicked);
browser.storage.session.get().then(async prefs => {
    if ("app_array" in prefs) {
        if (prefs.app_array.length)
            _menuCreated = true;
        return;
    }
    prefs = await browser.storage.local.get({
        app_array: [],
        app_icons: true,
    });
    browser.storage.session.set(prefs);
    updateMenus(prefs);
});

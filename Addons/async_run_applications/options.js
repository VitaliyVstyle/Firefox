var _write = false;
const handleClick = async ({target}) => {
    if (_write || !/checkbox|button/.test(target.type)) return;
    _write = true;
    switch (target.className) {
        case "disable":
            await saveCheckbox(target);
            break;
        case "clipboard":
            if (target.matches("#itemsInMenu :scope")) await saveCheckbox(target, true);
            break;
        case "up":
            await saveUpDown(target);
            break;
        case "down":
            await saveUpDown(target, true);
            break;
        case "choose":
            await choosePath(target)
            break;
        case "delete":
            await deleteItem(target);
            break;
        case "save":
            await saveTextbox(target);
            break;
        case "expand":
            let row = target.parentElement;
            let tarea = target.nextElementSibling;
            if (tarea.rows === 1) {
                tarea.rows = 5;
                row.setAttribute("expand", "true");
            } else {
                tarea.rows = 1;
                row.removeAttribute("expand");
            }
            break;
    }
    _write = false;
};
const savePrefs = async prefs => {
    await browser.storage.local.set(prefs);
    await browser.storage.session.set(prefs);
    await browser.runtime.sendMessage(prefs);
};
const saveCheckbox = async (target, revers) => {
    var prefs = await browser.storage.local.get();
    var {app_array} = prefs;
    var pref = app_array[Number(target.parentElement.dataset.index)];
    var prop = target.className;
    if (!revers === !target.checked) pref[prop] = true;
    else if (prop in pref) delete pref[prop];
    await savePrefs(prefs);
    createSection("itemsInMenu", app_array);
};
const saveUpDown = async (target, revers) => {
    var indsel = Number(target.parentElement.dataset.index);
    var indrep = !revers ? (indsel - 1) : (indsel + 1);
    var prefs = await browser.storage.local.get();
    var {app_array} = prefs;
    var prefrep = app_array[indrep];
    if (!prefrep) return;
    app_array[indrep] = app_array[indsel];
    app_array[indsel] = prefrep;
    await savePrefs(prefs);
    createSection("itemsInMenu", app_array);
};
const choosePath = async target => {
    var winInfo = await browser.windows.getCurrent();
    var path = await browser.AsyncRunApp.filePicker(winInfo.id, browser.i18n.getMessage("extPath"));
    if (!path) return;
    var tbox = target.previousElementSibling;
    tbox.value = path;
    tbox.title = path;
};
const deleteItem = async target => {
    var prefs = await browser.storage.local.get();
    var {app_array} = prefs;
    app_array.splice(Number(target.parentElement.dataset.index), 1);
    await savePrefs(prefs);
    createSection("itemsInMenu", app_array);
};
const saveTextbox = async target => {
    var row = target.parentElement;
    var title = row.children[2].value, path = row.children[5].value;
    if (!title || !path) return;
    var args = row.children[10].value, iconpath = row.children[11].value;
    var prefs = await browser.storage.local.get();
    var {app_array} = prefs;
    var addpref = target.matches("#addItem :scope");
    var pref = !addpref ? app_array[Number(row.dataset.index)] : {};
    if (row.children[1].checked) pref.clipboard = true;
    else if ("clipboard" in pref) delete pref.clipboard;
    pref.title = title;
    pref.path = path;
    if (args) pref.args = args;
    else if ("args" in pref) delete pref.args;
    if (iconpath) pref.iconpath = iconpath;
    else if ("iconpath" in pref) delete pref.iconpath;
    if (addpref) app_array.push(pref);
    await savePrefs(prefs);
    createSection("itemsInMenu", app_array);
    createSection("addItem", [{ disable: false, clipboard: false, title: "", path: "", args: "", iconpath: "" }]);
};
const iconsChange = async e => {
    if (_write) return;
    _write = true;
    var app_icons = e.target.checked;
    await browser.storage.local.set({app_icons});
    await browser.storage.session.set({app_icons});
    await browser.runtime.sendMessage(await browser.storage.local.get());
    _write = false;
};
const createSection = (id, app_array) => {
    var sec = window[id] ||= document.querySelector(`#${id}`);
    var children = sec.querySelectorAll(":scope > .row");
    if (children.length)
        for (let child of children)
            child.remove();
    else if (!sec.onclick) sec.onclick = e => handleClick(e);
    for (let [ind, {disable, clipboard, title, path, args, iconpath}] of app_array.entries()) {
        let row = document.createElement("div");
        row.className = "row";
        row.setAttribute("data-index", ind);
        row.append(createItem("input", disable, "disable", "checkbox"));
        row.append(createItem("input", !clipboard, "clipboard", "checkbox"));
        row.append(createItem("input", title, "title", "text"));
        row.append(createItem("button", null, "up", "button"));
        row.append(createItem("button", null, "down", "button"));
        row.append(createItem("input", path, "path", "text"));
        row.append(createItem("button", null, "choose", "button"));
        row.append(createItem("button", null, "save", "button"));
        row.append(createItem("button", null, "delete", "button"));
        row.append(createItem("button", null, "expand", "button"));
        row.append(createItem("textarea", args, "args", "textarea"));
        row.append(createItem("input", iconpath, "iconpath", "text"));
        sec.append(row);
    }
};
function createItem(elm, val = "", cls, type) {
    var item = document.createElement(elm);
    item.className = cls;
    item.type = type;
    if (type === "checkbox") {
        item.checked = !val;
        item.autocomplete = "off";
        if (cls === "clipboard") item.title = "Clipboard";
    } else if (val !== null) {
        item.value = item.title = val;
        item.autocomplete = "off";
        item.spellcheck = false;
        item.rows &&= 1;
    }
    return item;
};
const initOptions = async () => {
    var prefs = await browser.storage.local.get();
    if (Object.keys(prefs).length !== 2) {
        prefs.app_array ??= [];
        prefs.app_icons ??= true;
        await browser.storage.local.set(prefs);
    }
    createSection("itemsInMenu", prefs.app_array);
    createSection("addItem", [{ disable: false, clipboard: false, title: "", path: "", args: "", iconpath: "" }]);
    var iconsInMenu = document.querySelector("#iconsInMenu");
    iconsInMenu.onchange = e => iconsChange(e);
    iconsInMenu.checked = !!prefs.app_icons;
};
const initLoad = () => {
    document.head.children[1].textContent = browser.i18n.getMessage("pageTitleOption");
    var locales = document.querySelectorAll("[data-locale]");
    for (let l of locales)
        l.textContent = browser.i18n.getMessage(`${l.dataset.locale}`);
    initOptions();
};
initLoad();

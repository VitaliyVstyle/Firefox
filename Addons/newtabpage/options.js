const saveForm = async () => {
    var { createMenu } = await browser.storage.local.get("createMenu");
    for (let inp of document.querySelectorAll("[data-pref]")) {
        let pref = inp.dataset.pref, val;
        if (inp.type === "checkbox") val = inp.checked;
        else if (inp.type === "number") {
            val = Number(inp.value);
            if (!val || isNaN(val) || val > 2000) val = 500;
        }
        await browser.storage.local.set({ [pref]: val });
        await browser.storage.session.set({ [pref]: val });
        if (pref === "createMenu" && val !== createMenu) browser.runtime.sendMessage({ createMenu: val });
    }
};
(async () => {
    document.head.children[1].textContent = browser.i18n.getMessage("pageTitleOption");
    var locales = document.querySelectorAll("[data-locale]");
    for (let loc of locales)
        loc[loc.value === undefined ? "textContent" : "value"] = browser.i18n.getMessage(`${loc.dataset.locale}`);
    var prefs = await browser.storage.local.get({
        createMenu: true,
        openNewTab: true,
        sessionTabSel: true,
        insertNextCurrent: true,
        onlineSearch: false,
        index: false,
        maxResults: 500,
        limit: 500,
    });
    for (let pref in prefs) {
        let inp = document.querySelector(`[data-pref="${pref}"]`);
        if (!inp) break;
        let val = prefs[pref];
        if (inp.type === "checkbox") {
            inp.checked = val;
            inp.toggleAttribute("checked", val);
        } else inp.value = val;
    }
    document.querySelector("#saveform").onclick = saveForm;
})();

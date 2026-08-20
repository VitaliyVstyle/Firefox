async function SaveForm() {
    var inputs = document.querySelectorAll("[data-pref]");
    var {createMenu} = await browser.storage.local.get("createMenu");
    for (let i of inputs) {
        let pref = i.dataset.pref, val;
        if (i.type === "checkbox")
            val = i.checked;
        else if (i.type === "number") {
            val = +i.value;
            if (!val || isNaN(val) || val > 2000)
                val = 500;
        }
        await browser.storage.local.set({[pref]: val});
        await browser.storage.session.set({[pref]: val});
        if (pref === "createMenu" && val != createMenu)
            browser.runtime.sendMessage({createMenu: val});
    }
}
function initOptions() {
    document.head.children[1].textContent = browser.i18n.getMessage("pageTitleOption");
    var locales = document.querySelectorAll("[data-locale]");
    for (let l of locales)
        l[l.value === undefined ? "textContent" : "value"] = browser.i18n.getMessage(`${l.dataset.locale}`);
    browser.storage.local.get({
        createMenu: true,
        openNewTab: false,
        sessionTabSel: true,
        insertNextCurrent: true,
        onlineSearch: false,
        index: false,
        maxResults: 500,
        limit: 500,
    }).then(prefs => {
        for (let pref in prefs) {
            let input = document.querySelector(`[data-pref='${pref}']`);
            if (!input) break;
            if (input.type === "checkbox")
                input.checked = prefs[pref];
            else
                input.value = prefs[pref];
        }
    });
    document.querySelector("#saveform").onclick = () => SaveForm();
}
initOptions();

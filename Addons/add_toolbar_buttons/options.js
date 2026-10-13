const saveForm = () => {
    var arr = [];
    for (let inp of document.querySelectorAll("[data-pref]"))
        arr.push([inp.dataset.pref, inp.type === "checkbox" ? inp.checked : (inp.type === "number" ? +inp.value : inp.value)]);
    browser.addToolbarButtons.setPrefs(arr);
}
const initOptions = async () => {
    document.head.children[1].textContent = browser.i18n.getMessage("pageTitleOption");
    for (let loc of document.querySelectorAll("[data-locale]"))
        loc[(loc.value === undefined || loc.localName === "option") ? "textContent" : "value"] = browser.i18n.getMessage(`${loc.dataset.locale}`);
    var arr = [];
    for (let inp of document.querySelectorAll("[data-pref]"))
        arr.push(inp.dataset.pref);
    for (let nv of await browser.addToolbarButtons.getPrefs(arr)) {
        let inp = document.querySelector(`[data-pref="${nv[0]}"]`);
        if (inp.type === "checkbox") {
            inp.checked = nv[1];
            inp.toggleAttribute("checked", nv[1]);
        } else inp.value = nv[1];
    }
    document.querySelector("#saveform").onclick = saveForm;
};
initOptions();

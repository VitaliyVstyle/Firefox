function saveForm() {
    var inputs = document.querySelectorAll("[data-pref]"), arr = [];
    for (let i of inputs) {
        let pref = i.dataset.pref;
        if (i.type === "checkbox") arr.push([pref, i.checked]);
        else arr.push([pref, i.value]);
    }
    browser.LongLeftClick.setPref(arr);
}
function initOptions() {
    document.head.children[1].textContent = browser.i18n.getMessage("pageTitleOption");
    var locales = document.querySelectorAll("[data-locale]");
    for (let l of locales)
        l[l.value === undefined ? "textContent" : "value"] = browser.i18n.getMessage(`${l.dataset.locale}`);
    var inputs = document.querySelectorAll("[data-pref]"), arr = [];
    for (let i of inputs)
        arr.push(i.dataset.pref);
    browser.LongLeftClick.getPref(arr).then(res => res.forEach(nv => {
        var input = document.querySelector(`[data-pref="${nv[0]}"]`);
        if (input.type === "checkbox") input.checked = nv[1];
        else input.value = nv[1];
    }));
    document.querySelector("#saveform").onclick = () => saveForm();
}
initOptions();

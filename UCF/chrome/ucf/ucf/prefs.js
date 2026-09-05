const { UcfPrefs } = ChromeUtils.importESModule("chrome://ucf-url/content/ucf/UcfPrefs.mjs");
const controlSet = new Set([
    "toolbars_enable",
    "t_enable",
    "t_autohide",
    "v_enable",
    "v_autohide",
    "css_js_content",
]);
const replaceSet = new Set([
    "css_js_content_groups",
    "css_js_content_matches",
]);
const Change = {
    observe(s, t, pref) {
        var i = document.querySelector(`[data-pref="${pref}"]`);
        if (i) FillForm(pref, i);
    },
    handleEvent({ target: i }) {
        UcfPrefs.setPrefs(i.dataset.pref, i.type === "checkbox" ? i.checked : (replaceSet.has(i.dataset.pref) ? (i.value ? i.value.split(",") : []) : (i.type === "number" ? Number(i.value) : i.value)));
    },
};
const FillForm = (pref, i, val = UcfPrefs.prefs[pref]) => {
    if (i.type === "checkbox") {
        if (i.checked !== val) i.checked = val;
        if (controlSet.has(pref)) i.parentElement.nextElementSibling.disabled = !val;
    } else {
        let v = replaceSet.has(pref) ? val.join(",") : val;
        if (i.value !== v) i.value = v;
    }
};
const filePicker = (inp, mode = "modeOpen") => {
    var fp = Cc["@mozilla.org/filepicker;1"].createInstance(Ci.nsIFilePicker);
    try {
        fp.init(browsingContext, inp.title, fp[mode]);
    } catch {
        fp.init(window, inp.title, fp[mode]);
    }
    fp.open(res => {
        if (res !== fp.returnOK) return;
        var { path } = fp.file;
        if (path === inp.value) return;
        inp.value = path;
        inp.dispatchEvent(new Event("change", { bubbles: true }));
    });
};
const RestoreDefaults = () => {
    var prefs = [];
    for (let i of document.querySelectorAll("[data-pref]")) {
        let pref = i.dataset.pref;
        prefs.push([pref, UcfPrefs.default[pref]]);
    }
    UcfPrefs.setPrefs(prefs);
};
const getFile = path => {
    var file = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);
    file.initWithPath(path);
    return file;
};
const openFileOrDir = async (file, ppath, pargs) => {
    let editor = UcfPrefs.getPref(ppath, "").trim();
    if (editor) {
        let itwp = getFile(editor);
        let process = Cc["@mozilla.org/process/util;1"].createInstance(Ci.nsIProcess);
        process.init(itwp);
        let args = UcfPrefs.getPref(pargs, "").trim();
        let quot = /^"/.test(args) ? true : false;
        args = args.split(/\s*"\s*/);
        let temp = [];
        for (let frag of args) {
            if (!frag) continue;
            if (!quot) frag = frag.split(/\s+/);
            else frag = [frag];
            quot = !quot;
            temp = temp.concat(frag);
        }
        args = temp;
        args.push(file.path);
        process.runwAsync(args, args.length);
    } else file.launch();
};
const initOptions = () => {
    var l10n = UcfPrefs.getDOMLocalization("ucf/locales", "prefs.ftl");
    l10n.connectRoot(document.documentElement);
    l10n.translateRoots();
    for (let i of document.querySelectorAll("[data-pref]"))
        FillForm(i.dataset.pref, i);
    document.querySelector("#btn_browse").onclick = e => filePicker(e.currentTarget.parentElement.firstElementChild);
    document.querySelector("#btn_folder_browse").onclick = e => filePicker(e.currentTarget.parentElement.firstElementChild);
    document.querySelector("#open_ucf").onclick = () => getFile(UcfPrefs.manifestPath).parent.launch();
    document.querySelector("#open_edit_ucf").onclick = () => openFileOrDir(getFile(UcfPrefs.manifestPath).parent, "folder_editor_path", "folder_editor_args");
    document.querySelector("#restore").onclick = () => RestoreDefaults();
    document.querySelector("#restart").onclick = () => UcfPrefs.restartApp();
    document.querySelector("#restart_no_cache").onclick = () => UcfPrefs.restartApp(true);
    document.querySelector("#open_options").onclick = () => UcfPrefs.openHavingURI(window, "about:ucf-url-data", true);
    window.addEventListener("change", Change);
    Services.obs.addObserver(Change, UcfPrefs.TOPIC_PREFS);
    window.addEventListener("unload", () => {
        window.removeEventListener("change", Change);
        Services.obs.removeObserver(Change, UcfPrefs.TOPIC_PREFS);
        l10n.disconnectRoot(document.documentElement);
    }, { once: true });
};
initOptions();

/**
@UCF @param {"prop":"JsBackground","disable":true} @UCF
*/
(async ({ UrlbarSearchOneOffs } = ChromeUtils.importESModule("moz-src:///browser/components/urlbar/UrlbarSearchOneOffs.sys.mjs")) => {
    var orig = UrlbarSearchOneOffs.prototype.handleSearchCommand;
    UrlbarSearchOneOffs.prototype.handleSearchCommand = function handleSearchCommand(e) {
        Object.defineProperty(e, "shiftKey", {
            enumerable: true,
            configurable: true,
            value: !e.shiftKey,
        });
        return orig.apply(this, arguments);
    };
})();

(async (
    id = "ucf-read-mail",
    label = "Mail",
    tooltiptext = "Open the Mail app",
    image = "chrome://user_chrome_files/content/data/svg/email.svg",
) => CustomizableUI.createWidget({
    id,
    label,
    tooltiptext,
    localized: false,
    defaultArea: CustomizableUI.AREA_NAVBAR,
    get FilePath() {
        delete this.FilePath;
        return this.FilePath = Components.Constructor("@mozilla.org/file/local;1", Ci.nsIFile, "initWithPath");
    },
    get ProcessInit() {
        delete this.ProcessInit;
        return this.ProcessInit = Components.Constructor("@mozilla.org/process/util;1", Ci.nsIProcess, "init");
    },
    onCreated(btn) {
        btn.style.setProperty("list-style-image", `url("${image}")`);
    },
    onClick(e) {
        if (e.button) return;
        var appFile = new this.FilePath("/usr/bin/kmail");
        if (!appFile.exists() || !appFile.isExecutable()) return;
        var process = new this.ProcessInit(appFile);
        process.runwAsync(["-qwindowtitle"], 1);
    },
}))();

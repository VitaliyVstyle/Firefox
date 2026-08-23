//
(async (file = Services.dirsvc.get("UChrm", Ci.nsIFile), filename) => {
    file.append("ucf");
    file.append("ucf.manifest");
    if (!file.exists() || !file.isFile()) return;
    switch (Services.appinfo.ID) {
        case "{ec8030f7-c20a-464f-9b0e-13a3a9e97384}": // Firefox or etc.
            filename = "ucf.js";
            break;
        case "{3550f703-e582-4d05-9a08-453d09bdfdc6}": // Thunderbird
            filename = "ucf_tb.js";
            break;
        default:
            return;
    }
    Components.manager.QueryInterface(Ci.nsIComponentRegistrar).autoRegister(file);
    var sandbox = Cu.Sandbox(Services.scriptSecurityManager.getSystemPrincipal(), {
        wantComponents: true,
        sandboxName: "UCF:Main",
        wantGlobalProperties: ["ChromeUtils"],
    });
    sandbox.manifestPath = file.path;
    Services.scriptloader.loadSubScript(`chrome://user_chrome_files/content/ucf/${filename}`, sandbox);
})();

lockPref("xpinstall.signatures.required", false);
lockPref("extensions.experiments.enabled", true);
lockPref("extensions.langpacks.signatures.required", false);
lockPref("toolkit.telemetry.enabled", false);

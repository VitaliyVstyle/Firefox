const { UcfPrefs } = ChromeUtils.importESModule("chrome://ucf-url/content/ucf/UcfPrefs.mjs");
const l10n = UcfPrefs.l10nDoMLocalization("ucf/locales", "prefs.ftl");
l10n.connectRoot(document.head);
l10n.translateRoots();
window.addEventListener("unload", () => {
    l10n.disconnectRoot(document.head);
}, { once: true });

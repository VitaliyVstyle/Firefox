const lazy = {
    get E10SUtils() {
        delete this.E10SUtils;
        return this.E10SUtils = ChromeUtils.importESModule("resource://gre/modules/E10SUtils.sys.mjs").E10SUtils;
    },
};
export class LLCWinActorParent extends JSWindowActorParent {
    receiveMessage({ name, data }) {
        if (name !== "LLCWinActor:mousedown") return;
        var browser = this.browsingContext.top.embedderElement;
        if (!browser) return;
        var { link, ref, next, principal, backg } = data;
        var { gBrowser } = browser.documentGlobal;
        var params = {
            referrerInfo: ref ? lazy.E10SUtils.deserializeReferrerInfo(ref) : null,
            triggeringPrincipal: principal ? lazy.E10SUtils.deserializePrincipal(principal) : Services.scriptSecurityManager.getSystemPrincipal(),
        };
        params.index = params.tabIndex = next ? (gBrowser.selectedTab._tPos + 1) : null;
        var tab = gBrowser.addTab(link, params);
        if (!backg) gBrowser.selectedTab = tab;
    }
}

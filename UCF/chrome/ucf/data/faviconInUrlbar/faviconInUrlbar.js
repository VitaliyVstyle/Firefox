/**
@UCF @param {"prop":"JsChrome.load","ucfobj":true,"disable":true} @UCF
*/
(async (
    handlers = true,
    tooltip = "L: Copy address of current page\nShift+L|M: Copy domain of current page\nR: More site information",
    confirmURL = "URL copied to clipboard!",
    confirmDomain = "Domain copied to clipboard!",
) => ({
    get clipboard() {
        delete this.clipboard;
        return this.clipboard = Cc["@mozilla.org/widget/clipboardhelper;1"].getService(Ci.nsIClipboardHelper);
    },
    get idnService() {
        delete this.idnService;
        return this.idnService = Cc["@mozilla.org/network/idn-service;1"].getService(Ci.nsIIDNService);
    },
    get show() {
        delete this.show;
        return this.show = Cu.evalInSandbox(
            `(function ${ConfirmationHint.show})`.replace(/(\)\s+{)/, `, confirmText$1
                var MozXULElement = { insertFTLIfNeeded() {} };
                var document = { l10n: { setAttributes: msg => msg.textContent = confirmText } };
            `),
            sandboxWinSysPrincipal
        );
    },
    init() {
        var id = "ucf-favicon-in-urlbar";
        var box = document.createXULElement("box");
        box.id = `${id}-box`;
        var img = document.createXULElement("image");
        img.id = `${id}-img`;
        box.append(img);
        gURLBar._inputContainer.prepend(box);
        var { STATE_START, STATE_STOP, STATE_IS_NETWORK } = Ci.nsIWebProgressListener;
        var updatefavicon = (image, isimg) => {
            if (image) box.style.setProperty("--v-favicon", `url("${image}")`);
            else box.style.removeProperty("--v-favicon");
            if (isimg && box.hasAttribute("busy")) box.removeAttribute("busy");
        };
        this.handleEvent = e => {
            var tab = e.target, isimg;
            if (tab.selected && ((isimg = e.detail.changed.includes("image")) || e.detail.changed.includes("selected"))) updatefavicon(tab.image, isimg);
        };
        this.onStateChange = (progress, request, flags) => {
            if (flags & STATE_IS_NETWORK && progress?.isTopLevel) {
                if (flags & STATE_START) box.setAttribute("busy", "true");
                else if (flags & STATE_STOP) updatefavicon(gBrowser.selectedTab.image, true);
            }
        };
        setUnloadMap(Symbol(id), this.destructor, this);
        gBrowser.tabContainer.addEventListener("TabAttrModified", this);
        gBrowser.addProgressListener(this);
        if (!handlers) return;
        box.toggleAttribute("context", true);
        box.tooltipText = tooltip;
        box.onclick = e => {
            e.stopPropagation();
            switch (e.button) {
                case 0:
                    this.copy(e, !e.shiftKey);
                    break;
                case 1:
                    this.copy(e);
                    break;
                case 2:
                    BrowserCommands.pageInfo();
            }
        };
    },
    copy(event, url) {
        if (url) {
            this.clipboard.copyStringToClipboard(gURLBar.makeURIReadable(gBrowser.selectedBrowser.currentURI).displaySpec, Ci.nsIClipboard.kGlobalClipboard);
            this.show.call(ConfirmationHint, event.currentTarget, "", { event, hideArrow: true }, confirmURL);
        } else {
            let host = "";
            let uri = gURLBar.makeURIReadable(gBrowser.selectedBrowser.currentURI);
            try {
                if (WebExtensionPolicy.getByURI(uri)) return;
            } catch { }
            try {
                host = Services.eTLD.getBaseDomain(uri);
            } catch {
                host = uri.asciiHost;
            }
            if (!host) return;
            try {
                host = this.idnService.convertToDisplayIDN(host, {});
            } catch { }
            this.clipboard.copyStringToClipboard(host, Ci.nsIClipboard.kGlobalClipboard);
            this.show.call(ConfirmationHint, event.currentTarget, "", { event, hideArrow: true }, confirmDomain);
        }
    },
    destructor() {
        gBrowser.tabContainer.removeEventListener("TabAttrModified", this);
        gBrowser.removeProgressListener(this);
    }
}).init())();

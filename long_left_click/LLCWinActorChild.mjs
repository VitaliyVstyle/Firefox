const lazy = {
    get E10SUtils() {
        delete this.E10SUtils;
        return this.E10SUtils = ChromeUtils.importESModule("resource://gre/modules/E10SUtils.sys.mjs").E10SUtils;
    },
    get extGetBranch() {
        delete this.extGetBranch;
        return this.extGetBranch = Services.prefs.getBranch("extensions.long_left_click.");
    },
    get timeContent() {
        delete this.timeContent;
        return this.timeContent = this.extGetBranch.getIntPref("timeContent");
    },
    get enableImages() {
        delete this.enableImages;
        return this.enableImages = this.extGetBranch.getBoolPref("enableImages");
    },
    get referrer() {
        delete this.referrer;
        return this.referrer = this.extGetBranch.getBoolPref("referrer");
    },
    get excludeTags() {
        delete this.excludeTags;
        return this.excludeTags = new Set(["input", "textarea", "select", "option"]);
    },
    get backgroundCnt() {
        delete this.backgroundCnt;
        return this.backgroundCnt = this.extGetBranch.getBoolPref("backgroundCnt");
    },
    get nextToCurrentCnt() {
        delete this.nextToCurrentCnt;
        return this.nextToCurrentCnt = this.extGetBranch.getBoolPref("nextToCurrentCnt");
    },
    get timer() {
        delete this.timer;
        return this.timer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
    },
};
export class LLCWinActorChild extends JSWindowActorChild {
    actorCreated() {
        this.handle_ = this.handle.bind(this);
    }
    didDestroy() {
        this.delListeners_?.();
    }
    receiveMessage({ name, data }) {
        return ({
            "LLCWinActor:getenableImages": () => lazy.enableImages,
            "LLCWinActor:enableImages": () => {
                delete lazy.enableImages;
                lazy.enableImages = data.img;
                this.linkorImg = lazy.enableImages ? this.linkorImg_ : this.linkorImg__;
            },
            "LLCWinActor:timeContent": () => {
                delete lazy.timeContent;
                lazy.timeContent = data.time;
                this.mousedown = lazy.timeContent > 50 ? this.mousedown_ : this.mousedown__;
            },
            "LLCWinActor:referrer": () => {
                delete lazy.referrer;
                lazy.referrer = data.ref;
            },
            "LLCWinActor:backgroundCnt": () => {
                delete lazy.backgroundCnt;
                lazy.backgroundCnt = data.backg;
            },
            "LLCWinActor:nextToCurrentCnt": () => {
                delete lazy.nextToCurrentCnt;
                lazy.nextToCurrentCnt = data.next;
            },
        })[name]?.();
    }
    openLink(node, link, urllink) {
        var ref = null, principal = null;
        if (urllink) {
            let doc = node.ownerDocument;
            if (typeof link === "object" && link.animVal) {
                try {
                    link = Services.io.newURI(link.animVal, null, Services.io.newURI(doc.baseURI)).spec;
                } catch { return; }
            }
            if (lazy.referrer) {
                try {
                    ref = Cc["@mozilla.org/referrer-info;1"].createInstance(Ci.nsIReferrerInfo);
                    if (HTMLAnchorElement.isInstance(node) ||
                        HTMLAreaElement.isInstance(node) ||
                        HTMLLinkElement.isInstance(node)) ref.initWithElement(node);
                    else ref.initWithDocument(doc);
                    ref = lazy.E10SUtils.serializeReferrerInfo(ref);
                } catch { }
            }
            try {
                principal = lazy.E10SUtils.serializePrincipal(doc.nodePrincipal);
            } catch { }
        }
        this.addListeners();
        this.sendAsyncMessage("LLCWinActor:mousedown", { backg: lazy.backgroundCnt, next: lazy.nextToCurrentCnt, link, ref, principal });
    }
    linkorImg(node, e) {
        this.linkorImg = lazy.enableImages ? this.linkorImg_ : this.linkorImg__;
        this.linkorImg(node, e);
    }
    doLink(node, elmnode) {
        do {
            if (node.nodeType !== elmnode) continue;
            if (node.matches(":any-link")) {
                if (!node.matches("[href='#'],[href^='javascript:'],[href^='addons:']")) this.openLink(node, node.href, true);
                return true;
            }
        } while (node = node.flattenedTreeParentNode);
        return false;
    }
    linkorImg_(node, e) {
        if (lazy.excludeTags.has(node.localName)) return;
        var elmnode = Node.ELEMENT_NODE;
        if (this.doLink(node, elmnode)) return;
        if (node.matches("img[src]:not([src=''])")) {
            this.openLink(node, node.src);
            return;
        }
        if (SVGElement.isInstance(node)) {
            if (!SVGSVGElement.isInstance(node)) {
                let svg = node.ownerSVGElement;
                if (svg) node = svg;
                else {
                    while (node = node.flattenedTreeParentNode) {
                        if (SVGSVGElement.isInstance(node)) break;
                    }
                    if (!SVGSVGElement.isInstance(node)) return;
                }
            }
            let clone = node.cloneNode(true);
            clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
            let data = clone["outerHTML"];
            try {
                data = encodeURIComponent(`${data}`);
            } catch { }
            this.openLink(node, `data:image/svg+xml,${data}`);
            return;
        }
        if (HTMLCanvasElement.isInstance(node)) {
            (async () => this.openLink(node, node.toDataURL()))();
            return;
        }
        if (XULElement.isInstance(e.originalTarget)) return;
        var burl, win = this.contentWindow;
        do {
            if (node.nodeType !== elmnode) continue;
            if ((burl = win.getComputedStyle(node).backgroundImage).includes('url("')
                || (burl = win.getComputedStyle(node, "::after").backgroundImage).includes('url("')
                || (burl = win.getComputedStyle(node, "::before").backgroundImage).includes('url("')) {
                this.openLink(node, burl.replace(/^.*url\("|"\).*$/g, ""));
                break;
            }
        } while (node = node.flattenedTreeParentNode);
    }
    linkorImg__(node) {
        if (lazy.excludeTags.has(node.localName)) return;
        this.doLink(node, Node.ELEMENT_NODE);
    }
    handle(e) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        this.delListeners_ = null;
    }
    addListeners() {
        this.contentWindow.addEventListener("click", this.handle_, { once: true, capture: true });
        this.delListeners_ = this.delListeners;
    }
    delListeners() {
        this.contentWindow?.removeEventListener("click", this.handle_, { once: true, capture: true });
        this.delListeners_ = null;
    }
    handleEvent(e) {
        this[e.type](e);
    }
    mouseup(e) {
        if (e.button) return;
        lazy.timer.cancel();
    }
    dragstart(e) {
        this.delListeners_?.();
        if (e.button) return;
        lazy.timer.cancel();
    }
    selectstart(e) {
        this.delListeners_?.();
        if (e.button) return;
        lazy.timer.cancel();
    }
    mousedown(e) {
        this.mousedown = lazy.timeContent > 50 ? this.mousedown_ : this.mousedown__;
        this.mousedown(e);
    }
    mousedown_(e) {
        this.delListeners_?.();
        if (e.button) return;
        lazy.timer.cancel();
        if (e.shiftKey || e.altKey || e.ctrlKey) return;
        var node = e.composedTarget || e.target;
        if (!node) return;
        lazy.timer.initWithCallback(() => this.linkorImg(node, e), lazy.timeContent, Ci.nsITimer.TYPE_ONE_SHOT);
    }
    mousedown__(e) {
        this.delListeners_?.();
        if (e.button) return;
        lazy.timer.cancel();
        if (e.shiftKey || e.altKey || e.ctrlKey) return;
        var node = e.composedTarget || e.target;
        if (!node) return;
        this.linkorImg(node, e);
    }
}

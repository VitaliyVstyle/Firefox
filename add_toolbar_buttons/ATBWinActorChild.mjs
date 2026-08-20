const lazy = {
    get excludedTags() {
        delete this.excludedTags;
        return this.excludedTags = new Set(["a", "svg", "canvas", "applet", "input", "button", "area", "embed", "noembed", "frame", "frameset", "head", "iframe", "img", "select", "option", "datalist", "map", "meta", "noscript", "video", "audio", "object", "param", "script", "style", "textarea", "code"]);
    },
    get linkPointerEvtStyle() {
        delete this.linkPointerEvtStyle;
        return this.linkPointerEvtStyle = `data:text/css;charset=utf-8,${encodeURIComponent(`:any-link:not([href="#"]) { pointer-events: none !important; text-decoration: none !important; } * { user-select: text !important; }`)}`;
    },
};
export class ATBWinActorChild extends JSWindowActorChild {
    receiveMessage({ name, data }) {
        return ({
            "ATBWinActor:ScrollPageUp": () => {
                this.document.defaultView.scrollByPages(-1);
            },
            "ATBWinActor:ScrollPageDown": () => {
                this.document.defaultView.scrollByPages(1);
            },
            "ATBWinActor:ScrollTop": () => {
                this.document.defaultView.scrollTo(0, 0);
            },
            "ATBWinActor:ScrollBottom": () => {
                var win = this.document.defaultView;
                win.scrollTo(0, win.scrollMaxY);
            },
            "ATBWinActor:PageJavaScript": () => {
                try {
                    this.docShell.allowJavascript = data.state;
                } catch { }
            },
            "ATBWinActor:getPageJavaScript": () => {
                return this.docShell.allowJavascript;
            },
            "ATBWinActor:PageImages": () => {
                try {
                    this.docShell.allowImages = data.state;
                } catch { }
            },
            "ATBWinActor:getPageImages": () => {
                return this.docShell.allowImages;
            },
            "ATBWinActor:ImageAnimationMode": () => {
                try {
                    this.document.defaultView.windowUtils.imageAnimationMode = data.state;
                } catch { }
            },
            "ATBWinActor:getImageAnimationMode": () => {
                return this.document.defaultView.windowUtils.imageAnimationMode;
            },
            "ATBWinActor:PageMedia": () => {
                try {
                    this.docShell.allowMedia = data.state;
                } catch { }
            },
            "ATBWinActor:getPageMedia": () => {
                return this.docShell.allowMedia;
            },
            "ATBWinActor:LinkPointerEvents": () => {
                this.linkPointerEvents(data.state);
            },
            "ATBWinActor:getLinkPointerEvents": () => {
                return this.linkPointerEvtStyleEnable;
            },
            "ATBWinActor:TextToLink": () => {
                this.textToLink();
            },
            "ATBWinActor:CopyAllLinks": () => {
                return this.copyAllLinks();
            },
        })[name]?.();
    }
    textToLink() {
        if (this.running || !this.document?.body) return;
        this.running = true;
        var url_regexp = /(^|[\s(,;'"`“\[\]=_])((?:(?:https?|ftp):\/\/[-\wа-яё.!~*'();,/?:@&=+$#%_\u2300-\u23FF\u2600-\u27BF]|www\d{0,3}[.][a-zа-яё0-9.-]{2,249}|[a-zа-яё0-9.-]{2,250}[.][a-zа-яё]{2,4}\/)[-\wа-яё.!~*'();,/?:@&=+$#%_\u2300-\u23FF\u2600-\u27BF]*)/gim;
        var email_regexp = /(^|mailto:|[\s(,;'"`“\[\]=])([\w!#$%&'*+/=?^`{|}~.-]{2,}@[\[\]a-z0-9.-]+)/gim;
        var elList = [];
        var setEmail = (node, text) => {
            var repl = text.replace(email_regexp, '$1<a href="mailto:$2" class="add__TextToEmail">$2</a>');
            if (text.length === repl.length) return;
            var span = node.ownerDocument.createElement("span");
            span["innerHTML"] = repl;
            node.replaceWith(span);
        };
        var setLink = (node, text) => {
            if (!(text = node.textContent)) return;
            text = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
            var repl = text.replace(url_regexp, '$1<a href="$2" target="_blank" class="add__TextToLink">$2</a>');
            if (text.length === repl.length) return setEmail(node, text);
            var span = node.ownerDocument.createElement("span");
            span["innerHTML"] = repl;
            for (let el of span.querySelectorAll("a.add__TextToLink[href]:not([href^='http']):not([href^='ftp'])"))
                el.setAttribute("href", `http://${el.getAttribute("href")}`);
            node.replaceWith(span);
            var txtnode = Node.TEXT_NODE;
            for (let child of span.childNodes) {
                let txt;
                if (child.nodeType === txtnode && (txt = child.textContent)) setEmail(child, txt);
            }
        };
        var getWalker = elem => {
            var doc = elem.ownerDocument, reject = NodeFilter.FILTER_REJECT, skip = NodeFilter.FILTER_SKIP, accept = NodeFilter.FILTER_ACCEPT, txtnode = Node.TEXT_NODE;
            var walker = doc.createTreeWalker(elem, NodeFilter.SHOW_ALL, {
                acceptNode(node) {
                    if (lazy.excludedTags.has(node.localName)) return reject;
                    if (node.nodeType !== txtnode && !node.shadowRoot) return skip;
                    return accept;
                }
            }, false);
            while (walker.nextNode()) {
                let currnode = walker.currentNode;
                if (!currnode.shadowRoot) elList.push(currnode);
                else getWalker(currnode.shadowRoot);
            }
        };
        getWalker(this.document.body);
        for (let el of elList)
            setLink(el);
        elList = [];
        this.running = false;
    }
    copyAllLinks() {
        if (this.running || !this.document?.body) return null;
        this.running = true;
        var links = "", count = 0, elList = [];
        var getWalker = elem => {
            var doc = elem.ownerDocument, skip = NodeFilter.FILTER_SKIP, accept = NodeFilter.FILTER_ACCEPT;
            var walker = doc.createTreeWalker(elem, NodeFilter.SHOW_ELEMENT, {
                acceptNode(node) {
                    if (!node.matches(":any-link:not([href='#']):not([href^='javascript'])") && !node.shadowRoot)
                        return skip;
                    return accept;
                }
            }, false);
            while (walker.nextNode()) {
                let currnode = walker.currentNode;
                if (!currnode.shadowRoot) elList.push(currnode);
                else getWalker(currnode.shadowRoot);
            }
        };
        getWalker(this.document.documentElement);
        for (let f of elList) {
            let uri = f.href;
            if (!uri) continue;
            try {
                uri = Services.io.newURI(uri).displaySpec;
            } catch { }
            links += `${uri}\n`;
            count += 1;
        }
        elList = [];
        this.running = false;
        return { links, count };
    }
    linkPointerEvents(state) {
        if (this.running || !this.document?.body) return;
        this.running = true;
        var win = this.document.defaultView;
        try {
            if (state) win.windowUtils.loadSheetUsingURIString(lazy.linkPointerEvtStyle, win.windowUtils.USER_SHEET);
            else win.windowUtils.removeSheetUsingURIString(lazy.linkPointerEvtStyle, win.windowUtils.USER_SHEET);
            this.linkPointerEvtStyleEnable = state;
        } catch { }
        this.running = false;
    }
}

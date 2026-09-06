/**
@UCF @param {"prop":"JsAllChrome.load","ucfobj":true,"urlregxp":"^chrome:\\/\\/browser\\/content\\/places\\/(?:bookmarksSidebar|historySidebar|places)\\.xhtml","disable":true} @UCF
@UCF @param {"prop":"JsContent.pageshow","ucfobj":true,"urlregxp":"^chrome:\\/\\/browser\\/content\\/places\\/(?:bookmarksSidebar|historySidebar|places)\\.xhtml","disable":true} @UCF
*/
(async (
    id = "ucf-toggle-folders-scroll-position-tree",
    tooltipText = "L: Close all top level folders\n(Ctrl|Shift)+L|M: Close all folders\nR: Open all folders",
    image = "chrome://ucf-url/content/data/toggleFoldersTree/icon.svg",
    scrollPosition = true,
    scrollPositionPref = "ucf.toggle_folders.position",
) => ({
    timer: null,
    JsAllChrome_load() {
        var toolbar = document.querySelector("hbox#sidebar-search-container, toolbar#placesToolbar");
        var tree = this.tree = document.querySelector("tree.sidebar-placesTree, tree.placesTree");
        if (!toolbar || !tree) return;
        var btn = document.createElementNS("http://www.w3.org/1999/xhtml", "html:moz-button");
        btn.id = id;
        btn.type = "icon";
        btn.size = "default";
        btn.iconSrc = image;
        btn.tooltipText = tooltipText;
        btn.style.setProperty("--button-outer-padding-inline-end", "4px");
        btn.style.setProperty("--button-border", "none");
        btn.onclick = btn.onauxclick = this.toggle.bind(this);
        Object.defineProperty(btn, "hidden", {});
        Object.defineProperty(btn, "disabled", {});
        toolbar.prepend(btn);
        if (!scrollPosition || !(this.searchbox = document.querySelector("#search-box, #searchFilter"))) return scrollPosition = false;
        setUnloadMap(Symbol(id), this.destructor, this);
        this.treeId = tree.id;
        tree.addEventListener("TreeViewChanged", this);
        var treeBody = this.treeBody = tree.treeBody;
        treeBody.addEventListener("scroll", this);
        treeBody.addEventListener("underflow", this);
        treeBody.addEventListener("overflow", this);
        this.searchbox.addEventListener("MozInputSearch:search", this);
    },
    JsContent_pageshow() {
        this.JsAllChrome_load();
    },
    handleEvent(e) {
        this[e.type](e);
    },
    underflow() {
        this._underflow = true;
    },
    overflow() {
        this._underflow = false;
    },
    scroll() {
        clearTimeout(this.timer);
        if (this._underflow) return;
        this.timer = setTimeout(() => {
            var { searchbox, tree, treeId } = this;
            if (!searchbox.value) Services.prefs.setIntPref(`${scrollPositionPref}_${treeId}`, tree.getFirstVisibleRow());
        }, 500);
    },
    select(e) {
        e.stopImmediatePropagation();
    },
    TreeViewChanged() {
        this.scrollPosition();
    },
    "MozInputSearch:search"() {
        this.scrollPosition();
    },
    scrollPosition() {
        var { searchbox, tree, treeId } = this;
        if (!searchbox.value) tree.scrollToRow(Services.prefs.getIntPref(`${scrollPositionPref}_${treeId}`, 0));
    },
    toggle(e) {
        if (this.start) return;
        var { view } = this.tree;
        if (view._isPlainContainer(view._rootNode)) return;
        this.start = true;
        var close = e.button < 2;
        var closeAll = e.button === 1 || e.button === 0 && (e.getModifierState("Control") || e.shiftKey);
        var index = view.rowCount, open, roots, sel;
        if (close) {
            sel = view.selection;
            let { count } = sel;
            if (count) {
                roots = new Set();
                let currRoot;
                for (let ind = 0; ind < index; ind++) {
                    let node = view._rows[ind];
                    if (node.indentLevel === 0) currRoot = node;
                    if (sel.isSelected(ind)) {
                        roots.add(currRoot);
                        if (!--count) break;
                    }
                }
            }
            this.tree.addEventListener("select", this, true);
        } else open = true;
        if (closeAll) for (let ind = index; ind >= 0; ind--) view.isContainer(ind) && view.isContainerOpen(ind) && view.toggleOpenState(ind);
        else {
            let TFS = Ci.nsINavHistoryResultNode.RESULT_TYPE_FOLDER_SHORTCUT;
            for (let ind = 0; ind < index; ind++) {
                if (!view.isContainer(ind) || view.isContainerOpen(ind) !== close) continue;
                if (open) {
                    let node = view._rows[ind];
                    if (node.type === TFS && node.indentLevel && !PlacesUtils.bookmarks.isVirtualRootItem(node.bookmarkGuid)) continue;
                }
                view.toggleOpenState(ind);
                index = view.rowCount;
            }
        }
        if (roots) {
            sel.clearSelection();
            for (let ind = 0, len = view.rowCount; ind < len; ind++)
                roots.has(view._rows[ind]) && sel.rangedSelect(ind, ind, true);
            roots.clear();
        }
        if (close) this.tree.removeEventListener("select", this, true);
        else if (scrollPosition) this.scrollPosition();
        this.start = false;
    },
    destructor() {
        var { tree, treeBody, searchbox } = this;
        tree.removeEventListener("TreeViewChanged", this);
        treeBody.removeEventListener("scroll", this);
        treeBody.removeEventListener("underflow", this);
        treeBody.removeEventListener("overflow", this);
        searchbox.removeEventListener("MozInputSearch:search", this);
    },
})[getProp]())();

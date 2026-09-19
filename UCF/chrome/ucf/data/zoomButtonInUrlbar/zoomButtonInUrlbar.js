/**
@UCF @param {"prop":"JsBackground","disable":true} @UCF
*/
(async (
    id = "ucf-zoom-button",
    fullZoomPref = "browser.zoom.full",
    siteSpecificPref = "browser.zoom.siteSpecific",
    zoomBtnId = "urlbar-zoom-button",
    // -- User Settings -->
    title = "Zoom Button",
    tooltip = `L: Toggle ${fullZoomPref}\nM: Toggle ${siteSpecificPref}\nM-wheel: Change Zoom\nShift+M-wheel: Change default Zoom\nR: Reset Zoom\nShift+R: Reset default Zoom`,
    selector = "#star-button-box",
    badged = true,
    hideZoomBtn = true,
    // <-- User Settings --
) => PageActions.addAction(new PageActions.Action({
    id, title, tooltip,
    urlbarIDOverride: id,
    _urlbarNodeInMarkup: true,
    pinnedToUrlbar: true,
    onBeforePlacedInWindow(win) {
        var { document } = win;
        var node = document.querySelector(`#page-action-buttons > ${selector}`);
        if (!node) return;
        var pabtns = node.parentElement;
        pabtns.setAttribute("hideZoomBtn", hideZoomBtn);
        var btn = document.createXULElement("toolbarbutton");
        btn.id = id;
        btn.tooltipText = tooltip;
        btn.toggleAttribute("context", true);
        btn.setAttribute("label", `${Math.round(win.ZoomManager.zoom * 100)}%`);
        if (badged) {
            btn.setAttribute("badged", "true");
            win.ZoomUI.getGlobalValue().then(val => btn.setAttribute("badge", Math.round(val * 100)));
            let { onContentPrefSet } = win.FullZoom;
            win.FullZoom.onContentPrefSet = function (group, name, val) {
                if (!group) btn.setAttribute("badge", Math.round(val * 100));
                return onContentPrefSet.apply(this, arguments);
            };
        }
        btn.setAttribute("useFullZoom", win.ZoomManager.useFullZoom);
        btn.setAttribute("siteSpecific", win.FullZoom.siteSpecific);
        var uzbtn = node.id !== zoomBtnId ? pabtns.querySelector(`#${zoomBtnId}`) : node;
        var desc = Object.getOwnPropertyDescriptor(XULElement.prototype, "hidden");
        var { set } = desc;
        desc.set = async val => {
            btn.setAttribute("label", `${Math.round(win.ZoomManager.zoom * 100)}%`);
            set.call(uzbtn, val);
        };
        Object.defineProperty(uzbtn, "hidden", desc);
        var { observe } = win.FullZoom;
        win.FullZoom.observe = function (s, t, data) {
            switch (data) {
                case fullZoomPref:
                    btn.setAttribute("useFullZoom", Services.prefs.getBoolPref(fullZoomPref));
                    break;
                case siteSpecificPref:
                    btn.setAttribute("siteSpecific", Services.prefs.getBoolPref(siteSpecificPref));
            }
            return observe.apply(this, arguments);
        };
        btn.onclick = e => {
            e.stopPropagation();
            switch (e.button) {
                case 0:
                    win.ZoomManager.toggleZoom();
                    break;
                case 1:
                    Services.prefs.setBoolPref(siteSpecificPref, !Services.prefs.getBoolPref(siteSpecificPref));
                    break;
                case 2:
                    if (e.shiftKey) win.FullZoom._cps2.setGlobal(win.FullZoom.name, 1, Cu.createLoadContext());
                    win.FullZoom.reset();
            }
        };
        btn.onwheel = e => {
            e.stopPropagation();
            if (e.deltaY > 0) win.FullZoom.reduce();
            else win.FullZoom.enlarge();
            if (e.shiftKey) win.FullZoom._cps2.setGlobal(win.FullZoom.name, win.ZoomManager.zoom, Cu.createLoadContext());
        };
        node.after(btn);
    },
})))();

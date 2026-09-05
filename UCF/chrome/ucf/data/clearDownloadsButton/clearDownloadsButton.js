/**
@UCF @param {"prop":"JsChrome.load","ucfobj":true,"disable":true} @UCF
*/
(async () => ({
    init() {
        var panel = this.panel = DownloadsPanel.panel;
        if (!panel) return;
        setUnloadMap(Symbol("cleardownloadsbutton"), this.destructor, this);
        panel.addEventListener("popupshowing", this);
    },
    destructor() {
        this.panel.removeEventListener("popupshowing", this);
        if (this.list) this.panel.removeEventListener("popuphiding", this, { once: true });
        this.btn?.removeEventListener("command", this);
    },
    handleEvent(e) {
        var dh = DownloadsView.downloadsHistory;
        var btn = this.btn = document.createXULElement("button");
        btn.id = "ucf-clear-downloads-btn";
        btn.className = "downloadsPanelFooterButton subviewbutton panel-subview-footer-button toolbarbutton-1";
        btn.disabled = true;
        dh.after(btn);
        btn.addEventListener("command", this);
        (this.handleEvent = this.hEvent).call(this, e);
    },
    hEvent(e) {
        this[e.type](e);
    },
    command(e) {
        DownloadsCommon.getData(window, true).removeFinished();
        PlacesUtils.history.removeVisitsByFilter({
            transition: PlacesUtils.history.TRANSITIONS.DOWNLOAD,
        }).catch(Cu.reportError);
        this.btn.disabled = true;
    },
    async setbutton() {
        var { _downloads } = await DownloadsCommon.getData(window, true)._promiseList;
        for (let { stopped, canceled, hasPartialData } of _downloads) {
            if (stopped && !(canceled && hasPartialData)) {
                this.btn.disabled = false;
                return;
            }
        }
        this.btn.disabled = true;
    },
    popupshowing(e) {
        if (e.target != this.panel) return;
        this.setbutton();
        (this.list = DownloadsCommon.getData(window, true)).addView(this);
        this.panel.addEventListener("popuphiding", this, { once: true });
    },
    popuphiding(e) {
        if (e.target != this.panel) return;
        this.list.removeView(this);
        this.list = null;
    },
    onDownloadChanged() {
        this.setbutton();
    },
    onDownloadRemoved() {
        if (!this.btn.disabled) this.setbutton();
    },
}).init())();

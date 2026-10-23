/**
@UCF @param {"prop":"JsChrome.load","ucfobj":true} @UCF
*/
({
    tid: null,
    async init() {
        setUnloadMap(Symbol("specialwidgets"), this.destructor, this);
        gNavToolbox.addEventListener("customizationready", this);
    },
    handleEvent(e) {
        this[e.type](e);
    },
    customizationchange() {
        clearTimeout(this.tid);
        this.tid = setTimeout(() => {
            this.createSpecialWidgets();
        }, 1000);
    },
    command(e) {
        switch (e.target.id) {
            case "customization-reset-button":
            case "customization-undo-reset-button":
                this.maybeCreateSW = true;
                break;
        }
    },
    customizationready() {
        this.maybeCreateSW = true;
        this.createSpecialWidgets();
        (this.custContainer = document.querySelector("#customization-container")).addEventListener("command", this);
        setUnloadMap(this.symbol = Symbol(), this.removeListeners, this);
        gNavToolbox.addEventListener("customizationchange", this);
        gNavToolbox.addEventListener("customizationending", this);
    },
    customizationending() {
        getDelUnloadMap(this.symbol, true);
        this.maybeCreateSW = false;
        this.removeListeners();
    },
    removeListeners() {
        this.custContainer.removeEventListener("command", this);
        gNavToolbox.removeEventListener("customizationchange", this);
        gNavToolbox.removeEventListener("customizationending", this);
    },
    createSpecialWidgets() {
        if (!this.maybeCreateSW) return;
        this.maybeCreateSW = false;
        let fragment = document.createDocumentFragment();
        if (this.notSW("spring"))
            fragment.append(gCustomizeMode.wrapToolbarItem(CustomizableUI.createSpecialWidget("spring", document), "palette"));
        if (this.notSW("spacer"))
            fragment.append(gCustomizeMode.wrapToolbarItem(CustomizableUI.createSpecialWidget("spacer", document), "palette"));
        if (this.notSW("separator"))
            fragment.append(gCustomizeMode.wrapToolbarItem(CustomizableUI.createSpecialWidget("separator", document), "palette"));
        gCustomizeMode.visiblePalette.append(fragment);
    },
    notSW(string) {
        return !(gCustomizeMode.visiblePalette.querySelector(`toolbar${string}[id^="customizableui-special-${string}"]`));
    },
    destructor() {
        gNavToolbox.removeEventListener("customizationready", this);
    },
}).init();

/**
@UCF @param {"prop":"JsChrome.load","ucfobj":true,"disable":true} @UCF
*/
(async (
    btnID = "ucf-appmenu-restart-button",
    muimID = "ucf-menu-restart-Item",
    icon = "chrome://global/skin/icons/reload.svg",
) => ({
    async init() {
        var abtn = document.querySelector("template#appMenu-viewCache")?.content.querySelector("#appMenu-quit-button2");
        var [ura] = await UcfPrefs.getLocalization("ucf/locales", "main.ftl").formatMessages(["ucf-restart-app"]);
        setUnloadMap(Symbol("menusrestartitems"), this.destructor, this);
        if (abtn) {
            let frag = MozXULElement.parseXULToFragment(`<toolbarbutton/>`);
            let btn = this.btn = frag.firstElementChild;
            btn.id = btnID;
            btn.className = "subviewbutton";
            btn.setAttribute("label", ura.value);
            btn.setAttribute("tooltiptext", `${ura.attributes[0].value}\n${ura.attributes[1].value}\n${ura.attributes[2].value}`);
            btn.setAttribute("shortcut", "Ctrl+Alt+Q");
            btn.toggleAttribute("context", true);
            btn.addEventListener("click", this);
            if (icon)
                btn.style.cssText = `list-style-image:url("${icon}");-moz-context-properties:fill;fill:light-dark(oklch(60% 0.2 57), oklch(80% 0.2 57));`;
            abtn.before(frag);
        }
        var aftermuim = document.querySelector("#menu_FilePopup #menu_FileQuitItem");
        if (aftermuim) {
            let muim = this.muim = document.createXULElement("menuitem");
            muim.id = muimID;
            muim.className = "menuitem-iconic";
            muim.setAttribute("label", ura.value);
            muim.setAttribute("tooltiptext", `${ura.attributes[0].value}\n${ura.attributes[1].value}\n${ura.attributes[2].value}`);
            muim.setAttribute("acceltext", "Ctrl+Alt+Q");
            muim.toggleAttribute("context", true);
            muim.addEventListener("click", this);
            if (icon)
                muim.style.cssText = `--menuitem-icon:url("${icon}");-moz-context-properties:fill;fill:light-dark(oklch(60% 0.2 57), oklch(80% 0.2 57));`;
            aftermuim.before(muim);
        }
        window.addEventListener("keydown", this);
    },
    click(e) {
        switch (e.button) {
            case 0:
                this.restart();
                break;
            case 1:
                e.view.safeModeRestart();
                break;
            case 2:
                this.restart(true);
                break;
        }
    },
    keydown(e) {
        if (e.code == "KeyQ" && e.getModifierState("Control") && e.altKey) this.restart();
    },
    restart(nocache = false) {
        var cancelQuit = Cc["@mozilla.org/supports-PRBool;1"].createInstance(Ci.nsISupportsPRBool);
        Services.obs.notifyObservers(cancelQuit, "quit-application-requested", "restart");
        if (cancelQuit.data) return false;
        if (nocache) Services.appinfo.invalidateCachesOnRestart();
        var { startup } = Services;
        startup.quit(startup.eAttemptQuit | startup.eRestart);
    },
    handleEvent(e) {
        this[e.type](e);
    },
    destructor() {
        window.removeEventListener("keydown", this);
        this.btn?.removeEventListener("click", this);
        this.muim?.removeEventListener("click", this);
    },
}).init())();

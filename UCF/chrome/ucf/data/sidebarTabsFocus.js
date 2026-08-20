/**
@UCF @param {"prop":"JsChrome.load","ucfobj":true,"disable":true} @UCF
*/
(async (
    delay = 150,
) => ({
    tid: null,
    init() {
        var tabs = this.tabs = document.querySelector("#st_tabs");
        if (!tabs) return;
        setUnloadMap(Symbol(), this.destructor, this);
        this.onMouseIn = this.onMouseIn.bind(this);
        tabs.addEventListener("mouseover", this.onMouseIn);
        this.onMouseOutDown = this.onMouseOutDown.bind(this);
        tabs.addEventListener("mouseout", this.onMouseOutDown);
        tabs.addEventListener("mousedown", this.onMouseOutDown);
    },
    destructor() {
        var { tabs } = this;
        tabs.removeEventListener("mouseover", this.onMouseIn);
        tabs.removeEventListener("mouseout", this.onMouseOutDown);
        tabs.removeEventListener("mousedown", this.onMouseOutDown);
    },
    onMouseIn(e) {
        this.tid = setTimeout(() => e.target.closest?.("tab:not([selected])")?.on_mousedown({ button: 0 }), delay);
    },
    onMouseOutDown() {
        clearTimeout(this.tid);
    },
}).init())();

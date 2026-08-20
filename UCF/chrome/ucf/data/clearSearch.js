/**
@UCF @param {"prop":"JsChrome.load","ucfobj":true,"disable":true} @UCF
*/
(async (
    timeout = 10000,
) => ({
    tid: null,
    init() {
        var sc = this.sc = document.querySelector("#search-container") || gNavToolbox.palette.querySelector("#search-container");
        if (!sc) return;
        setUnloadMap(Symbol(), this.destructor, this);
        sc.addEventListener("input", this);
        sc.addEventListener("ValueChange", this);
    },
    handleEvent({ target }) {
        clearTimeout(this.tid);
        if (!target.value) return;
        this.tid = setTimeout(() => {
            target.value = "";
            target.blur();
        }, timeout);
    },
    destructor() {
        this.sc.removeEventListener("input", this);
        this.sc.removeEventListener("ValueChange", this);
    },
}).init())();

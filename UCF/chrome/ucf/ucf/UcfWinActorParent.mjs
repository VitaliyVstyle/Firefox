const lazy = {}
export class UcfWinActorParent extends JSWindowActorParent {
    receiveMessage() {
        return lazy.prefs ??= this.browsingContext.top.embedderElement.documentGlobal.UcfPrefs._CssJsContent;
    }
}

ChromeUtils.defineLazyGetter(this, "FilePath", () => Components.Constructor("@mozilla.org/file/local;1", Ci.nsIFile, "initWithPath"));
ChromeUtils.defineLazyGetter(this, "ProcessInit", () => Components.Constructor("@mozilla.org/process/util;1", Ci.nsIProcess, "init"));

this.AsyncRunApp = class extends ExtensionAPI {
    getAPI({extension}) {
        return {
            AsyncRunApp: {
                get ProfD() {
                    delete this.ProfD;
                    return this.ProfD = Services.dirsvc.get("ProfD", Ci.nsIFile).path;
                },
                get DfltDwnld() {
                    delete this.DfltDwnld;
                    try {
                        return this.DfltDwnld = Services.dirsvc.get("DfltDwnld", Ci.nsIFile).path;
                    } catch {
                        return this.DfltDwnld = Services.dirsvc.get("Desk", Ci.nsIFile).path;
                    }
                },
                async runApp({path, args = "", clipboard, lastfpdir}, info, tab) {
                    try {
                        let file = new FilePath(path);
                        if (!file.exists()) return;
                        if (file.isExecutable()) {
                            let process = new ProcessInit(file);
                            let fpdir;
                            let URL = !clipboard === !(info.modifiers.includes("Shift") || info.button === 1) ? this.getURL(info) : this.readFromClipboard(tab.windowId);
                            if (args = args.trim()) {
                                let quot = /^"/.test(args);
                                let temp = [];
                                for (let frag of args.split(/\s*"\s*/)) {
                                    if (!frag) continue;
                                    if (!quot) frag = frag.split(/\s+/);
                                    else frag = [frag];
                                    quot = !quot;
                                    temp = temp.concat(frag);
                                }
                                args = temp;
                                for (let [ind, sp] of args.entries()) {
                                    sp = sp.replace(/%quot%/g, '"').replace(/%ProfD%/g, () => this.ProfD).replace(/%OpenURL%/g, URL);
                                    if (/%FilePicker%/.test(sp)) {
                                        fpdir = await this.filePicker(tab.windowId, extension.localeData.localizeMessage("filePicker"), "modeGetFolder", lastfpdir || this.DfltDwnld);
                                        if (!fpdir) throw "Cancel!";
                                        sp = sp.replace(/%FilePicker%/g, fpdir);
                                    }
                                    if (/%FilePickerR%/.test(sp)) {
                                        if (info.button === 2) {
                                            fpdir = await this.filePicker(tab.windowId, extension.localeData.localizeMessage("filePicker"), "modeGetFolder", lastfpdir || this.DfltDwnld);
                                            if (!fpdir) throw "Cancel!";
                                        }
                                        sp = sp.replace(/%FilePickerR%/g, fpdir || lastfpdir || this.DfltDwnld);
                                    }
                                    if (/%Prompt\(.*?\)%/.test(sp))
                                        sp = sp.replace(/%Prompt\(.*?\)%/g, match => {
                                            let newName = { value: match.match(/%Prompt\((.*?)\)%/)[1] };
                                            if (!Services.prompt.prompt(extension.windowManager.get(tab.windowId).window, extension.localeData.localizeMessage("Prompt"), extension.localeData.localizeMessage("Prompt2"), newName, null, {})) throw "Cancel!";
                                            return newName.value;
                                        });
                                    args[ind] = sp;
                                }
                            } else args = [URL];
                            process.runwAsync(args, args.length);
                            if (fpdir && (lastfpdir !== fpdir)) return fpdir;
                        } else file.launch();
                    } catch (e) {console.warn(e);}
                },
                filePicker(winid, str, mode = "modeOpen", lastfpdir) {
                    return new Promise(resolve => {
                        var fp = Cc["@mozilla.org/filepicker;1"].createInstance(Ci.nsIFilePicker);
                        try {
                            fp.init(extension.windowManager.get(winid).window.browsingContext, str, fp[mode]);
                        } catch {
                            fp.init(extension.windowManager.get(winid).window, str, fp[mode]);
                        }
                        if (lastfpdir) {
                            let dir = new FilePath(lastfpdir);
                            if (dir.exists() && dir.isDirectory()) fp.displayDirectory = dir;
                        }
                        fp.open(res => resolve(res === fp.returnOK ? fp.file.path : ""));
                    });
                },
                toFileURI(str) {
                    try {
                        return PathUtils.toFileURI(str);
                    } catch {
                        return ".unknown";
                    }
                },
                getURL(info, seltext) {
                    if ((seltext = info.selectionText?.trim()) && /^(?:https?|ftp):/i.test(seltext)) return seltext;
                    return info.linkUrl || info.pageUrl;
                },
                readFromClipboard(winid) {
                    var trans = Cc["@mozilla.org/widget/transferable;1"].createInstance(Ci.nsITransferable);
                    trans.init(extension.windowManager.get(winid).window.docShell.QueryInterface(Ci.nsILoadContext));
                    trans.addDataFlavor("text/plain");
                    var {clipboard} = Services, data = {}, url = "";
                    clipboard.getData(trans, clipboard.kGlobalClipboard);
                    trans.getTransferData("text/plain", data);
                    if (data.value) url = data.value.QueryInterface(Ci.nsISupportsString).data.trim();
                    if (/^(?:https?|ftp):/.test(url)) return url;
                    throw "No address on clipboard!";
                },
            }
        };
    }
};

import * as vscode from "vscode";
import { Tourstop } from "./tour";

export class TourstopTreeItem extends vscode.TreeItem {
    public tourstop: Tourstop;

    constructor(tourstop: Tourstop) {
        super(tourstop.title);
        this.command = {
            arguments: [tourstop],
            command: "extension.gotoTourstop",
            title: "lol what?", // TODO: what does this option actually do?
        };
        this.tooltip = tourstop.message;
        this.tourstop = tourstop;
    }
}

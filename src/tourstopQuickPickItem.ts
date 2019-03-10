import * as vscode from "vscode";
import { Tourstop } from "./tour";

export class TourstopQuickPickItem implements vscode.QuickPickItem {
    public tourstop: Tourstop;

    public label: string;
    public detail: string;
    public description: string;

    constructor(tourstop: Tourstop) {
        this.tourstop = tourstop;
        this.label = tourstop.title;
        this.detail = tourstop.message;

        const filename = tourstop.filePath.split(/[/\\]/).pop();
        this.description = `${filename}, line ${tourstop.position.row}`;
    }
}

import * as vscode from "vscode";
import { Tour, Tourstop } from "./tour";

class TourstopQuickPickItem implements vscode.QuickPickItem {
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

export async function quickPickTourstop(tour: Tour): Promise<Tourstop | undefined> {
    const quickPickItems = tour.tourstops.map((stop) => new TourstopQuickPickItem(stop));
    const item = await vscode.window.showQuickPick<TourstopQuickPickItem>(quickPickItems, {canPickMany: false});
    return item ? item.tourstop : undefined;
}

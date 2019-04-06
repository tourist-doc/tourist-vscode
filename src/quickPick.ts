import { AbsoluteTourStop, BrokenTourStop, isNotBroken, Tour } from "tourist";
import * as vscode from "vscode";

class TourstopQuickPickItem implements vscode.QuickPickItem {
  public tourstop: AbsoluteTourStop | BrokenTourStop;

  public label: string;
  public detail: string;
  public description: string;

  constructor(tourstop: AbsoluteTourStop | BrokenTourStop) {
    this.tourstop = tourstop;
    this.label = tourstop.title;
    this.detail = tourstop.body || "";

    if (isNotBroken(tourstop)) {
        const filename = tourstop.absPath
        ? tourstop.absPath.split(/[/\\]/).pop()
        : "";
        this.description = `${filename}, line ${tourstop.line}`;
    } else {
        this.description = "";
    }
  }
}

export async function quickPickTourstop(
  tour: Tour,
): Promise<AbsoluteTourStop | BrokenTourStop | undefined> {
  const quickPickItems = tour.stops.map(
    (stop) => new TourstopQuickPickItem(stop),
  );
  const item = await vscode.window.showQuickPick<TourstopQuickPickItem>(
    quickPickItems,
    { canPickMany: false },
  );
  return item ? item.tourstop : undefined;
}

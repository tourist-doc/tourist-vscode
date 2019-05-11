import * as vscode from "vscode";

import {
  AbsoluteTourStop,
  BrokenTourStop,
  isNotBroken,
  Tour,
  TourFile,
} from "tourist";
import { Globals } from "./globals";
import { Util } from "./util";

/**
 * Gets a file path to a TourFile from the user and returns it
 */
export async function getTourFileURI(): Promise<vscode.Uri | undefined> {
  const uris = await vscode.window.showOpenDialog({
    openLabel: "Start tour",
    canSelectMany: false,
    filters: {
      Tours: ["tour"],
    },
  });

  if (uris) {
    return uris[0];
  }

  return undefined;
}

/**
 * Controls how tourstops are displayed in QuickPicks
 */
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

/**
 * Presents a QuickPick of tourstops to the user, returning the one she picked, or `undefined`.
 * @param tour The tour from which to pick a stop
 */
export async function quickPickTourstop(
  tour?: Tour,
): Promise<AbsoluteTourStop | BrokenTourStop | undefined> {
  if (!tour) {
    if (Globals.tourState) {
      tour = Globals.tourState.tour;
    } else {
      return undefined;
    }
  }

  const quickPickItems = tour.stops.map(
    (stop) => new TourstopQuickPickItem(stop),
  );
  const item = await vscode.window.showQuickPick<TourstopQuickPickItem>(
    quickPickItems,
    { canPickMany: false },
  );
  return item ? item.tourstop : undefined;
}

/**
 * Controls how TourFiles are displayed in QuickPicks
 */
class TourFileQuickPickItem implements vscode.QuickPickItem {
  public tf: TourFile;
  public path: string;

  public label: string;
  public detail: string;
  public description: string;

  constructor(tf: TourFile, path: string) {
    this.tf = tf;
    this.path = path;
    this.label = tf.title;
    this.detail = "";
    this.description = vscode.workspace.asRelativePath(path);
  }
}

/**
 * Presents a QuickPick of tourstops to the user, returning the one she picked, or `undefined`.
 * @param tour The tour from which to pick a stop
 */
export async function quickPickTourFile(): Promise<TourFile | undefined> {
  const tourFiles = await Util.getWorkspaceTours();
  const quickPickItems = tourFiles.map(
    ([uri, tf]) => new TourFileQuickPickItem(tf, uri.fsPath),
  );
  const item = await vscode.window.showQuickPick<TourFileQuickPickItem>(
    quickPickItems,
    { canPickMany: false },
  );
  return item ? item.tf : undefined;
}

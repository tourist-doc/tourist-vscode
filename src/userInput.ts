import { AbsoluteTourStop, BrokenTourStop, isNotBroken, Tour } from "tourist";
import * as vscode from "vscode";

import * as globals from "./globals";
import { findWithUri, TourFile } from "./tourFile";

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
    if (globals.tourState) {
      tour = globals.tourState.tour;
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

  public label: string;
  public detail: string;
  public description: string;

  constructor(tf: TourFile) {
    this.tf = tf;
    this.label = tf.title;
    this.detail = "";
    this.description = vscode.workspace.asRelativePath(tf.path);
  }
}

/**
 * Gets a file path to a TourFile from the user and returns it
 */
async function getTourFileURI(): Promise<vscode.Uri | undefined> {
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
 * Presents a QuickPick of tourstops to the user, returning the one she picked, or `undefined`.
 * @param tour The tour from which to pick a stop
 */
export async function quickPickTourFile(): Promise<TourFile | undefined> {
  const tourFiles = await globals.knownTours();
  const fromFile: vscode.QuickPickItem = { label: "Open .tour file" };
  const quickPickItems = tourFiles
    .map((tf) => new TourFileQuickPickItem(tf) as vscode.QuickPickItem)
    .concat([fromFile]);

  const item = await vscode.window.showQuickPick<vscode.QuickPickItem>(
    quickPickItems,
    { canPickMany: false },
  );

  if (item instanceof TourFileQuickPickItem) {
    return item.tf;
  } else if (item) {
    const uri = await getTourFileURI();
    if (uri) {
      return findWithUri(uri);
    }
  }

  return undefined;
}

export async function quickPickRepoName(): Promise<string | undefined> {
  const items: vscode.QuickPickItem[] = [];
  // tslint:disable-next-line: forin
  for (const repoName in globals.tourist.config) {
    items.push({
      label: repoName,
      description: globals.tourist.config[repoName],
    });
  }
  const item = await vscode.window.showQuickPick(items);
  return item ? item.label : undefined;
}

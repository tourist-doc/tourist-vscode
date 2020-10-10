import * as vscode from "vscode";

import { newTour } from "./commands";
import * as globals from "./globals";
import { StopId, TourId } from "./touristClient";

/**
 * Controls how tourstops are displayed in QuickPicks
 */
class TourstopQuickPickItem implements vscode.QuickPickItem {
  public tourstop: StopId;

  public label: string;
  public detail: string;

  constructor(tourstop: StopId, title: string) {
    this.tourstop = tourstop;
    this.label = title;
    this.detail = "";

    // if (isNotBroken(tourstop)) {
    //   const filename = tourstop.absPath
    //     ? tourstop.absPath.split(/[/\\]/).pop()
    //     : "";
    //   this.description = `${filename}, line ${tourstop.line}`;
    // } else {
    //   this.description = "";
    // }
  }
}

/**
 * Presents a QuickPick of tourstops to the user, returning the one she picked, or `undefined`.
 * @param tour The tour from which to pick a stop
 */
export async function quickPickTourstop(
  tour?: TourId,
): Promise<StopId | undefined> {
  if (!tour) {
    if (globals.tourState) {
      tour = globals.tourState.tourId;
    } else {
      return undefined;
    }
  }

  const quickPickItems = (await globals.touristClient.viewTour(tour)).stops.map(
    ([id, title]) => new TourstopQuickPickItem(id, title),
  );
  const item = await vscode.window.showQuickPick<TourstopQuickPickItem>(
    quickPickItems,
    { canPickMany: false, placeHolder: "Tour stop" },
  );
  return item ? item.tourstop : undefined;
}

/**
 * Controls how TourFiles are displayed in QuickPicks
 */
class TourFileQuickPickItem implements vscode.QuickPickItem {
  public tf: TourId;

  public label: string;
  public detail: string;

  constructor(tf: TourId) {
    this.tf = tf;
    this.label = "";
    this.detail = "";
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

  return uris ? uris[0] : undefined;
}

/**
 * Presents a QuickPick of tourstops to the user, returning the one she picked, or `undefined`.
 * @param tour The tour from which to pick a stop
 */
export async function quickPickTourFile(
  allowNew = true,
): Promise<TourId | undefined> {
  const tourFiles = await globals.knownTours();
  const fromFile: vscode.QuickPickItem = { label: "Open .tour file" };
  const newTourFile: vscode.QuickPickItem = { label: "Create new .tour file" };
  const quickPickItems = tourFiles
    .map((tf) => new TourFileQuickPickItem(tf) as vscode.QuickPickItem)
    .concat([fromFile]);
  if (allowNew) {
    quickPickItems.push(newTourFile);
  }
  const item = await vscode.window.showQuickPick<vscode.QuickPickItem>(
    quickPickItems,
    { canPickMany: false, placeHolder: "Tour file" },
  );

  if (item instanceof TourFileQuickPickItem) {
    return item.tf;
  } else if (item) {
    if (item.label === "Open .tour file") {
      // const uri = await getTourFileURI();
      // if (uri) {
      //   return findWithUri(uri);
      // }
      // TODO: re-implement
      return undefined;
    } else if (item.label === "Create new .tour file") {
      const uri = await getTourFileURI();
      if (uri) {
        return newTour(uri);
      }
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
  const item = await vscode.window.showQuickPick(items, {
    canPickMany: false,
    placeHolder: "Repository",
  });
  return item ? item.label : undefined;
}

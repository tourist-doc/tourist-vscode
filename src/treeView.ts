import { AbsoluteTourStop, BrokenTourStop } from "tourist";
import * as vscode from "vscode";

import { knownTours, tourState } from "./globals";
import { TourFile } from "./tourFile";
import {
  BackButtonTreeItem,
  TourFileTreeItem,
  TourStopTreeItem,
} from "./treeViewItems";

let treeView: vscode.TreeView<
  TourFile | AbsoluteTourStop | BrokenTourStop | "back"
>;

export function refresh() {
  if (tourState) {
    treeView = vscode.window.createTreeView<
      AbsoluteTourStop | BrokenTourStop | "back"
    >("touristView", {
      treeDataProvider: new TourStopTreeView(),
    });
    if (tourState.currentStop) {
      // In the TreeView, select the new tourstop
      treeView.reveal(tourState.currentStop);
    }
  } else {
    treeView = vscode.window.createTreeView<TourFile>("touristView", {
      treeDataProvider: new TourFileTreeView(),
    });
  }
}

/**
 * A wrapper around a list of TourFiles which provides data to the GUI
 */
export class TourFileTreeView implements vscode.TreeDataProvider<TourFile> {
  public onDidChangeTreeData?:
    | vscode.Event<TourFile | null | undefined>
    | undefined;

  public getTreeItem(tf: TourFile): vscode.TreeItem {
    return new TourFileTreeItem(tf);
  }

  public getChildren(tf?: TourFile | undefined): TourFile[] {
    if (tf === undefined) {
      return knownTours();
    } else {
      return [];
    }
  }

  public getParent(element: TourFile) {
    return undefined;
  }
}

/**
 * A wrapper around a list of TourStops which provides data to the GUI
 */
export class TourStopTreeView
  implements
    vscode.TreeDataProvider<AbsoluteTourStop | BrokenTourStop | "back"> {
  public onDidChangeTreeData?:
    | vscode.Event<
        AbsoluteTourStop | BrokenTourStop | "back" | null | undefined
      >
    | undefined;

  public getTreeItem(
    stop: AbsoluteTourStop | BrokenTourStop | "back",
  ): TourStopTreeItem | BackButtonTreeItem {
    if (stop === "back") {
      return new BackButtonTreeItem();
    } else {
      return new TourStopTreeItem(stop);
    }
  }

  public getChildren(
    stop?: AbsoluteTourStop | BrokenTourStop | "back" | undefined,
  ): Array<AbsoluteTourStop | BrokenTourStop | "back"> {
    if (stop === undefined && tourState && tourState.tour) {
      const back: Array<AbsoluteTourStop | BrokenTourStop | "back"> = ["back"];
      return back.concat(tourState.tour.stops);
    } else {
      return [];
    }
  }

  public getParent(element: AbsoluteTourStop | BrokenTourStop | "back") {
    return undefined;
  }
}

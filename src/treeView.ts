import { AbsoluteTourStop, BrokenTourStop } from "tourist";
import * as vscode from "vscode";

import { knownTours, tourState } from "./globals";
import { TourFile } from "./tourFile";
import { TourFileTreeItem, TourStopTreeItem } from "./treeViewItems";

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
  implements vscode.TreeDataProvider<AbsoluteTourStop | BrokenTourStop> {
  public onDidChangeTreeData?:
    | vscode.Event<AbsoluteTourStop | BrokenTourStop | null | undefined>
    | undefined;

  public getTreeItem(
    stop: AbsoluteTourStop | BrokenTourStop,
  ): TourStopTreeItem {
    return new TourStopTreeItem(stop);
  }

  public getChildren(
    stop?: AbsoluteTourStop | BrokenTourStop | undefined,
  ): Array<AbsoluteTourStop | BrokenTourStop> {
    if (stop === undefined && tourState && tourState.tour) {
      return tourState.tour.stops;
    } else {
      return [];
    }
  }

  public getParent(element: AbsoluteTourStop | BrokenTourStop) {
    return undefined;
  }
}

export function init() {
  tourProvider = new TourFileTreeView();
  stopProvider = new TourStopTreeView();
  refresh();
}

export function refresh() {
  // TODO: This can be done once, then updated via an event emitter
  tourTreeView = vscode.window.createTreeView<TourFile>("tourList", {
    treeDataProvider: tourProvider,
  });
  stopTreeView = vscode.window.createTreeView<
    AbsoluteTourStop | BrokenTourStop
  >("stopList", {
    treeDataProvider: stopProvider,
  });

  // In the TreeViews, select the current tour and tourstop
  if (tourState) {
    tourTreeView.reveal(tourState.tourFile);
    if (tourState.currentStop) {
      stopTreeView.reveal(tourState.currentStop);
    }
  }
}

let tourProvider: TourFileTreeView;
let stopProvider: TourStopTreeView;
let tourTreeView: vscode.TreeView<TourFile>;
let stopTreeView: vscode.TreeView<AbsoluteTourStop | BrokenTourStop>;

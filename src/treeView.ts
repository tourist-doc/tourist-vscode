import { AbsoluteTourStop, BrokenTourStop } from "tourist";
import * as vscode from "vscode";

import { knownTours, tourState } from "./globals";
import { TourFile } from "./tourFile";
import {
  RepoTreeItem,
  TourFileTreeItem,
  TourStopTreeItem,
} from "./treeViewItems";
import { RepoState } from "tourist/src/types";

/**
 * A wrapper around a list of TourFiles which provides data to the GUI
 */
class TourFileTreeView implements vscode.TreeDataProvider<TourFile> {
  public readonly onDidChangeTreeData: vscode.Event<null> =
    changeTreeViewEvent.event;

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
class TourStopTreeView
  implements vscode.TreeDataProvider<AbsoluteTourStop | BrokenTourStop> {
  public readonly onDidChangeTreeData: vscode.Event<null> =
    changeTreeViewEvent.event;

  public getTreeItem(
    stop: AbsoluteTourStop | BrokenTourStop,
  ): TourStopTreeItem {
    return new TourStopTreeItem(stop);
  }

  public getChildren(
    stop?: AbsoluteTourStop | BrokenTourStop | undefined,
  ): Array<AbsoluteTourStop | BrokenTourStop> {
    if (stop === undefined && tourState) {
      return tourState.tour.stops;
    } else {
      return [];
    }
  }

  public getParent(element: AbsoluteTourStop | BrokenTourStop) {
    return undefined;
  }
}

class RepoTreeView implements vscode.TreeDataProvider<RepoState> {
  public readonly onDidChangeTreeData: vscode.Event<null> =
    changeTreeViewEvent.event;

  public getTreeItem(repo: RepoState): RepoTreeItem {
    return new RepoTreeItem(repo);
  }

  public getChildren(repo?: RepoState | undefined): RepoState[] {
    if (repo === undefined && tourState) {
      return tourState.tourFile.repositories;
    } else {
      return [];
    }
  }

  public getParent(element: RepoState) {
    return undefined;
  }
}

/**
 * Called at extension startup
 */
export function init() {
  tourTreeView = vscode.window.createTreeView<TourFile>("tourList", {
    treeDataProvider: new TourFileTreeView(),
  });
  stopTreeView = vscode.window.createTreeView<
    AbsoluteTourStop | BrokenTourStop
  >("stopList", {
    treeDataProvider: new TourStopTreeView(),
  });
  vscode.window.createTreeView<RepoState>("repoList", {
    treeDataProvider: new RepoTreeView(),
  });

  refresh();
}

/**
 * Updates the TreeView in the GUI to reflect the current global state
 */
export function refresh() {
  changeTreeViewEvent.fire();
  // In the TreeViews, select the current tour and tourstop
  if (tourState) {
    tourTreeView.reveal(tourState.tourFile);
    if (tourState.currentStop) {
      stopTreeView.reveal(tourState.currentStop);
    }
  }
}

let tourTreeView: vscode.TreeView<TourFile>;
let stopTreeView: vscode.TreeView<AbsoluteTourStop | BrokenTourStop>;
const changeTreeViewEvent = new vscode.EventEmitter<null>();

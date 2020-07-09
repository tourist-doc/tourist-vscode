import * as vscode from "vscode";

import { touristClient, tourState } from "./globals";
import { StopId, TourId } from "./touristClient";
import { TourStopTreeItem, TourTreeItem } from "./treeViewItems";

/**
 * A wrapper around a list of TourFiles which provides data to the GUI
 */
class TourTreeView implements vscode.TreeDataProvider<TourId> {
  public readonly onDidChangeTreeData: vscode.Event<null> =
    changeTreeViewEvent.event;
  private titles = new Map<TourId, string>();

  public async getTreeItem(tourId: TourId): Promise<vscode.TreeItem> {
    const tv = await touristClient.viewTour(tourId);
    return new TourTreeItem(tourId, tv.title);
  }

  public async getChildren(parent?: TourId | undefined): Promise<TourId[]> {
    if (parent === undefined) {
      const tourIds: TourId[] = [];
      this.titles.clear();
      for (const [tourId, title] of await touristClient.listTours()) {
        tourIds.push(tourId);
        this.titles.set(tourId, title);
      }
      return tourIds;
    } else {
      return [];
    }
  }

  public getParent(tourId: TourId) {
    return undefined;
  }
}

/**
 * A wrapper around a list of TourStops which provides data to the GUI
 */
class TourStopTreeView implements vscode.TreeDataProvider<StopId> {
  public readonly onDidChangeTreeData: vscode.Event<null> =
    changeTreeViewEvent.event;
  private titles = new Map<StopId, string>();

  public async getTreeItem(stopId: StopId): Promise<TourStopTreeItem> {
    const stopView = await touristClient.viewStop(tourState!.tourId, stopId);
    return new TourStopTreeItem(stopId, stopView.title);
  }

  public async getChildren(parent?: StopId | undefined): Promise<StopId[]> {
    if (parent === undefined && tourState) {
      const tv = await touristClient.viewTour(tourState.tourId);
      const stopIds: StopId[] = [];
      for (const [stopId, title] of tv.stops) {
        stopIds.push(stopId);
        this.titles.set(stopId, title);
      }
      return stopIds;
    } else {
      return [];
    }
  }

  public getParent(stopId: StopId) {
    return undefined;
  }
}

// class RepoTreeView implements vscode.TreeDataProvider<RepoState> {
//   public readonly onDidChangeTreeData: vscode.Event<null> =
//     changeTreeViewEvent.event;

//   public getTreeItem(repo: RepoState): RepoTreeItem {
//     return new RepoTreeItem(repo);
//   }

//   public getChildren(repo?: RepoState | undefined): RepoState[] {
//     touristClient.
//     if (repo === undefined && tourState) {
//       return tourState.tourFile.repositories;
//     } else {
//       return [];
//     }
//   }

//   public getParent(element: RepoState) {
//     return undefined;
//   }
// }

/**
 * Called at extension startup
 */
export function init() {
  tourTreeView = vscode.window.createTreeView<TourId>("tourList", {
    treeDataProvider: new TourTreeView(),
  });
  stopTreeView = vscode.window.createTreeView<StopId>("stopList", {
    treeDataProvider: new TourStopTreeView(),
  });
  // vscode.window.createTreeView<RepoState>("repoList", {
  //   treeDataProvider: new RepoTreeView(),
  // });

  refresh();
}

/**
 * Updates the TreeView in the GUI to reflect the current global state
 */
export function refresh() {
  changeTreeViewEvent.fire();
  // In the TreeViews, select the current tour and tourstop
  if (tourState) {
    tourTreeView.reveal(tourState.tourId);
    if (tourState.stopId) {
      stopTreeView.reveal(tourState.stopId);
    }
  }
}

let tourTreeView: vscode.TreeView<TourId>;
let stopTreeView: vscode.TreeView<StopId>;
const changeTreeViewEvent = new vscode.EventEmitter<null>();

import * as vscode from "vscode";

import { StopId, TourId } from "./touristClient";

/**
 * Controls how a `TourId` is displayed in the TreeView
 */
export class TourTreeItem extends vscode.TreeItem {
  public tourId: TourId;

  constructor(tourId: TourId, title: string) {
    super(title);
    this.tourId = tourId;
    this.command = {
      title: "startTour",
      command: "tourist.startTour",
      arguments: [tourId],
    };
    this.contextValue = "tour";
    // this.tooltip = `${tv.stops.length} stops`;
  }
}

/**
 * Controls how a `TourStop` is displayed in the TreeView
 */
export class TourStopTreeItem extends vscode.TreeItem {
  public stopId: StopId;

  constructor(stopId: StopId, title: string) {
    super(title);
    this.stopId = stopId;
    this.command = {
      title: "gotoTourstop",
      command: "tourist.gotoTourstop",
      arguments: [stopId],
    };
    this.contextValue = "stop";
    // this.tooltip = stop.body || "";
    // if (!isNotBroken(this.stopId)) {
    //   this.iconPath = exclamIcon;
    // }
  }
}

// export class RepoTreeItem extends vscode.TreeItem {
//   constructor(repo: RepoState) {
//     super(repo.repository);
//     this.command = {
//       title: "mapRepo",
//       command: "tourist.mapRepo",
//       arguments: [repo.repository],
//     };
//     this.tooltip = `${repo.repository} - ${repo.commit}`;
//   }
// }

import { AbsoluteTourStop, BrokenTourStop } from "tourist";
import * as vscode from "vscode";

import { TourFile } from "./tourFile";
import { RepoState } from "tourist/src/types";

/**
 * Controls how a `TourFile` is displayed in the TreeView
 */
export class TourFileTreeItem extends vscode.TreeItem {
  public tourFile: TourFile;
  public uri: vscode.Uri;

  constructor(tourFile: TourFile) {
    super(tourFile.title);
    this.command = {
      title: "startTour",
      command: "tourist.startTour",
      arguments: [tourFile.path],
    };
    this.contextValue = "tour";
    this.tooltip = `${tourFile.stops.length} stops`;
    this.tourFile = tourFile;
    this.uri = tourFile.path;
  }
}

/**
 * Controls how a `TourStop` is displayed in the TreeView
 */
export class TourStopTreeItem extends vscode.TreeItem {
  public tourstop: AbsoluteTourStop | BrokenTourStop;

  constructor(tourstop: AbsoluteTourStop | BrokenTourStop) {
    super(tourstop.title);
    this.command = {
      title: "gotoTourstop",
      command: "tourist.gotoTourstop",
      arguments: [tourstop],
    };
    this.contextValue = "stop";
    this.tooltip = tourstop.body || "";
    this.tourstop = tourstop;
  }
}

export class RepoTreeItem extends vscode.TreeItem {
  constructor(repo: RepoState) {
    super(repo.repository);
    this.command = {
      title: "mapRepo",
      command: "tourist.mapRepo",
      arguments: [repo.repository],
    };
    this.tooltip = `${repo.repository} - ${repo.commit}`;
  }
}

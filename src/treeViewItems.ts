import { AbsoluteTourStop, BrokenTourStop, isNotBroken } from "tourist-core";
import * as vscode from "vscode";

import { RepoState } from "tourist-core/src/types";
import { exclamIcon } from "./resources";
import { TourFile } from "./tourFile";

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
    };
    this.contextValue = "tour";
    this.tooltip = `${tv.stops.length} stops`;
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
    if (!isNotBroken(this.tourstop)) {
      this.iconPath = exclamIcon;
    }
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

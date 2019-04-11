import { AbsoluteTourStop, BrokenTourStop, TourFile } from "tourist";
import * as vscode from "vscode";

/**
 * Controls how a `TourFile` is displayed in the TreeView
 */
export class TourFileTreeItem extends vscode.TreeItem {
  public tourFile: TourFile;
  public uri: vscode.Uri;

  constructor(uri: vscode.Uri, tourFile: TourFile) {
    super(tourFile.title);
    this.command = {
      title: "startTour",
      command: "tourist.startTour",
      arguments: [uri],
    };
    this.contextValue = "tour";
    this.tooltip = `${tourFile.stops.length} stops`;
    this.tourFile = tourFile;
    this.uri = uri;
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

/**
 * Controls how a back button is displayed in the TreeView
 */
export class BackButtonTreeItem extends vscode.TreeItem {
  constructor() {
    super("< Back to tour list");
    this.contextValue = "back";
    this.command = {
      title: "back",
      command: "tourist.stopTour",
    };
  }
}

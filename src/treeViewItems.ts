import { AbsoluteTourStop, BrokenTourStop, TourFile } from "tourist";
import * as vscode from "vscode";

export class TourFileTreeItem extends vscode.TreeItem {
  public tourFile: TourFile;
  public uri: vscode.Uri;

  constructor(uri: vscode.Uri, tourFile: TourFile) {
    super(tourFile.title);
    this.command = {
      arguments: [uri],
      command: "extension.startTour",
      title: "lol what?", // TODO: what does this option actually do?
    };
    this.contextValue = "tour";
    this.tooltip = `${tourFile.stops.length} stops`;
    this.tourFile = tourFile;
    this.uri = uri;
  }
}

export class TourStopTreeItem extends vscode.TreeItem {
  public tourstop: AbsoluteTourStop | BrokenTourStop;

  constructor(tourstop: AbsoluteTourStop | BrokenTourStop) {
    super(tourstop.title);
    this.command = {
      arguments: [tourstop],
      command: "extension.gotoTourstop",
      title: "lol what?", // TODO: what does this option actually do?
    };
    this.contextValue = "stop";
    this.tooltip = tourstop.body || "";
    this.tourstop = tourstop;
  }
}

export class BackButtonTreeItem extends vscode.TreeItem {
  constructor() {
    super("< Back to tour list");
    this.contextValue = "back";
    this.command = {
      command: "extension.stopTour",
      title: "lol what?", // TODO: what does this option actually do?
    }
  }
}

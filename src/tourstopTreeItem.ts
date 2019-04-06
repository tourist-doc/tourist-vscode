import { AbsoluteTourStop } from "tourist";
import * as vscode from "vscode";

export class TourstopTreeItem extends vscode.TreeItem {
  public tourstop: AbsoluteTourStop;

  constructor(tourstop: AbsoluteTourStop) {
    super(tourstop.title);
    this.command = {
      arguments: [tourstop],
      command: "extension.gotoTourstop",
      title: "lol what?", // TODO: what does this option actually do?
    };
    this.tooltip = tourstop.body || "";
    this.tourstop = tourstop;
  }
}

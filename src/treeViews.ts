import { AbsoluteTourStop, BrokenTourStop, TourFile } from "tourist";
import * as vscode from "vscode";

import {
  TourFileTreeItem,
  TourStopTreeItem,
  BackButtonTreeItem,
} from "./treeViewItems";

/**
 * A wrapper around a list of TourFiles which provides data to the GUI
 */
export class TourFileTreeView implements vscode.TreeDataProvider<TourFile> {
  onDidChangeTreeData?: vscode.Event<TourFile | null | undefined> | undefined;

  // TODO: this isn't great. Should really only need to take one or the other.
  constructor(uris: vscode.Uri[], tourFiles: TourFile[]) {
    this.uris = uris;
    this.tourFiles = tourFiles;
  }

  getTreeItem(tf: TourFile): vscode.TreeItem | Thenable<vscode.TreeItem> {
    const uri = this.uris[this.tourFiles.indexOf(tf)];
    return new TourFileTreeItem(uri, tf);
  }

  getChildren(tf?: TourFile | undefined): vscode.ProviderResult<TourFile[]> {
    if (tf === undefined) {
      return this.tourFiles;
    } else {
      return [];
    }
  }

  private uris: vscode.Uri[];
  private tourFiles: TourFile[];
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

  constructor(stops: Array<AbsoluteTourStop | BrokenTourStop> = []) {
    this.tourstops = stops;
  }

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
  ): vscode.ProviderResult<Array<AbsoluteTourStop | BrokenTourStop | "back">> {
    if (stop === undefined) {
      let x: Array<AbsoluteTourStop | BrokenTourStop | "back"> = ["back"];
      return x.concat(this.tourstops);
    } else {
      return [];
    }
  }

  public getParent(
    element: AbsoluteTourStop | BrokenTourStop | "back",
  ): vscode.ProviderResult<AbsoluteTourStop> {
    return undefined;
  }

  private tourstops: Array<AbsoluteTourStop | BrokenTourStop>;
}

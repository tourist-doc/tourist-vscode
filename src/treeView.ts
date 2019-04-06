import { AbsoluteTourStop, BrokenTourStop } from "tourist";
import * as vscode from "vscode";

import { TourstopTreeItem } from "./tourstopTreeItem";

/**
 * A wrapper around a list of TourStops which provides data to the GUI
 */
export class TourTreeView
  implements vscode.TreeDataProvider<AbsoluteTourStop | BrokenTourStop> {
  public onDidChangeTreeData?:
    | vscode.Event<AbsoluteTourStop | null | undefined>
    | undefined;

  public tourstops: Array<AbsoluteTourStop | BrokenTourStop>;

  constructor(stops: Array<AbsoluteTourStop | BrokenTourStop> = []) {
    this.tourstops = stops;
  }

  public getTreeItem(element: AbsoluteTourStop): TourstopTreeItem {
    return new TourstopTreeItem(element);
  }

  public getChildren(
    element?: AbsoluteTourStop | BrokenTourStop | undefined,
  ): vscode.ProviderResult<Array<AbsoluteTourStop | BrokenTourStop>> {
    if (element === undefined) {
      return this.tourstops;
    } else {
      return [];
    }
  }

  public getParent(
    element: AbsoluteTourStop | BrokenTourStop,
  ): vscode.ProviderResult<AbsoluteTourStop> {
    return undefined;
  }
}

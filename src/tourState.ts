import { AbsoluteTourStop, BrokenTourStop, Tour, TourFile } from "tourist";
import * as vscode from "vscode";
import { TourTreeView } from "./treeView";

/**
 * Represents the state of the active Tour
 */
// TODO: Consider using singleton
export class TourState {
  public readonly tour: Tour;
  public readonly tourFile: TourFile;
  public readonly path: string;
  public readonly treeView:
    | vscode.TreeView<AbsoluteTourStop | BrokenTourStop>
    | undefined;
  private currentStopIdx: number | undefined;

  constructor(tf: TourFile, tour: Tour, path: string) {
    this.tour = tour;
    this.tourFile = tf;
    this.path = path;
    this.treeView = vscode.window.createTreeView<
      AbsoluteTourStop | BrokenTourStop
    >("touristView", { treeDataProvider: new TourTreeView(tour.stops) });
  }

  public setCurrentTourStop(stop: AbsoluteTourStop | BrokenTourStop) {
    const idx = this.tour.stops.indexOf(stop);
    if (idx !== undefined) {
      this.currentStopIdx = idx;
    }
  }

  public getCurrentTourStop(): AbsoluteTourStop | BrokenTourStop | undefined {
    return this.currentStopIdx !== undefined
      ? this.tour.stops[this.currentStopIdx]
      : undefined;
  }

  public prevTourStop(): AbsoluteTourStop | BrokenTourStop | undefined {
    if (this.currentStopIdx !== undefined && this.currentStopIdx > 0) {
      return this.tour.stops[--this.currentStopIdx];
    } else {
      return undefined;
    }
  }

  public nextTourStop(): AbsoluteTourStop | BrokenTourStop | undefined {
    if (
      this.currentStopIdx !== undefined &&
      this.currentStopIdx < this.tour.stops.length
    ) {
      return this.tour.stops[++this.currentStopIdx];
    } else {
      return undefined;
    }
  }
}

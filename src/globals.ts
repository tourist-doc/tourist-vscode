import * as vscode from "vscode";
import {
  Tourist,
  Tour,
  TourFile,
  AbsoluteTourStop,
  BrokenTourStop,
} from "tourist";

/**
 * Global state and resources
 */
export module Globals {
  export let tourist = new Tourist();
  export let tourState: TourState | undefined;
  export let treeView:
    | vscode.TreeView<TourFile>
    | vscode.TreeView<AbsoluteTourStop | BrokenTourStop | "back">
    | undefined;

  export async function setTourFile(tf: TourFile, path: string) {
    const tour = await Globals.tourist.resolve(tf);
    tourState = new TourState(tf, tour, path);
  }
}

/**
 * Represents the state of the active Tour
 */
export class TourState {
  public tour: Tour;
  public tourFile: TourFile;
  public path: string;
  private currentStopIdx: number | undefined;

  constructor(tf: TourFile, tour: Tour, path: string) {
    this.tour = tour;
    this.tourFile = tf;
    this.path = path;
  }

  get currentStop(): AbsoluteTourStop | BrokenTourStop | undefined {
    return this.currentStopIdx !== undefined
      ? this.tour.stops[this.currentStopIdx]
      : undefined;
  }

  set currentStop(stop: AbsoluteTourStop | BrokenTourStop | undefined) {
    if (stop) {
      const idx = this.tour.stops.indexOf(stop);
      if (idx !== undefined) {
        this.currentStopIdx = idx;
        return;
      }
    }

    this.currentStopIdx = undefined;
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

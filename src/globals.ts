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
  /** The tourist library instance */
  export let tourist = new Tourist();

  /** The state of the active tour */
  export let tourState: TourState | undefined;

  /**
   * The TreeView in the side bar. Currently used to show both tours and tourstops
   */
  export let treeView:
    | vscode.TreeView<TourFile>
    | vscode.TreeView<AbsoluteTourStop | BrokenTourStop | "back">
    | undefined;

  /**
   * Sets the active tour file to `tf`, its path to `path`, and updates related state
   */
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

  /**
   * Sets the current tourstop to the old previous stop, and returns it
   *
   * Returns undefined if there is no current stop or if the current stop is the first one
   */
  public prevTourStop(): AbsoluteTourStop | BrokenTourStop | undefined {
    if (this.currentStopIdx !== undefined && this.currentStopIdx > 0) {
      return this.tour.stops[--this.currentStopIdx];
    } else {
      return undefined;
    }
  }

  /**
   * Sets the current tourstop to the old previous stop, and returns it
   *
   * Returns undefined if there is no current stop or if the current stop is the last one
   */
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

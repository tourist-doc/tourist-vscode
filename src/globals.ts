import { AbsoluteTourStop, BrokenTourStop, Tour, Tourist } from "tourist";
import * as vscode from "vscode";
import { parseTourFile, TourFile } from "./tourFile";
import { TourStopTreeView } from "./treeViews";

/**
 * Global state and resources
 */
/** The tourist library instance */
export let tourist = new Tourist();

/** The state of the active tour */
export let tourState: TourState | undefined;

let knownTourFiles: TourFile[];

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
export async function setTourFile(tf: TourFile) {
  const tour = await tourist.resolve(tf);
  tourState = new TourState(tf, tour);
}

/**
 * Represents the state of the active Tour
 */
export class TourState {
  public tour: Tour;
  public tourFile: TourFile;
  private currentStopIdx: number | undefined;

  constructor(tf: TourFile, tour: Tour) {
    this.tour = tour;
    this.tourFile = tf;
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

export function init(context: vscode.ExtensionContext) {
  const touristJSON = context.globalState.get<string>("touristInstance");
  if (touristJSON) {
    tourist = Tourist.deserialize(touristJSON);
  }
}

export function createTreeView(tour: Tour) {
  treeView = vscode.window.createTreeView<
    AbsoluteTourStop | BrokenTourStop | "back"
  >("touristView", {
    treeDataProvider: new TourStopTreeView(tour.stops),
  });
}

export function clearTourState() {
  tourState = undefined;
}

/**
 * Finds, parses, and returns all the TourFiles found in the current workspace
 * @param update Whether to update the list from disk
 */
export async function getWorkspaceTours(update: boolean): Promise<TourFile[]> {
  if (update) {
    const uris = await vscode.workspace.findFiles("**/*.tour");
    knownTourFiles = [];

    for (const uri of uris) {
      const tf = await parseTourFile(uri.fsPath);
      if (tf) {
        knownTourFiles.push(tf);
      }
    }
  }

  return knownTourFiles;
}

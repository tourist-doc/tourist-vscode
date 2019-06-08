import { AbsoluteTourStop, BrokenTourStop, Tour, Tourist } from "tourist";
import * as vscode from "vscode";

import { readdir } from "fs-extra";
import { join } from "path";
import { tourDirectories } from "./config";
import { context } from "./extension";
import { parseTourFile, TourFile } from "./tourFile";
import { pathsEqual } from "./util";
import { isUndefined } from "util";

/**
 * Global state and resources
 */

/** The tourist library instance */
export let tourist = new Tourist();

/** The state of the active tour */
export let tourState: TourState | undefined;

const knownTourFiles = [] as TourFile[];

/**
 * Sets the active tour file to `tf`, its path to `path`, and updates related state
 */
export async function setTourFile(tf: TourFile) {
  const tour = await tourist.resolve(tf);
  if (tourState === undefined) {
    tourState = new TourState(tf, tour);
  } else {
    tourState.tourFile = tf;
    tourState.tour = tour;
  }
}

/**
 * Represents the state of the active Tour
 */
export class TourState {
  public tour: Tour;
  public tourFile: TourFile;
  public currentStop: AbsoluteTourStop | BrokenTourStop | undefined;

  constructor(
    tf: TourFile,
    tour: Tour,
    currentStop?: AbsoluteTourStop | BrokenTourStop,
  ) {
    this.tour = tour;
    this.tourFile = tf;
    this.currentStop = currentStop;
  }

  /**
   * Moves the current stop backward and returns it
   *
   * Returns undefined if there is no current stop or if the current stop is the first one
   */
  public prevTourStop(): AbsoluteTourStop | BrokenTourStop | undefined {
    return this.stopAtOffset(-1);
  }

  /**
   * Moves the current stop forward and returns it
   *
   * @returns undefined if there is no current stop or if the current stop is the last one
   */
  public nextTourStop(): AbsoluteTourStop | BrokenTourStop | undefined {
    return this.stopAtOffset(1);
  }

  /**
   * Returns the stop `offset` away from the current stop
   * @param offset The number of stops away. Positive=right, negative=left
   * @returns A tourstop or `undefined` if out of bounds
   */
  private stopAtOffset(
    offset: number,
  ): AbsoluteTourStop | BrokenTourStop | undefined {
    if (this.currentStop) {
      const stopIdx = this.tour.stops.indexOf(this.currentStop) + offset;
      if (stopIdx >= 0 && stopIdx < this.tour.stops.length) {
        return this.tour.stops[stopIdx];
      }
    }

    return undefined;
  }
}

/**
 * Called on extension startup
 */
export async function init() {
  const touristJSON = context!.globalState.get<string>("touristInstance");
  if (touristJSON) {
    tourist = Tourist.deserialize(touristJSON);
  }

  await findKnownTours();
}

/**
 * Clears all current tour state, effectively stopping the tour
 */
export function clearTourState() {
  tourState = undefined;
}

/**
 * Finds, parses, and returns all the TourFiles found in the current workspace
 * and in the directories listed in `tourDirectories`
 */
async function findKnownTours() {
  const known = new Set<vscode.Uri>();

  const isDupe = (tfUri: vscode.Uri) => {
    for (const knownUri of known) {
      if (pathsEqual(tfUri.fsPath, knownUri.fsPath)) {
        return true;
      }
    }
    return false;
  };

  // Find .tour files in the current workspace
  for (const uri of await vscode.workspace.findFiles("**/*.tour")) {
    known.add(uri);
  }

  // Find .tour files in each of the tour directories specified in config
  for (const dirPath of await tourDirectories()) {
    for (const tourPath of await readdir(dirPath)) {
      const uri = vscode.Uri.file(join(dirPath, tourPath));
      if (tourPath.endsWith(".tour") && !isDupe(uri)) {
        known.add(uri);
      }
    }
  }

  const tfPromises = [] as Array<Promise<TourFile | undefined>>;
  for (const uri of known) {
    tfPromises.push(parseTourFile(uri.fsPath));
  }

  // Parse in parallel, then add them to known tours
  for (const tf of await Promise.all(tfPromises)) {
    if (tf) {
      newTourFile(tf);
    }
  }
}

/**
 * Returns a list of all known tour files
 */
export function knownTours(): TourFile[] {
  return knownTourFiles;
}

/**
 * Remove a tour file from the known list
 * @param tf The tour to forget
 */
export function forgetTour(tf: TourFile) {
  knownTourFiles.splice(knownTourFiles!.indexOf(tf), 1);
}

/**
 * Adds a tour file to the known list
 * @param tf The tour to keep track of
 */
export function newTourFile(tf?: TourFile) {
  if (tf) {
    knownTourFiles.push(tf);
  }
}

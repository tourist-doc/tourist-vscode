import { AbsoluteTourStop, BrokenTourStop, Tour, Tourist } from "tourist";
import * as vscode from "vscode";

import { readdir } from "fs-extra";
import { join } from "path";
import { tourDirectories } from "./config";
import { context } from "./extension";
import { parseTourFile, TourFile } from "./tourFile";

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
   * Returns undefined if there is no current stop or if the current stop is the last one
   */
  public nextTourStop(): AbsoluteTourStop | BrokenTourStop | undefined {
    return this.stopAtOffset(1);
  }

  private stopAtOffset(offset: number) {
    if (this.currentStop) {
      const stopIdx = this.tour.stops.indexOf(this.currentStop) + offset;
      if (stopIdx >= 0 && stopIdx < this.tour.stops.length) {
        return this.tour.stops[stopIdx];
      }
    }

    return undefined;
  }
}

export async function init() {
  const touristJSON = context!.globalState.get<string>("touristInstance");
  if (touristJSON) {
    tourist = Tourist.deserialize(touristJSON);
  }

  await findWorkspaceTours();
  await findOtherTours();
}

export function clearTourState() {
  tourState = undefined;
}

/**
 * Finds, parses, and returns all the TourFiles found in the current workspace
 */
async function findWorkspaceTours() {
  for (const uri of await vscode.workspace.findFiles("**/*.tour")) {
    const tf = await parseTourFile(uri.fsPath);
    if (tf) {
      knownTourFiles.push(tf);
    }
  }
}

/**
 * Finds, parses, and returns all the TourFiles found in directories listed in `tourDirectories`
 */
async function findOtherTours() {
  for (const dirPath of await tourDirectories()) {
    for (const tourPath of await readdir(dirPath)) {
      if (tourPath.endsWith(".tour")) {
        const tf = await parseTourFile(join(dirPath, tourPath));
        if (tf) {
          knownTourFiles.push(tf);
        }
      }
    }
  }
}

export function knownTours(): TourFile[] {
  return knownTourFiles;
}

export function forgetTour(tf: TourFile) {
  knownTourFiles.splice(knownTourFiles!.indexOf(tf), 1);
}

export function newTourFile(tf: TourFile) {
  knownTourFiles.push(tf);
}

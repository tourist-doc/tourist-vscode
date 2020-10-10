import { Tourist } from "tourist-core";

import { binaryPath } from "./config";
import { context } from "./extension";
import { StopId, TourId, TouristRpcClient } from "./touristClient";

/**
 * Global state and resources
 */

/** The tourist library instance */
export let tourist = new Tourist();

/** The state of the active tour */
export let tourState: TourState | undefined;

export let touristClient = new TouristRpcClient();

/**
 * Sets the active tour file to `tf`, its path to `path`, and updates related state
 */
export async function setTour(tourId: TourId) {
  tourState = new TourState(tourId);
}

/**
 * Represents the state of the active Tour
 */
export class TourState {
  public tourId: TourId;
  public stopId?: StopId;

  constructor(tourId: TourId, stopId?: StopId) {
    this.tourId = tourId;
    this.stopId = stopId;
  }

  /**
   * Moves the current stop backward and returns it
   *
   * Returns undefined if there is no current stop or if the current stop is the first one
   */
  public async prevTourStop(): Promise<StopId | undefined> {
    const tourView = await touristClient.viewTour(this.tourId);
    let ind = 0;
    while (
      ind < tourView.stops.length &&
      tourView.stops[ind][0] !== this.stopId
    ) {
      ind++;
    }
    if (ind === 0 || ind === tourView.stops.length) {
      return undefined;
    } else {
      return tourView.stops[ind - 1][0];
    }
  }

  /**
   * Moves the current stop forward and returns it
   *
   * @returns undefined if there is no current stop or if the current stop is the last one
   */
  public async nextTourStop(): Promise<StopId | undefined> {
    const tourView = await touristClient.viewTour(this.tourId);
    let ind = 0;
    while (
      ind < tourView.stops.length &&
      tourView.stops[ind][0] !== this.stopId
    ) {
      ind++;
    }
    if (ind === tourView.stops.length) {
      return undefined;
    } else {
      return tourView.stops[ind + 1][0];
    }
  }

  /**
   * Returns the stop `offset` away from the current stop
   * @param offset The number of stops away. Positive=right, negative=left
   * @returns A tourstop or `undefined` if out of bounds
   */
  // private async stopAtOffset(
  //   offset: number,
  // ): Promise<StopId | undefined> {
  //   if (this.stopId) {
  //     const stopIdx = getStopIndex(this.stopId)! + offset;
  //     const tourView = await touristClient.viewTour(this.tourId)
  //     if (stopIdx >= 0 && stopIdx < tourView.stops.length) {
  //       return tourView.stops[stopIdx][0];
  //     }
  //   }

  //   return undefined;
  // }
}

/**
 * Called on extension startup
 */
export async function init() {
  await touristClient.connect(binaryPath());

  const touristJSON = context!.globalState.get<string>("touristInstance");
  if (touristJSON) {
    tourist = Tourist.deserialize(touristJSON);
  }
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
// async function findKnownTours() {
//   const known = new Set<vscode.Uri>();

//   // Find .tour files in the current workspace
//   for (const uri of await vscode.workspace.findFiles("**/*.tour")) {
//     known.add(uri);
//   }

//   // Find .tour files in each of the tour directories specified in config
//   for (const dirPath of await tourDirectories()) {
//     for (const tourPath of await readdir(dirPath)) {
//       const uri = vscode.Uri.file(join(dirPath, tourPath));
//       if (tourPath.endsWith(".tour")) {
//         known.add(uri);
//       }
//     }
//   }

//   const tfPromises = [] as Array<Promise<TourId | undefined>>;
//   for (const uri of known) {
//     tfPromises.push(findWithUri(uri));
//   }

//   // Parse in parallel, then add them to known tours
//   for (const tf of await Promise.all(tfPromises)) {
//     if (tf) {
//       newTourFile(tf);
//     }
//   }
// }

/**
 * Returns a list of all known tour files
 */
export async function knownTours(): Promise<[TourId, string]> {
  return touristClient.listTours();
}

/**
 * Remove a tour file from the known list
 * @param tf The tour to forget
 */
export function forgetTour(tourId: TourId) {
  touristClient.forgetTour(tourId);
}

/**
 * Adds a tour file to the known list
 * @param tf The tour to keep track of
 */
export async function newTourFile(path?: string) {
  if (path) {
    touristClient.openTour(path, false);
  }
}

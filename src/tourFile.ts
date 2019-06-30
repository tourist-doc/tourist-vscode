import { TourStop } from "tourist-core";
import { RepoState, Tour } from "tourist-core/src/types";
import { ProgressLocation, Uri, window, workspace } from "vscode";

import { showError } from "./commands";
import * as globals from "./globals";
import { pathsEqual } from "./util";

/**
 * A subtype of tourist::TourFile that holds a file path
 */
export interface TourFile {
  id: string;
  repositories: RepoState[];
  stops: TourStop[];
  title: string;
  description: string;
  version: string;
  path: Uri;
}

// TODO: consider moving caching into tourist-core
const tourCache: Map<TourFile, Tour> = new Map();

/**
 * Resolves a TourFile to a Tour, with a cache to avoid unnecessary work
 * @param tf The TourFile to resolve
 * @param force If true, will bypass the cache and call tourist.resolve()
 */
export async function resolve(
  tf: TourFile,
  force = false,
): Promise<Tour | undefined> {
  if (!force && tourCache.has(tf)) {
    return tourCache.get(tf);
  }
  try {
    const tour = await window.withProgress<Tour>(
      {
        location: ProgressLocation.Notification,
        title: `Processing ${tf.title}`,
      },
      async (progress) => {
        return globals.tourist.resolve(tf);
      },
    );
    tourCache.set(tf, tour);
    return tour;
  } catch (error) {
    switch (error.code) {
      case 200: // Repo not mapped
        // TODO: in addition, add a button to map the repo
        showError(error);
        break;
      default:
        showError(error, false);
        break;
    }
  }
}

/**
 * Finds the tour with the given URI, if one exists. Reads from disk if necessary.
 * @param uri The TourFile URI
 */
export async function findWithUri(uri: Uri): Promise<TourFile | undefined> {
  for (const knownTF of globals.knownTours()) {
    if (pathsEqual(knownTF.path.path, uri.path)) {
      return knownTF;
    }
  }

  // Read from disk
  const tf = await parseTourFile(uri);
  globals.newTourFile(tf);
  return tf;
}

/**
 * Returns the tour with the given id, if one is known.
 * @param id A TourFile ID
 */
export function findWithID(id: string): TourFile | undefined {
  for (const tf of globals.knownTours()) {
    if (tf.id === id) {
      return tf;
    }
  }

  return undefined;
}

/**
 * Parses a TourFile from a location on disk
 * @param path The path to the TourFile
 */
async function parseTourFile(tfUri: Uri): Promise<TourFile | undefined> {
  const doc = await workspace.openTextDocument(tfUri);
  try {
    const tf = globals.tourist.deserializeTourFile(doc.getText());
    return {
      path: tfUri,
      ...tf,
    };
  } catch (error) {
    switch (error.code) {
      case 400: // Invalid JSON string
      case 401: // Invalid tour file
      default:
        showError(error, false);
        break;
    }
    return undefined;
  }
}

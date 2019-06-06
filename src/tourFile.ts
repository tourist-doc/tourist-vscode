import { TourStop } from "tourist";
import { RepoState } from "tourist/src/types";
import { Uri, workspace } from "vscode";

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

/**
 * Parses a TourFile from a location on disk
 * @param path The path to the TourFile
 */
export async function parseTourFile(
  tfPath: string,
): Promise<TourFile | undefined> {
  const doc = await workspace.openTextDocument(tfPath);
  try {
    const tf = globals.tourist.deserializeTourFile(doc.getText());
    return {
      path: Uri.file(tfPath),
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

export function findWithUri(uri: Uri): TourFile | undefined {
  for (const tf of globals.knownTours()) {
    if (pathsEqual(tf.path.path, uri.path)) {
      return tf;
    }
  }

  return undefined;
}

export function findWithID(id: string): TourFile | undefined {
  for (const tf of globals.knownTours()) {
    if (tf.id === id) {
      return tf;
    }
  }

  return undefined;
}

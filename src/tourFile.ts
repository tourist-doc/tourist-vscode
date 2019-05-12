import { TourStop } from "tourist";
import { RepoState } from "tourist/src/types";
import { Uri, workspace } from "vscode";

import { showError } from "./commands";
import * as globals from "./globals";

/**
 * A subtype of tourist::TourFile that holds a file path
 */
export interface TourFile {
  repositories: RepoState[];
  stops: TourStop[];
  title: string;
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

/**
 * Finds, parses, and returns all the TourFiles found in the current workspace
 */
export async function getWorkspaceTours(): Promise<TourFile[]> {
  const uris = await workspace.findFiles("**/*.tour");
  const tourFiles: TourFile[] = [];

  for (const uri of uris) {
    const tf = await parseTourFile(uri.fsPath);
    if (tf) {
      tourFiles.push(tf);
    }
  }

  return tourFiles;
}

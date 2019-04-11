import * as vscode from "vscode";
import * as path from "path";
import { Globals } from "./globals";
import { TourFile } from "tourist";

/**
 * Utility functions
 */
export module Util {
  /**
   * Returns `true` if the paths are equal, `false` otherwise
   */
  export function pathsEqual(path1: string, path2: string) {
    const x = path.parse(path1);
    const y = path.parse(path2);

    return (
      x.root.toUpperCase() === y.root.toUpperCase() &&
      x.dir === y.dir &&
      x.base === y.base
    );
  }

  /**
   * Parses a TourFile from a location on disk
   * @param path The path to the TourFile
   */
  export async function parseTourFile(path: string): Promise<TourFile> {
    const doc = await vscode.workspace.openTextDocument(path);
    return await Globals.tourist.deserializeTourFile(doc.getText());
  }

  /**
   * Finds, parses, and returns all the TourFiles found in the current workspace
   */
  export async function getWorkspaceTours() {
    const uris = await vscode.workspace.findFiles("**/*.tour");
    let tourFiles: Array<[vscode.Uri, TourFile]> = [];

    for (const uri of uris) {
      const tf = await parseTourFile(uri.fsPath);
      tourFiles.push([uri, tf]);
    }

    return tourFiles;
  }
}

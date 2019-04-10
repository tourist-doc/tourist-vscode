import * as vscode from "vscode";
import * as path from "path";
import { Globals } from "./globals";
import { TourFile } from "tourist";

export module Util {
  export function pathsEqual(path1: string, path2: string) {
    const x = path.parse(path1);
    const y = path.parse(path2);

    return (
      x.root.toUpperCase() === y.root.toUpperCase() &&
      x.dir === y.dir &&
      x.base === y.base
    );
  }

  export async function parseTourFile(path: string): Promise<TourFile> {
    const doc = await vscode.workspace.openTextDocument(path);
    return await Globals.tourist.deserializeTourFile(doc.getText());
  }
}

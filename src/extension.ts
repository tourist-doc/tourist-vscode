import * as fs from "fs";
import { isNotBroken, Tour, Tourist, TourFile } from "tourist";
import * as vscode from "vscode";

import { Commands } from "./commands";
import { TouristCodeLensProvider } from "./codeLenses";
import * as config from "./config";
import { TourState } from "./tourState";
import { TouristWebview } from "./webview";
import { TourFileTreeView } from "./treeViews";
import { pathsEqual } from "./util";

const activeTourstopDecorationType = vscode.window.createTextEditorDecorationType(
  {
    backgroundColor: new vscode.ThemeColor("merge.incomingHeaderBackground"),
    isWholeLine: true,
  },
);

const inactiveTourstopDecorationType = vscode.window.createTextEditorDecorationType(
  {
    backgroundColor: new vscode.ThemeColor("merge.incomingContentBackground"),
    isWholeLine: true,
  },
);

export module Globals {
  // --- Global variables --- //
  export let tourist = new Tourist();
  export let tourState: TourState | undefined;
}

/**
 * Called when a workspace is opened with a .tour file at the top level
 */
export async function activate(context: vscode.ExtensionContext) {
  showTourList();
  vscode.workspace.onDidChangeConfiguration(
    (evt: vscode.ConfigurationChangeEvent) => {
      if (Globals.tourState === undefined) {
        showTourList();
      }
    },
  );

  const touristJSON = context.globalState.get<string>("touristInstance");
  if (touristJSON) {
    Globals.tourist = Tourist.deserialize(touristJSON);
  }

  TouristWebview.init(context);
  Commands.registerAll(context);

  // Here we group all the commands listed in package.json by inputs.
  // Each is registered with a function that first gets any arguments
  // it is not passed from the user directly (with QuickPick, etc.)

  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      { scheme: "file" },
      new TouristCodeLensProvider(),
    ),
  );
}

/**
 * Show the given tour in the sidebar
 */
export function showTour(t: Tour) {
  if (!Globals.tourState) {
    return;
  }

  showDecorations(t);
}

/**
 * Shows the decorations for the given tour
 */
export function showDecorations(tour: Tour) {
  if (!Globals.tourState || !config.showDecorations()) {
    return;
  }
  const current = Globals.tourState.getCurrentTourStop();
  vscode.window.visibleTextEditors.forEach((editor) => {
    if (
      current &&
      isNotBroken(current) &&
      pathsEqual(current.absPath, editor.document.fileName)
    ) {
      editor.setDecorations(activeTourstopDecorationType, [
        editor.document.lineAt(new vscode.Position(current.line - 1, 0)).range,
      ]);
    } else {
      editor.setDecorations(activeTourstopDecorationType, []);
    }

    editor.setDecorations(
      inactiveTourstopDecorationType,
      tour.stops
        .filter(
          (stop) =>
            stop !== current &&
            isNotBroken(stop) &&
            pathsEqual(stop.absPath, editor.document.fileName),
        )
        .map((stop) =>
          editor.document.lineAt(
            new vscode.Position(isNotBroken(stop) ? stop.line - 1 : 0, 0),
          ),
        ),
    );
  });
}

/**
 * Writes active TourFile to disk
 */
export async function saveTour() {
  if (!Globals.tourState) {
    return;
  }

  console.log(`Attempting to save ${Globals.tourState.path}`);
  fs.writeFile(
    Globals.tourState.path,
    await Globals.tourist.serializeTourFile(Globals.tourState.tourFile),
    (err) => {
      if (err) {
        console.log(err);
        throw err;
      }
      console.log("The file has been saved!");
    },
  );
}

/**
 * Parses a TourFile, returning the TourState that results from starting this tour.
 * // TODO: refactor
 */
export async function parseTourFile(path: string): Promise<TourState> {
  const doc = await vscode.workspace.openTextDocument(path);

  const tf = await Globals.tourist.deserializeTourFile(doc.getText());
  const tour = await Globals.tourist.resolve(tf);

  return new TourState(tf, tour, path);
}

export async function showTourList() {
  Globals.tourState = undefined;
  const uris = await vscode.workspace.findFiles("**/*.tour");
  let tourFiles: TourFile[] = [];

  for (const uri of uris) {
    const doc = await vscode.workspace.openTextDocument(uri);
    const tf = Globals.tourist.deserializeTourFile(doc.getText());
    tourFiles.push(tf);
  }

  vscode.window.createTreeView<TourFile>("touristView", {
    treeDataProvider: new TourFileTreeView(uris, tourFiles),
  });
}

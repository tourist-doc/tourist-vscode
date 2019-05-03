import * as fs from "fs";
import {
  isNotBroken,
  Tour,
  Tourist,
  TourFile,
  AbsoluteTourStop,
  BrokenTourStop,
} from "tourist";
import * as vscode from "vscode";

import { Commands } from "./commands";
import { TouristCodeLensProvider } from "./codeLenses";
import * as config from "./config";
import { TouristWebview } from "./webview";
import { TourFileTreeView, TourStopTreeView } from "./treeViews";
import { Util } from "./util";
import { Globals } from "./globals";

/** The text decoration shown on the active tourstop */
const activeTourstopDecorationType = vscode.window.createTextEditorDecorationType(
  {
    backgroundColor: new vscode.ThemeColor("merge.incomingHeaderBackground"),
    isWholeLine: true,
  },
);

/** The text decoration shown on inactive tourstops */
const inactiveTourstopDecorationType = vscode.window.createTextEditorDecorationType(
  {
    backgroundColor: new vscode.ThemeColor("merge.incomingContentBackground"),
    isWholeLine: true,
  },
);

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
function showTour(tour: Tour) {
  if (!Globals.tourState) {
    return;
  }

  showDecorations(tour);
  Globals.treeView = vscode.window.createTreeView<
    AbsoluteTourStop | BrokenTourStop | "back"
  >("touristView", {
    treeDataProvider: new TourStopTreeView(tour.stops),
  });
}

/**
 * Shows the decorations for the given tour
 */
export function showDecorations(tour?: Tour) {
  if (tour === undefined) {
    vscode.window.visibleTextEditors.forEach((editor) => {
      editor.setDecorations(activeTourstopDecorationType, []);
      editor.setDecorations(inactiveTourstopDecorationType, []);
    });
    return;
  }

  if (!Globals.tourState || !config.showDecorations()) {
    return;
  }
  const current = Globals.tourState.currentStop;
  vscode.window.visibleTextEditors.forEach((editor) => {
    if (
      current &&
      isNotBroken(current) &&
      Util.pathsEqual(current.absPath, editor.document.fileName)
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
            Util.pathsEqual(stop.absPath, editor.document.fileName),
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
 * Closes the active tour and shows the list of known tours in the side bar
 */
export async function showTourList() {
  Globals.tourState = undefined;

  let uris: vscode.Uri[] = [];
  let tourFiles: TourFile[] = [];
  for (const [uri, tf] of await Util.getWorkspaceTours()) {
    uris.push(uri);
    tourFiles.push(tf);
  }

  // Clear text decorations
  showDecorations(undefined);

  vscode.window.createTreeView<TourFile>("touristView", {
    treeDataProvider: new TourFileTreeView(uris, tourFiles),
  });
}

export async function processTourFile(tf: TourFile, path: string) {
  await Globals.setTourFile(tf, path);
  await saveTour();
  showTour(Globals.tourState!.tour);
}

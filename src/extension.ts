import * as fs from "fs";
import { isNotBroken, Tour } from "tourist";
import * as vscode from "vscode";

import { TouristCodeLensProvider } from "./codeLenses";
import * as commands from "./commands";
import * as config from "./config";
import * as globals from "./globals";
import * as statusBar from "./statusBar";
import { TourFile } from "./tourFile";
import { TourFileTreeView } from "./treeViews";
import * as util from "./util";
import { TouristWebview } from "./webview";

/** The text decoration shown on the active tourstop */
const activeTourstopDecorationType = vscode.window.createTextEditorDecorationType(
  {
    backgroundColor: new vscode.ThemeColor("merge.incomingHeaderBackground"),
    overviewRulerColor: new vscode.ThemeColor("merge.incomingHeaderBackground"),
    isWholeLine: true,
  },
);

/** The text decoration shown on inactive tourstops */
const inactiveTourstopDecorationType = vscode.window.createTextEditorDecorationType(
  {
    backgroundColor: new vscode.ThemeColor("merge.incomingContentBackground"),
    overviewRulerColor: new vscode.ThemeColor(
      "merge.incomingContentBackground",
    ),
    isWholeLine: true,
  },
);

/**
 * Called when a workspace is opened with a .tour file at the top level
 */
export async function activate(context: vscode.ExtensionContext) {
  showTourList(true);
  vscode.workspace.onDidChangeConfiguration(configChanged);

  globals.init(context);
  statusBar.init();
  TouristWebview.init(context);
  commands.registerAll(context);

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
  if (!globals.tourState) {
    return;
  }

  showDecorations(tour);
  globals.createTreeView(tour);
}

/**
 * Shows the decorations for the given tour
 */
export function showDecorations(tour?: Tour) {
  if (!globals.tourState || !config.showDecorations() || tour === undefined) {
    vscode.window.visibleTextEditors.forEach((editor) => {
      editor.setDecorations(activeTourstopDecorationType, []);
      editor.setDecorations(inactiveTourstopDecorationType, []);
    });
    return;
  }

  const current = globals.tourState.currentStop;
  vscode.window.visibleTextEditors.forEach((editor) => {
    if (
      current &&
      isNotBroken(current) &&
      util.pathsEqual(current.absPath, editor.document.fileName)
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
            util.pathsEqual(stop.absPath, editor.document.fileName),
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
export async function saveTour(tf: TourFile) {
  console.log(`Attempting to save ${tf.title} to ${tf.path.fsPath}`);
  await fs.writeFileSync(tf.path.fsPath, globals.tourist.serializeTourFile(tf));
  console.log("The file has been saved!");
}

/**
 * Closes the active tour and shows the list of known tours in the side bar
 * @param update Whether to update the list of known tours from disk
 */
export async function showTourList(update = false) {
  console.log("Showing tour list");
  globals.clearTourState();

  const tourFiles = await globals.getWorkspaceTours(update);

  // Clear text decorations
  showDecorations(undefined);

  vscode.window.createTreeView<TourFile>("touristView", {
    treeDataProvider: new TourFileTreeView(tourFiles),
  });
}

export async function processTourFile(tf: TourFile) {
  await globals.setTourFile(tf);
  await saveTour(globals.tourState!.tourFile);
  showTour(globals.tourState!.tour);
}

function configChanged(evt: vscode.ConfigurationChangeEvent) {
  if (evt.affectsConfiguration("tourist.showDecorations")) {
    showDecorations(globals.tourState ? globals.tourState.tour : undefined);
  }
}

import * as fs from "fs";
import { isNotBroken } from "tourist";
import * as vscode from "vscode";

import { TouristCodeLensProvider } from "./codeLenses";
import * as commands from "./commands";
import * as config from "./config";
import * as globals from "./globals";
import * as statusBar from "./statusBar";
import { findWithUri, TourFile } from "./tourFile";
import * as treeView from "./treeView";
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
 * The entry point to the extension. Currently, called on startup.
 */
export async function activate(context: vscode.ExtensionContext) {
  vscode.workspace.onDidChangeConfiguration(configChanged);

  await globals.init(context);
  statusBar.init();
  TouristWebview.init(context);
  commands.registerAll(context);

  updateGUI();

  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      { scheme: "file" },
      new TouristCodeLensProvider(),
    ),
  );

  const tourFileWatcher = vscode.workspace.createFileSystemWatcher("**/*.tour");
  tourFileWatcher.onDidDelete(async (deletedUri) => {
    const tf = await findWithUri(deletedUri);
    if (tf) {
      globals.forgetTour(tf);
      updateGUI();
    }
  });
}

export function updateGUI() {
  showDecorations();
  treeView.refresh();
  TouristWebview.refresh();
  statusBar.refresh();
}

/**
 * Shows the decorations for the given tour
 */
export function showDecorations() {
  if (!globals.tourState || !config.showDecorations()) {
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
      globals
        .tourState!.tour.stops.filter(
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
  await fs.writeFileSync(tf.path.fsPath, globals.tourist.serializeTourFile(tf));
  console.log(`Saved ${tf.title} at ${tf.path.fsPath}`);
}

export async function processTourFile(tf: TourFile) {
  await globals.setTourFile(tf);
  await saveTour(globals.tourState!.tourFile);
  updateGUI();
}

function configChanged(evt: vscode.ConfigurationChangeEvent) {
  if (evt.affectsConfiguration("tourist.showDecorations")) {
    showDecorations();
  }
}

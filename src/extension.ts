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

export let context: vscode.ExtensionContext | undefined;

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
export async function activate(ctx: vscode.ExtensionContext) {
  context = ctx;

  vscode.workspace.onDidChangeConfiguration(configChanged);

  await globals.init();
  statusBar.init();
  treeView.init();
  await TouristWebview.init();
  commands.registerAll();

  updateGUI();

  ctx.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      { scheme: "file" },
      new TouristCodeLensProvider(),
    ),
  );

  // When a change is made above a tourstop, change the in-memory representation
  // of the tourstop to offset the change.
  vscode.workspace.onDidChangeTextDocument((evt) => {
    let anyChanged = false;
    if (globals.tourState) {
      for (const stop of globals.tourState.tour.stops) {
        if (
          isNotBroken(stop) &&
          util.pathsEqual(stop.absPath, evt.document.fileName)
        ) {
          for (const change of evt.contentChanges) {
            if (change.range.end.line < stop.line) {
              const linesAdded = change.text.split("\n").length - 1;
              const numLinesRemoved =
                change.range.end.line - change.range.start.line;
              const lineNumberDelta = linesAdded - numLinesRemoved;
              if (lineNumberDelta !== 0) {
                stop.line += lineNumberDelta;
                anyChanged = true;
                if (stop.line < 1) {
                  console.error("Oops, looks like something went wrong");
                  stop.line = 1;
                }
              }
            }
          }
        }
      }
    }
    if (anyChanged) {
      updateGUI();
    }
  });

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
  try {
    showDecorations();
  } catch (e) {
    console.error(`Oh no! Something went wrong: ${e}`);
  }
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
  for (const editor of vscode.window.visibleTextEditors) {
    let activeTourStops = [] as vscode.Range[];
    if (
      current &&
      isNotBroken(current) &&
      util.pathsEqual(current.absPath, editor.document.fileName)
    ) {
      activeTourStops = [
        editor.document.lineAt(new vscode.Position(current.line - 1, 0)).range,
      ];
    }

    const inactiveTourStops = globals
      .tourState!.tour.stops.filter(
        (stop) =>
          stop !== current &&
          isNotBroken(stop) &&
          util.pathsEqual(stop.absPath, editor.document.fileName),
      )
      .map(
        (stop) =>
          editor.document.lineAt(
            new vscode.Position(isNotBroken(stop) ? stop.line - 1 : 0, 0),
          ).range,
      );

    editor.setDecorations(activeTourstopDecorationType, activeTourStops);
    editor.setDecorations(inactiveTourstopDecorationType, inactiveTourStops);
  }
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

async function configChanged(evt: vscode.ConfigurationChangeEvent) {
  if (evt.affectsConfiguration("tourist.showDecorations")) {
    showDecorations();
  } else if (
    evt.affectsConfiguration("tourist.webviewFont") ||
    evt.affectsConfiguration("tourist.webviewFontSize")
  ) {
    await TouristWebview.init();
    updateGUI();
  }
}

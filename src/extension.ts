import { writeFile } from "fs-extra";
import { isNotBroken } from "tourist-core";
import * as vscode from "vscode";

import * as codeLenses from "./codeLenses";
import * as commands from "./commands";
import * as config from "./config";
import * as globals from "./globals";
import * as resources from "./resources";
import * as statusBar from "./statusBar";
import { findWithUri, resolve, TourFile } from "./tourFile";
import * as treeView from "./treeView";
import * as util from "./util";
import { TouristWebview } from "./webview";

export let context: vscode.ExtensionContext | undefined;

/**
 * The entry point to the extension. Currently, called on startup.
 */
export async function activate(ctx: vscode.ExtensionContext) {
  console.info("Tourist started activate()");

  context = ctx;

  vscode.workspace.onDidChangeConfiguration(config.configChanged);

  await globals.init();
  resources.init(context);
  statusBar.init();
  treeView.init();
  TouristWebview.init();
  commands.registerAll();

  ctx.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      { scheme: "file" },
      codeLenses.provider,
    ),
  );

  // When a change is made above a tourstop, change the in-memory representation
  // of the tourstop to offset the change.
  vscode.workspace.onDidChangeTextDocument((evt) => {
    const activeEditor = vscode.window.activeTextEditor;
    if (
      evt.document.fileName.endsWith(".tour") &&
      activeEditor &&
      activeEditor.document === evt.document
    ) {
      vscode.window.showWarningMessage(
        "It's not recommended that you edit .tour files directly.",
      );
    }
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

  console.info("Tourist finished activate()");
}

/**
 * Updates the whole GUI to reflect global state
 */
export async function updateGUI() {
  // TODO: consider making smarter to only update what needs to be updated
  try {
    showDecorations();
  } catch (e) {
    console.error(`Oh no! Something went wrong: ${e}`);
  }
  await TouristWebview.refresh();
  statusBar.refresh();
  codeLenses.provider.refresh();
  treeView.refresh();
}

/**
 * Shows the decorations for the given tour
 */
export function showDecorations() {
  if (!globals.tourState || !config.showDecorations()) {
    vscode.window.visibleTextEditors.forEach((editor) => {
      editor.setDecorations(config.activeTourstopDecorationType(), []);
      editor.setDecorations(config.inactiveTourstopDecorationType(), []);
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

    editor.setDecorations(
      config.activeTourstopDecorationType(),
      activeTourStops,
    );
    editor.setDecorations(
      config.inactiveTourstopDecorationType(),
      inactiveTourStops,
    );
  }
}

/**
 * Writes given TourFile to disk
 */
export async function saveTour(tf: TourFile) {
  const tourFileJSON = globals.tourist.serializeTourFile(tf);
  await writeFile(tf.path.fsPath, tourFileJSON);
  console.info(`Saved ${tf.title} at ${tf.path.fsPath}`);
}

/**
 * Updates global state and the GUI to reflect a given tour file
 * @param tf The TourFile
 */
export async function processTourFile(tf: TourFile, save = true) {
  console.debug(`Processing TourFile ${tf.id}, save=${save}`);
  const tour = await resolve(tf, save);
  if (tour) {
    await globals.setTour(tf, tour);
    if (save) {
      saveTour(tf);
    }

    if (globals.tourState && globals.tourState.currentStop) {
      globals.tourState.currentStop = globals.tourState.tour.stops.find((s) => {
        return s.id === globals.tourState!.currentStop!.id;
      });
    }
    updateGUI();
  }
}

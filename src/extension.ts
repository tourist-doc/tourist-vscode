import * as fs from "fs";
import * as path from "path";
import {
  AbsoluteTourStop,
  BrokenTourStop,
  isNotBroken,
  Tour,
  Tourist,
  TourFile,
} from "tourist";
import * as vscode from "vscode";

import * as config from "./config";
import { quickPickTourstop } from "./quickPick";
import { TourState } from "./tourState";
import { TouristWebview } from "./webview";
import { TourFileTreeView } from "./treeViews";

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

// --- Global variables --- //
let tourist = new Tourist();
let tourState: TourState | undefined;

/**
 * Called when a workspace is opened with a .tour file at the top level
 */
export async function activate(context: vscode.ExtensionContext) {
  showTourList();
  vscode.workspace.onDidChangeConfiguration(
    (evt: vscode.ConfigurationChangeEvent) => {
      if (tourState === undefined) {
        showTourList();
      }
    },
  );

  const touristJSON = context.globalState.get<string>("touristInstance");
  if (touristJSON) {
    tourist = Tourist.deserialize(touristJSON);
  }

  TouristWebview.init(context);

  // Here we group all the commands listed in package.json by inputs.
  // Each is registered with a function that first gets any arguments
  // it is not passed from the user directly (with QuickPick, etc.)

  const noArgsCommands: Array<[string, () => void]> = [
    ["extension.nextTourstop", nextTourStop],
    ["extension.prevTourstop", prevTourStop],
    ["extension.addTourstop", addTourStop],
    ["extension.newTour", newTour],
    ["extension.moveTourstop", moveTourstop],
    ["extension.addBreakpoints", addBreakpoints],
    ["extension.stopTour", stopTour],
  ];
  noArgsCommands.forEach((command) => {
    vscode.commands.registerCommand(command[0], async () => {
      await command[1]();
    });
  });

  const uriCommands: Array<[string, (uri: vscode.Uri) => void]> = [
    ["extension.startTour", startTour],
  ];
  uriCommands.forEach((command) => {
    vscode.commands.registerCommand(command[0], async (uri?: vscode.Uri) => {
      if (uri === undefined) {
        vscode.window
          .showOpenDialog({
            openLabel: "Start tour",
            canSelectMany: false,
            filters: {
              Tours: ["tour"],
            },
          })
          .then(async (uris: vscode.Uri[] | undefined) => {
            if (uris) {
              uri = uris[0];
            }
          });
      }

      if (uri) {
        await command[1](uri);
      }
    });
  });

  const contextCommands: Array<
    [string, (ctx: vscode.ExtensionContext) => void]
  > = [["extension.mapRepo", mapRepo]];
  contextCommands.forEach((command) => {
    vscode.commands.registerCommand(command[0], async () => {
      await command[1](context);
    });
  });

  const tourstopCommands: Array<
    [string, (tourstop: AbsoluteTourStop | BrokenTourStop) => void]
  > = [
    ["extension.gotoTourstop", gotoTourStop],
    ["extension.deleteTourstop", deleteTourStop],
    ["extension.moveTourstopUp", moveTourstopUp],
    ["extension.moveTourstopDown", moveTourstopDown],
    ["extension.editTitle", editTitle],
    ["extension.editMessage", editMessage],
  ];
  tourstopCommands.forEach((command) => {
    vscode.commands.registerCommand(
      command[0],
      async (stop?: AbsoluteTourStop | BrokenTourStop) => {
        if (tourState && stop === undefined) {
          stop = await quickPickTourstop(tourState.tour);
        }
        if (stop) {
          await command[1](stop);
        }
      },
    );
  });

  const codelensProvider = new class implements vscode.CodeLensProvider {
    public provideCodeLenses(
      document: vscode.TextDocument,
      token: vscode.CancellationToken,
    ): vscode.ProviderResult<vscode.CodeLens[]> {
      if (!config.useCodeLens()) {
        return [];
      }

      const lenses = [] as vscode.CodeLens[];
      if (tourState && tourState.tour) {
        tourState.tour.stops.forEach(
          (stop: AbsoluteTourStop | BrokenTourStop) => {
            if (isNotBroken(stop)) {
              if (pathsEqual(document.fileName, stop.absPath)) {
                const position = new vscode.Position(stop.line, 0);
                lenses.push(
                  new vscode.CodeLens(new vscode.Range(position, position), {
                    arguments: [stop],
                    command: "extension.gotoTourstop",
                    title: stop.title,
                  }),
                );
              }
            } else {
              // TODO: handle broken stop
              vscode.window.showErrorMessage("Your tour is broken! =(");
            }
          },
        );
      }

      return lenses;
    }

    public resolveCodeLens(
      codeLens: vscode.CodeLens,
      token: vscode.CancellationToken,
    ): vscode.ProviderResult<vscode.CodeLens> {
      return codeLens;
    }
  }();
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      { scheme: "file" },
      codelensProvider,
    ),
  );
}

/**
 * Goes to the given tourstop in the active editor
 */
function gotoTourStop(stop: AbsoluteTourStop | BrokenTourStop) {
  if (!tourState || !isNotBroken(stop)) {
    return;
  }

  tourState.setCurrentTourStop(stop);

  // In the TreeView, select the new tourstop
  if (tourState.treeView && tourState.treeView.visible) {
    // TODO: do not use `as any`, you heathen
    (tourState.treeView as any).reveal(stop);
  }

  const file = vscode.Uri.file(stop.absPath);
  vscode.workspace.openTextDocument(file).then(
    (doc) => {
      vscode.window
        .showTextDocument(doc, vscode.ViewColumn.One)
        .then((editor) => {
          const pos = new vscode.Position(stop.line, 0);
          editor.selection = new vscode.Selection(pos, pos);
          editor.revealRange(editor.selection, config.tourstopRevealLocation());
          if (tourState) {
            showDecorations(tourState.tour);
          }
        })
        .then(() => {
          if (tourState) {
            TouristWebview.setTourStop(tourState.tour, stop);
          }
        });
    },
    (error: any) => {
      console.error(error);
      vscode.window.showErrorMessage(`Unable to open ${file.fsPath}`);
    },
  );
}

/**
 * Goes to the next tourstop in the active editor
 */
export function nextTourStop() {
  if (!tourState) {
    return;
  }

  const next = tourState.nextTourStop();
  if (next) {
    gotoTourStop(next);
  } else {
    vscode.window.showInformationMessage("No more tourstops!");
  }
}

/**
 * Goes to the previous tourstop in the active editor
 */
export function prevTourStop() {
  if (!tourState) {
    return;
  }

  const prev = tourState.prevTourStop();
  if (prev) {
    gotoTourStop(prev);
  } else {
    vscode.window.showInformationMessage("No more tourstops!");
  }
}

/**
 * Adds a TourStop to the current Tour
 */
async function addTourStop() {
  const editor = vscode.window.activeTextEditor;
  if (!editor || !tourState) {
    return;
  }

  const title =
    (await vscode.window.showInputBox({ prompt: "Stop title:" })) || "";
  try {
    await tourist.add(tourState.tourFile, {
      title,
      absPath: editor.document.fileName,
      line: editor.selection.active.line,
    });
  } catch (error) {
    console.error(error);
  }
  const tour = await tourist.resolve(tourState.tourFile);
  tourState = new TourState(tourState.tourFile, tour, tourState.path);
  await saveTour();
  showTour(tourState.tour);
}

/**
 * Delete TourStop from current Tour
 */
async function deleteTourStop(stop: AbsoluteTourStop | BrokenTourStop) {
  if (!tourState) {
    return;
  }

  const idx = tourState.tour.stops.indexOf(stop);
  if (idx !== -1) {
    try {
      await tourist.remove(tourState.tourFile, idx);
    } catch (error) {
      console.error(error);
    }
    const tour = await tourist.resolve(tourState.tourFile);
    tourState = new TourState(tourState.tourFile, tour, tourState.path);
    await saveTour();
    showTour(tourState.tour);
  }
}

/**
 * Edits the title of a TourStop in the current Tour
 */
export async function editTitle(
  stop: AbsoluteTourStop | BrokenTourStop,
): Promise<void> {
  if (!tourState) {
    return;
  }

  vscode.window.showInputBox().then(async (title) => {
    if (tourState && title !== undefined) {
      const idx = tourState.tour.stops.indexOf(stop);
      if (idx !== -1) {
        await tourist.edit(tourState.tourFile, idx, { title });
        const tour = await tourist.resolve(tourState.tourFile);
        tourState = new TourState(tourState.tourFile, tour, tourState.path);
        await saveTour();
        TouristWebview.setTourStop(tourState.tour, tourState.tour.stops[idx]);
        showTour(tourState.tour);
      }
    }
  });
}

/**
 * Edits the message of a TourStop in the current Tour
 */
export async function editMessage(
  stop: AbsoluteTourStop | BrokenTourStop,
  message?: string,
): Promise<void> {
  if (!tourState) {
    return;
  }

  if (message === undefined) {
    message = await vscode.window.showInputBox();
  }

  if (message !== undefined) {
    const idx = tourState.tour.stops.indexOf(stop);
    if (idx !== -1) {
      await tourist.edit(tourState.tourFile, idx, { body: message });
      const tour = await tourist.resolve(tourState.tourFile);
      tourState = new TourState(tourState.tourFile, tour, tourState.path);
      await saveTour();
      TouristWebview.setTourStop(tourState.tour, tourState.tour.stops[idx]);
      showTour(tourState.tour);
    }
  }
}

/**
 * Swaps the given tourstop with the one above it
 */
async function moveTourstopUp(stop: AbsoluteTourStop | BrokenTourStop) {
  if (!tourState) {
    return;
  }

  if (tourState.tour) {
    const idx = tourState.tour.stops.indexOf(stop);
    if (idx > 0) {
      const otherIdx = idx - 1;
      const newIndices = Array.from(
        Array(tourState.tour.stops.length).keys(),
      ).map((i) => {
        if (i === idx) {
          return otherIdx;
        } else if (i === otherIdx) {
          return idx;
        } else {
          return i;
        }
      });
      await tourist.scramble(tourState.tourFile, newIndices);
    }

    const tour = await tourist.resolve(tourState.tourFile);
    tourState = new TourState(tourState.tourFile, tour, tourState.path);
    await saveTour();
    showTour(tourState.tour);
  }
}

/**
 * Swaps the given tourstop with the one below it
 */
async function moveTourstopDown(stop: AbsoluteTourStop | BrokenTourStop) {
  if (!tourState) {
    return;
  }

  if (tourState.tour) {
    const idx = tourState.tour.stops.indexOf(stop);
    if (idx < tourState.tour.stops.length && idx !== -1) {
      const otherIdx = idx + 1;
      const newIndices = Array.from(
        Array(tourState.tour.stops.length).keys(),
      ).map((i) => {
        if (i === idx) {
          return otherIdx;
        } else if (i === otherIdx) {
          return idx;
        } else {
          return i;
        }
      });
      await tourist.scramble(tourState.tourFile, newIndices);
    }

    const tour = await tourist.resolve(tourState.tourFile);
    tourState = new TourState(tourState.tourFile, tour, tourState.path);
    await saveTour();
    showTour(tourState.tour);
  }
}

// TODO: this should probably be renamed, since it has nothing to do with moveTourstopUp/Down
async function moveTourstop() {
  if (!tourState) {
    return;
  }

  const stop = await quickPickTourstop(tourState.tour);
  if (stop) {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      try {
        await tourist.move(
          tourState.tourFile,
          tourState.tour.stops.indexOf(stop),
          {
            absPath: editor.document.fileName,
            line: editor.selection.active.line,
          },
        );
      } catch (error) {
        console.error(error);
      }
      const tour = await tourist.resolve(tourState.tourFile);
      tourState = new TourState(tourState.tourFile, tour, tourState.path);
      showTour(tourState.tour);
      await saveTour();
    }
  }
}

/**
 * Starts a Tour from a .tour file
 */
async function startTour(uri: vscode.Uri): Promise<void> {
  tourState = await parseTourFile(uri.fsPath);
  if (tourState.tour.stops) {
    gotoTourStop(tourState.tour.stops[0]);
  }
}

/**
 * Stops the current tour, showing the list of tours in the TreeView
 */
async function stopTour(): Promise<void> {
  showTourList();
  TouristWebview.clear();
}

async function mapRepo(ctx: vscode.ExtensionContext): Promise<void> {
  const repoName = await vscode.window.showInputBox({
    prompt: "What's the name of the repository?",
  });
  if (repoName) {
    const path = await vscode.window.showOpenDialog({
      canSelectFiles: false,
      canSelectFolders: true,
      canSelectMany: false,
    });
    if (path) {
      await tourist.mapConfig(repoName, path[0].fsPath);
      ctx.globalState.update("touristInstance", tourist.serialize());
    }
  }
}

/**
 * Creates a new Tour.
 */
async function newTour(): Promise<void> {
  const folderName = vscode.workspace.rootPath
    ? vscode.workspace.rootPath.split(new RegExp(/\\|\//)).pop()
    : "My Tour";
  const title = await vscode.window.showInputBox({
    value: folderName,
    prompt: "Tour name:",
  });
  // TODO: preferably let them pick a save location
  // TODO: this is pretty brittle...
  const path =
    (vscode.workspace.workspaceFolders
      ? vscode.workspace.workspaceFolders[0].uri.fsPath
      : "") +
    "/" +
    title +
    ".tour";
  if (title !== undefined) {
    const tf = await tourist.init(title);
    const tour = await tourist.resolve(tf);

    tourState = new TourState(tf, tour, path);

    await saveTour();
    showTour(tour);
  }
}

async function addBreakpoints(): Promise<void> {
  if (!tourState) {
    return;
  }

  const breakpoints = [] as vscode.SourceBreakpoint[];
  for (const stop of tourState.tour.stops) {
    if (isNotBroken(stop)) {
      breakpoints.push(
        new vscode.SourceBreakpoint(
          new vscode.Location(
            vscode.Uri.file(stop.absPath),
            new vscode.Position(stop.line, 0),
          ),
        ),
      );
    }
  }

  vscode.debug.addBreakpoints(breakpoints);
}

/**
 * Show the given tour in the sidebar
 */
function showTour(t: Tour) {
  if (!tourState) {
    return;
  }

  showDecorations(t);
}

/**
 * Shows the decorations for the given tour
 */
function showDecorations(tour: Tour) {
  if (!tourState || !config.showDecorations()) {
    return;
  }
  const current = tourState.getCurrentTourStop();
  vscode.window.visibleTextEditors.forEach((editor) => {
    if (
      current &&
      isNotBroken(current) &&
      pathsEqual(current.absPath, editor.document.fileName)
    ) {
      editor.setDecorations(activeTourstopDecorationType, [
        editor.document.lineAt(new vscode.Position(current.line, 0)).range,
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
            new vscode.Position(isNotBroken(stop) ? stop.line : 0, 0),
          ),
        ),
    );
  });
}

function pathsEqual(path1: string, path2: string) {
  const x = path.parse(path1);
  const y = path.parse(path2);

  return (
    x.root.toUpperCase() === y.root.toUpperCase() &&
    x.dir === y.dir &&
    x.base === y.base
  );
}

/**
 * Writes active TourFile to disk
 */
async function saveTour() {
  if (!tourState) {
    return;
  }

  console.log(`Attempting to save ${tourState.path}`);
  fs.writeFile(
    tourState.path,
    await tourist.serializeTourFile(tourState.tourFile),
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
async function parseTourFile(path: string): Promise<TourState> {
  const doc = await vscode.workspace.openTextDocument(path);

  const tf = await tourist.deserializeTourFile(doc.getText());
  const tour = await tourist.resolve(tf);

  return new TourState(tf, tour, path);
}

async function showTourList() {
  tourState = undefined;
  const uris = await vscode.workspace.findFiles("**/*.tour");
  let tourFiles: TourFile[] = [];

  for (const uri of uris) {
    const doc = await vscode.workspace.openTextDocument(uri);
    const tf = tourist.deserializeTourFile(doc.getText());
    tourFiles.push(tf);
  }

  vscode.window.createTreeView<TourFile>("touristView", {
    treeDataProvider: new TourFileTreeView(uris, tourFiles),
  });
}

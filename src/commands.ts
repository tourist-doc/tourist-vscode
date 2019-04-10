import * as vscode from "vscode";
import { AbsoluteTourStop, BrokenTourStop, isNotBroken } from "tourist";

import * as config from "./config";
import { quickPickTourstop } from "./quickPick";
import {
  Globals,
  saveTour,
  showTour,
  showDecorations,
  parseTourFile,
  showTourList,
} from "./extension";
import { TourState } from "./tourState";
import { TouristWebview } from "./webview";

export module Commands {
  const noArgsCommands: Array<[string, () => void]> = [
    ["extension.nextTourstop", nextTourStop],
    ["extension.prevTourstop", prevTourStop],
    ["extension.addTourstop", addTourStop],
    ["extension.newTour", newTour],
    ["extension.moveTourstop", moveTourstop],
    ["extension.addBreakpoints", addBreakpoints],
    ["extension.stopTour", stopTour],
    ["extension.refreshTour", refreshTour],
    ["extension.renameTour", renameTour],
  ];

  const uriCommands: Array<[string, (uri: vscode.Uri) => void]> = [
    ["extension.startTour", startTour],
  ];

  const contextCommands: Array<
    [string, (ctx: vscode.ExtensionContext) => void]
  > = [["extension.mapRepo", mapRepo]];

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

  export function registerAll(ctx: vscode.ExtensionContext) {
    noArgsCommands.forEach((command) => {
      vscode.commands.registerCommand(command[0], async () => {
        await command[1]();
      });
    });

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

    contextCommands.forEach((command) => {
      vscode.commands.registerCommand(command[0], async () => {
        await command[1](ctx);
      });
    });

    tourstopCommands.forEach((command) => {
      vscode.commands.registerCommand(
        command[0],
        async (stop?: AbsoluteTourStop | BrokenTourStop) => {
          if (Globals.tourState && stop === undefined) {
            stop = await quickPickTourstop(Globals.tourState.tour);
          }
          if (stop) {
            await command[1](stop);
          }
        },
      );
    });
  }

  /**
   * Goes to the next tourstop in the active editor
   */
  export function nextTourStop() {
    if (!Globals.tourState) {
      return;
    }

    const next = Globals.tourState.nextTourStop();
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
    if (!Globals.tourState) {
      return;
    }

    const prev = Globals.tourState.prevTourStop();
    if (prev) {
      gotoTourStop(prev);
    } else {
      vscode.window.showInformationMessage("No more tourstops!");
    }
  }

  /**
   * Adds a TourStop to the current Tour
   */
  export async function addTourStop() {
    const editor = vscode.window.activeTextEditor;
    if (!editor || !Globals.tourState) {
      return;
    }

    const title =
      (await vscode.window.showInputBox({ prompt: "Stop title:" })) || "";
    try {
      await Globals.tourist.add(Globals.tourState.tourFile, {
        title,
        absPath: editor.document.fileName,
        line: editor.selection.active.line + 1,
      });
    } catch (error) {
      console.error(error);
    }
    const tour = await Globals.tourist.resolve(Globals.tourState.tourFile);
    Globals.tourState = new TourState(
      Globals.tourState.tourFile,
      tour,
      Globals.tourState.path,
    );
    await saveTour();
    showTour(Globals.tourState.tour);
  }

  /**
   * Goes to the given tourstop in the active editor
   */
  export function gotoTourStop(stop: AbsoluteTourStop | BrokenTourStop) {
    if (!Globals.tourState || !isNotBroken(stop)) {
      return;
    }

    Globals.tourState.setCurrentTourStop(stop);

    // In the TreeView, select the new tourstop
    if (Globals.tourState.treeView && Globals.tourState.treeView.visible) {
      // TODO: do not use `as any`, you heathen
      (Globals.tourState.treeView as any).reveal(stop);
    }

    const file = vscode.Uri.file(stop.absPath);
    vscode.workspace.openTextDocument(file).then(
      (doc) => {
        vscode.window
          .showTextDocument(doc, vscode.ViewColumn.One)
          .then((editor) => {
            const pos = new vscode.Position(stop.line - 1, 0);
            editor.selection = new vscode.Selection(pos, pos);
            editor.revealRange(
              editor.selection,
              config.tourstopRevealLocation(),
            );
            if (Globals.tourState) {
              showDecorations(Globals.tourState.tour);
            }
          })
          .then(() => {
            if (Globals.tourState) {
              TouristWebview.setTourStop(Globals.tourState.tour, stop);
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
   * Delete TourStop from current Tour
   */
  export async function deleteTourStop(stop: AbsoluteTourStop | BrokenTourStop) {
    if (!Globals.tourState) {
      return;
    }

    const idx = Globals.tourState.tour.stops.indexOf(stop);
    if (idx !== -1) {
      try {
        await Globals.tourist.remove(Globals.tourState.tourFile, idx);
      } catch (error) {
        console.error(error);
      }
      const tour = await Globals.tourist.resolve(Globals.tourState.tourFile);
      Globals.tourState = new TourState(
        Globals.tourState.tourFile,
        tour,
        Globals.tourState.path,
      );
      await saveTour();
      showTour(Globals.tourState.tour);
    }
  }

  /**
   * Edits the title of a TourStop in the current Tour
   */
  export async function editTitle(
    stop: AbsoluteTourStop | BrokenTourStop,
  ): Promise<void> {
    if (!Globals.tourState) {
      return;
    }

    vscode.window.showInputBox().then(async (title) => {
      if (Globals.tourState && title !== undefined) {
        const idx = Globals.tourState.tour.stops.indexOf(stop);
        if (idx !== -1) {
          await Globals.tourist.edit(Globals.tourState.tourFile, idx, {
            title,
          });
          const tour = await Globals.tourist.resolve(
            Globals.tourState.tourFile,
          );
          Globals.tourState = new TourState(
            Globals.tourState.tourFile,
            tour,
            Globals.tourState.path,
          );
          await saveTour();
          TouristWebview.setTourStop(
            Globals.tourState.tour,
            Globals.tourState.tour.stops[idx],
          );
          showTour(Globals.tourState.tour);
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
    if (!Globals.tourState) {
      return;
    }

    if (message === undefined) {
      message = await vscode.window.showInputBox();
    }

    if (message !== undefined) {
      const idx = Globals.tourState.tour.stops.indexOf(stop);
      if (idx !== -1) {
        await Globals.tourist.edit(Globals.tourState.tourFile, idx, {
          body: message,
        });
        const tour = await Globals.tourist.resolve(Globals.tourState.tourFile);
        Globals.tourState = new TourState(
          Globals.tourState.tourFile,
          tour,
          Globals.tourState.path,
        );
        await saveTour();
        TouristWebview.setTourStop(
          Globals.tourState.tour,
          Globals.tourState.tour.stops[idx],
        );
        showTour(Globals.tourState.tour);
      }
    }
  }

  /**
   * Swaps the given tourstop with the one above it
   */
  export async function moveTourstopUp(stop: AbsoluteTourStop | BrokenTourStop) {
    if (!Globals.tourState) {
      return;
    }

    if (Globals.tourState.tour) {
      const idx = Globals.tourState.tour.stops.indexOf(stop);
      if (idx > 0) {
        const otherIdx = idx - 1;
        const newIndices = Array.from(
          Array(Globals.tourState.tour.stops.length).keys(),
        ).map((i) => {
          if (i === idx) {
            return otherIdx;
          } else if (i === otherIdx) {
            return idx;
          } else {
            return i;
          }
        });
        await Globals.tourist.scramble(Globals.tourState.tourFile, newIndices);
      }

      const tour = await Globals.tourist.resolve(Globals.tourState.tourFile);
      Globals.tourState = new TourState(
        Globals.tourState.tourFile,
        tour,
        Globals.tourState.path,
      );
      await saveTour();
      showTour(Globals.tourState.tour);
    }
  }

  /**
   * Swaps the given tourstop with the one below it
   */
  export async function moveTourstopDown(stop: AbsoluteTourStop | BrokenTourStop) {
    if (!Globals.tourState) {
      return;
    }

    if (Globals.tourState.tour) {
      const idx = Globals.tourState.tour.stops.indexOf(stop);
      if (idx < Globals.tourState.tour.stops.length && idx !== -1) {
        const otherIdx = idx + 1;
        const newIndices = Array.from(
          Array(Globals.tourState.tour.stops.length).keys(),
        ).map((i) => {
          if (i === idx) {
            return otherIdx;
          } else if (i === otherIdx) {
            return idx;
          } else {
            return i;
          }
        });
        await Globals.tourist.scramble(Globals.tourState.tourFile, newIndices);
      }

      const tour = await Globals.tourist.resolve(Globals.tourState.tourFile);
      Globals.tourState = new TourState(
        Globals.tourState.tourFile,
        tour,
        Globals.tourState.path,
      );
      await saveTour();
      showTour(Globals.tourState.tour);
    }
  }

  // TODO: this should probably be renamed, since it has nothing to do with moveTourstopUp/Down
  export async function moveTourstop() {
    if (!Globals.tourState) {
      return;
    }

    const stop = await quickPickTourstop(Globals.tourState.tour);
    if (stop) {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        try {
          await Globals.tourist.move(
            Globals.tourState.tourFile,
            Globals.tourState.tour.stops.indexOf(stop),
            {
              absPath: editor.document.fileName,
              line: editor.selection.active.line + 1,
            },
          );
        } catch (error) {
          console.error(error);
        }
        const tour = await Globals.tourist.resolve(Globals.tourState.tourFile);
        Globals.tourState = new TourState(
          Globals.tourState.tourFile,
          tour,
          Globals.tourState.path,
        );
        showTour(Globals.tourState.tour);
        await saveTour();
      }
    }
  }

  /**
   * Starts a Tour from a .tour file
   */
  export async function startTour(uri: vscode.Uri): Promise<void> {
    Globals.tourState = await parseTourFile(uri.fsPath);
    if (Globals.tourState.tour.stops) {
      gotoTourStop(Globals.tourState.tour.stops[0]);
    }
  }

  /**
   * Stops the current tour, showing the list of tours in the TreeView
   */
  export async function stopTour(): Promise<void> {
    showTourList();
    TouristWebview.clear();
  }

  export async function refreshTour(): Promise<void> {
    if (Globals.tourState) {
      try {
        await Globals.tourist.refresh(Globals.tourState.tourFile);
        const tour = await Globals.tourist.resolve(Globals.tourState.tourFile);
        Globals.tourState = new TourState(
          Globals.tourState.tourFile,
          tour,
          Globals.tourState.path,
        );
        await saveTour();
        showTour(Globals.tourState.tour);
      } catch (error) {
        vscode.window.showErrorMessage(`Error code ${error.code} thrown`);
      }
    }
  }

  export async function renameTour(): Promise<void> {
    if (Globals.tourState) {
      const name = await vscode.window.showInputBox();
      if (name !== undefined) {
        try {
          await Globals.tourist.rename(Globals.tourState.tourFile, name);
          const tour = await Globals.tourist.resolve(
            Globals.tourState.tourFile,
          );
          Globals.tourState = new TourState(
            Globals.tourState.tourFile,
            tour,
            Globals.tourState.path,
          );
          await saveTour();
        } catch (error) {
          vscode.window.showErrorMessage(error);
        }
      }
    }
  }

  export async function mapRepo(ctx: vscode.ExtensionContext): Promise<void> {
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
        await Globals.tourist.mapConfig(repoName, path[0].fsPath);
        ctx.globalState.update("touristInstance", Globals.tourist.serialize());
      }
    }
  }

  /**
   * Creates a new Tour.
   */
  export async function newTour(): Promise<void> {
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
      const tf = await Globals.tourist.init(title);
      const tour = await Globals.tourist.resolve(tf);

      Globals.tourState = new TourState(tf, tour, path);

      await saveTour();
      showTour(tour);
    }
  }

  export async function addBreakpoints(): Promise<void> {
    if (!Globals.tourState) {
      return;
    }

    const breakpoints = [] as vscode.SourceBreakpoint[];
    for (const stop of Globals.tourState.tour.stops) {
      if (isNotBroken(stop)) {
        breakpoints.push(
          new vscode.SourceBreakpoint(
            new vscode.Location(
              vscode.Uri.file(stop.absPath),
              new vscode.Position(stop.line - 1, 0),
            ),
          ),
        );
      }
    }

    vscode.debug.addBreakpoints(breakpoints);
  }
}

import { unlink } from "fs-extra";
import { dirname, join } from "path";
import {
  AbsoluteTourStop,
  BrokenTourStop,
  isNotBroken,
  TouristError,
} from "tourist-core";
import * as vscode from "vscode";

// tslint:disable-next-line: no-var-requires
const sanitize = require("sanitize-filename");
import * as config from "./config";
import { context, processTourFile, saveTour, updateGUI } from "./extension";
import * as globals from "./globals";
import { findWithUri, getStopIndex, isTourFile, TourFile } from "./tourFile";
import {
  quickPickRepoName,
  quickPickTourFile,
  quickPickTourstop,
} from "./userInput";
import { findRepoRoot } from "./util";
import { TouristWebview } from "./webview";

/**
 * Exports a function corresponding to every VSCode command we contribute.
 */
const commands = {
  "tourist.addBreakpoints": addBreakpoints,
  "tourist.addTourstop": addTourStop,
  "tourist.deleteTour": deleteTour,
  "tourist.deleteTourstop": deleteTourStop,
  "tourist.editBody": editBody,
  "tourist.editTitle": editTitle,
  "tourist.editTour": editTour,
  "tourist.gotoTourstop": gotoTourStop,
  "tourist.linkTour": linkTour,
  "tourist.mapRepo": mapRepo,
  "tourist.moveTourstop": moveTourstop,
  "tourist.moveTourstopDown": moveTourstopDown,
  "tourist.moveTourstopUp": moveTourstopUp,
  "tourist.newTour": newTour,
  "tourist.nextTourstop": nextTourStop,
  "tourist.openTourFile": openTourFile,
  "tourist.prevTourstop": prevTourStop,
  "tourist.refreshTour": refreshTour,
  "tourist.renameTour": renameTour,
  "tourist.startTour": startTour,
  "tourist.stopTour": stopTour,
  "tourist.toggleWebview": toggleWebview,
  "tourist.unmapRepo": unmapRepo,
};

/**
 * Registers each command with the `vscode` API, called on activation.
 */
export function registerAll() {
  for (const [cmdName, cmdFn] of Object.entries(commands)) {
    vscode.commands.registerCommand(cmdName, cmdFn);
  }
}

/**
 * Goes to the next tourstop in the active editor
 */
export async function nextTourStop() {
  if (!globals.tourState) {
    return;
  }

  const next = globals.tourState.nextTourStop();
  if (next) {
    await gotoTourStop(next);
  } else {
    vscode.window.showInformationMessage("No more tourstops!");
  }
}

/**
 * Goes to the previous tourstop in the active editor
 */
export async function prevTourStop() {
  if (!globals.tourState) {
    return;
  }

  const prev = globals.tourState.prevTourStop();
  if (prev) {
    await gotoTourStop(prev);
  } else {
    vscode.window.showInformationMessage("No more tourstops!");
  }
}

/**
 * Adds a new TourStop to the current Tour
 */
export async function addTourStop(
  fileUri: vscode.Uri,
  title?: string,
  mapMissingRepo = true,
) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showInformationMessage("No editor is active");
    return;
  } else if (!globals.tourState) {
    await startTour();
  }

  if (!fileUri) {
    fileUri = editor.document.uri;
  }

  if (!globals.tourState) {
    return;
  }

  if (title === undefined) {
    editor.setDecorations(config.newTourstopDecorationType(), [
      editor.selection,
    ]);
    // TODO: this loses focus
    title = await vscode.window.showInputBox({
      prompt: "Stop title:",
      ignoreFocusOut: true,
    });
    editor.setDecorations(config.newTourstopDecorationType(), []);
  }
  if (title === undefined) {
    return;
  }

  await editor.document.save();

  const stop: AbsoluteTourStop = {
    title,
    absPath: editor.document.fileName,
    line: editor.selection.active.line + 1,
    childStops: [],
  };

  try {
    await globals.tourist.add(globals.tourState.tourFile, stop);
  } catch (error) {
    switch (error.code) {
      case 200: // Repo not mapped to path
        await mapRepo(error.repoName);
        break;
      case 201: // Path not mapped to repo
      case 204: // No known repository in this tree.
        if (mapMissingRepo) {
          // Search upward to find the .git folder, if we can
          const repoPath = await findRepoRoot(fileUri.fsPath);
          if (repoPath) {
            const pathComponents = repoPath.path.split(/\/|\\/);
            await mapRepo(
              pathComponents[pathComponents.length - 1],
              repoPath.fsPath,
              true,
            );
          } else {
            await mapRepo();
          }

          await addTourStop(fileUri, title, false);
        }
        break;
      case 203: // Mismatched repo versions
        showError(error);
        break;
      case 100: // Invalid file
      case 101: // Invalid line number
      case 202: // Could not get current repo version
      default:
        showError(error, false);
        break;
    }
    console.error(error);
  }
  await processTourFile(globals.tourState.tourFile);
  const stops = globals.tourState.tour.stops;
  await gotoTourStop(stops[stops.length - 1], true);
}

/**
 * Goes to the given tourstop in the active editor
 */
export async function gotoTourStop(
  stop?: AbsoluteTourStop | BrokenTourStop,
  editing = false,
) {
  if (!globals.tourState) {
    return;
  }
  if (stop === undefined) {
    stop = await quickPickTourstop();
  }
  if (!stop) {
    return;
  }

  globals.tourState.currentStop = stop;
  TouristWebview.setEditing(editing);

  if (isNotBroken(stop)) {
    const file = vscode.Uri.file(stop.absPath);
    const doc = await vscode.workspace.openTextDocument(file);
    const viewCol =
      config.webviewColumn() === vscode.ViewColumn.One
        ? vscode.ViewColumn.Two
        : vscode.ViewColumn.One;
    const editor = await vscode.window.showTextDocument(doc, viewCol);
    const pos = new vscode.Position(stop.line - 1, 0);
    editor.selection = new vscode.Selection(pos, pos);
    editor.revealRange(editor.selection, config.tourstopRevealLocation());
  } else {
    // TODO: show changes from last good commit to now (requires FileSystemProvider...):
    // vscode.commands.executeCommand("vscode.diff", uri1, uri2);
  }

  updateGUI();
}

/**
 * Deletes a tour and its .tour file on disk.
 */
export async function deleteTour(tf?: TourFile) {
  if (!tf) {
    tf = await quickPickTourFile(false);
  }
  if (!tf) {
    return;
  }

  if (globals.tourState && globals.tourState.tourFile === tf) {
    globals.clearTourState();
  }

  unlink(tf.path.fsPath);
  globals.forgetTour(tf);
  updateGUI();
}

/**
 * Delete TourStop from current Tour
 */
export async function deleteTourStop(stop?: AbsoluteTourStop | BrokenTourStop) {
  if (!globals.tourState) {
    return;
  }
  if (stop === undefined) {
    stop = await quickPickTourstop();
  }

  if (stop) {
    if (stop === globals.tourState.currentStop) {
      globals.tourState.currentStop = undefined;
    }

    const idx = getStopIndex(stop);
    if (stop.id) {
      let tf: TourFile;
      try {
        await globals.tourist.remove(globals.tourState.tourFile, stop.id);
        tf = globals.tourState.tourFile;
      } catch (error) {
        switch (error.code) {
          case 0:
          default:
            showError(error, false);
            break;
        }
        console.error(error);
        return;
      }
      await processTourFile(globals.tourState.tourFile);

      if (isNotBroken(stop)) {
        const buttonHit = await vscode.window.showInformationMessage(
          `Deleted ${stop.title}`,
          { modal: false },
          { title: "Undo" },
        );
        if (buttonHit && buttonHit.title === "Undo") {
          if (globals.tourState && tf === globals.tourState.tourFile) {
            await globals.tourist.add(tf, stop, idx);
            await processTourFile(tf);
          } else {
            // TODO: can we do better?
            vscode.window.showErrorMessage("Undo failed. Sorry about that =(");
          }
        }
      }
    }
  }
}

/**
 * Edits the title of a TourStop in the current Tour
 */
export async function editTitle(
  stop?: AbsoluteTourStop | BrokenTourStop,
): Promise<void> {
  if (!globals.tourState) {
    return;
  }
  if (stop === undefined) {
    stop = await quickPickTourstop();
  }

  if (stop) {
    const title = await vscode.window.showInputBox({
      prompt: "What's the new title?",
      value: stop.title,
      ignoreFocusOut: true,
    });
    if (title !== undefined) {
      const idx = getStopIndex(stop);
      if (stop.id) {
        try {
          await globals.tourist.edit(globals.tourState.tourFile, stop.id, {
            title,
          });
        } catch (error) {
          switch (error.code) {
            case 0:
            default:
              showError(error, false);
              break;
          }
        }
        await processTourFile(globals.tourState.tourFile);
        if (stop === globals.tourState.currentStop) {
          globals.tourState.currentStop = globals.tourState.tour.stops[idx!];
        }
      }
    }
  }
}

/**
 * Edits the body of a TourStop in the current Tour
 */
export async function editBody(
  stop?: AbsoluteTourStop | BrokenTourStop,
  body?: string,
): Promise<void> {
  if (!globals.tourState) {
    return;
  }
  if (stop === undefined) {
    stop = await quickPickTourstop();
  }

  if (stop) {
    if (body === undefined) {
      body = await vscode.window.showInputBox({
        prompt: "What's the new body?",
        value: stop.body,
        ignoreFocusOut: true,
      });
    }

    if (body !== undefined) {
      const idx = getStopIndex(stop);
      if (stop.id) {
        try {
          await globals.tourist.edit(globals.tourState.tourFile, stop.id, {
            body,
          });
        } catch (error) {
          switch (error.code) {
            case 0:
            default:
              showError(error, false);
              break;
          }
        }
        await processTourFile(globals.tourState.tourFile);
        if (stop === globals.tourState.currentStop) {
          globals.tourState.currentStop = globals.tourState.tour.stops[idx!];
        }
      }
    }
  }
}

/**
 * Swaps the given tourstop with the one above it
 */
export async function moveTourstopUp(stop?: AbsoluteTourStop | BrokenTourStop) {
  if (!globals.tourState) {
    return;
  }
  if (stop === undefined) {
    stop = await quickPickTourstop();
  }

  if (stop) {
    const idx = getStopIndex(stop);
    if (stop.id && idx && idx > 0) {
      const newIdx = idx - 1;
      try {
        await globals.tourist.reorder(
          globals.tourState.tourFile,
          stop.id,
          newIdx,
        );
      } catch (error) {
        switch (error.code) {
          case 1:
          default:
            showError(error, false);
            break;
        }
      }

      await processTourFile(globals.tourState.tourFile);
    }
  }
}

/**
 * Swaps the given tourstop with the one below it
 */
export async function moveTourstopDown(
  stop?: AbsoluteTourStop | BrokenTourStop,
) {
  if (!globals.tourState) {
    return;
  }
  if (stop === undefined) {
    stop = await quickPickTourstop();
  }

  if (stop) {
    const idx = getStopIndex(stop);
    if (
      stop.id &&
      idx !== undefined &&
      idx < globals.tourState.tour.stops.length - 1
    ) {
      const newIdx = idx + 1;
      try {
        await globals.tourist.reorder(
          globals.tourState.tourFile,
          stop.id,
          newIdx,
        );
      } catch (error) {
        switch (error.code) {
          case 1:
          default:
            showError(error, false);
            break;
        }
      }

      await processTourFile(globals.tourState.tourFile);
    }
  }
}

/**
 * Changes a TourStop's location
 */
export async function moveTourstop(
  uri: vscode.Uri,
  stop?: AbsoluteTourStop | BrokenTourStop,
) {
  if (!globals.tourState) {
    return;
  }
  if (stop === undefined) {
    stop = await quickPickTourstop();
  }

  if (stop && stop.id) {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      await editor.document.save();
      const newLocation = editor.selection.active;
      try {
        await globals.tourist.move(globals.tourState.tourFile, stop.id, {
          absPath: editor.document.fileName,
          line: newLocation.line + 1,
        });
      } catch (error) {
        switch (error.code) {
          case 200: // Repo not mapped to path
            await mapRepo(error.repoName);
            break;
          case 201: // Path not mapped to repo
          case 204: // No known repository in this tree.
            // Search upward to find the .git folder, if we can
            const repoPath = await findRepoRoot(editor.document.fileName);
            if (repoPath) {
              const pathComponents = repoPath.path.split(/\/|\\/);
              await mapRepo(
                pathComponents[pathComponents.length - 1],
                repoPath.fsPath,
                true,
              );
            } else {
              await mapRepo();
            }
            break;
          case 203: // Mismatched repo versions
            showError(error);
            break;
          case 100: // Invalid file
          case 101: // Invalid line number
          case 202: // Could not get current repo version
          default:
            showError(error, false);
            break;
        }
        console.error(error);
      }
      await processTourFile(globals.tourState.tourFile);
    }
  }
}

/**
 * Starts a Tour from a .tour file
 */
export async function startTour(tf?: vscode.Uri | TourFile): Promise<void> {
  if (!isTourFile(tf)) {
    tf = await (tf ? findWithUri(tf) : quickPickTourFile());
  }

  if (tf) {
    // Clear currentStop
    globals.clearTourState();

    await processTourFile(tf, false);
  }
}

export async function editTour(tf?: vscode.Uri | TourFile): Promise<void> {
  if (!isTourFile(tf)) {
    tf = await (tf ? findWithUri(tf) : quickPickTourFile());
  }

  if (tf) {
    // Clear currentStop
    globals.clearTourState();

    await processTourFile(tf, false);
    globals.tourState!.readOnly = false;
  }
}

/**
 * Stops the current tour, showing the list of tours in the TreeView
 */
export async function stopTour(): Promise<void> {
  globals.clearTourState();
  updateGUI();
}

/**
 * Update the tourstop locations in a TourFile to reflect the current version
 */
export async function refreshTour(tf?: TourFile): Promise<void> {
  if (!tf) {
    tf = await quickPickTourFile();
  }
  if (!tf) {
    return;
  }

  for (const repo of tf.repositories) {
    try {
      await globals.tourist.refresh(tf, repo.repository);
    } catch (error) {
      switch (error.code) {
        case 200: // Repo not mapped to path
          await mapRepo(error.repoName);
        case 300: // No repo version
        default:
          showError(error, false);
          break;
      }
      vscode.window.showErrorMessage(`Error code ${error.code} thrown`);
    }
  }

  await processTourFile(tf);
}

/**
 * Changes the title of the tour
 */
export async function renameTour(tf?: TourFile, name?: string): Promise<void> {
  if (!tf) {
    tf = await quickPickTourFile();
  }
  if (!tf) {
    return;
  }
  if (name === undefined) {
    name = await vscode.window.showInputBox({
      prompt: "What's the new title?",
      value: tf.title,
      ignoreFocusOut: true,
    });
  }
  if (name === undefined) {
    return;
  }

  try {
    await globals.tourist.rename(tf, name);
    await saveTour(tf);
    updateGUI();
  } catch (error) {
    switch (error.code) {
      case 200: // Repo not mapped to path
        await mapRepo(error.repoName);
      case 300: // No repo version
      default:
        showError(error, false);
        break;
    }
  }
}

/**
 * Changes the description of a tour file
 */
export async function editDescription(tf?: TourFile, description?: string) {
  if (!tf) {
    tf = await quickPickTourFile();
  }
  if (!tf) {
    return;
  }

  if (description === undefined) {
    description = await vscode.window.showInputBox({
      prompt: "What's the new description?",
      value: tf.description,
      ignoreFocusOut: true,
    });
  }
  if (description === undefined) {
    return;
  }

  await globals.tourist.editDescription(tf, description);
  await saveTour(tf);
  updateGUI();
}

/**
 * Maps a name used in the .tour file to a repository path on disk
 */
export async function mapRepo(
  repoName?: string,
  repoPath?: string,
  verify = false,
): Promise<void> {
  if (!repoName || verify) {
    repoName = await vscode.window.showInputBox({
      prompt: "What's the name of the repository?",
      value: repoName,
      ignoreFocusOut: true,
    });
  }

  if (repoName) {
    const currentMapping = globals.tourist.config[repoName];
    let defaultUri: vscode.Uri | undefined;
    if (currentMapping) {
      defaultUri = currentMapping ? vscode.Uri.file(currentMapping) : undefined;
    } else if (defaultUri === undefined && repoPath) {
      defaultUri = vscode.Uri.file(repoPath);
    } else if (vscode.window.activeTextEditor) {
      defaultUri = vscode.Uri.file(
        dirname(vscode.window.activeTextEditor.document.uri.path),
      );
    }

    if (!repoPath || verify) {
      const repoFolders = await vscode.window.showOpenDialog({
        openLabel: `Map to '${repoName}'`,
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        defaultUri,
      });
      if (repoFolders) {
        repoPath = repoFolders[0].fsPath;
      }
    }
    if (repoPath) {
      await globals.tourist.mapConfig(repoName, repoPath);
      context!.globalState.update(
        "touristInstance",
        globals.tourist.serialize(),
      );
    }
  }
}

/**
 * Removes the association between a repo ID and its repository
 */
export async function unmapRepo(repoName?: string): Promise<void> {
  if (repoName === undefined) {
    repoName = await quickPickRepoName();
  }

  if (repoName) {
    await globals.tourist.unmapConfig(repoName);
    context!.globalState.update("touristInstance", globals.tourist.serialize());
  }
}

/**
 * Creates a new Tour, saving the .tour file to disk
 */
export async function newTour(
  path?: vscode.Uri,
): Promise<TourFile | undefined> {
  const folderName = vscode.workspace.rootPath
    ? vscode.workspace.rootPath.split(new RegExp(/\\|\//)).pop()
    : "My Tour";
  const title = await vscode.window.showInputBox({
    prompt: "What's the name of the new tour?",
    value: folderName,
    ignoreFocusOut: true,
  });
  if (!title) {
    return;
  }

  if (!path) {
    const defaultUri = vscode.Uri.file(
      join(config.defaultTourSaveLocation(), sanitize(title) + ".tour"),
    );
    path = await vscode.window.showSaveDialog({ defaultUri });
  }

  if (path) {
    const tf = await globals.tourist.init(title, "");
    const tfWithPath = {
      path,
      ...tf,
    };
    globals.newTourFile(tfWithPath);
    await processTourFile(tfWithPath, true);
    return tfWithPath;
  }
}

export async function openTourFile(tf?: TourFile) {
  if (!tf) {
    tf = await quickPickTourFile();
  }
  if (!tf) {
    return;
  }

  const doc = await vscode.workspace.openTextDocument(tf.path.fsPath);
  await vscode.window.showTextDocument(doc, config.webviewColumn());
}

export async function linkTour(tf?: TourFile) {
  if (!tf) {
    tf = await quickPickTourFile();
  }
  if (!tf) {
    return;
  }

  const idx = getStopIndex(globals.tourState!.currentStop!);
  const stopNum = 0;

  if (
    !globals.tourState!.tourFile.stops[idx!].childStops.some((child) => {
      return child.tourId === tf!.id && stopNum === child.stopNum;
    })
  ) {
    globals.tourist.link(
      globals.tourState!.tourFile,
      globals.tourState!.currentStop!.id!,
      {
        tourId: tf.id,
        stopNum: 0,
      },
    );
    await processTourFile(globals.tourState!.tourFile);
  }
}

/**
 * Places a breakpoint at each tourstop location in the active tour
 */
export async function addBreakpoints(): Promise<void> {
  if (!globals.tourState) {
    return;
  }

  const breakpoints = [] as vscode.SourceBreakpoint[];
  for (const stop of globals.tourState.tour.stops) {
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

/**
 * Toggles between hiding and showing the webview
 */
export async function toggleWebview() {
  const touristCfg = vscode.workspace.getConfiguration("tourist");

  touristCfg.update(
    "showWebview",
    !touristCfg.get("showWebview"),
    vscode.ConfigurationTarget.Workspace,
  );
}

/**
 * Displays an error to the user
 * @param error The error to be reported
 * @param expected Whether this error "should" EVER happen. `false` if it implies
 *                 a programming error - it's logged as an error and directs the
 *                 user to submit a bug report.
 */
export function showError(error: TouristError, expected = true) {
  if (expected) {
    console.warn(`${error.message} (code: ${error.code})`);
    vscode.window.showErrorMessage(error.message);
  } else {
    console.error(
      `Hit an unexpected error. code: ${error.code}, message: ${error.message}`,
    );
    vscode.window
      .showErrorMessage(error.message, "Report bug")
      .then((choice) => {
        if (choice === "Report to extension author") {
          vscode.commands.executeCommand(
            "vscode.open",
            vscode.Uri.parse(
              `https://github.com/tourist-doc/tourist-vscode/issues/new?title=${error.message}&labels=bug`,
            ),
          );
        }
      });
  }
}

import { dirname, join } from "path";
import {
  AbsoluteTourStop,
  TouristError,
} from "tourist-core";
import * as vscode from "vscode";

// tslint:disable-next-line: no-var-requires
const sanitize = require("sanitize-filename");
import * as config from "./config";
import { context, processTourFile, updateGUI } from "./extension";
import * as globals from "./globals";
import { isTourId } from "./tourFile";
import {
  quickPickRepoName,
  quickPickTourFile,
  quickPickTourstop,
} from "./userInput";
import { findRepoRoot } from "./util";
import { TouristWebview } from "./webview";
import { TourId, StopId, Path } from "./touristClient";

/**
 * Exports a function corresponding to every VSCode command we contribute.
 */
const commands = {
  "tourist.testCommand": testCommand,
  "tourist.addBreakpoints": addBreakpoints,
  "tourist.addTourstop": addTourStop,
  "tourist.deleteTour": deleteTour,
  "tourist.deleteTourstop": deleteTourStop,
  "tourist.editBody": editBody,
  "tourist.editTitle": editTitle,
  "tourist.editTour": editTour,
  "tourist.gotoTourstop": gotoTourStop,
  "tourist.linkStop": linkStop,
  "tourist.mapRepo": mapRepo,
  "tourist.moveTourstop": moveTourstop,
  "tourist.moveTourstopDown": moveTourstopDown,
  "tourist.moveTourstopUp": moveTourstopUp,
  "tourist.newTour": newTour,
  "tourist.nextTourstop": nextTourStop,
  "tourist.openTourFile": openTourFile,
  "tourist.prevTourstop": prevTourStop,
  "tourist.renameTour": renameTour,
  "tourist.startTour": startTour,
  "tourist.stopTour": stopTour,
  "tourist.toggleWebview": toggleWebview,
  "tourist.unmapRepo": unmapRepo,
};

export async function testCommand() {
  let ret = await globals.touristClient.createTour("firstTour");
  console.error(ret);
}

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

  const next = await globals.tourState.nextTourStop();
  if (next) {
    await gotoTourStop(next, false);
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

  const prev = await globals.tourState.prevTourStop();
  if (prev) {
    await gotoTourStop(prev, false);
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
    await globals.touristClient.createStop(globals.tourState.tourId, stop.title, stop.absPath, stop.line);
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
  await processTourFile(globals.tourState.tourId, fileUri, true);
  const stops = (await globals.touristClient.viewTour(globals.tourState.tourId)).stops;
  await gotoTourStop(stops[stops.length - 1][0], true);
}

/**
 * Goes to the given tourstop in the active editor
 */
export async function gotoTourStop(
  stop?: StopId,
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

  globals.tourState.stopId = stop;
  TouristWebview.setEditing(editing);

  const tour = globals.tourState.tourId;
  const lookupStop = await globals.touristClient.locateStop(tour, stop, true);

  if (lookupStop) {
    const file = vscode.Uri.file((await globals.touristClient.viewStop(globals.tourState.tourId, globals.tourState.stopId)).title);
    const doc = await vscode.workspace.openTextDocument(file);
    const viewCol =
      config.webviewColumn() === vscode.ViewColumn.One
        ? vscode.ViewColumn.Two
        : vscode.ViewColumn.One;
    const editor = await vscode.window.showTextDocument(doc, viewCol);
    const pos = new vscode.Position(lookupStop[1] - 1, 0);
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
export async function deleteTour(tour?: TourId) {
  if (tour) {
    globals.touristClient.deleteTour(tour)
    updateGUI();
  }
}

/**
 * Delete TourStop from current Tour
 */
export async function deleteTourStop(tour: TourId, stop?: StopId) {
  if (stop) {
    globals.touristClient.removeStop(tour, stop);
  }
}

/**
 * Edits the title of a TourStop in the current Tour
 */
export async function editTitle(
  uri: vscode.Uri,
  stop?: StopId | undefined,
): Promise<void> {
  if (!globals.tourState) {
    return;
  }
  if (stop === undefined) {
    stop = await quickPickTourstop();
  }

  if (stop) {
    const stopView = await globals.touristClient.viewStop(globals.tourState.tourId, stop);
    const title = await vscode.window.showInputBox({
      prompt: "What's the new title?",
      value: stopView.title,
      ignoreFocusOut: true,
    });
    if (title !== undefined) {
      if (stop) {
        try {
          await globals.touristClient.editStopMetadata(globals.tourState.tourId, stop, { title: title })
        } catch (error) {
          switch (error.code) {
            case 0:
            default:
              showError(error, false);
              break;
          }
        }
        await processTourFile(globals.tourState.tourId, uri, true);
      }
    }
  }
}

/**
 * Edits the body of a TourStop in the current Tour
 */
export async function editBody(
  uri: vscode.Uri,
  stop?: StopId | undefined,
  body?: string,
): Promise<void> {
  if (!globals.tourState) {
    return;
  }
  if (stop === undefined) {
    stop = await quickPickTourstop();
  }
  if (stop) {
    const stopView = await globals.touristClient.viewStop(globals.tourState.tourId, stop);
    if (body === undefined) {
      body = await vscode.window.showInputBox({
        prompt: "What's the new body?",
        value: stopView.description,
        ignoreFocusOut: true,
      });
    }

    if (body !== undefined) {
      if (stop) {
        try {
          await globals.touristClient.editStopMetadata(globals.tourState.tourId, stop, { description: body })
        } catch (error) {
          switch (error.code) {
            case 0:
            default:
              showError(error, false);
              break;
          }
        }
        await processTourFile(globals.tourState.tourId, uri, true);
      }
    }
  }
}

/**
 * Swaps the given tourstop with the one above it
 */
export async function moveTourstopUp(uri: vscode.Uri, stop?: StopId | undefined) {
  if (!globals.tourState) {
    return;
  }
  if (stop === undefined) {
    stop = await quickPickTourstop();
  }

  if (stop) {
    if (stop) {
      try {
        await globals.touristClient.reorderStop(globals.tourState.tourId, stop, -1);
      } catch (error) {
        switch (error.code) {
          case 1:
          default:
            showError(error, false);
            break;
        }
      }

      await processTourFile(globals.tourState.tourId, uri, true);
    }
  }
}

/**
 * Swaps the given tourstop with the one below it
 */
export async function moveTourstopDown(
  uri: vscode.Uri,
  stop?: StopId | undefined,
) {
  if (!globals.tourState) {
    return;
  }
  if (stop === undefined) {
    stop = await quickPickTourstop();
  }

  if (stop) {
    try {
      await globals.touristClient.reorderStop(globals.tourState.tourId, stop, 1);
    } catch (error) {
      switch (error.code) {
        case 1:
        default:
          showError(error, false);
          break;
      }
    }
    await processTourFile(globals.tourState.tourId, uri, true);
  }
}

/**
 * Changes a TourStop's location
*/
export async function moveTourstop(
  uri: vscode.Uri,
  stop?: StopId | undefined,
) {
  if (!globals.tourState) {
    return;
  }
  if (stop === undefined) {
    stop = await quickPickTourstop();
  }

  if (stop && stop) {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      await editor.document.save();
      const newLocation = editor.selection.active;
      try {
        await globals.touristClient.moveStop(globals.tourState.tourId, stop, editor.document.fileName, newLocation.line + 1);
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
      await processTourFile(globals.tourState.tourId, uri, true);
    }
  }
}

/**
 * Starts a Tour from a tourId file
 */
export async function startTour(tf?: TourId): Promise<void> {
  if (!isTourId(tf)) {
    tf = await quickPickTourFile();
  }

  if (tf) {
    // Clear currentStop
    globals.clearTourState();

    if (globals.tourState) {
      await processTourFile(globals.tourState.tourId, vscode.Uri.file(tf), false);
    }
  }
}

export async function editTour(tf?: TourId): Promise<void> {
  if (!isTourId(tf)) {
    tf = await quickPickTourFile();
  }

  if (tf) {
    // Clear currentStop
    globals.clearTourState();

    if (globals.tourState) {
      await processTourFile(globals.tourState.tourId, vscode.Uri.file(tf), false);
    }
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
 * Changes the title of the tour
 */
export async function renameTour(tf?: TourId, name?: string): Promise<void> {
  if (!tf) {
    tf = await quickPickTourFile();
  }
  if (!tf) {
    return;
  }

  const tourView = await globals.touristClient.viewTour(tf);

  if (name === undefined) {
    name = await vscode.window.showInputBox({
      prompt: "What's the new title?",
      value: tourView.title,
      ignoreFocusOut: true,
    });
  }
  if (name === undefined) {
    return;
  }

  try {
    await globals.touristClient.editTourMetadata(tf, { title: name });
    await globals.touristClient.saveTour(tf);
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
export async function editDescription(tf?: TourId, description?: string) {
  if (!tf) {
    tf = await quickPickTourFile();
  }
  if (!tf) {
    return;
  }

  const tourView = await globals.touristClient.viewTour(tf);

  if (description === undefined) {
    description = await vscode.window.showInputBox({
      prompt: "What's the new description?",
      value: tourView.description,
      ignoreFocusOut: true,
    });
  }
  if (description === undefined) {
    return;
  }

  await globals.touristClient.editTourMetadata(tf, { description: description });
  await globals.touristClient.saveTour(tf);
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
export async function newTour(path?: vscode.Uri): Promise<TourId | undefined> {
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

  if (!path) {
    return;
  }

  const tourId = await globals.touristClient.createTour(title);
  globals.setTour(tourId);
  await processTourFile(tourId, path);
  return tourId;
}

export async function openTourFile(path: Path) {
  let tour: string | undefined;
  if (!path) {
    tour = await quickPickTourFile();
  }
  if (!tour) {
    return;
  }

  await globals.touristClient.openTour(path, true);
}

export async function linkStop(path: vscode.Uri, tourId: TourId, stopId: StopId, otherTourId: string, otherStopId: StopId) {
  let qptourId: string | undefined;
  if (!tourId) {
    qptourId = await quickPickTourFile();
  }
  if (!qptourId) {
    return;
  }

  await globals.touristClient.linkStop(tourId, stopId, otherTourId, otherStopId);
  await processTourFile(tourId, path, true);
}

/**
 * Places a breakpoint at each tourstop location in the active tour
 */
export async function addBreakpoints(): Promise<void> {
  await globals.touristClient.listTours();
  const tourId = await globals.touristClient.createTour("rpc tour yay");
  await globals.touristClient.saveTour(
    tourId,
    "C:\\Users\\jfields\\Desktop\\tours\\my_rpc_tour.tour",
  );
  await globals.touristClient.listTours();
  /*
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
  */
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


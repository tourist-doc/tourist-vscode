import { relative } from "path";
import * as vscode from "vscode";

import { Tour, Tourstop } from "./tour";
import { TourstopQuickPickItem } from "./tourstopQuickPickItem";
import { TouristWebview } from "./webview";

/**
 * Called when a workspace is opened with a .tour file at the top level
 */
export function activate(context: vscode.ExtensionContext) {
    // If a .tour file exists at the top level of the workspace, parse it
    vscode.workspace.findFiles("*.tour").then((uris) => {
        if (uris.length > 0) {
            // TODO:  decide how to handle multiple .tour files
            const tourfile = uris[0];
            Tour.parseTour(tourfile).then((tour: Tour) => {
                context.workspaceState.update("tour", tour);
                showTour(context, tour);
            }, (error) => {
                console.error(error);
            });
        } else {
            console.log("No .tour file found");
        }
    });

    const justContext: Array<[string, (ctx: vscode.ExtensionContext) => void]> = [
        ["extension.nextTourstop", nextTourStop],
        ["extension.prevTourstop", prevTourStop],
        ["extension.addTourstop", addTourstop],
        ["extension.startTour", startTour],
        ["extension.newTour", newTour],
        ["extension.moveTourstop", moveTourstop],
    ];
    justContext.forEach((command) => {
        vscode.commands.registerCommand(command[0], () => {
            command[1](context);
        });
    });

    const contextAndTourstop: Array<[string, (ctx: vscode.ExtensionContext, tourstop: Tourstop) => void]> = [
        ["extension.gotoTourStop", gotoTourStop],
        ["extension.deleteTourstop", deleteTourstop],
        ["extension.moveTourstopUp", moveTourstopUp],
        ["extension.moveTourstopDown", moveTourstopDown],
        ["extension.editTitle", editTitle],
        ["extension.editMessage", editMessage],
    ];
    contextAndTourstop.forEach((command) => {
        vscode.commands.registerCommand(command[0], (tourstop: Tourstop) => {
            command[1](context, tourstop);
        });
    });

    TouristWebview.setContext(context);

    const codelensProvider = new class implements vscode.CodeLensProvider {
      public provideCodeLenses(
        document: vscode.TextDocument,
        token: vscode.CancellationToken,
      ): vscode.ProviderResult<vscode.CodeLens[]> {
        const tour: Tour | undefined = context.workspaceState.get("tour");

        const lenses = [] as vscode.CodeLens[];
        if (tour) {
          tour.getTourstops().forEach((tourstop: Tourstop) => {
            // TODO: don't do this. This is wrong and broken.
            if (
              relative("C:", document.fileName) ===
              relative("C:", tourstop.filePath)
            ) {
              const position = new vscode.Position(
                tourstop.position.row,
                tourstop.position.col,
              );
              lenses.push(
                new vscode.CodeLens(new vscode.Range(position, position), {
                  arguments: [tourstop],
                  command: "extension.gotoTourStop",
                  title: tourstop.title,
                }),
              );
            }
          });
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
        vscode.languages.registerCodeLensProvider({scheme: "file"}, codelensProvider));
}

/**
 * Goes to the given tourstop in the active editor
 */
function gotoTourStop(context: vscode.ExtensionContext, tourstop: Tourstop) {
    const tour: Tour | undefined = context.workspaceState.get("tour");
    const tourView: vscode.TreeView<Tourstop> | undefined = context.workspaceState.get("touristView");

    if (tour === undefined || tourView === undefined) {
        return;
    }

    tour.setCurrentTourstop(tourstop);

    // In the TreeView, select the new tourstop
    tourView.reveal(tourstop);

    const file = vscode.Uri.file(tourstop.filePath);
    vscode.workspace.openTextDocument(file).then((doc) => {
        vscode.window.showTextDocument(doc, vscode.ViewColumn.One).then((editor) => {
            const pos = new vscode.Position(tourstop.position.row, tourstop.position.col);
            editor.selection = new vscode.Selection(pos, pos);
            editor.revealRange(editor.selection, vscode.TextEditorRevealType.Default);
        }).then(() => {
            TouristWebview.showTourstop(tour, tourstop);
        });
    }, (error: any) => {
        console.error(error);
        vscode.window.showErrorMessage(`Unable to open ${file.fsPath}`);
    });
}

/**
 * Goes to the next tourstop in the active editor
 */
export function nextTourStop(context: vscode.ExtensionContext) {
    const tour: Tour | undefined = context.workspaceState.get("tour");
    if (tour !== undefined) {
        const next = tour.nextTourStop();
        if (next) {
            gotoTourStop(context, next);
        } else {
            vscode.window.showInformationMessage("No more tourstops!");
        }
    }
}

/**
 * Goes to the previous tourstop in the active editor
 */
export function prevTourStop(context: vscode.ExtensionContext) {
    const tour: Tour | undefined = context.workspaceState.get("tour");
    if (tour !== undefined) {
        const prev = tour.prevTourStop();
        if (prev) {
            gotoTourStop(context, prev);
        } else {
            vscode.window.showInformationMessage("No more tourstops!");
        }
    }
}

/**
 * Adds a Tourstop to the current Tour
 */
function addTourstop(context: vscode.ExtensionContext) {
    const editor = vscode.window.activeTextEditor;
    if (editor === undefined) {
        return;
    }

    const tour: Tour | undefined = context.workspaceState.get("tour");

    if (tour === undefined) {
        console.error("Uh oh, tour was undefined!");
    } else {
        tour.addTourStop({
            title: "Shiny new tourstop",
            message: "Please explain here, oh wise one",
            filePath: editor.document.fileName,
            position: {
                row: editor.selection.active.line,
                col: editor.selection.active.character,
            },
        });
        tour.writeToDisk();
        showTour(context, tour);
    }
}

/**
 * Delete Tourstop from current Tour
 */
function deleteTourstop(context: vscode.ExtensionContext, tourstop: Tourstop) {
    const tour: Tour | undefined = context.workspaceState.get("tour");
    if (tour === undefined) {
        console.warn("tour is undefined. Ignoring add tourstop command");
    } else {
        tour.deleteTourStop(tourstop);
        tour.writeToDisk();
        showTour(context, tour);
    }
}

/**
 * Edits the title of a Tourstop in the current Tour
 */
export function editTitle(context: vscode.ExtensionContext, tourstop: Tourstop) {
    const tour: Tour | undefined = context.workspaceState.get("tour");
    if (tour === undefined) {
        console.warn("tour is undefined. Ignoring edit tourstop command");
    } else {
        vscode.window.showInputBox().then((title) => {
            if (title !== undefined) {
                tourstop.title = title;
                tour.writeToDisk();
                // TODO: showTour() is probably overkill here
                // TODO: if edited tourstop is currently shown in the web view, update it
                showTour(context, tour);
            }
        });
    }
}

/**
 * Edits the message of a Tourstop in the current Tour
 */
export function editMessage(context: vscode.ExtensionContext, tourstop: Tourstop) {
    const tour: Tour | undefined = context.workspaceState.get("tour");
    if (tour === undefined) {
        console.warn("tour is undefined. Ignoring edit tourstop command");
    } else {
        vscode.window.showInputBox().then((message) => {
            if (message !== undefined) {
                tourstop.message = message;
                // TODO: showTour() is probably overkill here
                // TODO: if edited tourstop is currently shown in the web view, update it
                tour.writeToDisk();
                showTour(context, tour);
            }
        });
    }
}

function moveTourstopUp(context: vscode.ExtensionContext, tourstop: Tourstop) {
    const tour: Tour | undefined = context.workspaceState.get("tour");
    if (tour) {
        tour.moveTourstopUp(tourstop);
        tour.writeToDisk();
        showTour(context, tour);
    }
}

function moveTourstopDown(context: vscode.ExtensionContext, tourstop: Tourstop) {
    const tour: Tour | undefined = context.workspaceState.get("tour");
    if (tour) {
        tour.moveTourstopDown(tourstop);
        tour.writeToDisk();
        showTour(context, tour);
    }
}

// TODO: this should probably be renamed, since it has nothing to do with moveTourstopUp/Down
function moveTourstop(context: vscode.ExtensionContext) {
    const tour: Tour | undefined = context.workspaceState.get("tour");
    if (tour) {
        const quickPickItems = tour.tourstops.map((tourstop) => new TourstopQuickPickItem(tourstop));
        vscode.window.showQuickPick<TourstopQuickPickItem>(quickPickItems, {canPickMany: false}).then((item) => {
            if (item) {
                const editor = vscode.window.activeTextEditor;
                if (editor) {
                    item.tourstop.filePath = editor.document.fileName;
                    item.tourstop.position = {
                        row: editor.selection.active.line,
                        col: editor.selection.active.character,
                    };
                    tour.writeToDisk();
                }
            }
        });
    }
}

/**
 * Starts a Tour from a .tour file
 */
function startTour(context: vscode.ExtensionContext) {
    vscode.window.showOpenDialog({
        openLabel: "Start tour",
        filters: {
            Tours: ["tour"],
        },
    }).then((uris: vscode.Uri[] | undefined) => {
        if (uris) {
            Tour.parseTour(uris[0]).then((tour: Tour) => {
                context.workspaceState.update("tour", tour);
                showTour(context, tour);
            });
        }
    });
}

/**
 * Creates a new Tour. Currently, a .tour file is not actually created until a Tourstop is added
 */
function newTour(context: vscode.ExtensionContext) {
    const folderName = vscode.workspace.rootPath ?
        vscode.workspace.rootPath.split(new RegExp(/\\|\//)).pop()
        : "My Tour";
    vscode.window.showInputBox({ value: folderName, prompt: "Tour name:" }).then((tourName) => {
        if (tourName !== undefined) {
            const filepath = vscode.workspace.rootPath + tourName.replace(" ", "_").toLowerCase() + ".tour";
            const tour: Tour = new Tour([], filepath);

            context.workspaceState.update("tour", tour);
            showTour(context, tour);
        }
    });
}

/**
 * Show the given tour in the sidebar
 */
function showTour(context: vscode.ExtensionContext, tour: Tour) {
    const touristView = vscode.window.createTreeView<Tourstop>("touristView", { treeDataProvider: tour });
    context.workspaceState.update("touristView", touristView);
}

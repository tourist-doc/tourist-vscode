'use strict';
import * as vscode from 'vscode';
import { Tour, Tourstop } from './tour';

/**
 * Called when a workspace is opened with a .tour file at the top level
 */
export function activate(context: vscode.ExtensionContext) {
    // If a .tour file exists at the top level of the workspace, parse it
    vscode.workspace.findFiles("*.tour").then(uris => {
        if (uris.length > 0) {
            // TODO:  decide how to handle multiple .tour files
            const tourfile = uris[0];
            Tour.parseTour(tourfile).then((tour: Tour) => {
                context.workspaceState.update('tour', tour);
                showTour(context, tour);
            }, (error) => {
                console.error(error);
            });
        } else {
            console.log("No .tour file found");
        }
    });

    context.subscriptions.push(
        vscode.commands.registerCommand('extension.gotoTourStop', (tourstop: Tourstop) => {
            gotoTourStop(context, tourstop);
        }));

    context.subscriptions.push(
        vscode.commands.registerCommand('extension.nextTourstop', () => {
            nextTourStop(context);
        }));

    context.subscriptions.push(
        vscode.commands.registerCommand('extension.prevTourstop', () => {
            prevTourStop(context);
        }));

    context.subscriptions.push(
        vscode.commands.registerCommand('extension.addTourStop', () => {
            const editor = vscode.window.activeTextEditor;
            if (editor === undefined) {
                return;
            }

            const tour: Tour | undefined = context.workspaceState.get('tour');

            if (tour === undefined) {
                console.error("Uh oh, tour was undefined!");
            } else {
                tour.addTourStop({
                    title: 'Shiny new tourstop',
                    message: 'Please explain here, oh wise one',
                    filePath: editor.document.fileName,
                    position: {
                        row: editor.selection.active.line,
                        col: editor.selection.active.character
                    }
                });
                tour.writeToDisk();
                showTour(context, tour);
            }
        }));

    context.subscriptions.push(
        vscode.commands.registerCommand('extension.deleteTourStop', (tourstop: Tourstop) => {
            const tour: Tour | undefined = context.workspaceState.get('tour');
            if (tour === undefined) {
                console.warn("tour is undefined. Ignoring add tourstop command");
            } else {
                tour.deleteTourStop(tourstop);
                tour.writeToDisk();
                showTour(context, tour);
            }
        }));

    context.subscriptions.push(
        vscode.commands.registerCommand('extension.editTitle', (tourstop: Tourstop) => {
            const tour: Tour | undefined = context.workspaceState.get('tour');
            if (tour === undefined) {
                console.warn("tour is undefined. Ignoring edit tourstop command");
            } else {
                vscode.window.showInputBox().then((title) => {
                    if (title !== undefined) {
                        tourstop.title = title;
                        tour.writeToDisk();
                        // TODO: showTour() is probably overkill here
                        showTour(context, tour);
                    }
                });
            }
        }));

    context.subscriptions.push(
        vscode.commands.registerCommand('extension.editMessage', (tourstop: Tourstop) => {
            const tour: Tour | undefined = context.workspaceState.get('tour');
            if (tour === undefined) {
                console.warn("tour is undefined. Ignoring edit tourstop command");
            } else {
                vscode.window.showInputBox().then((message) => {
                    if (message !== undefined) {
                        tourstop.message = message;
                        // TODO: showTour() is probably overkill here
                        tour.writeToDisk();
                        showTour(context, tour);
                    }
                });
            }
        }));

    context.subscriptions.push(
        vscode.commands.registerCommand('extension.newTour', () => {
            const folderName = vscode.workspace.rootPath ?
                vscode.workspace.rootPath.split(new RegExp(/\\|\//)).pop()
                : 'My Tour';
            vscode.window.showInputBox({ value: folderName, prompt: 'Tour name:' }).then((tourName) => {
                if (tourName !== undefined) {
                    const filepath = vscode.workspace.rootPath + tourName.replace(' ', '_').toLowerCase() + '.tour';
                    const tour: Tour = new Tour([], filepath);

                    context.workspaceState.update('tour', tour);
                    showTour(context, tour);
                }
            });
        }));

    const virtualDocumentProvider = new class implements vscode.TextDocumentContentProvider {
        provideTextDocumentContent(uri: vscode.Uri): string {
            return uri.path;
        }
    }();
    const disposable4 = vscode.workspace.registerTextDocumentContentProvider("tourist", virtualDocumentProvider);
    context.subscriptions.push(disposable4);
}

/**
 * Called when the extension is deactivated
 */
export function deactivate() {
}

/**
 * Goes to the given tourstop in the active editor
 */
function gotoTourStop(context: vscode.ExtensionContext, tourstop: Tourstop) {
    const tour: Tour | undefined = context.workspaceState.get('tour');
    const tourView: vscode.TreeView<Tourstop> | undefined = context.workspaceState.get('touristView');

    if (tour === undefined || tourView === undefined) {
        return;
    }

    tour.setCurrentTourstop(tourstop);
    tourView.reveal(tourstop);

    const file = vscode.Uri.file(tourstop.filePath);
    vscode.workspace.openTextDocument(file).then(doc => {
        vscode.window.showTextDocument(doc).then(editor => {
            const pos = new vscode.Position(tourstop.position.row, tourstop.position.col);
            editor.selection = new vscode.Selection(pos, pos);
            editor.revealRange(editor.selection, vscode.TextEditorRevealType.Default);

            // TODO:  put this behind a setting
            // vscode.window.showInformationMessage(tourstop.message);
        }).then(() => {
            let uri =  vscode.Uri.parse(`tourist:${tourstop.message}`);
            vscode.workspace.openTextDocument(uri).then(doc => {
                vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside, true);
            });
        });
    }, (error: any) => {
        console.error(error);
        vscode.window.showErrorMessage(`Unable to open ${file.fsPath}`);
    });
}

/**
 * Goes to the next tourstop in the active editor
 */
function nextTourStop(context: vscode.ExtensionContext) {
    const tour: Tour | undefined = context.workspaceState.get('tour');
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
function prevTourStop(context: vscode.ExtensionContext) {
    const tour: Tour | undefined = context.workspaceState.get('tour');
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
 * Show the given tour in the sidebar
 */
function showTour(context: vscode.ExtensionContext, tour: Tour) {
    const touristView = vscode.window.createTreeView<Tourstop>('touristView', { treeDataProvider: tour });
    context.workspaceState.update('touristView', touristView);
}

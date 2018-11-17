'use strict';
import * as vscode from 'vscode';

interface Tourstop {
    title: string;
    message: string;
    filePath: string;
    position: {
        row: number
        col: number
    };
}

/**
 * A wrapper around a list of Tourstops which provides data to the GUI
 */
class Tour implements vscode.TreeDataProvider<Tourstop> {
    private tourstops: Tourstop[] = [];

    constructor(stops: Tourstop[]) {
        this.tourstops = stops;
    }

    static parseTour(tourfile: vscode.Uri): Thenable<Tour> {
        return vscode.workspace.openTextDocument(tourfile).then((document) => {
            return new Tour(JSON.parse(document.getText()));
        }, (error: any) => {
            console.error(error);
            vscode.window.showErrorMessage(`Unable to open ${tourfile.fsPath}`);
        });
    }

    onDidChangeTreeData?: vscode.Event<Tourstop | null | undefined> | undefined;

    getTreeItem(element: Tourstop): vscode.TreeItem {
        return {
            label: element.title,
            tooltip: element.message,
            command: {
                title: 'lol what?', // TODO: what does this option actually do?
                command: "extension.gotoTourStop",
                arguments: [element]
            }
        };
    }

    getChildren(element?: Tourstop | undefined): vscode.ProviderResult<Tourstop[]> {
        return this.tourstops;
    }

    addTourStop(tourstop: Tourstop) {
        this.tourstops.push(tourstop);
    }
}

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
                showTour(tour);
            }, (error) => {
                console.error(error);
            });
        } else {
            console.log("No .tour file found");
        }
    });

    const disposable = vscode.commands.registerCommand('extension.gotoTourStop', gotoTourStop);
    context.subscriptions.push(disposable);

    const disposable2 = vscode.commands.registerCommand('extension.addTourStop', () => {
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
            context.workspaceState.update('tour', tour);
            showTour(tour);
        }
    });
    context.subscriptions.push(disposable2);
}

/**
 * Called when the extension is deactivated
 */
export function deactivate() {
}

/**
 * Goes to the given tourstop in the active editor
 */
function gotoTourStop(tourstop: Tourstop) {
    const file = vscode.Uri.file(tourstop.filePath);
    vscode.workspace.openTextDocument(file).then(doc => {
        vscode.window.showTextDocument(doc).then(editor => {
            const pos = new vscode.Position(tourstop.position.row, tourstop.position.col);
            editor.selection = new vscode.Selection(pos, pos);
            vscode.window.showInformationMessage(tourstop.message);
        });
    }, (error: any) => {
        console.error(error);
        vscode.window.showErrorMessage(`Unable to open ${file.fsPath}`);
    });
}

/**
 * Show the given tour in the sidebar
 */
function showTour(tour: Tour) {
    vscode.window.createTreeView<Tourstop>('touristView', { treeDataProvider: tour });
}

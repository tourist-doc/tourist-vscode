'use strict';
import * as vscode from 'vscode';
import * as fs from 'fs';

interface Tourstop {
    title: string;
    message: string;
    filePath: string;
    position: {
        row: number
        col: number
    };
}

class TourstopTreeItem extends vscode.TreeItem {
    tourstop: Tourstop;

    constructor (tourstop: Tourstop) { 
        super(tourstop.title);
        this.command = {
            title: 'lol what?', // TODO: what does this option actually do?
            command: "extension.gotoTourStop",
            arguments: [tourstop]
        };
        this.tooltip = tourstop.message;
        this.tourstop = tourstop;
    }
}

/**
 * A wrapper around a list of Tourstops which provides data to the GUI
 */
export class Tour implements vscode.TreeDataProvider<Tourstop> {
    private filepath?: string;
    private tourstops: Tourstop[];

    constructor(stops: Tourstop[] = [], filepath?: string) {
        this.filepath = filepath;
        this.tourstops = stops;
    }

    static parseTour(tourfile: vscode.Uri): Thenable<Tour> {
        return vscode.workspace.openTextDocument(tourfile).then((document) => {
            return new Tour(JSON.parse(document.getText()), tourfile.fsPath);
        }, (error: any) => {
            console.error(error);
            vscode.window.showErrorMessage(`Unable to open ${tourfile.fsPath}`);
        });
    }

    onDidChangeTreeData?: vscode.Event<Tourstop | null | undefined> | undefined;

    getTreeItem(element: Tourstop): TourstopTreeItem {
        return new TourstopTreeItem(element);
    }

    getChildren(element?: Tourstop | undefined): vscode.ProviderResult<Tourstop[]> {
        return this.tourstops;
    }

    addTourStop(tourstop: Tourstop) {
        this.tourstops.push(tourstop);
    }

    deleteTourStop(tourstop: Tourstop) {
        this.tourstops = this.tourstops.filter(stop => stop !== tourstop);
    }

    writeToDisk() {
        // TODO: is there a need to keep track of dirty state and only do IO if it changed?
        if (this.filepath) {
            console.log(`Attempting to save ${this.filepath}`);
            fs.writeFile(this.filepath, JSON.stringify(this.tourstops, null, 4), (err) => {
                if (err) {
                    console.log(err);
                    throw err;
                }
                console.log("The file has been saved!");
            });
        }
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

    context.subscriptions.push(
        vscode.commands.registerCommand('extension.gotoTourStop', gotoTourStop));

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
                showTour(tour);
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
                showTour(tour);
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
                        showTour(tour);
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
                        showTour(tour);
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
                    showTour(tour);
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
function gotoTourStop(tourstop: Tourstop) {
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
 * Show the given tour in the sidebar
 */
function showTour(tour: Tour) {
    vscode.window.createTreeView<Tourstop>('touristView', { treeDataProvider: tour });
}

'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

interface Tourstop {
    title: string,
    message: string
    filePath: string,
    position: vscode.Position,
}

class Tour implements vscode.TreeDataProvider<Tourstop> {
    private tourstops: Tourstop[];

    constructor(stops: Tourstop[]) {
        this.tourstops = stops;
    }

    onDidChangeTreeData?: vscode.Event<Tourstop | null | undefined> | undefined;

    getTreeItem(element: Tourstop): vscode.TreeItem {
        return {
            label: element.title,
            tooltip: element.message,
            command: {
                title: 'lol what?',
                command: "extension.gotoTourStop",
                arguments: [element]
            }
        };
    }

    getChildren(element?: Tourstop | undefined): vscode.ProviderResult<Tourstop[]> {
        return this.tourstops;
    }
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json
    let disposable = vscode.commands.registerCommand('extension.takeTour', () => {
        const tour = new Tour([{
            title: 'Tourstop #1',
            message: 'This is a message lol',
            filePath: 'src/extension.ts',
            position: new vscode.Position(25, 3)
        },
        {
            title: 'activate()',
            message: 'This function is called when the extension is activated!',
            filePath: 'C:/Users/jason/Desktop/tourist-vscode/src/extension.ts',
            position: new vscode.Position(40, 0)
        }]);
        vscode.window.createTreeView<Tourstop>('touristView', { treeDataProvider: tour });
    });

    context.subscriptions.push(disposable);

    disposable = vscode.commands.registerCommand('extension.gotoTourStop', (tourstop: Tourstop) => {
        const fileURI = vscode.Uri.file(tourstop.filePath);
        vscode.workspace.openTextDocument(fileURI).then(doc => {
            vscode.window.showTextDocument(doc).then(editor => {
                editor.selection = new vscode.Selection(tourstop.position, tourstop.position)
                vscode.window.showInformationMessage(tourstop.message);
            });
        }, (error: any) => {
            vscode.window.showErrorMessage(`Unable to open file ${fileURI.fsPath}`);
        });
    });

    context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {
}
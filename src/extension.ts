'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

interface Tourstop {
    filePath: string,
    lineNumber: number,
    message: string
}

class Tour implements vscode.TreeDataProvider<Tourstop> {
    private tourstops: Tourstop[];

    constructor(stops: Tourstop[]) {
        this.tourstops = stops;
    }

    onDidChangeTreeData?: vscode.Event<Tourstop | null | undefined> | undefined;

    getTreeItem(element: Tourstop): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return { label: element.message };
    }

    getChildren(element?: Tourstop | undefined): vscode.ProviderResult<Tourstop[]> {
        return this.tourstops;
    }
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    console.log('Congratulations, your extension "tourist" is now active!');

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json
    let disposable = vscode.commands.registerCommand('extension.takeTour', () => {
        const tour = new Tour([{
            filePath: '',
            lineNumber: 25,
            message: 'Tourstop #1'
        },
        {
            filePath: '',
            lineNumber: 10,
            message: 'Tourstop #2'
        }]);
        vscode.window.createTreeView<Tourstop>('touristView', { treeDataProvider: tour });
        vscode.window.showInformationMessage('Welcome to the tour lol');
    });

    context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {
}
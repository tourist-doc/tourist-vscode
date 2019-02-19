'use strict';
import * as fs from 'fs';
import * as vscode from 'vscode';

export interface Tourstop {
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
    private currentStopIndex?: number;

    constructor(stops: Tourstop[] = [], filepath?: string) {
        this.filepath = filepath;
        this.tourstops = stops;
        this.currentStopIndex = undefined;
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
      if (element === undefined) {
        return this.tourstops;
      } else {
        return [];
      }
    }
    
    getParent(element: Tourstop): vscode.ProviderResult<Tourstop> {
        return undefined;
    }

    getTourstops(): Tourstop[] {
        return this.tourstops;
    }

    setCurrentTourstop(tourstop: Tourstop) {
        this.currentStopIndex = this.tourstops.indexOf(tourstop);
    }

    addTourStop(tourstop: Tourstop) {
        this.tourstops.push(tourstop);
    }

    deleteTourStop(tourstop: Tourstop) {
        this.tourstops = this.tourstops.filter(stop => stop !== tourstop);
    }

    moveTourstopUp(tourstop: Tourstop) {
        const index = this.tourstops.indexOf(tourstop);
        if (index > 0) {
            const other = this.tourstops[index - 1];
            this.tourstops[index - 1] = tourstop;
            this.tourstops[index] = other;
        }
    }

    moveTourstopDown(tourstop: Tourstop) {
        const index = this.tourstops.indexOf(tourstop);
        if (index < this.tourstops.length - 1) {
            const other = this.tourstops[index + 1];
            this.tourstops[index + 1] = tourstop;
            this.tourstops[index] = other;
        }
    }

    /**
     * Returns the next tourstop, if it exists, and undefined otherwise.
     */
    nextTourStop(): Tourstop | undefined {
        if (this.currentStopIndex && this.currentStopIndex < this.tourstops.length) {
            return this.tourstops[this.currentStopIndex + 1];
        }
        return undefined;
    }

    /**
     * Returns the next tourstop, if it exists, and undefined otherwise.
     */
    prevTourStop(): Tourstop | undefined {
        if (this.currentStopIndex && this.currentStopIndex > 0) {
            return this.tourstops[this.currentStopIndex - 1];
        }
        return undefined;
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
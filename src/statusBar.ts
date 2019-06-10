import * as vscode from "vscode";
import { tourState } from "./globals";

const statusBarItem = vscode.window.createStatusBarItem(
  vscode.StatusBarAlignment.Right,
  10000,
);

export function init() {
  statusBarItem.color = new vscode.ThemeColor("terminal.ansiRed");
}

export function refresh() {
  if (tourState && tourState.currentStop) {
    statusBarItem.text = `$(milestone) ${tourState.currentStop.title}`;
    statusBarItem.command = "tourist.gotoTourstop";
  } else if (tourState) {
    statusBarItem.text = `$(milestone) ${tourState.tourFile.title}`;
    statusBarItem.command = "tourist.startTour";
  } else {
    statusBarItem.text = `$(milestone) Start a tour`;
    statusBarItem.command = "tourist.startTour";
  }
  statusBarItem.show();
}

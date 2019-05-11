import { AbsoluteTourStop } from "tourist";
import * as vscode from "vscode";

const statusBarItem = vscode.window.createStatusBarItem(
  vscode.StatusBarAlignment.Right,
  10000,
);

export function init() {
  setTourStop(undefined);
  statusBarItem.color = new vscode.ThemeColor("terminal.ansiRed");
  statusBarItem.show();
}

export function setTourStop(stop: AbsoluteTourStop | undefined) {
  if (stop) {
    statusBarItem.text = `$(milestone) ${stop.title}`;
    statusBarItem.command = "tourist.gotoTourstop";
  } else {
    statusBarItem.text = `$(milestone) Start a tour`;
    statusBarItem.command = "tourist.startTour";
  }
}

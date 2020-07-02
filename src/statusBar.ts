import * as vscode from "vscode";
import { statusBarItemColor } from "./config";
import { tourState, touristClient } from "./globals";

const statusBarItem = vscode.window.createStatusBarItem(
  vscode.StatusBarAlignment.Right,
  10000,
);

export function updateColor() {
  statusBarItem.color = statusBarItemColor();
}

export async function refresh() {
  if (tourState && tourState.stopId) {
    statusBarItem.text = `$(milestone) ${
      (await touristClient.viewStop(tourState.tourId, tourState.stopId)).title
    }`;
    statusBarItem.command = "tourist.gotoTourstop";
  } else if (tourState) {
    statusBarItem.text = `$(milestone) ${
      (await touristClient.viewTour(tourState.tourId)).title
    }`;
    statusBarItem.command = "tourist.startTour";
  } else {
    statusBarItem.text = `$(milestone) Start a tour`;
    statusBarItem.command = "tourist.startTour";
  }
  statusBarItem.show();
}

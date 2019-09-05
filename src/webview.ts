import * as vscode from "vscode";

import * as commands from "./commands";
import * as config from "./config";
import { context } from "./extension";
import { tourState } from "./globals";
import { TourStopWebview } from "./tourStopWebview";
import { TourWebview } from "./tourWebview";

/**
 * A singleton that controls the webview. Makes heavy use of global state with
 * the assumption that for now, only one extension-wide webview will exist.
 */
export class TouristWebview {
  public static async init() {
    this.tourWebview = new TourWebview(
      (await vscode.workspace.openTextDocument(
        context!.asAbsolutePath("dist/tour.html"),
      )).getText(),
    );

    this.tourStopWebview = new TourStopWebview(
      (await vscode.workspace.openTextDocument(
        context!.asAbsolutePath("dist/tourstop.html"),
      )).getText(),
    );
  }

  /**
   * Updates the webview to be consistent with globals.tourState
   */
  public static async refresh() {
    if (!config.showWebview()) {
      TouristWebview.close();
      return;
    }

    if (tourState) {
      if (tourState.currentStop) {
        await this.tourStopWebview.update();
      } else {
        await this.tourWebview.update();
      }
    } else if (this.panel) {
      TouristWebview.close();
    }
  }

  /**
   * Closes the webview
   */
  public static close() {
    if (this.panel) {
      this.panel.dispose();
    }
  }

  public static setEditing(editing: boolean) {
    this.tourStopWebview.setEditing(editing);
  }

  public static getPanel(): vscode.WebviewPanel {
    if (this.panel === undefined) {
      this.panel = vscode.window.createWebviewPanel(
        "tour",
        "title",
        config.webviewColumn(),
        { enableScripts: true },
      );
      this.panel.onDidDispose(async (event) => {
        await commands.stopTour();
        this.panel = undefined;
      });
      this.panel.webview.onDidReceiveMessage(async (msg) => {
        if (tourState) {
          if (tourState.currentStop) {
            await this.tourStopWebview.handleMessage(msg);
          } else {
            await this.tourWebview.handleMessage(msg);
          }
        }
      });
    }
    return this.panel!;
  }

  /** The panel that contains the webview. Use `getPanel()` instead of accessing directly. */
  private static panel?: vscode.WebviewPanel;

  private static tourWebview: TourWebview;
  private static tourStopWebview: TourStopWebview;
}

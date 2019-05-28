import { template } from "dot";
import * as showdown from "showdown";
import * as vscode from "vscode";

import * as commands from "./commands";
import * as config from "./config";
import { context, updateGUI } from "./extension";
import { tourState } from "./globals";
import { TourFile } from "./tourFile";

interface TourTemplateArgs {
  tf: TourFile;
}

interface TourStopTemplateArgs {
  title: string;
  body: string;
  editingBody: boolean;
}

/**
 * A singleton that controls the webview. Makes heavy use of global state with
 * the assumption that for now, only one extension-wide webview will exist.
 */
export class TouristWebview {
  public static async init() {
    const tourTemplateDoc = await vscode.workspace.openTextDocument(
      context!.asAbsolutePath("src/tour.html"),
    );
    const t = tourTemplateDoc
      .getText()
      .replace(/webviewFontSize/g, config.webviewFontSize().toString())
      .replace(/webviewFont/g, config.webviewFont());
    this.tourTemplate = template(t);

    const tourStopTemplateDoc = await vscode.workspace.openTextDocument(
      context!.asAbsolutePath("src/tourstop.html"),
    );
    this.tourStopTemplate = template(
      tourStopTemplateDoc
        .getText()
        .replace(/webviewFontSize/g, config.webviewFontSize().toString())
        .replace(/webviewFont/g, config.webviewFont()),
    );

    this.mdConverter.setFlavor("github");
  }

  /**
   * Updates the webview to be consistent with globals.tourState
   */
  public static refresh() {
    if (tourState) {
      if (tourState.currentStop) {
        this.getPanel().title = tourState.currentStop.title;
        this.getPanel().webview.html = this.tourStopTemplate!({
          title: tourState.currentStop.title,
          body: this.editingBody
            ? tourState.currentStop.body || ""
            : this.mdConverter.makeHtml(tourState.currentStop.body || ""),
          editingBody: this.editingBody,
        });
      } else {
        this.getPanel().title = tourState!.tourFile.title;
        this.getPanel().webview.html = this.tourTemplate!({
          tf: tourState!.tourFile,
        });
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
    this.editingBody = editing;
  }

  /** The panel that contains the webview */
  private static panel?: vscode.WebviewPanel;

  /** An object that converts markdown into HTML */
  private static mdConverter = new showdown.Converter();

  /** A `doT` template that renders a TourFile */
  private static tourTemplate: (args: TourTemplateArgs) => string;

  /** A `doT` template that renders a TourStop */
  private static tourStopTemplate: (args: TourStopTemplateArgs) => string;

  /** Whether the body is currently being edited (the TextArea is showing) */
  private static editingBody: boolean = false;

  private static getPanel(): vscode.WebviewPanel {
    if (this.panel === undefined) {
      this.panel = vscode.window.createWebviewPanel(
        "tour",
        "title",
        config.webviewColumn(),
        { enableScripts: true },
      );
      this.panel.webview.onDidReceiveMessage(async (message: any) => {
        switch (message.command) {
          // TODO: This comment implies a code smell. Break this class into two
          // TourFile webview
          case "gotoTourstop":
            await commands.gotoTourStop(
              tourState!.tour.stops[message.stopIndex],
            );
            break;
          case "mapRepo":
            await commands.mapRepo(message.repo);
            break;
          case "editDescription":
            await commands.editDescription(tourState!.tourFile);
            break;

          // TourStop webview
          case "nextTourstop":
            await commands.nextTourStop();
            break;
          case "prevTourstop":
            await commands.prevTourStop();
            break;
          case "editTitle":
            if (tourState!.currentStop) {
              await commands.editTitle(tourState!.currentStop);
            } else {
              await commands.renameTour(tourState!.tourFile);
            }
            break;
          case "editBody":
            this.editingBody = true;
            break;
          case "editBodyCancel":
            this.editingBody = false;
            break;
          case "editBodySave":
            this.editingBody = false;
            if (
              tourState!.currentStop !== undefined &&
              message.newBody !== undefined
            ) {
              await commands.editBody(tourState!.currentStop, message.newBody);
            }
            break;
          case "backToTour":
            tourState!.currentStop = undefined;
            break;
        }
        updateGUI();
      });
      this.panel.onDidDispose(async (event) => {
        await commands.stopTour();
        this.panel = undefined;
      });
    }
    return this.panel!;
  }
}

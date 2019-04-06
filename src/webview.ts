import { template } from "dot";
import * as showdown from "showdown";
import { AbsoluteTourStop, BrokenTourStop, Tour } from "tourist";
import * as vscode from "vscode";

import * as config from "./config";
import {
  editMessage,
  editTitle,
  nextTourStop,
  prevTourStop,
} from "./extension";
import { TourState } from "./tourState";

interface TemplateArgs {
  title: string;
  message: string;
}

export class TouristWebview {
  public static setContext(ctx: vscode.ExtensionContext) {
    this.context = ctx;
    vscode.workspace
      .openTextDocument(this.context.asAbsolutePath("src/webview.html"))
      .then((templateDoc) => {
        this.htmlTemplate = template(templateDoc.getText());
      });
  }

  public static showTourStop(
    tourState: TourState,
    stop: AbsoluteTourStop | BrokenTourStop,
  ) {
    if (this.htmlTemplate === undefined) {
      console.error("htmlTemplate is undefined in showTourstop()");
      return;
    }

    this.tourStop = stop;
    this.getPanel(tourState).title = stop.title;
    this.getPanel(tourState).webview.html = this.htmlTemplate({
      title: stop.title,
      message: this.mdConverter.makeHtml(stop.body || ""),
    });
  }

  private static panel?: vscode.WebviewPanel;
  private static mdConverter = new showdown.Converter();
  private static htmlTemplate?: (args: TemplateArgs) => string;
  private static tourStop?: AbsoluteTourStop | BrokenTourStop;

  // TODO: Don't use this context bullshit
  private static context: vscode.ExtensionContext;

  private static getPanel(tourState: TourState): vscode.WebviewPanel {
    if (this.panel === undefined) {
      if (tourState.tour === undefined) {
        throw new Error("No tour file!");
      }

      this.panel = vscode.window.createWebviewPanel(
        "tour",
        "title",
        config.webviewColumn(),
        { enableScripts: true },
      );
      this.panel.webview.onDidReceiveMessage((message: any) => {
        switch (message.command) {
          case "nextTourstop":
            nextTourStop(this.context);
            break;
          case "prevTourstop":
            prevTourStop(this.context);
            break;
          case "editTitle":
            editTitle(this.context, this.tourStop!);
            break;
          case "editMessage":
            editMessage(this.context, this.tourStop!);
            break;
        }
      });
      this.panel.onDidDispose((event) => {
        this.panel = undefined;
      });
    }
    return this.panel!;
  }
}

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
  editingMessage: boolean;
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

  public static setTourStop(
    tour: Tour,
    stop: AbsoluteTourStop | BrokenTourStop,
  ) {
    if (this.htmlTemplate === undefined) {
      console.error("htmlTemplate is undefined in showTourstop()");
      return;
    }

    this.tour = tour;
    this.stop = stop;

    this.refresh();
  }

  private static panel?: vscode.WebviewPanel;
  private static mdConverter = new showdown.Converter();
  private static htmlTemplate?: (args: TemplateArgs) => string;
  private static tour?: Tour;
  private static stop?: AbsoluteTourStop | BrokenTourStop;
  private static editingMessage: boolean = false;

  // TODO: Don't use this context bullshit
  private static context: vscode.ExtensionContext;

  private static refresh() {
    if (
      this.htmlTemplate === undefined ||
      this.tour === undefined ||
      this.stop === undefined
    ) {
      this.getPanel().title = "";
      this.getPanel().webview.html = "";
      return;
    }

    this.getPanel().title = this.stop.title;
    this.getPanel().webview.html = this.htmlTemplate({
      title: this.stop.title,
      message: this.editingMessage
        ? this.stop.body || ""
        : this.mdConverter.makeHtml(this.stop.body || ""),
      editingMessage: this.editingMessage,
    });
  }

  private static getPanel(): vscode.WebviewPanel {
    if (this.panel === undefined) {
      if (this.tour === undefined) {
        throw new Error("No tour!");
      }

      this.panel = vscode.window.createWebviewPanel(
        "tour",
        "title",
        config.webviewColumn(),
        { enableScripts: true },
      );
      this.panel.webview.onDidReceiveMessage(async (message: any) => {
        switch (message.command) {
          case "nextTourstop":
            nextTourStop(this.context);
            break;
          case "prevTourstop":
            prevTourStop(this.context);
            break;
          case "editTitle":
            editTitle(this.context, this.stop!);
            break;
          case "editMessage":
            this.editingMessage = true;
            this.refresh();
            break;
          case "editMessageCancel":
            this.editingMessage = false;
            this.refresh();
            break;
          case "editMessageSave":
            this.editingMessage = false;
            if (
              this.stop !== undefined &&
              message.newMessage !== undefined
            ) {
              await editMessage(this.context, this.stop, message.newMessage);
            }
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

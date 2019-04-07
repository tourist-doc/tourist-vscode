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

interface TemplateArgs {
  title: string;
  message: string;
  editingMessage: boolean;
}

export class TouristWebview {
  public static async init(ctx: vscode.ExtensionContext) {
    const templateDoc = await vscode.workspace.openTextDocument(
      ctx.asAbsolutePath("src/webview.html"),
    );
    this.htmlTemplate = template(templateDoc.getText());
  }

  public static setTourStop(
    tour: Tour,
    stop: AbsoluteTourStop | BrokenTourStop,
  ) {
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

  private static refresh() {
    if (this.tour === undefined || this.stop === undefined) {
      this.getPanel().title = "";
      this.getPanel().webview.html = "";
      return;
    }

    this.getPanel().title = this.stop.title;
    this.getPanel().webview.html = this.htmlTemplate!({
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
            nextTourStop();
            break;
          case "prevTourstop":
            prevTourStop();
            break;
          case "editTitle":
            editTitle(this.stop!);
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
            if (this.stop !== undefined && message.newMessage !== undefined) {
              await editMessage(this.stop, message.newMessage);
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

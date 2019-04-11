import { template } from "dot";
import * as showdown from "showdown";
import { AbsoluteTourStop, BrokenTourStop, Tour } from "tourist";
import * as vscode from "vscode";

import * as config from "./config";
import { Commands } from "./commands";

interface TemplateArgs {
  title: string;
  body: string;
  editingBody: boolean;
}

// TODO: consider using a module instead
export class TouristWebview {
  public static async init(ctx: vscode.ExtensionContext) {
    const templateDoc = await vscode.workspace.openTextDocument(
      ctx.asAbsolutePath("src/webview.html"),
    );
    this.htmlTemplate = template(templateDoc.getText());
  }

  /**
   * Updates the webview to reflect the given stop
   * @param tour The tour in which `stop` is contained
   * @param stop The stop to be displayed
   */
  public static setTourStop(
    tour: Tour,
    stop: AbsoluteTourStop | BrokenTourStop,
  ) {
    this.tour = tour;
    this.stop = stop;

    this.refresh();
  }

  /**
   * Closes the webview
   */
  public static close() {
    if (this.panel) {
      this.panel.dispose();
    }
  }

  /** The panel that contains the webview */
  private static panel?: vscode.WebviewPanel;

  /** An object that converts markdown into HTML */
  private static mdConverter = new showdown.Converter();

  /** The `doT` template that is rendered in the webview */
  private static htmlTemplate?: (args: TemplateArgs) => string;

  /** The current tourstop being shown */
  private static stop?: AbsoluteTourStop | BrokenTourStop;

  /** The tour that `this.stop` is contained in */
  private static tour?: Tour;

  /** Whether the body is currently being edited (the TextArea is showing) */
  private static editingBody: boolean = false;

  private static refresh() {
    if (this.tour === undefined || this.stop === undefined) {
      this.getPanel().title = "";
      this.getPanel().webview.html = "";
      return;
    }

    this.getPanel().title = this.stop.title;
    this.getPanel().webview.html = this.htmlTemplate!({
      title: this.stop.title,
      body: this.editingBody
        ? this.stop.body || ""
        : this.mdConverter.makeHtml(this.stop.body || ""),
      editingBody: this.editingBody,
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
            await Commands.nextTourStop();
            break;
          case "prevTourstop":
            await Commands.prevTourStop();
            break;
          case "editTitle":
            await Commands.editTitle(this.stop!);
            break;
          case "editBody":
            this.editingBody = true;
            this.refresh();
            break;
          case "editBodyCancel":
            this.editingBody = false;
            this.refresh();
            break;
          case "editBodySave":
            this.editingBody = false;
            if (this.stop !== undefined && message.newBody !== undefined) {
              await Commands.editBody(this.stop, message.newBody);
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

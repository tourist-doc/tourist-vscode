import { template } from "dot";
import * as showdown from "showdown";
import * as vscode from "vscode";

import { editMessage, editTitle, nextTourStop, prevTourStop } from "./extension";
import { Tour, Tourstop } from "./tour";

interface TemplateArgs {
  title: string;
  message: string;
}

export class TouristWebview {
  public static setContext(ctx: vscode.ExtensionContext) {
    this.context = ctx;
    vscode.workspace.openTextDocument(this.context.asAbsolutePath("src/webview.html")).then(((templateDoc) => {
      this.htmlTemplate = template(templateDoc.getText());
    }));
  }

  public static showTourstop(tour: Tour, tourstop: Tourstop) {
    if (this.htmlTemplate === undefined) {
      console.error("htmlTemplate is undefined in showTourstop()");
      return;
    }

    this.tourstop = tourstop;
    this.getPanel().title = tourstop.title;
    this.getPanel().webview.html = this.htmlTemplate({
      title: tourstop.title,
      message: this.mdConverter.makeHtml(tourstop.message),
    });
  }

  private static panel?: vscode.WebviewPanel;
  private static mdConverter = new showdown.Converter();
  private static htmlTemplate?: (args: TemplateArgs) => string;
  private static tourstop?: Tourstop;

  // TODO: Don't use this context bullshit
  private static context: vscode.ExtensionContext;

  private static getPanel(): vscode.WebviewPanel {
    if (this.panel === undefined) {
      const tour: Tour | undefined = this.context.workspaceState.get("tour");
      if (tour === undefined) {
        throw new Error("No tour file!");
      }

      this.panel = vscode.window.createWebviewPanel("tour", "title", vscode.ViewColumn.Beside, { enableScripts: true });
      this.panel.webview.onDidReceiveMessage((message: any) => {
        switch (message.command) {
          case "nextTourstop":
            nextTourStop(this.context);
            break;
          case "prevTourstop":
            prevTourStop(this.context);
            break;
          case "editTitle":
              editTitle(this.context, this.tourstop!);
              break;
          case "editMessage":
              editMessage(this.context, this.tourstop!);
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

import * as showdown from "showdown";
import * as vscode from "vscode";

import { editMessage, editTitle, nextTourStop, prevTourStop } from "./extension";
import { Tour, Tourstop } from "./tour";

export class TouristWebview {
  public static setContext(ctx: vscode.ExtensionContext) {
    this.context = ctx;
  }

  public static showTourstop(tour: Tour, tourstop: Tourstop) {
    this.getPanel().title = tourstop.title;

    const title = this.mdConverter.makeHtml(`#${tourstop.title}#`);
    const message = this.mdConverter.makeHtml(tourstop.message);
    const tourstopIndex = tour.tourstops.indexOf(tourstop);
    this.getPanel().webview.html =
    `
    <script>
      const vscode = acquireVsCodeApi();
    </script>
    ${title}
    ${message}
    <hr>
    <div style="user-select: none;">
      <a onclick='vscode.postMessage({command: "prevTourstop"});' style='cursor: pointer;'>Previous tourstop</a> |
      <a onclick='vscode.postMessage({command: "nextTourstop"});' style='cursor: pointer;'>Next tourstop</a>
      <br>
      <a onclick='vscode.postMessage({command: "editTitle", tourstopIndex: ${tourstopIndex}});' style='cursor: pointer;'>Edit title</a>
      <br>
      <a onclick='vscode.postMessage({command: "editMessage", tourstopIndex: ${tourstopIndex}});' style='cursor: pointer;'>Edit message</a>
    </div>
    `;
  }

  private static panel: vscode.WebviewPanel | undefined;
  private static mdConverter = new showdown.Converter();

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
        const tourstop = message.tourstopIndex !== undefined ? tour.getTourstops()[message.tourstopIndex] : undefined;
        switch (message.command) {
          case "nextTourstop":
            nextTourStop(this.context);
            break;
          case "prevTourstop":
            prevTourStop(this.context);
            break;
          case "editTitle":
              editTitle(this.context, tourstop!);
              break;
          case "editMessage":
              editMessage(this.context, tourstop!);
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

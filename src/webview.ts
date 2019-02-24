import * as vscode from "vscode";
import * as showdown from 'showdown';
import { Tourstop } from './tour';
import { nextTourStop, prevTourStop } from './extension';

export class TouristWebview {
  private static panel: vscode.WebviewPanel | undefined;
  private static mdConverter = new showdown.Converter();
  private static context: vscode.ExtensionContext;

  public static setContext(ctx: vscode.ExtensionContext) {
    this.context = ctx;
  }

  private static getPanel(): vscode.WebviewPanel {
    if (this.panel === undefined) {
      this.panel = vscode.window.createWebviewPanel('tour', 'title', vscode.ViewColumn.Beside, { enableScripts: true });
      this.panel.webview.onDidReceiveMessage((message: any) => {
        switch (message.command) {
          case 'nextTourstop':
            nextTourStop(this.context);
            break;
          case 'prevTourstop':
            prevTourStop(this.context);
            break;
        }
      });
    }
    return this.panel!;
  }

  public static showTourstop(tourstop: Tourstop) {
    this.getPanel().title = tourstop.title;

    const title = this.mdConverter.makeHtml(`#${tourstop.title}#`);
    const message = this.mdConverter.makeHtml(tourstop.message);
    this.getPanel().webview.html =
    `
    <script>
    const vscode = acquireVsCodeApi();
    function nextTourstop() {
      vscode.postMessage({
        command: 'nextTourstop'
      });
    }
    function prevTourstop() {
      vscode.postMessage({
        command: 'prevTourstop'
      });
    }
    </script>
    ${title}
    ${message}
    <a onclick="nextTourstop()" style="cursor: pointer; user-select: none;">Next tourstop</a> | 
    <a onclick="prevTourstop()" style="cursor: pointer; user-select: none;">Previous tourstop</a>
    `;
  }
}
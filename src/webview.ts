import * as vscode from "vscode";
import * as showdown from 'showdown';
import { Tourstop } from './tour';

export class TouristWebview {
  private static panel: vscode.WebviewPanel | undefined;
  private static mdConverter = new showdown.Converter();

  private static getPanel(): vscode.WebviewPanel {
    if (this.panel === undefined) {
      this.panel = vscode.window.createWebviewPanel('tour', 'title', vscode.ViewColumn.Beside);
    }
    return this.panel!;
  }

  public static showTourstop(tourstop: Tourstop) {
    this.getPanel().title = tourstop.title;
    this.getPanel().webview.html = this.mdConverter.makeHtml(
      '#' + tourstop.title + '#\n\n' + tourstop.message
    );
    //this.getPanel().reveal();//vscode.ViewColumn.Beside, true);
  }
}
import * as vscode from "vscode";

export let exclamIcon = "";

export function init(ctx: vscode.ExtensionContext) {
  exclamIcon = ctx.asAbsolutePath("resources/alert.png");
}

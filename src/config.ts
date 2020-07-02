import {
  ConfigurationChangeEvent,
  TextEditorDecorationType,
  TextEditorRevealType,
  ThemeColor,
  ViewColumn,
  window,
  workspace,
} from "vscode";
import * as codeLenses from "./codeLenses";
import { TouristWebview } from "./webview";
import * as vscode from "vscode";
import { updateColor } from "./statusBar";

let activeTourstopDecorationTypeCached: TextEditorDecorationType | undefined;
let inactiveTourstopDecorationTypeCached: TextEditorDecorationType | undefined;
let newTourstopDecorationTypeCached: TextEditorDecorationType | undefined;

/**
 * Called when the user updates their configuration
 * @param evt The event
 */
export async function configChanged(evt: ConfigurationChangeEvent) {
  if (evt.affectsConfiguration("tourist.showDecorations")) {
    showDecorations();
  } else if (evt.affectsConfiguration("tourist.useCodeLens")) {
    codeLenses.provider.refresh();
  } else if (
    evt.affectsConfiguration("tourist.webviewFont") ||
    evt.affectsConfiguration("tourist.webviewFontSize")
  ) {
    TouristWebview.init();
    await TouristWebview.refresh();
  } else if (evt.affectsConfiguration("tourist.showWebview")) {
    await TouristWebview.refresh();
  } else if (evt.affectsConfiguration("tourist.activeTourstopColor")) {
    activeTourstopDecorationTypeCached = undefined;
  } else if (evt.affectsConfiguration("tourist.inactiveTourstopColor")) {
    inactiveTourstopDecorationTypeCached = undefined;
  } else if (evt.affectsConfiguration("tourist.newTourstopColor")) {
    newTourstopDecorationTypeCached = undefined;
  } else if (evt.affectsConfiguration("tourist.statusBarItemColor")) {
    updateColor();
  }
}

/**
 * Whether CodeLenses should be displayed at each tourstop
 */
export function useCodeLens(): boolean {
  return workspace.getConfiguration().get<boolean>("tourist.useCodeLens", true);
}

/**
 * Whether text decorations (like highlighting) should be displayed at each tourstop
 */
export function showDecorations(): boolean {
  return workspace
    .getConfiguration()
    .get<boolean>("tourist.showDecorations", true);
}

/**
 * Whether the `addBreakpoints` command creates active breakpoints
 */
export function breakpointsActive(): boolean {
  return workspace
    .getConfiguration()
    .get<boolean>("tourist.breakpointsActive", true);
}

/**
 * Where, when you jump to a tourstop, the tourstop is in your viewport
 *
 * For instance, if `Center` is chosen and you jump to a tourstop, it will be
 * placed in the center of your screen.
 */
export function tourstopRevealLocation(): TextEditorRevealType {
  switch (
    workspace
      .getConfiguration()
      .get<"Center" | "Top">("tourist.tourstopRevealLocation", "Center")
  ) {
    case "Center":
      return TextEditorRevealType.InCenter;
    case "Top":
      return TextEditorRevealType.AtTop;
  }
}

/**
 * Which editor column the webview is shown in
 *
 * See https://code.visualstudio.com/api/references/vscode-api#ViewColumn
 */
export function webviewColumn(): ViewColumn {
  switch (
    workspace.getConfiguration().get<string>("tourist.webviewColumn", "Left")
  ) {
    case "Left":
      return ViewColumn.One;
    case "Right":
    default:
      return ViewColumn.Two;
  }
}

/**
 * The font to be used in the webview
 */
export function webviewFont(): string {
  const fontFromCfg = workspace
    .getConfiguration()
    .get<string>("tourist.webviewFont");
  if (fontFromCfg) {
    if (fontFromCfg === "editor") {
      return workspace.getConfiguration().get<string>("editor.fontFamily")!;
    }
    return fontFromCfg;
  }

  return "";
}

/**
 * The font size to be used in the webview
 */
export function webviewFontSize(): number {
  return workspace
    .getConfiguration()
    .get<number>("tourist.webviewFontSize", 15);
}

export function binaryPath(): string {
  return workspace
    .getConfiguration()
    .get<string>("tourist.binaryPath", "tourist");
}

/**
 * The directories in which we look for .tour files
 */
export function tourDirectories(): string[] {
  return workspace
    .getConfiguration()
    .get<string[]>("tourist.tourDirectories", []);
}

export function showWebview(): boolean {
  return workspace.getConfiguration().get<boolean>("tourist.showWebview", true);
}

export function readOnlyByDefault(): boolean {
  return workspace
    .getConfiguration()
    .get<boolean>("tourist.readOnlyByDefault", true);
}

/** The text decoration shown on the active tourstop */
export function activeTourstopDecorationType(): TextEditorDecorationType {
  if (!activeTourstopDecorationTypeCached) {
    const color = new ThemeColor(
      workspace
        .getConfiguration()
        .get<string>(
          "tourist.activeTourstopColor",
          "merge.incomingHeaderBackground",
        ),
    );
    activeTourstopDecorationTypeCached = window.createTextEditorDecorationType({
      backgroundColor: color,
      overviewRulerColor: color,
      isWholeLine: true,
    });
  }

  return activeTourstopDecorationTypeCached!;
}

/** The text decoration shown on inactive tourstops */
export function inactiveTourstopDecorationType(): TextEditorDecorationType {
  if (!inactiveTourstopDecorationTypeCached) {
    const color = new ThemeColor(
      workspace
        .getConfiguration()
        .get<string>(
          "tourist.inactiveTourstopColor",
          "merge.incomingContentBackground",
        ),
    );
    inactiveTourstopDecorationTypeCached = window.createTextEditorDecorationType(
      {
        backgroundColor: color,
        overviewRulerColor: color,
        isWholeLine: true,
      },
    );
  }

  return inactiveTourstopDecorationTypeCached!;
}

/** The text decoration shown when adding a new stop */
export function newTourstopDecorationType(): TextEditorDecorationType {
  if (!newTourstopDecorationTypeCached) {
    const color = new ThemeColor(
      workspace
        .getConfiguration()
        .get<string>(
          "tourist.newTourstopColor",
          "merge.currentHeaderBackground",
        ),
    );
    newTourstopDecorationTypeCached = window.createTextEditorDecorationType({
      backgroundColor: color,
      overviewRulerColor: color,
      isWholeLine: true,
    });
  }

  return newTourstopDecorationTypeCached!;
}

/** The path at which .tour files will be saved by default */
export function defaultTourSaveLocation() {
  const cfgVal = workspace
    .getConfiguration()
    .get<string>("tourist.defaultTourSaveLocation", "");
  return cfgVal
    ? cfgVal
    : vscode.workspace.workspaceFolders
    ? vscode.workspace.workspaceFolders[0].uri.fsPath
    : "";
}

/** The color of the tourist status bar item */
export function statusBarItemColor() {
  return workspace
    .getConfiguration()
    .get<string>("tourist.statusBarItemColor", "#ffffff");
}

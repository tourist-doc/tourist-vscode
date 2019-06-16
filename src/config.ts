import { TextEditorRevealType, ViewColumn, workspace } from "vscode";

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
 * When startTour() is run, should gotoTourstop(firstStop) be run?
 */
export function gotoFirstTourstopOnTourStart(): boolean {
  return workspace
    .getConfiguration()
    .get<boolean>("tourist.gotoFirstTourstopOnTourStart", true);
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

// TODO: Consider making this a part of TourState, with "open for writing" and "open for reading" different commands
export function showEditControls(): boolean {
  return workspace
    .getConfiguration()
    .get<boolean>("tourist.showEditControls", true);
}

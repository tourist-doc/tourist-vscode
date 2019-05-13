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
  // TODO: consider limiting the options to sane ones: 1, 2, 3, Active, Beside?
  switch (
    workspace
      .getConfiguration()
      .get<number | string>("tourist.webviewColumn", "Beside")
  ) {
    case 1:
      return ViewColumn.One;
    case 2:
      return ViewColumn.Two;
    case 3:
      return ViewColumn.Three;
    case 4:
      return ViewColumn.Four;
    case 5:
      return ViewColumn.Five;
    case 6:
      return ViewColumn.Six;
    case 7:
      return ViewColumn.Seven;
    case 8:
      return ViewColumn.Eight;
    case 9:
      return ViewColumn.Nine;
    case "Active":
      return ViewColumn.Active;
    case "Beside":
    default:
      return ViewColumn.Beside;
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

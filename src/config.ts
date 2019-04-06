import { ViewColumn, workspace } from "vscode";

export function useCodeLens(): boolean {
  return workspace.getConfiguration().get<boolean>("tourist.useCodeLens", true);
}

export function breakpointsActive() {
  return workspace
    .getConfiguration()
    .get<boolean>("tourist.breakpointsActive", true);
}

export function webviewColumn(): ViewColumn {
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

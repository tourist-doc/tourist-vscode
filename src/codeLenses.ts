import * as vscode from "vscode";
import { AbsoluteTourStop, BrokenTourStop, isNotBroken } from "tourist";

import * as config from "./config";
import { Util } from "./util";
import { Globals } from "./globals";

export class TouristCodeLensProvider implements vscode.CodeLensProvider {
  public provideCodeLenses(
    document: vscode.TextDocument,
    token: vscode.CancellationToken,
  ): vscode.ProviderResult<vscode.CodeLens[]> {
    if (!config.useCodeLens()) {
      return [];
    }

    const lenses = [] as vscode.CodeLens[];
    if (Globals.tourState) {
      Globals.tourState.tour.stops.forEach(
        (stop: AbsoluteTourStop | BrokenTourStop) => {
          if (isNotBroken(stop)) {
            if (Util.pathsEqual(document.fileName, stop.absPath)) {
              const position = new vscode.Position(stop.line - 1, 0);
              lenses.push(
                new vscode.CodeLens(new vscode.Range(position, position), {
                  arguments: [stop],
                  command: "extension.gotoTourstop",
                  title: stop.title,
                }),
              );
            }
          } else {
            // TODO: handle broken stop
            vscode.window.showErrorMessage("Your tour is broken! =(");
          }
        },
      );
    }

    return lenses;
  }

  public resolveCodeLens(
    codeLens: vscode.CodeLens,
    token: vscode.CancellationToken,
  ): vscode.ProviderResult<vscode.CodeLens> {
    return codeLens;
  }
}

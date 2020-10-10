import * as vscode from "vscode";

import * as config from "./config";
import * as globals from "./globals";
import * as util from "./util";

/**
 * Provides CodeLenses for each tourstop in the active tour
 */
class TouristCodeLensProvider implements vscode.CodeLensProvider {
  // tslint:disable-next-line: variable-name
  private _onDidChangeCodeLenses = new vscode.EventEmitter<void>();
  // tslint:disable-next-line: member-ordering
  public readonly onDidChangeCodeLenses: vscode.Event<void> = this
    ._onDidChangeCodeLenses.event;

  public async provideCodeLenses(
    document: vscode.TextDocument,
    token: vscode.CancellationToken,
  ): Promise<vscode.CodeLens[]> {
    if (!config.useCodeLens()) {
      return [];
    }

    const lenses = [] as vscode.CodeLens[];
    if (globals.tourState) {
      const tv = await globals.touristClient.viewTour(globals.tourState.tourId);

      for (const [stopId, _] of tv.stops) {
        const stop = await globals.touristClient.viewStop(
          globals.tourState.tourId,
          stopId,
        );
        const loc = await globals.touristClient.locateStop(
          globals.tourState.tourId,
          stopId,
          true,
        );

        if (loc) {
          const [path, line] = loc;
          if (util.pathsEqual(document.fileName, path)) {
            const position = new vscode.Position(line - 1, 0);
            lenses.push(
              new vscode.CodeLens(new vscode.Range(position, position), {
                arguments: [stop],
                command: "tourist.gotoTourstop",
                title: stop.title,
              }),
            );
          }
        }
      }
    }

    return lenses;
  }

  public resolveCodeLens(
    codeLens: vscode.CodeLens,
    token: vscode.CancellationToken,
  ): vscode.CodeLens {
    return codeLens;
  }

  public refresh() {
    this._onDidChangeCodeLenses.fire();
  }
}

export const provider = new TouristCodeLensProvider();

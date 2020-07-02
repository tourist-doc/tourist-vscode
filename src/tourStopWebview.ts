import { template } from "dot";
import { AbsoluteTourStop, BrokenTourStop } from "tourist-core";
import * as vscode from "vscode";
import * as commands from "./commands";
import * as config from "./config";
import { tourState, touristClient } from "./globals";
import { findWithID } from "./tourFile";
import { TouristWebview } from "./webview";
import { StopView } from "./touristClient";

interface TourStopTemplateArgs {
  stop: StopView;
  isBroken: boolean;
  bodyHTML: string;
  editingBody?: string;
}
export class TourStopWebview {
  protected template: (args: TourStopTemplateArgs) => string;

  /** Whether the body is currently being edited (the TextArea is showing) */
  protected editingBody?: string;

  public constructor(tmpl: string) {
    this.template = template(
      tmpl
        .replace(/webviewFontSize/g, config.webviewFontSize().toString())
        .replace(/webviewFont/g, config.webviewFont()),
    );
  }

  public async update() {
    if (tourState && tourState.stopId) {
      const sv = await touristClient.viewStop(
        tourState.tourId,
        tourState.stopId,
      );
      const stopStatus = await touristClient.locateStop(
        tourState.tourId,
        tourState.stopId,
        true,
      );

      const panel = TouristWebview.getPanel();
      panel.title = sv.title;

      if (sv.description) {
        const body: string =
          (await vscode.commands.executeCommand(
            "markdown.api.render",
            sv.description,
          )) || "";
        panel.webview.html = this.template!({
          stop: sv,
          isBroken: !stopStatus,
          bodyHTML: sv.description,
          editingBody: this.editingBody,
        });
      }
    }
  }

  public async handleMessage(message: any) {
    if (!tourState || !tourState.stopId) {
      return;
    }
    switch (message.command) {
      case "nextTourstop":
        await commands.nextTourStop();
        break;
      case "prevTourstop":
        await commands.prevTourStop();
        break;
      case "editTitle":
        await commands.editTitle();
        break;
      case "editBody":
        const sv = await touristClient.viewStop(
          tourState.tourId,
          tourState.stopId,
        );
        this.editingBody = sv.description || "";
        break;
      case "editBodyCancel":
        this.editingBody = undefined;
        break;
      case "editBodySave":
        this.editingBody = undefined;
        if (tourState?.stopId) {
          await touristClient.editStopMetadata(
            tourState.tourId,
            tourState.stopId,
            { description: message.newBody },
          );
        }
        break;
      case "backToTour":
        tourState.stopId = undefined;
        break;
      case "gotoChildStop":
        const tf = findWithID(message.tourId);
        if (tf) {
          // TODO: startTour reads and parses the URI, but we already have the TourFile!
          await commands.startTour(tf.path);
        }
        break;
      case "linkStop":
        await commands.linkTour();
        break;
    }

    await TouristWebview.refresh();
  }
}

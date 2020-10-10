import { template } from "dot";
import * as vscode from "vscode";
import * as commands from "./commands";
import * as config from "./config";
import { touristClient, tourState } from "./globals";
import { TourView } from "./touristClient";
import { TouristWebview } from "./webview";

interface TourTemplateArgs {
  tourView: TourView;
  descriptionHTML: string;
  editingDescription?: string;
  readOnly: boolean;
}

export class TourWebview {
  protected template: (args: TourTemplateArgs) => string;

  /** Whether the body is currently being edited (the TextArea is showing) */
  protected editingDescription?: string;

  public constructor(tmpl: string) {
    this.template = template(
      tmpl
        .replace(/webviewFontSize/g, config.webviewFontSize().toString())
        .replace(/webviewFont/g, config.webviewFont()),
    );
  }

  public async update() {
    if (tourState) {
      const tv = await touristClient.viewTour(tourState.tourId);

      const panel = TouristWebview.getPanel();
      panel.title = tv.title;
      const description: string =
        (await vscode.commands.executeCommand(
          "markdown.api.render",
          tv.description,
        )) || "";
      panel.webview.html = this.template!({
        tourView: tv,
        descriptionHTML: description,
        editingDescription: this.editingDescription,
        readOnly: !tv.edit,
      });
    }
  }

  public async handleMessage(message: any) {
    if (!tourState) {
      return;
    }
    switch (message.command) {
      case "editTitle":
        await touristClient.editTourMetadata(tourState.tourId, {
          title: message.command,
        });
        break;
      case "gotoTourstop":
        await commands.gotoTourStop(message.stopId);
        break;
      case "mapRepo":
        await commands.mapRepo(message.repo);
        break;
      case "editDescription":
        const tv = await touristClient.viewTour(tourState!.tourId);
        this.editingDescription = tv.description || "";
        break;
      case "editDescriptionCancel":
        this.editingDescription = undefined;
        break;
      case "editDescriptionSave":
        this.editingDescription = undefined;
        if (message.newDescription !== undefined) {
          await touristClient.editTourMetadata(tourState.tourId, {
            description: message.newDescription,
          });
        }
        break;
      case "deleteStop":
        await touristClient.removeStop(tourState.tourId, message.stopId);
        break;
    }

    await TouristWebview.refresh();
  }
}

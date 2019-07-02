import { template } from "dot";
import { Tour } from "tourist-core";
import * as commands from "./commands";
import * as config from "./config";
import { tourState } from "./globals";
import { TourFile } from "./tourFile";
import { TouristWebview } from "./webview";

interface TourTemplateArgs {
  tf: TourFile;
  tour: Tour;
  editingDescription?: string;
  showEditControls: boolean;
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
    const panel = TouristWebview.getPanel();
    panel.title = tourState!.tourFile.title;
    panel.webview.html = this.template!({
      tf: tourState!.tourFile,
      tour: tourState!.tour,
      editingDescription: this.editingDescription,
      showEditControls: config.showEditControls(),
    });
  }

  public setEditing(editing: boolean) {
    this.editingDescription = editing
      ? tourState!.tourFile.description || ""
      : undefined;
  }

  public async handleMessage(message: any) {
    switch (message.command) {
      case "gotoTourstop":
        await commands.gotoTourStop(tourState!.tour.stops[message.stopIndex]);
        break;
      case "mapRepo":
        await commands.mapRepo(message.repo);
        break;
      case "editDescription":
        this.setEditing(true);
        break;
      case "editDescriptionCancel":
        this.setEditing(false);
        break;
      case "editDescriptionSave":
        this.setEditing(false);
        if (message.newDescription !== undefined) {
          await commands.editDescription(
            tourState!.tourFile,
            message.newDescription,
          );
        }
        break;
      case "deleteStop":
        await commands.deleteTourStop(tourState!.tour.stops[message.stopIndex]);
        break;
    }

    await TouristWebview.refresh();
  }
}

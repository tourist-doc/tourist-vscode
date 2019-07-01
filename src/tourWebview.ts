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
  showEditControls: boolean;
}

export class TourWebview {
  protected template: (args: TourTemplateArgs) => string;

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
      showEditControls: config.showEditControls(),
    });
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
        await commands.editDescription(tourState!.tourFile);
        break;
    }

    await TouristWebview.refresh();
  }
}

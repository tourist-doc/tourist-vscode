import { template } from "dot";
import { AbsoluteTourStop, BrokenTourStop } from "tourist-core";
import * as commands from "./commands";
import * as config from "./config";
import { tourState } from "./globals";
import { findWithID } from "./tourFile";
import { TouristWebview } from "./webview";

interface TourStopTemplateArgs {
  stop: AbsoluteTourStop | BrokenTourStop;
  bodyHTML: string;
  editingBody?: string;
  showEditControls: boolean;
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
    const panel = TouristWebview.getPanel();
    panel.title = tourState!.currentStop!.title;
    const body = TouristWebview.mdConverter.makeHtml(
      tourState!.currentStop!.body || "",
    );
    panel.webview.html = this.template!({
      stop: tourState!.currentStop!,
      bodyHTML: body,
      editingBody: this.editingBody,
      showEditControls: config.showEditControls(),
    });
  }

  public setEditing(editing: boolean) {
    this.editingBody = editing ? tourState!.currentStop!.body || "" : undefined;
  }

  public async handleMessage(message: any) {
    switch (message.command) {
      case "nextTourstop":
        await commands.nextTourStop();
        break;
      case "prevTourstop":
        await commands.prevTourStop();
        break;
      case "editTitle":
        if (tourState!.currentStop) {
          await commands.editTitle(tourState!.currentStop);
        } else {
          await commands.renameTour(tourState!.tourFile);
        }
        break;
      case "editBody":
        this.setEditing(true);
        break;
      case "editBodyCancel":
        this.setEditing(false);
        break;
      case "editBodySave":
        this.setEditing(false);
        if (
          tourState!.currentStop !== undefined &&
          message.newBody !== undefined
        ) {
          await commands.editBody(tourState!.currentStop, message.newBody);
        }
        break;
      case "backToTour":
        tourState!.currentStop = undefined;
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

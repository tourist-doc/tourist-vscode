import * as child_process from "child_process";

type Method =
  | "list_tours"
  | "create_tour"
  | "open_tour"
  | "set_tour_edit"
  | "view_tour"
  | "edit_tour_metadata"
  | "forget_tour"
  | "create_stop"
  | "view_stop"
  | "move_stop"
  | "reorder_stop"
  | "edit_stop_metadata"
  | "link_stop"
  | "unlink_stop"
  | "locate_stop"
  | "remove_stop"
  | "refresh_tour"
  | "save_tour"
  | "save_all"
  | "delete_tour"
  | "index_repository";

export type Path = string;

export type TourId = string;

export interface TourMetadata {
  title?: string;
  description?: string;
}
export interface TourView {
  title: string;
  description: string;
  // A list of pairs containing `(stop_id, stop_title)`.
  stops: Array<[StopId, string]>;
  // A list of pairs containing `(repository_name, commit)`.
  repositories: Array<[string, string]>;
  // True if tour is currently in edit mode.
  edit: boolean;
}

export type StopId = string;

export interface StopMetadata {
  title?: string;
  description?: string;
}

export interface StopReferenceView {
  tourId: TourId;
  tourTitle?: string;
  // `undefined` if the reference links to the root of the tour.
  stopId?: StopId;
  // `undefined` if the reference links to the root of the tour.
  stopTitle?: string;
}

export interface StopView {
  title: string;
  description: string;
  repository: string;
  children: [StopReferenceView];
}

/** Speaks Tourist's RPC protocol. */
export class TouristRpcClient {
  private touristProcess?: child_process.ChildProcessWithoutNullStreams;

  private msgId: number = 1;

  /**
   * Spawns and connects to `tourist serve`
   *
   * @throws If unable to connect
   */
  public async connect(pathToBinary: string) {
    try {
      this.touristProcess = child_process.spawn(pathToBinary, ["serve"]);
    } catch (e) {
      console.error(`Caught err: ${e}`);
      throw e;
    }
  }

  public async listTours(): Promise<[TourId, string]> {
    return this.makeRequest("list_tours");
  }

  // Create a new tour and open it in edit mode. Returns the new tour's ID.
  public async createTour(title: string): Promise<TourId> {
    return this.makeRequest("create_tour", [title]);
  }

  // Open an existing tour from disk. If `edit` is true, the tour will be available for editing.
  // Returns the opened tour's ID.
  public async openTour(path: Path, edit: boolean): Promise<TourId> {
    return this.makeRequest("open_tour", [path, edit]);
  }

  // Set whether or not a tour is in edit mode.
  public async setTourEdit(tourId: TourId, edit: boolean): Promise<void> {
    return this.makeRequest("set_tour_edit", [tourId, edit]);
  }

  // View all of the top-level data for a tour.
  public async viewTour(tourId: TourId): Promise<TourView> {
    return this.makeRequest("view_tour", [tourId]);
  }

  // Edit tour metadata, e.g. title and description. The delta object has a number of optional
  // fields; those that are set will be applied.
  public async editTourMetadata(tourId: TourId, delta: TourMetadata) {
    return this.makeRequest("edit_tour_metadata", [tourId, delta]);
  }

  // Remove a tour from the list of tracked tours. If you would like to delete the tour from disk
  // as well, use `delete_tour`.
  public async forgetTour(tourId: TourId) {
    return this.makeRequest("forget_tour", [tourId]);
  }

  // Create a new stop in the given tour. Returns the ID of the new stop.
  public async createStop(
    tourId: TourId,
    title: string,
    path: Path,
    line: number,
  ): Promise<StopId> {
    return this.makeRequest("create_stop", [tourId, title, path, line]);
  }

  // View all of the top-level data for a stop.
  public async viewStop(tourId: TourId, stopId: StopId): Promise<StopView> {
    return this.makeRequest("view_stop", [tourId, stopId]);
  }

  // Move a stop to a different place in the codebase.
  public async moveStop(
    tourId: TourId,
    stopId: StopId,
    path: Path,
    line: number,
  ) {
    return this.makeRequest("move_stop", [tourId, stopId, path, line]);
  }

  // Change the order of a tour's stops. Position delta is applied to the position of the stop in
  // the list, bounded by the length of the list.
  public async reorderStop(
    tourId: TourId,
    stopId: StopId,
    positionDelta: number,
  ) {
    return this.makeRequest("reorder_stop", [tourId, stopId, positionDelta]);
  }

  // Edit stop metadata, e.g. title and description. The delta object has a number of optional
  // fields; those that are set will be applied.
  public async editStopMetadata(
    tourId: TourId,
    stopId: StopId,
    delta: StopMetadata,
  ) {
    return this.makeRequest("edit_stop_metadata", [tourId, stopId, delta]);
  }

  // Link a tour stop to another tour or tour stop. If `otherStopId` is `None`, the link will
  // go to the tour's landing page. Otherwise the link will go to the stop itself.
  public async linkStop(
    tourId: TourId,
    stopId: StopId,
    otherTourId: TourId,
    otherStopId?: StopId,
  ) {
    return this.makeRequest("link_stop", [
      tourId,
      stopId,
      otherTourId,
      otherStopId,
    ]);
  }

  // Unlink a tour stop from another tour or tour stop.
  public async unlinkStop(
    tourId: TourId,
    stopId: StopId,
    otherTourId: TourId,
    otherStopId?: StopId,
  ) {
    return this.makeRequest("unlink_stop", [
      tourId,
      stopId,
      otherTourId,
      otherStopId,
    ]);
  }

  // Find the file location for a given stop. If `naive` is set, the location will be provided
  // directly from the tour file, with no adjustment; otherwise the location will be adjusted
  // based on a git diff.
  public async locateStop(
    tourId: TourId,
    stopId: StopId,
    naive: boolean,
  ): Promise<[Path, number] | undefined> {
    return this.makeRequest("locate_stop", [tourId, stopId, naive]);
  }

  // Remove a stop from an open tour.
  public async removeStop(tourId: TourId, stopId: StopId) {
    return this.makeRequest("remove_stop", [tourId, stopId]);
  }

  // Refresh a tour's stops to the provided commit. If no commit is provided, HEAD is used.
  public async refreshTour(tourId: TourId, commit: string) {
    return this.makeRequest("refresh_tour", [tourId, commit]);
  }

  // Save a tour to disk. If the tour is new, a path must be provided; otherwise the path can be
  // left empty.
  public async saveTour(tourId: TourId, path?: Path) {
    return this.makeRequest("save_tour", [tourId, path]);
  }

  // Save all available tours to disk. This will fail if any tours are new.
  public async saveAll() {
    return this.makeRequest("save_all");
  }

  // Remove a tour from the tracker and delete it from disk.
  public async deleteTour(tourId: TourId) {
    return this.makeRequest("delete_tour", [tourId]);
  }

  // Update the repository index, mapping a name to a path. If a null value is passed instead of
  // a path, the name is removed from the index instead.
  public async indexRepository(repoName: string, path: Path) {
    return this.makeRequest("index_repository", [repoName, path]);
  }

  /**
   * Actually executes an RPC request over stdio
   * @returns The response
   */
  private async makeRequest(method: Method, params: any[] = []): Promise<any> {
    if (!this.touristProcess) {
      throw new Error("Not connected to tourist server.");
    }

    // TODO: Use a JSON-RPC library instead of rolling a fragile one here.
    const request = JSON.stringify({
      jsonrpc: "2.0",
      method,
      params,
      id: this.msgId,
    });

    console.log(`RPC request: ${request}`);
    try {
      this.touristProcess!.stdin.write(request + "\n");
    } catch (err) {
      console.log(err);
      throw err;
    }

    // TODO: Handle concurrent requests
    return new Promise((resolve) => {
      this.touristProcess!.stdout.on("data", (chunk: any) => {
        const response = JSON.parse(chunk.toString());
        if (response.id !== this.msgId) {
          throw new Error(
            `Got response ID ${response.id}, expected ${this.msgId}`,
          );
        }
        console.log(`RPC response: ${JSON.stringify(response.result)}`);
        this.msgId += 1;
        this.touristProcess!.stdout.removeAllListeners();
        resolve(response.result);
      });
    });
  }
}

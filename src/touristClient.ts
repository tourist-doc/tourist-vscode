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
  | "edit_stop_metadata"
  | "link_stop"
  | "locate_stop"
  | "remove_stop"
  | "refresh_tour"
  | "save_tour"
  | "save_all"
  | "delete_tour"
  | "index_repository";
type TourId = string;

export class TouristClient {
  private touristProcess?: child_process.ChildProcessWithoutNullStreams;

  private msgId: number = 1;

  /**
   * Spawns and connects to `tourist serve`
   *
   * @throws If unable to connect
   */
  public async connect() {
    try {
      this.touristProcess = child_process.spawn("tourist", ["serve"]);
    } catch (e) {
      console.error(`Caught err: ${e}`);
      throw e;
    }
  }

  public async listTours(): Promise<[[TourId, string]]> {
    return this.makeRequest("list_tours");
  }

  public async createTour(title: string): Promise<TourId> {
    return this.makeRequest("create_tour", [title]);
  }

  public async saveAll(): Promise<void> {
    return this.makeRequest("save_all");
  }

  public async saveTour(
    id: TourId,
    path?: string,
  ): Promise<[[TourId, string]]> {
    const args = path !== undefined ? [id, path] : [id];
    return this.makeRequest("save_tour", args);
  }

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
    this.touristProcess!.stdin.write(request + "\n");

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

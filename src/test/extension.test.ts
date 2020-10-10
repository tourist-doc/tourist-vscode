//
// Note: This example test is leveraging the Mocha test framework.
// Please refer to their documentation on https://mochajs.org/ for help.
//

import * as assert from "assert";
import { TouristRpcClient } from "../touristClient";

suite("TouristClient", () => {
  test("can list tours", async () => {
    const client = new TouristRpcClient();
    // await client.connect();

    const response = await client.listTours();

    assert.equal(4 + 4, 8);

    console.log("reponse=", response);
  });
});

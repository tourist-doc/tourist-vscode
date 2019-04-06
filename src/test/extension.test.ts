//
// Note: This example test is leveraging the Mocha test framework.
// Please refer to their documentation on https://mochajs.org/ for help.
//

import * as assert from "assert";
import { expect } from "chai";

suite("To do", () => {
  expect(5).to.be.lessThan(6);
  assert.equal(2 + 2, 4);
});

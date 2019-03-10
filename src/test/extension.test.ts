//
// Note: This example test is leveraging the Mocha test framework.
// Please refer to their documentation on https://mochajs.org/ for help.
//

import * as assert from "assert";
import { expect } from "chai";
import { Tour, Tourstop } from "../tour";

function createTestTourstop(): Tourstop {
    return {
        title: "Test tourstop 1",
        message: "abc",
        filePath: "",
        position: {
            row: 5,
            col: 5,
        },
    };
}

suite("Tour unit tests", () => {
    test("getChildren()", () => {
        const tour = new Tour();

        const children = tour.getChildren(undefined);
        expect(children).to.be.an("array").that.is.empty;

        const tourstops = [createTestTourstop(), createTestTourstop(), createTestTourstop()];
        tourstops.forEach((stop) => {
            tour.addTourStop(stop);
        });

        assert.deepEqual(
            tour.getChildren(undefined),
            tourstops);
        tourstops.forEach((stop) => {
            expect(tour.getChildren(stop)).to.be.an("array").that.is.empty;
        });
    });

    test("getTreeItem()",  () => {
        const tourstop = createTestTourstop();
        const tour = new Tour([tourstop]);

        const treeItem = tour.getTreeItem(tourstop);
        assert.equal(treeItem.tourstop, tourstop);
        assert.equal(treeItem.tooltip, tourstop.message);
        assert.equal(treeItem.label, tourstop.title);
    });

    test("nextAndPrevTourstop", () => {
        const tourstops = [createTestTourstop(), createTestTourstop(), createTestTourstop()];
        const tour = new Tour(tourstops);

        tour.setCurrentTourstop(tourstops[0]);

        assert.equal(tour.prevTourStop(), undefined);
        assert.equal(tour.nextTourStop(), tourstops[1]);
        tour.setCurrentTourstop(tour.nextTourStop()!);
        assert.equal(tour.nextTourStop(), tourstops[2]);
        tour.setCurrentTourstop(tour.nextTourStop()!);
        assert.equal(tour.nextTourStop(), undefined);
        assert.equal(tour.prevTourStop(), tourstops[1]);
        tour.setCurrentTourstop(tour.prevTourStop()!);
        assert.equal(tour.prevTourStop(), tourstops[0]);
        tour.setCurrentTourstop(tour.prevTourStop()!);
        assert.equal(tour.prevTourStop(), undefined);
    });
});

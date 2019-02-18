//
// Note: This example test is leveraging the Mocha test framework.
// Please refer to their documentation on https://mochajs.org/ for help.
//

import * as assert from 'assert';
import { expect } from 'chai';
import { Tour } from '../tour';

function createTestTourstop() {
    return {
        title: 'Test tourstop 1',
        message: 'abc',
        filePath: '',
        position: {
            row: 5,
            col: 5
        }
    };
}

suite("Tour unit tests", function () {
    test("getChildren()", function () {
        const tour = new Tour();

        const children = tour.getChildren(undefined);
        expect(children).to.be.an('array').that.is.empty;

        const tourstops = [createTestTourstop(), createTestTourstop(), createTestTourstop()];
        tourstops.forEach(stop => {
            tour.addTourStop(stop);
        });

        assert.deepEqual(
            tour.getChildren(undefined),
            tourstops);
        tourstops.forEach(stop => {
            expect(tour.getChildren(stop)).to.be.an('array').that.is.empty;
        });
    });

    test("getTreeItem()", function () {
        const tourstop = createTestTourstop();
        const tour = new Tour([tourstop]);

        const treeItem = tour.getTreeItem(tourstop);
        assert.equal(treeItem.tourstop, tourstop);
        assert.equal(treeItem.tooltip, tourstop.message);
        assert.equal(treeItem.label, tourstop.title);
    });
});
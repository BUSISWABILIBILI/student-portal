import assert from "node:assert/strict";
import { describe, it } from "node:test";

import calculateGrade, {
  COURSEWORK_WEIGHT,
  EXAMINATION_WEIGHT,
  PASS_MARK,
} from "../src/utils/calculateGrade.js";

describe("academic result calculation", () => {
  it("uses the configured coursework and examination weights", () => {
    assert.equal(COURSEWORK_WEIGHT, 0.4);
    assert.equal(EXAMINATION_WEIGHT, 0.6);
    assert.equal(PASS_MARK, 50);

    assert.deepEqual(
      calculateGrade({
        courseworkMark: 75,
        examinationMark: 80,
      }),
      {
        finalMark: 78,
        grade: "B",
        gradePoint: 3,
        outcome: "pass",
      },
    );
  });

  it("rounds calculated final marks to two decimal places", () => {
    assert.deepEqual(
      calculateGrade({
        courseworkMark: 66.66,
        examinationMark: 77.77,
      }),
      {
        finalMark: 73.33,
        grade: "B",
        gradePoint: 3,
        outcome: "pass",
      },
    );
  });

  it("marks results incomplete until both marks are present", () => {
    assert.deepEqual(
      calculateGrade({
        courseworkMark: null,
        examinationMark: 80,
      }),
      {
        finalMark: null,
        grade: null,
        gradePoint: null,
        outcome: "incomplete",
      },
    );

    assert.deepEqual(
      calculateGrade({
        courseworkMark: 80,
        examinationMark: undefined,
      }),
      {
        finalMark: null,
        grade: null,
        gradePoint: null,
        outcome: "incomplete",
      },
    );
  });

  it("applies pass and fail outcomes at the pass-mark boundary", () => {
    assert.equal(
      calculateGrade({
        courseworkMark: 50,
        examinationMark: 50,
      }).outcome,
      "pass",
    );

    assert.equal(
      calculateGrade({
        courseworkMark: 49,
        examinationMark: 50,
      }).outcome,
      "fail",
    );
  });

  it("assigns the expected grade bands and grade points", () => {
    assert.deepEqual(
      calculateGrade({
        courseworkMark: 80,
        examinationMark: 80,
      }),
      {
        finalMark: 80,
        grade: "A",
        gradePoint: 4,
        outcome: "pass",
      },
    );

    assert.deepEqual(
      calculateGrade({
        courseworkMark: 60,
        examinationMark: 60,
      }),
      {
        finalMark: 60,
        grade: "C",
        gradePoint: 2,
        outcome: "pass",
      },
    );

    assert.deepEqual(
      calculateGrade({
        courseworkMark: 50,
        examinationMark: 50,
      }),
      {
        finalMark: 50,
        grade: "D",
        gradePoint: 1,
        outcome: "pass",
      },
    );

    assert.deepEqual(
      calculateGrade({
        courseworkMark: 49,
        examinationMark: 49,
      }),
      {
        finalMark: 49,
        grade: "F",
        gradePoint: 0,
        outcome: "fail",
      },
    );
  });
});

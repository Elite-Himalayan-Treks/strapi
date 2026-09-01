import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  amountsMatch,
  chargeNowAmount,
  remainingBalance,
  roundMoney,
  settlementStatus,
} from "./money.ts";

describe("booking money", () => {
  it("rounds to cents", () => {
    assert.equal(roundMoney(839.4), 839.4);
    assert.equal(roundMoney(10.126), 10.13);
    assert.equal(roundMoney(2798 * 0.3), 839.4);
  });

  it("charges full trip for full payment", () => {
    assert.equal(chargeNowAmount(2798, "full", 30), 2798);
  });

  it("charges 30% deposit and leaves remaining 70%", () => {
    const total = 2798;
    const deposit = chargeNowAmount(total, "deposit", 30);
    assert.equal(deposit, 839.4);
    assert.equal(remainingBalance(total, deposit), 1958.6);
    assert.equal(remainingBalance(total, 0), 2798);
    assert.equal(remainingBalance(total, total), 0);
  });

  it("never returns negative remaining balance", () => {
    assert.equal(remainingBalance(100, 150), 0);
  });

  it("derives settlement status from paid vs remaining", () => {
    assert.equal(settlementStatus(0, 2798), "pending");
    assert.equal(settlementStatus(839.4, 1958.6), "partially_paid");
    assert.equal(settlementStatus(2798, 0), "paid");
  });

  it("matches gateway amounts within a cent", () => {
    assert.equal(amountsMatch(839.4, "839.40"), true);
    assert.equal(amountsMatch(839.4, 839.4), true);
    assert.equal(amountsMatch(839.4, 100), false);
    assert.equal(amountsMatch(839.4, null), true);
  });
});

'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.sleep =
  exports.checkPoolsLiquidity =
  exports.checkConstantPoolPrices =
  exports.checkPoolPrices =
    void 0;
const constants_1 = require('../src/constants');
// Assuming that the amounts are increasing at same interval, and start with 0
function checkPoolPrices(
  poolPrices,
  amounts,
  side,
  dexKey,
  expectIncreasingValues = true,
) {
  for (const poolPrice of poolPrices) {
    expect(poolPrice.prices.length).toBe(amounts.length);
    expect(poolPrice.prices[0]).toEqual(0n);
    poolPrice.prices.forEach(p => expect(p).toBeGreaterThanOrEqual(0));
    expect(poolPrice.unit).toBeGreaterThanOrEqual(0);
    if (expectIncreasingValues) {
      for (let i = 2; i < poolPrice.prices.length; ++i) {
        const prevMarginalPrice =
          poolPrice.prices[i - 1] - poolPrice.prices[i - 2];
        const currMarginalPrice = poolPrice.prices[i] - poolPrice.prices[i - 1];
        //This check has 1% fudge factor to avoid slight differences causing error
        if (side === constants_1.SwapSide.SELL)
          expect((currMarginalPrice * 99n) / 100n).toBeLessThanOrEqual(
            prevMarginalPrice,
          );
        else
          expect((currMarginalPrice * 101n) / 100n).toBeGreaterThan(
            prevMarginalPrice,
          );
      }
    }
    expect(poolPrice.exchange).toEqual(dexKey);
  }
}
exports.checkPoolPrices = checkPoolPrices;
function checkConstantPoolPrices(poolPrices, amounts, dexKey) {
  for (const poolPrice of poolPrices) {
    expect(poolPrice.exchange).toEqual(dexKey);
    expect(poolPrice.prices.length).toEqual(amounts.length);
    for (let i = 0; i < poolPrice.prices.length; ++i) {
      expect(poolPrice.prices[i]).toEqual(amounts[i]);
    }
  }
}
exports.checkConstantPoolPrices = checkConstantPoolPrices;
function checkPoolsLiquidity(poolsLiquidity, tokenAddress, dexKey) {
  expect(poolsLiquidity.length).toBeGreaterThan(0);
  poolsLiquidity.forEach(p => {
    expect(p.exchange).toEqual(dexKey);
    expect(p.liquidityUSD).toBeGreaterThanOrEqual(0);
    p.connectorTokens.forEach(t => {
      expect(t.address).not.toBe(tokenAddress);
      expect(t.decimals).toBeGreaterThanOrEqual(0);
    });
  });
}
exports.checkPoolsLiquidity = checkPoolsLiquidity;
const sleep = time =>
  new Promise(resolve => {
    setTimeout(resolve, time);
  });
exports.sleep = sleep;
//# sourceMappingURL=utils.js.map

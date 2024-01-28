/* eslint-disable no-console */
// const ethers = require('ethers');
import { ethers } from 'ethers';
import { UniswapV3 } from './uniswap-v3';

import { DummyDexHelper } from '../../dex-helper/index';
import { Network, SwapSide } from '../../constants';
import { DecodedStateMultiCallResultWithRelativeBitmaps } from './types';
import { UniswapV3EventPool } from './uniswap-v3-pool';

// import { BI_POWS } from '../../bigint-constants';
// import { Tokens } from '../../../tests/constants-e2e';
// import dotenv from 'dotenv';
// dotenv.config();

const HTTP_PROVIDER_1 =
  'https://eth-mainnet.g.alchemy.com/v2/823DxqwvlqQ3yHCXvNXn61rlJaCKnRgp';

async function main() {
  const provider = new ethers.JsonRpcProvider(HTTP_PROVIDER_1, {
    name: 'mainnet',
    chainId: 1,
  });

  const blockNumber = await provider.getBlockNumber();
  console.log('blockNumber: ', blockNumber);

  // const network = Network.MAINNET;
  const network = 1;
  // const TokenA = {
  //   address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  //   symbol: 'USDC',
  //   decimals: 6,
  // };
  const TokenA = {
    address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    symbol: 'WETH',
    decimals: 18,
  };
  const srcToken = TokenA;

  const TokenB = {
    address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    symbol: 'USDT',
    decimals: 6,
  };
  const destToken = TokenB;

  const amounts = [0n, BigInt(1e18), BigInt(2e18)];

  const dexHelper = new DummyDexHelper(network, HTTP_PROVIDER_1);
  const dexKey = 'UniswapV3';

  // 0. prepare all mavV1 pools
  // create MaverickV1 instance, and initialize all pools
  // const balancerV2 = new BalancerV2(network, dexKey, dexHelper);
  const uniswapV3 = new UniswapV3(network, dexKey, dexHelper);

  // console.time('initializePricing');
  // await balancerV2.initializePricing(blockNumber);
  // console.timeEnd('initializePricing');

  // 1. find pools for tokenList
  console.time('getPools');
  // const pools = await uniswapV3.getPoolIdentifiers(
  //   TokenA,
  //   TokenB,
  //   SwapSide.SELL,
  //   blockNumber,
  // );
  const pools = await Promise.all(
    uniswapV3.supportedFees.map(async fee =>
      uniswapV3.getPool(srcToken.address, destToken.address, fee, blockNumber),
    ),
  );
  console.timeEnd('getPools');
  console.log(`pools.length `, pools.length);

  // use reference to origin evenPool, so that we can update the state later
  // ).filter(pool => pool);

  // console.log(`${TokenA.symbol} <> ${TokenB.symbol} Pools: `, pools);

  // 2. get on-chain state for all pools
  // console.time('fetchPoolDataBath');
  // await fetchPoolDataBath(maverickV1, pools, blockNumber);
  // console.timeEnd('fetchPoolDataBath');
  console.time('prepareCallData');
  const calls = [];
  const logPools: UniswapV3EventPool[] = [];
  for (const pool of pools) {
    // const callData = pool.getStateRequestCallData();
    // const eventPool = uniswapV3.eventPools[pool];
    const callData = pool?.getStateRequestCallData();
    if (pool && callData) {
      calls.push(...callData);
      logPools.push(pool);
    }
  }
  console.timeEnd('prepareCallData');

  console.time('fetchPoolDataBath');
  const results = await dexHelper.multiWrapper.tryAggregate<
    bigint | DecodedStateMultiCallResultWithRelativeBitmaps
  >(false, calls, blockNumber, dexHelper.multiWrapper.defaultBatchSize, false);

  for (const [idx, pool] of logPools.entries()) {
    const [resBalance0, resBalance1, resState] = results.slice(
      idx * 3,
      idx * 3 + 3,
    );
    const newState = pool?.calcState(resBalance0, resBalance1, resState);
    if (!newState) {
      console.log(`no state for pool: `, pool?.poolAddress);
    } else {
      // console.log(`set state for pool: `, pool?.poolAddress);
      pool?.setState(newState, blockNumber);
      // const poolIdentifier = uniswapV3.getIdentifierByPool(pool);
      // const eventPool = uniswapV3.eventPools[poolIdentifier];
      // console.log(poolIdentifier);
      // console.log(uniswapV3.eventPools[poolIdentifier]);
      // uniswapV3.eventPools[poolIdentifier]?.setState(newState, blockNumber);

      // let state = uniswapV3?.eventPools[poolIdentifier]?.getState(blockNumber);
      // console.log(pool?.poolAddress, `state after set: `, state);
    }
  }

  console.timeEnd('fetchPoolDataBath');

  // 3. get prices and volumes for all pools
  console.time('getPricesVolume');
  // side == SwapSide.BUY ? to.decimals : from.decimals,
  // isExactOut = false, SwapSide.SELL , amounts is amountIn,

  const fwdPoolPrices = await uniswapV3.getPricesVolume(
    TokenA,
    TokenB,
    amounts,
    SwapSide.SELL,
    blockNumber,
    undefined,
  );

  // isExactOut = true, SwapSide.BUY , amounts is amountOut,
  const bwdPoolPrices = await uniswapV3.getPricesVolume(
    TokenB,
    TokenA,
    amounts,
    // SwapSide.SELL,
    SwapSide.BUY,
    blockNumber,
    undefined,
  );

  console.timeEnd('getPricesVolume');
  console.log(
    `fwd ${srcToken.symbol} > ${destToken.symbol} Pool Prices: `,
    fwdPoolPrices,
  );
  console.log(
    `bwd ${destToken.symbol} > ${srcToken.symbol} Pool Prices: `,
    bwdPoolPrices,
  );
}

main()
  .then(() => {
    console.log('done');
    // process.exit(0);
  })
  .catch(error => {
    console.error(error);
    // process.exit(1);
  });

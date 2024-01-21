/* eslint-disable no-console */
// const ethers = require('ethers');
import { ethers } from 'ethers';
import { MaverickV1 } from './maverick-v1';
import { MaverickV1EventPool } from './maverick-v1-pool';

import { DummyDexHelper } from '../../dex-helper/index';
import { Network, SwapSide } from '../../constants';
import { Bin } from './types';
import { MaverickBinMap } from './maverick-math/maverick-bin-map';

import PoolABI from '../../abi/maverick-v1/pool.json';
import PoolInspectorABI from '../../abi/maverick-v1/pool-inspector.json';

// import { BI_POWS } from '../../bigint-constants';
// import { Tokens } from '../../../tests/constants-e2e';
// import dotenv from 'dotenv';
// dotenv.config();

const HTTP_PROVIDER_1 =
  'https://eth-mainnet.g.alchemy.com/v2/823DxqwvlqQ3yHCXvNXn61rlJaCKnRgp';
async function fetchPoolDataBath(
  maverickV1: MaverickV1,
  pools: MaverickV1EventPool[],
  blockNumber: number,
) {
  const provider = new ethers.JsonRpcProvider(HTTP_PROVIDER_1, {
    name: 'mainnet',
    chainId: 1,
  });
  const poolInspectorContract = new ethers.Contract(
    '0xaA5BF61a664109e959D69C38734d4EA7dF74e456',
    PoolInspectorABI,
    provider,
  );

  for (const pool of pools) {
    const poolContract = new ethers.Contract(pool.address, PoolABI, provider);

    const rawBins = await poolInspectorContract.getActiveBins.staticCall(
      //  this.poolInspectorContract.methods['getActiveBins'](
      pool.address,
      0,
      0,
    );
    const rawState = await poolContract.getState.staticCall();

    let binPositions: { [tick: string]: { [kind: string]: bigint } } = {};
    let bins: { [id: string]: Bin } = {};
    let binMap: { [id: string]: bigint } = {};

    rawBins.forEach((bin: any) => {
      bins[bin.id] = {
        reserveA: BigInt(bin.reserveA),
        reserveB: BigInt(bin.reserveB),
        kind: BigInt(bin.kind),
        lowerTick: BigInt(bin.lowerTick),
        mergeId: BigInt(bin.mergeId),
      };
      if (bin.mergeId == 0) {
        MaverickBinMap.putTypeAtTick(
          binMap,
          BigInt(bin.kind),
          BigInt(bin.lowerTick),
        );
        if (!binPositions[bin.lowerTick]) {
          binPositions[bin.lowerTick] = {};
        }
        binPositions[bin.lowerTick][bin.kind] = BigInt(bin.id);
      }
    });

    const state = {
      activeTick: BigInt(rawState.activeTick),
      binCounter: BigInt(rawState.binCounter),
      bins: bins,
      binPositions: binPositions,
      binMap: binMap,
    };

    pool.setState(state, blockNumber);
  }
}

async function main() {
  const provider = new ethers.JsonRpcProvider(HTTP_PROVIDER_1, {
    name: 'mainnet',
    chainId: 1,
  });

  const blockNumber = await provider.getBlockNumber();
  console.log('blockNumber: ', blockNumber);

  // const network = Network.MAINNET;
  const network = 1;
  // const TokenASymbol = 'USDC';
  // const TokenA = Tokens[network][TokenASymbol];
  const TokenA = {
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    symbol: 'USDC',
    decimals: 6,
  };
  const srcToken = TokenA;

  // const TokenBSymbol = 'USDT';
  // const TokenB = Tokens[network][TokenBSymbol];
  const TokenB = {
    address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    symbol: 'USDT',
    decimals: 6,
  };
  const destToken = TokenB;

  const amounts = [0n, BigInt(1e9), BigInt(2e9)];

  const dexHelper = new DummyDexHelper(network, HTTP_PROVIDER_1);
  const dexKey = 'MaverickV1';

  // 0. prepare all mavV1 pools
  // create MaverickV1 instance, and initialize all pools
  const maverickV1 = new MaverickV1(network, dexKey, dexHelper);
  console.time('initializePricing');
  const poolsData = require('./maverick_pools_1.json');
  await maverickV1.initializePricing(blockNumber, poolsData);
  console.timeEnd('initializePricing');

  // 1. find pools for tokenList
  console.time('getPools');
  // const pools = await maverickV1.getPoolIdentifiers(
  //     TokenA,
  //     TokenB,
  //     SwapSide.SELL,
  //     blockNumber,
  // );
  const pools = await maverickV1.getPools(srcToken, destToken);
  console.timeEnd('getPools');
  console.log(`pools.length: ${pools.length}`);

  // 2. get on-chain state for all pools
  console.time('fetchPoolDataBath');
  await fetchPoolDataBath(maverickV1, pools, blockNumber);
  console.timeEnd('fetchPoolDataBath');

  // 3. get prices and volumes for all pools
  console.time('getPricesVolume');
  // side == SwapSide.BUY ? to.decimals : from.decimals,
  // isExactOut = false, SwapSide.SELL , amounts is amountIn,
  const fwdPoolPrices = await maverickV1.getPricesVolume(
    TokenA,
    TokenB,
    amounts,
    SwapSide.SELL,
    blockNumber,
    undefined,
  );
  // isExactOut = true, SwapSide.BUY , amounts is amountOut,
  const bwdPoolPrices = await maverickV1.getPricesVolume(
    TokenA,
    TokenB,
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
    `bwd ${srcToken.symbol} > ${destToken.symbol} Pool Prices: `,
    bwdPoolPrices,
  );

  // const onChainState = await eventPool.generateState(blockNumber);
  // if (blockNumber) {
  //   eventPool.setState(onChainState, blockNumber);
  //   this.dexHelper.blockManager.subscribeToLogs(
  //     eventPool,
  //     eventPool.addressesSubscribed,
  //     blockNumber,
  //   );
  // }

  // const maverickV1 = new MaverickV1(network, dexKey, dexHelper);
  // console.time('initializePricing');
  // await maverickV1.initializePricing(blockNumber);
  // console.timeEnd('initializePricing');

  // console.log('------------after initializePricing-----------------');

  // console.time('getPoolIdentifiers');
  // const pools = await maverickV1.getPoolIdentifiers(
  //     TokenA,
  //     TokenB,
  //     SwapSide.SELL,
  //     blockNumber,
  // );
  // console.timeEnd('getPoolIdentifiers');

  // console.log('------------after getPoolIdentifiers-----------------')
  // console.log(pools);
  // // const pools = ['MaverickV1_0x4a94f0a97615f0bccbc09968b1c49c9ae1eb38a8']

  // console.time('getPricesVolume');
  // const poolPrices = await maverickV1.getPricesVolume(
  //     TokenA,
  //     TokenB,
  //     amounts,
  //     // SwapSide.SELL,
  //     SwapSide.BUY,
  //     blockNumber,
  //     pools,
  // );
  // console.timeEnd('getPricesVolume');
  // console.log(`${TokenASymbol} <> ${TokenBSymbol} Pool Prices: `, poolPrices);
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

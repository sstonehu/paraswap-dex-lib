import { PoolPrices, PoolLiquidity, Address } from '../src/types';
import { SwapSide } from '../src/constants';
export declare function checkPoolPrices(
  poolPrices: PoolPrices<any>[],
  amounts: bigint[],
  side: SwapSide,
  dexKey: string,
  expectIncreasingValues?: boolean,
): void;
export declare function checkConstantPoolPrices(
  poolPrices: PoolPrices<any>[],
  amounts: bigint[],
  dexKey: string,
): void;
export declare function checkPoolsLiquidity(
  poolsLiquidity: PoolLiquidity[],
  tokenAddress: Address,
  dexKey: string,
): void;
export declare const sleep: (time: number) => Promise<unknown>;

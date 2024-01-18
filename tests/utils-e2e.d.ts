import { Provider } from '@ethersproject/providers';
import { SwapSide, Network, ContractMethod } from '../src/constants';
import { Address, Token, TransferFeeParams, Config } from '../src/types';
import { DummyLimitOrderProvider } from '../src/dex-helper';
import { SmartToken } from './smart-tokens';
export declare const testingEndpoint: string | undefined;
export declare function testE2E(
  srcToken: Token,
  destToken: Token,
  senderAddress: Address,
  _amount: string,
  swapSide: SwapSide | undefined,
  dexKey: string,
  contractMethod: ContractMethod,
  network: Network | undefined,
  provider: Provider,
  poolIdentifiers?: string[],
  limitOrderProvider?: DummyLimitOrderProvider,
  transferFees?: TransferFeeParams,
  slippage?: number,
): Promise<void>;
export declare type TestParamE2E = {
  config: Config;
  srcToken: Token | SmartToken;
  destToken: Token | SmartToken;
  senderAddress: Address;
  thirdPartyAddress?: Address;
  _amount: string;
  swapSide: SwapSide;
  dexKey: string;
  contractMethod: ContractMethod;
  network: Network;
  poolIdentifiers?: string[];
  limitOrderProvider?: DummyLimitOrderProvider;
  transferFees?: TransferFeeParams;
  srcTokenBalanceOverrides?: Record<Address, string>;
  srcTokenAllowanceOverrides?: Record<Address, string>;
  destTokenBalanceOverrides?: Record<Address, string>;
  destTokenAllowanceOverrides?: Record<Address, string>;
  sleepMs?: number;
  skipTenderly?: boolean;
};
export declare function newTestE2E({
  config,
  srcToken,
  destToken,
  senderAddress,
  thirdPartyAddress,
  _amount,
  swapSide,
  dexKey,
  contractMethod,
  network,
  poolIdentifiers,
  limitOrderProvider,
  transferFees,
  sleepMs,
  skipTenderly,
}: TestParamE2E): Promise<void>;
export declare const getEnv: (envName: string, optional?: boolean) => string;

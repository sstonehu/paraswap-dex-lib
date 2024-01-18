'use strict';
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
exports.getEnv =
  exports.newTestE2E =
  exports.testE2E =
  exports.testingEndpoint =
    void 0;
/* eslint-disable no-console */
const abi_1 = require('@ethersproject/abi');
const local_paraswap_sdk_1 = require('../src/implementations/local-paraswap-sdk');
const tenderly_simulation_1 = require('./tenderly-simulation');
const constants_1 = require('../src/constants');
const erc20_json_1 = __importDefault(require('../src/abi/erc20.json'));
const augustus_json_1 = __importDefault(require('../src/abi/augustus.json'));
const config_1 = require('../src/config');
const sdk_1 = require('@paraswap/sdk');
const axios_1 = __importDefault(require('axios'));
const smart_tokens_1 = require('./smart-tokens');
const constants_e2e_1 = require('./constants-e2e');
const utils_1 = require('./utils');
const ts_essentials_1 = require('ts-essentials');
exports.testingEndpoint = process.env.E2E_TEST_ENDPOINT;
const adapterBytecode = '';
const erc20Interface = new abi_1.Interface(erc20_json_1.default);
const augustusInterface = new abi_1.Interface(augustus_json_1.default);
const DEPLOYER_ADDRESS = {
  [constants_1.Network.MAINNET]: '0xbe0eb53f46cd790cd13851d5eff43d12404d33e8',
  [constants_1.Network.BSC]: '0xf68a4b64162906eff0ff6ae34e2bb1cd42fef62d',
  [constants_1.Network.POLYGON]: '0x05182E579FDfCf69E4390c3411D8FeA1fb6467cf',
  [constants_1.Network.FANTOM]: '0x05182E579FDfCf69E4390c3411D8FeA1fb6467cf',
  [constants_1.Network.AVALANCHE]: '0xD6216fC19DB775Df9774a6E33526131dA7D19a2c',
  [constants_1.Network.OPTIMISM]: '0xf01121e808F782d7F34E857c27dA31AD1f151b39',
  [constants_1.Network.ARBITRUM]: '0xb38e8c17e38363af6ebdcb3dae12e0243582891d',
};
const MULTISIG = {
  [constants_1.Network.MAINNET]: '0x36fEDC70feC3B77CAaf50E6C524FD7e5DFBD629A',
  [constants_1.Network.BSC]: '0xf14bed2cf725E79C46c0Ebf2f8948028b7C49659',
  [constants_1.Network.POLYGON]: '0x46DF4eb6f7A3B0AdF526f6955b15d3fE02c618b7',
  [constants_1.Network.FANTOM]: '0xECaB2dac955b94e49Ec09D6d68672d3B397BbdAd',
  [constants_1.Network.AVALANCHE]: '0x1e2ECA5e812D08D2A7F8664D69035163ff5BfEC2',
  [constants_1.Network.OPTIMISM]: '0xf01121e808F782d7F34E857c27dA31AD1f151b39',
  [constants_1.Network.ARBITRUM]: '0x90DfD8a6454CFE19be39EaB42ac93CD850c7f339',
};
class APIParaswapSDK {
  constructor(network, dexKey) {
    this.network = network;
    this.dexKey = dexKey;
    this.paraSwap = (0, sdk_1.constructSimpleSDK)({
      chainId: network,
      axios: axios_1.default,
      apiURL: exports.testingEndpoint,
    });
  }
  async getPrices(from, to, amount, side, contractMethod, _poolIdentifiers) {
    if (_poolIdentifiers)
      throw new Error('PoolIdentifiers is not supported by the API');
    const priceRoute = await this.paraSwap.swap.getRate({
      srcToken: from.address,
      destToken: to.address,
      side,
      amount: amount.toString(),
      options: {
        includeDEXS: [this.dexKey],
        includeContractMethods: [contractMethod],
        partner: 'any',
      },
      srcDecimals: from.decimals,
      destDecimals: to.decimals,
    });
    return priceRoute;
  }
  async buildTransaction(priceRoute, _minMaxAmount, userAddress) {
    const minMaxAmount = _minMaxAmount.toString();
    const swapParams = await this.paraSwap.swap.buildTx(
      {
        srcToken: priceRoute.srcToken,
        srcDecimals: priceRoute.srcDecimals,
        destDecimals: priceRoute.destDecimals,
        destToken: priceRoute.destToken,
        srcAmount:
          priceRoute.side === constants_1.SwapSide.SELL
            ? priceRoute.srcAmount
            : minMaxAmount,
        destAmount:
          priceRoute.side === constants_1.SwapSide.SELL
            ? minMaxAmount
            : priceRoute.destAmount,
        priceRoute,
        userAddress,
        partner: 'paraswap.io',
      },
      {
        ignoreChecks: true,
      },
    );
    return swapParams;
  }
}
function allowTokenTransferProxyParams(tokenAddress, holderAddress, network) {
  const tokenTransferProxy = (0, config_1.generateConfig)(
    network,
  ).tokenTransferProxyAddress;
  return {
    from: holderAddress,
    to: tokenAddress,
    data: erc20Interface.encodeFunctionData('approve', [
      tokenTransferProxy,
      constants_1.MAX_UINT,
    ]),
    value: '0',
  };
}
function deployAdapterParams(bytecode, network = constants_1.Network.MAINNET) {
  const ownerAddress = DEPLOYER_ADDRESS[network];
  if (!ownerAddress) throw new Error('No deployer address set for network');
  return {
    from: ownerAddress,
    data: bytecode,
    value: '0',
  };
}
function whiteListAdapterParams(contractAddress, network) {
  const augustusAddress = (0, config_1.generateConfig)(network).augustusAddress;
  if (!augustusAddress) throw new Error('No whitelist address set for network');
  const ownerAddress = MULTISIG[network];
  if (!ownerAddress) throw new Error('No whitelist owner set for network');
  const role =
    '0x8429d542926e6695b59ac6fbdcd9b37e8b1aeb757afab06ab60b1bb5878c3b49';
  return {
    from: ownerAddress,
    to: augustusAddress,
    data: augustusInterface.encodeFunctionData('grantRole', [
      role,
      contractAddress,
    ]),
    value: '0',
  };
}
async function testE2E(
  srcToken,
  destToken,
  senderAddress,
  _amount,
  swapSide = constants_1.SwapSide.SELL,
  dexKey,
  contractMethod,
  network = constants_1.Network.MAINNET,
  provider,
  poolIdentifiers,
  limitOrderProvider,
  transferFees,
  // Specified in BPS: part of 10000
  slippage,
) {
  const amount = BigInt(_amount);
  const ts = new tenderly_simulation_1.TenderlySimulation(network);
  await ts.setup();
  if (
    srcToken.address.toLowerCase() !== constants_1.ETHER_ADDRESS.toLowerCase()
  ) {
    const allowanceTx = await ts.simulate(
      allowTokenTransferProxyParams(srcToken.address, senderAddress, network),
    );
    if (!allowanceTx.success) console.log(allowanceTx.tenderlyUrl);
    expect(allowanceTx.success).toEqual(true);
  }
  if (adapterBytecode) {
    const deployTx = await ts.simulate(
      deployAdapterParams(adapterBytecode, network),
    );
    expect(deployTx.success).toEqual(true);
    const adapterAddress =
      deployTx.transaction.transaction_info.contract_address;
    console.log(
      'Deployed adapter to address',
      adapterAddress,
      'used',
      deployTx.gasUsed,
      'gas',
    );
    const whitelistTx = await ts.simulate(
      whiteListAdapterParams(adapterAddress, network),
    );
    expect(whitelistTx.success).toEqual(true);
  }
  const useAPI = exports.testingEndpoint && !poolIdentifiers;
  // The API currently doesn't allow for specifying poolIdentifiers
  const paraswap = useAPI
    ? new APIParaswapSDK(network, dexKey)
    : new local_paraswap_sdk_1.LocalParaswapSDK(
        network,
        dexKey,
        '',
        limitOrderProvider,
      );
  if (paraswap.initializePricing) await paraswap.initializePricing();
  if (paraswap.dexHelper?.replaceProviderWithRPC) {
    paraswap.dexHelper?.replaceProviderWithRPC(
      `https://rpc.tenderly.co/fork/${ts.forkId}`,
    );
  }
  try {
    const priceRoute = await paraswap.getPrices(
      srcToken,
      destToken,
      amount,
      swapSide,
      contractMethod,
      poolIdentifiers,
      transferFees,
    );
    expect(parseFloat(priceRoute.destAmount)).toBeGreaterThan(0);
    // Calculate slippage. Default is 1%
    const _slippage = slippage || 100;
    const minMaxAmount =
      (swapSide === constants_1.SwapSide.SELL
        ? BigInt(priceRoute.destAmount) * (10000n - BigInt(_slippage))
        : BigInt(priceRoute.srcAmount) * (10000n + BigInt(_slippage))) / 10000n;
    const swapParams = await paraswap.buildTransaction(
      priceRoute,
      minMaxAmount,
      senderAddress,
    );
    const swapTx = await ts.simulate(swapParams);
    // Only log gas estimate if testing against API
    if (useAPI)
      console.log(
        `Gas Estimate API: ${priceRoute.gasCost}, Simulated: ${
          swapTx.gasUsed
        }, Difference: ${
          parseInt(priceRoute.gasCost) - parseInt(swapTx.gasUsed)
        }`,
      );
    console.log(`Tenderly URL: ${swapTx.tenderlyUrl}`);
    expect(swapTx.success).toEqual(true);
  } finally {
    if (paraswap.releaseResources) {
      await paraswap.releaseResources();
    }
  }
}
exports.testE2E = testE2E;
const makeFakeTransferToSenderAddress = (senderAddress, token, amount) => {
  return {
    from: constants_e2e_1.GIFTER_ADDRESS,
    to: token.address,
    data: erc20Interface.encodeFunctionData('transfer', [
      senderAddress,
      amount,
    ]),
    value: '0',
  };
};
async function newTestE2E({
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
}) {
  const useTenderly = !skipTenderly;
  const amount = BigInt(_amount);
  const twiceAmount = BigInt(_amount) * 2n;
  let ts = undefined;
  if (useTenderly) {
    ts = new tenderly_simulation_1.TenderlySimulation(network);
    await ts.setup();
  }
  if (useTenderly && adapterBytecode) {
    (0, ts_essentials_1.assert)(
      ts instanceof tenderly_simulation_1.TenderlySimulation,
      '`ts`  is not an instance of TenderlySimulation',
    );
    const deployTx = await ts.simulate(
      deployAdapterParams(adapterBytecode, network),
    );
    expect(deployTx.success).toEqual(true);
    const adapterAddress =
      deployTx.transaction.transaction_info.contract_address;
    console.log(
      'Deployed adapter to address',
      adapterAddress,
      'used',
      deployTx.gasUsed,
      'gas',
    );
    const whitelistTx = await ts.simulate(
      whiteListAdapterParams(adapterAddress, network),
    );
    expect(whitelistTx.success).toEqual(true);
  }
  if (useTenderly && thirdPartyAddress) {
    (0, ts_essentials_1.assert)(
      destToken instanceof smart_tokens_1.SmartToken,
      '`destToken` is not an instance of SmartToken',
    );
    (0, ts_essentials_1.assert)(
      ts instanceof tenderly_simulation_1.TenderlySimulation,
      '`ts` is not an instance of TenderlySimulation',
    );
    const stateOverrides = {
      networkID: `${network}`,
      stateOverrides: {},
    };
    destToken.addBalance(constants_e2e_1.GIFTER_ADDRESS, constants_1.MAX_UINT);
    destToken.applyOverrides(stateOverrides);
    const giftTx = makeFakeTransferToSenderAddress(
      thirdPartyAddress,
      destToken.token,
      swapSide === constants_1.SwapSide.SELL
        ? twiceAmount.toString()
        : (BigInt(constants_1.MAX_UINT) / 4n).toString(),
    );
    await ts.simulate(giftTx, stateOverrides);
  }
  const useAPI = exports.testingEndpoint && !poolIdentifiers;
  // The API currently doesn't allow for specifying poolIdentifiers
  const paraswap = new local_paraswap_sdk_1.LocalParaswapSDK(
    network,
    dexKey,
    '',
    limitOrderProvider,
  );
  if (paraswap.initializePricing) await paraswap.initializePricing();
  if (sleepMs) {
    await (0, utils_1.sleep)(sleepMs);
  }
  try {
    const priceRoute = await paraswap.getPrices(
      skipTenderly ? srcToken : srcToken.token,
      skipTenderly ? destToken : destToken.token,
      amount,
      swapSide,
      contractMethod,
      poolIdentifiers,
      transferFees,
    );
    console.log(JSON.stringify(priceRoute));
    expect(parseFloat(priceRoute.destAmount)).toBeGreaterThan(0);
    // Slippage to be 7%
    const minMaxAmount =
      (swapSide === constants_1.SwapSide.SELL
        ? BigInt(priceRoute.destAmount) * 93n
        : BigInt(priceRoute.srcAmount) * 107n) / 100n;
    const swapParams = await paraswap.buildTransaction(
      priceRoute,
      minMaxAmount,
      senderAddress,
    );
    if (useTenderly) {
      (0, ts_essentials_1.assert)(
        srcToken instanceof smart_tokens_1.SmartToken,
        '`srcToken` is not an instance of SmartToken',
      );
      (0, ts_essentials_1.assert)(
        destToken instanceof smart_tokens_1.SmartToken,
        '`destToken` is not an instance of SmartToken',
      );
      (0, ts_essentials_1.assert)(
        ts instanceof tenderly_simulation_1.TenderlySimulation,
        '`ts` is not an instance of TenderlySimulation',
      );
      const stateOverrides = {
        networkID: `${network}`,
        stateOverrides: {},
      };
      srcToken.applyOverrides(stateOverrides);
      destToken.applyOverrides(stateOverrides);
      if (swapSide === constants_1.SwapSide.SELL) {
        srcToken
          .addBalance(senderAddress, twiceAmount.toString())
          .addAllowance(
            senderAddress,
            config.tokenTransferProxyAddress,
            amount.toString(),
          );
      } else {
        srcToken
          .addBalance(senderAddress, constants_1.MAX_UINT)
          .addAllowance(
            senderAddress,
            config.tokenTransferProxyAddress,
            (BigInt(constants_1.MAX_UINT) / 8n).toString(),
          );
      }
      srcToken.applyOverrides(stateOverrides);
      destToken.applyOverrides(stateOverrides);
      const swapTx = await ts.simulate(swapParams, stateOverrides);
      console.log(`${srcToken.address}_${destToken.address}_${dexKey}`);
      // Only log gas estimate if testing against API
      if (useAPI)
        console.log(
          `Gas Estimate API: ${priceRoute.gasCost}, Simulated: ${
            swapTx.gasUsed
          }, Difference: ${
            parseInt(priceRoute.gasCost) - parseInt(swapTx.gasUsed)
          }`,
        );
      console.log(`Tenderly URL: ${swapTx.tenderlyUrl}`);
      expect(swapTx.success).toEqual(true);
    }
  } finally {
    if (paraswap.releaseResources) {
      await paraswap.releaseResources();
    }
  }
}
exports.newTestE2E = newTestE2E;
const getEnv = (envName, optional = false) => {
  if (!process.env[envName]) {
    if (optional) {
      return '';
    }
    throw new Error(`Missing ${envName}`);
  }
  return process.env[envName];
};
exports.getEnv = getEnv;
//# sourceMappingURL=utils-e2e.js.map

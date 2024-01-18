'use strict';
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (
          !desc ||
          ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)
        ) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k];
            },
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? function (o, v) {
        Object.defineProperty(o, 'default', { enumerable: true, value: v });
      }
    : function (o, v) {
        o['default'] = v;
      });
var __importStar =
  (this && this.__importStar) ||
  function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null)
      for (var k in mod)
        if (k !== 'default' && Object.prototype.hasOwnProperty.call(mod, k))
          __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
  };
Object.defineProperty(exports, '__esModule', { value: true });
const dotenv = __importStar(require('dotenv'));
dotenv.config();
const ethers_1 = require('ethers');
const constants_1 = require('../src/constants');
const config_1 = require('../src/dex/paraswap-limit-orders/config');
const config_2 = require('../src/config');
const network = constants_1.Network.ROPSTEN;
const provider = ethers_1.ethers.getDefaultProvider(
  (0, config_2.generateConfig)(network).privateHttpProvider,
);
const makerPK = process.env.MAKER_PK || '';
const taker = '0xCf8C4a46816b146Ed613d23f6D22e1711915d653';
const maker = new ethers_1.ethers.Wallet(makerPK, provider);
const dexKey = 'ParaSwapLimitOrders';
const rfqAddress =
  config_1.ParaSwapLimitOrdersConfig[dexKey][network].rfqAddress.toLowerCase();
const wethAddress = '0xc778417e063141139fce010982780140aa0cd5ab';
const daiAddress = '0xad6d458402f60fd3bd25163575031acdce07538d';
const name = 'AUGUSTUS RFQ';
const version = '1';
const OrderSchema = [
  { name: 'nonceAndMeta', type: 'uint256' },
  { name: 'expiry', type: 'uint128' },
  { name: 'makerAsset', type: 'address' },
  { name: 'takerAsset', type: 'address' },
  { name: 'maker', type: 'address' },
  { name: 'taker', type: 'address' },
  { name: 'makerAmount', type: 'uint256' },
  { name: 'takerAmount', type: 'uint256' },
];
function getRandomInt() {
  return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
}
function buildOrderData(
  chainId,
  verifyingContract,
  nonceAndMeta,
  expiry,
  makerAsset,
  takerAsset,
  makerAmount,
  takerAmount,
  maker,
  taker = constants_1.NULL_ADDRESS,
) {
  const order = {
    nonceAndMeta,
    expiry,
    makerAsset,
    takerAsset,
    maker,
    taker,
    makerAmount,
    takerAmount,
  };
  return {
    types: { Order: OrderSchema },
    domain: { name, version, chainId, verifyingContract },
    order,
  };
}
async function createOrder(makerAmount, takerAmount) {
  const nonceAndMeta = (BigInt(getRandomInt()) << BigInt(160)).toString(10);
  const { order, domain, types } = buildOrderData(
    network,
    rfqAddress,
    nonceAndMeta,
    0,
    daiAddress,
    wethAddress,
    makerAmount,
    takerAmount,
    maker.address,
  );
  console.log('lo', domain, types, order);
  const signature = await maker._signTypedData(domain, types, order);
  const respOrder = {
    ...order,
    nonceAndMeta: `${order.nonceAndMeta}`,
    makerAmount: order.makerAmount.toString(),
    takerAmount: order.takerAmount.toString(),
    makerAsset: order.makerAsset.toString(),
    takerAsset: order.takerAsset.toString(),
    signature: signature,
  };
  console.log(JSON.stringify(respOrder));
}
(async function main() {
  // These are the orders which are used in paraswap-limit-orders-e2e-test.ts
  await createOrder('10000000000000000000', '20000000000000000');
  await createOrder('50000000000000000000', '110000000000000000');
  await createOrder('70000000000000000000', '170000000000000000');
})();
//# sourceMappingURL=generate-new-limit-order.js.map

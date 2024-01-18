'use strict';
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
exports.TenderlySimulation = void 0;
const axios_1 = __importDefault(require('axios'));
const TENDERLY_TOKEN = process.env.TENDERLY_TOKEN;
const TENDERLY_ACCOUNT_ID = process.env.TENDERLY_ACCOUNT_ID;
const TENDERLY_PROJECT = process.env.TENDERLY_PROJECT;
const TENDERLY_FORK_ID = process.env.TENDERLY_FORK_ID;
const TENDERLY_FORK_LAST_TX_ID = process.env.TENDERLY_FORK_LAST_TX_ID;
class TenderlySimulation {
  constructor(network = 1) {
    this.network = network;
    this.lastTx = '';
    this.forkId = '';
    this.maxGasLimit = 80000000;
  }
  async setup() {
    // Fork the mainnet
    if (!TENDERLY_TOKEN)
      throw new Error(
        `TenderlySimulation_setup: TENDERLY_TOKEN not found in the env`,
      );
    if (TENDERLY_FORK_ID) {
      if (!TENDERLY_FORK_LAST_TX_ID) throw new Error('Always set last tx id');
      this.forkId = TENDERLY_FORK_ID;
      this.lastTx = TENDERLY_FORK_LAST_TX_ID;
      return;
    }
    try {
      let res = await axios_1.default.post(
        `https://api.tenderly.co/api/v1/account/${TENDERLY_ACCOUNT_ID}/project/${TENDERLY_PROJECT}/fork`,
        {
          network_id: this.network.toString(),
        },
        {
          timeout: 20000,
          headers: {
            'x-access-key': TENDERLY_TOKEN,
          },
        },
      );
      this.forkId = res.data.simulation_fork.id;
      this.lastTx = res.data.root_transaction.id;
    } catch (e) {
      console.error(`TenderlySimulation_setup:`, e);
      throw e;
    }
  }
  async simulate(params, stateOverrides) {
    let _params = {
      from: params.from,
      to: params.to,
      save: true,
      root: this.lastTx,
      value: params.value || '0',
      gas: this.maxGasLimit,
      input: params.data,
      state_objects: {},
    };
    try {
      if (stateOverrides) {
        const result = await axios_1.default.post(
          `
        https://api.tenderly.co/api/v1/account/${TENDERLY_ACCOUNT_ID}/project/${TENDERLY_PROJECT}/contracts/encode-states`,
          stateOverrides,
          {
            headers: {
              'x-access-key': TENDERLY_TOKEN,
            },
          },
        );
        _params.state_objects = Object.keys(result.data.stateOverrides).reduce(
          (acc, contract) => {
            const _storage = result.data.stateOverrides[contract].value;
            acc[contract] = {
              storage: _storage,
            };
            return acc;
          },
          {},
        );
      }
      const { data } = await axios_1.default.post(
        `https://api.tenderly.co/api/v1/account/${TENDERLY_ACCOUNT_ID}/project/${TENDERLY_PROJECT}/fork/${this.forkId}/simulate`,
        _params,
        {
          timeout: 20 * 1000,
          headers: {
            'x-access-key': TENDERLY_TOKEN,
          },
        },
      );
      const lastTx = data.simulation.id;
      if (data.transaction.status) {
        this.lastTx = lastTx;
        return {
          success: true,
          gasUsed: data.transaction.gas_used,
          tenderlyUrl: `https://dashboard.tenderly.co/${TENDERLY_ACCOUNT_ID}/${TENDERLY_PROJECT}/fork/${this.forkId}/simulation/${lastTx}`,
          transaction: data.transaction,
        };
      } else {
        return {
          success: false,
          tenderlyUrl: `https://dashboard.tenderly.co/${TENDERLY_ACCOUNT_ID}/${TENDERLY_PROJECT}/fork/${this.forkId}/simulation/${lastTx}`,
          error: `Simulation failed: ${data.transaction.error_info.error_message} at ${data.transaction.error_info.address}`,
        };
      }
    } catch (e) {
      console.error(`TenderlySimulation_simulate:`, e);
      return {
        success: false,
        tenderlyUrl: '',
      };
    }
  }
}
exports.TenderlySimulation = TenderlySimulation;
//# sourceMappingURL=tenderly-simulation.js.map

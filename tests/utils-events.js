'use strict';
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
exports.getSavedState =
  exports.saveConfig =
  exports.getSavedConfig =
  exports.deepTypecast =
  exports.testEventSubscriber =
    void 0;
const lodash_1 = __importDefault(require('lodash'));
const fs_1 = __importDefault(require('fs'));
const path_1 = __importDefault(require('path'));
const configPath = './configs.json';
const absConfigPath = path_1.default.join(__dirname, configPath);
let configs = {};
if (fs_1.default.existsSync(absConfigPath)) configs = require(configPath);
const statePath = './states.json';
const absStatePath = path_1.default.join(__dirname, statePath);
let states = {};
if (fs_1.default.existsSync(absStatePath)) states = require(statePath);
const logPath = './logs.json';
const absLogPath = path_1.default.join(__dirname, logPath);
let logs = {};
if (fs_1.default.existsSync(absLogPath)) logs = require(logPath);
const bigintify = val => BigInt(val);
const stringify = val => val.toString();
async function testEventSubscriber(
  eventSubscriber,
  subscribedAddress,
  fetchState,
  blockNumber,
  cacheKey,
  provider,
  stateCompare,
) {
  // Get state of the subscriber block before the event was released
  let poolState = getSavedState(blockNumber - 1, cacheKey);
  if (!poolState) {
    poolState = await fetchState(blockNumber - 1);
    saveState(blockNumber - 1, cacheKey, poolState);
  }
  // Set subscriber state before the event block
  eventSubscriber.setState(poolState, blockNumber - 1);
  eventSubscriber.isTracking = () => true;
  // Get logs and blockHeader of the block when the event was emitted
  let blockInfo = await getSavedBlockInfo(blockNumber, cacheKey);
  if (!blockInfo) {
    const logs = (
      await Promise.all(
        subscribedAddress.map(address =>
          provider.getLogs({
            fromBlock: blockNumber,
            toBlock: blockNumber,
            address,
          }),
        ),
      )
    )
      .flat()
      .sort((a, b) => a.logIndex - b.logIndex);
    blockInfo = {
      logs,
      blockHeaders: {
        [blockNumber]: await provider.getBlock(blockNumber),
      },
    };
    saveBlockInfo(blockNumber, cacheKey, blockInfo);
  }
  // Update subscriber with event logs
  await eventSubscriber.update(blockInfo.logs, blockInfo.blockHeaders);
  // Get the expected state of the subscriber after the event
  let expectedNewPoolState = getSavedState(blockNumber, cacheKey);
  if (!expectedNewPoolState) {
    expectedNewPoolState = await fetchState(blockNumber);
    saveState(blockNumber, cacheKey, expectedNewPoolState);
  }
  // Get the updated state of the subscriber
  const newPoolState = eventSubscriber.getState(blockNumber);
  // Expect the updated state to be same as the expected state
  if (stateCompare) {
    expect(newPoolState).not.toBeNull();
    stateCompare(newPoolState, expectedNewPoolState);
  } else {
    expect(newPoolState).toEqual(expectedNewPoolState);
  }
}
exports.testEventSubscriber = testEventSubscriber;
function deepTypecast(obj, checker, caster) {
  return lodash_1.default.forEach(obj, (val, key, obj) => {
    obj[key] = checker(val)
      ? caster(val)
      : lodash_1.default.isObject(val)
      ? deepTypecast(val, checker, caster)
      : val;
  });
}
exports.deepTypecast = deepTypecast;
function getSavedConfig(blockNumber, cacheKey) {
  const _config = configs[`${cacheKey}_${blockNumber}`];
  if (_config) {
    const checker = obj =>
      lodash_1.default.isString(obj) && obj.includes('bi@');
    const caster = obj => bigintify(obj.slice(3));
    return deepTypecast(lodash_1.default.cloneDeep(_config), checker, caster);
  }
  return undefined;
}
exports.getSavedConfig = getSavedConfig;
function saveConfig(blockNumber, cacheKey, config) {
  const checker = obj => typeof obj === 'bigint';
  const caster = obj => 'bi@'.concat(stringify(obj));
  const _config = deepTypecast(
    lodash_1.default.cloneDeep(config),
    checker,
    caster,
  );
  configs[`${cacheKey}_${blockNumber}`] = _config;
  fs_1.default.writeFileSync(absConfigPath, JSON.stringify(configs, null, 2));
}
exports.saveConfig = saveConfig;
function getSavedState(blockNumber, cacheKey) {
  const _state = states[`${cacheKey}_${blockNumber}`];
  if (_state) {
    const checker = obj =>
      lodash_1.default.isString(obj) && obj.includes('bi@');
    const caster = obj => bigintify(obj.slice(3));
    return deepTypecast(lodash_1.default.cloneDeep(_state), checker, caster);
  }
  return undefined;
}
exports.getSavedState = getSavedState;
function saveState(blockNumber, cacheKey, state) {
  const checker = obj => typeof obj === 'bigint';
  const caster = obj => 'bi@'.concat(stringify(obj));
  const _state = deepTypecast(
    lodash_1.default.cloneDeep(state),
    checker,
    caster,
  );
  states[`${cacheKey}_${blockNumber}`] = _state;
  fs_1.default.writeFileSync(absStatePath, JSON.stringify(states, null, 2));
}
function getSavedBlockInfo(blockNumber, cacheKey) {
  return logs[`${cacheKey}_${blockNumber}`];
}
function saveBlockInfo(blockNumber, cacheKey, blockInfo) {
  logs[`${cacheKey}_${blockNumber}`] = blockInfo;
  fs_1.default.writeFileSync(absLogPath, JSON.stringify(logs, null, 2));
}
//# sourceMappingURL=utils-events.js.map

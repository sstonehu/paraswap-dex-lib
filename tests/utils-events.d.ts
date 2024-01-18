import { Address } from '../src/types';
import { StatefulEventSubscriber } from '../src/stateful-event-subscriber';
import { Provider } from '@ethersproject/providers';
export declare function testEventSubscriber<SubscriberState>(
  eventSubscriber: StatefulEventSubscriber<SubscriberState>,
  subscribedAddress: Address[],
  fetchState: (blocknumber: number) => Promise<SubscriberState>,
  blockNumber: number,
  cacheKey: string,
  provider: Provider,
  stateCompare?: (
    state: SubscriberState,
    expectedState: SubscriberState,
  ) => void,
): Promise<void>;
export declare function deepTypecast<T>(
  obj: any,
  checker: (val: any) => boolean,
  caster: (val: T) => any,
): any;
export declare function getSavedConfig<Config>(
  blockNumber: number,
  cacheKey: string,
): Config | undefined;
export declare function saveConfig<Config>(
  blockNumber: number,
  cacheKey: string,
  config: Config,
): void;
export declare function getSavedState<SubscriberState>(
  blockNumber: number,
  cacheKey: string,
): SubscriberState | undefined;

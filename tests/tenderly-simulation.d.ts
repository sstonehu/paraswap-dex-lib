import { TxObject } from '../src/types';
import { StateOverrides } from './smart-tokens';
export declare class TenderlySimulation {
  private network;
  lastTx: string;
  forkId: string;
  maxGasLimit: number;
  constructor(network?: Number);
  setup(): Promise<void>;
  simulate(
    params: TxObject,
    stateOverrides?: StateOverrides,
  ): Promise<
    | {
        success: boolean;
        gasUsed: any;
        tenderlyUrl: string;
        transaction: any;
        error?: undefined;
      }
    | {
        success: boolean;
        tenderlyUrl: string;
        error: string;
        gasUsed?: undefined;
        transaction?: undefined;
      }
    | {
        success: boolean;
        tenderlyUrl: string;
        gasUsed?: undefined;
        transaction?: undefined;
        error?: undefined;
      }
  >;
}

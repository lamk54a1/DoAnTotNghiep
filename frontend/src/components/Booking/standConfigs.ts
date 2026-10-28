export const STAND_KEYS = ['A1', 'A2', 'A3', 'A5', 'B8', 'B9', 'B10', 'C6', 'C7', 'D11', 'D12', 'D13'] as const;
export type StandKey = typeof STAND_KEYS[number];

export interface StandDetail {
  name: string;
  rows: number;
  seatsPerRow: number;
  price: number;
  color: string;
}

export const STAND_CONFIGS: Record<StandKey, StandDetail> = {
  A1: { name: 'Khu A1', rows: 20, seatsPerRow: 100, price: 150000, color: '#df1645' },
  A2: { name: 'Khu A2', rows: 20, seatsPerRow: 100, price: 100000, color: '#f4c51d' },
  A3: { name: 'Khu A3', rows: 20, seatsPerRow: 100, price: 100000, color: '#f4c51d' },
  A5: { name: 'Khu A5', rows: 20, seatsPerRow: 100, price: 80000, color: '#69a0d4' },
  B8: { name: 'Khu B8', rows: 20, seatsPerRow: 100, price: 50000, color: '#f4a621' },
  B9: { name: 'Khu B9', rows: 20, seatsPerRow: 100, price: 50000, color: '#f4a621' },
  B10: { name: 'Khu B10', rows: 20, seatsPerRow: 100, price: 50000, color: '#f4a621' },
  C6: { name: 'Khu C6', rows: 15, seatsPerRow: 100, price: 30000, color: '#8fbd42' },
  C7: { name: 'Khu C7', rows: 15, seatsPerRow: 100, price: 30000, color: '#8fbd42' },
  D11: { name: 'Khu D11', rows: 10, seatsPerRow: 100, price: 30000, color: '#69a0d4' },
  D12: { name: 'Khu D12', rows: 10, seatsPerRow: 100, price: 30000, color: '#69a0d4' },
  D13: { name: 'Khu D13', rows: 10, seatsPerRow: 100, price: 30000, color: '#69a0d4' },
};

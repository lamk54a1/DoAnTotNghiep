export type StandKey = 'A' | 'B' | 'C' | 'D';

export interface StandDetail {
  name: string;
  rows: number;
  seatsPerRow: number;
  price: number;
  color: string;
}

export const STAND_CONFIGS: Record<StandKey, StandDetail> = {
  A: { name: 'Khán đài A', rows: 80, seatsPerRow: 100, price: 100000, color: '#003078' },
  B: { name: 'Khán đài B', rows: 60, seatsPerRow: 100, price: 50000, color: '#edbb00' },
  C: { name: 'Khán đài C', rows: 30, seatsPerRow: 100, price: 20000, color: '#2ecc71' },
  D: { name: 'Khán đài D', rows: 30, seatsPerRow: 100, price: 20000, color: '#e74c3c' },
};

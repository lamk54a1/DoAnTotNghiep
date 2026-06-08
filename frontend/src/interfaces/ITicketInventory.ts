export interface IStandInventory {
  total: number;
  available: number;
  sold: number;
  paperReserved: number;
  paperSold: number;
  scanned: number;
  revenue: number;
  paperRevenue: number;
}

export type ITicketInventory = Record<'A' | 'B' | 'C' | 'D', IStandInventory>;

export interface IStandInventory {
  total: number;
  available: number;
  sold: number;
  paperReserved: number;
  paperSold: number;
  paperPrinted: number;
  paperReservedPrinted: number;
  scanned: number;
  revenue: number;
  paperRevenue: number;
}

export type ITicketInventory = Record<string, IStandInventory>;

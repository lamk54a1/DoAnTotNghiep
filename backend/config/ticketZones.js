const TICKET_ZONES = [
  { prefix: 'A1', rows: 20, seatsPerRow: 100, price: 150000 },
  { prefix: 'A2', rows: 20, seatsPerRow: 100, price: 100000 },
  { prefix: 'A3', rows: 20, seatsPerRow: 100, price: 100000 },
  { prefix: 'A5', rows: 20, seatsPerRow: 100, price: 80000 },
  { prefix: 'B8', rows: 20, seatsPerRow: 100, price: 50000 },
  { prefix: 'B9', rows: 20, seatsPerRow: 100, price: 50000 },
  { prefix: 'B10', rows: 20, seatsPerRow: 100, price: 50000 },
  { prefix: 'C6', rows: 15, seatsPerRow: 100, price: 30000 },
  { prefix: 'C7', rows: 15, seatsPerRow: 100, price: 30000 },
  { prefix: 'D11', rows: 10, seatsPerRow: 100, price: 30000 },
  { prefix: 'D12', rows: 10, seatsPerRow: 100, price: 30000 },
  { prefix: 'D13', rows: 10, seatsPerRow: 100, price: 30000 },
];

const DEFAULT_ZONE_PRICES = Object.fromEntries(TICKET_ZONES.map(({ prefix, price }) => [prefix, price]));
const TICKET_ZONE_KEYS = TICKET_ZONES.map(({ prefix }) => prefix);

module.exports = { TICKET_ZONES, TICKET_ZONE_KEYS, DEFAULT_ZONE_PRICES };

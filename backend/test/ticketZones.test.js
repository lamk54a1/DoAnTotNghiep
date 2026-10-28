const test = require('node:test');
const assert = require('node:assert/strict');
const { TICKET_ZONES, TICKET_ZONE_KEYS, DEFAULT_ZONE_PRICES } = require('../config/ticketZones');

test('cấu hình vé phản ánh đủ 12 khu trên sơ đồ sân Vinh', () => {
  assert.deepEqual(TICKET_ZONE_KEYS, [
    'A1', 'A2', 'A3', 'A5', 'B8', 'B9', 'B10', 'C6', 'C7', 'D11', 'D12', 'D13',
  ]);
  assert.equal(new Set(TICKET_ZONE_KEYS).size, TICKET_ZONES.length);
  assert.ok(TICKET_ZONES.every((zone) => zone.rows > 0 && zone.seatsPerRow > 0));
  assert.ok(TICKET_ZONES.every((zone) => DEFAULT_ZONE_PRICES[zone.prefix] === zone.price));
});

test('mã ghế mới có chứa khu, hàng và số ghế nên không trùng giữa các khu', () => {
  const seatCodes = TICKET_ZONES.flatMap((zone) => [
    `${zone.prefix}-R01-001`,
    `${zone.prefix}-R${String(zone.rows).padStart(2, '0')}-${String(zone.seatsPerRow).padStart(3, '0')}`,
  ]);

  assert.equal(new Set(seatCodes).size, seatCodes.length);
  assert.ok(seatCodes.every((seatCode) => /^[A-D][0-9]+-R[0-9]{2}-[0-9]{3}$/.test(seatCode)));
});

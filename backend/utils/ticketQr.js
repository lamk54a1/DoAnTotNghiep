const { v4: uuidv4 } = require('uuid');

const assignTicketQrCodes = async (client, orderIds) => {
  const tickets = await client.query(
    `SELECT id FROM tickets
     WHERE order_id = ANY($1::int[]) AND ticket_qr_code IS NULL
     FOR UPDATE`,
    [orderIds]
  );
  for (const ticket of tickets.rows) {
    await client.query(
      'UPDATE tickets SET ticket_qr_code = $1 WHERE id = $2',
      [`TICKET-${uuidv4().substring(0, 12).toUpperCase()}`, ticket.id]
    );
  }
};

module.exports = { assignTicketQrCodes };

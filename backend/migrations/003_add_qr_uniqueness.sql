CREATE UNIQUE INDEX IF NOT EXISTS orders_order_qr_code_unique_idx
ON orders (order_qr_code) WHERE order_qr_code IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS tickets_ticket_qr_code_unique_idx
ON tickets (ticket_qr_code) WHERE ticket_qr_code IS NOT NULL;

-- Owner 26/11/2026: existing order data is synthetic. Deposits and refunds are bank
-- transfers with one receipt image; returned orders close in one step.
UPDATE order_payments SET transaction_type='DEPOSIT' WHERE transaction_type='PAYMENT';
ALTER TABLE order_payments DROP CONSTRAINT order_payments_transaction_type_check;
ALTER TABLE order_payments ADD CONSTRAINT order_payments_transaction_type_check CHECK(transaction_type IN ('DEPOSIT','REFUND'));
ALTER TABLE order_payments DROP COLUMN payment_method;
ALTER TABLE order_payments
 ADD COLUMN proof_key VARCHAR(200), ADD COLUMN proof_mime VARCHAR(16),
 ADD COLUMN proof_bytes INTEGER CHECK(proof_bytes>0), ADD COLUMN proof_sha256 CHAR(64),
 ADD CONSTRAINT order_payments_proof_complete CHECK(
  (proof_key IS NULL AND proof_mime IS NULL AND proof_bytes IS NULL AND proof_sha256 IS NULL) OR
  (proof_key IS NOT NULL AND proof_mime IN ('image/jpeg','image/png') AND proof_bytes IS NOT NULL AND proof_sha256 IS NOT NULL));

UPDATE orders SET status='COMPLETED' WHERE status='UNSUCCESSFUL';
ALTER TABLE orders DROP CONSTRAINT orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK(status IN ('DRAFT','KEEPING','READY_TO_SHIP','COMPLETED','CANCELLED'));

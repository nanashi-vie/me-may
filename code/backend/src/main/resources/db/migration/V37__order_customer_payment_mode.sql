ALTER TABLE orders ADD COLUMN customer_payment_mode varchar(16)
  CHECK (customer_payment_mode IN ('RECIPIENT', 'MONTHLY'));

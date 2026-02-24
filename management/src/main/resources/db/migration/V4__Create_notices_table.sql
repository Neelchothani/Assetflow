CREATE TABLE IF NOT EXISTS notices (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    priority VARCHAR(50) NOT NULL DEFAULT 'info',
    created_by VARCHAR(200),
    created_at TIMESTAMP DEFAULT NOW(),
    expiry_date DATE,
    invoice_status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    atm_id BIGINT REFERENCES atms(id) ON DELETE SET NULL,
    is_auto_generated BOOLEAN NOT NULL DEFAULT FALSE
);

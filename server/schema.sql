
-- Database Schema for Angkringan POS Pro
-- CREATE DATABASE IF NOT EXISTS angkringan_pos; -- Di Railway DB otomatis dibuat
-- USE angkringan_pos;

-- Outlets Table
CREATE TABLE IF NOT EXISTS outlets (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    address TEXT
);

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    role ENUM('ADMIN', 'CASHIER') DEFAULT 'CASHIER',
    outlet_id VARCHAR(50),
    pin VARCHAR(6),
    FOREIGN KEY (outlet_id) REFERENCES outlets(id)
);

-- Products Table
CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(15, 2) NOT NULL,
    cost_price DECIMAL(15, 2) NOT NULL,
    category VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    outlet_id VARCHAR(50),
    FOREIGN KEY (outlet_id) REFERENCES outlets(id)
);

-- Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
    id VARCHAR(50) PRIMARY KEY,
    subtotal DECIMAL(15, 2) NOT NULL,
    discount DECIMAL(15, 2) DEFAULT 0,
    total DECIMAL(15, 2) NOT NULL,
    payment_method VARCHAR(20) NOT NULL,
    customer_name VARCHAR(100),
    status ENUM('COMPLETED', 'VOIDED') DEFAULT 'COMPLETED',
    void_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    outlet_id VARCHAR(50),
    cashier_id VARCHAR(50),
    FOREIGN KEY (outlet_id) REFERENCES outlets(id),
    FOREIGN KEY (cashier_id) REFERENCES users(id)
);

-- Transaction Items Table (Snapshot of product data at purchase time)
CREATE TABLE IF NOT EXISTS transaction_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    transaction_id VARCHAR(50),
    product_id VARCHAR(50),
    name VARCHAR(255) NOT NULL,
    price DECIMAL(15, 2) NOT NULL,
    cost_price DECIMAL(15, 2) NOT NULL,
    quantity INT NOT NULL,
    note TEXT,
    FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
);

-- App Config Table (QRIS, etc)
CREATE TABLE IF NOT EXISTS app_config (
    config_key VARCHAR(50) PRIMARY KEY,
    config_value JSON NOT NULL
);

-- Seed Initial Data (Gunakan IGNORE agar tidak error duplikat saat restart)
INSERT IGNORE INTO outlets (id, name, address) VALUES ('o1', 'Angkringan Pusat', 'Jl. Malioboro No. 1');
INSERT IGNORE INTO users (id, name, role, outlet_id, pin) VALUES ('u1', 'Alfian Dimas', 'ADMIN', 'o1', '123456');
INSERT IGNORE INTO app_config (config_key, config_value) VALUES ('qris', '{"merchantName": "ANGKRINGAN PRO", "isActive": true, "qrImageUrl": ""}');

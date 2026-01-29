
-- DATABASE REBUILD - ANGKRINGAN POS PRO
-- Clean and robust schema for MySQL

-- 1. Outlets Table
CREATE TABLE IF NOT EXISTS outlets (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    address TEXT
);

-- 2. Users Table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    role ENUM('ADMIN', 'CASHIER') DEFAULT 'CASHIER',
    outlet_id VARCHAR(50),
    pin VARCHAR(6),
    FOREIGN KEY (outlet_id) REFERENCES outlets(id)
);

-- 3. Products Table (The core of the issue)
CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(15, 2) NOT NULL DEFAULT 0,
    cost_price DECIMAL(15, 2) NOT NULL DEFAULT 0,
    category VARCHAR(50) NOT NULL,
    is_active TINYINT(1) DEFAULT 1, -- Explicit TinyInt for Boolean
    outlet_id VARCHAR(50),
    INDEX idx_category (category),
    INDEX idx_active (is_active),
    FOREIGN KEY (outlet_id) REFERENCES outlets(id)
);

-- 4. Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
    id VARCHAR(50) PRIMARY KEY,
    subtotal DECIMAL(15, 2) NOT NULL DEFAULT 0,
    discount DECIMAL(15, 2) DEFAULT 0,
    total DECIMAL(15, 2) NOT NULL DEFAULT 0,
    payment_method VARCHAR(20) NOT NULL,
    customer_name VARCHAR(100),
    status ENUM('COMPLETED', 'VOIDED') DEFAULT 'COMPLETED',
    void_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    outlet_id VARCHAR(50),
    cashier_id VARCHAR(50),
    INDEX idx_created (created_at),
    FOREIGN KEY (outlet_id) REFERENCES outlets(id),
    FOREIGN KEY (cashier_id) REFERENCES users(id)
);

-- 5. Transaction Items Table
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

-- Initial Seeding
INSERT IGNORE INTO outlets (id, name, address) VALUES ('o1', 'Angkringan Pusat', 'Jl. Malioboro No. 1');
INSERT IGNORE INTO users (id, name, role, outlet_id, pin) VALUES ('u1', 'Alfian Dimas', 'ADMIN', 'o1', '123456');

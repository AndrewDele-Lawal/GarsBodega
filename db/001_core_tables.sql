-- ============================================================
-- LOOKUP TABLES
-- ============================================================

DROP TABLE IF EXISTS SupplierProduct CASCADE;
DROP TABLE IF EXISTS Supplier CASCADE;
DROP TABLE IF EXISTS DeliveryPlan CASCADE;
DROP TABLE IF EXISTS OrderItem CASCADE;
DROP TABLE IF EXISTS Orders CASCADE;
DROP TABLE IF EXISTS CartItem CASCADE;
DROP TABLE IF EXISTS ShoppingCart CASCADE;
DROP TABLE IF EXISTS Stock CASCADE;
DROP TABLE IF EXISTS ProductImage CASCADE;
DROP TABLE IF EXISTS Product CASCADE;
DROP TABLE IF EXISTS StaffMember CASCADE;
DROP TABLE IF EXISTS Warehouse CASCADE;
DROP TABLE IF EXISTS CreditCard CASCADE;
DROP TABLE IF EXISTS CustomerAddress CASCADE;
DROP TABLE IF EXISTS Customer CASCADE;
DROP TABLE IF EXISTS Address CASCADE;
DROP TABLE IF EXISTS OrderStatus CASCADE;
DROP TABLE IF EXISTS DeliveryType CASCADE;

CREATE TABLE OrderStatus (
    status_id   SERIAL PRIMARY KEY,
    status_name VARCHAR(50) NOT NULL UNIQUE
);

INSERT INTO OrderStatus (status_name) VALUES ('issued'), ('sent'), ('received');

CREATE TABLE DeliveryType (
    delivery_type_id   SERIAL PRIMARY KEY,
    delivery_type_name VARCHAR(50) NOT NULL UNIQUE
);

INSERT INTO DeliveryType (delivery_type_name) VALUES ('standard'), ('express');

-- ============================================================
-- ADDRESS
-- ============================================================

CREATE TABLE Address (
    address_id SERIAL PRIMARY KEY,
    street     VARCHAR(255) NOT NULL,
    city       VARCHAR(100) NOT NULL,
    state_name VARCHAR(100) NOT NULL,
    zip_code   VARCHAR(20)  NOT NULL,
    country    VARCHAR(100) NOT NULL DEFAULT 'USA'
);

-- ============================================================
-- CUSTOMER
-- ============================================================

CREATE TABLE Customer (
    customer_id     SERIAL PRIMARY KEY,
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100) NOT NULL,
    email           VARCHAR(255) NOT NULL UNIQUE,
    phone           VARCHAR(20),
    account_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (account_balance >= 0),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE CustomerAddress (
    customer_id  INTEGER NOT NULL REFERENCES Customer(customer_id) ON DELETE CASCADE,
    address_id   INTEGER NOT NULL REFERENCES Address(address_id) ON DELETE CASCADE,
    address_type VARCHAR(50) CHECK (address_type IN ('delivery', 'payment', 'both')),
    PRIMARY KEY (customer_id, address_id)
);

CREATE TABLE CreditCard (
    card_id          SERIAL PRIMARY KEY,
    customer_id      INTEGER NOT NULL REFERENCES Customer(customer_id) ON DELETE CASCADE,
    card_last_four   CHAR(4)      NOT NULL,
    card_type        VARCHAR(50)  NOT NULL,
    expiration_date  DATE         NOT NULL,
    cardholder_name  VARCHAR(255) NOT NULL,
    address_id       INTEGER REFERENCES Address(address_id)
);

-- ============================================================
-- WAREHOUSE / STAFF
-- ============================================================

CREATE TABLE Warehouse (
    warehouse_id   SERIAL PRIMARY KEY,
    warehouse_name VARCHAR(255) NOT NULL,
    capacity       INTEGER NOT NULL DEFAULT 1000 CHECK (capacity >= 0),
    address_id     INTEGER REFERENCES Address(address_id)
);

CREATE TABLE StaffMember (
    staff_id   SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name  VARCHAR(100) NOT NULL,
    email      VARCHAR(255) NOT NULL UNIQUE,
    role       VARCHAR(100) NOT NULL DEFAULT 'staff',
    address_id INTEGER REFERENCES Address(address_id)
);

-- ============================================================
-- PRODUCT
-- ============================================================

CREATE TABLE Product (
    product_id    SERIAL PRIMARY KEY,
    product_name  VARCHAR(255) NOT NULL,
    description   TEXT,
    current_price NUMERIC(10, 2) NOT NULL CHECK (current_price >= 0),
    product_type  VARCHAR(100),
    total_stock   INTEGER NOT NULL DEFAULT 0 CHECK (total_stock >= 0)
);

CREATE TABLE ProductImage (
    image_id   SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES Product(product_id) ON DELETE CASCADE,
    image_url  TEXT NOT NULL
);

CREATE TABLE Stock (
    stock_id     SERIAL PRIMARY KEY,
    product_id   INTEGER NOT NULL REFERENCES Product(product_id) ON DELETE CASCADE,
    warehouse_id INTEGER NOT NULL REFERENCES Warehouse(warehouse_id) ON DELETE CASCADE,
    quantity     INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    UNIQUE (product_id, warehouse_id)
);

-- ============================================================
-- SHOPPING CART
-- ============================================================

CREATE TABLE ShoppingCart (
    cart_id     SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL UNIQUE REFERENCES Customer(customer_id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE CartItem (
    cart_item_id SERIAL PRIMARY KEY,
    cart_id      INTEGER NOT NULL REFERENCES ShoppingCart(cart_id) ON DELETE CASCADE,
    product_id   INTEGER NOT NULL REFERENCES Product(product_id) ON DELETE CASCADE,
    quantity     INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    UNIQUE (cart_id, product_id)
);

-- ============================================================
-- ORDERS
-- ============================================================

CREATE TABLE Orders (
    order_id    SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES Customer(customer_id) ON DELETE CASCADE,
    card_id     INTEGER REFERENCES CreditCard(card_id),
    order_total NUMERIC(12, 2) NOT NULL CHECK (order_total >= 0),
    status_id   INTEGER NOT NULL REFERENCES OrderStatus(status_id) DEFAULT 1,
    order_date  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE OrderItem (
    order_item_id SERIAL PRIMARY KEY,
    order_id      INTEGER NOT NULL REFERENCES Orders(order_id) ON DELETE CASCADE,
    product_id    INTEGER NOT NULL REFERENCES Product(product_id),
    quantity      INTEGER NOT NULL CHECK (quantity > 0),
    unit_price    NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0)
);

CREATE TABLE DeliveryPlan (
    delivery_id             SERIAL PRIMARY KEY,
    order_id                INTEGER NOT NULL UNIQUE REFERENCES Orders(order_id) ON DELETE CASCADE,
    address_id              INTEGER REFERENCES Address(address_id),
    delivery_type_id        INTEGER NOT NULL REFERENCES DeliveryType(delivery_type_id) DEFAULT 1,
    delivery_price          NUMERIC(8, 2) NOT NULL DEFAULT 0.00 CHECK (delivery_price >= 0),
    delivery_status         VARCHAR(50) NOT NULL DEFAULT 'scheduled',
    ship_date               DATE,
    estimated_delivery_date DATE
);

-- ============================================================
-- SUPPLIER
-- ============================================================

CREATE TABLE Supplier (
    supplier_id   SERIAL PRIMARY KEY,
    supplier_name VARCHAR(255) NOT NULL,
    address_id    INTEGER REFERENCES Address(address_id)
);

CREATE TABLE SupplierProduct (
    supplier_id    INTEGER NOT NULL REFERENCES Supplier(supplier_id) ON DELETE CASCADE,
    product_id     INTEGER NOT NULL REFERENCES Product(product_id)   ON DELETE CASCADE,
    supplier_price NUMERIC(10, 2) NOT NULL CHECK (supplier_price >= 0),
    PRIMARY KEY (supplier_id, product_id)
);

-- ============================================================
-- INDICES
-- ============================================================

CREATE INDEX idx_orders_customer    ON Orders(customer_id);
CREATE INDEX idx_orders_status      ON Orders(status_id);
CREATE INDEX idx_orderitem_order    ON OrderItem(order_id);
CREATE INDEX idx_orderitem_product  ON OrderItem(product_id);
CREATE INDEX idx_stock_product      ON Stock(product_id);
CREATE INDEX idx_stock_warehouse    ON Stock(warehouse_id);
CREATE INDEX idx_cartitem_cart      ON CartItem(cart_id);
CREATE INDEX idx_deliveryplan_order ON DeliveryPlan(order_id);
CREATE INDEX idx_product_type       ON Product(product_type);



-- LOOKUP TABLES
 
CREATE TABLE OrderStatus (
    status_id SERIAL PRIMARY KEY,
    status_name VARCHAR(50) NOT NULL UNIQUE  -- 'issued', 'sent', 'received'
);
 
CREATE TABLE DeliveryType (
    delivery_type_id SERIAL PRIMARY KEY,
    delivery_type_name VARCHAR(50) NOT NULL UNIQUE  -- 'standard', 'express'
);
 
INSERT INTO OrderStatus (status_name) VALUES ('issued'), ('sent'), ('received');
INSERT INTO DeliveryType (delivery_type_name) VALUES ('standard'), ('express');
 
 
-- ------------------------------------------------------------
-- ADDRESS
-- Shared across customers, staff, warehouses, suppliers, cards
 
CREATE TABLE Address (
    address_id SERIAL PRIMARY KEY,
    street VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state_name VARCHAR(100) NOT NULL,
    zip_code VARCHAR(20)  NOT NULL,
    country VARCHAR(100) NOT NULL 
);
-- CUSTOMER
CREATE TABLE Customer (
    customer_id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    last_name VARCHAR(100) NOT NULL,
    account_balance NUMERIC(12, 2) NOT NULL 
);
-- CUSTOMER <-> ADDRESS  (many-to-many with address_type label)
CREATE TABLE CustomerAddress (
    customer_id INTEGER NOT NULL REFERENCES Customer(customer_id) ,
    address_id INTEGER NOT NULL REFERENCES Address(address_id),
    address_type VARCHAR(50),  
    PRIMARY KEY (customer_id, address_id)
);
-- CREDIT CARD
 
CREATE TABLE CreditCard (
    card_id SERIAL PRIMARY KEY,
    card_number VARCHAR(20) NOT NULL, 
    customer_id INTEGER NOT NULL REFERENCES Customer(customer_id),
    address_id  INTEGER NOT NULL REFERENCES Address(address_id) 
);
-- WAREHOUSE
CREATE TABLE Warehouse (
    warehouse_id SERIAL PRIMARY KEY,
    address_id INTEGER NOT NULL REFERENCES Address(address_id),
    capacity_size INTEGER CHECK (capacity_size > 0) 
);
-- STAFF MEMBER
CREATE TABLE StaffMember (
    staff_id  SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    last_name VARCHAR(100) NOT NULL,
    salary NUMERIC(10, 2) NOT NULL,
    job_title VARCHAR(100) NOT NULL,
    address_id INTEGER REFERENCES Address(address_id),
    warehouse_id INTEGER REFERENCES Warehouse(warehouse_id)
);
-- PRODUCT
-- category and type stored directly as columns
 
CREATE TABLE Product (
    product_id SERIAL PRIMARY KEY,
    product_name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    product_type VARCHAR(100) NOT NULL,
    brand VARCHAR(100),
    product_size VARCHAR(50),
    short_description TEXT,
    current_price NUMERIC(10, 2) NOT NULL CHECK (current_price >= 0)
);
-- PRODUCT IMAGE  (bonus -- one product can have many images)
 
CREATE TABLE ProductImage (
    image_id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES Product(product_id),
    image_url VARCHAR(500) NOT NULL
);
-- STOCK
CREATE TABLE Stock (
    warehouse_id INTEGER NOT NULL REFERENCES Warehouse(warehouse_id),
    product_id  INTEGER NOT NULL REFERENCES Product(product_id) ,
    quantity_on_hand INTEGER NOT NULL DEFAULT 0 CHECK (quantity_on_hand >= 0),
    PRIMARY KEY (warehouse_id, product_id)
);
-- SHOPPING CART
 
CREATE TABLE ShoppingCart (
    cart_id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL UNIQUE REFERENCES Customer(customer_id)
);
 
CREATE TABLE CartItem (
    cart_id    INTEGER NOT NULL REFERENCES ShoppingCart(cart_id),
    product_id INTEGER NOT NULL REFERENCES Product(product_id),
    quantity   INTEGER NOT NULL CHECK (quantity > 0),
    PRIMARY KEY (cart_id, product_id)
);
 
CREATE TABLE "Order" (
    order_id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES Customer(customer_id),
    card_id INTEGER NOT NULL REFERENCES CreditCard(card_id),
    order_date  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status_id INTEGER NOT NULL REFERENCES OrderStatus(status_id) DEFAULT 1
);
 
CREATE TABLE OrderItem (
    order_id INTEGER NOT NULL REFERENCES "Order"(order_id),
    product_id INTEGER NOT NULL REFERENCES Product(product_id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price_at_order NUMERIC(10, 2) NOT NULL CHECK (unit_price_at_order >= 0),
    order_price NUMERIC(12, 2) GENERATED ALWAYS AS (quantity * unit_price_at_order) STORED,
    PRIMARY KEY (order_id, product_id)
);
 
CREATE TABLE DeliveryPlan (
    delivery_plan_id SERIAL  PRIMARY KEY,
    order_id         INTEGER NOT NULL UNIQUE REFERENCES "Order"(order_id),
    delivery_type_id INTEGER NOT NULL REFERENCES DeliveryType(delivery_type_id),
    delivery_price   NUMERIC(8, 2) NOT NULL CHECK (delivery_price >= 0),
    ship_date  DATE,
    delivery_date   DATE
);
-- BONUS: SUPPLIER
 
CREATE TABLE Supplier (
    supplier_id INTEGER PRIMARY KEY,
    supplier_name  VARCHAR(255) NOT NULL,
    address_id  INTEGER REFERENCES Address(address_id)
);
 
CREATE TABLE SupplierProduct (
    supplier_id INTEGER  NOT NULL REFERENCES Supplier(supplier_id),
    product_id   INTEGER  NOT NULL REFERENCES Product(product_id),
    supplier_price NUMERIC(10, 2) NOT NULL CHECK (supplier_price >= 0),
    PRIMARY KEY (supplier_id, product_id)
);

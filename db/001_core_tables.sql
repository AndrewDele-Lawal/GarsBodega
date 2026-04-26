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

-- ADDRESS
CREATE TABLE Address (
    address_id SERIAL PRIMARY KEY,
    street VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state_name VARCHAR(100) NOT NULL,
    zip_code VARCHAR(20) NOT NULL,
    country VARCHAR(100) NOT NULL
);

-- CUSTOMER
CREATE TABLE Customer (
    customer_id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    last_name VARCHAR(100) NOT NULL,
    account_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (account_balance >= 0)
);

-- CUSTOMER <-> ADDRESS
CREATE TABLE CustomerAddress (
    customer_id INTEGER NOT NULL REFERENCES Customer(customer_id) ON DELETE CASCADE,
    address_id INTEGER NOT NULL REFERENCES Address(address_id) ON DELETE CASCADE,
    address_type VARCHAR(50) NOT NULL CHECK (address_type IN ('delivery', 'payment', 'both')),
    PRIMARY KEY (customer_id, address_id)
);

-- CREDIT CARD
CREATE TABLE CreditCard (
    card_id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES Customer(customer_id) ON DELETE CASCADE,
    address_id INTEGER NOT NULL REFERENCES Address(address_id),
    card_last_four VARCHAR(4) NOT NULL CHECK (card_last_four ~ '^[0-9]{4}$'),
    card_type VARCHAR(50) NOT NULL,
    expiration_date VARCHAR(10) NOT NULL,
    cardholder_name VARCHAR(150) NOT NULL
);

-- WAREHOUSE
CREATE TABLE Warehouse (
    warehouse_id SERIAL PRIMARY KEY,
    address_id INTEGER NOT NULL REFERENCES Address(address_id),
    capacity_size INTEGER CHECK (capacity_size > 0)
);

-- STAFF MEMBER
CREATE TABLE StaffMember (
    staff_id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    last_name VARCHAR(100) NOT NULL,
    salary NUMERIC(10, 2) NOT NULL,
    job_title VARCHAR(100) NOT NULL,
    address_id INTEGER REFERENCES Address(address_id),
    warehouse_id INTEGER REFERENCES Warehouse(warehouse_id)
);

-- PRODUCT
CREATE TABLE Product (
    product_id SERIAL PRIMARY KEY,
    product_name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    product_type VARCHAR(100) NOT NULL,
    brand VARCHAR(100),
    product_size VARCHAR(50),
    short_description TEXT,
    current_price NUMERIC(10, 2) NOT NULL CHECK (current_price >= 0),
    total_stock INTEGER NOT NULL DEFAULT 0 CHECK (total_stock >= 0)
);

-- PRODUCT IMAGE
CREATE TABLE ProductImage (
    image_id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES Product(product_id) ON DELETE CASCADE,
    image_url VARCHAR(500) NOT NULL
);

-- STOCK
CREATE TABLE Stock (
    warehouse_id INTEGER NOT NULL REFERENCES Warehouse(warehouse_id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES Product(product_id) ON DELETE CASCADE,
    quantity_on_hand INTEGER NOT NULL DEFAULT 0 CHECK (quantity_on_hand >= 0),
    PRIMARY KEY (warehouse_id, product_id)
);

-- SHOPPING CART
CREATE TABLE ShoppingCart (
    cart_id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL UNIQUE REFERENCES Customer(customer_id) ON DELETE CASCADE
);

CREATE TABLE CartItem (
    cart_id INTEGER NOT NULL REFERENCES ShoppingCart(cart_id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES Product(product_id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    PRIMARY KEY (cart_id, product_id)
);

-- ORDERS
CREATE TABLE Orders (
    order_id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES Customer(customer_id) ON DELETE CASCADE,
    order_total NUMERIC(12, 2) NOT NULL CHECK (order_total >= 0),
    order_status VARCHAR(50) NOT NULL DEFAULT 'pending',
    order_date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE OrderItem (
    order_id INTEGER NOT NULL REFERENCES Orders(order_id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES Product(product_id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
    PRIMARY KEY (order_id, product_id)
);

CREATE TABLE DeliveryPlan (
    delivery_id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL UNIQUE REFERENCES Orders(order_id) ON DELETE CASCADE,
    delivery_status VARCHAR(50) NOT NULL DEFAULT 'scheduled',
    estimated_delivery_date DATE
);

-- BONUS Point Tables: SUPPLIER may or may not be used :/
CREATE TABLE Supplier (
    supplier_id SERIAL PRIMARY KEY,
    supplier_name VARCHAR(255) NOT NULL,
    address_id INTEGER REFERENCES Address(address_id)
);

CREATE TABLE SupplierProduct (
    supplier_id INTEGER NOT NULL REFERENCES Supplier(supplier_id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES Product(product_id) ON DELETE CASCADE,
    supplier_price NUMERIC(10, 2) NOT NULL CHECK (supplier_price >= 0),
    PRIMARY KEY (supplier_id, product_id)
);
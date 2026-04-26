-- ---------------------------------
-- ADDRESS
-- ---------------------------------
INSERT INTO Address (street, city, state_name, zip_code, country)
VALUES
('101 Plaza Way', 'Lakewood', 'Turbo State', '10001', 'USA'),
('202 Hero Lane', 'Lakewood', 'Turbo State', '10002', 'USA'),
('303 Supply Ave', 'Lakewood', 'Turbo State', '10003', 'USA');

-- ---------------------------------
-- CUSTOMER
-- ---------------------------------
INSERT INTO Customer (first_name, middle_name, last_name, account_balance)
VALUES ('Luffy', 'D', 'Monkey', 100.00);

-- Link customer to address 2
INSERT INTO CustomerAddress (customer_id, address_id, address_type)
VALUES (1, 2, 'both');

-- ---------------------------------
-- CREDIT CARD
-- ---------------------------------
INSERT INTO CreditCard (customer_id, address_id, card_last_four, card_type, expiration_date, cardholder_name)
VALUES (1, 2, '4242', 'Visa', '12/28', 'K Hero');

-- ---------------------------------
-- WAREHOUSE
-- ---------------------------------
INSERT INTO Warehouse (address_id, capacity_size)
VALUES (1, 5000);

-- ---------------------------------
-- STAFF MEMBER
-- ---------------------------------
INSERT INTO StaffMember (first_name, middle_name, last_name, salary, job_title, address_id, warehouse_id)
VALUES ('Mr.', NULL, 'Gar', 55000.00, 'Store Manager', 3, 1), ('Radicles', NULL, 'X', 20000.00, 'Retail Accociate', 3, 1), ('Enid', NULL, 'Mettle', 25000.00, 'Retail Accociate', 3, 1) , ('Kaio', 'KO', 'Kincaid', 15000.00, 'Retail Accociate', 3, 1);

-- ---------------------------------
-- PRODUCTS
-- ---------------------------------
INSERT INTO Product (
    product_name,
    category,
    product_type,
    brand,
    product_size,
    short_description,
    current_price,
    total_stock
)
VALUES
('Red Power Fruit',    'Food',    'Power-Up Fruit', 'Plaza Farms',      'Small',    'Boosts strength for a short burst. A classic.', 4.99, 50),
('Blue Chill Berry',   'Food',    'Power-Up Fruit', 'Plaza Farms',      'Small',    'Slows reflexes of enemies on contact. Ice cold.', 5.49, 45),
('Golden Might Melon', 'Food',    'Power-Up Fruit', 'Plaza Farms',      'Medium',   'Rare fruit said to double power level temporarily.', 19.99, 10),
('Turbo Pepper',       'Food',    'Power-Up Fruit', 'Spicy Heroics Co', 'Small',    'Extreme speed boost. Not for the faint of heart.', 7.99, 30),
('Shadow Grape',       'Food',    'Power-Up Fruit', 'Plaza Farms',      'Small',    'Grants brief invisibility. Very limited stock.', 14.99, 8),
('HP Potion - Small',  'Potions', 'Health Potion',  'Gar''s',           '2 oz',     'Restores a small amount of health instantly.', 3.99, 100),
('HP Potion - Medium', 'Potions', 'Health Potion',  'Gar''s',           '4 oz',     'Restores a moderate amount of health.', 7.49, 75),
('HP Potion - Large',  'Potions', 'Health Potion',  'Gar''s',           '8 oz',     'Full health restoration for serious situations.', 13.99, 40),
('Power Potion',       'Potions', 'Stat Potion',    'Gar''s',           '2 oz',     'Temporarily raises power level by 1 tier.', 9.99, 35),
('Defense Potion',     'Potions', 'Stat Potion',    'Gar''s',           '2 oz',     'Reduces damage taken for a short window.', 9.99, 35),
('Stamina Tonic',      'Potions', 'Stat Potion',    'Enid Essentials',  '3 oz',     'Reduces fatigue during long patrols or training.', 6.49, 60),
('Antidote Vial',      'Potions', 'Cure Potion',    'Enid Essentials',  '1 oz',     'Cures most common villain poisons and debuffs.', 5.99, 55),
('Mystery Potion',     'Potions', 'Cure Potion',    'Bodega Select',    '2 oz',     'Unknown effect. Gar sells these at a discount. Use at own risk.', 2.49, 20),
('Plaza Energy Drink', 'Food',    'Drink',          'Plaza Pop',        '16 oz',    'Citrus flavored energy boost for active heroes.', 3.49, 80),
('Hero Protein Bar',   'Food',    'Snack',          'Bodega Select',    'Standard', 'High protein snack for post-training recovery.', 2.99, 90);

-- ---------------------------------
-- STOCK
-- ---------------------------------
INSERT INTO Stock (warehouse_id, product_id, quantity_on_hand)
VALUES
(1, 1, 50),
(1, 2, 45),
(1, 3, 10),
(1, 4, 30),
(1, 5, 8),
(1, 6, 100),
(1, 7, 75),
(1, 8, 40),
(1, 9, 35),
(1, 10, 35),
(1, 11, 60),
(1, 12, 55),
(1, 13, 20),
(1, 14, 80),
(1, 15, 90);

INSERT INTO ProductImage (product_id, image_url)
VALUES
(1, 'https://placehold.co/300x300?text=Red+Power+Fruit'),
(3, 'https://placehold.co/300x300?text=Golden+Might+Melon'),
(6, 'https://placehold.co/300x300?text=HP+Potion+Small'),
(9, 'https://placehold.co/300x300?text=Power+Potion'),
(13, 'https://placehold.co/300x300?text=Mystery+Potion');

-- ---------------------------------
-- SHOPPING CART
-- ---------------------------------
INSERT INTO ShoppingCart (customer_id)
VALUES (1);
-- ---------------------------------
-- ADDRESS
-- ---------------------------------
INSERT INTO Address (street, city, state_name, zip_code, country)
VALUES
('101 Plaza Way',    'Lakewood', 'Turbo State', '10001', 'USA'),
('202 Hero Lane',    'Lakewood', 'Turbo State', '10002', 'USA'),
('303 Supply Ave',   'Lakewood', 'Turbo State', '10003', 'USA'),
('44 Potion Blvd',   'Lakewood', 'Turbo State', '10004', 'USA'),
('99 Harvest Road',  'Lakewood', 'Turbo State', '10005', 'USA');

-- ---------------------------------
-- CUSTOMER
-- ---------------------------------
INSERT INTO Customer (first_name, middle_name, last_name, account_balance)
VALUES ('Luffy', 'D', 'Monkey', 100.00);

-- Link customer to address 2 (both delivery and payment)
INSERT INTO CustomerAddress (customer_id, address_id, address_type)
VALUES (1, 2, 'both');

-- ---------------------------------
-- CREDIT CARD
-- ---------------------------------
INSERT INTO CreditCard (customer_id, address_id, card_last_four, card_type, expiration_date, cardholder_name)
VALUES (1, 2, '4242', 'Visa', '2028-12-01', 'K Hero');

-- ---------------------------------
-- WAREHOUSE
-- ---------------------------------
INSERT INTO Warehouse (address_id, capacity_size)
VALUES (1, 5000);

-- ---------------------------------
-- STAFF MEMBER
-- ---------------------------------
INSERT INTO StaffMember (first_name, middle_name, last_name, salary, job_title, address_id, warehouse_id)
VALUES
  ('Mr.',      NULL, 'Gar',     55000.00, 'Store Manager',    3, 1),
  ('Radicles', NULL, 'X',       20000.00, 'Retail Associate', 3, 1),
  ('Enid',     NULL, 'Mettle',  25000.00, 'Retail Associate', 3, 1),
  ('Kaio',     'KO', 'Kincaid', 15000.00, 'Retail Associate', 3, 1);

-- ---------------------------------
-- PRODUCTS
-- ---------------------------------
INSERT INTO Product (
    product_name, category, product_type, brand, product_size, short_description, current_price, total_stock
)
VALUES
  ('Red Power Fruit',         'Food',    'Power-Up Fruit', 'Plaza Farms',      'Small',    'Boosts strength for a short burst. A classic.',                                   4.99,   50),
  ('Blue Chill Berry',        'Food',    'Power-Up Fruit', 'Plaza Farms',      'Small',    'Slows reflexes of enemies on contact. Ice cold.',                                 5.49,   45),
  ('Golden Might Melon',      'Food',    'Power-Up Fruit', 'Plaza Farms',      'Medium',   'Rare fruit said to double power level temporarily.',                              19.99,  10),
  ('Turbo Pepper',            'Food',    'Power-Up Fruit', 'Spicy Heroics Co', 'Small',    'Extreme speed boost. Not for the faint of heart.',                                7.99,   30),
  ('Shadow Grape',            'Food',    'Power-Up Fruit', 'Plaza Farms',      'Small',    'Grants brief invisibility. Very limited stock.',                                  14.99,   8),
  ('HP Potion - Small',       'Potions', 'Health Potion',  'Gar''s',           '2 oz',     'Restores a small amount of health instantly.',                                     3.99, 100),
  ('HP Potion - Medium',      'Potions', 'Health Potion',  'Gar''s',           '4 oz',     'Restores a moderate amount of health.',                                            7.49,  75),
  ('HP Potion - Large',       'Potions', 'Health Potion',  'Gar''s',           '8 oz',     'Full health restoration for serious situations.',                                 13.99,  40),
  ('Power Potion',            'Potions', 'Stat Potion',    'Gar''s',           '2 oz',     'Temporarily raises power level by 1 tier.',                                        9.99,  35),
  ('Defense Potion',          'Potions', 'Stat Potion',    'Gar''s',           '2 oz',     'Reduces damage taken for a short window.',                                         9.99,  35),
  ('Stamina Tonic',           'Potions', 'Stat Potion',    'Enid Essentials',  '3 oz',     'Reduces fatigue during long patrols or training.',                                 6.49,  60),
  ('Antidote Vial',           'Potions', 'Cure Potion',    'Enid Essentials',  '1 oz',     'Cures most common villain poisons and debuffs.',                                   5.99,  55),
  ('Mystery Potion',          'Potions', 'Cure Potion',    'Bodega Select',    '2 oz',     'Unknown effect. Gar sells these at a discount. Use at own risk.',                  2.49,  20),
  ('Plaza Energy Drink',      'Food',    'Drink',          'Plaza Pop',        '16 oz',    'Citrus flavored energy boost for active heroes.',                                  3.49,  80),
  ('Hero Protein Bar',        'Food',    'Snack',          'Bodega Select',    'Standard', 'High protein snack for post-training recovery.',                                   2.99,  90),
  -- DEV TEST ITEM: fills warehouse to 4733/5000 so any restock of 268+ units triggers capacity error
  ('[DEV] Bulk Filler Crate', 'Dev',     'Test Item',      'Dev Tools',        'Pallet',   'DEV ONLY — occupies warehouse space to test capacity enforcement. Do not sell.',   0.01, 4000);

-- ---------------------------------
-- STOCK
-- ---------------------------------
INSERT INTO Stock (warehouse_id, product_id, quantity_on_hand)
VALUES
  (1,  1,   50),
  (1,  2,   45),
  (1,  3,   10),
  (1,  4,   30),
  (1,  5,    8),
  (1,  6,  100),
  (1,  7,   75),
  (1,  8,   40),
  (1,  9,   35),
  (1, 10,   35),
  (1, 11,   60),
  (1, 12,   55),
  (1, 13,   20),
  (1, 14,   80),
  (1, 15,   90),
  -- DEV: 4000 units already on hand — warehouse sits at 4733/5000
  (1, 16, 4000);

-- ---------------------------------
-- PRODUCT IMAGES
-- ---------------------------------
INSERT INTO ProductImage (product_id, image_url)
VALUES
  (1,  'https://placehold.co/300x300?text=Red+Power+Fruit'),
  (3,  'https://placehold.co/300x300?text=Golden+Might+Melon'),
  (6,  'https://placehold.co/300x300?text=HP+Potion+Small'),
  (9,  'https://placehold.co/300x300?text=Power+Potion'),
  (13, 'https://placehold.co/300x300?text=Mystery+Potion');

-- ---------------------------------
-- SHOPPING CART
-- ---------------------------------
INSERT INTO ShoppingCart (customer_id)
VALUES (1);

-- ---------------------------------
-- SUPPLIERS (bonus)
-- ---------------------------------
INSERT INTO Supplier (supplier_name, address_id)
VALUES
  ('Plaza Farms Co.',       5),
  ('Enid Essentials LLC',   4),
  ('Spicy Heroics Supply',  4),
  ('Bodega Select Imports', 3);

-- ---------------------------------
-- SUPPLIER PRODUCTS
-- Supplier 1 = Plaza Farms     (fruits)
-- Supplier 2 = Enid Essentials (stat/cure potions)
-- Supplier 3 = Spicy Heroics   (turbo pepper + energy drink)
-- Supplier 4 = Bodega Select   (mystery potion, protein bar)
-- ---------------------------------
INSERT INTO SupplierProduct (supplier_id, product_id, supplier_price)
VALUES
  -- Plaza Farms: all power-up fruits
  (1, 1,  2.50),   -- Red Power Fruit
  (1, 2,  2.75),   -- Blue Chill Berry
  (1, 3, 10.00),   -- Golden Might Melon
  (1, 5,  7.50),   -- Shadow Grape
  -- Enid Essentials: stat + cure potions
  (2, 11, 3.00),   -- Stamina Tonic
  (2, 12, 2.75),   -- Antidote Vial
  -- Spicy Heroics: turbo pepper + energy drink
  (3, 4,  4.00),   -- Turbo Pepper
  (3, 14, 1.50),   -- Plaza Energy Drink
  -- Bodega Select: mystery potion + protein bar
  (4, 13, 1.00),   -- Mystery Potion
  (4, 15, 1.25);   -- Hero Protein Bar

-- ---------------------------------
-- ADDRESS
-- ---------------------------------
INSERT INTO Address (street, city, state_name, zip_code, country)
VALUES ('101 Plaza Way', 'Lakewood', 'Turbo State', '10001', 'USA');

-- ---------------------------------
-- WAREHOUSE
-- ---------------------------------
INSERT INTO Warehouse (address_id, capacity_size)
VALUES (1, 5000);

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
    current_price
)
VALUES
('Red Power Fruit',       'Food',    'Power-Up Fruit', 'Plaza Farms',      'Small',    'Boosts strength for a short burst. A classic.',                     4.99),
('Blue Chill Berry',      'Food',    'Power-Up Fruit', 'Plaza Farms',      'Small',    'Slows reflexes of enemies on contact. Ice cold.',                   5.49),
('Golden Might Melon',    'Food',    'Power-Up Fruit', 'Plaza Farms',      'Medium',   'Rare fruit said to double power level temporarily.',                19.99),
('Turbo Pepper',          'Food',    'Power-Up Fruit', 'Spicy Heroics Co', 'Small',    'Extreme speed boost. Not for the faint of heart.',                  7.99),
('Shadow Grape',          'Food',    'Power-Up Fruit', 'Plaza Farms',      'Small',    'Grants brief invisibility. Very limited stock.',                    14.99),
('HP Potion - Small',     'Potions', 'Health Potion',  'Gar''s',           '2 oz',     'Restores a small amount of health instantly.',                      3.99),
('HP Potion - Medium',    'Potions', 'Health Potion',  'Gar''s',           '4 oz',     'Restores a moderate amount of health.',                             7.49),
('HP Potion - Large',     'Potions', 'Health Potion',  'Gar''s',           '8 oz',     'Full health restoration for serious situations.',                   13.99),
('Power Potion',          'Potions', 'Stat Potion',    'Gar''s',           '2 oz',     'Temporarily raises power level by 1 tier.',                         9.99),
('Defense Potion',        'Potions', 'Stat Potion',    'Gar''s',           '2 oz',     'Reduces damage taken for a short window.',                          9.99),
('Stamina Tonic',         'Potions', 'Stat Potion',    'Enid Essentials',  '3 oz',     'Reduces fatigue during long patrols or training.',                  6.49),
('Antidote Vial',         'Potions', 'Cure Potion',    'Enid Essentials',  '1 oz',     'Cures most common villain poisons and debuffs.',                    5.99),
('Mystery Potion',        'Potions', 'Cure Potion',    'Bodega Select',    '2 oz',     'Unknown effect. Gar sells these at a discount. Use at own risk.',    2.49),
('Plaza Energy Drink',    'Food',    'Drink',          'Plaza Pop',        '16 oz',    'Citrus flavored energy boost for active heroes.',                   3.49),
('Hero Protein Bar',      'Food',    'Snack',          'Bodega Select',    'Standard', 'High protein snack for post-training recovery.',                    2.99);

-- ---------------------------------
-- STOCK (warehouse_id = 1)
-- ---------------------------------
INSERT INTO Stock (warehouse_id, product_id, quantity_on_hand)
VALUES
(1, 1,  50),
(1, 2,  45),
(1, 3,  10),
(1, 4,  30),
(1, 5,  8),
(1, 6,  100),
(1, 7,  75),
(1, 8,  40),
(1, 9,  35),
(1, 10, 35),
(1, 11, 60),
(1, 12, 55),
(1, 13, 20),
(1, 14, 80),
(1, 15, 90);

INSERT INTO ProductImage (product_id, image_url)
VALUES
(1,  'https://placehold.co/300x300?text=Red+Power+Fruit'),
(3,  'https://placehold.co/300x300?text=Golden+Might+Melon'),
(6,  'https://placehold.co/300x300?text=HP+Potion+Small'),
(9,  'https://placehold.co/300x300?text=Power+Potion'),
(13, 'https://placehold.co/300x300?text=Mystery+Potion');


-- Test Customer
INSERT INTO Customer (first_name, middle_name, last_name, account_balance)
VALUES ('K', NULL, 'Hero', 0.00);
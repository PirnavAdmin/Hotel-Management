USE hotel_management_db_32;

-- Insert or update mock restaurant tables
INSERT INTO restaurant_tables (
    branch_id, table_number, table_name, capacity, capacity_chairs,
    location, section_area, qr_code_url, status, assigned_server_id,
    deleted_at, created_at, updated_at
) VALUES
-- Branch 1: Main Restaurant (Window Bay)
(1, 'T-01', 'T-01', 2, 2, 'Window Bay', 'Window Bay', 'https://qr.hms.hotel/t01', 'available', 1, NULL, NOW(), NOW()),
(1, 'T-02', 'T-02', 2, 2, 'Window Bay', 'Window Bay', 'https://qr.hms.hotel/t02', 'occupied', 1, NULL, NOW(), NOW()),

-- Branch 1: Main Dining Hall
(1, 'T-03', 'T-03', 4, 4, 'Main Hall', 'Main Hall', 'https://qr.hms.hotel/t03', 'available', 2, NULL, NOW(), NOW()),
(1, 'T-04', 'T-04', 4, 4, 'Main Hall', 'Main Hall', 'https://qr.hms.hotel/t04', 'occupied', 2, NULL, NOW(), NOW()),
(1, 'T-05', 'T-05', 4, 4, 'Main Hall', 'Main Hall', 'https://qr.hms.hotel/t05', 'available', 3, NULL, NOW(), NOW()),
(1, 'T-06', 'T-06', 4, 4, 'Main Hall', 'Main Hall', 'https://qr.hms.hotel/t06', 'available', 3, NULL, NOW(), NOW()),

-- Branch 1: Family Section / AC Hall
(1, 'T-07', 'T-07', 6, 6, 'AC Family Hall', 'AC Family Hall', 'https://qr.hms.hotel/t07', 'available', 4, NULL, NOW(), NOW()),
(1, 'T-08', 'T-08', 6, 6, 'AC Family Hall', 'AC Family Hall', 'https://qr.hms.hotel/t08', 'available', 4, NULL, NOW(), NOW()),
(1, 'T-09', 'T-09', 6, 6, 'AC Family Hall', 'AC Family Hall', 'https://qr.hms.hotel/t09', 'available', 5, NULL, NOW(), NOW()),
(1, 'T-10', 'T-10', 8, 8, 'AC Family Hall', 'AC Family Hall', 'https://qr.hms.hotel/t10', 'reserved', 5, NULL, NOW(), NOW()),

-- Branch 1: VIP Lounge & Private Dining
(1, 'VIP-01', 'VIP-01', 8, 8, 'VIP Lounge', 'VIP Lounge', 'https://qr.hms.hotel/vip01', 'available', 6, NULL, NOW(), NOW()),
(1, 'VIP-02', 'VIP-02', 10, 10, 'VIP Lounge', 'VIP Lounge', 'https://qr.hms.hotel/vip02', 'reserved', 6, NULL, NOW(), NOW()),

-- Branch 1: Rooftop & Terrace
(1, 'ROOF-01', 'ROOF-01', 4, 4, 'Rooftop', 'Rooftop', 'https://qr.hms.hotel/roof01', 'available', 1, NULL, NOW(), NOW()),
(1, 'ROOF-02', 'ROOF-02', 4, 4, 'Rooftop', 'Rooftop', 'https://qr.hms.hotel/roof02', 'cleaning', 1, NULL, NOW(), NOW()),
(1, 'PAT-01', 'PAT-01', 2, 2, 'Outdoor Patio', 'Outdoor Patio', 'https://qr.hms.hotel/pat01', 'available', 5, NULL, NOW(), NOW()),
(1, 'PAT-02', 'PAT-02', 4, 4, 'Outdoor Patio', 'Outdoor Patio', 'https://qr.hms.hotel/pat02', 'available', 5, NULL, NOW(), NOW()),

-- Branch 2: Grand Palace - Hyderabad Hitech City
(2, 'HYD-01', 'HYD-01', 4, 4, 'Terrace Garden', 'Terrace Garden', 'https://qr.hms.hotel/hyd01', 'available', NULL, NULL, NOW(), NOW()),
(2, 'HYD-02', 'HYD-02', 4, 4, 'Terrace Garden', 'Terrace Garden', 'https://qr.hms.hotel/hyd02', 'occupied', NULL, NULL, NOW(), NOW()),
(2, 'HYD-03', 'HYD-03', 6, 6, 'Executive Lounge', 'Executive Lounge', 'https://qr.hms.hotel/hyd03', 'available', NULL, NULL, NOW(), NOW()),
(2, 'HYD-04', 'HYD-04', 8, 8, 'Banquet Hall', 'Banquet Hall', 'https://qr.hms.hotel/hyd04', 'available', NULL, NULL, NOW(), NOW()),

-- Branch 3: Grand Palace - Mumbai Bandra
(3, 'BOM-01', 'BOM-01', 2, 2, 'Sea View Deck', 'Sea View Deck', 'https://qr.hms.hotel/bom01', 'available', NULL, NULL, NOW(), NOW()),
(3, 'BOM-02', 'BOM-02', 4, 4, 'Sea View Deck', 'Sea View Deck', 'https://qr.hms.hotel/bom02', 'occupied', NULL, NULL, NOW(), NOW()),
(3, 'BOM-03', 'BOM-03', 6, 6, 'Marine Drive Hall', 'Marine Drive Hall', 'https://qr.hms.hotel/bom03', 'available', NULL, NULL, NOW(), NOW())

ON DUPLICATE KEY UPDATE
    deleted_at = NULL,
    table_name = VALUES(table_name),
    capacity = VALUES(capacity),
    capacity_chairs = VALUES(capacity_chairs),
    location = VALUES(location),
    section_area = VALUES(section_area),
    qr_code_url = VALUES(qr_code_url),
    status = VALUES(status),
    assigned_server_id = VALUES(assigned_server_id),
    updated_at = NOW();

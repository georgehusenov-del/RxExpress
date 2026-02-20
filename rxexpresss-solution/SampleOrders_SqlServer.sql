-- =============================================
-- SQL Script: Add 10 Sample Orders (2 per NYC Borough)
-- Pharmacy: HealthFirst Pharmacy (ID: 1)
-- =============================================

-- For SQL Server
INSERT INTO [Orders] (
    [OrderNumber], [TrackingNumber], [QrCode], [PharmacyId], [PharmacyName],
    [DeliveryType], [TimeWindow], [RecipientName], [RecipientPhone], [RecipientEmail],
    [Street], [City], [State], [PostalCode], [Latitude], [Longitude], [DeliveryInstructions],
    [Status], [RequiresSignature], [RequiresPhotoProof], [DeliveryFee], [TotalAmount], [CopayAmount], [CopayCollected],
    [CreatedAt], [UpdatedAt]
)
VALUES
-- QUEENS (2 orders)
('RX-QNS00001', 'TRK-QNS000001', 'QNS001', 1, 'HealthFirst Pharmacy',
 'same_day', '9am-5pm', 'John Chen', '347-555-0101', 'john.chen@email.com',
 '37-01 Main St', 'Queens', 'NY', '11354', 40.7590, -73.8303, 'Ring doorbell twice',
 'new', 1, 1, 5.99, 15.99, 10.00, 0,
 GETUTCDATE(), GETUTCDATE()),

('RX-QNS00002', 'TRK-QNS000002', 'QNS002', 1, 'HealthFirst Pharmacy',
 'next_day', '10am-2pm', 'Maria Santos', '718-555-0102', 'maria.s@email.com',
 '71-01 Kissena Blvd', 'Queens', 'NY', '11367', 40.7355, -73.8205, 'Leave at front desk',
 'new', 1, 1, 5.99, 25.99, 20.00, 0,
 GETUTCDATE(), GETUTCDATE()),

-- BROOKLYN (2 orders)
('RX-BKN00001', 'TRK-BKN000001', 'BKN001', 1, 'HealthFirst Pharmacy',
 'same_day', '2pm-6pm', 'David Williams', '718-555-0201', 'david.w@email.com',
 '200 Eastern Pkwy', 'Brooklyn', 'NY', '11238', 40.6720, -73.9638, 'Apartment 4B',
 'new', 1, 1, 5.99, 11.49, 5.50, 0,
 GETUTCDATE(), GETUTCDATE()),

('RX-BKN00002', 'TRK-BKN000002', 'BKN002', 1, 'HealthFirst Pharmacy',
 'priority', '12pm-4pm', 'Sarah Johnson', '347-555-0202', 'sarah.j@email.com',
 '1000 Fulton St', 'Brooklyn', 'NY', '11238', 40.6811, -73.9581, 'Call on arrival',
 'new', 1, 1, 10.99, 26.49, 15.50, 0,
 GETUTCDATE(), GETUTCDATE()),

-- MANHATTAN (2 orders)
('RX-MAN00001', 'TRK-MAN000001', 'MAN001', 1, 'HealthFirst Pharmacy',
 'same_day', '9am-1pm', 'Michael Brown', '212-555-0301', 'michael.b@email.com',
 '350 5th Ave', 'Manhattan', 'NY', '10118', 40.7484, -73.9857, 'Empire State Building - Lobby',
 'new', 1, 1, 5.99, 5.99, 0.00, 0,
 GETUTCDATE(), GETUTCDATE()),

('RX-MAN00002', 'TRK-MAN000002', 'MAN002', 1, 'HealthFirst Pharmacy',
 'next_day', '3pm-7pm', 'Emily Davis', '917-555-0302', 'emily.d@email.com',
 '30 Rockefeller Plaza', 'Manhattan', 'NY', '10112', 40.7593, -73.9794, 'Concierge desk',
 'new', 1, 1, 5.99, 22.99, 17.00, 0,
 GETUTCDATE(), GETUTCDATE()),

-- BRONX (2 orders)
('RX-BRX00001', 'TRK-BRX000001', 'BRX001', 1, 'HealthFirst Pharmacy',
 'same_day', '11am-3pm', 'Robert Garcia', '929-555-0401', 'robert.g@email.com',
 '851 Grand Concourse', 'Bronx', 'NY', '10451', 40.8263, -73.9208, 'Apt 12C - Buzz 12',
 'new', 1, 1, 6.99, 18.49, 11.50, 0,
 GETUTCDATE(), GETUTCDATE()),

('RX-BRX00002', 'TRK-BRX000002', 'BRX002', 1, 'HealthFirst Pharmacy',
 'next_day', '1pm-5pm', 'Jennifer Martinez', '347-555-0402', 'jennifer.m@email.com',
 '2 E 161st St', 'Bronx', 'NY', '10451', 40.8271, -73.9264, 'Near Yankee Stadium',
 'new', 1, 1, 6.99, 6.99, 0.00, 0,
 GETUTCDATE(), GETUTCDATE()),

-- STATEN ISLAND (2 orders)
('RX-STI00001', 'TRK-STI000001', 'STI001', 1, 'HealthFirst Pharmacy',
 'next_day', '10am-2pm', 'William Turner', '929-555-0501', 'william.t@email.com',
 '1 Bay St', 'Staten Island', 'NY', '10301', 40.6437, -74.0764, 'St George Ferry Terminal area',
 'new', 1, 1, 7.99, 19.49, 11.50, 0,
 GETUTCDATE(), GETUTCDATE()),

('RX-STI00002', 'TRK-STI000002', 'STI002', 1, 'HealthFirst Pharmacy',
 'same_day', '2pm-6pm', 'Lisa Anderson', '718-555-0502', 'lisa.a@email.com',
 '3755 Victory Blvd', 'Staten Island', 'NY', '10314', 40.5873, -74.1652, 'Leave with neighbor if not home',
 'new', 1, 1, 7.99, 29.49, 21.50, 0,
 GETUTCDATE(), GETUTCDATE());

-- Verify inserted orders
SELECT City, COUNT(*) as OrderCount FROM [Orders] GROUP BY City;

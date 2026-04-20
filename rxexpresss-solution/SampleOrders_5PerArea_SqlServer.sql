-- =============================================================
-- SQL Server: Add 25 Sample Orders (5 per NYC Borough / Service Zone)
-- Pharmacy: HealthFirst Pharmacy (ID: 1)  -- change if needed
-- Zones:  Manhattan | Brooklyn | Queens | Bronx | Staten Island
-- =============================================================

SET NOCOUNT ON;

INSERT INTO Orders (
    OrderNumber, TrackingNumber, QrCode, PharmacyId, PharmacyName,
    DeliveryType, TimeWindow, RecipientName, RecipientPhone, RecipientEmail,
    Street, AptUnit, City, State, PostalCode, Latitude, Longitude, DeliveryInstructions,
    Status, RequiresSignature, RequiresPhotoProof, IsRefrigerated,
    DeliveryFee, TotalAmount, CopayAmount, CopayCollected,
    AttemptNumber, FailedAttempts, LabourCost,
    CreatedAt, UpdatedAt
)
VALUES
-- ================= MANHATTAN (5) =================
('RX-MAN00101','TRK-MAN000101','MAN101',1,'HealthFirst Pharmacy','same_day','9am-1pm',
 'Michael Brown','212-555-0301','michael.b@email.com',
 '350 5th Ave',NULL,'Manhattan','NY','10118',40.7484,-73.9857,'Empire State - Lobby',
 'new',1,1,0, 5.99,15.99,10.00,0, 1,0,0, GETUTCDATE(),GETUTCDATE()),

('RX-MAN00102','TRK-MAN000102','MAN102',1,'HealthFirst Pharmacy','next_day','3pm-7pm',
 'Emily Davis','917-555-0302','emily.d@email.com',
 '30 Rockefeller Plaza',NULL,'Manhattan','NY','10112',40.7593,-73.9794,'Concierge desk',
 'new',1,1,0, 5.99,22.99,17.00,0, 1,0,0, GETUTCDATE(),GETUTCDATE()),

('RX-MAN00103','TRK-MAN000103','MAN103',1,'HealthFirst Pharmacy','priority','10am-12pm',
 'Jessica Lee','646-555-0303','jessica.l@email.com',
 '200 W 57th St','Apt 14A','Manhattan','NY','10019',40.7654,-73.9822,'Doorman building',
 'new',1,1,1, 10.99,35.49,24.50,0, 1,0,0, GETUTCDATE(),GETUTCDATE()),

('RX-MAN00104','TRK-MAN000104','MAN104',1,'HealthFirst Pharmacy','same_day','1pm-5pm',
 'Daniel Kim','212-555-0304','daniel.k@email.com',
 '101 W 23rd St',NULL,'Manhattan','NY','10011',40.7427,-73.9929,'Leave with doorman',
 'new',1,1,0, 5.99,12.49,6.50,0, 1,0,0, GETUTCDATE(),GETUTCDATE()),

('RX-MAN00105','TRK-MAN000105','MAN105',1,'HealthFirst Pharmacy','next_day','8am-12pm',
 'Olivia Martinez','332-555-0305','olivia.m@email.com',
 '2211 Broadway',NULL,'Manhattan','NY','10024',40.7870,-73.9790,'Call on arrival',
 'new',1,1,0, 5.99,28.99,23.00,0, 1,0,0, GETUTCDATE(),GETUTCDATE()),

-- ================= BROOKLYN (5) =================
('RX-BKN00101','TRK-BKN000101','BKN101',1,'HealthFirst Pharmacy','same_day','2pm-6pm',
 'David Williams','718-555-0201','david.w@email.com',
 '200 Eastern Pkwy','Apt 4B','Brooklyn','NY','11238',40.6720,-73.9638,'Ring buzzer 4B',
 'new',1,1,0, 5.99,11.49,5.50,0, 1,0,0, GETUTCDATE(),GETUTCDATE()),

('RX-BKN00102','TRK-BKN000102','BKN102',1,'HealthFirst Pharmacy','priority','12pm-4pm',
 'Sarah Johnson','347-555-0202','sarah.j@email.com',
 '1000 Fulton St',NULL,'Brooklyn','NY','11238',40.6811,-73.9581,'Call on arrival',
 'new',1,1,1, 10.99,26.49,15.50,0, 1,0,0, GETUTCDATE(),GETUTCDATE()),

('RX-BKN00103','TRK-BKN000103','BKN103',1,'HealthFirst Pharmacy','next_day','10am-2pm',
 'Anthony Rivera','917-555-0203','anthony.r@email.com',
 '85 Bedford Ave',NULL,'Brooklyn','NY','11211',40.7182,-73.9574,'Williamsburg - 2F',
 'new',1,1,0, 5.99,18.99,13.00,0, 1,0,0, GETUTCDATE(),GETUTCDATE()),

('RX-BKN00104','TRK-BKN000104','BKN104',1,'HealthFirst Pharmacy','same_day','3pm-7pm',
 'Rachel Green','347-555-0204','rachel.g@email.com',
 '450 Flatbush Ave','Apt 3R','Brooklyn','NY','11225',40.6596,-73.9618,'Buzzer 3R',
 'new',1,1,0, 5.99,14.99,9.00,0, 1,0,0, GETUTCDATE(),GETUTCDATE()),

('RX-BKN00105','TRK-BKN000105','BKN105',1,'HealthFirst Pharmacy','next_day','9am-12pm',
 'Kevin Patel','718-555-0205','kevin.p@email.com',
 '300 Ashland Pl',NULL,'Brooklyn','NY','11217',40.6867,-73.9783,'Concierge 24/7',
 'new',1,1,1, 5.99,33.99,28.00,0, 1,0,0, GETUTCDATE(),GETUTCDATE()),

-- ================= QUEENS (5) =================
('RX-QNS00101','TRK-QNS000101','QNS101',1,'HealthFirst Pharmacy','same_day','9am-5pm',
 'John Chen','347-555-0101','john.chen@email.com',
 '37-01 Main St',NULL,'Queens','NY','11354',40.7590,-73.8303,'Ring doorbell twice',
 'new',1,1,0, 5.99,15.99,10.00,0, 1,0,0, GETUTCDATE(),GETUTCDATE()),

('RX-QNS00102','TRK-QNS000102','QNS102',1,'HealthFirst Pharmacy','next_day','10am-2pm',
 'Maria Santos','718-555-0102','maria.s@email.com',
 '71-01 Kissena Blvd',NULL,'Queens','NY','11367',40.7355,-73.8205,'Leave at front desk',
 'new',1,1,0, 5.99,25.99,20.00,0, 1,0,0, GETUTCDATE(),GETUTCDATE()),

('RX-QNS00103','TRK-QNS000103','QNS103',1,'HealthFirst Pharmacy','priority','11am-3pm',
 'Linda Wu','929-555-0103','linda.w@email.com',
 '30-30 47th Ave','Suite 200','Queens','NY','11101',40.7472,-73.9360,'Long Island City office',
 'new',1,1,1, 10.99,40.49,29.50,0, 1,0,0, GETUTCDATE(),GETUTCDATE()),

('RX-QNS00104','TRK-QNS000104','QNS104',1,'HealthFirst Pharmacy','same_day','1pm-5pm',
 'George Papadopoulos','347-555-0104','george.p@email.com',
 '31-10 37th Ave',NULL,'Queens','NY','11101',40.7530,-73.9290,'Astoria 1st floor',
 'new',1,1,0, 5.99,12.99,7.00,0, 1,0,0, GETUTCDATE(),GETUTCDATE()),

('RX-QNS00105','TRK-QNS000105','QNS105',1,'HealthFirst Pharmacy','next_day','2pm-6pm',
 'Priya Sharma','718-555-0105','priya.s@email.com',
 '108-12 72nd Ave',NULL,'Queens','NY','11375',40.7186,-73.8448,'Forest Hills - House',
 'new',1,1,0, 5.99,22.49,16.50,0, 1,0,0, GETUTCDATE(),GETUTCDATE()),

-- ================= BRONX (5) =================
('RX-BRX00101','TRK-BRX000101','BRX101',1,'HealthFirst Pharmacy','same_day','11am-3pm',
 'Robert Garcia','929-555-0401','robert.g@email.com',
 '851 Grand Concourse','Apt 12C','Bronx','NY','10451',40.8263,-73.9208,'Buzz 12',
 'new',1,1,0, 6.99,18.49,11.50,0, 1,0,0, GETUTCDATE(),GETUTCDATE()),

('RX-BRX00102','TRK-BRX000102','BRX102',1,'HealthFirst Pharmacy','next_day','2pm-6pm',
 'Carlos Mendez','347-555-0402','carlos.m@email.com',
 '2500 Grand Concourse',NULL,'Bronx','NY','10458',40.8640,-73.8933,'Fordham - basement unit',
 'new',1,1,0, 6.99,20.99,14.00,0, 1,0,0, GETUTCDATE(),GETUTCDATE()),

('RX-BRX00103','TRK-BRX000103','BRX103',1,'HealthFirst Pharmacy','priority','10am-1pm',
 'Aisha Johnson','718-555-0403','aisha.j@email.com',
 '1500 Pelham Pkwy S',NULL,'Bronx','NY','10461',40.8512,-73.8626,'Co-op City - Tower B',
 'new',1,1,1, 11.99,38.49,26.50,0, 1,0,0, GETUTCDATE(),GETUTCDATE()),

('RX-BRX00104','TRK-BRX000104','BRX104',1,'HealthFirst Pharmacy','same_day','3pm-7pm',
 'Victor Ramos','917-555-0404','victor.r@email.com',
 '1 Fordham Plaza',NULL,'Bronx','NY','10458',40.8611,-73.8884,'Medical bldg - suite 204',
 'new',1,1,0, 6.99,17.99,11.00,0, 1,0,0, GETUTCDATE(),GETUTCDATE()),

('RX-BRX00105','TRK-BRX000105','BRX105',1,'HealthFirst Pharmacy','next_day','9am-12pm',
 'Nicole Torres','929-555-0405','nicole.t@email.com',
 '3450 Seymour Ave',NULL,'Bronx','NY','10469',40.8771,-73.8618,'Williamsbridge house',
 'new',1,1,0, 6.99,24.99,18.00,0, 1,0,0, GETUTCDATE(),GETUTCDATE()),

-- ================= STATEN ISLAND (5) =================
('RX-STI00101','TRK-STI000101','STI101',1,'HealthFirst Pharmacy','same_day','10am-2pm',
 'Joseph Russo','718-555-0501','joseph.r@email.com',
 '10 Bay St Landing',NULL,'Staten Island','NY','10301',40.6431,-74.0742,'St. George - waterfront',
 'new',1,1,0, 7.99,19.99,12.00,0, 1,0,0, GETUTCDATE(),GETUTCDATE()),

('RX-STI00102','TRK-STI000102','STI102',1,'HealthFirst Pharmacy','next_day','1pm-4pm',
 'Maria Bianchi','347-555-0502','maria.b@email.com',
 '2655 Richmond Ave',NULL,'Staten Island','NY','10314',40.5851,-74.1646,'Staten Island Mall area',
 'new',1,1,0, 7.99,23.49,15.50,0, 1,0,0, GETUTCDATE(),GETUTCDATE()),

('RX-STI00103','TRK-STI000103','STI103',1,'HealthFirst Pharmacy','priority','12pm-3pm',
 'Thomas Walsh','917-555-0503','thomas.w@email.com',
 '4000 Hylan Blvd',NULL,'Staten Island','NY','10308',40.5469,-74.1389,'Great Kills - house',
 'new',1,1,1, 12.99,42.99,30.00,0, 1,0,0, GETUTCDATE(),GETUTCDATE()),

('RX-STI00104','TRK-STI000104','STI104',1,'HealthFirst Pharmacy','same_day','2pm-6pm',
 'Angela Romano','718-555-0504','angela.r@email.com',
 '1525 Clove Rd',NULL,'Staten Island','NY','10304',40.6171,-74.0933,'Sunnyside apartment',
 'new',1,1,0, 7.99,15.99,8.00,0, 1,0,0, GETUTCDATE(),GETUTCDATE()),

('RX-STI00105','TRK-STI000105','STI105',1,'HealthFirst Pharmacy','next_day','9am-12pm',
 'Brian O''Brien','929-555-0505','brian.o@email.com',
 '200 Nelson Ave',NULL,'Staten Island','NY','10308',40.5482,-74.1264,'Great Kills - ring bell',
 'new',1,1,0, 7.99,26.99,19.00,0, 1,0,0, GETUTCDATE(),GETUTCDATE());

-- Verify insert
SELECT City, COUNT(*) AS OrderCount
FROM Orders
WHERE OrderNumber LIKE 'RX-___00___'
  AND OrderNumber LIKE 'RX-[MBQSR][A-Z][A-Z]001%'
GROUP BY City
ORDER BY City;

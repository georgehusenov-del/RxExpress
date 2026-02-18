-- =====================================================
-- RX Expresss - SQL Server Migration Script
-- Complete schema for MS SQL Server
-- Generated: February 18, 2026
-- =====================================================
-- IMPORTANT: Run this script on an EMPTY database
-- The Identity columns use NVARCHAR(128) to support SQL Server index limits
-- =====================================================

-- Create __EFMigrationsHistory table if not exists
IF OBJECT_ID(N'[__EFMigrationsHistory]') IS NULL
BEGIN
    CREATE TABLE [__EFMigrationsHistory] (
        [MigrationId] NVARCHAR(150) NOT NULL,
        [ProductVersion] NVARCHAR(32) NOT NULL,
        CONSTRAINT [PK___EFMigrationsHistory] PRIMARY KEY ([MigrationId])
    );
END;
GO

-- =====================================================
-- ASP.NET Identity Tables (with key size constraints)
-- =====================================================

-- AspNetRoles
CREATE TABLE [AspNetRoles] (
    [Id] NVARCHAR(128) NOT NULL,
    [Name] NVARCHAR(256) NULL,
    [NormalizedName] NVARCHAR(256) NULL,
    [ConcurrencyStamp] NVARCHAR(MAX) NULL,
    CONSTRAINT [PK_AspNetRoles] PRIMARY KEY ([Id])
);
GO

CREATE UNIQUE INDEX [RoleNameIndex] ON [AspNetRoles] ([NormalizedName]) WHERE [NormalizedName] IS NOT NULL;
GO

-- AspNetUsers
CREATE TABLE [AspNetUsers] (
    [Id] NVARCHAR(128) NOT NULL,
    [FirstName] NVARCHAR(100) NOT NULL,
    [LastName] NVARCHAR(100) NOT NULL,
    [IsActive] BIT NOT NULL DEFAULT 1,
    [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    [UpdatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    [UserName] NVARCHAR(256) NULL,
    [NormalizedUserName] NVARCHAR(256) NULL,
    [Email] NVARCHAR(256) NULL,
    [NormalizedEmail] NVARCHAR(256) NULL,
    [EmailConfirmed] BIT NOT NULL DEFAULT 0,
    [PasswordHash] NVARCHAR(MAX) NULL,
    [SecurityStamp] NVARCHAR(MAX) NULL,
    [ConcurrencyStamp] NVARCHAR(MAX) NULL,
    [PhoneNumber] NVARCHAR(50) NULL,
    [PhoneNumberConfirmed] BIT NOT NULL DEFAULT 0,
    [TwoFactorEnabled] BIT NOT NULL DEFAULT 0,
    [LockoutEnd] DATETIMEOFFSET NULL,
    [LockoutEnabled] BIT NOT NULL DEFAULT 0,
    [AccessFailedCount] INT NOT NULL DEFAULT 0,
    CONSTRAINT [PK_AspNetUsers] PRIMARY KEY ([Id])
);
GO

CREATE INDEX [EmailIndex] ON [AspNetUsers] ([NormalizedEmail]);
GO

CREATE UNIQUE INDEX [UserNameIndex] ON [AspNetUsers] ([NormalizedUserName]) WHERE [NormalizedUserName] IS NOT NULL;
GO

-- AspNetRoleClaims
CREATE TABLE [AspNetRoleClaims] (
    [Id] INT IDENTITY(1,1) NOT NULL,
    [RoleId] NVARCHAR(128) NOT NULL,
    [ClaimType] NVARCHAR(MAX) NULL,
    [ClaimValue] NVARCHAR(MAX) NULL,
    CONSTRAINT [PK_AspNetRoleClaims] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_AspNetRoleClaims_AspNetRoles_RoleId] FOREIGN KEY ([RoleId]) REFERENCES [AspNetRoles] ([Id]) ON DELETE CASCADE
);
GO

CREATE INDEX [IX_AspNetRoleClaims_RoleId] ON [AspNetRoleClaims] ([RoleId]);
GO

-- AspNetUserClaims
CREATE TABLE [AspNetUserClaims] (
    [Id] INT IDENTITY(1,1) NOT NULL,
    [UserId] NVARCHAR(128) NOT NULL,
    [ClaimType] NVARCHAR(MAX) NULL,
    [ClaimValue] NVARCHAR(MAX) NULL,
    CONSTRAINT [PK_AspNetUserClaims] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_AspNetUserClaims_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
);
GO

CREATE INDEX [IX_AspNetUserClaims_UserId] ON [AspNetUserClaims] ([UserId]);
GO

-- AspNetUserLogins
CREATE TABLE [AspNetUserLogins] (
    [LoginProvider] NVARCHAR(128) NOT NULL,
    [ProviderKey] NVARCHAR(128) NOT NULL,
    [ProviderDisplayName] NVARCHAR(MAX) NULL,
    [UserId] NVARCHAR(128) NOT NULL,
    CONSTRAINT [PK_AspNetUserLogins] PRIMARY KEY ([LoginProvider], [ProviderKey]),
    CONSTRAINT [FK_AspNetUserLogins_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
);
GO

CREATE INDEX [IX_AspNetUserLogins_UserId] ON [AspNetUserLogins] ([UserId]);
GO

-- AspNetUserRoles
CREATE TABLE [AspNetUserRoles] (
    [UserId] NVARCHAR(128) NOT NULL,
    [RoleId] NVARCHAR(128) NOT NULL,
    CONSTRAINT [PK_AspNetUserRoles] PRIMARY KEY ([UserId], [RoleId]),
    CONSTRAINT [FK_AspNetUserRoles_AspNetRoles_RoleId] FOREIGN KEY ([RoleId]) REFERENCES [AspNetRoles] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_AspNetUserRoles_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
);
GO

CREATE INDEX [IX_AspNetUserRoles_RoleId] ON [AspNetUserRoles] ([RoleId]);
GO

-- AspNetUserTokens
CREATE TABLE [AspNetUserTokens] (
    [UserId] NVARCHAR(128) NOT NULL,
    [LoginProvider] NVARCHAR(128) NOT NULL,
    [Name] NVARCHAR(128) NOT NULL,
    [Value] NVARCHAR(MAX) NULL,
    CONSTRAINT [PK_AspNetUserTokens] PRIMARY KEY ([UserId], [LoginProvider], [Name]),
    CONSTRAINT [FK_AspNetUserTokens_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
);
GO

-- =====================================================
-- Application Tables
-- =====================================================

-- ServiceZones
CREATE TABLE [ServiceZones] (
    [Id] INT IDENTITY(1,1) NOT NULL,
    [Name] NVARCHAR(100) NOT NULL,
    [Code] NVARCHAR(20) NOT NULL,
    [IsActive] BIT NOT NULL DEFAULT 1,
    [ZipCodes] NVARCHAR(MAX) NOT NULL,
    [DeliveryFee] FLOAT NOT NULL DEFAULT 5.99,
    [SameDayCutoff] NVARCHAR(10) NOT NULL DEFAULT '14:00',
    [PrioritySurcharge] FLOAT NOT NULL DEFAULT 10.00,
    [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT [PK_ServiceZones] PRIMARY KEY ([Id])
);
GO

-- DeliveryPricing
CREATE TABLE [DeliveryPricing] (
    [Id] INT IDENTITY(1,1) NOT NULL,
    [DeliveryType] NVARCHAR(50) NOT NULL,
    [Name] NVARCHAR(100) NOT NULL,
    [Description] NVARCHAR(500) NULL,
    [BasePrice] DECIMAL(10,2) NOT NULL,
    [IsActive] BIT NOT NULL DEFAULT 1,
    [TimeWindowStart] NVARCHAR(10) NULL,
    [TimeWindowEnd] NVARCHAR(10) NULL,
    [CutoffTime] NVARCHAR(10) NULL,
    [IsAddon] BIT NOT NULL DEFAULT 0,
    [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    [UpdatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT [PK_DeliveryPricing] PRIMARY KEY ([Id])
);
GO

-- RoutePlans (Gigs)
CREATE TABLE [RoutePlans] (
    [Id] INT IDENTITY(1,1) NOT NULL,
    [Title] NVARCHAR(200) NOT NULL,
    [Date] NVARCHAR(20) NOT NULL,
    [Status] NVARCHAR(50) NOT NULL DEFAULT 'draft',
    [OptimizationStatus] NVARCHAR(50) NOT NULL DEFAULT 'not_started',
    [Distributed] BIT NOT NULL DEFAULT 0,
    [CircuitPlanId] NVARCHAR(100) NULL,
    [ServiceZoneId] INT NULL,
    [IsAutoCreated] BIT NOT NULL DEFAULT 0,
    [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    [UpdatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT [PK_RoutePlans] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_RoutePlans_ServiceZones_ServiceZoneId] FOREIGN KEY ([ServiceZoneId]) REFERENCES [ServiceZones] ([Id]) ON DELETE SET NULL
);
GO

CREATE INDEX [IX_RoutePlans_ServiceZoneId] ON [RoutePlans] ([ServiceZoneId]);
GO

-- Drivers
CREATE TABLE [Drivers] (
    [Id] INT IDENTITY(1,1) NOT NULL,
    [UserId] NVARCHAR(128) NOT NULL,
    [VehicleType] NVARCHAR(50) NOT NULL DEFAULT 'car',
    [VehicleNumber] NVARCHAR(50) NOT NULL,
    [LicenseNumber] NVARCHAR(50) NOT NULL,
    [Status] NVARCHAR(50) NOT NULL DEFAULT 'offline',
    [CurrentLatitude] FLOAT NULL,
    [CurrentLongitude] FLOAT NULL,
    [Rating] FLOAT NOT NULL DEFAULT 5.0,
    [TotalDeliveries] INT NOT NULL DEFAULT 0,
    [IsVerified] BIT NOT NULL DEFAULT 0,
    [CircuitDriverId] NVARCHAR(100) NULL,
    [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT [PK_Drivers] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_Drivers_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
);
GO

CREATE UNIQUE INDEX [IX_Drivers_UserId] ON [Drivers] ([UserId]);
GO

-- Pharmacies
CREATE TABLE [Pharmacies] (
    [Id] INT IDENTITY(1,1) NOT NULL,
    [UserId] NVARCHAR(128) NOT NULL,
    [Name] NVARCHAR(200) NOT NULL,
    [LicenseNumber] NVARCHAR(50) NOT NULL,
    [NpiNumber] NVARCHAR(20) NULL,
    [Phone] NVARCHAR(20) NOT NULL,
    [Email] NVARCHAR(100) NOT NULL,
    [Website] NVARCHAR(200) NULL,
    [Street] NVARCHAR(200) NOT NULL,
    [AptUnit] NVARCHAR(50) NULL,
    [City] NVARCHAR(100) NOT NULL,
    [State] NVARCHAR(20) NOT NULL,
    [PostalCode] NVARCHAR(20) NOT NULL,
    [Latitude] FLOAT NULL,
    [Longitude] FLOAT NULL,
    [IsActive] BIT NOT NULL DEFAULT 1,
    [IsVerified] BIT NOT NULL DEFAULT 0,
    [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT [PK_Pharmacies] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_Pharmacies_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
);
GO

CREATE UNIQUE INDEX [IX_Pharmacies_UserId] ON [Pharmacies] ([UserId]);
GO

-- Orders
CREATE TABLE [Orders] (
    [Id] INT IDENTITY(1,1) NOT NULL,
    [OrderNumber] NVARCHAR(50) NOT NULL,
    [TrackingNumber] NVARCHAR(50) NOT NULL,
    [QrCode] NVARCHAR(20) NULL,
    [PharmacyId] INT NOT NULL,
    [PharmacyName] NVARCHAR(200) NULL,
    [DeliveryType] NVARCHAR(50) NOT NULL DEFAULT 'next_day',
    [TimeWindow] NVARCHAR(50) NULL,
    [ScheduledDate] NVARCHAR(20) NULL,
    [RecipientName] NVARCHAR(200) NOT NULL,
    [RecipientPhone] NVARCHAR(20) NOT NULL,
    [RecipientEmail] NVARCHAR(100) NULL,
    [Street] NVARCHAR(200) NOT NULL,
    [AptUnit] NVARCHAR(50) NULL,
    [City] NVARCHAR(100) NOT NULL,
    [State] NVARCHAR(20) NOT NULL,
    [PostalCode] NVARCHAR(20) NOT NULL,
    [Latitude] FLOAT NULL,
    [Longitude] FLOAT NULL,
    [DeliveryInstructions] NVARCHAR(500) NULL,
    [DriverId] INT NULL,
    [DriverName] NVARCHAR(200) NULL,
    [CircuitStopId] NVARCHAR(100) NULL,
    [RoutePlanId] INT NULL,
    [Status] NVARCHAR(50) NOT NULL DEFAULT 'new',
    [DeliveryNotes] NVARCHAR(1000) NULL,
    [RequiresSignature] BIT NOT NULL DEFAULT 1,
    [RequiresPhotoProof] BIT NOT NULL DEFAULT 1,
    [SignatureUrl] NVARCHAR(500) NULL,
    [PhotoUrl] NVARCHAR(500) NULL,
    [RecipientNameSigned] NVARCHAR(200) NULL,
    [DeliveryFee] DECIMAL(10,2) NOT NULL DEFAULT 5.99,
    [TotalAmount] DECIMAL(10,2) NOT NULL DEFAULT 5.99,
    [CopayAmount] DECIMAL(10,2) NOT NULL DEFAULT 0,
    [CopayCollected] BIT NOT NULL DEFAULT 0,
    [ActualPickupTime] DATETIME2 NULL,
    [ActualDeliveryTime] DATETIME2 NULL,
    [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    [UpdatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT [PK_Orders] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_Orders_Drivers_DriverId] FOREIGN KEY ([DriverId]) REFERENCES [Drivers] ([Id]) ON DELETE SET NULL,
    CONSTRAINT [FK_Orders_Pharmacies_PharmacyId] FOREIGN KEY ([PharmacyId]) REFERENCES [Pharmacies] ([Id])
);
GO

CREATE UNIQUE INDEX [IX_Orders_OrderNumber] ON [Orders] ([OrderNumber]);
GO

CREATE UNIQUE INDEX [IX_Orders_TrackingNumber] ON [Orders] ([TrackingNumber]);
GO

CREATE INDEX [IX_Orders_DriverId] ON [Orders] ([DriverId]);
GO

CREATE INDEX [IX_Orders_PharmacyId] ON [Orders] ([PharmacyId]);
GO

CREATE INDEX [IX_Orders_Status] ON [Orders] ([Status]);
GO

-- RoutePlanDrivers
CREATE TABLE [RoutePlanDrivers] (
    [Id] INT IDENTITY(1,1) NOT NULL,
    [RoutePlanId] INT NOT NULL,
    [DriverId] INT NOT NULL,
    CONSTRAINT [PK_RoutePlanDrivers] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_RoutePlanDrivers_Drivers_DriverId] FOREIGN KEY ([DriverId]) REFERENCES [Drivers] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_RoutePlanDrivers_RoutePlans_RoutePlanId] FOREIGN KEY ([RoutePlanId]) REFERENCES [RoutePlans] ([Id]) ON DELETE CASCADE
);
GO

CREATE INDEX [IX_RoutePlanDrivers_DriverId] ON [RoutePlanDrivers] ([DriverId]);
GO

CREATE INDEX [IX_RoutePlanDrivers_RoutePlanId] ON [RoutePlanDrivers] ([RoutePlanId]);
GO

-- RoutePlanOrders
CREATE TABLE [RoutePlanOrders] (
    [Id] INT IDENTITY(1,1) NOT NULL,
    [RoutePlanId] INT NOT NULL,
    [OrderId] INT NOT NULL,
    CONSTRAINT [PK_RoutePlanOrders] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_RoutePlanOrders_Orders_OrderId] FOREIGN KEY ([OrderId]) REFERENCES [Orders] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_RoutePlanOrders_RoutePlans_RoutePlanId] FOREIGN KEY ([RoutePlanId]) REFERENCES [RoutePlans] ([Id]) ON DELETE CASCADE
);
GO

CREATE INDEX [IX_RoutePlanOrders_OrderId] ON [RoutePlanOrders] ([OrderId]);
GO

CREATE INDEX [IX_RoutePlanOrders_RoutePlanId] ON [RoutePlanOrders] ([RoutePlanId]);
GO

-- ScanLogs
CREATE TABLE [ScanLogs] (
    [Id] INT IDENTITY(1,1) NOT NULL,
    [QrCode] NVARCHAR(50) NOT NULL,
    [OrderId] INT NULL,
    [OrderNumber] NVARCHAR(50) NULL,
    [Action] NVARCHAR(50) NOT NULL,
    [ScannedBy] NVARCHAR(128) NOT NULL,
    [ScannedByName] NVARCHAR(200) NULL,
    [ScannedByRole] NVARCHAR(50) NULL,
    [ScannedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT [PK_ScanLogs] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_ScanLogs_Orders_OrderId] FOREIGN KEY ([OrderId]) REFERENCES [Orders] ([Id]) ON DELETE SET NULL
);
GO

CREATE INDEX [IX_ScanLogs_OrderId] ON [ScanLogs] ([OrderId]);
GO

-- =====================================================
-- Record migrations in history
-- =====================================================
INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260217085512_Init', N'8.0.0');
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260217142736_AddCircuitFields', N'8.0.0');
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260217180757_FixIdentityKeyLengths', N'8.0.0');
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260218084940_AddGigEnhancements', N'8.0.0');
GO

-- =====================================================
-- Seed Default Roles
-- =====================================================
INSERT INTO [AspNetRoles] ([Id], [Name], [NormalizedName], [ConcurrencyStamp])
VALUES 
    (NEWID(), N'Admin', N'ADMIN', NEWID()),
    (NEWID(), N'Pharmacy', N'PHARMACY', NEWID()),
    (NEWID(), N'Driver', N'DRIVER', NEWID()),
    (NEWID(), N'Patient', N'PATIENT', NEWID());
GO

-- =====================================================
-- Seed Default Service Zones (NYC Boroughs)
-- =====================================================
INSERT INTO [ServiceZones] ([Name], [Code], [IsActive], [ZipCodes], [DeliveryFee], [SameDayCutoff], [PrioritySurcharge])
VALUES 
    (N'Manhattan', N'MAN', 1, N'10001,10002,10003,10004,10005,10006,10007,10008,10009,10010,10011,10012,10013,10014,10016,10017,10018,10019,10020,10021,10022,10023,10024,10025,10026,10027,10028,10029,10030,10031,10032,10033,10034,10035,10036,10037,10038,10039,10040,10044,10065,10069,10075,10128,10280,10282', 5.99, N'14:00', 10.00),
    (N'Brooklyn', N'BK', 1, N'11201,11203,11204,11205,11206,11207,11208,11209,11210,11211,11212,11213,11214,11215,11216,11217,11218,11219,11220,11221,11222,11223,11224,11225,11226,11228,11229,11230,11231,11232,11233,11234,11235,11236,11237,11238,11239', 6.99, N'13:00', 12.00),
    (N'Queens', N'QNS', 1, N'11004,11005,11101,11102,11103,11104,11105,11106,11109,11354,11355,11356,11357,11358,11359,11360,11361,11362,11363,11364,11365,11366,11367,11368,11369,11370,11371,11372,11373,11374,11375,11377,11378,11379,11385,11411,11412,11413,11414,11415,11416,11417,11418,11419,11420,11421,11422,11423,11426,11427,11428,11429,11430,11432,11433,11434,11435,11436,11691,11692,11693,11694,11697', 7.99, N'12:00', 15.00),
    (N'Bronx', N'BX', 1, N'10451,10452,10453,10454,10455,10456,10457,10458,10459,10460,10461,10462,10463,10464,10465,10466,10467,10468,10469,10470,10471,10472,10473,10474,10475', 7.99, N'12:00', 15.00),
    (N'Staten Island', N'SI', 1, N'10301,10302,10303,10304,10305,10306,10307,10308,10309,10310,10311,10312,10314', 9.99, N'11:00', 20.00);
GO

-- =====================================================
-- Seed Default Pricing
-- =====================================================
INSERT INTO [DeliveryPricing] ([DeliveryType], [Name], [Description], [BasePrice], [IsActive], [TimeWindowStart], [TimeWindowEnd])
VALUES 
    (N'next_day', N'Standard Next Day', N'Delivery by end of next business day', 5.99, 1, N'09:00', N'21:00'),
    (N'next_day', N'Morning Next Day', N'Delivery by 12:00 PM next day', 8.99, 1, N'09:00', N'12:00'),
    (N'next_day', N'Afternoon Next Day', N'Delivery between 12-5 PM next day', 7.99, 1, N'12:00', N'17:00'),
    (N'same_day', N'Standard Same Day', N'Delivery by end of day', 12.99, 1, N'14:00', N'21:00'),
    (N'same_day', N'Rush Same Day', N'Delivery within 4 hours', 19.99, 1, NULL, NULL),
    (N'priority', N'Priority 2-Hour', N'Guaranteed 2-hour delivery', 29.99, 1, NULL, NULL),
    (N'priority', N'Priority 1-Hour', N'Guaranteed 1-hour delivery', 39.99, 1, NULL, NULL),
    (N'scheduled', N'Scheduled Delivery', N'Choose your delivery date', 5.99, 1, N'09:00', N'21:00');
GO

PRINT N'SQL Server migration completed successfully!';
GO

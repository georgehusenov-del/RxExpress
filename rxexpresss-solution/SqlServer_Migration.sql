-- =============================================
-- RX Expresss SQL Server Migration Script
-- Generated: February 18, 2026
-- Compatible with: SQL Server 2016+, Azure SQL
-- =============================================
-- IMPORTANT: Run this on an EMPTY database
-- This creates all tables with proper NVARCHAR(128) keys for SQL Server index compatibility
-- =============================================

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

-- Migration History Table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = '__EFMigrationsHistory')
BEGIN
    CREATE TABLE [__EFMigrationsHistory] (
        [MigrationId] NVARCHAR(150) NOT NULL,
        [ProductVersion] NVARCHAR(32) NOT NULL,
        CONSTRAINT [PK___EFMigrationsHistory] PRIMARY KEY ([MigrationId])
    );
END
GO

-- Check if migration already applied
IF NOT EXISTS (SELECT 1 FROM [__EFMigrationsHistory] WHERE [MigrationId] = '20260218_InitialCreate_SqlServer')
BEGIN
    PRINT 'Applying migration: InitialCreate_SqlServer';

    -- ASP.NET Identity Tables
    CREATE TABLE [AspNetRoles] (
        [Id] NVARCHAR(128) NOT NULL,
        [Name] NVARCHAR(128) NULL,
        [NormalizedName] NVARCHAR(128) NULL,
        [ConcurrencyStamp] NVARCHAR(MAX) NULL,
        CONSTRAINT [PK_AspNetRoles] PRIMARY KEY ([Id])
    );

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
        [PhoneNumber] NVARCHAR(MAX) NULL,
        [PhoneNumberConfirmed] BIT NOT NULL DEFAULT 0,
        [TwoFactorEnabled] BIT NOT NULL DEFAULT 0,
        [LockoutEnd] DATETIMEOFFSET NULL,
        [LockoutEnabled] BIT NOT NULL DEFAULT 0,
        [AccessFailedCount] INT NOT NULL DEFAULT 0,
        CONSTRAINT [PK_AspNetUsers] PRIMARY KEY ([Id])
    );

    CREATE TABLE [AspNetRoleClaims] (
        [Id] INT IDENTITY(1,1) NOT NULL,
        [RoleId] NVARCHAR(128) NOT NULL,
        [ClaimType] NVARCHAR(MAX) NULL,
        [ClaimValue] NVARCHAR(MAX) NULL,
        CONSTRAINT [PK_AspNetRoleClaims] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_AspNetRoleClaims_AspNetRoles_RoleId] FOREIGN KEY ([RoleId]) REFERENCES [AspNetRoles] ([Id]) ON DELETE CASCADE
    );

    CREATE TABLE [AspNetUserClaims] (
        [Id] INT IDENTITY(1,1) NOT NULL,
        [UserId] NVARCHAR(128) NOT NULL,
        [ClaimType] NVARCHAR(MAX) NULL,
        [ClaimValue] NVARCHAR(MAX) NULL,
        CONSTRAINT [PK_AspNetUserClaims] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_AspNetUserClaims_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );

    CREATE TABLE [AspNetUserLogins] (
        [LoginProvider] NVARCHAR(128) NOT NULL,
        [ProviderKey] NVARCHAR(128) NOT NULL,
        [ProviderDisplayName] NVARCHAR(MAX) NULL,
        [UserId] NVARCHAR(128) NOT NULL,
        CONSTRAINT [PK_AspNetUserLogins] PRIMARY KEY ([LoginProvider], [ProviderKey]),
        CONSTRAINT [FK_AspNetUserLogins_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );

    CREATE TABLE [AspNetUserRoles] (
        [UserId] NVARCHAR(128) NOT NULL,
        [RoleId] NVARCHAR(128) NOT NULL,
        CONSTRAINT [PK_AspNetUserRoles] PRIMARY KEY ([UserId], [RoleId]),
        CONSTRAINT [FK_AspNetUserRoles_AspNetRoles_RoleId] FOREIGN KEY ([RoleId]) REFERENCES [AspNetRoles] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_AspNetUserRoles_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );

    CREATE TABLE [AspNetUserTokens] (
        [UserId] NVARCHAR(128) NOT NULL,
        [LoginProvider] NVARCHAR(128) NOT NULL,
        [Name] NVARCHAR(128) NOT NULL,
        [Value] NVARCHAR(MAX) NULL,
        CONSTRAINT [PK_AspNetUserTokens] PRIMARY KEY ([UserId], [LoginProvider], [Name]),
        CONSTRAINT [FK_AspNetUserTokens_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );

    -- Application Tables
    CREATE TABLE [ServiceZones] (
        [Id] INT IDENTITY(1,1) NOT NULL,
        [Name] NVARCHAR(100) NOT NULL,
        [Code] NVARCHAR(20) NOT NULL,
        [IsActive] BIT NOT NULL DEFAULT 1,
        [ZipCodes] NVARCHAR(MAX) NOT NULL DEFAULT '',
        [DeliveryFee] FLOAT NOT NULL DEFAULT 0,
        [SameDayCutoff] NVARCHAR(10) NOT NULL DEFAULT '14:00',
        [PrioritySurcharge] FLOAT NOT NULL DEFAULT 0,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT [PK_ServiceZones] PRIMARY KEY ([Id])
    );

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

    CREATE TABLE [Pharmacies] (
        [Id] INT IDENTITY(1,1) NOT NULL,
        [UserId] NVARCHAR(128) NOT NULL,
        [Name] NVARCHAR(200) NOT NULL,
        [Address] NVARCHAR(500) NULL,
        [City] NVARCHAR(100) NULL,
        [State] NVARCHAR(50) NULL,
        [ZipCode] NVARCHAR(20) NULL,
        [Phone] NVARCHAR(30) NULL,
        [Latitude] FLOAT NULL,
        [Longitude] FLOAT NULL,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        [UpdatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT [PK_Pharmacies] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Pharmacies_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );
    CREATE UNIQUE INDEX [IX_Pharmacies_UserId] ON [Pharmacies] ([UserId]);

    CREATE TABLE [Drivers] (
        [Id] INT IDENTITY(1,1) NOT NULL,
        [UserId] NVARCHAR(128) NOT NULL,
        [VehicleType] NVARCHAR(50) NULL,
        [VehiclePlate] NVARCHAR(20) NULL,
        [LicenseNumber] NVARCHAR(50) NULL,
        [IsAvailable] BIT NOT NULL DEFAULT 0,
        [CurrentLatitude] FLOAT NULL,
        [CurrentLongitude] FLOAT NULL,
        [CircuitDriverId] NVARCHAR(100) NULL,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        [UpdatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT [PK_Drivers] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Drivers_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );
    CREATE UNIQUE INDEX [IX_Drivers_UserId] ON [Drivers] ([UserId]);

    CREATE TABLE [RoutePlans] (
        [Id] INT IDENTITY(1,1) NOT NULL,
        [Name] NVARCHAR(200) NULL,
        [Date] DATETIME2 NOT NULL,
        [Status] NVARCHAR(50) NOT NULL DEFAULT 'pending',
        [CircuitPlanId] NVARCHAR(100) NULL,
        [ServiceZoneId] INT NULL,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        [UpdatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT [PK_RoutePlans] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_RoutePlans_ServiceZones_ServiceZoneId] FOREIGN KEY ([ServiceZoneId]) REFERENCES [ServiceZones] ([Id]) ON DELETE SET NULL
    );

    CREATE TABLE [Orders] (
        [Id] INT IDENTITY(1,1) NOT NULL,
        [PharmacyId] INT NOT NULL,
        [DriverId] INT NULL,
        [RoutePlanId] INT NULL,
        [OrderNumber] NVARCHAR(50) NOT NULL,
        [TrackingNumber] NVARCHAR(50) NOT NULL,
        [Status] NVARCHAR(50) NOT NULL DEFAULT 'new',
        [DeliveryType] NVARCHAR(50) NOT NULL DEFAULT 'standard',
        [Priority] INT NOT NULL DEFAULT 0,
        [RecipientName] NVARCHAR(200) NOT NULL,
        [RecipientPhone] NVARCHAR(30) NULL,
        [DeliveryAddress] NVARCHAR(500) NOT NULL,
        [DeliveryCity] NVARCHAR(100) NULL,
        [DeliveryState] NVARCHAR(50) NULL,
        [DeliveryZip] NVARCHAR(20) NULL,
        [DeliveryLatitude] FLOAT NULL,
        [DeliveryLongitude] FLOAT NULL,
        [DeliveryInstructions] NVARCHAR(500) NULL,
        [ScheduledDate] DATETIME2 NULL,
        [ScheduledTime] NVARCHAR(50) NULL,
        [RequiresRefrigeration] BIT NOT NULL DEFAULT 0,
        [RequiresSignature] BIT NOT NULL DEFAULT 1,
        [CopayAmount] DECIMAL(10,2) NOT NULL DEFAULT 0,
        [CopayCollected] BIT NOT NULL DEFAULT 0,
        [DeliveryFee] DECIMAL(10,2) NOT NULL DEFAULT 0,
        [TotalAmount] DECIMAL(10,2) NOT NULL DEFAULT 0,
        [Notes] NVARCHAR(MAX) NULL,
        [CircuitStopId] NVARCHAR(100) NULL,
        [PhotoUrl] NVARCHAR(500) NULL,
        [SignatureUrl] NVARCHAR(500) NULL,
        [ReceiverName] NVARCHAR(200) NULL,
        [DeliveredAt] DATETIME2 NULL,
        [PickedUpAt] DATETIME2 NULL,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        [UpdatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT [PK_Orders] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Orders_Pharmacies_PharmacyId] FOREIGN KEY ([PharmacyId]) REFERENCES [Pharmacies] ([Id]),
        CONSTRAINT [FK_Orders_Drivers_DriverId] FOREIGN KEY ([DriverId]) REFERENCES [Drivers] ([Id]) ON DELETE SET NULL,
        CONSTRAINT [FK_Orders_RoutePlans_RoutePlanId] FOREIGN KEY ([RoutePlanId]) REFERENCES [RoutePlans] ([Id]) ON DELETE SET NULL
    );
    CREATE UNIQUE INDEX [IX_Orders_OrderNumber] ON [Orders] ([OrderNumber]);
    CREATE UNIQUE INDEX [IX_Orders_TrackingNumber] ON [Orders] ([TrackingNumber]);
    CREATE INDEX [IX_Orders_Status] ON [Orders] ([Status]);
    CREATE INDEX [IX_Orders_PharmacyId] ON [Orders] ([PharmacyId]);
    CREATE INDEX [IX_Orders_DriverId] ON [Orders] ([DriverId]);

    CREATE TABLE [ScanLogs] (
        [Id] INT IDENTITY(1,1) NOT NULL,
        [OrderId] INT NULL,
        [ScannedBy] NVARCHAR(200) NULL,
        [ScanType] NVARCHAR(50) NOT NULL,
        [QrCode] NVARCHAR(100) NOT NULL,
        [Result] NVARCHAR(500) NULL,
        [ScannedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT [PK_ScanLogs] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_ScanLogs_Orders_OrderId] FOREIGN KEY ([OrderId]) REFERENCES [Orders] ([Id]) ON DELETE SET NULL
    );

    CREATE TABLE [RoutePlanDrivers] (
        [Id] INT IDENTITY(1,1) NOT NULL,
        [RoutePlanId] INT NOT NULL,
        [DriverId] INT NOT NULL,
        [AssignedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT [PK_RoutePlanDrivers] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_RoutePlanDrivers_RoutePlans_RoutePlanId] FOREIGN KEY ([RoutePlanId]) REFERENCES [RoutePlans] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_RoutePlanDrivers_Drivers_DriverId] FOREIGN KEY ([DriverId]) REFERENCES [Drivers] ([Id]) ON DELETE CASCADE
    );

    CREATE TABLE [RoutePlanOrders] (
        [Id] INT IDENTITY(1,1) NOT NULL,
        [RoutePlanId] INT NOT NULL,
        [OrderId] INT NOT NULL,
        [Sequence] INT NOT NULL DEFAULT 0,
        [AddedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT [PK_RoutePlanOrders] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_RoutePlanOrders_RoutePlans_RoutePlanId] FOREIGN KEY ([RoutePlanId]) REFERENCES [RoutePlans] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_RoutePlanOrders_Orders_OrderId] FOREIGN KEY ([OrderId]) REFERENCES [Orders] ([Id]) ON DELETE CASCADE
    );

    -- Identity Indexes
    CREATE UNIQUE INDEX [RoleNameIndex] ON [AspNetRoles] ([NormalizedName]) WHERE [NormalizedName] IS NOT NULL;
    CREATE INDEX [IX_AspNetRoleClaims_RoleId] ON [AspNetRoleClaims] ([RoleId]);
    CREATE INDEX [IX_AspNetUserClaims_UserId] ON [AspNetUserClaims] ([UserId]);
    CREATE INDEX [IX_AspNetUserLogins_UserId] ON [AspNetUserLogins] ([UserId]);
    CREATE INDEX [IX_AspNetUserRoles_RoleId] ON [AspNetUserRoles] ([RoleId]);
    CREATE INDEX [EmailIndex] ON [AspNetUsers] ([NormalizedEmail]);
    CREATE UNIQUE INDEX [UserNameIndex] ON [AspNetUsers] ([NormalizedUserName]) WHERE [NormalizedUserName] IS NOT NULL;

    -- Record migration
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES ('20260218_InitialCreate_SqlServer', '8.0.0');

    PRINT 'Migration applied successfully!';
END
ELSE
BEGIN
    PRINT 'Migration already applied.';
END
GO

-- =============================================
-- SEED DATA
-- =============================================

-- Seed Roles
IF NOT EXISTS (SELECT 1 FROM [AspNetRoles] WHERE [Name] = 'Admin')
BEGIN
    INSERT INTO [AspNetRoles] ([Id], [Name], [NormalizedName], [ConcurrencyStamp])
    VALUES (NEWID(), 'Admin', 'ADMIN', NEWID());
END

IF NOT EXISTS (SELECT 1 FROM [AspNetRoles] WHERE [Name] = 'Pharmacy')
BEGIN
    INSERT INTO [AspNetRoles] ([Id], [Name], [NormalizedName], [ConcurrencyStamp])
    VALUES (NEWID(), 'Pharmacy', 'PHARMACY', NEWID());
END

IF NOT EXISTS (SELECT 1 FROM [AspNetRoles] WHERE [Name] = 'Driver')
BEGIN
    INSERT INTO [AspNetRoles] ([Id], [Name], [NormalizedName], [ConcurrencyStamp])
    VALUES (NEWID(), 'Driver', 'DRIVER', NEWID());
END

-- Seed Service Zones (NYC Boroughs)
IF NOT EXISTS (SELECT 1 FROM [ServiceZones])
BEGIN
    INSERT INTO [ServiceZones] ([Name], [Code], [IsActive], [ZipCodes], [DeliveryFee], [SameDayCutoff], [PrioritySurcharge])
    VALUES 
        ('Manhattan', 'MAN', 1, '10001,10002,10003,10004,10005,10006,10007,10008,10009,10010,10011,10012,10013,10014,10016,10017,10018,10019,10020,10021,10022,10023,10024,10025,10026,10027,10028,10029,10030,10031,10032,10033,10034,10035,10036,10037,10038,10039,10040', 8.00, '14:00', 5.00),
        ('Brooklyn', 'BKN', 1, '11201,11202,11203,11204,11205,11206,11207,11208,11209,11210,11211,11212,11213,11214,11215,11216,11217,11218,11219,11220,11221,11222,11223,11224,11225,11226,11228,11229,11230,11231,11232,11233,11234,11235,11236,11237,11238,11239', 10.00, '13:00', 7.00),
        ('Queens', 'QNS', 1, '11101,11102,11103,11104,11105,11106,11109,11351,11354,11355,11356,11357,11358,11359,11360,11361,11362,11363,11364,11365,11366,11367,11368,11369,11370,11371,11372,11373,11374,11375,11377,11378,11379,11385,11411,11412,11413,11414,11415,11416,11417,11418,11419,11420,11421,11422,11423,11426,11427,11428,11429,11430,11432,11433,11434,11435,11436', 12.00, '12:00', 8.00),
        ('Bronx', 'BRX', 1, '10451,10452,10453,10454,10455,10456,10457,10458,10459,10460,10461,10462,10463,10464,10465,10466,10467,10468,10469,10470,10471,10472,10473,10474,10475', 12.00, '12:00', 8.00),
        ('Staten Island', 'STI', 1, '10301,10302,10303,10304,10305,10306,10307,10308,10309,10310,10311,10312,10314', 15.00, '11:00', 10.00);
END

-- Seed Delivery Pricing
IF NOT EXISTS (SELECT 1 FROM [DeliveryPricing])
BEGIN
    INSERT INTO [DeliveryPricing] ([DeliveryType], [Name], [Description], [BasePrice], [IsActive], [TimeWindowStart], [TimeWindowEnd], [CutoffTime], [IsAddon])
    VALUES 
        ('next_day', 'Next-Day Delivery', 'Delivery by next business day', 5.00, 1, '09:00', '21:00', '20:00', 0),
        ('same_day', 'Same-Day Delivery', 'Delivery by end of day', 10.00, 1, '09:00', '21:00', '14:00', 0),
        ('priority', 'Priority Delivery', 'Delivery within 4 hours', 20.00, 1, '09:00', '21:00', '17:00', 0),
        ('scheduled', 'Scheduled Delivery', 'Delivery at specific time', 8.00, 1, NULL, NULL, NULL, 0),
        ('refrigeration', 'Refrigeration', 'Cold chain handling', 5.00, 1, NULL, NULL, NULL, 1);
END

PRINT 'Seed data applied successfully!';
GO

-- NOTE: Orders and Gigs are NOT seeded
-- Orders are created by pharmacies via the Order Creation flow
-- Gigs (Route Plans) are auto-created when orders are submitted based on service zone

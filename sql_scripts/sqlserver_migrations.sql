-- ========================================================
-- RX Expresss - SQL Server Migration Script
-- Generated: February 17, 2026
-- FIXED: Identity key lengths reduced to 128 for SQL Server compatibility
-- ========================================================

-- Create Migration History table if not exists
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[__EFMigrationsHistory]') AND type in (N'U'))
BEGIN
    CREATE TABLE [__EFMigrationsHistory] (
        [MigrationId] NVARCHAR(150) NOT NULL,
        [ProductVersion] NVARCHAR(32) NOT NULL,
        CONSTRAINT [PK___EFMigrationsHistory] PRIMARY KEY ([MigrationId])
    );
END
GO

-- ========================================================
-- MIGRATION: Init + FixIdentityKeyLengths (Combined)
-- ========================================================
IF NOT EXISTS (SELECT * FROM [__EFMigrationsHistory] WHERE [MigrationId] = '20260217085512_Init')
BEGIN

    -- AspNetRoles (Key size: 128)
    CREATE TABLE [AspNetRoles] (
        [Id] NVARCHAR(128) NOT NULL,
        [Name] NVARCHAR(128) NULL,
        [NormalizedName] NVARCHAR(128) NULL,
        [ConcurrencyStamp] NVARCHAR(MAX) NULL,
        CONSTRAINT [PK_AspNetRoles] PRIMARY KEY ([Id])
    );

    -- AspNetUsers (Key size: 128)
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

    -- RoutePlans
    CREATE TABLE [RoutePlans] (
        [Id] INT IDENTITY(1,1) NOT NULL,
        [CircuitPlanId] NVARCHAR(100) NULL,
        [Title] NVARCHAR(200) NOT NULL,
        [Date] NVARCHAR(20) NOT NULL,
        [Status] NVARCHAR(50) NOT NULL DEFAULT 'draft',
        [OptimizationStatus] NVARCHAR(50) NOT NULL DEFAULT 'not_started',
        [Distributed] BIT NOT NULL DEFAULT 0,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        [UpdatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT [PK_RoutePlans] PRIMARY KEY ([Id])
    );

    -- ServiceZones
    CREATE TABLE [ServiceZones] (
        [Id] INT IDENTITY(1,1) NOT NULL,
        [Name] NVARCHAR(100) NOT NULL,
        [Code] NVARCHAR(20) NOT NULL,
        [IsActive] BIT NOT NULL DEFAULT 1,
        [ZipCodes] NVARCHAR(MAX) NOT NULL DEFAULT '',
        [DeliveryFee] FLOAT NOT NULL DEFAULT 5.99,
        [SameDayCutoff] NVARCHAR(10) NOT NULL DEFAULT '14:00',
        [PrioritySurcharge] FLOAT NOT NULL DEFAULT 5.00,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT [PK_ServiceZones] PRIMARY KEY ([Id])
    );

    -- AspNetRoleClaims
    CREATE TABLE [AspNetRoleClaims] (
        [Id] INT IDENTITY(1,1) NOT NULL,
        [RoleId] NVARCHAR(128) NOT NULL,
        [ClaimType] NVARCHAR(MAX) NULL,
        [ClaimValue] NVARCHAR(MAX) NULL,
        CONSTRAINT [PK_AspNetRoleClaims] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_AspNetRoleClaims_AspNetRoles_RoleId] FOREIGN KEY ([RoleId]) REFERENCES [AspNetRoles] ([Id]) ON DELETE CASCADE
    );

    -- AspNetUserClaims
    CREATE TABLE [AspNetUserClaims] (
        [Id] INT IDENTITY(1,1) NOT NULL,
        [UserId] NVARCHAR(128) NOT NULL,
        [ClaimType] NVARCHAR(MAX) NULL,
        [ClaimValue] NVARCHAR(MAX) NULL,
        CONSTRAINT [PK_AspNetUserClaims] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_AspNetUserClaims_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );

    -- AspNetUserLogins (Key sizes: 128)
    CREATE TABLE [AspNetUserLogins] (
        [LoginProvider] NVARCHAR(128) NOT NULL,
        [ProviderKey] NVARCHAR(128) NOT NULL,
        [ProviderDisplayName] NVARCHAR(MAX) NULL,
        [UserId] NVARCHAR(128) NOT NULL,
        CONSTRAINT [PK_AspNetUserLogins] PRIMARY KEY ([LoginProvider], [ProviderKey]),
        CONSTRAINT [FK_AspNetUserLogins_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );

    -- AspNetUserRoles
    CREATE TABLE [AspNetUserRoles] (
        [UserId] NVARCHAR(128) NOT NULL,
        [RoleId] NVARCHAR(128) NOT NULL,
        CONSTRAINT [PK_AspNetUserRoles] PRIMARY KEY ([UserId], [RoleId]),
        CONSTRAINT [FK_AspNetUserRoles_AspNetRoles_RoleId] FOREIGN KEY ([RoleId]) REFERENCES [AspNetRoles] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_AspNetUserRoles_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );

    -- AspNetUserTokens (Key sizes: 128)
    CREATE TABLE [AspNetUserTokens] (
        [UserId] NVARCHAR(128) NOT NULL,
        [LoginProvider] NVARCHAR(128) NOT NULL,
        [Name] NVARCHAR(128) NOT NULL,
        [Value] NVARCHAR(MAX) NULL,
        CONSTRAINT [PK_AspNetUserTokens] PRIMARY KEY ([UserId], [LoginProvider], [Name]),
        CONSTRAINT [FK_AspNetUserTokens_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );

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
        [State] NVARCHAR(2) NOT NULL,
        [PostalCode] NVARCHAR(10) NOT NULL,
        [Latitude] FLOAT NULL,
        [Longitude] FLOAT NULL,
        [IsActive] BIT NOT NULL DEFAULT 1,
        [IsVerified] BIT NOT NULL DEFAULT 0,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT [PK_Pharmacies] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Pharmacies_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );

    -- Drivers
    CREATE TABLE [Drivers] (
        [Id] INT IDENTITY(1,1) NOT NULL,
        [UserId] NVARCHAR(128) NOT NULL,
        [CircuitDriverId] NVARCHAR(100) NULL,
        [VehicleType] NVARCHAR(20) NOT NULL DEFAULT 'car',
        [VehicleNumber] NVARCHAR(20) NOT NULL,
        [LicenseNumber] NVARCHAR(50) NOT NULL,
        [Status] NVARCHAR(20) NOT NULL DEFAULT 'offline',
        [CurrentLatitude] FLOAT NULL,
        [CurrentLongitude] FLOAT NULL,
        [Rating] FLOAT NOT NULL DEFAULT 0.0,
        [TotalDeliveries] INT NOT NULL DEFAULT 0,
        [IsVerified] BIT NOT NULL DEFAULT 0,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT [PK_Drivers] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Drivers_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );

    -- Orders
    CREATE TABLE [Orders] (
        [Id] INT IDENTITY(1,1) NOT NULL,
        [OrderNumber] NVARCHAR(20) NOT NULL,
        [TrackingNumber] NVARCHAR(20) NOT NULL,
        [QrCode] NVARCHAR(20) NULL,
        [CircuitStopId] NVARCHAR(100) NULL,
        [PharmacyId] INT NOT NULL,
        [PharmacyName] NVARCHAR(200) NULL,
        [DeliveryType] NVARCHAR(20) NOT NULL DEFAULT 'next_day',
        [TimeWindow] NVARCHAR(50) NULL,
        [ScheduledDate] NVARCHAR(20) NULL,
        [RecipientName] NVARCHAR(100) NOT NULL,
        [RecipientPhone] NVARCHAR(20) NOT NULL,
        [RecipientEmail] NVARCHAR(100) NULL,
        [Street] NVARCHAR(200) NOT NULL,
        [AptUnit] NVARCHAR(50) NULL,
        [City] NVARCHAR(100) NOT NULL,
        [State] NVARCHAR(2) NOT NULL,
        [PostalCode] NVARCHAR(10) NOT NULL,
        [Latitude] FLOAT NULL,
        [Longitude] FLOAT NULL,
        [DeliveryInstructions] NVARCHAR(500) NULL,
        [DriverId] INT NULL,
        [DriverName] NVARCHAR(100) NULL,
        [Status] NVARCHAR(20) NOT NULL DEFAULT 'new',
        [DeliveryNotes] NVARCHAR(500) NULL,
        [RequiresSignature] BIT NOT NULL DEFAULT 1,
        [RequiresPhotoProof] BIT NOT NULL DEFAULT 1,
        [SignatureUrl] NVARCHAR(500) NULL,
        [PhotoUrl] NVARCHAR(500) NULL,
        [RecipientNameSigned] NVARCHAR(100) NULL,
        [DeliveryFee] DECIMAL(10,2) NOT NULL DEFAULT 5.99,
        [TotalAmount] DECIMAL(10,2) NOT NULL DEFAULT 5.99,
        [CopayAmount] DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        [CopayCollected] BIT NOT NULL DEFAULT 0,
        [ActualPickupTime] DATETIME2 NULL,
        [ActualDeliveryTime] DATETIME2 NULL,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        [UpdatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT [PK_Orders] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Orders_Pharmacies_PharmacyId] FOREIGN KEY ([PharmacyId]) REFERENCES [Pharmacies] ([Id]),
        CONSTRAINT [FK_Orders_Drivers_DriverId] FOREIGN KEY ([DriverId]) REFERENCES [Drivers] ([Id]) ON DELETE SET NULL
    );

    -- RoutePlanDrivers
    CREATE TABLE [RoutePlanDrivers] (
        [Id] INT IDENTITY(1,1) NOT NULL,
        [RoutePlanId] INT NOT NULL,
        [DriverId] INT NOT NULL,
        CONSTRAINT [PK_RoutePlanDrivers] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_RoutePlanDrivers_RoutePlans_RoutePlanId] FOREIGN KEY ([RoutePlanId]) REFERENCES [RoutePlans] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_RoutePlanDrivers_Drivers_DriverId] FOREIGN KEY ([DriverId]) REFERENCES [Drivers] ([Id]) ON DELETE CASCADE
    );

    -- RoutePlanOrders
    CREATE TABLE [RoutePlanOrders] (
        [Id] INT IDENTITY(1,1) NOT NULL,
        [RoutePlanId] INT NOT NULL,
        [OrderId] INT NOT NULL,
        CONSTRAINT [PK_RoutePlanOrders] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_RoutePlanOrders_RoutePlans_RoutePlanId] FOREIGN KEY ([RoutePlanId]) REFERENCES [RoutePlans] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_RoutePlanOrders_Orders_OrderId] FOREIGN KEY ([OrderId]) REFERENCES [Orders] ([Id]) ON DELETE CASCADE
    );

    -- ScanLogs
    CREATE TABLE [ScanLogs] (
        [Id] INT IDENTITY(1,1) NOT NULL,
        [QrCode] NVARCHAR(20) NOT NULL,
        [OrderId] INT NULL,
        [OrderNumber] NVARCHAR(20) NULL,
        [Action] NVARCHAR(50) NOT NULL,
        [ScannedBy] NVARCHAR(128) NOT NULL,
        [ScannedByName] NVARCHAR(100) NULL,
        [ScannedByRole] NVARCHAR(20) NULL,
        [ScannedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT [PK_ScanLogs] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_ScanLogs_Orders_OrderId] FOREIGN KEY ([OrderId]) REFERENCES [Orders] ([Id]) ON DELETE SET NULL
    );

    -- Create Indexes
    CREATE INDEX [IX_AspNetRoleClaims_RoleId] ON [AspNetRoleClaims] ([RoleId]);
    CREATE UNIQUE INDEX [RoleNameIndex] ON [AspNetRoles] ([NormalizedName]) WHERE [NormalizedName] IS NOT NULL;
    CREATE INDEX [IX_AspNetUserClaims_UserId] ON [AspNetUserClaims] ([UserId]);
    CREATE INDEX [IX_AspNetUserLogins_UserId] ON [AspNetUserLogins] ([UserId]);
    CREATE INDEX [IX_AspNetUserRoles_RoleId] ON [AspNetUserRoles] ([RoleId]);
    CREATE INDEX [EmailIndex] ON [AspNetUsers] ([NormalizedEmail]);
    CREATE UNIQUE INDEX [UserNameIndex] ON [AspNetUsers] ([NormalizedUserName]) WHERE [NormalizedUserName] IS NOT NULL;
    CREATE UNIQUE INDEX [IX_Drivers_UserId] ON [Drivers] ([UserId]);
    CREATE INDEX [IX_Orders_DriverId] ON [Orders] ([DriverId]);
    CREATE UNIQUE INDEX [IX_Orders_OrderNumber] ON [Orders] ([OrderNumber]);
    CREATE INDEX [IX_Orders_PharmacyId] ON [Orders] ([PharmacyId]);
    CREATE INDEX [IX_Orders_Status] ON [Orders] ([Status]);
    CREATE UNIQUE INDEX [IX_Orders_TrackingNumber] ON [Orders] ([TrackingNumber]);
    CREATE UNIQUE INDEX [IX_Pharmacies_UserId] ON [Pharmacies] ([UserId]);
    CREATE INDEX [IX_RoutePlanDrivers_DriverId] ON [RoutePlanDrivers] ([DriverId]);
    CREATE INDEX [IX_RoutePlanDrivers_RoutePlanId] ON [RoutePlanDrivers] ([RoutePlanId]);
    CREATE INDEX [IX_RoutePlanOrders_OrderId] ON [RoutePlanOrders] ([OrderId]);
    CREATE INDEX [IX_RoutePlanOrders_RoutePlanId] ON [RoutePlanOrders] ([RoutePlanId]);
    CREATE INDEX [IX_ScanLogs_OrderId] ON [ScanLogs] ([OrderId]);

    -- Record migrations as applied
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES ('20260217085512_Init', '8.0.0');
    
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES ('20260217142736_AddCircuitFields', '8.0.0');
    
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES ('20260217145432_FixIdentityKeyLengths', '8.0.0');

END
GO

-- ========================================================
-- SEED DATA: Roles
-- ========================================================
IF NOT EXISTS (SELECT * FROM [AspNetRoles] WHERE [Name] = 'Admin')
BEGIN
    INSERT INTO [AspNetRoles] ([Id], [Name], [NormalizedName], [ConcurrencyStamp])
    VALUES (NEWID(), 'Admin', 'ADMIN', NEWID());
END

IF NOT EXISTS (SELECT * FROM [AspNetRoles] WHERE [Name] = 'Pharmacy')
BEGIN
    INSERT INTO [AspNetRoles] ([Id], [Name], [NormalizedName], [ConcurrencyStamp])
    VALUES (NEWID(), 'Pharmacy', 'PHARMACY', NEWID());
END

IF NOT EXISTS (SELECT * FROM [AspNetRoles] WHERE [Name] = 'Driver')
BEGIN
    INSERT INTO [AspNetRoles] ([Id], [Name], [NormalizedName], [ConcurrencyStamp])
    VALUES (NEWID(), 'Driver', 'DRIVER', NEWID());
END
GO

PRINT 'SQL Server migration completed successfully!';
GO

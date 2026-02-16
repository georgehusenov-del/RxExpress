-- ============================================================
-- RX Expresss Database Script for SQL Server
-- Run this on your SQL Server to create the database and tables
-- Then update the connection string in appsettings.json
-- ============================================================

-- Create Database (uncomment if needed)
-- CREATE DATABASE RxExpresssDb;
-- GO
-- USE RxExpresssDb;
-- GO

-- ============================================================
-- ASP.NET Identity Tables
-- ============================================================

CREATE TABLE [AspNetRoles] (
    [Id] NVARCHAR(450) NOT NULL,
    [Name] NVARCHAR(256) NULL,
    [NormalizedName] NVARCHAR(256) NULL,
    [ConcurrencyStamp] NVARCHAR(MAX) NULL,
    CONSTRAINT [PK_AspNetRoles] PRIMARY KEY ([Id])
);

CREATE TABLE [AspNetUsers] (
    [Id] NVARCHAR(450) NOT NULL,
    [FirstName] NVARCHAR(100) NOT NULL DEFAULT '',
    [LastName] NVARCHAR(100) NOT NULL DEFAULT '',
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
    [LockoutEnabled] BIT NOT NULL DEFAULT 1,
    [AccessFailedCount] INT NOT NULL DEFAULT 0,
    CONSTRAINT [PK_AspNetUsers] PRIMARY KEY ([Id])
);

CREATE TABLE [AspNetRoleClaims] (
    [Id] INT IDENTITY(1,1) NOT NULL,
    [RoleId] NVARCHAR(450) NOT NULL,
    [ClaimType] NVARCHAR(MAX) NULL,
    [ClaimValue] NVARCHAR(MAX) NULL,
    CONSTRAINT [PK_AspNetRoleClaims] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_AspNetRoleClaims_AspNetRoles] FOREIGN KEY ([RoleId]) REFERENCES [AspNetRoles]([Id]) ON DELETE CASCADE
);

CREATE TABLE [AspNetUserClaims] (
    [Id] INT IDENTITY(1,1) NOT NULL,
    [UserId] NVARCHAR(450) NOT NULL,
    [ClaimType] NVARCHAR(MAX) NULL,
    [ClaimValue] NVARCHAR(MAX) NULL,
    CONSTRAINT [PK_AspNetUserClaims] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_AspNetUserClaims_AspNetUsers] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers]([Id]) ON DELETE CASCADE
);

CREATE TABLE [AspNetUserLogins] (
    [LoginProvider] NVARCHAR(450) NOT NULL,
    [ProviderKey] NVARCHAR(450) NOT NULL,
    [ProviderDisplayName] NVARCHAR(MAX) NULL,
    [UserId] NVARCHAR(450) NOT NULL,
    CONSTRAINT [PK_AspNetUserLogins] PRIMARY KEY ([LoginProvider], [ProviderKey]),
    CONSTRAINT [FK_AspNetUserLogins_AspNetUsers] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers]([Id]) ON DELETE CASCADE
);

CREATE TABLE [AspNetUserRoles] (
    [UserId] NVARCHAR(450) NOT NULL,
    [RoleId] NVARCHAR(450) NOT NULL,
    CONSTRAINT [PK_AspNetUserRoles] PRIMARY KEY ([UserId], [RoleId]),
    CONSTRAINT [FK_AspNetUserRoles_AspNetRoles] FOREIGN KEY ([RoleId]) REFERENCES [AspNetRoles]([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_AspNetUserRoles_AspNetUsers] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers]([Id]) ON DELETE CASCADE
);

CREATE TABLE [AspNetUserTokens] (
    [UserId] NVARCHAR(450) NOT NULL,
    [LoginProvider] NVARCHAR(450) NOT NULL,
    [Name] NVARCHAR(450) NOT NULL,
    [Value] NVARCHAR(MAX) NULL,
    CONSTRAINT [PK_AspNetUserTokens] PRIMARY KEY ([UserId], [LoginProvider], [Name]),
    CONSTRAINT [FK_AspNetUserTokens_AspNetUsers] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers]([Id]) ON DELETE CASCADE
);

-- ============================================================
-- Application Tables
-- ============================================================

CREATE TABLE [Pharmacies] (
    [Id] INT IDENTITY(1,1) NOT NULL,
    [UserId] NVARCHAR(450) NOT NULL,
    [Name] NVARCHAR(200) NOT NULL,
    [LicenseNumber] NVARCHAR(MAX) NOT NULL DEFAULT '',
    [NpiNumber] NVARCHAR(MAX) NULL,
    [Phone] NVARCHAR(MAX) NOT NULL DEFAULT '',
    [Email] NVARCHAR(MAX) NOT NULL DEFAULT '',
    [Website] NVARCHAR(MAX) NULL,
    [Street] NVARCHAR(MAX) NOT NULL DEFAULT '',
    [AptUnit] NVARCHAR(MAX) NULL,
    [City] NVARCHAR(MAX) NOT NULL DEFAULT '',
    [State] NVARCHAR(MAX) NOT NULL DEFAULT '',
    [PostalCode] NVARCHAR(MAX) NOT NULL DEFAULT '',
    [Latitude] FLOAT NULL,
    [Longitude] FLOAT NULL,
    [IsActive] BIT NOT NULL DEFAULT 1,
    [IsVerified] BIT NOT NULL DEFAULT 0,
    [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT [PK_Pharmacies] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_Pharmacies_AspNetUsers] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers]([Id]) ON DELETE CASCADE
);
CREATE UNIQUE INDEX [IX_Pharmacies_UserId] ON [Pharmacies]([UserId]);

CREATE TABLE [Drivers] (
    [Id] INT IDENTITY(1,1) NOT NULL,
    [UserId] NVARCHAR(450) NOT NULL,
    [VehicleType] NVARCHAR(MAX) NOT NULL DEFAULT 'car',
    [VehicleNumber] NVARCHAR(MAX) NOT NULL DEFAULT '',
    [LicenseNumber] NVARCHAR(MAX) NOT NULL DEFAULT '',
    [Status] NVARCHAR(MAX) NOT NULL DEFAULT 'offline',
    [CurrentLatitude] FLOAT NULL,
    [CurrentLongitude] FLOAT NULL,
    [Rating] FLOAT NOT NULL DEFAULT 0.0,
    [TotalDeliveries] INT NOT NULL DEFAULT 0,
    [IsVerified] BIT NOT NULL DEFAULT 0,
    [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT [PK_Drivers] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_Drivers_AspNetUsers] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers]([Id]) ON DELETE CASCADE
);
CREATE UNIQUE INDEX [IX_Drivers_UserId] ON [Drivers]([UserId]);

CREATE TABLE [Orders] (
    [Id] INT IDENTITY(1,1) NOT NULL,
    [OrderNumber] NVARCHAR(MAX) NOT NULL,
    [TrackingNumber] NVARCHAR(MAX) NOT NULL,
    [QrCode] NVARCHAR(MAX) NULL,
    [PharmacyId] INT NOT NULL,
    [PharmacyName] NVARCHAR(MAX) NULL,
    [DeliveryType] NVARCHAR(MAX) NOT NULL DEFAULT 'next_day',
    [TimeWindow] NVARCHAR(MAX) NULL,
    [ScheduledDate] NVARCHAR(MAX) NULL,
    [RecipientName] NVARCHAR(MAX) NOT NULL DEFAULT '',
    [RecipientPhone] NVARCHAR(MAX) NOT NULL DEFAULT '',
    [RecipientEmail] NVARCHAR(MAX) NULL,
    [Street] NVARCHAR(MAX) NOT NULL DEFAULT '',
    [AptUnit] NVARCHAR(MAX) NULL,
    [City] NVARCHAR(MAX) NOT NULL DEFAULT '',
    [State] NVARCHAR(MAX) NOT NULL DEFAULT '',
    [PostalCode] NVARCHAR(MAX) NOT NULL DEFAULT '',
    [Latitude] FLOAT NULL,
    [Longitude] FLOAT NULL,
    [DeliveryInstructions] NVARCHAR(MAX) NULL,
    [DriverId] INT NULL,
    [DriverName] NVARCHAR(MAX) NULL,
    [Status] NVARCHAR(MAX) NOT NULL DEFAULT 'new',
    [DeliveryNotes] NVARCHAR(MAX) NULL,
    [RequiresSignature] BIT NOT NULL DEFAULT 1,
    [RequiresPhotoProof] BIT NOT NULL DEFAULT 1,
    [SignatureUrl] NVARCHAR(MAX) NULL,
    [PhotoUrl] NVARCHAR(MAX) NULL,
    [RecipientNameSigned] NVARCHAR(MAX) NULL,
    [DeliveryFee] DECIMAL(10,2) NOT NULL DEFAULT 5.99,
    [TotalAmount] DECIMAL(10,2) NOT NULL DEFAULT 5.99,
    [CopayAmount] DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    [CopayCollected] BIT NOT NULL DEFAULT 0,
    [ActualPickupTime] DATETIME2 NULL,
    [ActualDeliveryTime] DATETIME2 NULL,
    [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    [UpdatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT [PK_Orders] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_Orders_Pharmacies] FOREIGN KEY ([PharmacyId]) REFERENCES [Pharmacies]([Id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_Orders_Drivers] FOREIGN KEY ([DriverId]) REFERENCES [Drivers]([Id]) ON DELETE SET NULL
);
CREATE INDEX [IX_Orders_Status] ON [Orders]([Status]);

CREATE TABLE [DeliveryPricing] (
    [Id] INT IDENTITY(1,1) NOT NULL,
    [DeliveryType] NVARCHAR(MAX) NOT NULL DEFAULT '',
    [Name] NVARCHAR(MAX) NOT NULL DEFAULT '',
    [Description] NVARCHAR(MAX) NULL,
    [BasePrice] DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    [IsActive] BIT NOT NULL DEFAULT 1,
    [TimeWindowStart] NVARCHAR(MAX) NULL,
    [TimeWindowEnd] NVARCHAR(MAX) NULL,
    [CutoffTime] NVARCHAR(MAX) NULL,
    [IsAddon] BIT NOT NULL DEFAULT 0,
    [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    [UpdatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT [PK_DeliveryPricing] PRIMARY KEY ([Id])
);

CREATE TABLE [ScanLogs] (
    [Id] INT IDENTITY(1,1) NOT NULL,
    [QrCode] NVARCHAR(MAX) NOT NULL DEFAULT '',
    [OrderId] INT NULL,
    [OrderNumber] NVARCHAR(MAX) NULL,
    [Action] NVARCHAR(MAX) NOT NULL DEFAULT 'verify',
    [ScannedBy] NVARCHAR(MAX) NOT NULL DEFAULT '',
    [ScannedByName] NVARCHAR(MAX) NULL,
    [ScannedByRole] NVARCHAR(MAX) NULL,
    [ScannedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT [PK_ScanLogs] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_ScanLogs_Orders] FOREIGN KEY ([OrderId]) REFERENCES [Orders]([Id]) ON DELETE SET NULL
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE UNIQUE INDEX [IX_AspNetRoles_Name] ON [AspNetRoles]([NormalizedName]) WHERE [NormalizedName] IS NOT NULL;
CREATE INDEX [IX_AspNetRoleClaims_RoleId] ON [AspNetRoleClaims]([RoleId]);
CREATE INDEX [IX_AspNetUserClaims_UserId] ON [AspNetUserClaims]([UserId]);
CREATE INDEX [IX_AspNetUserLogins_UserId] ON [AspNetUserLogins]([UserId]);
CREATE INDEX [IX_AspNetUserRoles_RoleId] ON [AspNetUserRoles]([RoleId]);
CREATE INDEX [IX_AspNetUsers_NormalizedEmail] ON [AspNetUsers]([NormalizedEmail]);
CREATE UNIQUE INDEX [IX_AspNetUsers_NormalizedUserName] ON [AspNetUsers]([NormalizedUserName]) WHERE [NormalizedUserName] IS NOT NULL;

-- ============================================================
-- Seed Roles
-- ============================================================
INSERT INTO [AspNetRoles] ([Id], [Name], [NormalizedName]) VALUES
    (NEWID(), 'Admin', 'ADMIN'),
    (NEWID(), 'Pharmacy', 'PHARMACY'),
    (NEWID(), 'Driver', 'DRIVER'),
    (NEWID(), 'Patient', 'PATIENT');

-- ============================================================
-- Seed Pricing
-- ============================================================
INSERT INTO [DeliveryPricing] ([DeliveryType], [Name], [BasePrice], [IsActive], [TimeWindowStart], [TimeWindowEnd])
VALUES ('next_day', 'Next-Day Delivery', 5.99, 1, '08:00', '22:00');

INSERT INTO [DeliveryPricing] ([DeliveryType], [Name], [BasePrice], [IsActive], [CutoffTime])
VALUES ('same_day', 'Same-Day Delivery', 9.99, 1, '14:00');

INSERT INTO [DeliveryPricing] ([DeliveryType], [Name], [BasePrice], [IsActive])
VALUES ('priority', 'Priority Delivery', 14.99, 1);

-- ============================================================
-- NOTE: SuperAdmin user is created by the application on first run
-- via DbSeeder.cs with ASP.NET Identity (password hashing)
-- Credentials: admin@rxexpresss.com / Admin@123
-- ============================================================

PRINT 'Database script executed successfully!';
GO

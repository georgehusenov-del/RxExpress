-- ============================================================
-- RX Expresss — Subscriptions Module — SQL Server Schema Script
-- Run this ONCE on the production SQL Server database before
-- flipping "Subscriptions:Enabled" to true in appsettings.json.
-- Idempotent: safe to re-run (uses IF NOT EXISTS guards).
-- ============================================================

-- SubscriptionPlans
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'SubscriptionPlans')
BEGIN
CREATE TABLE [SubscriptionPlans] (
    [Id]                    INT IDENTITY(1,1) PRIMARY KEY,
    [Code]                  NVARCHAR(50)  NOT NULL,
    [Name]                  NVARCHAR(100) NOT NULL,
    [Description]           NVARCHAR(500) NOT NULL DEFAULT '',
    [StripeProductId]       NVARCHAR(128) NULL,
    [StripeMonthlyPriceId]  NVARCHAR(128) NULL,
    [StripeAnnualPriceId]   NVARCHAR(128) NULL,
    [MonthlyPrice]          DECIMAL(10,2) NOT NULL DEFAULT 0,
    [AnnualPrice]           DECIMAL(10,2) NOT NULL DEFAULT 0,
    [Currency]              NVARCHAR(10)  NOT NULL DEFAULT 'usd',
    [MaxOrdersPerMonth]     INT           NOT NULL DEFAULT 0,
    [MaxActiveDrivers]      INT           NOT NULL DEFAULT 0,
    [ApiAccess]             BIT           NOT NULL DEFAULT 0,
    [WebhookAccess]         BIT           NOT NULL DEFAULT 0,
    [AdvancedReports]       BIT           NOT NULL DEFAULT 0,
    [RouteOptimization]     BIT           NOT NULL DEFAULT 0,
    [PrioritySupport]       BIT           NOT NULL DEFAULT 0,
    [TrialDays]             INT           NOT NULL DEFAULT 30,
    [SortOrder]             INT           NOT NULL DEFAULT 0,
    [IsActive]              BIT           NOT NULL DEFAULT 1,
    [CreatedAt]             DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]             DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME()
);
CREATE UNIQUE INDEX IX_SubscriptionPlans_Code ON SubscriptionPlans(Code);
END
GO

-- PharmacySubscriptions
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'PharmacySubscriptions')
BEGIN
CREATE TABLE [PharmacySubscriptions] (
    [Id]                           INT IDENTITY(1,1) PRIMARY KEY,
    [PharmacyId]                   INT NOT NULL,
    [SubscriptionPlanId]           INT NOT NULL,
    [StripeCustomerId]             NVARCHAR(128) NULL,
    [StripeSubscriptionId]         NVARCHAR(128) NULL,
    [StripeCheckoutSessionId]      NVARCHAR(128) NULL,
    [StripePriceId]                NVARCHAR(128) NULL,
    [Status]                       INT NOT NULL DEFAULT 0,
    [Interval]                     INT NOT NULL DEFAULT 0,
    [TrialStart]                   DATETIME2 NULL,
    [TrialEnd]                     DATETIME2 NULL,
    [CurrentPeriodStart]           DATETIME2 NULL,
    [CurrentPeriodEnd]             DATETIME2 NULL,
    [CanceledAt]                   DATETIME2 NULL,
    [EndedAt]                      DATETIME2 NULL,
    [TrialConversionConfirmed]     BIT NOT NULL DEFAULT 0,
    [TrialConversionConfirmedAt]   DATETIME2 NULL,
    [CancelAtPeriodEnd]            BIT NOT NULL DEFAULT 0,
    [CreatedAt]                    DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]                    DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_PharmacySubscriptions_Pharmacy FOREIGN KEY (PharmacyId) REFERENCES Pharmacies(Id) ON DELETE CASCADE,
    CONSTRAINT FK_PharmacySubscriptions_Plan     FOREIGN KEY (SubscriptionPlanId) REFERENCES SubscriptionPlans(Id)
);
CREATE INDEX IX_PharmacySubscriptions_PharmacyId ON PharmacySubscriptions(PharmacyId);
CREATE INDEX IX_PharmacySubscriptions_StripeSubscriptionId ON PharmacySubscriptions(StripeSubscriptionId);
END
GO

-- SubscriptionInvoices
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'SubscriptionInvoices')
BEGIN
CREATE TABLE [SubscriptionInvoices] (
    [Id]                       INT IDENTITY(1,1) PRIMARY KEY,
    [PharmacySubscriptionId]   INT NOT NULL,
    [StripeInvoiceId]          NVARCHAR(128) NULL,
    [StripePaymentIntentId]    NVARCHAR(128) NULL,
    [HostedInvoiceUrl]         NVARCHAR(500) NULL,
    [InvoicePdfUrl]            NVARCHAR(500) NULL,
    [Amount]                   DECIMAL(10,2) NOT NULL DEFAULT 0,
    [AmountPaid]               DECIMAL(10,2) NOT NULL DEFAULT 0,
    [Currency]                 NVARCHAR(10)  NOT NULL DEFAULT 'usd',
    [Status]                   NVARCHAR(30)  NOT NULL DEFAULT 'open',
    [PaidAt]                   DATETIME2 NULL,
    [CreatedAt]                DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_SubscriptionInvoices_Sub FOREIGN KEY (PharmacySubscriptionId) REFERENCES PharmacySubscriptions(Id) ON DELETE CASCADE
);
CREATE INDEX IX_SubscriptionInvoices_StripeInvoiceId ON SubscriptionInvoices(StripeInvoiceId);
END
GO

-- SubscriptionUsages
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'SubscriptionUsages')
BEGIN
CREATE TABLE [SubscriptionUsages] (
    [Id]              INT IDENTITY(1,1) PRIMARY KEY,
    [PharmacyId]      INT NOT NULL,
    [Year]            INT NOT NULL,
    [Month]           INT NOT NULL,
    [OrdersCreated]   INT NOT NULL DEFAULT 0,
    [ActiveDrivers]   INT NOT NULL DEFAULT 0,
    [UpdatedAt]       DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
CREATE UNIQUE INDEX IX_SubscriptionUsages_Pharmacy_YearMonth ON SubscriptionUsages(PharmacyId, Year, Month);
END
GO

-- PaymentTransactions
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'PaymentTransactions')
BEGIN
CREATE TABLE [PaymentTransactions] (
    [Id]                      INT IDENTITY(1,1) PRIMARY KEY,
    [PharmacyId]              INT NULL,
    [PharmacySubscriptionId]  INT NULL,
    [StripeSessionId]         NVARCHAR(128) NULL,
    [StripePaymentIntentId]   NVARCHAR(128) NULL,
    [StripeSubscriptionId]    NVARCHAR(128) NULL,
    [Kind]                    NVARCHAR(30)  NOT NULL DEFAULT 'subscription',
    [Amount]                  DECIMAL(10,2) NOT NULL DEFAULT 0,
    [Currency]                NVARCHAR(10)  NOT NULL DEFAULT 'usd',
    [Status]                  NVARCHAR(30)  NOT NULL DEFAULT 'initiated',
    [Metadata]                NVARCHAR(MAX) NULL,
    [CreatedAt]               DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]               DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
CREATE INDEX IX_PaymentTransactions_StripeSessionId ON PaymentTransactions(StripeSessionId);
END
GO

-- Seed the 3 default plans (Starter / Pro / Enterprise) — can be edited later via Admin UI.
IF NOT EXISTS (SELECT 1 FROM SubscriptionPlans WHERE Code = 'starter')
INSERT INTO SubscriptionPlans (Code, Name, Description, MonthlyPrice, AnnualPrice, MaxOrdersPerMonth, MaxActiveDrivers, ApiAccess, WebhookAccess, AdvancedReports, RouteOptimization, PrioritySupport, TrialDays, SortOrder, IsActive)
VALUES ('starter', 'Starter', 'For small pharmacies getting started with delivery.', 49.00, 470.40, 100, 2, 0, 0, 0, 0, 0, 30, 1, 1);

IF NOT EXISTS (SELECT 1 FROM SubscriptionPlans WHERE Code = 'pro')
INSERT INTO SubscriptionPlans (Code, Name, Description, MonthlyPrice, AnnualPrice, MaxOrdersPerMonth, MaxActiveDrivers, ApiAccess, WebhookAccess, AdvancedReports, RouteOptimization, PrioritySupport, TrialDays, SortOrder, IsActive)
VALUES ('pro', 'Pro', 'For growing pharmacies with high order volume.', 149.00, 1430.40, 500, 10, 1, 1, 1, 1, 0, 30, 2, 1);

IF NOT EXISTS (SELECT 1 FROM SubscriptionPlans WHERE Code = 'enterprise')
INSERT INTO SubscriptionPlans (Code, Name, Description, MonthlyPrice, AnnualPrice, MaxOrdersPerMonth, MaxActiveDrivers, ApiAccess, WebhookAccess, AdvancedReports, RouteOptimization, PrioritySupport, TrialDays, SortOrder, IsActive)
VALUES ('enterprise', 'Enterprise', 'Unlimited scale with priority support and premium features.', 399.00, 3830.40, -1, -1, 1, 1, 1, 1, 1, 30, 3, 1);
GO

PRINT 'Subscriptions schema + seed plans created.';

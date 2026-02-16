CREATE TABLE "AspNetRoles" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_AspNetRoles" PRIMARY KEY,
    "Name" TEXT NULL,
    "NormalizedName" TEXT NULL,
    "ConcurrencyStamp" TEXT NULL
);


CREATE TABLE "AspNetUsers" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_AspNetUsers" PRIMARY KEY,
    "FirstName" TEXT NOT NULL,
    "LastName" TEXT NOT NULL,
    "IsActive" INTEGER NOT NULL,
    "CreatedAt" TEXT NOT NULL,
    "UpdatedAt" TEXT NOT NULL,
    "UserName" TEXT NULL,
    "NormalizedUserName" TEXT NULL,
    "Email" TEXT NULL,
    "NormalizedEmail" TEXT NULL,
    "EmailConfirmed" INTEGER NOT NULL,
    "PasswordHash" TEXT NULL,
    "SecurityStamp" TEXT NULL,
    "ConcurrencyStamp" TEXT NULL,
    "PhoneNumber" TEXT NULL,
    "PhoneNumberConfirmed" INTEGER NOT NULL,
    "TwoFactorEnabled" INTEGER NOT NULL,
    "LockoutEnd" TEXT NULL,
    "LockoutEnabled" INTEGER NOT NULL,
    "AccessFailedCount" INTEGER NOT NULL
);


CREATE TABLE "DeliveryPricing" (
    "Id" INTEGER NOT NULL CONSTRAINT "PK_DeliveryPricing" PRIMARY KEY AUTOINCREMENT,
    "DeliveryType" TEXT NOT NULL,
    "Name" TEXT NOT NULL,
    "Description" TEXT NULL,
    "BasePrice" decimal(10,2) NOT NULL,
    "IsActive" INTEGER NOT NULL,
    "TimeWindowStart" TEXT NULL,
    "TimeWindowEnd" TEXT NULL,
    "CutoffTime" TEXT NULL,
    "IsAddon" INTEGER NOT NULL,
    "CreatedAt" TEXT NOT NULL,
    "UpdatedAt" TEXT NOT NULL
);


CREATE TABLE "AspNetRoleClaims" (
    "Id" INTEGER NOT NULL CONSTRAINT "PK_AspNetRoleClaims" PRIMARY KEY AUTOINCREMENT,
    "RoleId" TEXT NOT NULL,
    "ClaimType" TEXT NULL,
    "ClaimValue" TEXT NULL,
    CONSTRAINT "FK_AspNetRoleClaims_AspNetRoles_RoleId" FOREIGN KEY ("RoleId") REFERENCES "AspNetRoles" ("Id") ON DELETE CASCADE
);


CREATE TABLE "AspNetUserClaims" (
    "Id" INTEGER NOT NULL CONSTRAINT "PK_AspNetUserClaims" PRIMARY KEY AUTOINCREMENT,
    "UserId" TEXT NOT NULL,
    "ClaimType" TEXT NULL,
    "ClaimValue" TEXT NULL,
    CONSTRAINT "FK_AspNetUserClaims_AspNetUsers_UserId" FOREIGN KEY ("UserId") REFERENCES "AspNetUsers" ("Id") ON DELETE CASCADE
);


CREATE TABLE "AspNetUserLogins" (
    "LoginProvider" TEXT NOT NULL,
    "ProviderKey" TEXT NOT NULL,
    "ProviderDisplayName" TEXT NULL,
    "UserId" TEXT NOT NULL,
    CONSTRAINT "PK_AspNetUserLogins" PRIMARY KEY ("LoginProvider", "ProviderKey"),
    CONSTRAINT "FK_AspNetUserLogins_AspNetUsers_UserId" FOREIGN KEY ("UserId") REFERENCES "AspNetUsers" ("Id") ON DELETE CASCADE
);


CREATE TABLE "AspNetUserRoles" (
    "UserId" TEXT NOT NULL,
    "RoleId" TEXT NOT NULL,
    CONSTRAINT "PK_AspNetUserRoles" PRIMARY KEY ("UserId", "RoleId"),
    CONSTRAINT "FK_AspNetUserRoles_AspNetRoles_RoleId" FOREIGN KEY ("RoleId") REFERENCES "AspNetRoles" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_AspNetUserRoles_AspNetUsers_UserId" FOREIGN KEY ("UserId") REFERENCES "AspNetUsers" ("Id") ON DELETE CASCADE
);


CREATE TABLE "AspNetUserTokens" (
    "UserId" TEXT NOT NULL,
    "LoginProvider" TEXT NOT NULL,
    "Name" TEXT NOT NULL,
    "Value" TEXT NULL,
    CONSTRAINT "PK_AspNetUserTokens" PRIMARY KEY ("UserId", "LoginProvider", "Name"),
    CONSTRAINT "FK_AspNetUserTokens_AspNetUsers_UserId" FOREIGN KEY ("UserId") REFERENCES "AspNetUsers" ("Id") ON DELETE CASCADE
);


CREATE TABLE "Drivers" (
    "Id" INTEGER NOT NULL CONSTRAINT "PK_Drivers" PRIMARY KEY AUTOINCREMENT,
    "UserId" TEXT NOT NULL,
    "VehicleType" TEXT NOT NULL,
    "VehicleNumber" TEXT NOT NULL,
    "LicenseNumber" TEXT NOT NULL,
    "Status" TEXT NOT NULL,
    "CurrentLatitude" REAL NULL,
    "CurrentLongitude" REAL NULL,
    "Rating" REAL NOT NULL,
    "TotalDeliveries" INTEGER NOT NULL,
    "IsVerified" INTEGER NOT NULL,
    "CreatedAt" TEXT NOT NULL,
    CONSTRAINT "FK_Drivers_AspNetUsers_UserId" FOREIGN KEY ("UserId") REFERENCES "AspNetUsers" ("Id") ON DELETE CASCADE
);


CREATE TABLE "Pharmacies" (
    "Id" INTEGER NOT NULL CONSTRAINT "PK_Pharmacies" PRIMARY KEY AUTOINCREMENT,
    "UserId" TEXT NOT NULL,
    "Name" TEXT NOT NULL,
    "LicenseNumber" TEXT NOT NULL,
    "NpiNumber" TEXT NULL,
    "Phone" TEXT NOT NULL,
    "Email" TEXT NOT NULL,
    "Website" TEXT NULL,
    "Street" TEXT NOT NULL,
    "AptUnit" TEXT NULL,
    "City" TEXT NOT NULL,
    "State" TEXT NOT NULL,
    "PostalCode" TEXT NOT NULL,
    "Latitude" REAL NULL,
    "Longitude" REAL NULL,
    "IsActive" INTEGER NOT NULL,
    "IsVerified" INTEGER NOT NULL,
    "CreatedAt" TEXT NOT NULL,
    CONSTRAINT "FK_Pharmacies_AspNetUsers_UserId" FOREIGN KEY ("UserId") REFERENCES "AspNetUsers" ("Id") ON DELETE CASCADE
);


CREATE TABLE "Orders" (
    "Id" INTEGER NOT NULL CONSTRAINT "PK_Orders" PRIMARY KEY AUTOINCREMENT,
    "OrderNumber" TEXT NOT NULL,
    "TrackingNumber" TEXT NOT NULL,
    "QrCode" TEXT NULL,
    "PharmacyId" INTEGER NOT NULL,
    "PharmacyName" TEXT NULL,
    "DeliveryType" TEXT NOT NULL,
    "TimeWindow" TEXT NULL,
    "ScheduledDate" TEXT NULL,
    "RecipientName" TEXT NOT NULL,
    "RecipientPhone" TEXT NOT NULL,
    "RecipientEmail" TEXT NULL,
    "Street" TEXT NOT NULL,
    "AptUnit" TEXT NULL,
    "City" TEXT NOT NULL,
    "State" TEXT NOT NULL,
    "PostalCode" TEXT NOT NULL,
    "Latitude" REAL NULL,
    "Longitude" REAL NULL,
    "DeliveryInstructions" TEXT NULL,
    "DriverId" INTEGER NULL,
    "DriverName" TEXT NULL,
    "Status" TEXT NOT NULL,
    "DeliveryNotes" TEXT NULL,
    "RequiresSignature" INTEGER NOT NULL,
    "RequiresPhotoProof" INTEGER NOT NULL,
    "SignatureUrl" TEXT NULL,
    "PhotoUrl" TEXT NULL,
    "RecipientNameSigned" TEXT NULL,
    "DeliveryFee" decimal(10,2) NOT NULL,
    "TotalAmount" decimal(10,2) NOT NULL,
    "CopayAmount" decimal(10,2) NOT NULL,
    "CopayCollected" INTEGER NOT NULL,
    "ActualPickupTime" TEXT NULL,
    "ActualDeliveryTime" TEXT NULL,
    "CreatedAt" TEXT NOT NULL,
    "UpdatedAt" TEXT NOT NULL,
    CONSTRAINT "FK_Orders_Drivers_DriverId" FOREIGN KEY ("DriverId") REFERENCES "Drivers" ("Id") ON DELETE SET NULL,
    CONSTRAINT "FK_Orders_Pharmacies_PharmacyId" FOREIGN KEY ("PharmacyId") REFERENCES "Pharmacies" ("Id") ON DELETE RESTRICT
);


CREATE TABLE "ScanLogs" (
    "Id" INTEGER NOT NULL CONSTRAINT "PK_ScanLogs" PRIMARY KEY AUTOINCREMENT,
    "QrCode" TEXT NOT NULL,
    "OrderId" INTEGER NULL,
    "OrderNumber" TEXT NULL,
    "Action" TEXT NOT NULL,
    "ScannedBy" TEXT NOT NULL,
    "ScannedByName" TEXT NULL,
    "ScannedByRole" TEXT NULL,
    "ScannedAt" TEXT NOT NULL,
    CONSTRAINT "FK_ScanLogs_Orders_OrderId" FOREIGN KEY ("OrderId") REFERENCES "Orders" ("Id") ON DELETE SET NULL
);


CREATE INDEX "IX_AspNetRoleClaims_RoleId" ON "AspNetRoleClaims" ("RoleId");


CREATE UNIQUE INDEX "RoleNameIndex" ON "AspNetRoles" ("NormalizedName");


CREATE INDEX "IX_AspNetUserClaims_UserId" ON "AspNetUserClaims" ("UserId");


CREATE INDEX "IX_AspNetUserLogins_UserId" ON "AspNetUserLogins" ("UserId");


CREATE INDEX "IX_AspNetUserRoles_RoleId" ON "AspNetUserRoles" ("RoleId");


CREATE INDEX "EmailIndex" ON "AspNetUsers" ("NormalizedEmail");


CREATE UNIQUE INDEX "UserNameIndex" ON "AspNetUsers" ("NormalizedUserName");


CREATE UNIQUE INDEX "IX_Drivers_UserId" ON "Drivers" ("UserId");


CREATE INDEX "IX_Orders_DriverId" ON "Orders" ("DriverId");


CREATE UNIQUE INDEX "IX_Orders_OrderNumber" ON "Orders" ("OrderNumber");


CREATE INDEX "IX_Orders_PharmacyId" ON "Orders" ("PharmacyId");


CREATE INDEX "IX_Orders_Status" ON "Orders" ("Status");


CREATE UNIQUE INDEX "IX_Orders_TrackingNumber" ON "Orders" ("TrackingNumber");


CREATE UNIQUE INDEX "IX_Pharmacies_UserId" ON "Pharmacies" ("UserId");


CREATE INDEX "IX_ScanLogs_OrderId" ON "ScanLogs" ("OrderId");



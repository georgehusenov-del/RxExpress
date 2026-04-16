namespace RxExpresss.Core.Entities;

/// <summary>
/// Stores per-user permissions. Admin has all by default.
/// Admin assigns permissions to Managers, Managers assign to Operators.
/// PermissionKey format: "page.action" e.g. "orders.view", "orders.create"
/// </summary>
public class UserPermission
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string PermissionKey { get; set; } = string.Empty; // e.g. "orders.view"
    public string GrantedByUserId { get; set; } = string.Empty; // Who assigned this
    public DateTime GrantedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public ApplicationUser User { get; set; } = null!;
}

/// <summary>
/// Predefined list of available permissions
/// </summary>
public static class Permissions
{
    // Orders
    public const string OrdersView = "orders.view";
    public const string OrdersCreate = "orders.create";
    public const string OrdersEdit = "orders.edit";
    public const string OrdersDelete = "orders.delete";
    public const string OrdersDuplicate = "orders.duplicate";

    // Routes / Gigs
    public const string RoutesView = "routes.view";
    public const string RoutesCreate = "routes.create";
    public const string RoutesOptimize = "routes.optimize";
    public const string RoutesAssign = "routes.assign";

    // Drivers
    public const string DriversView = "drivers.view";
    public const string DriversCreate = "drivers.create";
    public const string DriversEdit = "drivers.edit";

    // Tracking
    public const string TrackingView = "tracking.view";

    // Pharmacies
    public const string PharmaciesView = "pharmacies.view";
    public const string PharmaciesCreate = "pharmacies.create";

    // Users
    public const string UsersView = "users.view";
    public const string UsersCreate = "users.create";
    public const string UsersEdit = "users.edit";

    // Pricing
    public const string PricingView = "pricing.view";
    public const string PricingEdit = "pricing.edit";

    // QR Scanning
    public const string ScanningView = "scanning.view";

    // Service Zones
    public const string ZonesView = "zones.view";
    public const string ZonesEdit = "zones.edit";

    // Office Locations
    public const string OfficesView = "offices.view";
    public const string OfficesEdit = "offices.edit";

    // API Keys
    public const string ApiKeysView = "apikeys.view";
    public const string ApiKeysCreate = "apikeys.create";

    // Reports
    public const string ReportsView = "reports.view";

    /// <summary>
    /// All available permissions with labels and categories
    /// </summary>
    public static readonly List<(string Key, string Label, string Category)> All = new()
    {
        (OrdersView, "View Orders", "Orders"),
        (OrdersCreate, "Create Orders", "Orders"),
        (OrdersEdit, "Edit Orders", "Orders"),
        (OrdersDelete, "Delete/Cancel Orders", "Orders"),
        (OrdersDuplicate, "Duplicate Failed Orders", "Orders"),

        (RoutesView, "View Routes/Gigs", "Routes"),
        (RoutesCreate, "Create Gigs", "Routes"),
        (RoutesOptimize, "Optimize Routes", "Routes"),
        (RoutesAssign, "Assign Drivers", "Routes"),

        (DriversView, "View Drivers", "Drivers"),
        (DriversCreate, "Create Drivers", "Drivers"),
        (DriversEdit, "Edit Drivers", "Drivers"),

        (TrackingView, "Live Driver Tracking", "Tracking"),

        (PharmaciesView, "View Pharmacies", "Pharmacies"),
        (PharmaciesCreate, "Create Pharmacies", "Pharmacies"),

        (UsersView, "View Users", "Users"),
        (UsersCreate, "Create Users", "Users"),
        (UsersEdit, "Edit Users", "Users"),

        (PricingView, "View Pricing", "Pricing"),
        (PricingEdit, "Edit Pricing", "Pricing"),

        (ScanningView, "QR Scanning", "Scanning"),

        (ZonesView, "View Service Zones", "Zones"),
        (ZonesEdit, "Edit Service Zones", "Zones"),

        (OfficesView, "View Office Locations", "Offices"),
        (OfficesEdit, "Edit Office Locations", "Offices"),

        (ApiKeysView, "View API Keys", "API Keys"),
        (ApiKeysCreate, "Create API Keys", "API Keys"),

        (ReportsView, "View Reports", "Reports"),
    };

    /// <summary>
    /// Map sidebar pages to their required view permission
    /// </summary>
    public static readonly Dictionary<string, string> SidebarPermissions = new()
    {
        { "overview", "" }, // Everyone can see overview
        { "users", UsersView },
        { "pharmacies", PharmaciesView },
        { "drivers", DriversView },
        { "tracking", TrackingView },
        { "orders", OrdersView },
        { "routes", RoutesView },
        { "pricing", PricingView },
        { "scanning", ScanningView },
        { "zones", ZonesView },
        { "offices", OfficesView },
        { "api-keys", ApiKeysView },
        { "reports", ReportsView },
    };
}

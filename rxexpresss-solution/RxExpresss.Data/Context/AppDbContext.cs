using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using RxExpresss.Core.Entities;

namespace RxExpresss.Data.Context;

public class AppDbContext : IdentityDbContext<ApplicationUser>
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Pharmacy> Pharmacies => Set<Pharmacy>();
    public DbSet<DriverProfile> Drivers => Set<DriverProfile>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<DeliveryPricing> DeliveryPricing => Set<DeliveryPricing>();
    public DbSet<ScanLog> ScanLogs => Set<ScanLog>();
    public DbSet<RoutePlan> RoutePlans => Set<RoutePlan>();
    public DbSet<RoutePlanDriver> RoutePlanDrivers => Set<RoutePlanDriver>();
    public DbSet<RoutePlanOrder> RoutePlanOrders => Set<RoutePlanOrder>();
    public DbSet<ServiceZone> ServiceZones => Set<ServiceZone>();
    public DbSet<ApiKey> ApiKeys => Set<ApiKey>();
    public DbSet<Webhook> Webhooks => Set<Webhook>();
    public DbSet<OfficeLocation> OfficeLocations => Set<OfficeLocation>();
    public DbSet<DriverLocationLog> DriverLocationLogs => Set<DriverLocationLog>();
    public DbSet<UserPermission> UserPermissions => Set<UserPermission>();
    public DbSet<OrderAttemptLog> OrderAttemptLogs => Set<OrderAttemptLog>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // Fix SQL Server index key length issue - reduce Identity key sizes from 450 to 128
        builder.Entity<ApplicationUser>(e =>
        {
            e.Property(u => u.Id).HasMaxLength(128);
            e.Property(u => u.FirstName).HasMaxLength(100);
            e.Property(u => u.LastName).HasMaxLength(100);
        });

        builder.Entity<IdentityRole>(e =>
        {
            e.Property(r => r.Id).HasMaxLength(128);
            e.Property(r => r.Name).HasMaxLength(128);
            e.Property(r => r.NormalizedName).HasMaxLength(128);
        });

        builder.Entity<IdentityUserLogin<string>>(e =>
        {
            e.Property(l => l.LoginProvider).HasMaxLength(128);
            e.Property(l => l.ProviderKey).HasMaxLength(128);
        });

        builder.Entity<IdentityUserToken<string>>(e =>
        {
            e.Property(t => t.LoginProvider).HasMaxLength(128);
            e.Property(t => t.Name).HasMaxLength(128);
        });

        // Additional Identity tables - SQL Server key length fix
        builder.Entity<IdentityUserRole<string>>(e =>
        {
            e.Property(r => r.UserId).HasMaxLength(128);
            e.Property(r => r.RoleId).HasMaxLength(128);
        });

        builder.Entity<IdentityUserClaim<string>>(e =>
        {
            e.Property(c => c.UserId).HasMaxLength(128);
        });

        builder.Entity<IdentityRoleClaim<string>>(e =>
        {
            e.Property(c => c.RoleId).HasMaxLength(128);
        });

        builder.Entity<Pharmacy>(e =>
        {
            e.HasKey(p => p.Id);
            e.Property(p => p.UserId).HasMaxLength(128);
            e.HasOne(p => p.User).WithOne(u => u.Pharmacy).HasForeignKey<Pharmacy>(p => p.UserId);
            e.Property(p => p.Name).HasMaxLength(200);
            e.HasIndex(p => p.UserId).IsUnique();
        });

        builder.Entity<DriverProfile>(e =>
        {
            e.HasKey(d => d.Id);
            e.Property(d => d.UserId).HasMaxLength(128);
            e.HasOne(d => d.User).WithOne(u => u.DriverProfile).HasForeignKey<DriverProfile>(d => d.UserId);
            e.HasIndex(d => d.UserId).IsUnique();
        });

        builder.Entity<Order>(e =>
        {
            e.HasKey(o => o.Id);
            e.HasOne(o => o.Pharmacy).WithMany(p => p.Orders).HasForeignKey(o => o.PharmacyId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(o => o.Driver).WithMany(d => d.Orders).HasForeignKey(o => o.DriverId).OnDelete(DeleteBehavior.SetNull);
            e.HasIndex(o => o.OrderNumber).IsUnique();
            e.HasIndex(o => o.TrackingNumber).IsUnique();
            e.HasIndex(o => o.Status);
            e.Property(o => o.DeliveryFee).HasColumnType("decimal(10,2)");
            e.Property(o => o.TotalAmount).HasColumnType("decimal(10,2)");
            e.Property(o => o.CopayAmount).HasColumnType("decimal(10,2)");
        });

        builder.Entity<DeliveryPricing>(e =>
        {
            e.HasKey(p => p.Id);
            e.Property(p => p.BasePrice).HasColumnType("decimal(10,2)");
        });

        builder.Entity<ScanLog>(e =>
        {
            e.HasKey(s => s.Id);
            e.HasOne(s => s.Order).WithMany().HasForeignKey(s => s.OrderId).OnDelete(DeleteBehavior.SetNull);
        });

        builder.Entity<RoutePlan>(e => { 
            e.HasKey(r => r.Id);
            e.HasOne(r => r.ServiceZone).WithMany().HasForeignKey(r => r.ServiceZoneId).OnDelete(DeleteBehavior.SetNull);
        });
        builder.Entity<RoutePlanDriver>(e =>
        {
            e.HasKey(r => r.Id);
            e.HasOne(r => r.RoutePlan).WithMany().HasForeignKey(r => r.RoutePlanId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(r => r.Driver).WithMany().HasForeignKey(r => r.DriverId).OnDelete(DeleteBehavior.Cascade);
        });
        builder.Entity<RoutePlanOrder>(e =>
        {
            e.HasKey(r => r.Id);
            e.HasOne(r => r.RoutePlan).WithMany().HasForeignKey(r => r.RoutePlanId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(r => r.Order).WithMany().HasForeignKey(r => r.OrderId).OnDelete(DeleteBehavior.Cascade);
        });
        builder.Entity<ServiceZone>(e => { e.HasKey(z => z.Id); });

        // Integration API entities
        builder.Entity<ApiKey>(e =>
        {
            e.HasKey(a => a.Id);
            e.HasOne(a => a.Pharmacy).WithMany().HasForeignKey(a => a.PharmacyId).OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(a => a.Key).IsUnique();
            e.Property(a => a.Key).HasMaxLength(64);
            e.Property(a => a.Secret).HasMaxLength(128);
            e.Property(a => a.Name).HasMaxLength(200);
        });

        builder.Entity<Webhook>(e =>
        {
            e.HasKey(w => w.Id);
            e.HasOne(w => w.Pharmacy).WithMany().HasForeignKey(w => w.PharmacyId).OnDelete(DeleteBehavior.Cascade);
            e.Property(w => w.Url).HasMaxLength(500);
            e.Property(w => w.Events).HasMaxLength(500);
            e.Property(w => w.Secret).HasMaxLength(128);
        });

        builder.Entity<OfficeLocation>(e =>
        {
            e.HasKey(o => o.Id);
            e.Property(o => o.Name).HasMaxLength(200);
            e.Property(o => o.Address).HasMaxLength(300);
            e.Property(o => o.City).HasMaxLength(100);
            e.Property(o => o.State).HasMaxLength(50);
            e.Property(o => o.PostalCode).HasMaxLength(20);
        });
    }
}

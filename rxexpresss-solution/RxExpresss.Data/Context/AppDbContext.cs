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

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<ApplicationUser>(e =>
        {
            e.Property(u => u.FirstName).HasMaxLength(100);
            e.Property(u => u.LastName).HasMaxLength(100);
        });

        builder.Entity<Pharmacy>(e =>
        {
            e.HasKey(p => p.Id);
            e.HasOne(p => p.User).WithOne(u => u.Pharmacy).HasForeignKey<Pharmacy>(p => p.UserId);
            e.Property(p => p.Name).HasMaxLength(200);
            e.HasIndex(p => p.UserId).IsUnique();
        });

        builder.Entity<DriverProfile>(e =>
        {
            e.HasKey(d => d.Id);
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
    }
}

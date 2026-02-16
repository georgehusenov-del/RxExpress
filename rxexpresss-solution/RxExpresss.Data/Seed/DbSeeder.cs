using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RxExpresss.Core.Entities;
using RxExpresss.Core.Utilities;
using RxExpresss.Data.Context;

namespace RxExpresss.Data.Seed;

public static class DbSeeder
{
    public static async Task SeedAsync(IServiceProvider serviceProvider)
    {
        var context = serviceProvider.GetRequiredService<AppDbContext>();
        var userManager = serviceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var roleManager = serviceProvider.GetRequiredService<RoleManager<IdentityRole>>();

        await context.Database.MigrateAsync();

        // Seed Roles
        string[] roles = { AppRoles.Admin, AppRoles.Pharmacy, AppRoles.Driver, AppRoles.Patient };
        foreach (var role in roles)
        {
            if (!await roleManager.RoleExistsAsync(role))
                await roleManager.CreateAsync(new IdentityRole(role));
        }

        // Seed SuperAdmin
        if (await userManager.FindByEmailAsync("admin@rxexpresss.com") == null)
        {
            var admin = new ApplicationUser
            {
                UserName = "admin@rxexpresss.com",
                Email = "admin@rxexpresss.com",
                FirstName = "Super",
                LastName = "Admin",
                PhoneNumber = "555-0001",
                EmailConfirmed = true,
                IsActive = true
            };
            await userManager.CreateAsync(admin, "Admin@123");
            await userManager.AddToRoleAsync(admin, AppRoles.Admin);
        }

        // Seed Pharmacy User
        if (await userManager.FindByEmailAsync("pharmacy@test.com") == null)
        {
            var pharmacyUser = new ApplicationUser
            {
                UserName = "pharmacy@test.com",
                Email = "pharmacy@test.com",
                FirstName = "Test",
                LastName = "Pharmacy",
                PhoneNumber = "555-0002",
                EmailConfirmed = true,
                IsActive = true
            };
            await userManager.CreateAsync(pharmacyUser, "Pharmacy@123");
            await userManager.AddToRoleAsync(pharmacyUser, AppRoles.Pharmacy);

            // Create pharmacy profile
            context.Pharmacies.Add(new Pharmacy
            {
                UserId = pharmacyUser.Id,
                Name = "HealthFirst Pharmacy",
                LicenseNumber = "PHR-2024-001",
                Phone = "555-0002",
                Email = "pharmacy@test.com",
                Street = "123 Main St",
                City = "New York",
                State = "NY",
                PostalCode = "10001",
                Latitude = 40.7484,
                Longitude = -73.9967,
                IsVerified = true
            });
            await context.SaveChangesAsync();
        }

        // Seed Driver User
        if (await userManager.FindByEmailAsync("driver@test.com") == null)
        {
            var driverUser = new ApplicationUser
            {
                UserName = "driver@test.com",
                Email = "driver@test.com",
                FirstName = "Test",
                LastName = "Driver",
                PhoneNumber = "555-0003",
                EmailConfirmed = true,
                IsActive = true
            };
            await userManager.CreateAsync(driverUser, "Driver@123");
            await userManager.AddToRoleAsync(driverUser, AppRoles.Driver);

            context.Drivers.Add(new DriverProfile
            {
                UserId = driverUser.Id,
                VehicleType = "car",
                VehicleNumber = "ABC-1234",
                LicenseNumber = "DL-2024-001",
                Status = "available",
                IsVerified = true
            });
            await context.SaveChangesAsync();
        }

        // Seed Pricing
        if (!await context.DeliveryPricing.AnyAsync())
        {
            context.DeliveryPricing.AddRange(
                new DeliveryPricing { DeliveryType = "next_day", Name = "Next-Day Delivery", BasePrice = 5.99m, IsActive = true, TimeWindowStart = "08:00", TimeWindowEnd = "22:00" },
                new DeliveryPricing { DeliveryType = "same_day", Name = "Same-Day Delivery", BasePrice = 9.99m, IsActive = true, CutoffTime = "14:00" },
                new DeliveryPricing { DeliveryType = "priority", Name = "Priority Delivery", BasePrice = 14.99m, IsActive = true }
            );
            await context.SaveChangesAsync();
        }
    }
}

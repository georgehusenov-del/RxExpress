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
        Pharmacy? pharmacy = null;
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
            pharmacy = new Pharmacy
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
            };
            context.Pharmacies.Add(pharmacy);
            await context.SaveChangesAsync();
        }
        else
        {
            pharmacy = await context.Pharmacies.FirstOrDefaultAsync();
        }

        // Seed Driver User
        DriverProfile? driver = null;
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

            driver = new DriverProfile
            {
                UserId = driverUser.Id,
                VehicleType = "car",
                VehicleNumber = "ABC-1234",
                LicenseNumber = "DL-2024-001",
                Status = "available",
                IsVerified = true
            };
            context.Drivers.Add(driver);
            await context.SaveChangesAsync();
        }
        else
        {
            driver = await context.Drivers.FirstOrDefaultAsync();
        }

        // Seed Second Driver
        DriverProfile? driver2 = null;
        if (await userManager.FindByEmailAsync("driver2@test.com") == null)
        {
            var driverUser2 = new ApplicationUser
            {
                UserName = "driver2@test.com",
                Email = "driver2@test.com",
                FirstName = "John",
                LastName = "Smith",
                PhoneNumber = "555-0004",
                EmailConfirmed = true,
                IsActive = true
            };
            await userManager.CreateAsync(driverUser2, "Driver@123");
            await userManager.AddToRoleAsync(driverUser2, AppRoles.Driver);

            driver2 = new DriverProfile
            {
                UserId = driverUser2.Id,
                VehicleType = "car",
                VehicleNumber = "XYZ-5678",
                LicenseNumber = "DL-2024-002",
                Status = "available",
                IsVerified = true
            };
            context.Drivers.Add(driver2);
            await context.SaveChangesAsync();
        }

        // Seed Pricing
        if (!await context.DeliveryPricing.AnyAsync())
        {
            context.DeliveryPricing.AddRange(
                new DeliveryPricing { DeliveryType = "next_day", Name = "Next-Day 8am-1pm", BasePrice = 5.99m, IsActive = true, TimeWindowStart = "08:00", TimeWindowEnd = "13:00" },
                new DeliveryPricing { DeliveryType = "next_day", Name = "Next-Day 1pm-4pm", BasePrice = 5.99m, IsActive = true, TimeWindowStart = "13:00", TimeWindowEnd = "16:00" },
                new DeliveryPricing { DeliveryType = "next_day", Name = "Next-Day 4pm-10pm", BasePrice = 5.99m, IsActive = true, TimeWindowStart = "16:00", TimeWindowEnd = "22:00" },
                new DeliveryPricing { DeliveryType = "same_day", Name = "Same-Day Delivery", BasePrice = 9.99m, IsActive = true, CutoffTime = "14:00" },
                new DeliveryPricing { DeliveryType = "priority", Name = "Priority Delivery", BasePrice = 14.99m, IsActive = true },
                new DeliveryPricing { DeliveryType = "scheduled", Name = "Scheduled Bulk ($9 flat)", BasePrice = 9.00m, IsActive = true },
                new DeliveryPricing { DeliveryType = "addon", Name = "Refrigerated Fee", BasePrice = 3.00m, IsActive = true, IsAddon = true }
            );
            await context.SaveChangesAsync();
        }

        // Seed Service Zones
        if (!await context.ServiceZones.AnyAsync())
        {
            context.ServiceZones.AddRange(
                new ServiceZone { Name = "Manhattan", Code = "MAN", ZipCodes = "10001,10002,10003,10004,10005,10006,10007,10010,10011,10012,10013,10014,10016,10017,10018,10019,10020,10021,10022,10023,10024,10025,10026,10027,10028,10029,10030,10031,10032,10033,10034,10035,10036,10037,10038,10039,10040", DeliveryFee = 5.99 },
                new ServiceZone { Name = "Brooklyn", Code = "BK", ZipCodes = "11201,11203,11204,11205,11206,11207,11208,11209,11210,11211,11212,11213,11214,11215,11216,11217,11218,11219,11220,11221,11222,11223,11224,11225,11226,11228,11229,11230,11231,11232,11233,11234,11235,11236,11237,11238,11239", DeliveryFee = 5.99 },
                new ServiceZone { Name = "Queens", Code = "QNS", ZipCodes = "11101,11102,11103,11104,11105,11106,11354,11355,11356,11357,11358,11360,11361,11362,11363,11364,11365,11366,11367,11368,11369,11370,11371,11372,11373,11374,11375,11377,11378,11379,11385,11411,11412,11413,11414,11415,11416,11417,11418,11419,11420,11421,11422,11423,11426,11427,11428,11429,11430,11432,11433,11434,11435,11436", DeliveryFee = 5.99 },
                new ServiceZone { Name = "Bronx", Code = "BX", ZipCodes = "10451,10452,10453,10454,10455,10456,10457,10458,10459,10460,10461,10462,10463,10464,10465,10466,10467,10468,10469,10470,10471,10472,10473,10474,10475", DeliveryFee = 6.99 },
                new ServiceZone { Name = "Staten Island", Code = "SI", ZipCodes = "10301,10302,10303,10304,10305,10306,10307,10308,10309,10310,10311,10312,10314", DeliveryFee = 7.99 }
            );
            await context.SaveChangesAsync();
        }

        // NOTE: Orders and Gigs are NOT seeded - they are created automatically:
        // - Orders are created by pharmacies via the Order Creation flow
        // - Gigs (Route Plans) are auto-created when orders are submitted based on service zone
    }
}

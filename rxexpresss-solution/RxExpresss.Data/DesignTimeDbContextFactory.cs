using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using RxExpresss.Data.Context;

namespace RxExpresss.Data;

/// <summary>
/// Design-time factory for EF Core migrations.
/// Uses SQL Server to ensure migrations are compatible with production.
/// </summary>
public class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();
        
        // Use SQL Server for migration generation to ensure proper column types
        // This is a dummy connection string - you don't need an actual server for migration generation
        optionsBuilder.UseSqlServer(
            "Server=(localdb)\\mssqllocaldb;Database=RxExpresss_Design;Trusted_Connection=True;",
            b => b.MigrationsAssembly("RxExpresss.Data")
        );
        
        return new AppDbContext(optionsBuilder.Options);
    }
}

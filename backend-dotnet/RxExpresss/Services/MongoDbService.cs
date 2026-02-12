using MongoDB.Driver;
using RxExpresss.Models;

namespace RxExpresss.Services;

public class MongoDbService
{
    private readonly IMongoDatabase _database;
    
    public IMongoCollection<User> Users => _database.GetCollection<User>("users");
    public IMongoCollection<Pharmacy> Pharmacies => _database.GetCollection<Pharmacy>("pharmacies");
    public IMongoCollection<DriverProfile> Drivers => _database.GetCollection<DriverProfile>("drivers");
    public IMongoCollection<Order> Orders => _database.GetCollection<Order>("orders");
    public IMongoCollection<DeliveryPricing> Pricing => _database.GetCollection<DeliveryPricing>("delivery_pricing");
    public IMongoCollection<ServiceZone> ServiceZones => _database.GetCollection<ServiceZone>("service_zones");
    
    public MongoDbService(IConfiguration configuration)
    {
        var connectionString = configuration["MongoDb:ConnectionString"] 
            ?? Environment.GetEnvironmentVariable("MONGO_URL") 
            ?? "mongodb://localhost:27017";
        var databaseName = configuration["MongoDb:DatabaseName"] 
            ?? Environment.GetEnvironmentVariable("DB_NAME") 
            ?? "rxexpress_db";
        
        var client = new MongoClient(connectionString);
        _database = client.GetDatabase(databaseName);
        
        // Create indexes
        CreateIndexes();
    }
    
    private void CreateIndexes()
    {
        // Indexes are already created by the Python backend
        // Skip index creation to avoid conflicts
        // The existing indexes work fine with this .NET backend
    }
}

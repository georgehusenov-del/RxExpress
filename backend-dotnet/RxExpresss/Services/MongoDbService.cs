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
        // Users indexes
        var userEmailIndex = Builders<User>.IndexKeys.Ascending(u => u.Email);
        Users.Indexes.CreateOne(new CreateIndexModel<User>(userEmailIndex, new CreateIndexOptions { Unique = true }));
        
        var userIdIndex = Builders<User>.IndexKeys.Ascending(u => u.Id);
        Users.Indexes.CreateOne(new CreateIndexModel<User>(userIdIndex));
        
        // Orders indexes
        var orderIdIndex = Builders<Order>.IndexKeys.Ascending(o => o.Id);
        Orders.Indexes.CreateOne(new CreateIndexModel<Order>(orderIdIndex));
        
        var orderPharmacyIndex = Builders<Order>.IndexKeys.Ascending(o => o.PharmacyId);
        Orders.Indexes.CreateOne(new CreateIndexModel<Order>(orderPharmacyIndex));
        
        var orderStatusIndex = Builders<Order>.IndexKeys.Ascending(o => o.Status);
        Orders.Indexes.CreateOne(new CreateIndexModel<Order>(orderStatusIndex));
        
        // Pharmacies indexes
        var pharmacyIdIndex = Builders<Pharmacy>.IndexKeys.Ascending(p => p.Id);
        Pharmacies.Indexes.CreateOne(new CreateIndexModel<Pharmacy>(pharmacyIdIndex));
        
        // Drivers indexes
        var driverIdIndex = Builders<DriverProfile>.IndexKeys.Ascending(d => d.Id);
        Drivers.Indexes.CreateOne(new CreateIndexModel<DriverProfile>(driverIdIndex));
        
        var driverUserIdIndex = Builders<DriverProfile>.IndexKeys.Ascending(d => d.UserId);
        Drivers.Indexes.CreateOne(new CreateIndexModel<DriverProfile>(driverUserIdIndex));
    }
}

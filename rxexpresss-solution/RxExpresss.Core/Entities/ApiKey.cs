namespace RxExpresss.Core.Entities;

public class ApiKey
{
    public int Id { get; set; }
    public int PharmacyId { get; set; }
    public string Key { get; set; } = Guid.NewGuid().ToString("N"); // 32 char hex
    public string Secret { get; set; } = Guid.NewGuid().ToString("N") + Guid.NewGuid().ToString("N"); // 64 char hex
    public string Name { get; set; } = "Default API Key";
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastUsedAt { get; set; }
    public int RequestCount { get; set; } = 0;
    
    // Navigation
    public Pharmacy Pharmacy { get; set; } = null!;
}

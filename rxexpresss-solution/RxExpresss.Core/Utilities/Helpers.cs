namespace RxExpresss.Core.Utilities;

public static class QrCodeGenerator
{
    private static readonly Dictionary<string, string> BoroughPrefixes = new()
    {
        { "queens", "Q" }, { "brooklyn", "B" }, { "manhattan", "M" },
        { "new york", "M" }, { "staten island", "S" }, { "bronx", "X" }
    };

    public static string Generate(string city)
    {
        var prefix = "X";
        var cityLower = city.ToLower();
        foreach (var kvp in BoroughPrefixes)
        {
            if (cityLower.Contains(kvp.Key)) { prefix = kvp.Value; break; }
        }
        return $"{prefix}{Guid.NewGuid().ToString()[..5].ToUpper()}";
    }
}

public static class AppRoles
{
    public const string Admin = "Admin";
    public const string Pharmacy = "Pharmacy";
    public const string Driver = "Driver";
    public const string Patient = "Patient";
}

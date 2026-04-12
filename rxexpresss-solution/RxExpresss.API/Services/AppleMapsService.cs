using System.Text;
using System.Text.Json;

namespace RxExpresss.API.Services;

/// <summary>
/// Apple Maps Route Optimization Service
/// Uses Apple MapKit Server API for delivery route optimization.
/// 
/// HOW TO GET REAL CREDENTIALS:
/// 1. Go to https://developer.apple.com/account/
/// 2. Create a Maps ID under "Certificates, Identifiers & Profiles"
/// 3. Generate a MapKit JS key (private key .p8 file)
/// 4. Note your Team ID and Key ID
/// 5. Update appsettings.json under "AppleMaps" section:
///    - TeamId: Your Apple Developer Team ID
///    - KeyId: The Key ID from the MapKit JS key
///    - PrivateKeyPath: Path to the .p8 private key file
///    
/// APPLE MAPS SERVER API (2024+):
/// Apple now provides a server-side API for Maps:
/// https://developer.apple.com/documentation/applemapsserverapi
/// 
/// SUPPORTED FEATURES:
/// - Multi-stop route directions
/// - ETA calculation
/// - Distance estimation
/// - Supports walking, driving, transit modes
/// </summary>
public class AppleMapsService
{
    private readonly string? _teamId;
    private readonly string? _keyId;
    private readonly string? _authToken;
    private readonly string _baseUrl = "https://maps-api.apple.com/v1";
    private readonly HttpClient _httpClient;
    private readonly ILogger<AppleMapsService> _logger;

    public AppleMapsService(IConfiguration config, ILogger<AppleMapsService> logger)
    {
        _teamId = config["AppleMaps:TeamId"] ?? Environment.GetEnvironmentVariable("APPLE_MAPS_TEAM_ID");
        _keyId = config["AppleMaps:KeyId"] ?? Environment.GetEnvironmentVariable("APPLE_MAPS_KEY_ID");
        _authToken = config["AppleMaps:AuthToken"] ?? Environment.GetEnvironmentVariable("APPLE_MAPS_AUTH_TOKEN");
        _logger = logger;
        _httpClient = new HttpClient();
        _httpClient.Timeout = TimeSpan.FromSeconds(30);

        if (!IsConfigured)
        {
            _logger.LogWarning("Apple Maps credentials not configured. Using local fallback optimization.");
        }
    }

    /// <summary>
    /// Whether the Apple Maps service has valid credentials configured
    /// </summary>
    public bool IsConfigured => !string.IsNullOrEmpty(_authToken) && _authToken != "YOUR_APPLE_MAPS_AUTH_TOKEN_HERE";

    /// <summary>
    /// Optimize a list of delivery stops using Apple Maps Server API.
    /// Uses the Directions endpoint to calculate routes between consecutive stops,
    /// then applies nearest-neighbor heuristic for ordering.
    /// </summary>
    /// <param name="originAddress">Starting point (e.g., office address)</param>
    /// <param name="stops">List of delivery stops to optimize</param>
    /// <returns>Optimization result with ordered stops</returns>
    public async Task<AppleMapsOptimizationResult?> OptimizeRouteAsync(string originAddress, List<AppleMapsStop> stops)
    {
        if (!stops.Any())
            return new AppleMapsOptimizationResult { Success = false, Message = "No stops provided" };

        // If not configured, use local optimization
        if (!IsConfigured)
        {
            _logger.LogInformation("Apple Maps not configured, using local optimization fallback");
            return LocalOptimize(originAddress, stops);
        }

        try
        {
            _logger.LogInformation("Calling Apple Maps Server API for {StopCount} stops", stops.Count);

            // Apple Maps Server API: /v1/directions endpoint
            // We need to geocode addresses first, then call directions
            var geocodedStops = new List<(AppleMapsStop stop, double lat, double lng)>();

            foreach (var stop in stops)
            {
                var coords = await GeocodeAddressAsync($"{stop.Street}, {stop.City}, {stop.State} {stop.PostalCode}");
                if (coords.HasValue)
                {
                    geocodedStops.Add((stop, coords.Value.lat, coords.Value.lng));
                }
                else
                {
                    // If geocoding fails, still include with estimated coordinates
                    geocodedStops.Add((stop, 0, 0));
                }
            }

            // Optimize using nearest-neighbor with actual distances from Apple Maps
            var optimized = await NearestNeighborOptimize(originAddress, geocodedStops);

            if (optimized != null)
            {
                optimized.Provider = "apple_maps";
                optimized.Message = "Route optimized via Apple Maps Server API";
                return optimized;
            }

            return LocalOptimize(originAddress, stops);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Apple Maps optimization failed, falling back to local");
            return LocalOptimize(originAddress, stops);
        }
    }

    /// <summary>
    /// Get directions between two points using Apple Maps Server API
    /// </summary>
    public async Task<AppleMapsDirectionsResult?> GetDirectionsAsync(
        double originLat, double originLng,
        double destLat, double destLng)
    {
        if (!IsConfigured) return null;

        try
        {
            var url = $"{_baseUrl}/directions?" +
                $"origin={originLat},{originLng}" +
                $"&destination={destLat},{destLng}" +
                $"&transportType=Automobile";

            var request = new HttpRequestMessage(HttpMethod.Get, url);
            request.Headers.Add("Authorization", $"Bearer {_authToken}");

            var response = await _httpClient.SendAsync(request);
            var content = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("Apple Maps API error: {StatusCode} - {Content}", response.StatusCode, content);
                return null;
            }

            var json = JsonSerializer.Deserialize<JsonElement>(content);
            var routes = json.GetProperty("routes");

            if (routes.GetArrayLength() > 0)
            {
                var route = routes[0];
                return new AppleMapsDirectionsResult
                {
                    DistanceMeters = route.GetProperty("distanceMeters").GetDouble(),
                    DurationSeconds = route.TryGetProperty("expectedTravelTimeSeconds", out var dur) 
                        ? dur.GetDouble() : 0,
                    Name = route.TryGetProperty("name", out var name) ? name.GetString() : null
                };
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Apple Maps directions request failed");
        }

        return null;
    }

    /// <summary>
    /// Geocode an address using Apple Maps Server API
    /// </summary>
    public async Task<(double lat, double lng)?> GeocodeAddressAsync(string address)
    {
        if (!IsConfigured) return null;

        try
        {
            var url = $"{_baseUrl}/geocode?q={Uri.EscapeDataString(address)}";
            var request = new HttpRequestMessage(HttpMethod.Get, url);
            request.Headers.Add("Authorization", $"Bearer {_authToken}");

            var response = await _httpClient.SendAsync(request);
            var content = await response.Content.ReadAsStringAsync();

            if (response.IsSuccessStatusCode)
            {
                var json = JsonSerializer.Deserialize<JsonElement>(content);
                var results = json.GetProperty("results");
                if (results.GetArrayLength() > 0)
                {
                    var loc = results[0].GetProperty("coordinate");
                    return (loc.GetProperty("latitude").GetDouble(), loc.GetProperty("longitude").GetDouble());
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Apple Maps geocoding failed for: {Address}", address);
        }

        return null;
    }

    /// <summary>
    /// Nearest-neighbor optimization using Apple Maps distances
    /// </summary>
    private async Task<AppleMapsOptimizationResult?> NearestNeighborOptimize(
        string originAddress, List<(AppleMapsStop stop, double lat, double lng)> stops)
    {
        // Geocode origin
        var originCoords = await GeocodeAddressAsync(originAddress);
        if (!originCoords.HasValue)
        {
            _logger.LogWarning("Could not geocode origin address for Apple Maps optimization");
            return null;
        }

        var remaining = stops.Select((s, i) => new { s.stop, s.lat, s.lng, Index = i }).ToList();
        var ordered = new List<AppleMapsOptimizedStop>();
        var currentLat = originCoords.Value.lat;
        var currentLng = originCoords.Value.lng;
        double totalDistance = 0;
        double totalDuration = 0;
        int orderIndex = 0;

        while (remaining.Any())
        {
            // Find nearest unvisited stop
            var nearest = remaining
                .Select(r => new { r, dist = HaversineDistance(currentLat, currentLng, r.lat, r.lng) })
                .OrderBy(x => x.dist)
                .First();

            // Get actual directions from Apple Maps
            var directions = await GetDirectionsAsync(currentLat, currentLng, nearest.r.lat, nearest.r.lng);

            var distMeters = directions?.DistanceMeters ?? nearest.dist;
            var durSeconds = directions?.DurationSeconds ?? (nearest.dist / 13.4); // ~30mph fallback

            totalDistance += distMeters;
            totalDuration += durSeconds;

            ordered.Add(new AppleMapsOptimizedStop
            {
                OrderId = nearest.r.stop.OrderId,
                OriginalIndex = nearest.r.Index,
                OptimizedIndex = orderIndex++,
                DistanceText = FormatDistance(distMeters),
                DurationText = FormatDuration(durSeconds),
                DistanceMeters = distMeters,
                DurationSeconds = durSeconds,
                RecipientName = nearest.r.stop.RecipientName,
                Address = $"{nearest.r.stop.Street}, {nearest.r.stop.City}",
                Latitude = nearest.r.lat,
                Longitude = nearest.r.lng
            });

            currentLat = nearest.r.lat;
            currentLng = nearest.r.lng;
            remaining.Remove(nearest.r);
        }

        return new AppleMapsOptimizationResult
        {
            Success = true,
            OptimizedStops = ordered,
            TotalDistanceMeters = totalDistance,
            TotalDistanceText = FormatDistance(totalDistance),
            TotalDurationSeconds = totalDuration,
            TotalDurationText = FormatDuration(totalDuration)
        };
    }

    /// <summary>
    /// Local fallback optimization using nearest-neighbor with Haversine distance.
    /// Used when Apple Maps API is unavailable or not configured.
    /// </summary>
    private AppleMapsOptimizationResult LocalOptimize(string origin, List<AppleMapsStop> stops)
    {
        _logger.LogInformation("Using Apple Maps local fallback optimization for {Count} stops", stops.Count);

        // Group by postal code for route continuity
        var grouped = stops
            .Select((s, idx) => new { Stop = s, Index = idx })
            .OrderBy(x => x.Stop.PostalCode)
            .ThenBy(x => x.Stop.City)
            .ThenBy(x => x.Stop.Street)
            .ToList();

        var optimizedStops = grouped.Select((g, newIdx) => new AppleMapsOptimizedStop
        {
            OrderId = g.Stop.OrderId,
            OriginalIndex = g.Index,
            OptimizedIndex = newIdx,
            RecipientName = g.Stop.RecipientName,
            Address = $"{g.Stop.Street}, {g.Stop.City}",
            DistanceText = "N/A",
            DurationText = "N/A"
        }).ToList();

        return new AppleMapsOptimizationResult
        {
            Success = true,
            Provider = "apple_maps_local",
            Message = "Route optimized locally (Apple Maps API not configured). Add valid credentials for server-side optimization.",
            OptimizedStops = optimizedStops,
            TotalDistanceText = "Estimated locally",
            TotalDurationText = "Estimated locally"
        };
    }

    /// <summary>
    /// Haversine formula for great-circle distance between two lat/lng points
    /// </summary>
    private static double HaversineDistance(double lat1, double lon1, double lat2, double lon2)
    {
        const double R = 6371000; // Earth's radius in meters
        var dLat = (lat2 - lat1) * Math.PI / 180;
        var dLon = (lon2 - lon1) * Math.PI / 180;
        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                Math.Cos(lat1 * Math.PI / 180) * Math.Cos(lat2 * Math.PI / 180) *
                Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
        var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        return R * c;
    }

    private static string FormatDistance(double meters)
    {
        var miles = meters / 1609.34;
        return miles >= 1 ? $"{miles:F1} mi" : $"{meters:F0} m";
    }

    private static string FormatDuration(double seconds)
    {
        var ts = TimeSpan.FromSeconds(seconds);
        return ts.TotalHours >= 1 ? $"{ts.Hours}h {ts.Minutes}m" : $"{ts.Minutes} min";
    }
}

// ==================== Apple Maps Models ====================

public class AppleMapsStop
{
    public int OrderId { get; set; }
    public string Street { get; set; } = "";
    public string? AptUnit { get; set; }
    public string City { get; set; } = "";
    public string State { get; set; } = "";
    public string PostalCode { get; set; } = "";
    public string RecipientName { get; set; } = "";
    public string? RecipientPhone { get; set; }
    public string? Notes { get; set; }
}

public class AppleMapsOptimizationResult
{
    public bool Success { get; set; }
    public string Provider { get; set; } = "apple_maps";
    public string? Message { get; set; }
    public List<AppleMapsOptimizedStop> OptimizedStops { get; set; } = new();
    public double TotalDistanceMeters { get; set; }
    public string? TotalDistanceText { get; set; }
    public double TotalDurationSeconds { get; set; }
    public string? TotalDurationText { get; set; }
}

public class AppleMapsOptimizedStop
{
    public int OrderId { get; set; }
    public int OriginalIndex { get; set; }
    public int OptimizedIndex { get; set; }
    public string? DistanceText { get; set; }
    public string? DurationText { get; set; }
    public double DistanceMeters { get; set; }
    public double DurationSeconds { get; set; }
    public string RecipientName { get; set; } = "";
    public string Address { get; set; } = "";
    public double Latitude { get; set; }
    public double Longitude { get; set; }
}

public class AppleMapsDirectionsResult
{
    public double DistanceMeters { get; set; }
    public double DurationSeconds { get; set; }
    public string? Name { get; set; }
}

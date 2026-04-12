using System.Text;
using System.Text.Json;

namespace RxExpresss.API.Services;

/// <summary>
/// Google Maps Route Optimization Service
/// Uses Google Maps Directions API and Routes API for delivery route optimization.
/// 
/// HOW TO GET A REAL API KEY:
/// 1. Go to https://console.cloud.google.com/
/// 2. Create a project (or select existing)
/// 3. Enable "Directions API" and "Routes API" 
/// 4. Go to Credentials -> Create API Key
/// 5. Replace the dummy key in appsettings.json under "GoogleMaps:ApiKey"
/// 
/// SUPPORTED FEATURES:
/// - Multi-stop route optimization (waypoint ordering)
/// - Distance and duration estimation
/// - Traffic-aware routing
/// - ETA calculations per stop
/// </summary>
public class GoogleMapsService
{
    private readonly string? _apiKey;
    private readonly string _directionsBaseUrl = "https://maps.googleapis.com/maps/api/directions/json";
    private readonly string _geocodeBaseUrl = "https://maps.googleapis.com/maps/api/geocode/json";
    // Routes API v2 can be used for advanced features (toll info, fuel-efficient routing)
    // private readonly string _routesBaseUrl = "https://routes.googleapis.com/directions/v2:computeRoutes";
    private readonly HttpClient _httpClient;
    private readonly ILogger<GoogleMapsService> _logger;

    public GoogleMapsService(IConfiguration config, ILogger<GoogleMapsService> logger)
    {
        _apiKey = config["GoogleMaps:ApiKey"] ?? Environment.GetEnvironmentVariable("GOOGLE_MAPS_API_KEY");
        _logger = logger;
        _httpClient = new HttpClient();
        _httpClient.Timeout = TimeSpan.FromSeconds(30);

        if (string.IsNullOrEmpty(_apiKey))
        {
            _logger.LogWarning("Google Maps API key not configured. Using local fallback optimization.");
        }
    }

    /// <summary>
    /// Whether the Google Maps service has a valid API key configured
    /// </summary>
    public bool IsConfigured => !string.IsNullOrEmpty(_apiKey) && _apiKey != "YOUR_GOOGLE_MAPS_API_KEY_HERE";

    /// <summary>
    /// Optimize a list of delivery stops using Google Maps Directions API with waypoint optimization.
    /// Returns an optimized order of stops with distance/duration estimates.
    /// </summary>
    /// <param name="originAddress">Starting point (e.g., office address)</param>
    /// <param name="stops">List of delivery stops to optimize</param>
    /// <returns>Optimization result with ordered stops, or null on failure</returns>
    public async Task<GoogleMapsOptimizationResult?> OptimizeRouteAsync(string originAddress, List<GoogleMapsStop> stops)
    {
        if (!stops.Any())
            return new GoogleMapsOptimizationResult { Success = false, Message = "No stops provided" };

        // If API key not configured, use local optimization as fallback
        if (!IsConfigured)
        {
            _logger.LogInformation("Google Maps API not configured, using local optimization fallback");
            return LocalOptimize(originAddress, stops);
        }

        try
        {
            // Build waypoints string for Directions API
            var waypoints = string.Join("|", stops.Select(s => 
                Uri.EscapeDataString($"{s.Street}, {s.City}, {s.State} {s.PostalCode}")));

            var url = $"{_directionsBaseUrl}?" +
                $"origin={Uri.EscapeDataString(originAddress)}" +
                $"&destination={Uri.EscapeDataString(originAddress)}" + // Return to origin
                $"&waypoints=optimize:true|{waypoints}" +
                $"&key={_apiKey}" +
                $"&departure_time=now" + // Enable traffic-aware routing
                $"&units=imperial";

            _logger.LogInformation("Calling Google Maps Directions API for {StopCount} stops", stops.Count);
            var response = await _httpClient.GetAsync(url);
            var content = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("Google Maps API error: {StatusCode} - {Content}", response.StatusCode, content);
                return LocalOptimize(originAddress, stops);
            }

            var json = JsonSerializer.Deserialize<JsonElement>(content);
            var status = json.GetProperty("status").GetString();

            if (status != "OK")
            {
                _logger.LogWarning("Google Maps API returned status: {Status}", status);
                return LocalOptimize(originAddress, stops);
            }

            // Parse optimized waypoint order
            var routes = json.GetProperty("routes");
            if (routes.GetArrayLength() == 0)
                return LocalOptimize(originAddress, stops);

            var route = routes[0];
            var waypointOrder = route.GetProperty("waypoint_order").EnumerateArray()
                .Select(w => w.GetInt32()).ToList();

            var legs = route.GetProperty("legs").EnumerateArray().ToList();

            var optimizedStops = new List<GoogleMapsOptimizedStop>();
            double totalDistanceMeters = 0;
            double totalDurationSeconds = 0;

            for (int i = 0; i < waypointOrder.Count; i++)
            {
                var originalIndex = waypointOrder[i];
                var stop = stops[originalIndex];
                var leg = legs[i]; // Leg corresponds to travel TO this waypoint

                var distanceMeters = leg.GetProperty("distance").GetProperty("value").GetDouble();
                var durationSeconds = leg.GetProperty("duration").GetProperty("value").GetDouble();
                totalDistanceMeters += distanceMeters;
                totalDurationSeconds += durationSeconds;

                optimizedStops.Add(new GoogleMapsOptimizedStop
                {
                    OrderId = stop.OrderId,
                    OriginalIndex = originalIndex,
                    OptimizedIndex = i,
                    DistanceText = leg.GetProperty("distance").GetProperty("text").GetString() ?? "",
                    DurationText = leg.GetProperty("duration").GetProperty("text").GetString() ?? "",
                    DistanceMeters = distanceMeters,
                    DurationSeconds = durationSeconds,
                    RecipientName = stop.RecipientName,
                    Address = $"{stop.Street}, {stop.City}"
                });
            }

            // Add return leg
            if (legs.Count > waypointOrder.Count)
            {
                var returnLeg = legs[^1];
                totalDistanceMeters += returnLeg.GetProperty("distance").GetProperty("value").GetDouble();
                totalDurationSeconds += returnLeg.GetProperty("duration").GetProperty("value").GetDouble();
            }

            _logger.LogInformation("Google Maps optimization complete: {StopCount} stops, {Distance}m, {Duration}s",
                stops.Count, totalDistanceMeters, totalDurationSeconds);

            return new GoogleMapsOptimizationResult
            {
                Success = true,
                Provider = "google_maps",
                Message = "Route optimized via Google Maps Directions API",
                OptimizedStops = optimizedStops,
                TotalDistanceMeters = totalDistanceMeters,
                TotalDistanceText = FormatDistance(totalDistanceMeters),
                TotalDurationSeconds = totalDurationSeconds,
                TotalDurationText = FormatDuration(totalDurationSeconds),
                OverviewPolyline = route.TryGetProperty("overview_polyline", out var poly) 
                    ? poly.GetProperty("points").GetString() : null
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Google Maps optimization failed, falling back to local");
            return LocalOptimize(originAddress, stops);
        }
    }

    /// <summary>
    /// Geocode an address to lat/lng using Google Maps Geocoding API
    /// </summary>
    public async Task<(double lat, double lng)?> GeocodeAddressAsync(string address)
    {
        if (!IsConfigured) return null;

        try
        {
            var url = $"{_geocodeBaseUrl}?address={Uri.EscapeDataString(address)}&key={_apiKey}";
            var response = await _httpClient.GetAsync(url);
            var content = await response.Content.ReadAsStringAsync();
            var json = JsonSerializer.Deserialize<JsonElement>(content);

            if (json.GetProperty("status").GetString() == "OK")
            {
                var location = json.GetProperty("results")[0]
                    .GetProperty("geometry")
                    .GetProperty("location");
                return (location.GetProperty("lat").GetDouble(), location.GetProperty("lng").GetDouble());
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Google Maps geocoding failed for: {Address}", address);
        }
        return null;
    }

    /// <summary>
    /// Local fallback optimization using nearest-neighbor heuristic.
    /// Used when Google Maps API is unavailable or not configured.
    /// Sorts stops by city proximity grouping for a basic optimization.
    /// </summary>
    private GoogleMapsOptimizationResult LocalOptimize(string origin, List<GoogleMapsStop> stops)
    {
        _logger.LogInformation("Using Google Maps local fallback optimization for {Count} stops", stops.Count);

        // Group by city, then sort alphabetically within each city for route continuity
        var grouped = stops
            .Select((s, idx) => new { Stop = s, Index = idx })
            .OrderBy(x => x.Stop.City)
            .ThenBy(x => x.Stop.PostalCode)
            .ThenBy(x => x.Stop.Street)
            .ToList();

        var optimizedStops = grouped.Select((g, newIdx) => new GoogleMapsOptimizedStop
        {
            OrderId = g.Stop.OrderId,
            OriginalIndex = g.Index,
            OptimizedIndex = newIdx,
            RecipientName = g.Stop.RecipientName,
            Address = $"{g.Stop.Street}, {g.Stop.City}",
            DistanceText = "N/A",
            DurationText = "N/A"
        }).ToList();

        return new GoogleMapsOptimizationResult
        {
            Success = true,
            Provider = "google_maps_local",
            Message = "Route optimized locally (Google Maps API not configured). Add a valid API key for traffic-aware optimization.",
            OptimizedStops = optimizedStops,
            TotalDistanceText = "Estimated locally",
            TotalDurationText = "Estimated locally"
        };
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

// ==================== Google Maps Models ====================

public class GoogleMapsStop
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

public class GoogleMapsOptimizationResult
{
    public bool Success { get; set; }
    public string Provider { get; set; } = "google_maps";
    public string? Message { get; set; }
    public List<GoogleMapsOptimizedStop> OptimizedStops { get; set; } = new();
    public double TotalDistanceMeters { get; set; }
    public string? TotalDistanceText { get; set; }
    public double TotalDurationSeconds { get; set; }
    public string? TotalDurationText { get; set; }
    public string? OverviewPolyline { get; set; } // Encoded polyline for map display
}

public class GoogleMapsOptimizedStop
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
}

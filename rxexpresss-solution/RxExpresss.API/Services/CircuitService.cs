using System.Text;
using System.Text.Json;

namespace RxExpresss.API.Services;

/// <summary>
/// Service for interacting with Circuit/Spoke API for route optimization and tracking
/// </summary>
public class CircuitService
{
    private readonly string? _apiKey;
    private readonly string _baseUrl = "https://api.getcircuit.com/public/v0.2b";
    private readonly HttpClient _httpClient;
    private readonly ILogger<CircuitService> _logger;

    public CircuitService(IConfiguration config, ILogger<CircuitService> logger)
    {
        _apiKey = config["Circuit:ApiKey"] ?? Environment.GetEnvironmentVariable("CIRCUIT_API_KEY");
        _logger = logger;
        _httpClient = new HttpClient();
        
        if (string.IsNullOrEmpty(_apiKey))
        {
            _logger.LogWarning("Circuit API key not configured");
        }
    }

    public bool IsConfigured => !string.IsNullOrEmpty(_apiKey);

    /// <summary>
    /// Create a driver in Circuit
    /// </summary>
    public async Task<CircuitDriverResult?> CreateDriverAsync(string name, string email, string? phone = null)
    {
        if (!IsConfigured) return null;

        var payload = new
        {
            name,
            email,
            phone,
            active = true
        };

        try
        {
            var response = await MakeRequestAsync("POST", "/drivers", payload);
            if (response.HasValue)
            {
                return new CircuitDriverResult
                {
                    Success = true,
                    DriverId = response.Value.GetProperty("id").GetString(),
                    Message = "Driver created in Circuit"
                };
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create driver in Circuit");
        }

        return new CircuitDriverResult { Success = false, Message = "Failed to create driver" };
    }

    /// <summary>
    /// Create a plan (route) in Circuit
    /// </summary>
    public async Task<CircuitPlanResult?> CreatePlanAsync(string title, string date, List<string>? driverIds = null)
    {
        if (!IsConfigured) return null;

        var payload = new
        {
            title,
            starts = new { day = date },
            drivers = driverIds ?? new List<string>()
        };

        try
        {
            var response = await MakeRequestAsync("POST", "/plans", payload);
            if (response.HasValue)
            {
                return new CircuitPlanResult
                {
                    Success = true,
                    PlanId = response.Value.GetProperty("id").GetString(),
                    Message = "Plan created in Circuit"
                };
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create plan in Circuit");
        }

        return new CircuitPlanResult { Success = false, Message = "Failed to create plan" };
    }

    /// <summary>
    /// Add stops to a plan
    /// </summary>
    public async Task<bool> AddStopsAsync(string planId, List<CircuitStop> stops)
    {
        if (!IsConfigured || string.IsNullOrEmpty(planId)) return false;

        try
        {
            foreach (var stop in stops)
            {
                var payload = new
                {
                    address = new
                    {
                        addressLineOne = stop.Street,
                        addressLineTwo = stop.AptUnit,
                        city = stop.City,
                        state = stop.State,
                        zip = stop.PostalCode,
                        country = "US"
                    },
                    recipient = new
                    {
                        name = stop.RecipientName,
                        phone = stop.RecipientPhone,
                        externalId = stop.OrderId.ToString()
                    },
                    notes = stop.Notes,
                    packageCount = 1,
                    activity = "delivery"
                };

                await MakeRequestAsync("POST", $"/plans/{planId}/stops", payload);
            }
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to add stops to Circuit plan");
            return false;
        }
    }

    /// <summary>
    /// Optimize a plan
    /// </summary>
    public async Task<bool> OptimizePlanAsync(string planId)
    {
        if (!IsConfigured || string.IsNullOrEmpty(planId)) return false;

        try
        {
            await MakeRequestAsync("POST", $"/plans/{planId}/optimize", new { });
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to optimize Circuit plan");
            return false;
        }
    }

    /// <summary>
    /// Get tracking URL for a stop
    /// </summary>
    public string GetTrackingUrl(string stopId)
    {
        return $"https://track.getcircuit.com/{stopId}";
    }

    /// <summary>
    /// Get plan details
    /// </summary>
    public async Task<JsonElement?> GetPlanAsync(string planId)
    {
        if (!IsConfigured || string.IsNullOrEmpty(planId)) return null;

        try
        {
            return await MakeRequestAsync("GET", $"/plans/{planId}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get Circuit plan");
            return null;
        }
    }

    private async Task<JsonElement?> MakeRequestAsync(string method, string endpoint, object? payload = null)
    {
        var request = new HttpRequestMessage(new HttpMethod(method), $"{_baseUrl}{endpoint}");
        request.Headers.Add("Authorization", $"Bearer {_apiKey}");

        if (payload != null)
        {
            var json = JsonSerializer.Serialize(payload);
            request.Content = new StringContent(json, Encoding.UTF8, "application/json");
        }

        var response = await _httpClient.SendAsync(request);
        
        if (!response.IsSuccessStatusCode)
        {
            var errorContent = await response.Content.ReadAsStringAsync();
            _logger.LogError("Circuit API error: {StatusCode} - {Content}", response.StatusCode, errorContent);
            return null;
        }

        var content = await response.Content.ReadAsStringAsync();
        if (string.IsNullOrEmpty(content)) return null;
        
        return JsonSerializer.Deserialize<JsonElement>(content);
    }
}

public class CircuitDriverResult
{
    public bool Success { get; set; }
    public string? DriverId { get; set; }
    public string? Message { get; set; }
}

public class CircuitPlanResult
{
    public bool Success { get; set; }
    public string? PlanId { get; set; }
    public string? Message { get; set; }
}

public class CircuitStop
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

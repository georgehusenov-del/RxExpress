using System.ComponentModel.DataAnnotations;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RxExpresss.API.Services;
using RxExpresss.Core.Utilities;

namespace RxExpresss.API.Controllers;

/// <summary>
/// Initial Jarvis management API. Admin-only and intentionally read-only.
/// It must not run model-proposed commands or mutate delivery records.
/// </summary>
[ApiController]
[Route("api/jarvis")]
[Authorize(Roles = AppRoles.Admin)]
public sealed class JarvisController : ControllerBase
{
    private readonly JarvisReadService _read;
    private readonly ILogger<JarvisController> _logger;

    public JarvisController(JarvisReadService read, ILogger<JarvisController> logger)
    {
        _read = read;
        _logger = logger;
    }

    [HttpGet("overview")]
    public async Task<IActionResult> Overview(CancellationToken cancellationToken)
        => Ok(await _read.OverviewAsync(cancellationToken));

    [HttpGet("unassigned")]
    public async Task<IActionResult> Unassigned([FromQuery] int limit = 20,
        CancellationToken cancellationToken = default)
        => Ok(await _read.UnassignedQueueAsync(limit, cancellationToken));

    [HttpGet("drivers")]
    public async Task<IActionResult> Drivers(CancellationToken cancellationToken)
        => Ok(await _read.DriverAvailabilityAsync(cancellationToken));

    /// <summary>
    /// This is a deterministic command PREVIEW, not an LLM and not an executor.
    /// All action requests are refused until the audited action gateway exists.
    /// No raw command text is logged because it may contain protected information.
    /// </summary>
    [HttpPost("commands/preview")]
    public async Task<IActionResult> Preview(
        [FromBody] JarvisPreviewRequest request,
        CancellationToken cancellationToken)
    {
        var command = request.Command.Trim();
        string intent;
        object? data = null;
        string message;

        if (Regex.IsMatch(command,
            @"\b(assign|reassign|reroute|dispatch|send|delete|cancel|complete|update|change|override|activate|autopilot|take over|execute|start|stop|refund)\b",
            RegexOptions.IgnoreCase, TimeSpan.FromMilliseconds(150)))
        {
            intent = "requested_action";
            message = "No action executed. Jarvis action permissions, policy validation, durable audit, and approval controls are not enabled yet.";
        }
        else if (command.Contains("unassigned", StringComparison.OrdinalIgnoreCase))
        {
            intent = "view_unassigned";
            data = await _read.UnassignedQueueAsync(20, cancellationToken);
            message = "Showing the oldest unassigned orders (without patient information).";
        }
        else if (command.Contains("driver", StringComparison.OrdinalIgnoreCase))
        {
            intent = "view_driver_availability";
            data = await _read.DriverAvailabilityAsync(cancellationToken);
            message = "Showing driver availability; this does not mean they are eligible for an assignment.";
        }
        else if (command.Contains("overview", StringComparison.OrdinalIgnoreCase) ||
                 command.Contains("status", StringComparison.OrdinalIgnoreCase) ||
                 command.Contains("today", StringComparison.OrdinalIgnoreCase) ||
                 command.Contains("how are", StringComparison.OrdinalIgnoreCase))
        {
            intent = "view_overview";
            data = await _read.OverviewAsync(cancellationToken);
            message = "Here is the current RX Express operational overview.";
        }
        else
        {
            intent = "unsupported";
            message = "I can currently show the overview, unassigned orders, or driver availability. More Jarvis capabilities are being built.";
        }

        _logger.LogInformation("Jarvis preview intent {Intent}; no actions executed", intent);
        return Ok(new
        {
            intent,
            executed = false,
            mode = "observe_only",
            message,
            data
        });
    }
}

public sealed class JarvisPreviewRequest
{
    [Required]
    [StringLength(500, MinimumLength = 1)]
    public string Command { get; set; } = string.Empty;
}

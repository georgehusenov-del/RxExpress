using System.Globalization;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RxExpresss.Core.Entities;
using RxExpresss.Core.Interfaces;
using RxExpresss.Core.Utilities;

namespace RxExpresss.API.Controllers;

/// <summary>
/// Reports API — Admin & Pharmacy reporting with from/to, monthly, pharmacy and driver filters.
/// All Order queries use .Select() projections to avoid loading columns that may not
/// exist on production databases (schema drift safeguard).
/// </summary>
[ApiController]
[Authorize]
public class ReportsController : ControllerBase
{
    private readonly IRepository<Order> _orders;
    private readonly IRepository<Pharmacy> _pharmacies;
    private readonly IRepository<DriverProfile> _drivers;
    private readonly UserManager<ApplicationUser> _userManager;

    public ReportsController(
        IRepository<Order> orders,
        IRepository<Pharmacy> pharmacies,
        IRepository<DriverProfile> drivers,
        UserManager<ApplicationUser> userManager)
    {
        _orders = orders;
        _pharmacies = pharmacies;
        _drivers = drivers;
        _userManager = userManager;
    }

    // ───────────────────────── Shared DTO ─────────────────────────

    private class OrderRow
    {
        public int Id { get; set; }
        public string OrderNumber { get; set; } = "";
        public int PharmacyId { get; set; }
        public string? PharmacyName { get; set; }
        public int? DriverId { get; set; }
        public string? DriverName { get; set; }
        public string DeliveryType { get; set; } = "";
        public string Status { get; set; } = "";
        public decimal DeliveryFee { get; set; }
        public decimal CopayAmount { get; set; }
        public bool CopayCollected { get; set; }
        public string City { get; set; } = "";
        public string? QrCode { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? ActualDeliveryTime { get; set; }
    }

    private IQueryable<OrderRow> BaseOrderRows() => _orders.Query().Select(o => new OrderRow
    {
        Id = o.Id,
        OrderNumber = o.OrderNumber,
        PharmacyId = o.PharmacyId,
        PharmacyName = o.PharmacyName,
        DriverId = o.DriverId,
        DriverName = o.DriverName,
        DeliveryType = o.DeliveryType,
        Status = o.Status,
        DeliveryFee = o.DeliveryFee,
        CopayAmount = o.CopayAmount,
        CopayCollected = o.CopayCollected,
        City = o.City,
        QrCode = o.QrCode,
        CreatedAt = o.CreatedAt,
        ActualDeliveryTime = o.ActualDeliveryTime
    });

    private static (DateTime fromUtc, DateTime toUtc) ResolveRange(string? from, string? to)
    {
        var toDate = string.IsNullOrWhiteSpace(to)
            ? DateTime.UtcNow.Date
            : DateTime.Parse(to!, CultureInfo.InvariantCulture).Date;
        var fromDate = string.IsNullOrWhiteSpace(from)
            ? toDate.AddDays(-29)
            : DateTime.Parse(from!, CultureInfo.InvariantCulture).Date;
        // Inclusive range: [from 00:00, to+1 00:00)
        return (DateTime.SpecifyKind(fromDate, DateTimeKind.Utc),
                DateTime.SpecifyKind(toDate.AddDays(1), DateTimeKind.Utc));
    }

    private static IQueryable<OrderRow> ApplyFilters(
        IQueryable<OrderRow> q,
        DateTime fromUtc, DateTime toUtc,
        int? pharmacyId, int? driverId, string? status)
    {
        q = q.Where(o => o.CreatedAt >= fromUtc && o.CreatedAt < toUtc);
        if (pharmacyId.HasValue) q = q.Where(o => o.PharmacyId == pharmacyId.Value);
        if (driverId.HasValue) q = q.Where(o => o.DriverId == driverId.Value);
        if (!string.IsNullOrWhiteSpace(status)) q = q.Where(o => o.Status == status);
        return q;
    }

    private static object BuildSummary(List<OrderRow> rows, DateTime fromUtc, DateTime toUtc)
    {
        var delivered = rows.Where(o => o.Status == "delivered").ToList();
        var failed = rows.Where(o => o.Status == "failed").ToList();
        var cancelled = rows.Where(o => o.Status == "cancelled").ToList();
        var pending = rows.Where(o =>
            o.Status != "delivered" && o.Status != "failed" && o.Status != "cancelled").ToList();

        var avgDeliveryMin = delivered
            .Where(o => o.ActualDeliveryTime.HasValue)
            .Select(o => (o.ActualDeliveryTime!.Value - o.CreatedAt).TotalMinutes)
            .DefaultIfEmpty(0).Average();

        var statusBreakdown = rows.GroupBy(o => o.Status)
            .ToDictionary(g => g.Key, g => g.Count());

        var typeBreakdown = rows.GroupBy(o => o.DeliveryType)
            .ToDictionary(g => g.Key, g => g.Count());

        var boroughBreakdown = rows
            .Where(o => !string.IsNullOrEmpty(o.QrCode))
            .GroupBy(o => o.QrCode![0].ToString())
            .ToDictionary(g => g.Key, g => g.Count());

        return new
        {
            range = new { from = fromUtc, to = toUtc.AddDays(-0) },
            totals = new
            {
                total = rows.Count,
                delivered = delivered.Count,
                failed = failed.Count,
                cancelled = cancelled.Count,
                pending = pending.Count,
                deliveredRate = rows.Count == 0 ? 0 : Math.Round(100.0 * delivered.Count / rows.Count, 1),
                failedRate = rows.Count == 0 ? 0 : Math.Round(100.0 * failed.Count / rows.Count, 1)
            },
            revenue = new
            {
                deliveryFees = Math.Round(rows.Sum(o => o.DeliveryFee), 2),
                deliveredFees = Math.Round(delivered.Sum(o => o.DeliveryFee), 2),
                copayCollected = Math.Round(rows.Where(o => o.CopayCollected).Sum(o => o.CopayAmount), 2),
                copayPending = Math.Round(rows.Where(o => !o.CopayCollected && o.Status != "cancelled" && o.CopayAmount > 0).Sum(o => o.CopayAmount), 2)
            },
            performance = new
            {
                avgDeliveryMinutes = Math.Round(avgDeliveryMin, 1)
            },
            statusBreakdown,
            typeBreakdown,
            boroughBreakdown
        };
    }

    private static List<object> BuildMonthly(List<OrderRow> rows)
    {
        return rows
            .GroupBy(o => new { o.CreatedAt.Year, o.CreatedAt.Month })
            .OrderBy(g => g.Key.Year).ThenBy(g => g.Key.Month)
            .Select(g => (object)new
            {
                year = g.Key.Year,
                month = g.Key.Month,
                label = new DateTime(g.Key.Year, g.Key.Month, 1).ToString("MMM yyyy", CultureInfo.InvariantCulture),
                total = g.Count(),
                delivered = g.Count(o => o.Status == "delivered"),
                failed = g.Count(o => o.Status == "failed"),
                cancelled = g.Count(o => o.Status == "cancelled"),
                revenue = Math.Round(g.Sum(o => o.DeliveryFee), 2),
                copayCollected = Math.Round(g.Where(o => o.CopayCollected).Sum(o => o.CopayAmount), 2)
            })
            .ToList();
    }

    private static string ToCsv(IEnumerable<OrderRow> rows)
    {
        var sb = new StringBuilder();
        sb.AppendLine("OrderNumber,Status,DeliveryType,Pharmacy,Driver,City,CopayAmount,CopayCollected,DeliveryFee,CreatedAt,DeliveredAt,DeliveryMinutes");
        foreach (var r in rows)
        {
            var mins = r.ActualDeliveryTime.HasValue
                ? ((int)(r.ActualDeliveryTime.Value - r.CreatedAt).TotalMinutes).ToString()
                : "";
            sb.Append(Csv(r.OrderNumber)).Append(',')
              .Append(Csv(r.Status)).Append(',')
              .Append(Csv(r.DeliveryType)).Append(',')
              .Append(Csv(r.PharmacyName ?? "")).Append(',')
              .Append(Csv(r.DriverName ?? "")).Append(',')
              .Append(Csv(r.City)).Append(',')
              .Append(r.CopayAmount.ToString(CultureInfo.InvariantCulture)).Append(',')
              .Append(r.CopayCollected ? "yes" : "no").Append(',')
              .Append(r.DeliveryFee.ToString(CultureInfo.InvariantCulture)).Append(',')
              .Append(r.CreatedAt.ToString("o")).Append(',')
              .Append(r.ActualDeliveryTime?.ToString("o") ?? "").Append(',')
              .AppendLine(mins);
        }
        return sb.ToString();
    }

    private static string Csv(string s)
    {
        if (s == null) return "";
        if (s.Contains(',') || s.Contains('"') || s.Contains('\n'))
            return "\"" + s.Replace("\"", "\"\"") + "\"";
        return s;
    }

    // ───────────────────────── Admin Reports ─────────────────────────

    [HttpGet("api/admin/reports/summary")]
    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.Manager},{AppRoles.Operator}")]
    public async Task<IActionResult> AdminSummary(
        [FromQuery] string? from, [FromQuery] string? to,
        [FromQuery] int? pharmacyId, [FromQuery] int? driverId, [FromQuery] string? status)
    {
        var (f, t) = ResolveRange(from, to);
        var rows = await ApplyFilters(BaseOrderRows(), f, t, pharmacyId, driverId, status).ToListAsync();
        return Ok(BuildSummary(rows, f, t));
    }

    [HttpGet("api/admin/reports/monthly")]
    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.Manager},{AppRoles.Operator}")]
    public async Task<IActionResult> AdminMonthly(
        [FromQuery] string? from, [FromQuery] string? to,
        [FromQuery] int? pharmacyId, [FromQuery] int? driverId, [FromQuery] string? status)
    {
        var (f, t) = ResolveRange(from, to);
        var rows = await ApplyFilters(BaseOrderRows(), f, t, pharmacyId, driverId, status).ToListAsync();
        return Ok(new { months = BuildMonthly(rows) });
    }

    [HttpGet("api/admin/reports/by-pharmacy")]
    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.Manager},{AppRoles.Operator}")]
    public async Task<IActionResult> AdminByPharmacy(
        [FromQuery] string? from, [FromQuery] string? to,
        [FromQuery] int? driverId, [FromQuery] string? status)
    {
        var (f, t) = ResolveRange(from, to);
        var rows = await ApplyFilters(BaseOrderRows(), f, t, null, driverId, status).ToListAsync();

        var result = rows
            .GroupBy(o => new { o.PharmacyId, o.PharmacyName })
            .OrderByDescending(g => g.Count())
            .Select(g => new
            {
                pharmacyId = g.Key.PharmacyId,
                pharmacyName = g.Key.PharmacyName ?? "(Unknown)",
                total = g.Count(),
                delivered = g.Count(o => o.Status == "delivered"),
                failed = g.Count(o => o.Status == "failed"),
                cancelled = g.Count(o => o.Status == "cancelled"),
                revenue = Math.Round(g.Sum(o => o.DeliveryFee), 2),
                copayCollected = Math.Round(g.Where(o => o.CopayCollected).Sum(o => o.CopayAmount), 2)
            })
            .ToList();
        return Ok(new { pharmacies = result });
    }

    [HttpGet("api/admin/reports/by-driver")]
    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.Manager},{AppRoles.Operator}")]
    public async Task<IActionResult> AdminByDriver(
        [FromQuery] string? from, [FromQuery] string? to,
        [FromQuery] int? pharmacyId, [FromQuery] string? status)
    {
        var (f, t) = ResolveRange(from, to);
        var rows = await ApplyFilters(BaseOrderRows(), f, t, pharmacyId, null, status)
            .Where(o => o.DriverId != null).ToListAsync();

        var result = rows
            .GroupBy(o => new { o.DriverId, o.DriverName })
            .OrderByDescending(g => g.Count(o => o.Status == "delivered"))
            .Select(g =>
            {
                var delivered = g.Where(o => o.Status == "delivered" && o.ActualDeliveryTime.HasValue).ToList();
                var avg = delivered.Count == 0 ? 0 :
                    delivered.Average(o => (o.ActualDeliveryTime!.Value - o.CreatedAt).TotalMinutes);
                return new
                {
                    driverId = g.Key.DriverId,
                    driverName = g.Key.DriverName ?? "(Unassigned)",
                    total = g.Count(),
                    delivered = g.Count(o => o.Status == "delivered"),
                    failed = g.Count(o => o.Status == "failed"),
                    avgDeliveryMinutes = Math.Round(avg, 1),
                    successRate = g.Count() == 0 ? 0 : Math.Round(100.0 * g.Count(o => o.Status == "delivered") / g.Count(), 1)
                };
            })
            .ToList();
        return Ok(new { drivers = result });
    }

    [HttpGet("api/admin/reports/export")]
    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.Manager},{AppRoles.Operator}")]
    public async Task<IActionResult> AdminExport(
        [FromQuery] string? from, [FromQuery] string? to,
        [FromQuery] int? pharmacyId, [FromQuery] int? driverId, [FromQuery] string? status)
    {
        var (f, t) = ResolveRange(from, to);
        var rows = await ApplyFilters(BaseOrderRows(), f, t, pharmacyId, driverId, status)
            .OrderByDescending(o => o.CreatedAt).ToListAsync();
        var csv = ToCsv(rows);
        var fileName = $"rxexpresss-report-{DateTime.UtcNow:yyyyMMdd-HHmmss}.csv";
        return File(Encoding.UTF8.GetBytes(csv), "text/csv", fileName);
    }

    // ───────────────────────── Pharmacy Reports ─────────────────────────

    private async Task<int?> GetCurrentPharmacyIdAsync()
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst("sub")?.Value;
        if (string.IsNullOrEmpty(userId)) return null;
        var pharmacy = await _pharmacies.Query().FirstOrDefaultAsync(p => p.UserId == userId);
        return pharmacy?.Id;
    }

    [HttpGet("api/pharmacies/reports/summary")]
    [Authorize(Roles = AppRoles.Pharmacy)]
    public async Task<IActionResult> PharmacySummary(
        [FromQuery] string? from, [FromQuery] string? to,
        [FromQuery] int? driverId, [FromQuery] string? status)
    {
        var pid = await GetCurrentPharmacyIdAsync();
        if (pid == null) return NotFound(new { detail = "Pharmacy not found" });

        var (f, t) = ResolveRange(from, to);
        var rows = await ApplyFilters(BaseOrderRows(), f, t, pid, driverId, status).ToListAsync();
        return Ok(BuildSummary(rows, f, t));
    }

    [HttpGet("api/pharmacies/reports/monthly")]
    [Authorize(Roles = AppRoles.Pharmacy)]
    public async Task<IActionResult> PharmacyMonthly(
        [FromQuery] string? from, [FromQuery] string? to,
        [FromQuery] int? driverId, [FromQuery] string? status)
    {
        var pid = await GetCurrentPharmacyIdAsync();
        if (pid == null) return NotFound(new { detail = "Pharmacy not found" });

        var (f, t) = ResolveRange(from, to);
        var rows = await ApplyFilters(BaseOrderRows(), f, t, pid, driverId, status).ToListAsync();
        return Ok(new { months = BuildMonthly(rows) });
    }

    [HttpGet("api/pharmacies/reports/by-driver")]
    [Authorize(Roles = AppRoles.Pharmacy)]
    public async Task<IActionResult> PharmacyByDriver(
        [FromQuery] string? from, [FromQuery] string? to, [FromQuery] string? status)
    {
        var pid = await GetCurrentPharmacyIdAsync();
        if (pid == null) return NotFound(new { detail = "Pharmacy not found" });

        var (f, t) = ResolveRange(from, to);
        var rows = await ApplyFilters(BaseOrderRows(), f, t, pid, null, status)
            .Where(o => o.DriverId != null).ToListAsync();

        var result = rows
            .GroupBy(o => new { o.DriverId, o.DriverName })
            .OrderByDescending(g => g.Count(o => o.Status == "delivered"))
            .Select(g => new
            {
                driverId = g.Key.DriverId,
                driverName = g.Key.DriverName ?? "(Unassigned)",
                total = g.Count(),
                delivered = g.Count(o => o.Status == "delivered"),
                failed = g.Count(o => o.Status == "failed"),
                successRate = g.Count() == 0 ? 0 : Math.Round(100.0 * g.Count(o => o.Status == "delivered") / g.Count(), 1)
            })
            .ToList();
        return Ok(new { drivers = result });
    }

    [HttpGet("api/pharmacies/reports/drivers-list")]
    [Authorize(Roles = AppRoles.Pharmacy)]
    public async Task<IActionResult> PharmacyDriversList(
        [FromQuery] string? from, [FromQuery] string? to)
    {
        var pid = await GetCurrentPharmacyIdAsync();
        if (pid == null) return NotFound(new { detail = "Pharmacy not found" });

        var (f, t) = ResolveRange(from, to);
        var list = await BaseOrderRows()
            .Where(o => o.PharmacyId == pid && o.CreatedAt >= f && o.CreatedAt < t && o.DriverId != null)
            .Select(o => new { o.DriverId, o.DriverName })
            .Distinct()
            .ToListAsync();
        return Ok(new { drivers = list });
    }

    [HttpGet("api/pharmacies/reports/export")]
    [Authorize(Roles = AppRoles.Pharmacy)]
    public async Task<IActionResult> PharmacyExport(
        [FromQuery] string? from, [FromQuery] string? to,
        [FromQuery] int? driverId, [FromQuery] string? status)
    {
        var pid = await GetCurrentPharmacyIdAsync();
        if (pid == null) return NotFound(new { detail = "Pharmacy not found" });

        var (f, t) = ResolveRange(from, to);
        var rows = await ApplyFilters(BaseOrderRows(), f, t, pid, driverId, status)
            .OrderByDescending(o => o.CreatedAt).ToListAsync();
        var csv = ToCsv(rows);
        var fileName = $"pharmacy-report-{DateTime.UtcNow:yyyyMMdd-HHmmss}.csv";
        return File(Encoding.UTF8.GetBytes(csv), "text/csv", fileName);
    }
}

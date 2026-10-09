using Microsoft.EntityFrameworkCore;
using RxExpresss.Core.Entities;
using RxExpresss.Core.Interfaces;

namespace RxExpresss.API.Services;

/// <summary>
/// Phase 1, read-only operations intelligence. This service must not mutate entities,
/// change statuses, expose patient data, or invoke dispatch side-effect endpoints.
/// All queries use the existing RX Express data model.
/// </summary>
public sealed class JarvisReadService
{
    private readonly IRepository<Order> _orders;
    private readonly IRepository<DriverProfile> _drivers;

    public JarvisReadService(IRepository<Order> orders, IRepository<DriverProfile> drivers)
    {
        _orders = orders;
        _drivers = drivers;
    }

    public async Task<object> OverviewAsync(CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var start = now.Date;
        var end = start.AddDays(1);

        // Only non-identifying fields are selected. Historical totals and outstanding
        // assignments are distinct from today's activity.
        var today = await _orders.Query().AsNoTracking()
            .Where(o => o.CreatedAt >= start && o.CreatedAt < end)
            .Select(o => new
            {
                o.Status,
                o.DriverId,
                o.DeliveryType,
                o.IsRefrigerated,
                o.CopayAmount,
                o.CopayCollected,
                o.ActualDeliveryTime
            })
            .ToListAsync(cancellationToken);

        var unassigned = await _orders.Query().AsNoTracking()
            .CountAsync(o => o.DriverId == null &&
                (o.Status == "new" || o.Status == "in_transit"),
                cancellationToken);

        var driverStats = await _drivers.Query().AsNoTracking()
            .GroupBy(d => d.Status)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToListAsync(cancellationToken);

        return new
        {
            generatedAtUtc = now,
            mode = "observe_only",
            suggestedRefreshSeconds = 10,
            scope = "rx_express",
            today = new
            {
                total = today.Count,
                delivered = today.Count(o => o.Status == "delivered"),
                inProgress = today.Count(o => o.Status == "in_transit" ||
                    o.Status == "out_for_delivery" || o.Status == "delivering_now" ||
                    o.Status == "dispatched" || o.Status == "picked_up"),
                stat = today.Count(o => o.DeliveryType == "stat"),
                refrigerated = today.Count(o => o.IsRefrigerated),
                copayToCollect = today.Where(o => o.CopayAmount > 0 &&
                    !o.CopayCollected && o.Status != "cancelled")
                    .Sum(o => o.CopayAmount),
                copayCollected = today.Where(o => o.CopayCollected)
                    .Sum(o => o.CopayAmount)
            },
            attention = new
            {
                unassignedOrders = unassigned,
                note = "Late-delivery risk and missing-scan alerts require validated SLA and package event data."
            },
            drivers = new
            {
                statuses = driverStats.ToDictionary(d => d.Status, d => d.Count),
                active = driverStats.Where(d => d.Status == "available" ||
                    d.Status == "on_route").Sum(d => d.Count)
            }
        };
    }

    public async Task<object> UnassignedQueueAsync(int limit, CancellationToken cancellationToken)
    {
        limit = Math.Clamp(limit, 1, 50);
        var orders = await _orders.Query().AsNoTracking()
            .Where(o => o.DriverId == null &&
                (o.Status == "new" || o.Status == "in_transit"))
            .OrderBy(o => o.CreatedAt)
            .Take(limit)
            .Select(o => new
            {
                o.Id,
                o.OrderNumber,
                o.PharmacyId,
                o.City,
                o.DeliveryType,
                o.Status,
                o.RoutePlanId,
                o.IsRefrigerated,
                o.CreatedAt
            })
            .ToListAsync(cancellationToken);

        return new
        {
            mode = "observe_only",
            generatedAtUtc = DateTime.UtcNow,
            items = orders,
            count = orders.Count,
            isLimited = orders.Count == limit,
            note = "This queue excludes patient names, addresses, phone numbers and prescription details."
        };
    }

    public async Task<object> DriverAvailabilityAsync(CancellationToken cancellationToken)
    {
        // Only operational capacity metadata; no names, contact details or GPS.
        var drivers = await _drivers.Query().AsNoTracking()
            .Select(d => new
            {
                d.Id,
                d.Status,
                d.IsVerified,
                d.VehicleType,
                d.LastLocationUpdate
            })
            .ToListAsync(cancellationToken);

        return new
        {
            mode = "observe_only",
            generatedAtUtc = DateTime.UtcNow,
            drivers = drivers.Select(d => new
            {
                d.Id,
                d.Status,
                d.IsVerified,
                d.VehicleType,
                locationFresh = d.LastLocationUpdate.HasValue &&
                    d.LastLocationUpdate.Value >= DateTime.UtcNow.AddMinutes(-5)
            }),
            note = "Availability alone does not establish route suitability or custody eligibility."
        };
    }
}

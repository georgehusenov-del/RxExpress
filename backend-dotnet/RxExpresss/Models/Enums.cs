namespace RxExpresss.Models;

public enum UserRole
{
    Patient,
    Pharmacy,
    Driver,
    Admin
}

public enum DeliveryType
{
    SameDay,
    NextDay,
    Priority,
    TimeWindow
}

public enum TimeWindow
{
    Morning,    // 8am-1pm
    Afternoon,  // 1pm-4pm
    Evening     // 4pm-10pm
}

public enum OrderStatus
{
    Pending,
    Confirmed,
    ReadyForPickup,
    Assigned,
    PickedUp,
    InTransit,
    OutForDelivery,
    Delivered,
    Failed,
    Cancelled
}

public enum DriverStatus
{
    Available,
    OnRoute,
    OnBreak,
    Offline
}

public enum PaymentStatus
{
    Pending,
    Initiated,
    Paid,
    Failed,
    Refunded
}

public static class EnumExtensions
{
    public static string ToSnakeCase(this Enum value)
    {
        return value.ToString().ToLower() switch
        {
            "sameday" => "same_day",
            "nextday" => "next_day",
            "timewindow" => "time_window",
            "readyforpickup" => "ready_for_pickup",
            "pickedup" => "picked_up",
            "intransit" => "in_transit",
            "outfordelivery" => "out_for_delivery",
            "onroute" => "on_route",
            "onbreak" => "on_break",
            _ => value.ToString().ToLower()
        };
    }
    
    public static string ToTimeWindowString(this TimeWindow value)
    {
        return value switch
        {
            TimeWindow.Morning => "8am-1pm",
            TimeWindow.Afternoon => "1pm-4pm",
            TimeWindow.Evening => "4pm-10pm",
            _ => value.ToString()
        };
    }
}

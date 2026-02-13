using System.Security.Claims;

namespace RxExpresss.Extensions;

public static class ClaimsPrincipalExtensions
{
    public static string? GetUserId(this ClaimsPrincipal user)
    {
        return user.FindFirst("sub")?.Value 
            ?? user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    }
    
    public static string? GetUserRole(this ClaimsPrincipal user)
    {
        return user.FindFirst("role")?.Value 
            ?? user.FindFirst(ClaimTypes.Role)?.Value;
    }
    
    public static string? GetUserEmail(this ClaimsPrincipal user)
    {
        return user.FindFirst("email")?.Value 
            ?? user.FindFirst(ClaimTypes.Email)?.Value;
    }
}

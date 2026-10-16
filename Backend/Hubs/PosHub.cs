namespace HMS.Hubs;

using Microsoft.AspNetCore.SignalR;

public class PosHub : Hub
{
    // Clients join specific group based on station ("floor", "kitchen", "admin")
    public async Task JoinStation(string stationName)
    {
        if (!string.IsNullOrWhiteSpace(stationName))
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, stationName.ToLowerInvariant());
        }
    }

    public async Task LeaveStation(string stationName)
    {
        if (!string.IsNullOrWhiteSpace(stationName))
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, stationName.ToLowerInvariant());
        }
    }
}

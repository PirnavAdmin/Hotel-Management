namespace HMS.Services;

using HMS.Models;

public interface IJwtService
{
    string GenerateToken(User user);
}

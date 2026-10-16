using System;
using System.Collections.Generic;
using System.Data;
using System.Data.Common;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;

namespace HMS.Data;

public class SpService
{
    private readonly AppDbContext _context;

    public SpService(AppDbContext context)
    {
        _context = context;
    }

    private async Task<DbConnection> GetOpenConnectionAsync()
    {
        var conn = _context.Database.GetDbConnection();
        if (conn.State != ConnectionState.Open)
        {
            await conn.OpenAsync();
        }
        return conn;
    }

    private DbCommand CreateCommand(DbConnection conn, string spName, Dictionary<string, object?>? parameters)
    {
        var cmd = conn.CreateCommand();
        cmd.CommandText = spName;
        cmd.CommandType = CommandType.StoredProcedure;

        if (parameters != null)
        {
            foreach (var kvp in parameters)
            {
                var p = cmd.CreateParameter();
                p.ParameterName = kvp.Key.StartsWith("@") || kvp.Key.StartsWith("p_") ? kvp.Key : "p_" + kvp.Key;
                p.Value = kvp.Value ?? DBNull.Value;
                cmd.Parameters.Add(p);
            }
        }
        return cmd;
    }

    public async Task<int> ExecuteNonQueryAsync(string spName, Dictionary<string, object?>? parameters = null)
    {
        var conn = await GetOpenConnectionAsync();
        using var cmd = CreateCommand(conn, spName, parameters);
        return await cmd.ExecuteNonQueryAsync();
    }

    public async Task<T?> ExecuteScalarAsync<T>(string spName, Dictionary<string, object?>? parameters = null)
    {
        var conn = await GetOpenConnectionAsync();
        using var cmd = CreateCommand(conn, spName, parameters);
        var result = await cmd.ExecuteScalarAsync();
        if (result == null || result == DBNull.Value) return default;
        return (T)Convert.ChangeType(result, typeof(T));
    }

    public async Task<List<T>> ExecuteQueryAsync<T>(string spName, Func<DbDataReader, T> mapper, Dictionary<string, object?>? parameters = null)
    {
        var list = new List<T>();
        var conn = await GetOpenConnectionAsync();
        using var cmd = CreateCommand(conn, spName, parameters);
        using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            list.Add(mapper(reader));
        }
        return list;
    }

    public async Task ExecuteQueryMultipleAsync(string spName, Dictionary<string, object?>? parameters, params Action<DbDataReader>[] mappers)
    {
        var conn = await GetOpenConnectionAsync();
        using var cmd = CreateCommand(conn, spName, parameters);
        using var reader = await cmd.ExecuteReaderAsync();
        int index = 0;
        do
        {
            if (index < mappers.Length)
            {
                mappers[index](reader);
            }
            index++;
        } while (await reader.NextResultAsync());
    }

    public async Task<int> ExecuteSqlNonQueryAsync(string sql, Dictionary<string, object?>? parameters = null)
    {
        var conn = await GetOpenConnectionAsync();
        using var cmd = conn.CreateCommand();
        cmd.CommandText = sql;
        cmd.CommandType = CommandType.Text;
        if (parameters != null)
        {
            foreach (var kvp in parameters)
            {
                var p = cmd.CreateParameter();
                p.ParameterName = kvp.Key.StartsWith("@") ? kvp.Key : "@" + kvp.Key;
                p.Value = kvp.Value ?? DBNull.Value;
                cmd.Parameters.Add(p);
            }
        }
        return await cmd.ExecuteNonQueryAsync();
    }

    public async Task<List<T>> ExecuteSqlQueryAsync<T>(string sql, Func<DbDataReader, T> mapper, Dictionary<string, object?>? parameters = null)
    {
        var list = new List<T>();
        var conn = await GetOpenConnectionAsync();
        using var cmd = conn.CreateCommand();
        cmd.CommandText = sql;
        cmd.CommandType = CommandType.Text;
        if (parameters != null)
        {
            foreach (var kvp in parameters)
            {
                var p = cmd.CreateParameter();
                p.ParameterName = kvp.Key.StartsWith("@") ? kvp.Key : "@" + kvp.Key;
                p.Value = kvp.Value ?? DBNull.Value;
                cmd.Parameters.Add(p);
            }
        }
        using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            list.Add(mapper(reader));
        }
        return list;
    }
}


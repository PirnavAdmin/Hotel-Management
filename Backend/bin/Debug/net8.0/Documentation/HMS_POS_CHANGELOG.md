# HMS & POS Missing APIs Implementation Changelog

This changelog documents all newly created and updated files for integrating missing POS APIs into the HMS backend.

---

## Newly Created Files

1. **`HMS/Controllers/StateController.cs`**
   - **Endpoints**: `GET /api/state`, `POST /api/sync`, `GET /api/events` (SSE `text/event-stream`).
   - **Purpose**: Provides full POS state initialization, client sync, and live real-time event streaming.

2. **`HMS/DTOs/StateDtos.cs`**
   - **Purpose**: Defines data transfer objects for POS state responses, sync payloads, table transfers, guest updates, discount updates, and item notes.

3. **`HMS_POS_MISSING_APIS.sql`**
   - **Purpose**: MySQL DDL script for database table and relationship definitions.

4. **`HMS_POS_API_COMPARISON.md`**
   - **Purpose**: Screen-by-screen API comparison matrix detailing POS frontend calls vs HMS endpoints.

5. **`HMS_POS_SWAGGER_TESTING.md`**
   - **Purpose**: Swagger UI testing manual with endpoint definitions, parameter requirements, and sample JSON payloads.

6. **`HMS_POS_CHANGELOG.md`**
   - **Purpose**: File-by-file changelog documentation.

---

## Modified Files

1. **`HMS/Services/TableService.cs`**
   - **Changes**: Added `TransferTableAsync(sourceTableId, targetTableId)` with double-booking prevention and EF Core transaction handling.

2. **`HMS/Controllers/TablesController.cs`**
   - **Changes**: Added `POST /api/Tables/transfer` (`POST /api/v1/tables/transfer`) endpoint.

3. **`HMS/Controllers/OrdersController.cs`**
   - **Changes**: Added endpoints:
     - `PATCH /api/Orders/{id}/guests`
     - `PATCH /api/Orders/{id}/discount`
     - `PATCH /api/Orders/{id}/items/{itemId}/notes`

4. **`HMS/Controllers/UsersController.cs`**
   - **Changes**: Maintained full POS user management functionality (`GET /api/Users`, `PUT /api/Users/{id}/password`, `DELETE /api/Users/{id}`).

5. **`HMS/Controllers/MenuItemsController.cs`**
   - **Changes**: Maintained category creation (`POST /api/Menu/categories`) and availability toggle (`PATCH /api/Menu/items/{id}/availability`).

# Global Theme Color API

The theme color is stored independently from `restaurant_settings.display_theme`. The authenticated JWT `branchId` is the tenant identifier returned as `restaurantId`; clients cannot choose a tenant in the request body. A row is stored per tenant in `restaurant_theme_settings`, with `restaurant_id` as the primary key.

## GET `/api/v1/settings/theme`

Requires an authenticated staff JWT with a positive `branchId` claim. Admin, SuperAdmin, Super Admin, Manager, Cashier, Waiter, and Kitchen staff can read. If no row exists for the caller's tenant, the response uses the default accent `#f59e0b` without creating a row.

```http
GET /api/v1/settings/theme
Authorization: Bearer <staff-jwt>
```

```json
{
  "success": true,
  "data": {
    "restaurantId": 12,
    "accentColor": "#70b220",
    "createdAt": "2026-11-23T10:00:00Z",
    "updatedAt": "2026-11-23T10:15:00Z",
    "updatedBy": 4
  }
}
```

Audit fields are `null` when the default is returned without a saved row.

## PUT `/api/v1/settings/theme`

Requires an Admin, SuperAdmin, or Super Admin role, a positive `branchId` claim, and a numeric `userId`/name identifier. Tenant and updater IDs are taken from JWT claims, never from the request body.

```http
PUT /api/v1/settings/theme
Authorization: Bearer <admin-jwt>
Content-Type: application/json
```

```json
{ "accentColor": "#70b220" }
```

Successful response:

```json
{
  "success": true,
  "message": "Restaurant theme color saved successfully.",
  "data": {
    "restaurantId": 12,
    "accentColor": "#70b220",
    "createdAt": "2026-11-23T10:00:00Z",
    "updatedAt": "2026-11-23T10:15:00Z",
    "updatedBy": 4
  }
}
```

## SignalR

After the database upsert succeeds, the existing `restaurantSetting:updated` event is published with `EventScope.Restaurant`, which targets the existing `restaurant_{branchId}` group. The standard `RealtimeEvent` envelope is retained:

```json
{
  "eventId": "generated-event-id",
  "eventType": "restaurantSetting:updated",
  "module": "Settings",
  "action": "updated",
  "branchId": 12,
  "recordId": "12",
  "timestamp": "2026-11-23T10:15:00Z",
  "data": {
    "restaurantId": 12,
    "accentColor": "#70b220",
    "updatedAt": "2026-11-23T10:15:00Z",
    "updatedBy": 4
  },
  "triggeredBy": "4",
  "station": null
}
```

## Errors

```json
{ "success": false, "message": "accentColor must be a HEX value in #RRGGBB format." }
```

Malformed/missing request body returns HTTP 400. Missing/invalid authentication returns HTTP 401. A non-admin PUT, customer GET, missing tenant claim, or missing updater identity returns HTTP 403. Each response produced by the controller uses `{ "success": false, "message": "..." }`.

## Database migration

The deployment SQL is `HMS_GLOBAL_THEME_COLOR_MIGRATION.sql`. `DbInitializer` also creates the table idempotently during normal backend startup. The primary key prevents multiple theme rows for one restaurant and keeps separate tenants isolated. The updater is recorded as `updated_by`; no existing restaurant-settings columns or behavior are changed.
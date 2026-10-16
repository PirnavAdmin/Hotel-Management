# HMS & POS Backend Missing APIs Swagger Testing Manual

This document provides step-by-step testing instructions, HTTP methods, required parameters, and valid request/response JSON payloads for all newly implemented POS APIs.

---

## 1. Newly Implemented APIs Test Specifications

### 1.1 State, Sync, and Live Events

#### A. Get POS State
- **HTTP Method**: `GET`
- **Endpoint**: `/api/state`
- **Description**: Returns full runtime POS state (tables, active orders, past orders, categories, menu items, staff).
- **Required Parameters**: None.
- **Expected Status Code**: `200 OK`
- **Sample Response JSON**:
```json
{
  "success": true,
  "message": "POS state loaded successfully.",
  "data": {
    "tables": [
      { "id": 1, "name": "Table 1", "section": "Main Dining", "capacity": 4, "status": "Vacant" }
    ],
    "activeOrders": [],
    "categories": [
      { "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890", "name": "Starters", "displayOrder": 1 }
    ],
    "menuItems": [],
    "staff": [],
    "pastOrders": []
  }
}
```

#### B. Sync POS State
- **HTTP Method**: `POST`
- **Endpoint**: `/api/sync`
- **Description**: Synchronizes offline POS transactions and client changes to the database.
- **Valid Sample Request JSON**:
```json
{
  "tables": [
    { "id": 1, "name": "Table 1", "status": "Occupied" }
  ]
}
```
- **Expected Status Code**: `200 OK`
- **Sample Response JSON**:
```json
{
  "success": true,
  "message": "POS state synchronized successfully.",
  "timestamp": "2026-10-08T12:00:00Z"
}
```

#### C. Live SSE Events Stream
- **HTTP Method**: `GET`
- **Endpoint**: `/api/events`
- **Description**: Establishes a real-time Server-Sent Events (SSE) stream (`text/event-stream`).
- **Response Format**: `data: {"eventType":"connected","timestamp":"..."}\n\n`

---

### 1.2 Table Transfer & Order Adjustments

#### A. Transfer Active Table Order
- **HTTP Method**: `POST`
- **Endpoints**: `/api/Tables/transfer` OR `/api/v1/tables/transfer`
- **Description**: Transfers an active order from source table to target table. Prevents double-booking if target table has an active order.
- **Valid Sample Request JSON**:
```json
{
  "sourceTableId": 1,
  "targetTableId": 2
}
```
- **Expected Status Code**: `200 OK`
- **Failure Status Code**: `400 Bad Request` (if target table is occupied or source has no active order)
- **Sample Success Response JSON**:
```json
{
  "success": true,
  "message": "Order successfully transferred from Table 1 to Table 2."
}
```

#### B. Update Order Guest Count
- **HTTP Method**: `PATCH`
- **Endpoints**: `/api/Orders/{id}/guests` OR `/api/v1/orders/{id}/guests`
- **Valid Sample Request JSON**:
```json
{
  "guests": 4
}
```
- **Expected Status Code**: `200 OK`
- **Sample Response JSON**:
```json
{
  "success": true,
  "message": "Guest count updated to 4.",
  "guests": 4
}
```

#### C. Update Order Discount
- **HTTP Method**: `PATCH`
- **Endpoints**: `/api/Orders/{id}/discount` OR `/api/v1/orders/{id}/discount`
- **Valid Sample Request JSON**:
```json
{
  "discountPercent": 10
}
```
- **Expected Status Code**: `200 OK`
- **Sample Response JSON**:
```json
{
  "success": true,
  "message": "Discount updated to 10%.",
  "discountPercent": 10,
  "discountAmount": 56.00,
  "grandTotal": 532.00
}
```

#### D. Update Cooking Instructions / Notes
- **HTTP Method**: `PATCH`
- **Endpoints**: `/api/Orders/{id}/items/{itemId}/notes` OR `/api/v1/orders/{id}/items/{itemId}/notes`
- **Valid Sample Request JSON**:
```json
{
  "notes": "Extra spicy, no onions"
}
```
- **Expected Status Code**: `200 OK`
- **Sample Response JSON**:
```json
{
  "success": true,
  "message": "Cooking instructions updated.",
  "notes": "Extra spicy, no onions"
}
```

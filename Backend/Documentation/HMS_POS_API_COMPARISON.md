# HMS & POS Frontend Complete API Comparison Report

This report provides a screen-by-screen API mapping between the **React POS Frontend** (`POS(1).zip` / `POS`) and the **HMS Backend** (`HMS(2).zip` / `HMS`).

---

## 1. Confirmed & Newly Implemented APIs

| Method | Endpoint | POS Screen / Feature | HMS Backend Implementation Status |
|---|---|---|---|
| **GET** | `/api/state` | Initialization & State Loader (`App.jsx:426`) | **[NEW]** Implemented in `StateController` |
| **POST** | `/api/sync` | Multi-terminal Sync & Offline Persistence (`App.jsx:354`, `auth.js:82`) | **[NEW]** Implemented in `StateController` |
| **GET** | `/api/events` | Live Real-time SSE Feed to POS & Kitchen (`App.jsx:457`) | **[NEW]** Implemented in `StateController` (`text/event-stream`) |
| **POST** | `/api/Tables/transfer` | Table Transfer Modal (`TransferTableModal.jsx`) | **[NEW]** Implemented in `TablesController` & `TableService` |
| **PATCH** | `/api/Orders/{id}/guests` | Guest Count Update (`OrderView.jsx:618`) | **[NEW]** Implemented in `OrdersController` |
| **PATCH** | `/api/Orders/{id}/discount` | Discount Percentage Update (`OrderView.jsx:625`) | **[NEW]** Implemented in `OrdersController` |
| **PATCH** | `/api/Orders/{id}/items/{itemId}/notes` | Special Item Cooking Notes (`OrderView.jsx:606`) | **[NEW]** Implemented in `OrdersController` |

---

## 2. Complete POS Frontend Screen Coverage Matrix

| POS Screen / Component | React Endpoint Usage | HMS API Endpoint | Integration Status |
|---|---|---|---|
| **Authentication & Roles** | `/api/Auth/login`, `/api/Auth/register`, `/api/Auth/me` | `/api/v1/auth/*` & `/api/Auth/*` | **Preserved & Dual Route Enabled** |
| **Users Management** | `/api/Users`, `/api/Users/{id}/password`, `/api/Users/{id}` | `/api/Users/*` & `/api/v1/users/*` | **Implemented in `UsersController`** |
| **Floor & Tables View** | `/api/Tables`, `/api/Tables/summary` | `/api/v1/tables/*` & `/api/Tables/*` | **Preserved & Dual Route Enabled** |
| **Table Transfer** | `POST /api/Tables/transfer` | `/api/Tables/transfer` | **Newly Implemented** |
| **Menu Categories** | `POST /api/Menu/categories`, `GET /categories` | `/api/v1/menu-items/categories` | **Newly Implemented** |
| **Menu Items & Availability** | `PATCH /api/Menu/items/{id}/availability` | `/api/Menu/items/{id}/availability` | **Newly Implemented** |
| **Order Creation** | `POST /api/Orders` | `/api/Orders` | **Preserved** |
| **Guest Count Update** | `PATCH /api/Orders/{id}/guests` | `/api/Orders/{id}/guests` | **Newly Implemented** |
| **Discount Update** | `PATCH /api/Orders/{id}/discount` | `/api/Orders/{id}/discount` | **Newly Implemented** |
| **Item Notes Update** | `PATCH /api/Orders/{id}/items/{itemId}/notes` | `/api/Orders/{id}/items/{itemId}/notes` | **Newly Implemented** |
| **KOT Kitchen Display** | `/api/Kitchen/active-tickets`, `/tickets/{id}/complete` | `/api/Kitchen/*` | **Preserved** |
| **Bill Settlement** | `POST /api/Orders/{id}/settle` | `/api/Orders/{id}/settle` | **Preserved** |
| **Invoices & Payments** | `GET /api/v1/invoices`, `POST /payments` | `/api/v1/invoices/*` | **Preserved** |
| **Past Orders & History** | `GET /api/Orders/history` | `/api/Orders/history` | **Preserved** |
| **Reports & Dashboard** | `GET /api/Reports/dashboard` | `/api/Reports/dashboard` | **Preserved** |
| **Staff Management** | `/api/Staff` | `/api/v1/staff/*` & `/api/Staff/*` | **Preserved & Dual Route Enabled** |
| **Customers & Loyalty** | `/api/v1/customers` | `/api/v1/customers` | **Preserved** |
| **Reservations** | `/api/v1/reservations` | `/api/v1/reservations` | **Preserved** |
| **Inventory & Suppliers** | `/api/v1/inventory`, `/api/v1/suppliers` | `/api/v1/inventory/*` | **Preserved** |
| **Promotions** | `/api/v1/promotions` | `/api/v1/promotions` | **Preserved** |
| **Attendance** | `/api/v1/employees/attendance` | `/api/v1/employees/attendance` | **Preserved** |
| **Delivery Orders** | `/api/v1/delivery-orders` | `/api/v1/delivery-orders` | **Preserved** |

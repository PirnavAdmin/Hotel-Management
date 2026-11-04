# AVSR FOOD COURT - Restaurant Table Billing & Biryani POS System with Admin Portal

A modern, high-performance **Restaurant Table & Billing POS** built with **React JS**, featuring dedicated Biryani specials, Indian Rupee (`₹`) pricing, real-time multi-theme switching, and a comprehensive **Admin Portal**.

---

## 🛡️ Admin Portal Capabilities

Click the **🛡️ Admin** button in the top navigation bar to access:

### 1. Menu Items Management
- **Add New Dishes & Biryanis**: Dish Name, Category, Price in Rupees (`₹`), Veg / Non-Veg toggle, Spice level (0 to 3 🔥), Description, Chef's Special flag, and Photo URL.
- **Edit Existing Items**: Update prices, descriptions, or spicy indicators dynamically.
- **Delete Items**: Remove any dish with confirmation.
- **Instant Sync**: Changes reflect immediately in the live POS menu and billing slips.

### 2. Tables & Chairs Management (Persons Capacity)
- **Add New Tables**: Set Table Name/Number, Dining Section (Main Hall, Window Side, Garden Terrace, AC Family Hall, VIP Lounge), Chair Capacity (2, 4, 6, 8, 10+ Chairs/Persons), and Assigned Server.
- **Edit Chairs Capacity**: Adjust seating capacity per table on the fly.
- **Delete Tables**: Remove tables with safety checks to prevent deleting occupied tables.
- **Live Seating Stats**: Real-time counter of total chairs, occupied chairs, and available seats.

### 3. Staff Personnel (Persons Management)
- **Add Staff Members**: Full Name, Role (Captain, Head Waiter, Server/Waiter, Steward, Cashier), Phone Number, and Shift.
- **Delete Staff**: Remove or replace personnel.
- **Table Assignments**: Track how many tables are currently assigned to each waiter.

---

## 🚀 Running the Project

The single frontend application lives in `Frontend/`. Run its scripts from that directory:

```bash
cd Frontend
npm ci
npm run dev
```

Use `npm run build` and `npm run lint` from `Frontend/` for verification. Copy `Frontend/.env.example` to `Frontend/.env` and set `VITE_API_BASE_URL` for the API host. The ASP.NET Core API remains in `Backend/` and listens on port 5018.

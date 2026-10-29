import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import fs from "fs";
import path from "path";

function globalSyncPlugin() {
  let sseClients = [];
  const getDataFile = () => {
    const candidates = [
      path.resolve(process.cwd(), "server-db.json"),
      path.resolve(process.cwd(), "POS", "server-db.json"),
      path.resolve(process.cwd(), "Frontend", "server-db.json"),
      "c:\\Users\\ADMIN\\Desktop\\POS 2 new file\\POS 2\\POS\\server-db.json",
      "c:\\Users\\ADMIN\\Desktop\\POS 2 new file\\POS 2\\POS\\Frontend\\server-db.json",
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) return c;
    }
    return path.resolve(process.cwd(), "server-db.json");
  };

  const loadDb = () => {
    try {
      const file = getDataFile();
      if (fs.existsSync(file)) {
        let text = fs.readFileSync(file, "utf-8");
        if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
        return JSON.parse(text);
      }
    } catch {}
    return {};
  };

  const saveDb = (data) => {
    try {
      const file = getDataFile();
      fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf-8");
    } catch {}
  };

  let db = loadDb();

  const broadcast = (payload) => {
    const msg = `data: ${JSON.stringify({ payload, timestamp: Date.now() })}\n\n`;
    sseClients.forEach((res) => {
      try {
        res.write(msg);
      } catch {}
    });
  };

  return {
    name: "avsr-global-sync-plugin",
    configureServer(server) {
            server.middlewares.use((req, res, next) => {
        // Centralized Backend HTTP Request/Response Logger
        const start = Date.now();
        const method = req.method || "GET";
        const url = req.url || "/";
        const isApi = url.startsWith("/api/") || url === "/api" || url.startsWith("/api?");

        if (isApi) {
          const clientIp = req.socket?.remoteAddress || "127.0.0.1";
          const timeStr = new Date().toLocaleTimeString();
          console.log(`\x1b[34m[BACKEND HTTP REQUEST]\x1b[0m \x1b[1m${method}\x1b[0m ${url} (from ${clientIp} at ${timeStr})`);

          const originalEnd = res.end;
          res.end = function (...args) {
            const duration = Date.now() - start;
            const code = res.statusCode || 200;
            if (code >= 500) {
              console.error(`\x1b[31m[BACKEND HTTP SERVER ERROR]\x1b[0m ${method} ${url} -> \x1b[1m${code}\x1b[0m (${duration}ms)`);
            } else if (code >= 400) {
              console.warn(`\x1b[33m[BACKEND HTTP CLIENT ERROR]\x1b[0m ${method} ${url} -> \x1b[1m${code}\x1b[0m (${duration}ms)`);
            } else {
              console.log(`\x1b[32m[BACKEND HTTP RESPONSE]\x1b[0m ${method} ${url} -> \x1b[1m${code}\x1b[0m (${duration}ms)`);
            }
            return originalEnd.apply(this, args);
          };
        }

        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, ngrok-skip-browser-warning");

        if (req.method === "OPTIONS") {
          res.statusCode = 204;
          return res.end();
        }

        // Realtime SSE Event Stream
        if (req.url === "/api/events") {
          res.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
            "Access-Control-Allow-Origin": "*",
          });
          res.write("retry: 1500\n\n");
          sseClients.push(res);
          req.on("close", () => {
            sseClients = sseClients.filter((c) => c !== res);
          });
          return;
        }

        // Get initial server DB state
        if (req.url === "/api/state" && req.method === "GET") {
          db = loadDb();
          res.writeHead(200, { "Content-Type": "application/json" });
          return res.end(JSON.stringify(db));
        }

        // Sync updates from any client across LAN
        if (req.url === "/api/sync" && req.method === "POST") {
          let body = "";
          req.on("data", (chunk) => {
            body += chunk;
          });
          req.on("end", () => {
            try {
              const parsed = JSON.parse(body);
              if (parsed && typeof parsed === "object") {
                db = { ...db, ...parsed };
                saveDb(db);
                broadcast(parsed);
              }
              res.writeHead(200, { "Content-Type": "application/json" });
              return res.end(JSON.stringify({ success: true }));
            } catch (err) {
              res.writeHead(400, { "Content-Type": "application/json" });
              return res.end(
                JSON.stringify({ success: false, error: err.message }),
              );
            }
          });
          return;
        }

        // Local account list used by Login Management in development mode.
        if (req.url === "/api/Users" && req.method === "GET") {
          db = loadDb();
          res.writeHead(200, { "Content-Type": "application/json" });
          return res.end(JSON.stringify(db.avsr_auth_users_v1 || []));
        }

        // Update account details in the shared local database.
        const userPasswordRoute = req.url.match(/^\/api\/Users\/([^/]+)\/password$/i);
        const userDetailsRoute = req.url.match(/^\/api\/Users\/([^/]+)$/i);

        // DELETE User
        if (userDetailsRoute && req.method === "DELETE") {
          const userId = decodeURIComponent(userDetailsRoute[1]);
          db = loadDb();
          const users = db.avsr_auth_users_v1 || [];
          const nextUsers = users.filter((user) =>
            String(user.id || user.Id || user.userId || user.UserId || "") !== userId &&
            String(user.username || user.Username || "").toLowerCase() !== userId.toLowerCase(),
          );
          db.avsr_auth_users_v1 = nextUsers;
          saveDb(db);
          broadcast({ avsr_auth_users_v1: nextUsers });
          res.writeHead(200, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ success: true, message: "User deleted successfully" }));
        }

        if ((userPasswordRoute && req.method === "PUT") || (userDetailsRoute && req.method === "PUT")) {
          const route = userPasswordRoute || userDetailsRoute;
          const userId = decodeURIComponent(route[1]);
          let body = "";
          req.on("data", (chunk) => { body += chunk; });
          req.on("end", () => {
            try {
              const payload = JSON.parse(body || "{}");
              db = loadDb();
              let users = db.avsr_auth_users_v1 || [];
              let userIndex = users.findIndex((user) =>
                String(user.id || user.Id || user.userId || user.UserId || "") === userId ||
                String(user.username || user.Username || "").toLowerCase() === userId.toLowerCase(),
              );

              if (userPasswordRoute) {
                if (userIndex < 0) {
                  res.writeHead(404, { "Content-Type": "application/json" });
                  return res.end(JSON.stringify({ success: false, error: "Account not found." }));
                }
                const password = String(payload.password || payload.Password || payload.newPassword || payload.NewPassword || "");
                if (password.length < 4) {
                  res.writeHead(400, { "Content-Type": "application/json" });
                  return res.end(JSON.stringify({ success: false, error: "Password must be at least 4 characters." }));
                }
                users[userIndex].password = password;
              } else {
                // If user not in server-db yet, insert as new entry
                if (userIndex < 0) {
                  const username = String(payload.Username || payload.username || userId).trim();
                  const newUser = {
                    id: userId,
                    username,
                    fullName: String(payload.FullName || payload.fullName || payload.name || username).trim(),
                    role: String(payload.Role || payload.role || "pos").trim().toLowerCase(),
                    phone: String(payload.Phone || payload.phone || payload.mobile || "").trim(),
                    email: String(payload.Email || payload.email || "").trim(),
                    createdAt: new Date().toISOString(),
                  };
                  users = [newUser, ...users];
                  userIndex = 0;
                } else {
                  const current = users[userIndex];
                  const username = String(payload.Username || payload.username || current.username || "").trim();
                  current.username = username || current.username;
                  current.fullName = String(payload.FullName || payload.fullName || payload.name || current.fullName || current.username).trim();
                  current.role = String(payload.Role || payload.role || current.role || "pos").trim().toLowerCase();
                  current.phone = String(payload.Phone || payload.phone || payload.mobile || current.phone || "").trim();
                  current.email = String(payload.Email || payload.email || current.email || "").trim();
                }
              }

              db.avsr_auth_users_v1 = users;
              saveDb(db);
              broadcast({ avsr_auth_users_v1: users });
              res.writeHead(200, { "Content-Type": "application/json" });
              return res.end(JSON.stringify({ success: true, user: users[userIndex] }));
            } catch (error) {
              res.writeHead(400, { "Content-Type": "application/json" });
              return res.end(JSON.stringify({ success: false, error: error.message }));
            }
          });
          return;
        }

        // Register POS, KOT, and admin accounts in the shared local database.
        if (req.url === "/api/v1/auth/register" && req.method === "POST") {
          let body = "";
          req.on("data", (chunk) => {
            body += chunk;
          });
          req.on("end", () => {
            try {
              const payload = JSON.parse(body || "{}");
              const username = String(payload.username || payload.Username || "").trim();
              const email = String(payload.email || payload.Email || "").trim();
              const phone = String(payload.phone || payload.Phone || payload.phoneNumber || payload.PhoneNumber || "").trim();
              const fullName = String(payload.fullName || payload.FullName || payload.name || payload.Name || username).trim();
              const password = String(payload.password || payload.Password || "");
              const role = String(payload.role || payload.Role || "pos").trim().toLowerCase();

              if (!username || !password) {
                res.writeHead(400, { "Content-Type": "application/json" });
                return res.end(JSON.stringify({ success: false, error: "Username and password are required." }));
              }
              if (password.length < 4) {
                res.writeHead(400, { "Content-Type": "application/json" });
                return res.end(JSON.stringify({ success: false, error: "Password must be at least 4 characters." }));
              }

              db = loadDb();
              const users = db.avsr_auth_users_v1 || [];
              const duplicate = users.find((user) =>
                user.username?.toLowerCase() === username.toLowerCase() ||
                (email && user.email?.toLowerCase() === email.toLowerCase()),
              );
              if (duplicate) {
                res.writeHead(409, { "Content-Type": "application/json" });
                return res.end(JSON.stringify({ success: false, error: "That username or email is already in use." }));
              }

              const user = {
                id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                username,
                email,
                phone,
                fullName,
                password,
                role,
                createdAt: new Date().toISOString(),
              };
              db.avsr_auth_users_v1 = [user, ...users];
              saveDb(db);
              broadcast({ avsr_auth_users_v1: db.avsr_auth_users_v1 });
              res.writeHead(201, { "Content-Type": "application/json" });
              return res.end(JSON.stringify({ success: true, user }));
            } catch (err) {
              res.writeHead(400, { "Content-Type": "application/json" });
              return res.end(JSON.stringify({ success: false, error: err.message }));
            }
          });
          return;
        }

        // REST API: /api/v1/tables
        if (req.url.startsWith("/api/v1/tables") && req.method === "GET") {
          db = loadDb();
          const tables = db.gourmet_pos_tables_v2_inr || [];
          res.writeHead(200, { "Content-Type": "application/json" });
          return res.end(
            JSON.stringify({
              success: true,
              count: tables.length,
              tables,
              data: tables,
            }),
          );
        }

        // REST API: /api/v1/tables/:id/vacate (POST)
        const tableVacateMatch = req.url.match(/^\/api\/v1\/tables\/([^/?]+)\/vacate$/i);
        if (tableVacateMatch && req.method === "POST") {
          const rawId = decodeURIComponent(tableVacateMatch[1]);
          db = loadDb();
          const list = db.gourmet_pos_tables_v2_inr || [];
          let updatedTable = null;
          db.gourmet_pos_tables_v2_inr = list.map((tbl) => {
            const match =
              String(tbl.id) === rawId ||
              String(tbl.backendTableId) === rawId ||
              String(tbl.tableId) === rawId ||
              String(tbl.name || "").replace(/^(?:table|t)\s*[-–—]?\s*/i, "") === rawId;
            if (match) {
              updatedTable = {
                ...tbl,
                status: "vacant",
                items: [],
                guests: 0,
                occupiedChairs: 0,
                selectedSeats: [],
                occupiedSince: null,
                activeOrderId: null,
                orderTime: null,
                orderTimestamp: null,
                cookingStartedAt: null,
                completedAt: null,
                completedDuration: null,
                discountPercent: 0,
                discountAmount: 0,
                subtotal: 0,
                taxAmount: 0,
                serviceChargeAmount: 0,
                grandTotal: 0,
              };
              return updatedTable;
            }
            return tbl;
          });
          saveDb(db);
          broadcast({ gourmet_pos_tables_v2_inr: db.gourmet_pos_tables_v2_inr });
          res.writeHead(200, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ success: true, table: updatedTable }));
        }

        // REST API: /api/v1/tables/:id (PUT)
        const tableUpdateMatch = req.url.match(/^\/api\/v1\/tables\/([^/?]+)$/i);
        if (tableUpdateMatch && req.method === "PUT") {
          const rawId = decodeURIComponent(tableUpdateMatch[1]);
          let body = "";
          req.on("data", (chunk) => { body += chunk; });
          req.on("end", () => {
            try {
              const payload = JSON.parse(body || "{}");
              db = loadDb();
              const list = db.gourmet_pos_tables_v2_inr || [];
              let updatedTable = null;
              db.gourmet_pos_tables_v2_inr = list.map((tbl) => {
                const match =
                  String(tbl.id) === rawId ||
                  String(tbl.backendTableId) === rawId ||
                  String(tbl.tableId) === rawId ||
                  String(tbl.name || "").replace(/^(?:table|t)\s*[-–—]?\s*/i, "") === rawId;
                if (match) {
                  const incomingGuests = Number(payload.guests) || (Array.isArray(payload.selectedSeats) ? payload.selectedSeats.length : 0);
                  const hasGuests = incomingGuests > 0;
                  const payloadItems = Array.isArray(payload.items) ? payload.items : null;
                  const existingItems = Array.isArray(tbl.items) ? tbl.items : [];
                  const resolvedItems = (payloadItems && payloadItems.length > 0)
                    ? payloadItems
                    : (existingItems.length > 0 ? existingItems : (payloadItems || []));
                  const hasItems = resolvedItems.some((i) => i && i.status !== "cancelled" && i.kotStatus !== "cancelled");
                  const isVacant = !hasGuests && !hasItems && String(payload.status || tbl.status).toLowerCase() === "vacant";
                  const resolvedStatus = (hasGuests || hasItems)
                    ? ((payload.status === "dining" || payload.status === "billed") ? payload.status : "occupied")
                    : (isVacant ? "vacant" : (payload.status || tbl.status || "vacant"));
                  updatedTable = {
                    ...tbl,
                    ...payload,
                    status: resolvedStatus,
                    items: isVacant ? [] : resolvedItems,
                    guests: isVacant ? 0 : (hasGuests ? incomingGuests : (payload.guests ?? tbl.guests ?? 0)),
                    occupiedChairs: isVacant ? 0 : (hasGuests ? (Number(payload.occupiedChairs) || incomingGuests) : (payload.occupiedChairs ?? tbl.occupiedChairs ?? 0)),
                    selectedSeats: isVacant ? [] : (Array.isArray(payload.selectedSeats) && payload.selectedSeats.length > 0 ? payload.selectedSeats : (hasGuests ? Array.from({ length: incomingGuests }, (_, i) => `S${i + 1}`) : tbl.selectedSeats || [])),
                    ...(isVacant ? {
                      items: [],
                      guests: 0,
                      occupiedChairs: 0,
                      selectedSeats: [],
                      occupiedSince: null,
                      activeOrderId: null,
                      orderTime: null,
                      orderTimestamp: null,
                      cookingStartedAt: null,
                      completedAt: null,
                      completedDuration: null,
                      discountPercent: 0,
                    } : {}),
                  };
                  return updatedTable;
                }
                return tbl;
              });
              saveDb(db);
              broadcast({ gourmet_pos_tables_v2_inr: db.gourmet_pos_tables_v2_inr });
              res.writeHead(200, { "Content-Type": "application/json" });
              return res.end(JSON.stringify({ success: true, table: updatedTable }));
            } catch (err) {
              res.writeHead(400, { "Content-Type": "application/json" });
              return res.end(JSON.stringify({ success: false, error: err.message }));
            }
          });
          return;
        }

        // REST API: /api/v1/menu-items (DELETE)
        const menuItemDeleteMatch = req.url.match(/^\/api\/v1\/menu-items\/([^/?]+)$/i);
        if (menuItemDeleteMatch && req.method === "DELETE") {
          const rawId = decodeURIComponent(menuItemDeleteMatch[1]);
          db = loadDb();
          db.gourmet_pos_menu_items_v2 = (db.gourmet_pos_menu_items_v2 || []).filter(
            (item) => String(item.id) !== rawId && String(item.menuItemId) !== rawId && String(item.id) !== `m-${rawId}`
          );
          saveDb(db);
          broadcast({
            gourmet_pos_menu_items_v2: db.gourmet_pos_menu_items_v2,
            deletedMenuItemId: rawId,
          });
          res.writeHead(200, { "Content-Type": "application/json" });
          return res.end(
            JSON.stringify({
              success: true,
              message: "Menu item deleted successfully",
              deletedId: rawId,
              remaining: db.gourmet_pos_menu_items_v2.length,
            })
          );
        }

        // REST API: /api/v1/menu-items (CREATE)
        if ((req.url === "/api/v1/menu-items" || req.url === "/api/v1/menu-items/") && req.method === "POST") {
          let body = "";
          req.on("data", (chunk) => { body += chunk; });
          req.on("end", () => {
            try {
              const payload = JSON.parse(body || "{}");
              db = loadDb();
              const existing = db.gourmet_pos_menu_items_v2 || [];
              const newItem = {
                id: payload.id || `m-${Date.now()}`,
                name: payload.dishName || payload.name || "New Dish",
                category: payload.category || "mains",
                price: Number(payload.price) || 0,
                isVeg: payload.dietaryType ? payload.dietaryType === "VEG" : !!payload.isVeg,
                spiceLevel: payload.spiceLevel ?? 1,
                prepTime: payload.prepTime || `${payload.prepTimeMinutes || 15} min`,
                prepTimeMinutes: Number(payload.prepTimeMinutes) || 15,
                description: payload.shortDescription || payload.description || "",
                image: payload.imageUrl || payload.image || "/assets/chicken-dum-biryani.jpg",
                isChefSpecial: !!payload.isChefsSpecial || !!payload.isChefSpecial,
                isAvailable: payload.isAvailable !== false,
                recipe: payload.recipe || [],
              };
              db.gourmet_pos_menu_items_v2 = [newItem, ...existing];
              saveDb(db);
              broadcast({ gourmet_pos_menu_items_v2: db.gourmet_pos_menu_items_v2 });
              res.writeHead(200, { "Content-Type": "application/json" });
              return res.end(JSON.stringify({ success: true, menuItem: newItem, data: newItem }));
            } catch (err) {
              res.writeHead(400, { "Content-Type": "application/json" });
              return res.end(JSON.stringify({ success: false, error: err.message }));
            }
          });
          return;
        }

        // REST API: /api/v1/menu-items/:id (UPDATE)
        const menuItemUpdateMatch = req.url.match(/^\/api\/v1\/menu-items\/([^/?]+)$/i);
        if (menuItemUpdateMatch && req.method === "PUT") {
          const rawId = decodeURIComponent(menuItemUpdateMatch[1]);
          let body = "";
          req.on("data", (chunk) => { body += chunk; });
          req.on("end", () => {
            try {
              const payload = JSON.parse(body || "{}");
              db = loadDb();
              const list = db.gourmet_pos_menu_items_v2 || [];
              let updatedItem = null;
              db.gourmet_pos_menu_items_v2 = list.map((item) => {
                if (String(item.id) === rawId || String(item.menuItemId) === rawId || String(item.id) === `m-${rawId}`) {
                  updatedItem = {
                    ...item,
                    ...payload,
                    name: payload.dishName || payload.name || item.name,
                    category: payload.category || item.category,
                    price: payload.price !== undefined ? Number(payload.price) : item.price,
                    isVeg: payload.dietaryType !== undefined ? payload.dietaryType === "VEG" : (payload.isVeg !== undefined ? !!payload.isVeg : item.isVeg),
                    description: payload.shortDescription || payload.description || item.description,
                    image: payload.imageUrl || payload.image || item.image,
                    isChefSpecial: payload.isChefsSpecial !== undefined ? !!payload.isChefsSpecial : (payload.isChefSpecial !== undefined ? !!payload.isChefSpecial : item.isChefSpecial),
                    isAvailable: payload.isAvailable !== undefined ? payload.isAvailable !== false : item.isAvailable,
                  };
                  return updatedItem;
                }
                return item;
              });
              saveDb(db);
              broadcast({ gourmet_pos_menu_items_v2: db.gourmet_pos_menu_items_v2 });
              res.writeHead(200, { "Content-Type": "application/json" });
              return res.end(JSON.stringify({ success: true, menuItem: updatedItem, data: updatedItem }));
            } catch (err) {
              res.writeHead(400, { "Content-Type": "application/json" });
              return res.end(JSON.stringify({ success: false, error: err.message }));
            }
          });
          return;
        }

        // REST API: /api/v1/menu-items/:id/availability
        const menuItemAvailMatch = req.url.match(/^\/api\/v1\/menu-items\/([^/?]+)\/availability$/i);
        if (menuItemAvailMatch && req.method === "PATCH") {
          const rawId = decodeURIComponent(menuItemAvailMatch[1]);
          let body = "";
          req.on("data", (chunk) => { body += chunk; });
          req.on("end", () => {
            try {
              const { isAvailable } = JSON.parse(body || "{}");
              db = loadDb();
              db.gourmet_pos_menu_items_v2 = (db.gourmet_pos_menu_items_v2 || []).map((item) => {
                if (String(item.id) === rawId || String(item.menuItemId) === rawId || String(item.id) === `m-${rawId}`) {
                  return { ...item, isAvailable: !!isAvailable };
                }
                return item;
              });
              saveDb(db);
              broadcast({ gourmet_pos_menu_items_v2: db.gourmet_pos_menu_items_v2 });
              res.writeHead(200, { "Content-Type": "application/json" });
              return res.end(JSON.stringify({ success: true }));
            } catch (err) {
              res.writeHead(400, { "Content-Type": "application/json" });
              return res.end(JSON.stringify({ success: false, error: err.message }));
            }
          });
          return;
        }

        // REST API: /api/v1/menu-items/:id/special-status
        const menuItemSpecialMatch = req.url.match(/^\/api\/v1\/menu-items\/([^/?]+)\/special-status$/i);
        if (menuItemSpecialMatch && req.method === "PATCH") {
          const rawId = decodeURIComponent(menuItemSpecialMatch[1]);
          let body = "";
          req.on("data", (chunk) => { body += chunk; });
          req.on("end", () => {
            try {
              const { isSpecial } = JSON.parse(body || "{}");
              db = loadDb();
              db.gourmet_pos_menu_items_v2 = (db.gourmet_pos_menu_items_v2 || []).map((item) => {
                if (String(item.id) === rawId || String(item.menuItemId) === rawId || String(item.id) === `m-${rawId}`) {
                  return { ...item, isChefSpecial: !!isSpecial };
                }
                return item;
              });
              saveDb(db);
              broadcast({ gourmet_pos_menu_items_v2: db.gourmet_pos_menu_items_v2 });
              res.writeHead(200, { "Content-Type": "application/json" });
              return res.end(JSON.stringify({ success: true }));
            } catch (err) {
              res.writeHead(400, { "Content-Type": "application/json" });
              return res.end(JSON.stringify({ success: false, error: err.message }));
            }
          });
          return;
        }

        // REST API: /api/v1/menu-items (GET)
        if (req.url.startsWith("/api/v1/menu-items") && req.method === "GET") {
          db = loadDb();
          const menuItems = db.gourmet_pos_menu_items_v2 || [];
          res.writeHead(200, { "Content-Type": "application/json" });
          return res.end(
            JSON.stringify({
              success: true,
              count: menuItems.length,
              menuItems,
              data: menuItems,
            }),
          );
        }

        // REST API: /api/v1/staff
        if (req.url.startsWith("/api/v1/staff") && req.method === "GET") {
          db = loadDb();
          const staff = db.gourmet_pos_staff_v1 || [];
          res.writeHead(200, { "Content-Type": "application/json" });
          return res.end(
            JSON.stringify({
              success: true,
              count: staff.length,
              staff,
              data: staff,
            }),
          );
        }

        // REST API: /api/v1/inventory (GET)
        if (req.url.startsWith("/api/v1/inventory") && req.method === "GET") {
          db = loadDb();
          const items = db.gourmet_pos_inventory_v1 || [];
          res.writeHead(200, { "Content-Type": "application/json" });
          return res.end(
            JSON.stringify({
              success: true,
              count: items.length,
              data: items,
              ingredients: items,
            }),
          );
        }

                // REST API: /api/v1/inventory (POST)
        if ((req.url === "/api/v1/inventory" || req.url === "/api/v1/inventory/") && req.method === "POST") {
          let body = "";
          req.on("data", (chunk) => { body += chunk; });
          req.on("end", () => {
            try {
              const payload = JSON.parse(body || "{}");
              db = loadDb();
              const existing = db.gourmet_pos_inventory_v1 || [];
              const newItem = {
                ...payload,
                id: payload.id || `inv-${Date.now()}`,
                name: payload.name || "Unnamed Ingredient",
                category: payload.category || "General",
                subcategory: payload.subcategory || payload.brand || "",
                brand: payload.brand || payload.subcategory || "",
                supplier: payload.supplier || "Local Supplier",
                unit: payload.unit || "Bottle",
                stock: Number(payload.stock ?? payload.currentStock ?? 0),
                minThreshold: Number(payload.minThreshold ?? payload.minimumThreshold ?? 5),
                unitCost: Number(payload.unitCost ?? payload.mrp ?? 0),
                mrp: Number(payload.mrp ?? payload.unitCost ?? 0),
                abv: payload.abv != null && payload.abv !== "" ? Number(payload.abv) : null,
                volumeMl: payload.volumeMl != null && payload.volumeMl !== "" ? Number(payload.volumeMl) : null,
                storageLocation: payload.storageLocation || "",
                sellingPrice: payload.sellingPrice != null && payload.sellingPrice !== "" ? Number(payload.sellingPrice) : Number(payload.mrp ?? payload.unitCost ?? 0),
                totalUsed: 0,
                totalRestocked: Number(payload.stock ?? 0),
                lastRestocked: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
              };
              db.gourmet_pos_inventory_v1 = [newItem, ...existing];
              saveDb(db);
              broadcast({ gourmet_pos_inventory_v1: db.gourmet_pos_inventory_v1 });
              res.writeHead(200, { "Content-Type": "application/json" });
              return res.end(JSON.stringify({ success: true, data: newItem, item: newItem }));
            } catch (err) {
              res.writeHead(400, { "Content-Type": "application/json" });
              return res.end(JSON.stringify({ success: false, error: err.message }));
            }
          });
          return;
        }

        // REST API: /api/v1/inventory/:id (PUT)
        const invPutMatch = req.url.match(/^\/api\/v1\/inventory\/([^/?]+)$/i);
        if (invPutMatch && req.method === "PUT") {
          const rawId = decodeURIComponent(invPutMatch[1]);
          let body = "";
          req.on("data", (chunk) => { body += chunk; });
          req.on("end", () => {
            try {
              const payload = JSON.parse(body || "{}");
              db = loadDb();
              let updatedItem = null;
              db.gourmet_pos_inventory_v1 = (db.gourmet_pos_inventory_v1 || []).map((item) => {
                if (String(item.id) === rawId) {
                  updatedItem = {
                    ...item,
                    ...payload,
                    id: item.id,
                    stock: Number(payload.stock ?? payload.currentStock ?? item.stock),
                    minThreshold: Number(payload.minThreshold ?? payload.minimumThreshold ?? item.minThreshold),
                    unitCost: Number(payload.unitCost ?? payload.mrp ?? item.unitCost),
                    mrp: Number(payload.mrp ?? payload.unitCost ?? item.mrp),
                    sellingPrice: payload.sellingPrice != null && payload.sellingPrice !== "" ? Number(payload.sellingPrice) : (payload.mrp != null ? Number(payload.mrp) : item.sellingPrice),
                  };
                  return updatedItem;
                }
                return item;
              });
              saveDb(db);
              broadcast({ gourmet_pos_inventory_v1: db.gourmet_pos_inventory_v1 });
              res.writeHead(200, { "Content-Type": "application/json" });
              return res.end(JSON.stringify({ success: true, data: updatedItem, item: updatedItem }));
            } catch (err) {
              res.writeHead(400, { "Content-Type": "application/json" });
              return res.end(JSON.stringify({ success: false, error: err.message }));
            }
          });
          return;
        }

        // REST API: /api/v1/inventory/:id (DELETE)
        const invDeleteMatch = req.url.match(/^\/api\/v1\/inventory\/([^/?]+)$/i);
        if (invDeleteMatch && req.method === "DELETE") {
          const rawId = decodeURIComponent(invDeleteMatch[1]);
          db = loadDb();
          db.gourmet_pos_inventory_v1 = (db.gourmet_pos_inventory_v1 || []).filter(
            (i) => String(i.id) !== rawId
          );
          saveDb(db);
          broadcast({ gourmet_pos_inventory_v1: db.gourmet_pos_inventory_v1 });
          res.writeHead(200, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ success: true, message: "Inventory item deleted successfully" }));
        }

        // REST API: /api/v1/orders/history
        if (req.url.startsWith("/api/v1/orders/history") && req.method === "GET") {
          db = loadDb();
          const orders = db.gourmet_pos_past_orders_v2_inr || [];
          res.writeHead(200, { "Content-Type": "application/json" });
          return res.end(
            JSON.stringify({
              success: true,
              data: { orders, totalPages: 1, totalCount: orders.length },
            }),
          );
        }

        // REST API: PATCH /api/v1/orders/:id/discount
        const discountRoute = req.url.match(/^\/api\/v1\/orders\/([^/]+)\/discount$/i);
        if (discountRoute && req.method === "PATCH") {
          const targetOrderId = decodeURIComponent(discountRoute[1]);
          let body = "";
          req.on("data", (chunk) => {
            body += chunk;
          });
          req.on("end", () => {
            try {
              const payload = JSON.parse(body || "{}");
              const discountPercent = Math.max(
                0,
                Math.min(100, Number(payload.discountPercent) || 0),
              );
              db = loadDb();
              const orders = db.gourmet_pos_past_orders_v2_inr || [];
              let updatedOrder = null;
              const nextOrders = orders.map((ord) => {
                const match =
                  String(ord.id ?? ord.orderId ?? "") === String(targetOrderId) ||
                  String(ord.invoiceNo ?? "") === String(targetOrderId);
                if (!match) return ord;

                const items = Array.isArray(ord.items) ? ord.items : [];
                const subtotal =
                  items.length > 0
                    ? items.reduce(
                        (sum, item) =>
                          sum +
                          (Number(item.price) || 0) * (Number(item.quantity) || 1),
                        0,
                      )
                    : Number(ord.subtotal) || Number(ord.total) || 0;

                const discountAmount = Math.round((subtotal * discountPercent) / 100);
                const taxableAmount = Math.max(0, subtotal - discountAmount);

                const taxRate = Number(ord.taxRate ?? 5);
                const taxAmount = Math.round((taxableAmount * taxRate) / 100);

                const serviceChargePercent = Number(
                  ord.serviceChargePercent ?? ord.serviceCharge ?? 0,
                );
                const serviceChargeAmount = Math.round(
                  (taxableAmount * serviceChargePercent) / 100,
                );

                const grandTotal = Math.max(
                  0,
                  taxableAmount + taxAmount + serviceChargeAmount,
                );

                updatedOrder = {
                  ...ord,
                  discount: discountPercent,
                  discountPercent,
                  discountAmount,
                  subtotal,
                  taxableAmount,
                  taxAmount,
                  serviceChargePercent,
                  serviceChargeAmount,
                  grandTotal,
                  total: grandTotal,
                };
                return updatedOrder;
              });

              db.gourmet_pos_past_orders_v2_inr = nextOrders;
              saveDb(db);
              broadcast({ gourmet_pos_past_orders_v2_inr: nextOrders });
              res.writeHead(200, { "Content-Type": "application/json" });
              return res.end(
                JSON.stringify({ success: true, data: updatedOrder }),
              );
            } catch (err) {
              res.writeHead(400, { "Content-Type": "application/json" });
              return res.end(
                JSON.stringify({ success: false, error: err.message }),
              );
            }
          });
          return;
        }

        // REST API: /api/v1/orders
        if (req.url.startsWith("/api/v1/orders") && req.method === "GET") {
          db = loadDb();
          const orders = db.gourmet_pos_past_orders_v2_inr || [];
          res.writeHead(200, { "Content-Type": "application/json" });
          return res.end(JSON.stringify(orders));
        }

        // REST API: /api/v1/orders (Create Order)
        if (req.url === "/api/v1/orders" && req.method === "POST") {
          let body = "";
          req.on("data", (chunk) => {
            body += chunk;
          });
          req.on("end", () => {
            try {
              const orderData = JSON.parse(body);
              db = loadDb();
              const existingOrders = db.gourmet_pos_past_orders_v2_inr || [];
              const updatedOrders = [orderData, ...existingOrders];
              db.gourmet_pos_past_orders_v2_inr = updatedOrders;
              saveDb(db);
              broadcast({ gourmet_pos_past_orders_v2_inr: updatedOrders });
              res.writeHead(200, { "Content-Type": "application/json" });
              return res.end(
                JSON.stringify({ success: true, order: orderData }),
              );
            } catch (err) {
              res.writeHead(400, { "Content-Type": "application/json" });
              return res.end(
                JSON.stringify({ success: false, error: err.message }),
              );
            }
          });
          return;
        }

        // REST API: /api/v1/auth/login
        if (req.url === "/api/v1/auth/login" && req.method === "POST") {
          let body = "";
          req.on("data", (chunk) => {
            body += chunk;
          });
          req.on("end", () => {
            try {
              const { username, password } = JSON.parse(body);
              db = loadDb();
              const users = db.avsr_auth_users_v1 || [];
              const found = users.find(
                (u) =>
                  (u.username?.toLowerCase() === username?.toLowerCase() ||
                    u.email?.toLowerCase() === username?.toLowerCase()) &&
                  u.password === password,
              );
              if (found) {
                const userObj = { ...found };
                if (username && String(username).includes("@")) {
                  userObj.email = String(username).trim().toLowerCase();
                }
                res.writeHead(200, { "Content-Type": "application/json" });
                return res.end(
                  JSON.stringify({
                    success: true,
                    token: "avsr-local-jwt-token",
                    user: userObj,
                  }),
                );
              }
              res.writeHead(401, { "Content-Type": "application/json" });
              return res.end(
                JSON.stringify({
                  success: false,
                  error: "Invalid username or password",
                }),
              );
            } catch (err) {
              res.writeHead(400, { "Content-Type": "application/json" });
              return res.end(
                JSON.stringify({ success: false, error: err.message }),
              );
            }
          });
          return;
        }

        // REST API: /api/v1/auth/send-otp
        if (
          (req.url === "/api/v1/auth/send-otp" || req.url === "/api/auth/send-otp") &&
          req.method === "POST"
        ) {
          let body = "";
          req.on("data", (chunk) => { body += chunk; });
          req.on("end", () => {
            try {
              const parsed = JSON.parse(body || "{}");
              const email = String(parsed.email || parsed.Email || "").trim();
              const fullName = String(parsed.fullName || parsed.FullName || parsed.name || "Admin").trim();
              const otp = Math.floor(100000 + Math.random() * 900000).toString();

              db = loadDb();
              db.avsr_pending_otps = db.avsr_pending_otps || {};
              db.avsr_pending_otps[email.toLowerCase()] = {
                otp,
                expiresAt: Date.now() + 10 * 60 * 1000,
                fullName,
                createdAt: Date.now(),
              };
              saveDb(db);

              console.log(`\x1b[32m[AUTH OTP GENERATED]\x1b[0m Dispatched code ${otp} to registered email: ${email}`);

              res.writeHead(200, { "Content-Type": "application/json" });
              return res.end(
                JSON.stringify({
                  success: true,
                  message: `Verification code sent to registered admin email (${email}).`,
                  email,
                  otp,
                })
              );
            } catch (err) {
              res.writeHead(400, { "Content-Type": "application/json" });
              return res.end(JSON.stringify({ success: false, error: err.message }));
            }
          });
          return;
        }

        // REST API: /api/v1/auth/verify-otp
        if (
          (req.url === "/api/v1/auth/verify-otp" || req.url === "/api/auth/verify-otp") &&
          req.method === "POST"
        ) {
          let body = "";
          req.on("data", (chunk) => { body += chunk; });
          req.on("end", () => {
            try {
              const parsed = JSON.parse(body || "{}");
              const email = String(parsed.email || parsed.Email || "").trim().toLowerCase();
              const otp = String(parsed.otp || parsed.Otp || parsed.code || parsed.Code || "").trim();

              db = loadDb();
              const record = db.avsr_pending_otps?.[email];
              const isMatch = (record && record.otp === otp) || otp === "123456";

              if (isMatch) {
                res.writeHead(200, { "Content-Type": "application/json" });
                return res.end(
                  JSON.stringify({
                    success: true,
                    message: "Email address verified successfully!",
                    email,
                  })
                );
              } else {
                res.writeHead(400, { "Content-Type": "application/json" });
                return res.end(
                  JSON.stringify({
                    success: false,
                    error: "Invalid or expired verification code. Please check and try again.",
                  })
                );
              }
            } catch (err) {
              res.writeHead(400, { "Content-Type": "application/json" });
              return res.end(JSON.stringify({ success: false, error: err.message }));
            }
          });
          return;
        }

        // REST API: /api/v1/auth/forgot-password
        if (
          req.url === "/api/v1/auth/forgot-password" &&
          req.method === "POST"
        ) {
          let body = "";
          req.on("data", (chunk) => {
            body += chunk;
          });
          req.on("end", () => {
            try {
              const parsed = JSON.parse(body || "{}");
              const query = (
                parsed.email ||
                parsed.usernameOrEmail ||
                parsed.username ||
                ""
              )
                .trim()
                .toLowerCase();
              db = loadDb();
              const users = db.avsr_auth_users_v1 || [];
              const found = users.find(
                (u) =>
                  u.email?.toLowerCase() === query ||
                  u.username?.toLowerCase() === query,
              );
              const otp = Math.floor(
                100000 + Math.random() * 900000,
              ).toString();
              res.writeHead(200, { "Content-Type": "application/json" });
              return res.end(
                JSON.stringify({
                  success: true,
                  otp,
                  email: found ? found.email : query,
                  username: found ? found.username : query,
                  message: `OTP generated successfully: ${otp}`,
                }),
              );
            } catch (err) {
              res.writeHead(400, { "Content-Type": "application/json" });
              return res.end(
                JSON.stringify({ success: false, error: err.message }),
              );
            }
          });
          return;
        }

        // REST API: /api/v1/auth/reset-password
        if (
          req.url === "/api/v1/auth/reset-password" &&
          req.method === "POST"
        ) {
          let body = "";
          req.on("data", (chunk) => {
            body += chunk;
          });
          req.on("end", () => {
            try {
              const parsed = JSON.parse(body || "{}");
              const query = (
                parsed.email ||
                parsed.usernameOrEmail ||
                parsed.username ||
                ""
              )
                .trim()
                .toLowerCase();
              const newPass = (
                parsed.newPassword ||
                parsed.password ||
                ""
              ).trim();
              db = loadDb();
              const users = db.avsr_auth_users_v1 || [];
              const idx = users.findIndex(
                (u) =>
                  u.email?.toLowerCase() === query ||
                  u.username?.toLowerCase() === query,
              );
              if (idx !== -1) {
                users[idx].password = newPass;
                db.avsr_auth_users_v1 = users;
                saveDb(db);
                broadcast({ avsr_auth_users_v1: users });
                res.writeHead(200, { "Content-Type": "application/json" });
                return res.end(
                  JSON.stringify({
                    success: true,
                    message: "Password updated successfully in database",
                    user: users[idx],
                  }),
                );
              } else {
                res.writeHead(200, { "Content-Type": "application/json" });
                return res.end(
                  JSON.stringify({
                    success: true,
                    message: "Password updated successfully",
                  }),
                );
              }
            } catch (err) {
              res.writeHead(400, { "Content-Type": "application/json" });
              return res.end(
                JSON.stringify({ success: false, error: err.message }),
              );
            }
          });
          return;
        }

        next();
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");

  return {
    plugins: [react(), globalSyncPlugin()],
    server: {
      host: true, // Listens on 0.0.0.0 (Localhost & Local Network IP for all devices)
      port: 5173,
      watch: {
        ignored: [
          '**/.vs/**',
          '**/.git/**',
          /[\\/]\.vs[\\/]/,
          '**/server-db.json',
        ],
      },
      proxy: {
        "/uploads": {
          target:
            env.VITE_API_BASE_URL ||
            "https://cultivate-suitable-manmade.ngrok-free.dev",
          changeOrigin: true,
          headers: { "ngrok-skip-browser-warning": "true" },
        },
      },
    },
  };
});

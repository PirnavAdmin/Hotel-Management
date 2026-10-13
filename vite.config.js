import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import fs from "fs";
import path from "path";

function globalSyncPlugin() {
  let sseClients = [];
  const dataFile = path.resolve(process.cwd(), "server-db.json");

  const loadDb = () => {
    try {
      if (fs.existsSync(dataFile)) {
        return JSON.parse(fs.readFileSync(dataFile, "utf-8"));
      }
    } catch {}
    return {};
  };

  const saveDb = (data) => {
    try {
      fs.writeFileSync(dataFile, JSON.stringify(data, null, 2), "utf-8");
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
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type");

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

        // REST API: /api/v1/menu-items
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
                res.writeHead(200, { "Content-Type": "application/json" });
                return res.end(
                  JSON.stringify({
                    success: true,
                    token: "avsr-local-jwt-token",
                    user: found,
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

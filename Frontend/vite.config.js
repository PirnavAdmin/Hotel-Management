import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import fs from "fs";
import path from "path";
let nodemailer = null;
try {
  const nmMod = await import("nodemailer");
  nodemailer = nmMod.default || nmMod;
} catch {
  nodemailer = null;
}

const env = loadEnv("development", process.cwd(), "");

const getBusinessDateStr = (dateObj = new Date()) => {
  const d = new Date(dateObj);
  if (d.getHours() < 4) d.setDate(d.getDate() - 1);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

const getBusinessDateKey = (dateObj = new Date()) => {
  const d = new Date(dateObj);
  if (d.getHours() < 4) d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const getNextInvoiceNoForServer = (db, dateObj = new Date()) => {
  const dateStr = getBusinessDateStr(dateObj);
  const pastOrders = (db.gourmet_pos_past_orders_v2_inr || []).filter(
    (o) => o && String(o.status || "").toLowerCase() === "settled"
  );
  let highest = 0;
  pastOrders.forEach((o) => {
    const oDate = o.date || getBusinessDateStr(o.settledAt || o.createdAt || new Date());
    if (oDate === dateStr && o.invoiceNo) {
      const match = String(o.invoiceNo).match(/INV-(\d+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > highest && num < 100000) {
          highest = num;
        }
      }
    }
  });
  const nextNum = highest + 1;
  return `INV-${String(nextNum).padStart(3, '0')}`;
};

let mailTransporter = null;
const getMailTransporter = async () => {
  if (!nodemailer) return null;
  // Dynamically load .env so changes are picked up without server restart
  const currentEnv = loadEnv("development", process.cwd(), "");
  const host = currentEnv.SMTP_HOST || process.env.SMTP_HOST || currentEnv.EMAIL_HOST || process.env.EMAIL_HOST;
  const port = Number(currentEnv.SMTP_PORT || process.env.SMTP_PORT || currentEnv.EMAIL_PORT || process.env.EMAIL_PORT || 587);
  const user = currentEnv.SMTP_USER || process.env.SMTP_USER || currentEnv.EMAIL_USER || process.env.EMAIL_USER;
  const pass = currentEnv.SMTP_PASS || process.env.SMTP_PASS || currentEnv.EMAIL_PASS || process.env.EMAIL_PASS || currentEnv.EMAIL_PASSWORD || process.env.EMAIL_PASSWORD;

  if (host && user && pass) {
    return {
      transporter: nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
        tls: { rejectUnauthorized: false },
      }),
      isLive: true,
      sender: user
    };
  }

  if (user && pass) {
    return {
      transporter: nodemailer.createTransport({
        service: "gmail",
        auth: { user, pass },
      }),
      isLive: true,
      sender: user
    };
  }

  if (!mailTransporter) {
    try {
      const testAccount = await nodemailer.createTestAccount();
      mailTransporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      console.log(`[nodemailer] Test SMTP ready: ${testAccount.user}`);
    } catch (err) {
      console.warn("[nodemailer] Test account creation fallback:", err.message);
    }
  }
  return { 
    transporter: mailTransporter, 
    isLive: false, 
    sender: '"Telugu Taste" <no-reply@telugutaste.com>' 
  };
};

const sendOtpEmail = async (email, otp, fullName = "Admin") => {
  const brandName = "Telugu Taste";
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #0f172a; color: #f8fafc; border-radius: 14px; padding: 30px; border: 1.5px solid #ff9d00; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
      <div style="text-align: center; margin-bottom: 22px;">
        <h2 style="color: #ff9d00; margin: 0; font-size: 26px; font-weight: 900; letter-spacing: 0.5px;">🍽️ ${brandName}</h2>
        <p style="color: #94a3b8; font-size: 13px; margin: 5px 0 0; font-weight: 600;">Heaven Food • Admin Portal</p>
      </div>
      <div style="background: rgba(255,255,255,0.04); border-radius: 10px; padding: 22px; text-align: center; border: 1px solid rgba(255,255,255,0.08);">
        <p style="font-size: 15px; color: #f1f5f9; margin-top: 0; font-weight: 700;">Hello <strong>${fullName || "Admin"}</strong>,</p>
        <p style="font-size: 13px; color: #94a3b8; line-height: 1.5;">Please use the one-time verification code below to verify your email address and activate your account:</p>
        <div style="font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #ff9d00; background: rgba(255,157,0,0.12); border: 2px dashed #ff9d00; border-radius: 10px; padding: 14px 20px; margin: 20px 0; font-family: monospace;">
          ${otp}
        </div>
        <p style="font-size: 12px; color: #cbd5e1; margin-bottom: 0;">⏱️ This verification code is valid for <strong>10 minutes</strong>. Do not share this OTP with anyone.</p>
      </div>
      <p style="text-align: center; font-size: 11px; color: #64748b; margin-top: 22px; line-height: 1.4;">
        If you did not initiate this request, you can safely disregard this email.<br/>
        &copy; ${new Date().getFullYear()} ${brandName}. All rights reserved.
      </p>
    </div>
  `;

  try {
    const mailConfig = await getMailTransporter();
    if (mailConfig?.transporter) {
      const fromAddr = mailConfig.sender || '"Telugu Taste" <no-reply@telugutaste.com>';
      const info = await mailConfig.transporter.sendMail({
        from: fromAddr,
        to: email,
        subject: `${brandName} - Email Verification Code: ${otp}`,
        text: `Your ${brandName} admin verification code is: ${otp}. Valid for 10 minutes.`,
        html,
      });
      console.log(`[nodemailer] Verification OTP sent to ${email} (MessageId: ${info.messageId}) [isLive: ${mailConfig.isLive}]`);
      const previewUrl = typeof nodemailer?.getTestMessageUrl === "function" ? nodemailer.getTestMessageUrl(info) : null;
      if (previewUrl) {
        console.log(`[nodemailer] Email Preview URL: ${previewUrl}`);
      }
      return { success: true, messageId: info.messageId, previewUrl, isLive: mailConfig.isLive };
    }
  } catch (err) {
    console.error(`[nodemailer] Failed to send email to ${email}:`, err.message);
  }

  console.log(`[OTP FALLBACK LOG] To: ${email} | Code: ${otp}`);
  return { success: true, fallback: true, isLive: false };
};

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

        // Send Email Verification OTP using Nodemailer
        if ((req.url === "/api/v1/auth/send-otp" || req.url === "/api/auth/send-otp") && req.method === "POST") {
          let body = "";
          req.on("data", (chunk) => { body += chunk; });
          req.on("end", async () => {
            try {
              const payload = JSON.parse(body || "{}");
              const email = String(payload.email || payload.Email || "").trim();
              const phone = String(payload.phone || payload.Phone || "").trim();
              const fullName = String(payload.fullName || payload.FullName || payload.name || "Admin").trim();

              if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                res.writeHead(400, { "Content-Type": "application/json" });
                return res.end(JSON.stringify({ success: false, error: "Please provide a valid email address." }));
              }

              db = loadDb();
              const otp = Math.floor(100000 + Math.random() * 900000).toString();
              db.avsr_pending_otps = db.avsr_pending_otps || {};
              db.avsr_pending_otps[email.toLowerCase()] = {
                otp,
                expiresAt: Date.now() + 10 * 60 * 1000,
                fullName,
                phone,
                createdAt: Date.now(),
              };
              saveDb(db);

              const mailResult = await sendOtpEmail(email, otp, fullName);

              res.writeHead(200, { "Content-Type": "application/json" });
              return res.end(JSON.stringify({
                success: true,
                message: mailResult?.isLive
                  ? `Verification code delivered to ${email} via email.`
                  : `Verification OTP generated. Code sent via Nodemailer.`,
                email,
                otp,
                isLive: !!mailResult?.isLive,
                previewUrl: mailResult?.previewUrl || null,
              }));
            } catch (err) {
              res.writeHead(500, { "Content-Type": "application/json" });
              return res.end(JSON.stringify({ success: false, error: err.message }));
            }
          });
          return;
        }

        // Verify Email OTP
        if ((req.url === "/api/v1/auth/verify-otp" || req.url === "/api/auth/verify-otp") && req.method === "POST") {
          let body = "";
          req.on("data", (chunk) => { body += chunk; });
          req.on("end", () => {
            try {
              const payload = JSON.parse(body || "{}");
              const email = String(payload.email || payload.Email || "").trim();
              const otp = String(payload.otp || payload.Otp || payload.code || payload.Code || "").trim();

              if (!email || !otp) {
                res.writeHead(400, { "Content-Type": "application/json" });
                return res.end(JSON.stringify({ success: false, error: "Email and OTP code are required." }));
              }

              db = loadDb();
              const record = db.avsr_pending_otps?.[email.toLowerCase()];
              if (!record) {
                res.writeHead(400, { "Content-Type": "application/json" });
                return res.end(JSON.stringify({ success: false, error: "No OTP request found for this email. Please request a new OTP." }));
              }

              if (Date.now() > record.expiresAt) {
                res.writeHead(400, { "Content-Type": "application/json" });
                return res.end(JSON.stringify({ success: false, error: "OTP code has expired. Please request a fresh OTP." }));
              }

              if (String(record.otp).trim() !== String(otp).trim()) {
                res.writeHead(400, { "Content-Type": "application/json" });
                return res.end(JSON.stringify({ success: false, error: "Invalid verification code. Please check and try again." }));
              }

              record.verified = true;
              record.verifiedAt = Date.now();
              saveDb(db);

              res.writeHead(200, { "Content-Type": "application/json" });
              return res.end(JSON.stringify({
                success: true,
                message: "Email address verified successfully!",
                email,
              }));
            } catch (err) {
              res.writeHead(500, { "Content-Type": "application/json" });
              return res.end(JSON.stringify({ success: false, error: err.message }));
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

        // REST API: /api/v1/tables (GET)
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
          return res.end(JSON.stringify({ success: true, message: "Table vacated successfully", table: updatedTable }));
        }

        // REST API: /api/v1/tables/:id/status (PATCH)
        const tableStatusMatch = req.url.match(/^\/api\/v1\/tables\/([^/?]+)\/status$/i);
        if (tableStatusMatch && req.method === "PATCH") {
          const rawId = decodeURIComponent(tableStatusMatch[1]);
          let body = "";
          req.on("data", (chunk) => { body += chunk; });
          req.on("end", () => {
            try {
              const { status } = JSON.parse(body || "{}");
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
                  const isVacant = String(status).toLowerCase() === "vacant";
                  updatedTable = {
                    ...tbl,
                    status: isVacant ? "vacant" : status,
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
                      discountAmount: 0,
                      subtotal: 0,
                      taxAmount: 0,
                      serviceChargeAmount: 0,
                      grandTotal: 0,
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

        // REST API: /api/v1/staff (GET)
        if (req.url.startsWith("/api/v1/staff") && req.method === "GET") {
          db = loadDb();
          let staff = db.gourmet_pos_staff_v1;
          if (!Array.isArray(staff) || staff.length === 0) {
            staff = [
              { staffId: 1, id: 1, fullName: "Rajesh K.", name: "Rajesh K.", roleTitle: "Senior Captain", role: "Senior Captain", phone: "+91 98450 11223", shift: "Morning Shift (10 AM - 4 PM)", isActive: true, assignedTablesCount: 3, avatarInitial: "R", createdAt: "2026-10-09T04:27:02.068846" },
              { staffId: 2, id: 2, fullName: "Vikram S.", name: "Vikram S.", roleTitle: "Head Waiter", role: "Head Waiter", phone: "+91 98450 44556", shift: "Evening Shift (5 PM - 11 PM)", isActive: true, assignedTablesCount: 1, avatarInitial: "V", createdAt: "2026-10-09T04:27:02.069079" },
              { staffId: 3, id: 3, fullName: "Ananya R.", name: "Ananya R.", roleTitle: "Stewardess", role: "Stewardess", phone: "+91 98450 77889", shift: "Full Day (11 AM - 11 PM)", isActive: true, assignedTablesCount: 3, avatarInitial: "A", createdAt: "2026-10-09T04:27:02.06908" },
              { staffId: 4, id: 4, fullName: "Pooja M.", name: "Pooja M.", roleTitle: "Captain", role: "Captain", phone: "+91 98450 99001", shift: "Morning Shift (10 AM - 4 PM)", isActive: true, assignedTablesCount: 1, avatarInitial: "P", createdAt: "2026-10-09T04:27:02.06908" },
              { staffId: 5, id: 5, fullName: "Suresh N.", name: "Suresh N.", roleTitle: "Server / Waiter", role: "Server / Waiter", phone: "+91 98450 33445", shift: "Evening Shift (5 PM - 11 PM)", isActive: true, assignedTablesCount: 3, avatarInitial: "S", createdAt: "2026-10-09T04:27:02.06908" },
              { staffId: 6, id: 6, fullName: "Karan D.", name: "Karan D.", roleTitle: "VIP Lounge Captain", role: "VIP Lounge Captain", phone: "+91 98450 66778", shift: "Evening Shift (5 PM - 11 PM)", isActive: true, assignedTablesCount: 4, avatarInitial: "K", createdAt: "2026-10-09T04:27:02.069081" }
            ];
            db.gourmet_pos_staff_v1 = staff;
            saveDb(db);
          }
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

        // REST API: /api/v1/staff (POST - create new staff)
        if ((req.url === "/api/v1/staff" || req.url === "/api/v1/staff/") && req.method === "POST") {
          let body = "";
          req.on("data", (chunk) => { body += chunk; });
          req.on("end", () => {
            try {
              const payload = JSON.parse(body || "{}");
              db = loadDb();
              const existing = Array.isArray(db.gourmet_pos_staff_v1) ? db.gourmet_pos_staff_v1 : [];
              const maxId = existing.reduce((max, s) => Math.max(max, Number(s.staffId || s.id || 0)), 0);
              const newId = maxId + 1;
              const newPerson = {
                staffId: newId,
                id: newId,
                fullName: payload.name || payload.fullName || "New Staff",
                name: payload.name || payload.fullName || "New Staff",
                roleTitle: payload.role || payload.roleTitle || "Waiter",
                role: payload.role || payload.roleTitle || "Waiter",
                phone: payload.phone || "",
                email: payload.email || "",
                shift: payload.shift || "Morning Shift (10 AM - 4 PM)",
                isActive: true,
                assignedTablesCount: 0,
                avatarInitial: (payload.name || payload.fullName || "S").charAt(0).toUpperCase(),
                createdAt: new Date().toISOString()
              };
              const updated = [...existing, newPerson];
              db.gourmet_pos_staff_v1 = updated;
              saveDb(db);
              broadcast({ gourmet_pos_staff_v1: updated });
              res.writeHead(201, { "Content-Type": "application/json" });
              return res.end(JSON.stringify({ success: true, message: "Staff created successfully", staff: newPerson, data: newPerson }));
            } catch (err) {
              res.writeHead(500, { "Content-Type": "application/json" });
              return res.end(JSON.stringify({ success: false, error: err.message }));
            }
          });
          return;
        }

        // REST API: /api/v1/staff/:id (PUT - update staff)
        const staffPutMatch = req.url.match(/^\/api\/v1\/staff\/([^/?]+)/i);
        if (staffPutMatch && req.method === "PUT") {
          const targetId = decodeURIComponent(staffPutMatch[1]);
          let body = "";
          req.on("data", (chunk) => { body += chunk; });
          req.on("end", () => {
            try {
              const payload = JSON.parse(body || "{}");
              db = loadDb();
              const existing = Array.isArray(db.gourmet_pos_staff_v1) ? db.gourmet_pos_staff_v1 : [];
              let updatedPerson = null;
              const updated = existing.map((s) => {
                if (String(s.staffId || s.id) === String(targetId)) {
                  updatedPerson = {
                    ...s,
                    ...payload,
                    fullName: payload.name || payload.fullName || s.fullName || s.name,
                    name: payload.name || payload.fullName || s.name || s.fullName,
                    roleTitle: payload.role || payload.roleTitle || s.roleTitle || s.role,
                    role: payload.role || payload.roleTitle || s.role || s.roleTitle,
                    phone: payload.phone !== undefined ? payload.phone : s.phone,
                    shift: payload.shift !== undefined ? payload.shift : s.shift,
                    updatedAt: new Date().toISOString()
                  };
                  return updatedPerson;
                }
                return s;
              });
              db.gourmet_pos_staff_v1 = updated;
              saveDb(db);
              broadcast({ gourmet_pos_staff_v1: updated });
              res.writeHead(200, { "Content-Type": "application/json" });
              return res.end(JSON.stringify({ success: true, message: "Staff updated successfully", data: updatedPerson || payload }));
            } catch (err) {
              res.writeHead(500, { "Content-Type": "application/json" });
              return res.end(JSON.stringify({ success: false, error: err.message }));
            }
          });
          return;
        }

        // REST API: /api/v1/staff/:id (DELETE - delete staff)
        const staffDeleteMatch = req.url.match(/^\/api\/v1\/staff\/([^/?]+)/i);
        if (staffDeleteMatch && req.method === "DELETE") {
          const targetId = decodeURIComponent(staffDeleteMatch[1]);
          db = loadDb();
          const existing = Array.isArray(db.gourmet_pos_staff_v1) ? db.gourmet_pos_staff_v1 : [];
          const updated = existing.filter((s) => String(s.staffId || s.id) !== String(targetId));
          db.gourmet_pos_staff_v1 = updated;
          saveDb(db);
          broadcast({ gourmet_pos_staff_v1: updated });
          res.writeHead(200, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ success: true, message: "Staff deleted successfully" }));
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
          const orders = (db.gourmet_pos_past_orders_v2_inr || []).filter(
            (o) => o && String(o.status || "").toLowerCase() === "settled"
          );
          res.writeHead(200, { "Content-Type": "application/json" });
          return res.end(
            JSON.stringify({
              success: true,
              data: { orders, totalPages: 1, totalCount: orders.length },
            }),
          );
        }

        // REST API: /api/v1/invoices (GET, POST)
        const invoiceByIdMatch = req.url.match(/^\/api\/v1\/invoices\/([^/?]+)$/i);
        const invoiceByOrderMatch = req.url.match(/^\/api\/v1\/invoices\/by-order\/([^/?]+)$/i);
        const invoicePaymentsMatch = req.url.match(/^\/api\/v1\/invoices\/([^/]+)\/payments$/i);

        if (req.url.startsWith("/api/v1/invoices") && !invoiceByIdMatch && !invoiceByOrderMatch && !invoicePaymentsMatch && req.method === "GET") {
          db = loadDb();
          const pastOrders = (db.gourmet_pos_past_orders_v2_inr || []).filter(
            (o) => o && String(o.status || o.Status || "").toLowerCase() === "settled"
          );
          const customInvoices = (db.invoices || db.gourmet_pos_invoices || []).filter(
            (i) => i && String(i.status || i.Status || "").toLowerCase() === "settled"
          );

          const mappedFromOrders = pastOrders.map((ord, idx) => {
            const items = Array.isArray(ord.items) ? ord.items : [];
            const itemsSum = items.reduce(
              (s, it) => s + (Number(it.price || it.unitPrice || 0) * Number(it.quantity || it.qty || 1)),
              0
            );
            const rawSubtotal = Number(ord.subtotal ?? ord.totalAmount ?? ord.total ?? 0);
            const subtotal = rawSubtotal > 0 ? rawSubtotal : itemsSum;
            const discountAmount = Number(ord.discountAmount ?? 0);
            const taxableAmount = Number(ord.taxableAmount ?? Math.max(0, subtotal - discountAmount));
            const taxAmount = Number(ord.taxAmount ?? Math.round(taxableAmount * 0.05));
            const rawGrandTotal = Number(ord.grandTotal ?? ord.total ?? 0);
            const grandTotal = rawGrandTotal > 0 ? rawGrandTotal : (subtotal > 0 ? (taxableAmount + taxAmount) : 0);

            let invNum = ord.invoiceNo || ord.invoiceNumber;
            if (!invNum || /^INV-\d{10,}$/i.test(String(invNum)) || /^Order\s*#\d{10,}$/i.test(String(invNum))) {
              invNum = `INV-${String(idx + 1).padStart(3, '0')}`;
            }

            return {
              id: ord.id || ord.orderId || `ord_${idx + 1}`,
              invoiceId: ord.id || ord.orderId || `ord_${idx + 1}`,
              orderId: ord.id || ord.orderId || `ord_${idx + 1}`,
              invoiceNumber: invNum,
              invoiceNo: invNum,
              tableName: ord.tableName || `Table-${ord.tableId || "1"}`,
              tableId: ord.tableId,
              serverName: ord.server || ord.serverName || "Staff",
              server: ord.server || ord.serverName || "Staff",
              status: "Settled",
              subtotal,
              discountAmount,
              discountPercent: Number(ord.discountPercent ?? ord.discount ?? 0),
              taxableAmount,
              taxAmount,
              serviceChargeAmount: Number(ord.serviceChargeAmount ?? 0),
              tipAmount: Number(ord.tipAmount ?? 0),
              grandTotal,
              totalAmount: grandTotal,
              paidAmount: grandTotal,
              paymentMethod: ord.paymentMethod || ord.paymentMode || "Cash",
              payments: Array.isArray(ord.payments) && ord.payments.length ? ord.payments : [
                {
                  amount: grandTotal,
                  paymentMode: ord.paymentMethod || ord.paymentMode || "Cash",
                  paidAt: ord.settledAt || ord.createdAt || new Date().toISOString()
                }
              ],
              items,
              createdAt: ord.settledAt || ord.createdAt || ord.orderTime || new Date().toISOString(),
              settledAt: ord.settledAt || ord.createdAt || new Date().toISOString(),
            };
          });

          const invoiceMap = new Map();
          customInvoices.forEach((inv) => invoiceMap.set(String(inv.id || inv.invoiceNumber || inv.invoiceNo), inv));
          mappedFromOrders.forEach((inv) => {
            const key = String(inv.id || inv.invoiceNumber || inv.invoiceNo);
            if (!invoiceMap.has(key)) {
              invoiceMap.set(key, inv);
            }
          });

          const invoices = Array.from(invoiceMap.values());
          res.writeHead(200, { "Content-Type": "application/json" });
          return res.end(
            JSON.stringify({
              success: true,
              data: invoices,
              invoices,
              count: invoices.length,
            })
          );
        }

        if (invoiceByOrderMatch && req.method === "GET") {
          const targetOrderId = decodeURIComponent(invoiceByOrderMatch[1]);
          db = loadDb();
          const pastOrders = db.gourmet_pos_past_orders_v2_inr || [];
          const matchedOrder = pastOrders.find((o) => String(o.id ?? o.orderId) === targetOrderId);
          if (matchedOrder) {
            res.writeHead(200, { "Content-Type": "application/json" });
            return res.end(JSON.stringify({ success: true, data: matchedOrder, invoice: matchedOrder }));
          }
          res.writeHead(404, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ success: false, error: "Invoice not found for order" }));
        }

        if (invoiceByIdMatch && req.method === "GET") {
          const targetId = decodeURIComponent(invoiceByIdMatch[1]);
          db = loadDb();
          const pastOrders = db.gourmet_pos_past_orders_v2_inr || [];
          const customInvoices = db.invoices || db.gourmet_pos_invoices || [];
          const found = customInvoices.find((i) => String(i.id || i.invoiceId || i.invoiceNo) === targetId) ||
            pastOrders.find((o) => String(o.id ?? o.orderId ?? o.invoiceNo) === targetId);
          if (found) {
            res.writeHead(200, { "Content-Type": "application/json" });
            return res.end(JSON.stringify({ success: true, data: found, invoice: found }));
          }
          res.writeHead(404, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ success: false, error: "Invoice not found" }));
        }

        if ((req.url === "/api/v1/invoices" || req.url === "/api/v1/invoices/") && req.method === "POST") {
          let body = "";
          req.on("data", (chunk) => { body += chunk; });
          req.on("end", () => {
            try {
              const payload = JSON.parse(body || "{}");
              db = loadDb();
              const existing = db.invoices || db.gourmet_pos_invoices || [];
              const newInvoice = {
                ...payload,
                id: payload.id || `inv-${Date.now()}`,
                invoiceNo: payload.invoiceNo || payload.invoiceNumber || `INV-${Date.now()}`,
                createdAt: payload.createdAt || new Date().toISOString(),
                status: payload.status || "PAID",
              };
              const updated = [newInvoice, ...existing];
              db.gourmet_pos_invoices = updated;
              db.invoices = updated;
              saveDb(db);
              broadcast({ gourmet_pos_invoices: updated });
              res.writeHead(200, { "Content-Type": "application/json" });
              return res.end(JSON.stringify({ success: true, data: newInvoice, invoice: newInvoice }));
            } catch (err) {
              res.writeHead(400, { "Content-Type": "application/json" });
              return res.end(JSON.stringify({ success: false, error: err.message }));
            }
          });
          return;
        }

        // REST API: POST /api/v1/orders/:id/settle
        const orderSettleMatch = req.url.match(/^\/api\/v1\/orders\/([^/]+)\/settle$/i);
        if (orderSettleMatch && req.method === "POST") {
          const targetOrderId = decodeURIComponent(orderSettleMatch[1]);
          let body = "";
          req.on("data", (chunk) => { body += chunk; });
          req.on("end", () => {
            try {
              const payload = JSON.parse(body || "{}");
              db = loadDb();
              const activeOrders = db.active_orders || [];
              const pastOrders = (db.gourmet_pos_past_orders_v2_inr || []).filter(
                (o) => o && String(o.status || "").toLowerCase() === "settled"
              );

              const activeOrder = activeOrders.find(
                (o) => String(o.id ?? o.orderId ?? "") === targetOrderId ||
                       String(o.tableId ?? "") === targetOrderId
              );

              const items = Array.isArray(payload.items) && payload.items.length
                ? payload.items
                : (activeOrder?.items || []);
              const itemsSubtotal = items.reduce(
                (s, it) => s + (Number(it.price || it.unitPrice || 0) * Number(it.quantity || it.qty || 1)),
                0
              );
              const subtotal = Number(payload.subtotal) > 0 ? Number(payload.subtotal) : itemsSubtotal;
              const discountPercent = Number(payload.discountPercent || activeOrder?.discountPercent || 0);
              const discountAmount = Math.round((subtotal * discountPercent) / 100);
              const taxableAmount = Math.max(0, subtotal - discountAmount);
              const taxAmount = Math.round(taxableAmount * 0.05);
              const grandTotal = taxableAmount + taxAmount;

              const now = new Date();
              const businessDate = getBusinessDateStr(now);
              const nextInvNo = payload.invoiceNumber || getNextInvoiceNoForServer(db, now);

              const settledOrder = {
                ...(activeOrder || {}),
                ...payload,
                id: activeOrder?.id || targetOrderId || `ord_${Date.now()}`,
                orderId: activeOrder?.orderId || targetOrderId || `ord_${Date.now()}`,
                invoiceNo: nextInvNo,
                invoiceNumber: nextInvNo,
                status: "Settled",
                Status: "Settled",
                paymentMethod: payload.paymentMethod || activeOrder?.paymentMethod || "Cash",
                paymentMode: payload.paymentMethod || activeOrder?.paymentMethod || "Cash",
                items,
                subtotal,
                discountPercent,
                discountAmount,
                taxableAmount,
                taxAmount,
                grandTotal,
                total: grandTotal,
                totalAmount: grandTotal,
                paidAmount: grandTotal,
                date: businessDate,
                settledDate: getBusinessDateKey(now),
                settledAt: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              };

              const nextPastOrders = [settledOrder, ...pastOrders];
              db.gourmet_pos_past_orders_v2_inr = nextPastOrders;
              db.active_orders = activeOrders.filter(
                (o) => String(o.id ?? o.orderId ?? "") !== targetOrderId &&
                       String(o.tableId ?? "") !== targetOrderId
              );

              saveDb(db);
              broadcast({
                gourmet_pos_past_orders_v2_inr: nextPastOrders,
                active_orders: db.active_orders,
              });

              res.writeHead(200, { "Content-Type": "application/json" });
              return res.end(JSON.stringify({ success: true, data: settledOrder, order: settledOrder }));
            } catch (err) {
              res.writeHead(400, { "Content-Type": "application/json" });
              return res.end(JSON.stringify({ success: false, error: err.message }));
            }
          });
          return;
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
        // REST API: /api/Kitchen/active-tickets
        if (req.url.match(/^\/api\/kitchen\/active-tickets/i) && req.method === "GET") {
          db = loadDb();
          const tables = db.gourmet_pos_tables_v2_inr || [];
          const tickets = [];
          tables.forEach((t) => {
            if (Array.isArray(t.items) && t.items.length) {
              tickets.push({
                ticketId: t.id,
                orderId: t.id,
                tableId: t.id,
                tableName: t.name || `Table ${t.id}`,
                section: t.area || "",
                serverName: t.server || "",
                kotBatch: 1,
                orderTime: new Date().toISOString(),
                ticketStatus: "Queued",
                items: t.items.map((it, idx) => ({
                  ...it,
                  id: it.id ?? idx + 1,
                  dishName: it.name,
                  category: it.category || "Beverage",
                  kotStatus: it.kotStatus || "Queued",
                })),
              });
            }
          });
          res.writeHead(200, { "Content-Type": "application/json" });
          return res.end(JSON.stringify(tickets));
        }

        // REST API: /api/Kitchen/items/:id/status
        if (req.url.match(/^\/api\/kitchen\/items\/[^/]+\/status/i) && req.method === "PATCH") {
          res.writeHead(200, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ success: true }));
        }

        // REST API: /api/Kitchen/tickets/...
        if (req.url.match(/^\/api\/kitchen\/tickets\//i) && req.method === "POST") {
          res.writeHead(200, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ success: true }));
        }

        if (req.url === "/api/v1/orders/active" && req.method === "GET") {
          db = loadDb();
          const orders = db.active_orders || [];
          res.writeHead(200, { "Content-Type": "application/json" });
          return res.end(JSON.stringify(orders));
        }

        const orderByTableMatch = req.url.match(/^\/api\/v1\/orders\/table\/([^/?]+)/i);
        if (orderByTableMatch && req.method === "GET") {
          const tableId = decodeURIComponent(orderByTableMatch[1]);
          db = loadDb();
          const order = (db.gourmet_pos_past_orders_v2_inr || []).find(
            (candidate) =>
              String(candidate.tableId ?? candidate.id) === tableId &&
              ["active", "billed"].includes(String(candidate.status || "").toLowerCase()),
          );
          res.writeHead(200, { "Content-Type": "application/json" });
          return res.end(JSON.stringify(order || null));
        }

        const sendOrderKotMatch = req.url.match(/^\/api\/v1\/orders\/([^/?]+)\/send-kot$/i);
        if (sendOrderKotMatch && req.method === "POST") {
          const orderId = decodeURIComponent(sendOrderKotMatch[1]);
          db = loadDb();
          const orders = db.gourmet_pos_past_orders_v2_inr || [];
          const order = orders.find((candidate) => String(candidate.id ?? candidate.orderId) === orderId);
          if (!order) {
            res.writeHead(404, { "Content-Type": "application/json" });
            return res.end(JSON.stringify({ success: false, error: "Order not found." }));
          }
          order.items = (order.items || []).map((item) => ({
            ...item,
            kotStatus: item.kotStatus || "received",
            kotSent: true,
          }));
          db.gourmet_pos_past_orders_v2_inr = orders;
          saveDb(db);
          broadcast({ gourmet_pos_past_orders_v2_inr: orders });
          res.writeHead(200, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ success: true, data: order }));
        }

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
              const activeOrders = db.active_orders || [];
              const tableId = String(orderData.tableId ?? "");
              const generatedOrderId = Number(orderData.id) || Date.now();
              const existingIndex = activeOrders.findIndex(
                (order) =>
                  tableId &&
                  String(order.tableId ?? "") === tableId &&
                  String(order.status || "").toLowerCase() === "active"
              );
              const savedOrder = existingIndex >= 0
                ? {
                    ...activeOrders[existingIndex],
                    ...orderData,
                    id: Number(activeOrders[existingIndex].id) || generatedOrderId,
                    orderId: Number(activeOrders[existingIndex].orderId) || generatedOrderId,
                    status: "Active",
                    items: [...(activeOrders[existingIndex].items || []), ...(orderData.items || [])],
                  }
                : {
                    ...orderData,
                    id: generatedOrderId,
                    orderId: generatedOrderId,
                    status: "Active",
                    createdAt: orderData.createdAt || new Date().toISOString(),
                  };
              if (existingIndex >= 0) {
                activeOrders[existingIndex] = savedOrder;
              } else {
                activeOrders.unshift(savedOrder);
              }
              db.active_orders = activeOrders;
              saveDb(db);
              broadcast({ active_orders: activeOrders });
              res.writeHead(200, { "Content-Type": "application/json" });
              return res.end(
                JSON.stringify({ success: true, data: savedOrder, order: savedOrder }),
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
              sendOtpEmail(found ? found.email : query, otp, found ? (found.fullName || found.username) : "User").catch(() => {});
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

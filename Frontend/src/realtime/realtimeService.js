import { HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import { API_BASE_URL } from "../api/apiConfig";

const hubEventNames = [
  "OrderUpdated",
  "TableStatusUpdated",
  "KitchenStatusAlert",
  "TakeawayOrderCreated",
  "TakeawayStatusUpdated",
  "TakeawayOrderCancelled",
  "ReceiveNewKOT",
  "KotOrderCreated",
  "KotOrderUpdated",
  "KotOrderCancelled",
  "KotItemAdded",
  "KotItemUpdated",
  "KotItemDeleted",
  "ReceiveNewBOT",
  "ReceiveBarKotCreated",
  "BarBotCancelled",
  "BarKotCancelled",
  "ReceiveBarKotUpdated",
  "ReceiveBarKotTableUpdated",
  "ReceiveBarKotItemUpdated",
  "ReceiveBarDrinkCreated",
  "ReceiveBarDrinkUpdated",
  "ReceiveBarDrinkDeleted",
  "ReceiveBarTableCreated",
  "ReceiveBarTableUpdated",
  "ReceiveBarTableDeleted",
  "ReceiveBarStaffCreated",
  "ReceiveBarStaffUpdated",
  "ReceiveBarStaffDeleted",
  "ReceiveInventoryCreated",
  "ReceiveInventoryUpdated",
  "ReceiveInventoryDeleted",
  "ReceiveInvoiceUpdated",
  "Connected",
  "StationJoined",
  "StationLeft",
  "RestaurantJoined",
  "RestaurantLeft",
  "ModuleSubscribed",
  "ModuleUnsubscribed",
  "AppEvent",
  "order:created", "order:updated", "order:statusChanged", "order:cancelled", "order:deleted",
  "order:itemDeleted", "order:itemUpdated", "order:discountApplied", "order:tableTransferred",
  "table:created", "table:updated", "table:deleted", "table:statusChanged",
  "payment:completed", "invoice:created", "invoice:updated", "invoice:settled", "invoice:statusChanged", "invoice:deleted",
  "state:synced", "tableLock:acquired", "tableLock:released", "TableLockUpdated",
  "takeaway:created", "takeaway:statusChanged", "takeaway:cancelled",
  "kot:created", "kot:statusChanged", "kot:cancelled", "kot:itemAdded", "kot:itemUpdated", "kot:itemDeleted",
  "bot:created", "bot:updated", "bot:itemUpdated",
  "bar:drinkCreated", "bar:drinkUpdated", "bar:drinkDeleted",
  "bar:tableCreated", "bar:tableUpdated", "bar:tableDeleted",
  "bar:staffCreated", "bar:staffUpdated", "bar:staffDeleted",
  "inventory:created", "inventory:updated", "inventory:deleted", "stock:updated",
  "menu:created", "menu:updated", "menu:availabilityChanged", "category:created", "category:deleted",
  "customer:created", "customer:updated", "customer:deleted", "audit:created",
  "attendance:checkedIn", "attendance:checkedOut", "promotion:created", "promotion:deleted",
  "user:passwordChanged", "user:deleted", "user:created", "user:updated",
  "dailyRegister:opened", "dailyRegister:reconciled", "dailyRegister:reopened",
  "account:created", "account:updated", "account:deleted", "journalEntry:created", "journalEntry:deleted", "journalEntry:voided", "expense:created",
  "delivery:created", "delivery:statusChanged", "salaryPayment:completed",
  "purchase:created", "restaurantSetting:updated",
  "reservation:created", "reservation:updated", "reservation:cancelled", "reservation:paymentCompleted", "reservation:statusChanged",
  "supplier:created", "supplier:deleted", "purchaseOrder:created", "purchaseOrder:statusChanged",
  "module:orders", "module:tables", "module:payments", "module:invoices", "module:state",
  "module:accounting", "module:expenses", "module:attendance", "module:audit", "module:bar",
  "module:customer", "module:delivery", "module:inventory", "module:kitchen", "module:menu",
  "module:promotions", "module:reservations", "module:settings", "module:salaries", "module:staff",
  "module:suppliers", "module:takeaway", "module:users", "module:journalvoucher", "module:payroll",
];

const sseListeners = new Set();
const realtimeListeners = new Set();
const statusListeners = new Set();
const recentEvents = new Map();
const routedEventIds = new Map();

let eventSource = null;
let hubConnection = null;
let hubStartPromise = null;
let activeToken = "";
let activeRole = "";
let sessionActive = false;
let retryTimer = null;
let retryAttempt = 0;
let sseStatus = "disconnected";
let hubStatus = "disconnected";
let generation = 0;
let sessionLifecycle = Promise.resolve();
let pendingStop = null;

const getEventUrl = () => {
  const token = activeToken || (typeof localStorage !== "undefined" ? localStorage.getItem("avsr_jwt_token") || localStorage.getItem("token") : "");
  const query = token ? `?access_token=${encodeURIComponent(token)}` : "";
  return `${API_BASE_URL}/api/events${query}`;
};

const getHubUrl = () => {
  return `${API_BASE_URL}/hubs/pos`;
};

function notifyStatus() {
  const isConnected = hubStatus === "connected" || sseStatus === "connected";
  let state = "disconnected";
  if (isConnected) {
    state = "connected";
  } else if (sessionActive) {
    const isOffline = typeof navigator !== "undefined" && !navigator.onLine;
    if (isOffline || retryAttempt >= 4) {
      state = "offline";
    } else if (hubStatus === "reconnecting" || sseStatus === "reconnecting" || hubStatus === "connecting") {
      state = "reconnecting";
    }
  }

  const status = {
    hub: hubStatus,
    sse: sseStatus,
    connected: isConnected,
    state,
    retryAttempt,
  };
  statusListeners.forEach((listener) => listener(status));
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    if (sessionActive) {
      retryAttempt = 0;
      hubStatus = "connecting";
      notifyStatus();
      startHub(generation);
    }
  });
}

function emitRealtimeEvent(name, payload, source) {
  let signature = "";
  try { signature = `${name}:${JSON.stringify(payload)}`; } catch { signature = name; }
  const now = Date.now();
  if (recentEvents.has(signature) && now - recentEvents.get(signature) < 120) return;
  recentEvents.set(signature, now);
  for (const [key, timestamp] of recentEvents) {
    if (now - timestamp > 1500) recentEvents.delete(key);
  }

  const event = { name, payload, source, receivedAt: now };
  realtimeListeners.forEach((listener) => listener(event));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("avsr:realtime", { detail: event }));
  }
}

function legacyEventAlias(eventType) {
  const type = String(eventType || "").toLowerCase();
  if (type.startsWith("order:")) return "OrderUpdated";
  if (type.startsWith("table:")) return "TableStatusUpdated";
  if (type === "tablelock:acquired" || type === "tablelock:released") return "TableLockUpdated";
  if (type.startsWith("payment:")) return "PaymentCompleted";
  if (type.startsWith("invoice:")) return "ReceiveInvoiceUpdated";
  if (type === "state:synced") return "StateSynced";
  if (type === "takeaway:created") return "TakeawayOrderCreated";
  if (type === "takeaway:statuschanged") return "TakeawayStatusUpdated";
  if (type === "takeaway:cancelled") return "TakeawayOrderCancelled";
  if (type === "kot:created") return "KotOrderCreated";
  if (type === "kot:cancelled") return "KotOrderCancelled";
  if (type.startsWith("kot:item")) {
    if (type === "kot:itemadded") return "KotItemAdded";
    if (type === "kot:itemdeleted") return "KotItemDeleted";
    return "KotItemUpdated";
  }
  if (type.startsWith("kot:")) return "KotOrderUpdated";
  if (type === "bot:created") return "ReceiveBarKotCreated";
  if (type === "bot:itemupdated") return "ReceiveBarKotItemUpdated";
  if (type.startsWith("bot:")) return "ReceiveBarKotUpdated";
  if (type === "bar:drinkcreated") return "ReceiveBarDrinkCreated";
  if (type === "bar:drinkdeleted") return "ReceiveBarDrinkDeleted";
  if (type.startsWith("bar:drink")) return "ReceiveBarDrinkUpdated";
  if (type === "bar:tablecreated") return "ReceiveBarTableCreated";
  if (type === "bar:tabledeleted") return "ReceiveBarTableDeleted";
  if (type.startsWith("bar:table")) return "ReceiveBarTableUpdated";
  if (type === "bar:staffcreated") return "ReceiveBarStaffCreated";
  if (type === "bar:staffdeleted") return "ReceiveBarStaffDeleted";
  if (type.startsWith("bar:staff")) return "ReceiveBarStaffUpdated";
  if (type === "inventory:created") return "ReceiveInventoryCreated";
  if (type === "inventory:deleted") return "ReceiveInventoryDeleted";
  if (type.startsWith("inventory:")) return "ReceiveInventoryUpdated";
  return null;
}

function publishRealtimeEvent(name, payload, source = "signalr") {
  emitRealtimeEvent(name, payload, source);

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return;
  const eventType = payload.eventType ?? payload.EventType;
  const moduleName = payload.module ?? payload.Module;
  if (typeof eventType !== "string" || !eventType) return;

  const eventId = payload.eventId ?? payload.EventId;
  const routeKey = String(eventId || `${eventType}:${payload.recordId ?? payload.RecordId ?? ""}:${payload.action ?? payload.Action ?? ""}:${payload.timestamp ?? payload.Timestamp ?? ""}`);
  const now = Date.now();
  if (routedEventIds.has(routeKey) && now - routedEventIds.get(routeKey) < 5000) return;
  routedEventIds.set(routeKey, now);
  for (const [key, timestamp] of routedEventIds) {
    if (now - timestamp > 10000) routedEventIds.delete(key);
  }

  const data = payload.data ?? payload.Data ?? payload;
  const typeKey = eventType.toLowerCase();
  // A generic AppEvent, a typed event, and its module event share one envelope.
  // Emit the event and module channels once so existing and new consumers see
  // the same backend record without processing its three transport copies.
  if (String(name).toLowerCase() !== typeKey) emitRealtimeEvent(eventType, payload, `${source}:routed`);
  const normalizedModule = String(moduleName || "").trim().toLowerCase();
  if (normalizedModule && String(name).toLowerCase() !== `module:${normalizedModule}`) {
    emitRealtimeEvent(`module:${normalizedModule}`, payload, `${source}:routed`);
  }

  const alias = legacyEventAlias(eventType);
  if (alias) emitRealtimeEvent(alias, data, `${source}:legacy-alias`);

}

function openEventStream() {
  if (typeof EventSource === "undefined" || eventSource || !sessionActive) return;
  try {
    const source = new EventSource(getEventUrl());
    eventSource = source;
    source.onopen = () => {
      if (eventSource !== source || !sessionActive) return;
      sseStatus = "connected";
      notifyStatus();
    };
    source.onmessage = (message) => {
      if (eventSource !== source || !sessionActive) return;
      sseListeners.forEach((listener) => listener(message));
      try {
        const parsed = JSON.parse(message.data);
        if (parsed?.type) publishRealtimeEvent(parsed.type, parsed.payload ?? parsed, "sse");
      } catch {}
    };
    source.onerror = () => {
      if (eventSource !== source || !sessionActive) return;
      sseStatus = source.readyState === EventSource.CLOSED ? "disconnected" : "reconnecting";
      notifyStatus();
      // EventSource owns reconnection. Keep the source open so its retry logic can run.
    };
  } catch (error) {
    sseStatus = "disconnected";
    notifyStatus();
    console.error("[Realtime] Failed to open the event stream.", error);
  }
}

function stationsForRole(role) {
  const normalized = String(role || "").toLowerCase();
  if (normalized === "admin") return ["floor", "kitchen", "bar", "admin"];
  if (normalized === "kot" || normalized.includes("kitchen")) return ["kitchen"];
  if (normalized === "bar") return ["bar"];
  return ["floor"];
}

async function joinStations(connection, role) {
  for (const station of stationsForRole(role)) {
    try {
      await connection.invoke("JoinStation", station);
    } catch (error) {
      console.error(`[SignalR] Failed to join station "${station}".`, error);
    }
  }
}

function scheduleHubRetry(currentGeneration) {
  if (!sessionActive || retryTimer || currentGeneration !== generation) return;
  const delay = Math.min(30000, 1000 * (2 ** Math.min(retryAttempt, 5)));
  retryAttempt += 1;
  retryTimer = window.setTimeout(() => {
    retryTimer = null;
    if (sessionActive && currentGeneration === generation) startHub(currentGeneration);
  }, delay);
}

async function startHubAttempt(currentGeneration) {
  if (!sessionActive || currentGeneration !== generation || hubConnection) return;
  hubStatus = "connecting";
  notifyStatus();

  const connection = new HubConnectionBuilder()
    .withUrl(getHubUrl(), {
      accessTokenFactory: () => activeToken || "",
    })
    .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
    .configureLogging(import.meta.env.DEV ? LogLevel.Warning : LogLevel.Error)
    .build();

  hubConnection = connection;
  for (const eventName of hubEventNames) {
    connection.on(eventName, (payload) => {
      if (eventName === "Connected") {
        console.info("[SignalR] POS hub authenticated connection established", {
          connectionId: payload?.connectionId,
          userId: payload?.userId,
          restaurantId: payload?.branchId,
          role: payload?.role,
          authenticated: payload?.authenticated,
        });
      }
      publishRealtimeEvent(eventName, payload, "signalr");
    });
  }

  connection.onreconnecting(() => {
    if (hubConnection !== connection || currentGeneration !== generation) return;
    hubStatus = "reconnecting";
    notifyStatus();
  });
  connection.onreconnected(async () => {
    if (!sessionActive || hubConnection !== connection || currentGeneration !== generation) return;
    retryAttempt = 0;
    hubStatus = "connected";
    console.info("[SignalR] POS hub reconnected", { connectionId: connection.connectionId });
    notifyStatus();
    await joinStations(connection, activeRole);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("avsr:realtime-reconnected"));
    }
  });
  connection.onclose((error) => {
    if (hubConnection !== connection || currentGeneration !== generation) return;
    hubConnection = null;
    hubStatus = "disconnected";
    notifyStatus();
    if (error) console.error("[SignalR] Connection closed unexpectedly.", error);
    scheduleHubRetry(currentGeneration);
  });

  try {
    await connection.start();
    if (!sessionActive || currentGeneration !== generation) {
      await connection.stop();
      if (hubConnection === connection) hubConnection = null;
      return;
    }
    retryAttempt = 0;
    hubStatus = "connected";
    notifyStatus();
    await joinStations(connection, activeRole);
  } catch (error) {
    if (hubConnection === connection) hubConnection = null;
    if (sessionActive && currentGeneration === generation) {
      hubStatus = "reconnecting";
    } else {
      hubStatus = "disconnected";
    }
    notifyStatus();
    console.error("[SignalR] Failed to start the POS hub connection.", error);
    try {
      await connection.stop();
    } catch (stopError) {
      console.error("[SignalR] Failed to clean up a stopped start attempt.", stopError);
    }
    scheduleHubRetry(currentGeneration);
  }
}

function startHub(currentGeneration) {
  if (!sessionActive || currentGeneration !== generation || hubConnection) {
    return hubStartPromise || Promise.resolve();
  }
  if (hubStartPromise) return hubStartPromise;

  const attempt = startHubAttempt(currentGeneration);
  hubStartPromise = attempt.finally(() => {
    if (hubStartPromise === wrappedAttempt) hubStartPromise = null;
  });
  const wrappedAttempt = hubStartPromise;
  return wrappedAttempt;
}

function cancelPendingStop() {
  if (!pendingStop) return;
  window.clearTimeout(pendingStop.timer);
  pendingStop.resolve();
  pendingStop = null;
}

export async function startRealtimeSession(token, role) {
  const nextToken = String(token || "");
  const nextRole = String(role || "pos").toLowerCase();
  if (!nextToken) return stopRealtimeSession();
  cancelPendingStop();
  const operation = sessionLifecycle.then(async () => {
    if (sessionActive && activeToken === nextToken && activeRole === nextRole) return;
    await stopRealtimeSessionNow();
    generation += 1;
    sessionActive = true;
    activeToken = nextToken;
    activeRole = nextRole;
    sseStatus = "connecting";
    hubStatus = "connecting";
    notifyStatus();
    openEventStream();
    await startHub(generation);
  });
  sessionLifecycle = operation.catch(() => {});
  return operation;
}

async function stopRealtimeSessionNow() {
  generation += 1;
  sessionActive = false;
  activeToken = "";
  activeRole = "";
  if (retryTimer) window.clearTimeout(retryTimer);
  retryTimer = null;
  const pendingHubStart = hubStartPromise;
  if (pendingHubStart) await pendingHubStart;
  if (eventSource) eventSource.close();
  eventSource = null;
  sseStatus = "disconnected";
  const connection = hubConnection;
  hubConnection = null;
  hubStatus = "disconnected";
  notifyStatus();
  if (connection) {
    for (const eventName of hubEventNames) connection.off(eventName);
    try {
      await connection.stop();
    } catch (error) {
      console.error("[SignalR] Failed to stop the POS hub connection cleanly.", error);
    }
  }
}

export function stopRealtimeSession() {
  cancelPendingStop();
  return new Promise((resolve) => {
    const stopRequest = {
      timer: window.setTimeout(() => {
        if (pendingStop !== stopRequest) return;
        pendingStop = null;
        const operation = sessionLifecycle.then(stopRealtimeSessionNow);
        sessionLifecycle = operation.catch(() => {});
        operation.then(resolve, (error) => {
          console.error("[SignalR] Failed to stop the POS realtime session.", error);
          resolve();
        });
      }, 0),
      resolve,
    };
    pendingStop = stopRequest;
  });
}

export function subscribeToSseMessages(listener) {
  sseListeners.add(listener);
  return () => sseListeners.delete(listener);
}

export function getRealtimeConnectionStatus() {
  return {
    hub: hubStatus,
    sse: sseStatus,
    connected: hubStatus === "connected" || sseStatus === "connected",
    state: hubStatus === "connected" || sseStatus === "connected"
      ? "connected"
      : sessionActive && (hubStatus === "reconnecting" || sseStatus === "reconnecting" || hubStatus === "connecting")
        ? "reconnecting"
        : "disconnected",
  };
}

export function subscribeToRealtimeEvents(listener) {
  realtimeListeners.add(listener);
  return () => realtimeListeners.delete(listener);
}

export function subscribeToRealtimeStatus(listener) {
  statusListeners.add(listener);
  listener(getRealtimeConnectionStatus());
  return () => statusListeners.delete(listener);
}

export const REALTIME_HUB_EVENTS = hubEventNames;

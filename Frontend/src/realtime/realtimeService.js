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
];

const sseListeners = new Set();
const realtimeListeners = new Set();
const statusListeners = new Set();
const recentEvents = new Map();

let eventSource = null;
let hubConnection = null;
let activeToken = "";
let activeRole = "";
let sessionActive = false;
let retryTimer = null;
let retryAttempt = 0;
let sseStatus = "disconnected";
let hubStatus = "disconnected";
let generation = 0;
let sessionLifecycle = Promise.resolve();

const getEventUrl = () => import.meta.env.DEV
  ? "/api/events"
  : `${API_BASE_URL || window.location.origin}/api/events`;

const getHubUrl = () => import.meta.env.DEV
  ? `${window.location.origin}/hubs/pos`
  : `${API_BASE_URL || window.location.origin}/hubs/pos`;

function notifyStatus() {
  const status = {
    hub: hubStatus,
    sse: sseStatus,
    connected: hubStatus === "connected" || sseStatus === "connected",
    state: hubStatus === "connected" || sseStatus === "connected"
      ? "connected"
      : sessionActive && (hubStatus === "reconnecting" || sseStatus === "reconnecting" || hubStatus === "connecting")
        ? "reconnecting"
        : "disconnected",
  };
  statusListeners.forEach((listener) => listener(status));
}

function publishRealtimeEvent(name, payload, source = "signalr") {
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

function openEventStream() {
  if (typeof EventSource === "undefined" || eventSource || !sessionActive) return;
  try {
    const source = new EventSource(getEventUrl());
    eventSource = source;
    source.onopen = () => {
      if (eventSource !== source) return;
      sseStatus = "connected";
      notifyStatus();
    };
    source.onmessage = (message) => {
      sseListeners.forEach((listener) => listener(message));
      try {
        const parsed = JSON.parse(message.data);
        if (parsed?.type) publishRealtimeEvent(parsed.type, parsed.payload ?? parsed, "sse");
      } catch {}
    };
    source.onerror = () => {
      if (eventSource !== source) return;
      sseStatus = source.readyState === EventSource.CLOSED ? "disconnected" : "reconnecting";
      notifyStatus();
      // EventSource owns reconnection. Keep the source open so its retry logic can run.
    };
  } catch {
    sseStatus = "disconnected";
    notifyStatus();
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
    try { await connection.invoke("JoinStation", station); } catch {}
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

async function startHub(currentGeneration) {
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
    connection.on(eventName, (payload) => publishRealtimeEvent(eventName, payload, "signalr"));
  }

  connection.onreconnecting(() => {
    hubStatus = "reconnecting";
    notifyStatus();
  });
  connection.onreconnected(async () => {
    retryAttempt = 0;
    hubStatus = "connected";
    notifyStatus();
    await joinStations(connection, activeRole);
    if (typeof window !== "undefined") window.dispatchEvent(new Event("avsr:realtime-reconnected"));
  });
  connection.onclose(() => {
    if (hubConnection !== connection) return;
    hubConnection = null;
    hubStatus = "disconnected";
    notifyStatus();
    scheduleHubRetry(currentGeneration);
  });

  try {
    await connection.start();
    if (!sessionActive || currentGeneration !== generation) {
      await connection.stop();
      return;
    }
    retryAttempt = 0;
    hubStatus = "connected";
    notifyStatus();
    await joinStations(connection, activeRole);
  } catch {
    if (hubConnection === connection) hubConnection = null;
    hubStatus = "reconnecting";
    notifyStatus();
    try { await connection.stop(); } catch {}
    scheduleHubRetry(currentGeneration);
  }
}

export async function startRealtimeSession(token, role) {
  const nextToken = String(token || "");
  const nextRole = String(role || "pos").toLowerCase();
  if (!nextToken) return stopRealtimeSession();
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
    startHub(generation);
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
  if (eventSource) eventSource.close();
  eventSource = null;
  sseStatus = "disconnected";
  const connection = hubConnection;
  hubConnection = null;
  hubStatus = "disconnected";
  notifyStatus();
  if (connection) {
    for (const eventName of hubEventNames) connection.off(eventName);
    try { await connection.stop(); } catch {}
  }
}

export function stopRealtimeSession() {
  const operation = sessionLifecycle.then(stopRealtimeSessionNow);
  sessionLifecycle = operation.catch(() => {});
  return operation;
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

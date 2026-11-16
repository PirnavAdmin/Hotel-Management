import { createHmac } from 'crypto';

const BASE_URL = 'http://localhost:5018';
const WS_URL = 'ws://localhost:5018/hubs/pos';
const JWT_SECRET = Buffer.from('QduutUQwQf7LtXbvz+Er8BUO7Ak0pq33vmytbiVYVAw=', 'utf8');

// Helper to craft valid JWT for different roles & branches
function createTestJwt({ userId, userName, role, branchId = 1, expiresInSeconds = 3600 }) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: String(userId),
    'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier': String(userId),
    'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name': userName,
    'http://schemas.microsoft.com/ws/2008/06/identity/claims/role': role,
    role: role,
    userId: String(userId),
    branchId: String(branchId),
    iss: 'HMS',
    aud: 'HMS-POS',
    nbf: now - 10,
    exp: now + expiresInSeconds,
    iat: now
  };

  const b64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
  const b64Payload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', JWT_SECRET)
    .update(`${b64Header}.${b64Payload}`)
    .digest('base64url');

  return `${b64Header}.${b64Payload}.${signature}`;
}

// Connect a SignalR client using native WebSocket in Node.js
function connectSignalR(token, name = 'client') {
  return new Promise((resolve, reject) => {
    const url = token ? `${WS_URL}?access_token=${encodeURIComponent(token)}` : WS_URL;
    const ws = new WebSocket(url);
    const receivedEvents = [];
    const receivedMessages = [];
    let isHandshakeComplete = false;

    ws.onopen = () => {
      ws.send(JSON.stringify({ protocol: 'json', version: 1 }) + '\x1e');
    };

    ws.onmessage = (event) => {
      const dataStr = event.data.toString();
      const chunks = dataStr.split('\x1e').filter(c => c.trim().length > 0);

      for (const chunk of chunks) {
        try {
          const msg = JSON.parse(chunk);
          if (!isHandshakeComplete) {
            isHandshakeComplete = true;
            resolve({
              name,
              ws,
              receivedEvents,
              receivedMessages,
              sendInvocation(target, args = [], invocationId = null) {
                const payload = {
                  type: 1, // Invocation
                  target,
                  arguments: args
                };
                if (invocationId) payload.invocationId = String(invocationId);
                ws.send(JSON.stringify(payload) + '\x1e');
              },
              close() {
                try { ws.close(); } catch {}
              }
            });
            continue;
          }

          receivedMessages.push(msg);

          // Type 1: Server invocation / event push
          if (msg.type === 1) {
            if (msg.arguments && msg.arguments[0]) {
              const arg = msg.arguments[0];
              if (typeof arg === 'object' && arg.eventType) {
                receivedEvents.push(arg);
              } else {
                receivedEvents.push({ target: msg.target, data: arg });
              }
            }
          }
        } catch (e) {
          console.error(`[${name}] Failed to parse message chunk:`, chunk, e);
        }
      }
    };

    ws.onerror = (err) => {
      if (!isHandshakeComplete) {
        reject(err);
      }
    };

    ws.onclose = () => {};
  });
}

async function runTestSuite() {
  console.log('====================================================');
  console.log('   RUNNING COMPLETE REAL-TIME SYNCHRONIZATION TEST  ');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`[PASS] ${testName} ${details ? `(${details})` : ''}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName} ${details ? `(${details})` : ''}`);
      failed++;
    }
  }

  // 1. Diagnostics endpoint
  console.log('--- TEST 1: Real-time Diagnostics API ---');
  try {
    const res = await fetch(`${BASE_URL}/api/v1/realtime/status`);
    const data = await res.json();
    assert(data.success === true && data.status === 'healthy', 'Diagnostics Status Endpoint', `protocol: ${data.protocol}`);
  } catch (err) {
    assert(false, 'Diagnostics Status Endpoint', err.message);
  }

  // 2. Authentication & Authorization Tests
  console.log('\n--- TEST 2: Security, Authentication & Group Isolation ---');
  const adminToken = createTestJwt({ userId: 1, userName: 'pirnav', role: 'Admin', branchId: 1 });
  const kitchenToken = createTestJwt({ userId: 19, userName: 'kot3', role: 'Kitchen KOT', branchId: 1 });
  const waiterToken = createTestJwt({ userId: 8, userName: 'ravi.kumar', role: 'User POS', branchId: 1 });

  // 2a. Reject unauthorized connection attempt without token
  try {
    const unauthClient = await connectSignalR('', 'unauth');
    await new Promise(r => setTimeout(r, 400));
    const wasAborted = unauthClient.ws.readyState === 2 || unauthClient.ws.readyState === 3;
    assert(wasAborted, 'Reject connection without JWT', 'Connection aborted by server');
    unauthClient.close();
  } catch (err) {
    assert(true, 'Reject connection without JWT token', 'Rejected cleanly');
  }

  // 2b. Connect Authorized Clients (Multi-user simultaneous sessions)
  let adminClient, kitchenClient, waiterClient;
  try {
    adminClient = await connectSignalR(adminToken, 'AdminClient');
    kitchenClient = await connectSignalR(kitchenToken, 'KitchenClient');
    waiterClient = await connectSignalR(waiterToken, 'WaiterClient');

    await new Promise(r => setTimeout(r, 300));

    const adminConn = adminClient.receivedEvents.find(e => e.target === 'Connected');
    assert(adminConn && adminConn.data.authenticated === true, 'Admin Client Authenticated via SignalR', `Role: ${adminConn?.data?.role}`);

    const kitchenConn = kitchenClient.receivedEvents.find(e => e.target === 'Connected');
    assert(kitchenConn && kitchenConn.data.authenticated === true, 'Kitchen Client Authenticated via SignalR', `Role: ${kitchenConn?.data?.role}`);

    const waiterConn = waiterClient.receivedEvents.find(e => e.target === 'Connected');
    assert(waiterConn && waiterConn.data.authenticated === true, 'Waiter Client Authenticated via SignalR', `Role: ${waiterConn?.data?.role}`);
  } catch (err) {
    assert(false, 'Simultaneous connections for Admin, Kitchen, and Waiter clients', err.message);
  }

  // 2c. Verify active connection count in diagnostics
  try {
    const res = await fetch(`${BASE_URL}/api/v1/realtime/status`);
    const data = await res.json();
    assert(data.activeConnections >= 3, 'Connection Tracking Diagnostics', `Active Connections: ${data.activeConnections}`);
  } catch (err) {
    assert(false, 'Connection Tracking Diagnostics', err.message);
  }

  // 2d. Ping via Hub
  try {
    adminClient.sendInvocation('Ping', [], 'ping-1');
    await new Promise(r => setTimeout(r, 200));
    const pingResp = adminClient.receivedMessages.find(m => m.invocationId === 'ping-1');
    assert(pingResp && pingResp.result && pingResp.result.status === 'pong', 'Hub Ping / Latency Check', `Status: ${pingResp?.result?.status}`);
  } catch (err) {
    assert(false, 'Hub Ping / Latency Check', err.message);
  }

  // 2e. Restaurant-level Data Isolation: Non-admin trying to join another branch group
  try {
    waiterClient.sendInvocation('JoinRestaurant', [999], 'join-branch-999');
    await new Promise(r => setTimeout(r, 200));
    const joinResp = waiterClient.receivedMessages.find(m => m.invocationId === 'join-branch-999');
    const isDenied = joinResp && joinResp.result && joinResp.result.success === false;
    assert(isDenied, 'Restaurant Isolation Enforcement: Non-Admin Rejected from Branch 999', joinResp?.result?.message);
  } catch (err) {
    assert(false, 'Restaurant Isolation Enforcement', err.message);
  }

  // 2f. Admin joining another branch is allowed
  try {
    adminClient.sendInvocation('JoinRestaurant', [999], 'admin-join-999');
    await new Promise(r => setTimeout(r, 200));
    const adminJoinResp = adminClient.receivedMessages.find(m => m.invocationId === 'admin-join-999');
    const isAllowed = adminJoinResp && adminJoinResp.result && adminJoinResp.result.success === true;
    assert(isAllowed, 'Admin Privileged Restaurant Switching Allowed', adminJoinResp?.result?.message);
  } catch (err) {
    assert(false, 'Admin Privileged Restaurant Switching', err.message);
  }

  // 3. Real-Time Events Verification across Modules
  console.log('\n--- TEST 3: Database-backed Real-Time Event Publishing ---');

  // 3a. Table Lock acquisition
  try {
    adminClient.receivedEvents.length = 0;
    waiterClient.receivedEvents.length = 0;
    kitchenClient.receivedEvents.length = 0;

    // Release any previous lock on table 1
    await fetch(`${BASE_URL}/api/v1/tables/1/unlock?userId=1`, { method: 'POST' });
    await new Promise(r => setTimeout(r, 100));

    waiterClient.receivedEvents.length = 0;

    // Acquire lock
    const lockRes = await fetch(`${BASE_URL}/api/v1/tables/1/lock`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        tableId: '1',
        userId: '1',
        username: 'pirnav',
        serverName: 'pirnav'
      })
    });
    const lockData = await lockRes.json();
    await new Promise(r => setTimeout(r, 300));

    const lockEvt = waiterClient.receivedEvents.find(e => e.eventType === 'tableLock:acquired');
    assert(lockData.success === true && lockEvt, 'Table Lock Synchronization Event Broadcast', `Table ID: ${lockEvt?.recordId}`);
  } catch (err) {
    assert(false, 'Table Lock Synchronization Event Broadcast', err.message);
  }

  // 3b. Inventory Stock Adjustment
  try {
    waiterClient.receivedEvents.length = 0;
    adminClient.receivedEvents.length = 0;

    const stockRes = await fetch(`${BASE_URL}/api/v1/inventory/adjust`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ingredientId: 1,
        quantityChange: 1,
        reason: 'Realtime test inventory sync verification'
      })
    });
    const stockData = await stockRes.json();
    await new Promise(r => setTimeout(r, 300));

    const stockEvt = adminClient.receivedEvents.find(e => e.eventType === 'stock:updated');
    assert(stockData.success === true && stockEvt, 'Inventory Stock Adjustment Real-Time Event', `Event ID: ${stockEvt?.eventId}`);
  } catch (err) {
    assert(false, 'Inventory Stock Adjustment Real-Time Event', err.message);
  }

  // 3c. Customer Creation
  try {
    adminClient.receivedEvents.length = 0;
    waiterClient.receivedEvents.length = 0;

    const randPhone = '9' + Math.floor(100000000 + Math.random() * 900000000);
    const custRes = await fetch(`${BASE_URL}/api/v1/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Realtime Test Customer',
        phone: randPhone,
        email: 'test@realtime.com'
      })
    });
    const custData = await custRes.json();
    await new Promise(r => setTimeout(r, 300));

    const custEvt = waiterClient.receivedEvents.find(e => e.eventType === 'customer:created');
    assert(custData.success === true && custEvt, 'Customer Module Real-Time Event', `Customer ID: ${custEvt?.recordId}`);
  } catch (err) {
    assert(false, 'Customer Module Real-Time Event', err.message);
  }

  // 3d. Menu Item Update / Availability Change
  try {
    adminClient.receivedEvents.length = 0;
    waiterClient.receivedEvents.length = 0;

    const menuRes = await fetch(`${BASE_URL}/api/v1/menu-items/1/availability`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isAvailable: true })
    });
    const menuData = await menuRes.json();
    await new Promise(r => setTimeout(r, 300));

    const menuEvt = waiterClient.receivedEvents.find(e => e.eventType === 'menu:availabilityChanged');
    assert(menuData.success === true && menuEvt, 'Menu Availability Real-Time Event', `Item ID: ${menuEvt?.recordId}`);
  } catch (err) {
    assert(false, 'Menu Availability Real-Time Event', err.message);
  }

  // 3e. Takeaway / Order Creation
  try {
    adminClient.receivedEvents.length = 0;
    waiterClient.receivedEvents.length = 0;
    kitchenClient.receivedEvents.length = 0;

    const orderRes = await fetch(`${BASE_URL}/api/v1/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        orderType: 'Takeaway',
        isTakeaway: true,
        customerName: 'Takeaway Realtime Test',
        customerPhone: '9888877777',
        items: [
          { menuItemId: 1, itemName: 'Test Dish', quantity: 1, unitPrice: 150 }
        ]
      })
    });
    const orderData = await orderRes.json();
    await new Promise(r => setTimeout(r, 400));

    const orderEvt = adminClient.receivedEvents.find(e => e.eventType === 'order:created' || e.eventType === 'kot:created');
    assert(orderData.success === true && orderEvt, 'Order Creation Real-Time Event', `Order ID: ${orderEvt?.recordId}`);
  } catch (err) {
    assert(false, 'Order Creation Real-Time Event', err.message);
  }

  // 4. Network Disconnection, Reconnection & Missed Events Recovery
  console.log('\n--- TEST 4: Network Disconnection & Missed Events Recovery ---');
  try {
    // 4a. Connect Client D
    const clientDToken = createTestJwt({ userId: 10, userName: 'reconnect_test', role: 'Admin', branchId: 1 });
    const clientD = await connectSignalR(clientDToken, 'ClientD');
    assert(true, 'Client D Connected Initially');

    // Fetch latest event id so far
    const recentRes = await fetch(`${BASE_URL}/api/v1/realtime/recent-events?limit=5`);
    const recentData = await recentRes.json();
    const eventList = recentData.data || recentData.events || [];
    const lastEventId = eventList.length > 0 ? eventList[eventList.length - 1].eventId : null;

    // 4b. Disconnect Client D (simulate network drop)
    clientD.close();
    console.log(`[INFO] Client D disconnected. Last seen event ID: ${lastEventId}`);
    await new Promise(r => setTimeout(r, 200));

    // 4c. Trigger a DB operation while Client D is offline
    const triggerRes = await fetch(`${BASE_URL}/api/v1/inventory/adjust`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ingredientId: 1,
        quantityChange: -1,
        reason: 'Offline event trigger for missed-events replay'
      })
    });
    await new Promise(r => setTimeout(r, 300));

    // 4d. Reconnect Client D and fetch missed events via REST endpoint and SignalR Hub
    const missedRes = await fetch(`${BASE_URL}/api/v1/realtime/missed-events?lastEventId=${encodeURIComponent(lastEventId || '')}`);
    const missedData = await missedRes.json();
    const missedList = missedData.data || missedData.events || [];

    const recovered = missedList.length > 0 && missedList.some(e => e.eventType === 'stock:updated');
    assert(recovered, 'Missed Events Recovery After Reconnection via REST', `Recovered ${missedList.length} missed events`);

    // Reconnect Client D over SignalR
    const clientD2 = await connectSignalR(clientDToken, 'ClientD_Reconnected');
    clientD2.sendInvocation('GetMissedEvents', [1, lastEventId, 50], 'missed-1');
    await new Promise(r => setTimeout(r, 300));

    const hubMissedResp = clientD2.receivedMessages.find(m => m.invocationId === 'missed-1');
    const hubRecovered = hubMissedResp && hubMissedResp.result && hubMissedResp.result.count > 0;
    assert(hubRecovered, 'Missed Events Recovery via Hub Invocation', `Events: ${hubMissedResp?.result?.count}`);
    clientD2.close();
  } catch (err) {
    assert(false, 'Missed Events Recovery After Reconnection', err.message);
  }

  // 5. Cleanup connections
  adminClient?.close();
  kitchenClient?.close();
  waiterClient?.close();

  console.log('\n====================================================');
  console.log(`   TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  process.exit(failed > 0 ? 1 : 0);
}

runTestSuite();

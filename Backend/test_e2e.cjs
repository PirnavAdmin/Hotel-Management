const http = require('http');

function request(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '127.0.0.1',
      port: 5018,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(body); } catch(e) {}
        resolve({ status: res.statusCode, headers: res.headers, body: json || body });
      });
    });

    req.on('error', (e) => reject(e));
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log('=== HMS RESTAURANT TABLES END-TO-END TEST SUITE ===\n');

  let testTableId = null;

  // Test 1: Create Table with Unique Identifier
  console.log('--- Test 1: Create Table with Unique Identifier (T-55) ---');
  const createPayload = {
    tableNumber: 'T-55',
    branchId: 1,
    location: 'Rooftop',
    capacity: 6,
    assignedServerId: 1,
    status: 'available'
  };
  const res1 = await request('POST', '/api/v1/tables', createPayload);
  console.log(`Status: ${res1.status}`);
  console.log('Response:', JSON.stringify(res1.body, null, 2));
  if (res1.status === 201 && res1.body?.data?.tableId) {
    testTableId = res1.body.data.tableId;
    console.log(`✅ Test 1 PASSED: Created table with ID ${testTableId}`);
  } else {
    console.log('❌ Test 1 FAILED');
  }

  // Test 2 & 4: GET by ID and GET all tables
  console.log('\n--- Test 2: GET Table by ID & Verify Assigned Server ---');
  if (testTableId) {
    const res2 = await request('GET', `/api/v1/tables/${testTableId}`);
    console.log(`Status: ${res2.status}`);
    console.log('Response:', JSON.stringify(res2.body, null, 2));
    if (res2.body?.data?.tableNumber === 'T-55' && res2.body?.data?.assignedServerName) {
      console.log(`✅ Test 2 PASSED: Table ${res2.body.data.tableNumber} retrieved, Server: ${res2.body.data.assignedServerName}`);
    } else {
      console.log('❌ Test 2 FAILED');
    }
  }

  // Test 4b: GET /api/v1/state
  console.log('\n--- Test 4: GET /api/v1/state runtime bootstrap ---');
  const resState = await request('GET', '/api/v1/state');
  console.log(`Status: ${resState.status}`);
  const stateTables = resState.body?.data?.tables || resState.body?.tables || [];
  const foundInState = stateTables.find(t => String(t.id) === String(testTableId) || t.tableNumber === 'T-55');
  if (foundInState) {
    console.log(`✅ Test 4 PASSED: T-55 found in state API with tableNumber="${foundInState.tableNumber}", server="${foundInState.server}"`);
  } else {
    console.log('❌ Test 4 FAILED: Not found in /api/v1/state');
  }

  // Test 5: Update Table (Edit)
  console.log('\n--- Test 5: Update Table (Edit) capacity -> 8, location -> Terrace ---');
  if (testTableId) {
    const updatePayload = {
      tableNumber: 'T-55',
      branchId: 1,
      location: 'Terrace',
      capacity: 8,
      status: 'available',
      assignedServerId: 2
    };
    const res5 = await request('PUT', `/api/v1/tables/${testTableId}`, updatePayload);
    console.log(`Status: ${res5.status}`);
    console.log('Response:', JSON.stringify(res5.body, null, 2));
    if (res5.status === 200 && res5.body?.data?.capacity === 8 && res5.body?.data?.location === 'Terrace') {
      console.log('✅ Test 5 PASSED: Table updated successfully.');
    } else {
      console.log('❌ Test 5 FAILED');
    }
  }

  // Test 8: Duplicate Identifier (Must return 409 Conflict)
  console.log('\n--- Test 8: Duplicate Table Number (T-55) ---');
  const res8 = await request('POST', '/api/v1/tables', createPayload);
  console.log(`Status: ${res8.status} (Expected 409 Conflict)`);
  console.log('Response:', JSON.stringify(res8.body, null, 2));
  if (res8.status === 409) {
    console.log('✅ Test 8 PASSED: Duplicate table rejected with HTTP 409 Conflict!');
  } else {
    console.log('❌ Test 8 FAILED: Expected 409 Conflict.');
  }

  // Test 9: Invalid Branch ID
  console.log('\n--- Test 9: Invalid Branch ID (99999) ---');
  const res9 = await request('POST', '/api/v1/tables', {
    tableNumber: 'T-99',
    branchId: 99999,
    capacity: 4
  });
  console.log(`Status: ${res9.status} (Expected 400 Bad Request)`);
  console.log('Response:', JSON.stringify(res9.body, null, 2));
  if (res9.status === 400) {
    console.log('✅ Test 9 PASSED: Non-existent branch rejected with HTTP 400 Bad Request!');
  } else {
    console.log('❌ Test 9 FAILED');
  }

  // Test 10: Invalid Status Value
  console.log('\n--- Test 10: Invalid Status Value ("flying") ---');
  const res10 = await request('POST', '/api/v1/tables', {
    tableNumber: 'T-99',
    status: 'flying',
    capacity: 4
  });
  console.log(`Status: ${res10.status} (Expected 400 Bad Request)`);
  console.log('Response:', JSON.stringify(res10.body, null, 2));
  if (res10.status === 400) {
    console.log('✅ Test 10 PASSED: Invalid status rejected with HTTP 400 Bad Request!');
  } else {
    console.log('❌ Test 10 FAILED');
  }

  // Test 11: Invalid Assigned Server ID
  console.log('\n--- Test 11: Invalid Assigned Server ID (99999) ---');
  const res11 = await request('POST', '/api/v1/tables', {
    tableNumber: 'T-99',
    assignedServerId: 99999,
    capacity: 4
  });
  console.log(`Status: ${res11.status} (Expected 400 Bad Request)`);
  console.log('Response:', JSON.stringify(res11.body, null, 2));
  if (res11.status === 400) {
    console.log('✅ Test 11 PASSED: Non-existent server rejected with HTTP 400 Bad Request!');
  } else {
    console.log('❌ Test 11 FAILED');
  }

  // Test 11b: Table identifier > 10 characters (Must be rejected)
  console.log('\n--- Test 11b: Table Number > 10 Chars ("TABLE-VERY-LONG-123") ---');
  const res11b = await request('POST', '/api/v1/tables', {
    tableNumber: 'TABLE-VERY-LONG-123',
    capacity: 4
  });
  console.log(`Status: ${res11b.status} (Expected 400 Bad Request)`);
  console.log('Response:', JSON.stringify(res11b.body, null, 2));
  if (res11b.status === 400) {
    console.log('✅ Test 11b PASSED: Length > 10 rejected with HTTP 400 Bad Request!');
  } else {
    console.log('❌ Test 11b FAILED');
  }

  // Test 11c: Swagger payload with both tableNumber and tableName/name (Must SUCCEED with 201 Created)
  console.log('\n--- Test 11c: Table with TableNumber="T-103", TableName="Table 103", Name="Table 103" ---');
  let test103Id = null;
  const res11c = await request('POST', '/api/v1/tables', {
    tableNumber: 'T-103',
    tableName: 'Table 103',
    name: 'Table 103',
    branchId: 1,
    capacity: 4,
    location: 'Main Hall'
  });
  console.log(`Status: ${res11c.status} (Expected 201 Created)`);
  console.log('Response:', JSON.stringify(res11c.body, null, 2));
  if (res11c.status === 201 && res11c.body?.data?.tableNumber === 'T-103') {
    test103Id = res11c.body.data.tableId;
    console.log(`✅ Test 11c PASSED: Table created with tableNumber="T-103" and ID ${test103Id}!`);
    // Clean up T-103
    await request('DELETE', `/api/v1/tables/${test103Id}`);
  } else {
    console.log('❌ Test 11c FAILED: Could not create table with both tableNumber and tableName.');
  }

  // Test 6: Delete Table
  console.log('\n--- Test 6: Delete Table (ID ' + testTableId + ') ---');
  if (testTableId) {
    const res6 = await request('DELETE', `/api/v1/tables/${testTableId}`);
    console.log(`Status: ${res6.status}`);
    console.log('Response:', JSON.stringify(res6.body, null, 2));
    if (res6.status === 200) {
      console.log('✅ Test 6 PASSED: Table deleted successfully.');
    } else {
      console.log('❌ Test 6 FAILED');
    }
  }

  // Test 7: Verify Table Does NOT Reappear After Deletion
  console.log('\n--- Test 7: Verify Table Does NOT Reappear After Deletion ---');
  const res7 = await request('GET', '/api/v1/tables');
  const tablesAfterDelete = res7.body?.data || res7.body?.tables || [];
  const foundAfterDelete = tablesAfterDelete.find(t => String(t.tableId) === String(testTableId) || t.tableNumber === 'T-55');
  if (!foundAfterDelete) {
    console.log('✅ Test 7 PASSED: Deleted table T-55 is NOT returned in GET /api/v1/tables!');
  } else {
    console.log('❌ Test 7 FAILED: Deleted table still returned in GET /api/v1/tables.');
  }

  console.log('\n=== ALL END-TO-END TESTS EXECUTED ===');
}

runTests().catch(console.error);

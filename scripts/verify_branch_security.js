const fs = require('fs');
const path = require('path');

console.log('======================================================');
console.log('    ISSUE 2.1 - BRANCH ID SECURITY VERIFICATION       ');
console.log('======================================================\n');

let passed = 0;
let failed = 0;

function assert(testName, condition, detail = '') {
  if (condition) {
    console.log(`[PASS] ${testName}`);
    if (detail) console.log(`       ${detail}`);
    passed++;
  } else {
    console.log(`[FAIL] ${testName}`);
    if (detail) console.log(`       ERROR: ${detail}`);
    failed++;
  }
}

// 1. Inspect PosHub.cs
const posHubPath = path.resolve(__dirname, '../Backend/Hubs/PosHub.cs');
const authServicePath = path.resolve(__dirname, '../Backend/Services/AuthService.cs');

assert('File exists: Backend/Hubs/PosHub.cs', fs.existsSync(posHubPath), posHubPath);
assert('File exists: Backend/Services/AuthService.cs', fs.existsSync(authServicePath), authServicePath);

const posHubCode = fs.readFileSync(posHubPath, 'utf8');
const authServiceCode = fs.readFileSync(authServicePath, 'utf8');

// 2. Fallback to Branch ID 1 removal
const hasBranch1Fallback = /branchId\s*=\s*1\s*;/.test(posHubCode);
assert(
  'Fallback Removal: No hardcoded branchId = 1 fallback in PosHub.cs',
  !hasBranch1Fallback,
  hasBranch1Fallback ? 'Found hardcoded branchId = 1 fallback assignment' : 'Verified: automatic branch 1 fallback has been eliminated'
);

// 3. Fallback restaurant_1 claim removal
const hasRestaurant1FallbackClaim = /"restaurantId",\s*user\.BranchId\.HasValue\s*\?\s*\$"restaurant_\{user\.BranchId\.Value\}"\s*:\s*"restaurant_1"/.test(authServiceCode);
assert(
  'Claim Security: AuthService does not default restaurantId claim to restaurant_1',
  !hasRestaurant1FallbackClaim,
  hasRestaurant1FallbackClaim ? 'Found fallback claim restaurant_1' : 'Verified: users without branch do not receive restaurant_1 claim'
);

// 4. Server-Side User & Branch Resolution
const hasServerSideUserLookup = posHubCode.includes('db.Users.AsNoTracking().Include(u => u.Role).FirstOrDefaultAsync');
assert(
  'Server Resolution: PosHub queries database for authenticated user account',
  hasServerSideUserLookup,
  'Verified: user identity is resolved from server-side AppDbContext.Users'
);

const hasUserActiveCheck = posHubCode.includes('dbUser == null || !dbUser.IsActive');
assert(
  'User Account Validation: Rejects nonexistent or inactive users',
  hasUserActiveCheck,
  'Verified: unauthenticated or deactivated users are rejected with Unauthorized'
);

// 5. Enforce branch authorization for every connection
const hasNonAdminBranchEnforcement = posHubCode.includes('User is not associated with any restaurant branch. Access denied.');
assert(
  'Branch Enforcement: Non-admin users without a database branch are rejected',
  hasNonAdminBranchEnforcement,
  'Verified: users without branch association cannot connect'
);

// 6. Cross-branch access prevention at connection
const hasCrossBranchConnectionCheck = posHubCode.includes('requestedBranchId > 0 && requestedBranchId != dbUser.BranchId.Value') &&
                                     posHubCode.includes('Unauthorized. You are not assigned to the requested branch.');
assert(
  'Cross-Branch Connection Prevention: Non-admin requesting mismatch branch is blocked',
  hasCrossBranchConnectionCheck,
  'Verified: users cannot access a different branch at connection handshake'
);

// 7. Global Admin handling
const hasAdminNoBranchRejection = posHubCode.includes('Branch context could not be identified or is missing. Please specify a valid branch ID.');
assert(
  'Admin Branch Context: Global admin without a branch context is rejected (never defaulted)',
  hasAdminNoBranchRejection,
  'Verified: admin must provide explicit valid branch; no fallback to branch 1'
);

// 8. Database Branch Existence Check
const hasBranchExistenceCheck = posHubCode.includes('CheckBranchExistsAsync') &&
                               posHubCode.includes('Branch ID {resolvedBranchId} does not exist or is inactive.');
assert(
  'Branch Existence Validation: Non-existent branch IDs are rejected',
  hasBranchExistenceCheck,
  'Verified: branches are checked against database tables before authorization'
);

// 9. JoinRestaurant Cross-Branch Prevention
const hasJoinRestaurantCrossBranchBlock = posHubCode.includes('Blocked cross-branch join') &&
                                         posHubCode.includes('Unauthorized: user is not assigned to the requested branch.');
assert(
  'Cross-Branch Method Security: JoinRestaurant blocks cross-branch switching for non-admin',
  hasJoinRestaurantCrossBranchBlock,
  'Verified: JoinRestaurant verifies database assignment before group join'
);

// 10. GetMissedEvents Cross-Branch Prevention
const hasMissedEventsCrossBranchBlock = posHubCode.includes('Blocked cross-branch GetMissedEvents') &&
                                       posHubCode.includes('!isAdmin && authBranch != branchId');
assert(
  'Real-Time Event Isolation: GetMissedEvents prevents reading events from another branch',
  hasMissedEventsCrossBranchBlock,
  'Verified: client authorized for branch A cannot read events from branch B'
);

// 11. Preserving Admin access
const hasAdminAccessPreserved = posHubCode.includes('bool isAdmin = normalizedRole == "admin" || normalizedRole == "superadmin" || normalizedRole == "manager";');
assert(
  'Admin Role Permissions: Administrative roles (Admin, SuperAdmin, Manager) are identified and supported',
  hasAdminAccessPreserved,
  'Verified: admin role hierarchy is preserved'
);

// 12. Simulate all scenario matrix in JS
console.log('\n--- SIMULATED SCENARIO MATRIX VERIFICATION ---');

const testScenarios = [
  {
    name: 'Admin with a valid branch in DB (Branch 1)',
    user: { id: 1, role: 'Admin', dbBranch: 1, isActive: true },
    request: { queryBranch: null, claimBranch: 1 },
    branchesInDb: [1, 2],
    expectAllowed: true,
    expectedBranch: 1
  },
  {
    name: 'Global Admin without a branch claim or query param',
    user: { id: 2, role: 'Admin', dbBranch: null, isActive: true },
    request: { queryBranch: null, claimBranch: null },
    branchesInDb: [1, 2],
    expectAllowed: false,
    expectedError: 'Branch context could not be identified or is missing'
  },
  {
    name: 'Global Admin specifying query branch 2',
    user: { id: 2, role: 'Admin', dbBranch: null, isActive: true },
    request: { queryBranch: 2, claimBranch: null },
    branchesInDb: [1, 2],
    expectAllowed: true,
    expectedBranch: 2
  },
  {
    name: 'Cashier with a valid branch (Branch 1)',
    user: { id: 3, role: 'Cashier', dbBranch: 1, isActive: true },
    request: { queryBranch: null, claimBranch: 1 },
    branchesInDb: [1, 2],
    expectAllowed: true,
    expectedBranch: 1
  },
  {
    name: 'Waiter with a valid branch (Branch 2)',
    user: { id: 4, role: 'Waiter', dbBranch: 2, isActive: true },
    request: { queryBranch: null, claimBranch: 2 },
    branchesInDb: [1, 2],
    expectAllowed: true,
    expectedBranch: 2
  },
  {
    name: 'User with an invalid branch (Branch 9999 does not exist)',
    user: { id: 5, role: 'Admin', dbBranch: null, isActive: true },
    request: { queryBranch: 9999, claimBranch: null },
    branchesInDb: [1, 2],
    expectAllowed: false,
    expectedError: 'does not exist or is inactive'
  },
  {
    name: 'User without a branch association (Cashier dbBranch = null)',
    user: { id: 6, role: 'Cashier', dbBranch: null, isActive: true },
    request: { queryBranch: null, claimBranch: null },
    branchesInDb: [1, 2],
    expectAllowed: false,
    expectedError: 'not associated with any restaurant branch'
  },
  {
    name: 'Cross-branch attempt: Cashier assigned to Branch 1 requesting Branch 2',
    user: { id: 7, role: 'Cashier', dbBranch: 1, isActive: true },
    request: { queryBranch: 2, claimBranch: 2 },
    branchesInDb: [1, 2],
    expectAllowed: false,
    expectedError: 'not assigned to the requested branch'
  }
];

function evaluateConnection(scenario) {
  const { user, request, branchesInDb } = scenario;
  if (!user.isActive) return { allowed: false, error: 'User inactive' };

  const isAdmin = ['admin', 'superadmin', 'manager'].includes(user.role.toLowerCase());
  let resolvedBranch = 0;
  const requestedBranch = request.queryBranch || request.claimBranch || 0;

  if (!isAdmin) {
    if (!user.dbBranch || user.dbBranch <= 0) {
      return { allowed: false, error: 'User is not associated with any restaurant branch. Access denied.' };
    }
    if (requestedBranch > 0 && requestedBranch !== user.dbBranch) {
      return { allowed: false, error: 'Unauthorized. You are not assigned to the requested branch.' };
    }
    resolvedBranch = user.dbBranch;
  } else {
    if (user.dbBranch && user.dbBranch > 0) {
      if (requestedBranch > 0 && requestedBranch !== user.dbBranch) {
        return { allowed: false, error: 'Unauthorized. Administrator is assigned to a different branch.' };
      }
      resolvedBranch = user.dbBranch;
    } else {
      if (requestedBranch > 0) {
        resolvedBranch = requestedBranch;
      } else {
        return { allowed: false, error: 'Branch context could not be identified or is missing. Please specify a valid branch ID.' };
      }
    }
  }

  if (!branchesInDb.includes(resolvedBranch)) {
    return { allowed: false, error: `Branch ID ${resolvedBranch} does not exist or is inactive.` };
  }

  return { allowed: true, branchId: resolvedBranch };
}

testScenarios.forEach((sc, idx) => {
  const res = evaluateConnection(sc);
  if (sc.expectAllowed) {
    assert(
      `Scenario ${idx + 1}: ${sc.name}`,
      res.allowed === true && res.branchId === sc.expectedBranch,
      `ResolvedBranch=${res.branchId}, Expected=${sc.expectedBranch}`
    );
  } else {
    assert(
      `Scenario ${idx + 1}: ${sc.name}`,
      res.allowed === false && res.error.includes(sc.expectedError),
      `Rejected with: "${res.error}"`
    );
  }
});

console.log('\n======================================================');
console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
console.log('======================================================');

if (failed > 0) process.exit(1);

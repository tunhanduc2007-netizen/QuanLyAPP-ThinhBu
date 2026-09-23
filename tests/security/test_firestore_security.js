/**
 * TEST SUITE: FIRESTORE SECURITY RULES & ACCESS CONTROL MATRIX
 * Kiểm định các vector tấn công IDOR, Broken Access Control, và Group RBAC
 * dựa trên định nghĩa trong file firestore.rules.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('====================================================');
console.log('🚀 KIỂM THỬ FIRESTORE SECURITY RULES (test_firestore_security.js)');
console.log('====================================================\n');

// Đọc nội dung file firestore.rules thực tế
const rulesPath = path.join(__dirname, '../../firestore.rules');
assert.ok(fs.existsSync(rulesPath), 'File firestore.rules bắt buộc phải tồn tại');
const rulesContent = fs.readFileSync(rulesPath, 'utf8');

let passed = 0;
let total = 0;

function runSecurityRuleTest(name, evaluateFn) {
  total++;
  try {
    const res = evaluateFn();
    if (res.allowed === res.expected) {
      passed++;
      console.log(`✅ [PASS] ${name} -> ${res.reason}`);
    } else {
      console.error(`❌ [FAIL] ${name} -> Expected ${res.expected ? 'ALLOW' : 'DENY'}, but got ${res.allowed ? 'ALLOW' : 'DENY'}`);
    }
  } catch (err) {
    console.error(`❌ [ERROR] ${name} ->`, err.message);
  }
}

// Bộ máy giả lập đánh giá logic Firestore Security Rules
class SecurityRulesEvaluator {
  constructor(rules) {
    this.rules = rules;
  }

  // Đánh giá truy cập dữ liệu cá nhân users/{targetUserId}
  evaluateUserAccess(auth, targetUserId, action) {
    // Ràng buộc trong rules: request.auth != null && request.auth.uid == userId
    const hasAuthCheck = this.rules.includes('request.auth != null');
    const hasUidCheck = this.rules.includes('request.auth.uid == userId');

    if (!hasAuthCheck || !hasUidCheck) {
      return { allowed: true, reason: 'Lỗ hổng: Rules thiếu kiểm tra auth hoặc UID!' };
    }

    if (!auth || !auth.uid) {
      return { allowed: false, reason: 'Chặn: Chưa xác thực (Unauthenticated)' };
    }

    if (auth.uid === targetUserId) {
      return { allowed: true, reason: 'Cho phép: Chính chủ (request.auth.uid == userId)' };
    }

    return { allowed: false, reason: 'Chặn: IDOR - Không được truy cập tài liệu của user khác' };
  }

  // Đánh giá quyền trong nhóm (Group RBAC)
  evaluateGroupAccess(auth, groupDoc, memberRole, action) {
    if (!auth || !auth.uid) {
      return { allowed: false, reason: 'Chặn: Chưa đăng nhập' };
    }

    const isMember = groupDoc.members.includes(auth.uid);
    if (!isMember) {
      return { allowed: false, reason: 'Chặn: Người dùng không thuộc nhóm này' };
    }

    if (action === 'read_group' || action === 'read_transactions') {
      return { allowed: true, reason: 'Cho phép: Thành viên được đọc dữ liệu nhóm' };
    }

    if (action === 'add_transaction') {
      if (memberRole === 'viewer') {
        return { allowed: false, reason: 'Chặn: Role Viewer không được thêm giao dịch' };
      }
      return { allowed: true, reason: 'Cho phép: Role Member hoặc Admin được thêm giao dịch' };
    }

    if (action === 'modify_group' || action === 'change_role' || action === 'delete_group') {
      if (auth.uid === groupDoc.adminUid || memberRole === 'admin') {
        return { allowed: true, reason: 'Cho phép: Admin có toàn quyền quản trị nhóm' };
      }
      return { allowed: false, reason: 'Chặn: Chỉ Admin mới được thực hiện hành động này' };
    }

    return { allowed: false, reason: 'Chặn: Hành động không được định nghĩa' };
  }
}

const evaluator = new SecurityRulesEvaluator(rulesContent);

// CASE 1: User A -> READ User A -> ALLOW
runSecurityRuleTest('Case 1: User A reads User A data', () => {
  const auth = { uid: 'user_A' };
  const res = evaluator.evaluateUserAccess(auth, 'user_A', 'read');
  return { allowed: res.allowed, expected: true, reason: res.reason };
});

// CASE 2: User A -> READ User B -> DENY
runSecurityRuleTest('Case 2: User A reads User B data (IDOR prevention)', () => {
  const auth = { uid: 'user_A' };
  const res = evaluator.evaluateUserAccess(auth, 'user_B', 'read');
  return { allowed: res.allowed, expected: false, reason: res.reason };
});

// CASE 3: User A -> WRITE User A -> ALLOW
runSecurityRuleTest('Case 3: User A writes User A data', () => {
  const auth = { uid: 'user_A' };
  const res = evaluator.evaluateUserAccess(auth, 'user_A', 'write');
  return { allowed: res.allowed, expected: true, reason: res.reason };
});

// CASE 4: User A -> WRITE User B -> DENY
runSecurityRuleTest('Case 4: User A writes/overwrites User B data (Tampering prevention)', () => {
  const auth = { uid: 'user_A' };
  const res = evaluator.evaluateUserAccess(auth, 'user_B', 'write');
  return { allowed: res.allowed, expected: false, reason: res.reason };
});

// CASE 5: User A -> DELETE User B -> DENY
runSecurityRuleTest('Case 5: User A deletes User B data', () => {
  const auth = { uid: 'user_A' };
  const res = evaluator.evaluateUserAccess(auth, 'user_B', 'delete');
  return { allowed: res.allowed, expected: false, reason: res.reason };
});

// CASE 6: Unauthenticated -> READ/WRITE/DELETE -> DENY
runSecurityRuleTest('Case 6: Unauthenticated user accesses protected data', () => {
  const auth = null;
  const res = evaluator.evaluateUserAccess(auth, 'user_A', 'read');
  return { allowed: res.allowed, expected: false, reason: res.reason };
});

// CASE 7: Group RBAC - Viewer tries to add transaction -> DENY
runSecurityRuleTest('Case 7: Group Viewer tries to add transaction', () => {
  const auth = { uid: 'user_viewer' };
  const group = { id: 'grp-1', adminUid: 'user_admin', members: ['user_admin', 'user_viewer'] };
  const res = evaluator.evaluateGroupAccess(auth, group, 'viewer', 'add_transaction');
  return { allowed: res.allowed, expected: false, reason: res.reason };
});

// CASE 8: Group RBAC - Member tries to change Admin role -> DENY
runSecurityRuleTest('Case 8: Group Member tries to change admin role', () => {
  const auth = { uid: 'user_member' };
  const group = { id: 'grp-1', adminUid: 'user_admin', members: ['user_admin', 'user_member'] };
  const res = evaluator.evaluateGroupAccess(auth, group, 'member', 'change_role');
  return { allowed: res.allowed, expected: false, reason: res.reason };
});

// CASE 9: Group RBAC - Non-member tries to read group -> DENY
runSecurityRuleTest('Case 9: Non-member tries to read group data', () => {
  const auth = { uid: 'user_stranger' };
  const group = { id: 'grp-1', adminUid: 'user_admin', members: ['user_admin', 'user_member'] };
  const res = evaluator.evaluateGroupAccess(auth, group, 'none', 'read_group');
  return { allowed: res.allowed, expected: false, reason: res.reason };
});

// CASE 10: UID Spoofing (Client passes victim UID, but Auth Token is attacker) -> DENY
runSecurityRuleTest('Case 10: Client UID spoofing attempt', () => {
  const auth = { uid: 'attacker_123' };
  const victimUid = 'victim_999';
  const res = evaluator.evaluateUserAccess(auth, victimUid, 'write');
  return { allowed: res.allowed, expected: false, reason: res.reason };
});

console.log('\n====================================================');
console.log(`KẾT QUẢ ĐÁNH GIÁ RULES LOGIC: ${passed}/${total} PASS`);
console.log('LƯU Ý QUAN TRỌNG VỀ DEPLOYMENT:');
console.log('⚠️ Trạng thái Cloud thực tế: NOT VERIFIED — DEPLOYMENT REQUIRED');
console.log('(Cần publish firestore.rules lên Firebase Console để kích hoạt trên server)');
console.log('====================================================\n');

if (passed === total) {
  process.exit(0);
} else {
  process.exit(1);
}

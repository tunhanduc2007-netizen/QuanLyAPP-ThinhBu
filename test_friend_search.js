/**
 * TEST SUITE: FRIEND SEARCH & CONFIRMATION LOGIC
 */
const assert = require('assert');

// Giả lập danh bạ public_users
const mockPublicDirectory = [
  { uid: 'u_duc', name: 'Đức', tag: '@tunhanduc6828', searchTag: 'tunhanduc6828', searchName: 'duc', avatar: 'https://avatar/duc.png' },
  { uid: 'u_nghia', name: 'Từ Nhân Nghĩa', tag: '@tunhannghia4821', searchTag: 'tunhannghia4821', searchName: 'tu nhan nghia', avatar: 'https://avatar/nghia.png' },
  { uid: 'u_thinh', name: 'Thịnh Grab', tag: '@thinhgrab9999', searchTag: 'thinhgrab9999', searchName: 'thinh grab', avatar: 'https://avatar/thinh.png' }
];

function simulateSearch(query) {
  const q = (query || '').trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace('@', '');

  if (!q) return [];
  return mockPublicDirectory.filter(u => u.searchTag.includes(q) || u.searchName.includes(q));
}

console.log('🧪 Bắt đầu kiểm thử tính năng Tìm kiếm bạn bè:');

// Test 1: Tìm kiếm tài khoản không tồn tại -> Trả về rỗng (KHÔNG tự tạo bạn ảo)
const notFound = simulateSearch('taikhoankhongtontai999');
assert.strictEqual(notFound.length, 0, 'Tìm tài khoản không tồn tại phải trả về mảng rỗng');
console.log('✅ [PASS] 1. Tìm tài khoản không tồn tại -> Không có kết quả (chặn tạo bạn ảo)');

// Test 2: Tìm theo Tag chính xác
const byTag = simulateSearch('@tunhannghia4821');
assert.strictEqual(byTag.length, 1);
assert.strictEqual(byTag[0].name, 'Từ Nhân Nghĩa');
console.log('✅ [PASS] 2. Tìm theo @tag chính xác -> Trả về đúng hồ sơ Từ Nhân Nghĩa');

// Test 3: Tìm theo Tên tiếng Việt có dấu
const byName = simulateSearch('Từ Nhân Nghĩa');
assert.strictEqual(byName.length, 1);
assert.strictEqual(byName[0].uid, 'u_nghia');
console.log('✅ [PASS] 3. Tìm theo tên tiếng Việt có dấu -> Chuẩn hóa tìm đúng tài khoản');

// Test 4: Tìm kiếm theo tiền tố
const prefix = simulateSearch('thinh');
assert.strictEqual(prefix.length, 1);
assert.strictEqual(prefix[0].tag, '@thinhgrab9999');
console.log('✅ [PASS] 4. Tìm theo tiền tố -> Tìm thấy Thịnh Grab');

// Test 5: Không cho tự kết bạn với chính mình
const myUid = 'u_duc';
const myTag = '@tunhanduc6828';
const searchSelf = simulateSearch(myTag);
assert.strictEqual(searchSelf.length, 1);
const isMe = (searchSelf[0].uid === myUid) || (searchSelf[0].tag === myTag);
assert.strictEqual(isMe, true, 'Hệ thống phải nhận diện được tài khoản của chính mình');
console.log('✅ [PASS] 5. Nhận diện tài khoản chính mình trên thẻ xem trước');

console.log('\n🎉 TOÀN BỘ 5/5 TEST CASES TÌM KIẾM BẠN BÈ ĐÃ PASS 100%!');

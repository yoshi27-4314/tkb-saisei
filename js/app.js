/**
 * テイクバック再生事業アプリ - メインJS
 */

// ====== 状態管理 ======
let currentUser = null;
let currentTab = 'genba';
let currentCase = null;

// ローカルストレージキー
const STORAGE_KEY = 'f8_saisei_data';
const LOGIN_KEY = 'f8_saisei_user';
const ATTEND_KEY = 'f8_saisei_attend';
const PROXY_ATTEND_KEY = 'f8_saisei_proxy_attend';
const PIN_KEY = 'f8_saisei_pin';

// PIN状態
let pinBuffer = [];
let pinMode = ''; // 'login', 'setup', 'confirm_setup'
let pinSetupFirst = '';
let selectedStaffName = '';

// PIN変更状態
let changePinBuffer = [];
let changePinMode = ''; // 'new', 'confirm'
let changePinFirst = '';

// ====== データ管理（ローカル） ======
function loadLocalData() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"cases":[],"vendors":[],"expenses":[]}');
  } catch { return { cases: [], vendors: [], expenses: [] }; }
}

function saveLocalData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function getCases() { return loadLocalData().cases || []; }
function getExpenses() { return loadLocalData().expenses || []; }

function saveCases(cases) {
  const data = loadLocalData();
  data.cases = cases;
  saveLocalData(data);
}

function saveExpenses(expenses) {
  const data = loadLocalData();
  data.expenses = expenses;
  saveLocalData(data);
}

// ====== ログイン ======
function onStaffSelect() {
  const name = document.getElementById('loginStaff').value;
  if (!name) return;
  selectedStaffName = name;
  const savedPin = localStorage.getItem(PIN_KEY + '_' + name);

  document.getElementById('loginStep1').style.display = 'none';
  document.getElementById('loginStep2').style.display = 'block';

  pinBuffer = [];
  updatePinDots('pinDisplay');

  if (savedPin) {
    pinMode = 'login';
    document.getElementById('pinPrompt').textContent = 'PINコードを入力してください';
  } else {
    pinMode = 'setup';
    document.getElementById('pinPrompt').textContent = '4桁のPINコードを設定してください';
  }
}

function pinInput(num) {
  if (pinBuffer.length >= 4) return;
  pinBuffer.push(num);
  updatePinDots('pinDisplay');

  if (pinBuffer.length === 4) {
    setTimeout(() => processPinEntry(), 200);
  }
}

function pinDelete() {
  if (pinBuffer.length === 0) return;
  pinBuffer.pop();
  updatePinDots('pinDisplay');
}

function pinBack() {
  document.getElementById('loginStep1').style.display = 'block';
  document.getElementById('loginStep2').style.display = 'none';
  pinBuffer = [];
  pinMode = '';
  selectedStaffName = '';
}

function updatePinDots(displayId) {
  const dots = document.getElementById(displayId).querySelectorAll('.pin-dot');
  dots.forEach((dot, i) => {
    dot.classList.toggle('filled', i < pinBuffer.length);
  });
}

function processPinEntry() {
  const entered = pinBuffer.join('');

  if (pinMode === 'setup') {
    pinSetupFirst = entered;
    pinMode = 'confirm_setup';
    pinBuffer = [];
    updatePinDots('pinDisplay');
    document.getElementById('pinPrompt').textContent = '確認のためもう一度入力してください';
    return;
  }

  if (pinMode === 'confirm_setup') {
    if (entered === pinSetupFirst) {
      localStorage.setItem(PIN_KEY + '_' + selectedStaffName, entered);
      showToast('PINコードを設定しました');
      doLoginWithPin();
    } else {
      pinError('pinDisplay');
      document.getElementById('pinPrompt').textContent = 'PINが一致しません。もう一度設定してください';
      pinMode = 'setup';
      pinSetupFirst = '';
    }
    return;
  }

  if (pinMode === 'login') {
    const savedPin = localStorage.getItem(PIN_KEY + '_' + selectedStaffName);
    if (entered === savedPin) {
      doLoginWithPin();
    } else {
      pinError('pinDisplay');
      document.getElementById('pinPrompt').textContent = 'PINが違います。もう一度入力してください';
    }
    return;
  }
}

function pinError(displayId) {
  const display = document.getElementById(displayId);
  display.classList.add('pin-error');
  setTimeout(() => {
    display.classList.remove('pin-error');
    pinBuffer = [];
    updatePinDots(displayId);
  }, 400);
}

function doLoginWithPin() {
  currentUser = { name: selectedStaffName, isAdmin: selectedStaffName === '浅野儀頼' };
  localStorage.setItem(LOGIN_KEY, JSON.stringify(currentUser));
  pinBuffer = [];
  pinMode = '';
  selectedStaffName = '';
  showMainScreen();
}

function doLogout() {
  currentUser = null;
  localStorage.removeItem(LOGIN_KEY);
  document.getElementById('mainScreen').classList.remove('active');
  document.getElementById('loginScreen').classList.add('active');
  closeModal('mypageModal');
}

function showMainScreen() {
  document.getElementById('loginScreen').classList.remove('active');
  document.getElementById('mainScreen').classList.add('active');
  switchTab('genba');
}

function tryAutoLogin() {
  try {
    const saved = JSON.parse(localStorage.getItem(LOGIN_KEY));
    if (saved && saved.name) {
      currentUser = saved;
      showMainScreen();
      return true;
    }
  } catch {}
  return false;
}

// ====== 日付表示 ======
function updateDate() {
  const now = new Date();
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  const str = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日（${days[now.getDay()]}）`;
  const el = document.getElementById('homeTodayDate');
  if (el) el.textContent = str;
}

// ====== タブ切り替え ======
function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');
  const tabMap = ['guide', 'tools', 'genba', 'expense', 'case'];
  const navItems = document.querySelectorAll('.nav-item');
  const idx = tabMap.indexOf(tab);
  if (idx >= 0 && navItems[idx]) navItems[idx].classList.add('active');

  if (tab === 'genba') renderTodayGenba();
  if (tab === 'case') renderCaseList();
  if (tab === 'expense') renderExpenseList();
}

// ====== ホームモーダル ======
function showHomeModal() {
  document.getElementById('homeModal').classList.add('open');
  const firstName = currentUser.name.split(/[　 ]/)[0];
  document.getElementById('homeStaffName').textContent = firstName;
  updateDate();
  renderHomeTodayGenba();
  renderHomeTomorrowGenba();
  renderHomeNotices();
  renderChatQuickBtns();
}

function renderHomeTodayGenba() {
  const cases = getCases();
  const today = new Date().toISOString().slice(0, 10);
  const todayCases = cases.filter(c => c.date === today && c.status !== 'completed' && c.status !== 'settled');
  const container = document.getElementById('homeTodayGenba');
  if (todayCases.length === 0) {
    container.innerHTML = '<p class="empty-msg" style="padding:12px 0;">今日の現場予定はありません</p>';
    return;
  }
  container.innerHTML = todayCases.map(c => `
    <div class="case-card" onclick="closeModal('homeModal'); switchTab('genba');">
      <div class="case-title">${c.customerName} 様 - ${c.workTypeName}</div>
      <div class="case-meta">📍 ${c.address || '未設定'}</div>
    </div>
  `).join('');
}

function renderHomeTomorrowGenba() {
  const cases = getCases();
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const tomorrowCases = cases.filter(c => c.date === tomorrow);
  const container = document.getElementById('homeTomorrowGenba');
  if (tomorrowCases.length === 0) {
    container.innerHTML = '<p class="empty-msg" style="padding:12px 0;">明日の予定はありません</p>';
    return;
  }
  container.innerHTML = tomorrowCases.map(c => `
    <div class="case-card">
      <div class="case-title">${c.customerName} 様 - ${c.workTypeName}</div>
      <div class="case-meta">📍 ${c.address || '未設定'}</div>
      ${(c.tools && c.tools.length > 0) ?
        `<div style="margin-top:8px; font-size:13px; color:var(--gold);"><strong>準備物:</strong> ${c.tools.map(t=>t.name).join('、')}</div>` : ''}
    </div>
  `).join('');
}

function renderHomeNotices() {
  const container = document.getElementById('homeNoticeList');
  container.innerHTML = `
    <div class="notice-item">
      <span class="notice-badge notice-info">情報</span>
      <span>再生事業アプリ テスト運用開始</span>
    </div>
  `;
}

function renderChatQuickBtns() {
  const container = document.getElementById('chatQuickBtns');
  container.innerHTML = CONFIG.CHAT_ROOMS.map(room => {
    if (room.url) {
      return `<a href="${room.url}" target="_blank" class="chat-quick-btn">💬 ${room.name}</a>`;
    }
    return `<button class="chat-quick-btn" onclick="showToast('${room.name}チャットは準備中です')">💬 ${room.name}</button>`;
  }).join('');
}

// ====== マイページモーダル ======
function showMypageModal() {
  document.getElementById('mypageModal').classList.add('open');
  document.getElementById('mypageName').textContent = currentUser.name;
  document.getElementById('mypageRole').textContent = currentUser.isAdmin ? '管理者' : 'スタッフ';

  const staffConf = CONFIG.STAFF.find(s => s.name === currentUser.name);
  const attendCard = document.getElementById('mypageAttendCard');
  if (staffConf && staffConf.attendance === false) {
    attendCard.style.display = 'none';
  } else {
    attendCard.style.display = 'block';
    checkTodayAttendance();
  }

  const proxySection = document.getElementById('proxyAttendanceSection');
  if (currentUser.isAdmin) {
    proxySection.style.display = 'block';
    checkProxyAttendance();
  } else {
    proxySection.style.display = 'none';
  }
}

// ====== 出退勤（時計ピッカー式） ======
let clockTarget = 'start';
let clockMode = 'hour';
let clockHour = 9;
let clockMin = 0;
let attendHistoryYear = new Date().getFullYear();
let attendHistoryMonth = new Date().getMonth();

function checkTodayAttendance() {
  const today = new Date().toISOString().slice(0, 10);
  const saved = localStorage.getItem(ATTEND_KEY + '_' + currentUser.name + '_' + today);
  const msg = document.getElementById('attendanceMsg');
  const formArea = document.getElementById('attendanceFormArea');
  if (saved) {
    try {
      const a = JSON.parse(saved);
      const breakText = a.noBreak ? '休憩なし' : `休憩${a.breakMin}分`;
      msg.textContent = `✅ ${a.start}〜${a.end}（${breakText}・実働${a.netHours}時間）記録済み`;
      msg.classList.add('recorded');
      // 入力行を隠す（履歴ボタンは残す）
      formArea.querySelectorAll('.attendance-row').forEach(el => el.style.display = 'none');
      const submitBtn = formArea.querySelector('[onclick="submitAttendance()"]');
      if (submitBtn) submitBtn.style.display = 'none';
    } catch {}
  } else {
    msg.textContent = '本日の勤務を記録してください';
    msg.classList.remove('recorded');
  }
}

function submitAttendance() {
  const today = new Date().toISOString().slice(0, 10);
  const saved = localStorage.getItem(ATTEND_KEY + '_' + currentUser.name + '_' + today);
  if (saved) { showToast('本日は既に登録済みです'); return; }

  const start = document.getElementById('attendStart').value;
  const end = document.getElementById('attendEnd').value;
  const noBreak = document.getElementById('noBreakCheck').checked;
  const breakStart = noBreak ? null : document.getElementById('breakStart').value;
  const breakEnd = noBreak ? null : document.getElementById('breakEnd').value;

  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const totalMin = (eh * 60 + em) - (sh * 60 + sm);
  let breakMin = 0;
  if (!noBreak && breakStart && breakEnd) {
    const [bsh, bsm] = breakStart.split(':').map(Number);
    const [beh, bem] = breakEnd.split(':').map(Number);
    breakMin = (beh * 60 + bem) - (bsh * 60 + bsm);
  }
  const netMin = totalMin - breakMin;
  const netHours = (netMin / 60).toFixed(1);

  if (totalMin <= 0) { showToast('退勤時刻が出勤時刻より前です'); return; }

  localStorage.setItem(ATTEND_KEY + '_' + currentUser.name + '_' + today, JSON.stringify({
    start, end, breakStart, breakEnd, noBreak, breakMin, netHours, staffName: currentUser.name,
  }));

  checkTodayAttendance();
  showToast('🕐 勤務記録を送信しました');

  // freee連携（将来実装）
  // sendToFreee(today, start, end, noBreak, breakStart, breakEnd);
}

function toggleNoBreak() {
  const checked = document.getElementById('noBreakCheck').checked;
  document.getElementById('breakStartDisplay').style.opacity = checked ? '0.3' : '1';
  document.getElementById('breakEndDisplay').style.opacity = checked ? '0.3' : '1';
}

// ====== 北瀬さん代理勤怠 ======
function checkProxyAttendance() {
  const today = new Date().toISOString().slice(0, 10);
  const saved = localStorage.getItem(PROXY_ATTEND_KEY + '_' + today);
  const msg = document.getElementById('proxyAttendanceMsg');
  const formArea = document.getElementById('proxyAttendanceFormArea');
  if (saved) {
    try {
      const a = JSON.parse(saved);
      const breakText = a.noBreak ? '休憩なし' : `休憩${a.breakMin}分`;
      msg.textContent = `✅ ${a.start}〜${a.end}（${breakText}・実働${a.netHours}時間）記録済み`;
      msg.classList.add('recorded');
      formArea.querySelectorAll('.attendance-row').forEach(el => el.style.display = 'none');
      const submitBtn = formArea.querySelector('[onclick="submitProxyAttendance()"]');
      if (submitBtn) submitBtn.style.display = 'none';
    } catch {}
  } else {
    msg.textContent = '本日の勤務を記録してください';
    msg.classList.remove('recorded');
  }
}

function submitProxyAttendance() {
  const today = new Date().toISOString().slice(0, 10);
  const saved = localStorage.getItem(PROXY_ATTEND_KEY + '_' + today);
  if (saved) { showToast('本日は既に登録済みです'); return; }

  const start = document.getElementById('proxyStart').value;
  const end = document.getElementById('proxyEnd').value;
  const noBreak = document.getElementById('proxyNoBreakCheck').checked;
  const breakStart = noBreak ? null : document.getElementById('proxyBreakStart').value;
  const breakEnd = noBreak ? null : document.getElementById('proxyBreakEnd').value;

  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const totalMin = (eh * 60 + em) - (sh * 60 + sm);
  let breakMin = 0;
  if (!noBreak && breakStart && breakEnd) {
    const [bsh, bsm] = breakStart.split(':').map(Number);
    const [beh, bem] = breakEnd.split(':').map(Number);
    breakMin = (beh * 60 + bem) - (bsh * 60 + bsm);
  }
  const netMin = totalMin - breakMin;
  const netHours = (netMin / 60).toFixed(1);

  if (totalMin <= 0) { showToast('退勤時刻が出勤時刻より前です'); return; }

  localStorage.setItem(PROXY_ATTEND_KEY + '_' + today, JSON.stringify({
    start, end, breakStart, breakEnd, noBreak, breakMin, netHours, staffName: '北瀬孝',
  }));

  checkProxyAttendance();
  showToast('🕐 北瀬さんの勤務記録を送信しました');
}

function toggleProxyNoBreak() {
  const checked = document.getElementById('proxyNoBreakCheck').checked;
  document.getElementById('proxyBreakStartDisplay').style.opacity = checked ? '0.3' : '1';
  document.getElementById('proxyBreakEndDisplay').style.opacity = checked ? '0.3' : '1';
}

// ====== アナログ時計ピッカー ======
function openClockPicker(target) {
  clockTarget = target;
  const inputMap = { start:'attendStart', end:'attendEnd', breakStart:'breakStart', breakEnd:'breakEnd',
    proxyStart:'proxyStart', proxyEnd:'proxyEnd', proxyBreakStart:'proxyBreakStart', proxyBreakEnd:'proxyBreakEnd' };
  const titleMap = { start:'出勤時刻', end:'退勤時刻', breakStart:'休憩開始', breakEnd:'休憩終了',
    proxyStart:'出勤時刻（北瀬）', proxyEnd:'退勤時刻（北瀬）', proxyBreakStart:'休憩開始（北瀬）', proxyBreakEnd:'休憩終了（北瀬）' };
  const current = document.getElementById(inputMap[target]).value || '09:00';
  const [h, m] = current.split(':').map(Number);
  clockHour = h; clockMin = m;
  clockMode = 'hour';

  document.getElementById('clockPickerTitle').textContent = titleMap[target] || '時刻を選択';
  updateClockPickerDisplay();
  drawClockPickerFace();
  document.getElementById('clockModeHour').classList.add('active');
  document.getElementById('clockModeMin').classList.remove('active');
  document.getElementById('clockPickerOverlay').classList.add('open');

  // Canvas タップイベント
  const canvas = document.getElementById('clockPickerCanvas');
  canvas.onclick = function(e) {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    handleClockTapAt(x, y);
  };
}

function closeClockPicker() { document.getElementById('clockPickerOverlay').classList.remove('open'); }

function setClockMode(mode) {
  clockMode = mode;
  document.getElementById('clockModeHour').classList.toggle('active', mode === 'hour');
  document.getElementById('clockModeMin').classList.toggle('active', mode === 'min');
  drawClockPickerFace();
}

function updateClockPickerDisplay() {
  document.getElementById('clockPickerDisplay').textContent =
    String(clockHour).padStart(2, '0') + ':' + String(clockMin).padStart(2, '0');
}

function drawClockPickerFace() {
  const canvas = document.getElementById('clockPickerCanvas');
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height, cx = w/2, cy = h/2, r = 115;
  ctx.clearRect(0, 0, w, h);

  ctx.beginPath(); ctx.arc(cx, cy, r + 10, 0, Math.PI * 2);
  ctx.fillStyle = '#F8F5EE'; ctx.fill();
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = '#fff'; ctx.fill();
  ctx.strokeStyle = '#dde0e6'; ctx.lineWidth = 2; ctx.stroke();

  if (clockMode === 'hour') {
    for (let i = 1; i <= 12; i++) {
      const a = (i * 30 - 90) * Math.PI / 180;
      const x = cx + Math.cos(a) * (r - 25);
      const y = cy + Math.sin(a) * (r - 25);
      const isSelected = (clockHour % 12 === i % 12 && clockHour < 13 && clockHour > 0);
      if (isSelected) { ctx.beginPath(); ctx.arc(x, y, 18, 0, Math.PI * 2); ctx.fillStyle = '#C5A258'; ctx.fill(); }
      ctx.font = isSelected ? 'bold 16px sans-serif' : '14px sans-serif';
      ctx.fillStyle = isSelected ? '#fff' : '#1C2541';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(i), x, y);
    }
    for (let i = 13; i <= 24; i++) {
      const a = ((i - 12) * 30 - 90) * Math.PI / 180;
      const x = cx + Math.cos(a) * (r - 55);
      const y = cy + Math.sin(a) * (r - 55);
      const displayNum = i === 24 ? 0 : i;
      const isSelected = (clockHour === displayNum || (clockHour === 0 && i === 24));
      if (isSelected) { ctx.beginPath(); ctx.arc(x, y, 16, 0, Math.PI * 2); ctx.fillStyle = '#1C2541'; ctx.fill(); }
      ctx.font = isSelected ? 'bold 13px sans-serif' : '12px sans-serif';
      ctx.fillStyle = isSelected ? '#fff' : '#888';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(displayNum), x, y);
    }
  } else {
    for (let i = 0; i < 12; i++) {
      const minVal = i * 5;
      const a = (i * 30 - 90) * Math.PI / 180;
      const x = cx + Math.cos(a) * (r - 25);
      const y = cy + Math.sin(a) * (r - 25);
      const isSelected = (clockMin === minVal);
      if (isSelected) { ctx.beginPath(); ctx.arc(x, y, 18, 0, Math.PI * 2); ctx.fillStyle = '#C5A258'; ctx.fill(); }
      ctx.font = isSelected ? 'bold 16px sans-serif' : '14px sans-serif';
      ctx.fillStyle = isSelected ? '#fff' : '#1C2541';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(minVal).padStart(2, '0'), x, y);
    }
  }
  ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2);
  ctx.fillStyle = '#C5A258'; ctx.fill();
}

function handleClockTapAt(x, y) {
  const cx = 130, cy = 130;
  const dx = x - cx, dy = y - cy;
  let angle = Math.atan2(dy, dx) * 180 / Math.PI + 90;
  if (angle < 0) angle += 360;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (clockMode === 'hour') {
    let h = Math.round(angle / 30);
    if (h === 0) h = 12;
    if (dist < 70) { h = h === 12 ? 0 : h + 12; }
    clockHour = h;
    updateClockPickerDisplay(); drawClockPickerFace();
    setTimeout(() => setClockMode('min'), 300);
  } else {
    let m = Math.round(angle / 6);
    if (m === 60) m = 0;
    m = Math.round(m / 5) * 5;
    if (m === 60) m = 0;
    clockMin = m;
    updateClockPickerDisplay(); drawClockPickerFace();
  }
}

function applyClockPicker() {
  const str = String(clockHour).padStart(2, '0') + ':' + String(clockMin).padStart(2, '0');
  const inputMap = { start:'attendStart', end:'attendEnd', breakStart:'breakStart', breakEnd:'breakEnd',
    proxyStart:'proxyStart', proxyEnd:'proxyEnd', proxyBreakStart:'proxyBreakStart', proxyBreakEnd:'proxyBreakEnd' };
  const displayMap = { start:'attendStartDisplay', end:'attendEndDisplay', breakStart:'breakStartDisplay', breakEnd:'breakEndDisplay',
    proxyStart:'proxyStartDisplay', proxyEnd:'proxyEndDisplay', proxyBreakStart:'proxyBreakStartDisplay', proxyBreakEnd:'proxyBreakEndDisplay' };
  const inputEl = document.getElementById(inputMap[clockTarget]);
  const displayEl = document.getElementById(displayMap[clockTarget]);
  if (inputEl) inputEl.value = str;
  if (displayEl) displayEl.textContent = str;
  closeClockPicker();
}

// ====== 月間カレンダー ======
function toggleAttendanceHistory() {
  const el = document.getElementById('attendanceHistory');
  if (el.style.display === 'none') {
    el.style.display = 'block';
    attendHistoryYear = new Date().getFullYear();
    attendHistoryMonth = new Date().getMonth();
    renderAttendanceHistory();
    document.getElementById('attendHistoryBtn').textContent = '📅 閉じる';
  } else {
    el.style.display = 'none';
    document.getElementById('attendHistoryBtn').textContent = '📅 今月の出勤状況を見る';
  }
}

function changeAttendMonth(delta) {
  attendHistoryMonth += delta;
  if (attendHistoryMonth < 0) { attendHistoryMonth = 11; attendHistoryYear--; }
  if (attendHistoryMonth > 11) { attendHistoryMonth = 0; attendHistoryYear++; }
  renderAttendanceHistory();
}

function renderAttendanceHistory() {
  const el = document.getElementById('attendanceHistory');
  const year = attendHistoryYear, month = attendHistoryMonth;
  const now = new Date();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow = new Date(year, month, 1).getDay();
  const dayLabels = ['日','月','火','水','木','金','土'];

  let totalDays = 0, totalHours = 0;
  let html = `<div class="attend-history-card">
    <div class="attend-month-nav">
      <button class="attend-nav-btn" onclick="changeAttendMonth(-1)">◀</button>
      <h4 class="attend-month-title">${year}年${month + 1}月</h4>
      <button class="attend-nav-btn" onclick="changeAttendMonth(1)">▶</button>
    </div>
    <div class="attend-cal-header">`;
  for (let i = 0; i < 7; i++) {
    const cls = i === 0 ? 'attend-cal-dow sun' : i === 6 ? 'attend-cal-dow sat' : 'attend-cal-dow';
    html += `<div class="${cls}">${dayLabels[i]}</div>`;
  }
  html += `</div><div class="attend-cal-body">`;
  for (let i = 0; i < firstDow; i++) html += `<div class="attend-cal-cell empty"></div>`;

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const dateStr = date.toISOString().slice(0, 10);
    const dow = date.getDay();
    const isWeekend = dow === 0 || dow === 6;
    const isFuture = date > now;
    const saved = localStorage.getItem(ATTEND_KEY + '_' + currentUser.name + '_' + dateStr);

    let cellClass = 'attend-cal-cell';
    let content = `<div class="attend-cal-date">${d}</div>`;
    let dot = '';

    if (saved) {
      try {
        const a = JSON.parse(saved);
        totalDays++;
        totalHours += parseFloat(a.netHours);
        dot = `<div class="attend-cal-dot worked"></div><div class="attend-cal-hours">${a.netHours}h</div>`;
        cellClass += ' worked';
      } catch {}
    } else if (!isFuture) {
      cellClass += isWeekend ? ' off' : ' missing';
      if (!isWeekend) dot = `<div class="attend-cal-dot missing"></div>`;
    } else {
      cellClass += ' future';
    }
    if (dow === 0) cellClass += ' sun';
    if (dow === 6) cellClass += ' sat';

    html += `<div class="${cellClass}">${content}${dot}</div>`;
  }

  html += `</div>
    <div class="attend-summary">
      <span>出勤日: <strong>${totalDays}</strong>日</span>
      <span>合計時間: <strong>${totalHours.toFixed(1)}</strong>h</span>
    </div>
  </div>`;
  el.innerHTML = html;
}

// ====== 案件管理 ======
function showNewCaseModal() {
  document.getElementById('newCaseModal').classList.add('open');
  document.getElementById('caseDate').value = new Date().toISOString().slice(0, 10);
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

function createCase() {
  const name = document.getElementById('caseCustomerName').value.trim();
  const phone = document.getElementById('caseCustomerPhone').value.trim();
  const address = document.getElementById('caseAddress').value.trim();
  const workType = document.getElementById('caseWorkType').value;
  const note = document.getElementById('caseNote').value.trim();
  const date = document.getElementById('caseDate').value;

  if (!name) { showToast('お客さん名を入力してください'); return; }
  if (!workType) { showToast('作業内容を選択してください'); return; }

  const cases = getCases();
  const seq = String(cases.length + 1).padStart(3, '0');
  const caseData = {
    id: CONFIG.MGMT_PREFIX() + '-' + seq,
    customerName: name, customerPhone: phone, address: address,
    workType: workType,
    workTypeName: CONFIG.WORK_TYPES.find(w => w.id === workType)?.name || workType,
    note: note, date: date, status: 'received',
    createdAt: new Date().toISOString(), createdBy: currentUser.name,
    photos: {}, checklist: [], timeRecords: [], expenses: [], disposals: [],
    customerMemo: '', tools: [], roles: [],
  };

  // 写真ステップ初期化
  CONFIG.PHOTO_STEPS.forEach(s => caseData.photos[s.id] = []);

  cases.unshift(caseData);
  saveCases(cases);

  document.getElementById('caseCustomerName').value = '';
  document.getElementById('caseCustomerPhone').value = '';
  document.getElementById('caseAddress').value = '';
  document.getElementById('caseWorkType').value = '';
  document.getElementById('caseNote').value = '';
  document.getElementById('caseDate').value = '';

  closeModal('newCaseModal');
  renderCaseList();
  showToast('案件を登録しました: ' + caseData.id);
}

function renderCaseList(filter = 'all', search = '') {
  const cases = getCases();
  const container = document.getElementById('caseList');
  let filtered = cases;
  if (filter !== 'all') filtered = filtered.filter(c => c.status === filter);
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(c =>
      (c.customerName || '').toLowerCase().includes(q) ||
      (c.address || '').toLowerCase().includes(q) ||
      (c.id || '').toLowerCase().includes(q)
    );
  }

  if (filtered.length === 0) {
    container.innerHTML = '<p class="empty-msg">案件がありません。</p>';
    return;
  }

  container.innerHTML = filtered.map(c => {
    const statusConf = CONFIG.CASE_STATUS.find(s => s.id === c.status) || {};
    return `
      <div class="case-card" onclick="openCase('${c.id}')">
        <div class="case-header">
          <span class="case-number">${c.id}</span>
          <span class="case-status" style="background:${statusConf.color};color:${statusConf.textColor}">${statusConf.name || c.status}</span>
        </div>
        <div class="case-title">${c.customerName} 様 - ${c.workTypeName}</div>
        <div class="case-meta-row">
          <span class="case-meta">📍 ${c.address || '未設定'}</span>
          <span class="case-meta">📅 ${c.date || '未定'}</span>
        </div>
      </div>
    `;
  }).join('');
}

function filterCases(status) {
  document.querySelectorAll('#caseFilter .filter-btn').forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');
  const search = document.getElementById('caseSearch').value;
  renderCaseList(status, search);
}

function searchCases() {
  const search = document.getElementById('caseSearch').value;
  const activeFilter = document.querySelector('#caseFilter .filter-btn.active');
  const status = activeFilter ? activeFilter.textContent : 'all';
  const statusMap = { 'すべて': 'all', '受付': 'received', '現地調査': 'survey', '見積もり中': 'estimating', '確定': 'confirmed', '作業中': 'working', '完了': 'completed', '精算済': 'settled' };
  renderCaseList(statusMap[status] || 'all', search);
}

function openCase(caseId) {
  const cases = getCases();
  currentCase = cases.find(c => c.id === caseId);
  if (!currentCase) return;
  switchTab('genba');
  showGenbaWork();
}

// ====== 今日の現場タブ ======
function renderTodayGenba() {
  const cases = getCases();
  const today = new Date().toISOString().slice(0, 10);
  const todayCases = cases.filter(c => c.date === today && (c.status === 'confirmed' || c.status === 'working' || c.status === 'survey'));

  if (todayCases.length === 0) {
    document.getElementById('genbaSelectScreen').style.display = 'block';
    document.getElementById('genbaWorkScreen').style.display = 'none';
    document.getElementById('todayGenbaList').innerHTML = '<p class="empty-msg">今日の現場予定はありません</p>';
    return;
  }

  if (todayCases.length === 1) {
    currentCase = todayCases[0];
    showGenbaWork();
    return;
  }

  document.getElementById('genbaSelectScreen').style.display = 'block';
  document.getElementById('genbaWorkScreen').style.display = 'none';
  document.getElementById('todayGenbaList').innerHTML = todayCases.map(c => {
    const st = CONFIG.CASE_STATUS.find(s => s.id === c.status) || {};
    return `
      <div class="case-card" onclick="openCase('${c.id}')">
        <div class="case-header">
          <span class="case-number">${c.id}</span>
          <span class="case-status" style="background:${st.color};color:${st.textColor}">${st.name}</span>
        </div>
        <div class="case-title">${c.customerName} 様 - ${c.workTypeName}</div>
        <div class="case-meta">📍 ${c.address || '未設定'}</div>
      </div>
    `;
  }).join('');
}

function showGenbaWork() {
  if (!currentCase) return;
  document.getElementById('genbaSelectScreen').style.display = 'none';
  document.getElementById('genbaWorkScreen').style.display = 'block';
  document.getElementById('genbaCaseTitle').textContent =
    `${currentCase.id} - ${currentCase.customerName}様 ${currentCase.workTypeName}`;

  document.getElementById('customerMemo').value = currentCase.customerMemo || '';

  renderRoleAssign();
  renderToolsList();
  renderPhotoSteps();
  renderChecklist();
  renderTimeTrackers();
  renderGenbaExpenses();
  renderDisposals();
  renderCompleteReport();
}

function backToGenbaSelect() {
  document.getElementById('genbaSelectScreen').style.display = 'block';
  document.getElementById('genbaWorkScreen').style.display = 'none';
  currentCase = null;
}

// ====== Googleマップ ======
function openMap() {
  if (!currentCase || !currentCase.address) { showToast('住所が設定されていません'); return; }
  window.open('https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(currentCase.address), '_blank');
}

// ====== お客さんメモ ======
function saveCustomerMemo() {
  if (!currentCase) return;
  currentCase.customerMemo = document.getElementById('customerMemo').value;
  updateCaseData();
}

// ====== 役割分担 ======
function renderRoleAssign() {
  const container = document.getElementById('roleAssignList');
  if (!currentCase.roles || currentCase.roles.length === 0) {
    container.innerHTML = '<p style="font-size:13px; color:var(--sub); padding:8px 0;">役割分担は未設定です</p>';
    return;
  }
  container.innerHTML = currentCase.roles.map(r => `
    <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid var(--border);">
      <span style="font-weight:500;">${r.staff}</span>
      <span style="color:var(--sub);">${r.task}</span>
    </div>
  `).join('');
}

// ====== 道具リスト ======
function renderToolsList() {
  const container = document.getElementById('toolsList');
  if (!currentCase.tools) currentCase.tools = [];
  if (currentCase.tools.length === 0) {
    container.innerHTML = '<p style="font-size:13px; color:var(--sub); padding:8px 0;">道具リストはありません</p>';
    return;
  }
  container.innerHTML = currentCase.tools.map((t, i) => `
    <div class="checklist-item">
      <div class="checklist-check ${t.checked ? 'done' : ''}" onclick="toggleTool(${i})">${t.checked ? '✓' : ''}</div>
      <span class="checklist-text ${t.checked ? 'done' : ''}">${t.name}</span>
    </div>
  `).join('');
}

function addTool() {
  if (!currentCase) return;
  const input = document.getElementById('newToolInput');
  const name = input.value.trim();
  if (!name) return;
  if (!currentCase.tools) currentCase.tools = [];
  currentCase.tools.push({ name, checked: false });
  input.value = '';
  updateCaseData();
  renderToolsList();
}

function toggleTool(index) {
  if (!currentCase) return;
  currentCase.tools[index].checked = !currentCase.tools[index].checked;
  updateCaseData();
  renderToolsList();
}

// ====== 写真撮影（ステップ別） ======
function renderPhotoSteps() {
  const container = document.getElementById('photoSteps');
  if (!currentCase.photos || typeof currentCase.photos !== 'object') {
    currentCase.photos = {};
    CONFIG.PHOTO_STEPS.forEach(s => currentCase.photos[s.id] = []);
  }
  container.innerHTML = CONFIG.PHOTO_STEPS.map(step => {
    const photos = currentCase.photos[step.id] || [];
    return `
      <div style="margin-bottom:12px;">
        <div style="font-size:13px; color:var(--sub); margin-bottom:6px;">${step.name}</div>
        <div class="photo-grid">
          ${photos.map(src => `<div class="photo-slot has-photo"><img src="${src}" alt="${step.name}"></div>`).join('')}
          <div class="photo-slot" onclick="takePhoto('${step.id}')">
            <span class="photo-icon">📷</span>
            <span>追加</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function takePhoto(stepId) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.capture = 'environment';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (!currentCase) return;
      if (!currentCase.photos[stepId]) currentCase.photos[stepId] = [];
      currentCase.photos[stepId].push(ev.target.result);
      updateCaseData();
      renderPhotoSteps();
      showToast('写真を追加しました');
    };
    reader.readAsDataURL(file);
  };
  input.click();
}

// ====== チェックリスト ======
function renderChecklist() {
  const container = document.getElementById('genbaChecklist');
  if (!currentCase.checklist || currentCase.checklist.length === 0) {
    const defaults = getDefaultChecklist(currentCase.workType);
    currentCase.checklist = defaults.map(text => ({ text, done: false }));
    updateCaseData();
  }
  container.innerHTML = currentCase.checklist.map((item, i) => `
    <li class="checklist-item">
      <div class="checklist-check ${item.done ? 'done' : ''}" onclick="toggleCheckItem(${i})">${item.done ? '✓' : ''}</div>
      <span class="checklist-text ${item.done ? 'done' : ''}">${item.text}</span>
    </li>
  `).join('');
}

function getDefaultChecklist(workType) {
  const checklists = {
    katazuke: ['作業範囲の確認', '作業前の全体写真撮影', '貴重品の有無を確認', '分別ルールの確認', '作業後の全体写真撮影', 'お客さんの完了確認'],
    fuyouhin: ['回収品リストの確認', '作業前の写真撮影', '家電リサイクル対象品の確認', '処分方法の仕分け', '作業後の写真撮影', 'お客さんの完了確認'],
    ihin: ['ご家族に貴重品の有無を事前確認', '仏壇・位牌の取り扱いについて確認', '写真・手紙類の取り扱いについて確認', '形見分け品の仕分け', '作業前の全体写真（各部屋）', '作業後の全体写真（各部屋）', 'ご家族への最終確認'],
    zanchi: ['撤去範囲の確認（図面 or 写真で明示）', '電気・ガス・水道の停止確認', '近隣への挨拶・告知', '産業廃棄物の分別', 'マニフェスト発行', '作業前の全体写真', '作業後の全体写真'],
    satei: ['査定対象品のリストアップ', '各品の状態確認・写真撮影', '市場相場の確認', '査定額の提示', 'お客さんの同意確認'],
    muryou: ['回収品の確認', '作業前の写真撮影', '回収品の搬出', '作業後の写真撮影'],
  };
  return checklists[workType] || ['作業前の写真撮影', '作業後の写真撮影', 'お客さんの完了確認'];
}

function toggleCheckItem(index) {
  if (!currentCase) return;
  currentCase.checklist[index].done = !currentCase.checklist[index].done;
  updateCaseData();
  renderChecklist();
  renderCompleteReport();
}

function addCheckItem() {
  if (!currentCase) return;
  const input = document.getElementById('newCheckInput');
  const text = input.value.trim();
  if (!text) return;
  currentCase.checklist.push({ text, done: false });
  input.value = '';
  updateCaseData();
  renderChecklist();
}

// ====== 作業時間 ======
function renderTimeTrackers() {
  const container = document.getElementById('timeTrackers');
  if (!currentCase.timeRecords) currentCase.timeRecords = [];
  const myRecord = currentCase.timeRecords.find(r => r.staff === currentUser.name);
  const isRunning = myRecord && myRecord.startTime && !myRecord.endTime;
  const elapsed = isRunning ? getElapsed(myRecord.startTime) : (myRecord ? formatDuration(myRecord.duration || 0) : '00:00:00');

  container.innerHTML = `
    <div class="time-tracker">
      <span class="time-tracker-name">${currentUser.name}</span>
      <span class="time-tracker-display" id="myTimeDisplay">${elapsed}</span>
      ${isRunning
        ? '<button class="time-tracker-btn stop" onclick="stopTimer()">停止</button>'
        : '<button class="time-tracker-btn start" onclick="startTimer()">開始</button>'
      }
    </div>
  `;

  if (isRunning) {
    if (window._timerInterval) clearInterval(window._timerInterval);
    window._timerInterval = setInterval(() => {
      const display = document.getElementById('myTimeDisplay');
      if (display) display.textContent = getElapsed(myRecord.startTime);
    }, 1000);
  }
}

function startTimer() {
  if (!currentCase) return;
  if (!currentCase.timeRecords) currentCase.timeRecords = [];
  let record = currentCase.timeRecords.find(r => r.staff === currentUser.name);
  if (!record) {
    record = { staff: currentUser.name, startTime: null, endTime: null, duration: 0 };
    currentCase.timeRecords.push(record);
  }
  record.startTime = new Date().toISOString();
  record.endTime = null;
  updateCaseData();
  renderTimeTrackers();
  showToast('作業時間の記録を開始しました');
}

function stopTimer() {
  if (!currentCase) return;
  const record = currentCase.timeRecords.find(r => r.staff === currentUser.name);
  if (!record || !record.startTime) return;
  record.endTime = new Date().toISOString();
  record.duration = (record.duration || 0) + (new Date(record.endTime) - new Date(record.startTime));
  record.startTime = null;
  if (window._timerInterval) clearInterval(window._timerInterval);
  updateCaseData();
  renderTimeTrackers();
  showToast('作業時間を記録しました');
}

function getElapsed(startTime) { return formatDuration(Date.now() - new Date(startTime).getTime()); }
function formatDuration(ms) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

// ====== 現場経費 ======
function renderGenbaExpenses() {
  const container = document.getElementById('genbaExpenseList');
  if (!currentCase.expenses) currentCase.expenses = [];
  if (currentCase.expenses.length === 0) {
    container.innerHTML = '<p style="font-size:13px; color:var(--sub); padding:8px 0;">経費の記録はありません</p>';
    return;
  }
  container.innerHTML = currentCase.expenses.map((exp, i) => `
    <div class="expense-row">
      <input type="text" class="expense-input" value="${exp.name}" onchange="updateGenbaExpense(${i}, 'name', this.value)" placeholder="項目名">
      <input type="number" class="expense-amount" value="${exp.amount}" onchange="updateGenbaExpense(${i}, 'amount', this.value)" placeholder="金額">
      <span style="font-size:13px; color:var(--sub)">円</span>
    </div>
  `).join('');
}

function addGenbaExpense() {
  if (!currentCase) return;
  if (!currentCase.expenses) currentCase.expenses = [];
  currentCase.expenses.push({ name: '', amount: 0 });
  updateCaseData();
  renderGenbaExpenses();
}

function updateGenbaExpense(index, field, value) {
  if (!currentCase) return;
  if (field === 'amount') value = parseInt(value) || 0;
  currentCase.expenses[index][field] = value;
  updateCaseData();
}

// ====== 回収動産 ======
function renderDisposals() {
  const container = document.getElementById('disposalList');
  if (!currentCase.disposals) currentCase.disposals = [];
  if (currentCase.disposals.length === 0) {
    container.innerHTML = '<p style="font-size:13px; color:var(--sub); padding:8px 0;">回収動産の記録はありません</p>';
    return;
  }
  container.innerHTML = currentCase.disposals.map(d => {
    const dtype = CONFIG.DISPOSAL_TYPES.find(t => t.id === d.type) || {};
    return `
      <div class="disposal-item">
        <span class="disposal-icon">${dtype.icon || '📦'}</span>
        <div class="disposal-info">
          <div class="disposal-name">${d.name}</div>
          <div class="disposal-type">${dtype.name || d.type}</div>
        </div>
        <span class="disposal-count">×${d.qty}</span>
      </div>
    `;
  }).join('');
}

function showAddDisposalModal() { document.getElementById('addDisposalModal').classList.add('open'); }

function addDisposalItem() {
  if (!currentCase) return;
  const name = document.getElementById('disposalItemName').value.trim();
  const qty = parseInt(document.getElementById('disposalItemQty').value) || 1;
  const type = document.getElementById('disposalItemType').value;
  const memo = document.getElementById('disposalItemMemo').value.trim();

  if (!name) { showToast('品名を入力してください'); return; }
  if (!type) { showToast('処分先を選択してください'); return; }

  if (!currentCase.disposals) currentCase.disposals = [];
  currentCase.disposals.push({ name, qty, type, memo, photos: [] });
  updateCaseData();
  renderDisposals();

  document.getElementById('disposalItemName').value = '';
  document.getElementById('disposalItemQty').value = '1';
  document.getElementById('disposalItemType').value = '';
  document.getElementById('disposalItemMemo').value = '';

  closeModal('addDisposalModal');
  showToast('動産を登録しました: ' + name);
}

// ====== 完了報告 ======
function renderCompleteReport() {
  const container = document.getElementById('completeReportSummary');
  if (!currentCase) return;
  const totalChecks = (currentCase.checklist || []).length;
  const doneChecks = (currentCase.checklist || []).filter(c => c.done).length;
  const totalPhotos = Object.values(currentCase.photos || {}).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0);

  container.innerHTML = `
    <div style="font-size:13px; color:var(--sub); line-height:2;">
      チェックリスト: ${doneChecks}/${totalChecks} 完了<br>
      写真: ${totalPhotos}枚<br>
      動産: ${(currentCase.disposals || []).length}件
    </div>
  `;
}

function completeGenba() {
  if (!currentCase) return;
  const unchecked = (currentCase.checklist || []).filter(c => !c.done);
  if (unchecked.length > 0) {
    if (!confirm(`未完了のチェック事項が${unchecked.length}件あります。完了しますか？`)) return;
  }
  currentCase.status = 'completed';
  currentCase.completedAt = new Date().toISOString();
  updateCaseData();
  backToGenbaSelect();
  renderCaseList();
  showToast('作業完了しました: ' + currentCase.id);
}

// ====== データ更新ヘルパー ======
function updateCaseData() {
  if (!currentCase) return;
  const cases = getCases();
  const idx = cases.findIndex(c => c.id === currentCase.id);
  if (idx >= 0) { cases[idx] = currentCase; saveCases(cases); }
}

// ====== 経費タブ ======
function renderExpenseList(filter = 'all') {
  const expenses = getExpenses();
  const container = document.getElementById('expenseList');
  let filtered = expenses;
  if (filter !== 'all') filtered = filtered.filter(e => e.category === filter);

  const filterRow = document.getElementById('expenseFilterRow');
  filterRow.innerHTML = `
    <button class="filter-btn ${filter==='all'?'active':''}" onclick="filterExpenses('all')">すべて</button>
    ${CONFIG.EXPENSE_CATEGORIES.map(c =>
      `<button class="filter-btn ${filter===c.id?'active':''}" onclick="filterExpenses('${c.id}')">${c.icon} ${c.name}</button>`
    ).join('')}
  `;

  if (filtered.length === 0) {
    container.innerHTML = '<p class="empty-msg">経費の記録はありません</p>';
    return;
  }
  container.innerHTML = filtered.map(e => {
    const cat = CONFIG.EXPENSE_CATEGORIES.find(c => c.id === e.category) || {};
    return `
      <div class="expense-card">
        <span class="expense-card-icon">${cat.icon || '📝'}</span>
        <div class="expense-card-info">
          <div class="expense-card-name">${e.name}</div>
          <div class="expense-card-meta">${e.date || ''} ${e.caseId ? '・案件: ' + e.caseId : ''}</div>
        </div>
        <span class="expense-card-amount">¥${(e.amount || 0).toLocaleString()}</span>
      </div>
    `;
  }).join('');
}

function filterExpenses(category) { renderExpenseList(category); }

function showExpenseForm() {
  const sel = document.getElementById('expenseCaseSelect');
  const cases = getCases();
  sel.innerHTML = '<option value="">案件を選択（任意）</option>' +
    cases.map(c => `<option value="${c.id}">${c.id} - ${c.customerName}</option>`).join('');

  const catSel = document.getElementById('expenseCategory');
  catSel.innerHTML = '<option value="">選択してください</option>' +
    CONFIG.EXPENSE_CATEGORIES.map(c => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join('');

  document.getElementById('expenseDate').value = new Date().toISOString().slice(0, 10);
  document.getElementById('expenseFormModal').classList.add('open');
}

function saveExpense() {
  const name = document.getElementById('expenseItemName').value.trim();
  const amount = parseInt(document.getElementById('expenseAmount').value) || 0;
  const category = document.getElementById('expenseCategory').value;
  const date = document.getElementById('expenseDate').value;
  const caseId = document.getElementById('expenseCaseSelect').value;
  const memo = document.getElementById('expenseMemo').value.trim();

  if (!name) { showToast('項目名を入力してください'); return; }
  if (!amount) { showToast('金額を入力してください'); return; }
  if (!category) { showToast('カテゴリを選択してください'); return; }

  const expenses = getExpenses();
  expenses.unshift({
    id: 'EXP-' + Date.now(), name, amount, category, date, caseId, memo,
    createdAt: new Date().toISOString(), createdBy: currentUser.name,
  });
  saveExpenses(expenses);

  document.getElementById('expenseItemName').value = '';
  document.getElementById('expenseAmount').value = '';
  document.getElementById('expenseCategory').value = '';
  document.getElementById('expenseMemo').value = '';

  closeModal('expenseFormModal');
  renderExpenseList();
  showToast('経費を登録しました');
}

function showReceiptCapture() {
  document.getElementById('receiptModal').classList.add('open');
  document.getElementById('receiptPreview').style.display = 'none';
  document.getElementById('receiptSubmitBtn').style.display = 'none';
}

function captureReceipt() {
  const input = document.createElement('input');
  input.type = 'file'; input.accept = 'image/*'; input.capture = 'environment';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      document.getElementById('receiptImage').src = ev.target.result;
      document.getElementById('receiptPreview').style.display = 'block';
      document.getElementById('receiptSubmitBtn').style.display = 'block';
      document.getElementById('receiptOcrResult').innerHTML =
        '<p style="font-size:13px; color:var(--sub);">OCR読み取り機能は本番で実装されます。手入力で金額を登録してください。</p>';
    };
    reader.readAsDataURL(file);
  };
  input.click();
}

function processReceipt() {
  closeModal('receiptModal');
  showExpenseForm();
  showToast('レシート画像を保存しました。金額を入力してください。');
}

// ====== ガイドタブ ======
function showGuide(type) {
  document.getElementById('guideMenuSection').style.display = 'none';
  document.getElementById('guideContent').style.display = 'block';
  const body = document.getElementById('guideBody');

  const guides = {
    manual: {
      title: '📋 作業マニュアル',
      content: CONFIG.WORK_TYPES.map(w => `
        <div class="genba-card">
          <div class="genba-card-title">${w.name}</div>
          <ul style="padding-left:20px; font-size:14px; line-height:2;">
            ${getDefaultChecklist(w.id).map(item => `<li>${item}</li>`).join('')}
          </ul>
        </div>
      `).join('')
    },
    safety: {
      title: '⚠️ 安全管理ルール',
      content: `<div class="genba-card"><div style="font-size:14px; line-height:2;">
        ・高所作業時は必ずヘルメット着用<br>・重量物は2人以上で運搬<br>
        ・危険物（灯油・ガスボンベ等）は専門業者に依頼<br>・作業前に周囲の安全確認<br>
        ・体調不良時は無理をしない<br>・緊急連絡先: 浅野さん
      </div></div>`
    },
    customer: {
      title: '🤝 お客さん対応ガイド',
      content: `<div class="genba-card"><div style="font-size:14px; line-height:2;">
        <strong>挨拶:</strong> 「テイクバックの○○です。本日はよろしくお願いします。」<br>
        <strong>作業前:</strong> 作業範囲と注意点をお客さんと一緒に確認<br>
        <strong>作業中:</strong> 貴重品・思い出の品が出てきたら必ずお客さんに確認<br>
        <strong>作業後:</strong> お客さんに全体を確認していただき、完了の承諾を得る<br>
        <strong>困ったら:</strong> 浅野さんに電話で相談
      </div></div>`
    },
    disposal: {
      title: '♻️ 分別・処分ガイド',
      content: CONFIG.DISPOSAL_TYPES.map(d => `
        <div style="display:flex; align-items:center; gap:10px; padding:10px 0; border-bottom:1px solid var(--border);">
          <span style="font-size:24px;">${d.icon}</span>
          <div><div style="font-weight:700;">${d.name}</div>
          <div style="font-size:12px; color:var(--sub);">${d.hasVendor ? '取引先への引き渡し' : '自分で処理'}</div></div>
        </div>
      `).join('')
    },
    app: {
      title: '📱 アプリの使い方',
      content: `<div class="genba-card"><div style="font-size:14px; line-height:2;">
        <strong>今日の現場:</strong> 今日の案件が自動表示。タップで作業画面へ。<br>
        <strong>案件:</strong> 全案件の一覧。ステータスで絞り込み可能。<br>
        <strong>経費:</strong> レシート撮影か手入力で経費を登録。<br>
        <strong>ツール:</strong> 取引先住所録・連絡先・AI相談。<br>
        <strong>ガイド:</strong> 作業マニュアル・安全ルール。<br>
        <strong>ホーム:</strong> 右上🏠ボタン。今日と明日の予定が見える。<br>
        <strong>マイページ:</strong> 右上👤ボタン。出退勤とログアウト。<br>
        <strong>文字の拡大:</strong> 2本指でピンチズームできます。
      </div></div>`
    },
  };

  const guide = guides[type];
  body.innerHTML = `<h3 class="section-title">${guide.title}</h3>${guide.content}`;
}

function closeGuide() {
  document.getElementById('guideMenuSection').style.display = 'block';
  document.getElementById('guideContent').style.display = 'none';
}

// ====== ツールタブ ======
function showAddressBook() {
  document.getElementById('toolsMenuSection').style.display = 'none';
  document.getElementById('toolContent').style.display = 'block';
  const vendors = CONFIG.VENDORS;
  document.getElementById('toolBody').innerHTML = `
    <h3 class="section-title">📍 取引先住所録</h3>
    ${vendors.length === 0 ? '<p class="empty-msg">取引先が登録されていません</p>' :
      vendors.map(v => `
        <div class="menu-item" onclick="window.open('https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(v.address)}', '_blank')">
          <span class="menu-icon">📍</span>
          <div style="flex:1;"><div style="font-weight:500;">${v.name}</div>
          <div style="font-size:12px; color:var(--sub);">${v.address}</div></div>
          <span class="menu-arrow">🗺️</span>
        </div>
      `).join('')}
  `;
}

function showPhoneBook() {
  document.getElementById('toolsMenuSection').style.display = 'none';
  document.getElementById('toolContent').style.display = 'block';
  document.getElementById('toolBody').innerHTML = `
    <h3 class="section-title">📞 連絡先一覧</h3>
    ${CONFIG.CONTACTS.map(c => `
      <a href="tel:${c.phone}" style="text-decoration:none; color:inherit;">
        <div class="menu-item">
          <span class="menu-icon">👤</span>
          <div style="flex:1;"><div style="font-weight:500;">${c.name}</div>
          <div style="font-size:12px; color:var(--sub);">${c.role} ${c.phone ? '・ ' + c.phone : ''}</div></div>
          <span class="menu-arrow">📞</span>
        </div>
      </a>
    `).join('')}
  `;
}

function showAiChat() {
  document.getElementById('toolsMenuSection').style.display = 'none';
  document.getElementById('toolContent').style.display = 'block';
  document.getElementById('toolBody').innerHTML = `
    <h3 class="section-title">🤖 AI相談</h3>
    <div class="genba-card">
      <p style="font-size:14px; color:var(--sub);">AI相談機能は本番でClaude API経由で実装されます。</p>
      <p style="font-size:14px; color:var(--sub); margin-top:8px;">お急ぎの場合は浅野さんに直接ご連絡ください。</p>
    </div>
  `;
}

function showReportGen() {
  document.getElementById('toolsMenuSection').style.display = 'none';
  document.getElementById('toolContent').style.display = 'block';
  document.getElementById('toolBody').innerHTML = `
    <h3 class="section-title">📄 報告書作成</h3>
    <div class="genba-card">
      <p style="font-size:14px; color:var(--sub);">報告書自動生成機能は本番で実装されます。</p>
      <p style="font-size:14px; color:var(--sub); margin-top:8px;">現在は「今日の現場」タブの完了報告をご利用ください。</p>
    </div>
  `;
}

function closeTool() {
  document.getElementById('toolsMenuSection').style.display = 'block';
  document.getElementById('toolContent').style.display = 'none';
}

// ====== メンバー情報 ======
function showMemberInfo() {
  closeModal('mypageModal');
  switchTab('tools');
  document.getElementById('toolsMenuSection').style.display = 'none';
  document.getElementById('toolContent').style.display = 'block';
  document.getElementById('toolBody').innerHTML = `
    <h3 class="section-title">👥 メンバー情報</h3>
    ${CONFIG.STAFF.map(s => `
      <div class="genba-card" style="margin-bottom:12px;">
        <div style="font-size:16px; font-weight:700; margin-bottom:8px;">${s.name}</div>
        <div style="font-size:13px; color:var(--sub); line-height:2;">
          <div>🩸 血液型: ${s.bloodType || '未登録'}</div>
          <div>🎂 生年月日: ${s.birthday || '未登録'}</div>
          <div>📞 連絡先: ${s.phone ? '<a href="tel:' + s.phone + '">' + s.phone + '</a>' : '未登録'}</div>
          <div>🆘 緊急連絡先: ${s.emergencyContact || '未登録'}</div>
        </div>
      </div>
    `).join('')}
  `;
}

// ====== 通知 ======
function showNotifications() { document.getElementById('notifModal').classList.add('open'); }

// ====== ヘルパー ======
function showToast(msg) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function showHelp() { showToast('ヘルプ画面（実装予定）'); }

// ====== PIN変更 ======
function showChangePinModal() {
  closeModal('mypageModal');
  changePinBuffer = [];
  changePinMode = 'new';
  changePinFirst = '';
  document.getElementById('changePinPrompt').textContent = '新しい4桁PINを入力';
  updateChangePinDots();
  document.getElementById('changePinModal').classList.add('open');
}

function changePinInput(num) {
  if (changePinBuffer.length >= 4) return;
  changePinBuffer.push(num);
  updateChangePinDots();

  if (changePinBuffer.length === 4) {
    setTimeout(() => processChangePinEntry(), 200);
  }
}

function changePinDelete() {
  if (changePinBuffer.length === 0) return;
  changePinBuffer.pop();
  updateChangePinDots();
}

function updateChangePinDots() {
  const dots = document.getElementById('changePinDisplay').querySelectorAll('.pin-dot');
  dots.forEach((dot, i) => {
    dot.classList.toggle('filled', i < changePinBuffer.length);
  });
}

function processChangePinEntry() {
  const entered = changePinBuffer.join('');

  if (changePinMode === 'new') {
    changePinFirst = entered;
    changePinMode = 'confirm';
    changePinBuffer = [];
    updateChangePinDots();
    document.getElementById('changePinPrompt').textContent = '確認のためもう一度入力';
    return;
  }

  if (changePinMode === 'confirm') {
    if (entered === changePinFirst) {
      localStorage.setItem(PIN_KEY + '_' + currentUser.name, entered);
      closeModal('changePinModal');
      showToast('PINコードを変更しました');
    } else {
      const display = document.getElementById('changePinDisplay');
      display.classList.add('pin-error');
      setTimeout(() => {
        display.classList.remove('pin-error');
        changePinBuffer = [];
        updateChangePinDots();
        changePinMode = 'new';
        changePinFirst = '';
        document.getElementById('changePinPrompt').textContent = 'PINが一致しません。もう一度入力';
      }, 400);
    }
  }
}

// ====== 初期化 ======
window.addEventListener('DOMContentLoaded', () => {
  if (!tryAutoLogin()) {
    document.getElementById('loginScreen').classList.add('active');
  }
});

// ===== 他タブからのlocalStorage変更を検知（エグゼクティブダッシュボードからの代理連絡等） =====
window.addEventListener('storage', (e) => {
  if (e.key === 'f8_leave_requests') {
    // 休み連絡が他タブで変更された場合、お知らせを更新
    if (typeof renderHomeNotices === 'function') renderHomeNotices();
  }
  if (e.key && e.key.startsWith('tkb_saisei_attend_')) {
    // 勤怠が他タブで変更された場合
    if (typeof checkTodayAttendance === 'function') checkTodayAttendance();
    if (typeof checkProxyAttendance === 'function') checkProxyAttendance();
  }
});

/**
 * テイクバック再生事業アプリ - 設定
 * APIキーは含まない。Supabase Edge Function経由で安全に呼び出す。
 */

const CONFIG = {
  // Supabase（AWAI共用・DBは使わない。Edge Functionのみ）
  SUPABASE_URL: 'https://njdnfvlucwasrafoepmu.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qZG5mdmx1Y3dhc3JhZm9lcG11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzMTEzNjgsImV4cCI6MjA5MDg4NzM2OH0.jDjqf3nWqaQ0sMfDf-85dDQNbEhX90qLsOOhWJdDlM8',

  // GAS（スプレッドシート書き込み）
  GAS_URL: '',

  // 難易度
  DIFFICULTY: [
    { id: 1, name: '低', multiplier: 1.0 },
    { id: 2, name: '中', multiplier: 1.3 },
    { id: 3, name: '高', multiplier: 1.6 },
  ],

  // 作業種別
  WORK_TYPES: [
    { id: 'katazuke', name: '片付け' },
    { id: 'fuyouhin', name: '不用品回収' },
    { id: 'ihin', name: '遺品整理' },
    { id: 'zanchi', name: '残置物撤去' },
    { id: 'satei', name: '査定買取' },
    { id: 'muryou', name: '無料回収' },
  ],

  // 動産の処分先分類
  DISPOSAL_TYPES: [
    { id: 'ryutsu', name: '流通事業へ引き渡し', icon: '📦', hasVendor: true },
    { id: 'boueki', name: '貿易業者（ロット販売）', icon: '🌍', hasVendor: true },
    { id: 'scrap', name: 'スクラップ', icon: '♻️', hasVendor: true },
    { id: 'muryou', name: '無料廃棄', icon: '🆓', hasVendor: true },
    { id: 'sanpai', name: '産業廃棄物', icon: '🏭', hasVendor: true },
    { id: 'sodai', name: '自治体 粗大ごみ', icon: '🏛️', hasVendor: false },
    { id: 'kanen', name: '可燃ごみ', icon: '🔥', hasVendor: false },
  ],

  // 案件ステータス（7段階）
  CASE_STATUS: [
    { id: 'received', name: '受付', color: '#e8edf2', textColor: '#1C2541' },
    { id: 'survey', name: '現地調査', color: '#e0f2fa', textColor: '#2a6a8a' },
    { id: 'estimating', name: '見積もり中', color: '#fef6e0', textColor: '#8a7020' },
    { id: 'confirmed', name: '確定', color: '#e6f4ec', textColor: '#006B3F' },
    { id: 'working', name: '作業中', color: '#fff3e0', textColor: '#d4790e' },
    { id: 'completed', name: '完了', color: '#e6f4ec', textColor: '#006B3F' },
    { id: 'settled', name: '精算済', color: '#e8edf2', textColor: '#1C2541' },
  ],

  // スタッフ一覧
  STAFF: [
    { name: '浅野儀頼', role: 'admin', login: true, attendance: false, phone: '', bloodType: '', birthday: '', emergencyContact: '' },
    { name: '平野光雄', role: 'staff', login: true, attendance: true, phone: '', bloodType: '', birthday: '', emergencyContact: '' },
    { name: '松本豊彦', role: 'staff', login: true, attendance: true, phone: '', bloodType: '', birthday: '', emergencyContact: '' },
    { name: '北瀬孝', role: 'staff', login: false, attendance: 'proxy', phone: '', bloodType: '', birthday: '', emergencyContact: '' },
    { name: '三島圭織', role: 'staff', login: false, attendance: false, phone: '', bloodType: '', birthday: '', emergencyContact: '' },
  ],

  // 経費カテゴリ
  EXPENSE_CATEGORIES: [
    { id: 'gas', name: 'ガソリン代', icon: '⛽' },
    { id: 'highway', name: '高速代', icon: '🛣️' },
    { id: 'material', name: '材料費', icon: '🔧' },
    { id: 'disposal', name: '処分費', icon: '🗑️' },
    { id: 'other', name: 'その他', icon: '📝' },
  ],

  // 取引先マスタ（住所録）
  VENDORS: [
    { name: 'サンプル取引先A', type: 'scrap', address: '岐阜市○○', phone: '058-000-0000' },
    { name: 'サンプル取引先B', type: 'sanpai', address: '各務原市○○', phone: '058-000-0001' },
  ],

  // 連絡先一覧
  CONTACTS: [
    { name: '浅野儀頼', role: '作業責任者', phone: '' },
    { name: '平野光雄', role: 'スタッフ', phone: '' },
    { name: '松本豊彦', role: 'スタッフ', phone: '' },
    { name: '北瀬孝', role: 'スタッフ', phone: '' },
    { name: '三島圭織', role: 'スタッフ', phone: '' },
  ],

  // 写真ステップ
  PHOTO_STEPS: [
    { id: 'survey', name: '現地調査' },
    { id: 'before', name: '作業前' },
    { id: 'during', name: '作業中' },
    { id: 'after', name: '作業後' },
    { id: 'complete', name: '完了報告' },
  ],

  // Google Chatルーム
  CHAT_ROOMS: [
    { id: 'team', name: 'チーム', url: '' },
    { id: 'admin', name: '浅野さん', url: '' },
    { id: 'ai', name: 'AI相談', url: '' },
  ],

  // 管理番号フォーマット（再生事業: RS-YYMM-XXX）
  MGMT_PREFIX: () => {
    const now = new Date();
    return 'RS-' + String(now.getFullYear()).slice(2) + String(now.getMonth() + 1).padStart(2, '0');
  },
};

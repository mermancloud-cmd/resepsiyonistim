import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const exportDir = path.join(root, 'data', 'exports', 'latest');
const proposedDir = path.join(root, 'data', 'proposed');

if (!existsSync(exportDir)) {
  throw new Error(`Export directory not found: ${exportDir}`);
}

await mkdir(proposedDir, { recursive: true });

const files = (await readdir(exportDir)).filter((file) => file.endsWith('.json'));
for (const file of files) {
  const source = await readFile(path.join(exportDir, file), 'utf8');
  await writeFile(path.join(proposedDir, file), source, 'utf8');
}

const wf01File = files.find((file) => file.includes('WF-01-Inbound-WhatsApp-Router-AI-Orchestrator'));
if (!wf01File) throw new Error('WF-01 export not found.');

const wfPath = path.join(proposedDir, wf01File);
const workflow = JSON.parse(await readFile(wfPath, 'utf8'));

function node(name) {
  const found = workflow.nodes.find((item) => item.name === name);
  if (!found) throw new Error(`Node not found: ${name}`);
  return found;
}

function ensureNode(name, template) {
  let found = workflow.nodes.find((item) => item.name === name);
  if (!found) {
    found = template;
    workflow.nodes.push(found);
  }
  return found;
}

node('Extract Payload').parameters.jsCode = String.raw`const body = $input.first().json.body || $input.first().json;

try {
  if (body.event !== 'messages.upsert') {
    return [{ json: { valid: false, skip_reason: 'not_a_message_event' } }];
  }

  const data = body.data;
  if (!data || !data.key) {
    return [{ json: { valid: false, skip_reason: 'missing_data' } }];
  }

  const remoteJid = data.key.remoteJid || '';
  if (remoteJid.endsWith('@g.us')) {
    return [{ json: { valid: false, skip_reason: 'group_chat' } }];
  }

  const msg = data.message || {};
  const messageText =
    msg.conversation ||
    msg.extendedTextMessage?.text ||
    msg.imageMessage?.caption ||
    msg.videoMessage?.caption ||
    null;

  if (!messageText || messageText.trim() === '') {
    return [{ json: { valid: false, skip_reason: 'no_text_content' } }];
  }

  const guestPhone = remoteJid.replace('@s.whatsapp.net', '').replace(/\D/g, '');
  const fromMe = data.key.fromMe === true;
  const testMode = body.test_mode === true || body.testMode === true || data.test_mode === true;
  const testSessionId = body.test_session_id || body.testSessionId || data.test_session_id || data.testSessionId || null;
  const testStateSeed = body.test_state_seed || body.testStateSeed || data.test_state_seed || data.testStateSeed || null;

  return [{
    json: {
      valid: true,
      instance_name: body.instance || '',
      guest_phone: guestPhone,
      guest_push_name: fromMe ? null : (data.pushName || null),
      message_text: messageText.trim(),
      whatsapp_message_id: data.key.id || null,
      from_me: fromMe,
      message_direction: fromMe ? 'owner_outbound' : 'guest_inbound',
      test_mode: testMode,
      test_session_id: testSessionId,
      test_state_seed: testMode && testStateSeed && typeof testStateSeed === 'object' ? testStateSeed : null,
      message_timestamp: data.messageTimestamp
        ? new Date(data.messageTimestamp * 1000).toISOString()
        : new Date().toISOString()
    }
  }];
} catch (err) {
  return [{ json: { valid: false, skip_reason: 'parse_exception', error: err.message } }];
}`;

node('Prepare Tenant Data').parameters.jsCode = String.raw`const rows = $input.all();
const payload = $('Extract Payload').first().json;

if (!rows || rows.length === 0 || !rows[0].json) {
  return [{ json: { tenant_found: false } }];
}

const row = rows[0].json;
const instance = Array.isArray(row) ? row[0] : row;

if (!instance || !instance.tenants) {
  return [{ json: { tenant_found: false } }];
}

const tenant = instance.tenants;

return [{
  json: {
    tenant_found: true,
    is_active: tenant.is_active === true,
    tenant_id: tenant.id,
    tenant_slug: tenant.slug,
    business_name: tenant.business_name,
    owner_phone: tenant.owner_phone,
    timezone: tenant.timezone || 'Europe/Istanbul',
    locale: tenant.locale || 'tr',
    instance_name: instance.instance_name,
    whatsapp_phone: instance.phone_number,
    guest_phone: payload.guest_phone,
    guest_push_name: payload.guest_push_name,
    message_text: payload.message_text,
    whatsapp_message_id: payload.whatsapp_message_id,
    from_me: payload.from_me === true,
    message_direction: payload.message_direction || (payload.from_me === true ? 'owner_outbound' : 'guest_inbound'),
    test_mode: payload.test_mode === true,
    test_session_id: payload.test_session_id || null,
    test_state_seed: payload.test_state_seed || null,
    message_timestamp: payload.message_timestamp
  }
}];`;

node('Get Conversation').parameters.queryParameters.parameters =
  node('Get Conversation').parameters.queryParameters.parameters.map((param) => (
    param.name === 'select'
      ? { ...param, value: 'id,status,current_state,consecutive_failures,metadata,guest_name,last_message_at,last_ai_message_at' }
      : param
  ));

node('Prepare Conversation').parameters.jsCode = String.raw`const tenantData = $('Prepare Tenant Data').first().json;
const rows = $('Get Conversation').all();
const first = rows.length > 0 ? rows[0].json : null;
const conv = Array.isArray(first) ? (first[0] || null) : first;
const testMode = tenantData.test_mode === true;
const existingMetadata = conv?.metadata && typeof conv.metadata === 'object' ? conv.metadata : {};
const sameTestSession = testMode && tenantData.test_session_id && existingMetadata.test_session_id === tenantData.test_session_id;
const lastMessageAt = conv?.last_message_at ? Date.parse(conv.last_message_at) : NaN;
const staleMs = 6 * 60 * 60 * 1000;
const handoffActive = conv && (conv.status === 'human_active' || conv.status === 'waiting_human');
const staleConversation = !testMode
  && conv
  && !handoffActive
  && Number.isFinite(lastMessageAt)
  && (Date.now() - lastMessageAt > staleMs);
const ownerTakeoverActive = testMode
  && conv
  && (conv.status === 'human_active' || conv.status === 'waiting_human')
  && existingMetadata.owner_takeover === true;
const seed = testMode && tenantData.test_state_seed && typeof tenantData.test_state_seed === 'object'
  ? tenantData.test_state_seed
  : {};

const metadata = ownerTakeoverActive
  ? existingMetadata
  : testMode
  ? { ...seed, test_session_id: tenantData.test_session_id || ('test-' + Date.now()) }
  : staleConversation
  ? { stale_reset_at: new Date().toISOString(), previous_conversation_id: conv.id }
  : existingMetadata;
const conversationStatus = ownerTakeoverActive ? conv.status : (testMode ? 'active' : (conv?.status || 'active'));
const currentState = ownerTakeoverActive
  ? (conv.current_state || 'HUMAN_HANDOFF')
  : staleConversation
  ? 'GREETING'
  : (testMode && !sameTestSession ? 'GREETING' : (conv?.current_state || 'GREETING'));
const guestName = staleConversation
  ? (tenantData.guest_push_name || null)
  : testMode
  ? (seed.guest_name || tenantData.guest_push_name || null)
  : (conv?.guest_name || tenantData.guest_push_name || null);

return [{
  json: {
    ...tenantData,
    conversation_exists: conv !== null,
    conversation_id: conv?.id || null,
    conversation_status: conversationStatus,
    current_state: currentState,
    consecutive_failures: testMode ? 0 : (conv?.consecutive_failures || 0),
    metadata,
    guest_name: guestName
  }
}];`;

node('Upsert Conversation').parameters.jsonBody = String.raw`={{
JSON.stringify({
  tenant_id: $json.tenant_id,
  guest_phone: $json.guest_phone,
  guest_name: $json.guest_name || null,
  status: 'active',
  current_state: $json.current_state,
  consecutive_failures: $json.test_mode === true ? 0 : ($json.consecutive_failures || 0),
  metadata: $json.metadata || {},
  last_message_at: new Date().toISOString(),
  last_customer_message_at: new Date().toISOString(),
  message_count: ($json.test_mode === true && !$json.conversation_exists) ? 1 : undefined
})
}}`;

node('Validate State And Merge').parameters.jsCode = String.raw`const data = $input.first().json;
const AT = {
  GREETING: ['QUALIFYING','PRESENTING_ROOMS','HANDLING_OBJECTIONS','COLLECTING_GUEST_INFO','CONFIRMING_RESERVATION','HUMAN_HANDOFF'],
  QUALIFYING: ['PRESENTING_ROOMS','HANDLING_OBJECTIONS','COLLECTING_GUEST_INFO','CONFIRMING_RESERVATION','HUMAN_HANDOFF','CLOSED'],
  PRESENTING_ROOMS: ['HANDLING_OBJECTIONS','COLLECTING_GUEST_INFO','CONFIRMING_RESERVATION','QUALIFYING','HUMAN_HANDOFF'],
  HANDLING_OBJECTIONS: ['PRESENTING_ROOMS','COLLECTING_GUEST_INFO','CONFIRMING_RESERVATION','QUALIFYING','HUMAN_HANDOFF','CLOSED'],
  COLLECTING_GUEST_INFO: ['CONFIRMING_RESERVATION','PRESENTING_ROOMS','QUALIFYING','HUMAN_HANDOFF'],
  CONFIRMING_RESERVATION: ['AWAITING_DEPOSIT','COLLECTING_GUEST_INFO','PRESENTING_ROOMS','HUMAN_HANDOFF'],
  AWAITING_DEPOSIT: ['RESERVATION_CONFIRMED','HUMAN_HANDOFF','CLOSED'],
  RESERVATION_CONFIRMED: ['CLOSED','HUMAN_HANDOFF'],
  HUMAN_HANDOFF: ['GREETING','CLOSED'],
  CLOSED: []
};

const cur = data.current_state || 'GREETING';
const proposed = data.next_state || cur;
const allowed = AT[cur] || [];
let finalState = allowed.includes(proposed) ? proposed : cur;
if (data.trigger_handoff && allowed.includes('HUMAN_HANDOFF')) finalState = 'HUMAN_HANDOFF';

const msg = String(data.message_text || '');
const normMsg = msg.toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\u0131/g,'i');
const baseMeta = data.test_mode === true ? (data.metadata || {}) : (data.metadata || {});
const extracted = { ...(data.metadata_updates || {}) };

function isoDate(year, month, day) {
  return String(year) + '-' + String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0');
}

const monthMap = {
  ocak: 1, subat: 2, mart: 3, nisan: 4, mayis: 5, haziran: 6,
  temmuz: 7, agustos: 8, eylul: 9, ekim: 10, kasim: 11, aralik: 12
};
const monthAlternatives = Object.keys(monthMap).join('|');
const rangeWithMonth = normMsg.match(new RegExp('\\b([1-9]|[12]\\d|3[01])\\s*[-/ ]\\s*([1-9]|[12]\\d|3[01])\\s*(' + monthAlternatives + ')(?:\\s+(20\\d{2}))?\\b', 'i'));
const singleMonthRange = normMsg.match(new RegExp('\\b([1-9]|[12]\\d|3[01])\\s*(' + monthAlternatives + ')\\s*[-/ ]\\s*([1-9]|[12]\\d|3[01])\\s*(' + monthAlternatives + ')(?:\\s+(20\\d{2}))?\\b', 'i'));
const today = new Date();
if (data.pre_ai_reply !== true && !extracted.check_in_date && !extracted.check_out_date) {
  let startDay = null;
  let endDay = null;
  let startMonth = null;
  let endMonth = null;
  let parsedYear = null;
  if (rangeWithMonth) {
    startDay = Number(rangeWithMonth[1]);
    endDay = Number(rangeWithMonth[2]);
    startMonth = monthMap[rangeWithMonth[3]];
    endMonth = startMonth;
    parsedYear = rangeWithMonth[4] ? Number(rangeWithMonth[4]) : null;
  } else if (singleMonthRange) {
    startDay = Number(singleMonthRange[1]);
    startMonth = monthMap[singleMonthRange[2]];
    endDay = Number(singleMonthRange[3]);
    endMonth = monthMap[singleMonthRange[4]];
    parsedYear = singleMonthRange[5] ? Number(singleMonthRange[5]) : null;
  }
  if (startDay && endDay && startMonth && endMonth) {
    let year = parsedYear || today.getFullYear();
    if (!parsedYear && new Date(Date.UTC(year, startMonth - 1, startDay)) < new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()))) year += 1;
    extracted.check_in_date = isoDate(year, startMonth, startDay);
    extracted.check_out_date = isoDate(year, endMonth, endDay);
  }
}

const adultMatch = normMsg.match(/\b([1-9]|1\d|2\d)\s*(yetiskin|kisi|misafir|adult)\b/i);
if (adultMatch && (extracted.adults === undefined || extracted.adults === null || extracted.adults === '')) extracted.adults = Number(adultMatch[1]);

const hasDayNumber = /\b([1-9]|[12]\d|3[01])\b/.test(msg);
const hasMonthName = /\d{1,2}\s*(ocak|şubat|subat|mart|nisan|mayıs|mayis|haziran|temmuz|ağustos|agustos|eylül|eylul|ekim|kasım|kasim|aralık|aralik)/i.test(msg);
const hasNumericDate = /\d{4}-\d{2}-\d{2}|\d{1,2}[.\/\-]\d{1,2}/.test(msg);
if (!hasDayNumber && !hasMonthName && !hasNumericDate) {
  delete extracted.check_in_date;
  delete extracted.check_out_date;
}
if (!/(adim|adım|ben|ismim|ismin|adi[nm]|adı[nm])\b/i.test(normMsg)) delete extracted.guest_name;
if (!/(jakuzi|jakuzili|havuz|havuzlu|aile|cocuk|çocuk|villa|oda|bungalov|suit|suite|deluxe|premium)/i.test(normMsg)) delete extracted.preferred_room_type;
if (!/(jakuzi|jakuzili|havuz|havuzlu|evcil|kopek|köpek|kedi|kahvalti|kahvaltı|erken|gec|geç|engelli|tekerlek|bebek|cocuk|çocuk|barbeku|barbekü|balayi|balayı)/i.test(normMsg)) delete extracted.special_requests;

const merged = { ...baseMeta };
for (const [key, value] of Object.entries(extracted)) {
  if (value !== null && value !== undefined && value !== '') merged[key] = value;
}
if (data.test_mode === true) merged.test_session_id = data.test_session_id || merged.test_session_id || ('test-' + Date.now());
if (data.pre_ai_reply === true) {
  delete merged.check_in_date;
  delete merged.check_out_date;
  delete merged.checkin_date;
  delete merged.checkout_date;
}

const checkIn = merged.check_in_date || merged.checkin_date || null;
const checkOut = merged.check_out_date || merged.checkout_date || null;
const adults = merged.adults ?? merged.guest_count ?? null;
const missing = [];
if (!checkIn) missing.push('check_in_date');
if (!checkOut) missing.push('check_out_date');
if (adults === null || adults === undefined || adults === '') missing.push('adults');

let reservationStage = 'NEW';
if (missing.length === 0) reservationStage = 'READY_FOR_QUOTE';
else if (checkIn || checkOut || adults || merged.preferred_room_type || merged.room_type || merged.room_preference) reservationStage = 'QUALIFYING';

const hotStates = ['COLLECTING_GUEST_INFO','CONFIRMING_RESERVATION','AWAITING_DEPOSIT','RESERVATION_CONFIRMED'];
const warmStates = ['PRESENTING_ROOMS','HANDLING_OBJECTIONS','QUALIFYING'];
const interestLevel = hotStates.includes(finalState) ? 'hot' : warmStates.includes(finalState) ? 'warm' : 'cold';
const updatedGuestName = extracted.guest_name || data.guest_name || merged.guest_name || null;

return [{
  json: {
    ...data,
    validated_next_state: finalState,
    merged_metadata: merged,
    updated_guest_name: updatedGuestName,
    interest_level: interestLevel,
    party_size: (Number(merged.adults || 0) + Number(merged.children || 0)) || null,
    reservation_stage: reservationStage,
    missing_fields: missing,
    is_ready_for_quote: missing.length === 0
  }
}];`;

node('Check Business Hours').parameters.jsCode = String.raw`const convData = $('Set Conversation ID').first().json;
const settings = $('Get Tenant Settings').first().json;

const timezone = convData.timezone || 'Europe/Istanbul';
const start = settings.business_hours_start || '08:00';
const end = settings.business_hours_end || '22:00';

const now = new Date();
const tenantTime = new Intl.DateTimeFormat('en-GB', {
  timeZone: timezone,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false
}).format(now);

const [ch, cm] = tenantTime.split(':').map(Number);
const [sh, sm] = start.split(':').map(Number);
const [eh, em] = end.split(':').map(Number);

const current = ch * 60 + cm;
const startMin = sh * 60 + sm;
const endMin = eh * 60 + em;

const withinHours = convData.test_mode === true || (current >= startMin && current <= endMin);

return [{ json: { ...convData, settings, within_business_hours: withinHours } }];`;

ensureNode('Pre-AI Safety Guard', {
  parameters: {},
  id: 'pre-ai-safety-guard',
  name: 'Pre-AI Safety Guard',
  type: 'n8n-nodes-base.code',
  typeVersion: 2,
  position: [2120, 340],
}).parameters.jsCode = String.raw`const item = $input.first().json;
const text = String(item.message_text || '');
const normalized = text
  .toLocaleLowerCase('tr-TR')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/\u0131/g, 'i')
  .replace(/\s+/g, ' ')
  .trim();

const policySalesPriority = /(kac oda|fiyat|jakuzi|havuz|villa|suit|deluxe|bungalov)/.test(normalized);

if (/(onceki talimat|talimatlari unut|sistem prompt|system prompt|developer mesaj|api key|gizli anahtar)/.test(normalized)) {
  return preAiReply('Bu tur teknik bilgileri paylasamam. Konaklama icin hangi tarihler ve kac kisi icin bakiyorsunuz?', {
    next_state: 'QUALIFYING',
    metadata_updates: { safety_request: 'prompt_injection_deflected' }
  });
}

if (/(hasar|kiril|kirildi|depozito kes|depozito|teminat)/.test(normalized)) {
  return preAiReply('Hasar ve depozito kesintisi politikasini sistemde net goremiyorum. Ekibe sorup kesin bilgiyi paylasayim.', {
    next_state: 'QUALIFYING',
    metadata_updates: { policy_question: 'damage_deposit' }
  });
}

if (/(erken cik|bir gun erken|kalan gece|iade|para iadesi|iptal)/.test(normalized)) {
  return preAiReply('Iade politikasini sistemde kesin goremiyorum. Rezervasyon numaranizi veya mevcut giris-cikis tarihinizi yazarsaniz ekibe iletip net bilgiyi paylastirayim.', {
    next_state: 'HUMAN_HANDOFF',
    trigger_handoff: true,
    trigger_owner_notify: true,
    notify_reason: 'refund_or_cancellation_policy',
    metadata_updates: { policy_question: 'refund_cancellation' }
  });
}

if (/(tarih degis|tarih degistir|rezervasyon degis|rezervasyonumu degistir|rezervasyon değiş|değişiklik)/.test(normalized)) {
  return preAiReply('Rezervasyon degisikligi icin rezervasyon numaranizi veya mevcut giris-cikis tarihinizi yazar misiniz? Kaydi bulup ekibe ileteyim.', {
    next_state: 'HUMAN_HANDOFF',
    trigger_handoff: true,
    trigger_owner_notify: true,
    notify_reason: 'reservation_change_request',
    metadata_updates: { policy_question: 'reservation_change' }
  });
}

if (/(odeme link|odeme yap|iban|kapora|dekont)/.test(normalized)) {
  return preAiReply('Kapora ve odeme bilgisi rezervasyon teklifi netlestikten sonra resmi kanaldan paylasilmali. Guvenlik icin ekibe iletip dogrulanmis bilgiyi size paylastiriyorum.', {
    next_state: 'QUALIFYING',
    trigger_owner_notify: true,
    notify_reason: 'payment_info_request',
    metadata_updates: { policy_question: 'payment_info' }
  });
}

if (/(rehber kopek|servis kopegi|engelli misafir)/.test(normalized)) {
  return preAiReply('Rehber kopek ve erisilebilirlik konusu oda ve isletme politikasi olarak netlestirilmeli. Ekibe iletip size kesin bilgiyi paylastirayim.', {
    next_state: 'QUALIFYING',
    trigger_owner_notify: true,
    notify_reason: 'service_animal_accessibility',
    metadata_updates: { policy_question: 'service_animal_accessibility' }
  });
}

if (/(tekerlekli sandalye|rampa|engelli giris|erisilebilir)/.test(normalized)) {
  return preAiReply('Erisilebilirlik bilgisini sistemde net goremiyorum. Ekibe iletip uygun oda ve giris detayini netlestiriyorum.', {
    next_state: 'QUALIFYING',
    trigger_owner_notify: true,
    notify_reason: 'accessibility_request',
    metadata_updates: { policy_question: 'accessibility' }
  });
}

if (!policySalesPriority && /(kahvalti|kahvalti dahil)/.test(normalized)) {
  return preAiReply('Kahvalti bilgisini sistemde net goremiyorum. Ekibe sorup size kesin bilgiyi paylastiriyorum.', {
    next_state: 'QUALIFYING',
    metadata_updates: { policy_question: 'breakfast' }
  });
}

if (/(evcil|kedi|kopek|hayvan)/.test(normalized)) {
  return preAiReply('Evcil hayvan kabul bilgisini sistemde net goremiyorum. Ekibe iletip size kesin bilgiyi paylastiriyorum.', {
    next_state: 'QUALIFYING',
    metadata_updates: { policy_question: 'pet' }
  });
}

if (!policySalesPriority && /(gece giris|gec giris|anahtar|erken giris)/.test(normalized)) {
  return preAiReply('Standart giris saati sistemde 14:00 gorunuyor. Erken veya gece giris icin ekibe musaitligi netlestirip donus yaptiriyorum.', {
    next_state: 'QUALIFYING',
    metadata_updates: { policy_question: 'flexible_checkin' }
  });
}

if (/(gec cikis|gec cikabilir|late checkout)/.test(normalized)) {
  return preAiReply('Standart cikis saati sistemde 12:00 gorunuyor. Gec cikis musaitlige bagli; ekibe sorup netlestireyim.', {
    next_state: 'QUALIFYING',
    metadata_updates: { policy_question: 'late_checkout' }
  });
}

if (/(kurumsal fatura|vergi levhasi|fatura)/.test(normalized)) {
  return preAiReply('Kurumsal fatura ve vergi levhasi bilgisini sistemde net goremiyorum. Ekibe veya muhasebeye iletip resmi bilgiyi paylasayim.', {
    next_state: 'QUALIFYING',
    metadata_updates: { policy_question: 'invoice' }
  });
}

if (/(konum|adres|navigasyon)/.test(normalized)) {
  return preAiReply('Konum linki sistemde net gorunmuyor. Ekibe iletip dogru navigasyon linkini paylasayim.', {
    next_state: 'QUALIFYING',
    metadata_updates: { policy_question: 'location' }
  });
}

if (/(transfer|havaalani|servis)/.test(normalized)) {
  return preAiReply('Transfer hizmeti bilgisini sistemde net goremiyorum. Ekibe sorup varsa resmi yonlendirmeyi paylasayim.', {
    next_state: 'QUALIFYING',
    metadata_updates: { policy_question: 'transfer' }
  });
}

if (/(havlu|sampuan|terlik)/.test(normalized)) {
  return preAiReply('Havlu, sampuan ve terlik bilgisini sistemde net goremiyorum. Ekibe sorup kesin bilgiyi paylasayim.', {
    next_state: 'QUALIFYING',
    metadata_updates: { policy_question: 'amenities' }
  });
}

if (/(sigara|balkonda ic|odada ic)/.test(normalized)) {
  return preAiReply('Sigara kullanimi icin oda ve balkon kurallarini sistemde net goremiyorum. Ekibe sorup dogru politikayi paylasayim.', {
    next_state: 'QUALIFYING',
    metadata_updates: { policy_question: 'smoking' }
  });
}

if (/(dis misafir|ziyaretci|arkadasim gelebilir)/.test(normalized)) {
  return preAiReply('Dis misafir ve ziyaretci kabul politikasini sistemde net goremiyorum. Ekibe sorup kesin bilgiyi paylasayim.', {
    next_state: 'QUALIFYING',
    metadata_updates: { policy_question: 'visitors' }
  });
}

if (/(parti|muzik|ses|eglence)/.test(normalized)) {
  return preAiReply('Parti, muzik ve ses kurallarini sistemde kesin olarak goremiyorum. Ekibe sorup dogru politikayi paylasayim; tarih ve kisi sayisini da yazarsaniz birlikte kontrol ettireyim.', {
    next_state: 'QUALIFYING',
    metadata_updates: { policy_question: 'party_music' }
  });
}

if (/(kimliksiz|kimlik yok|tc yok)/.test(normalized)) {
  return preAiReply('Kimliksiz giris konusunda net bilgi veremem. Resmi giris surecini ekibe dogrulatip size kesin bilgiyi paylastirayim.', {
    next_state: 'QUALIFYING',
    metadata_updates: { policy_question: 'id_checkin' }
  });
}

const currentYear = new Date().getFullYear();
const explicitYears = text.match(/\b(19\d{2}|20\d{2})\b/g) || [];
const hasPastYear = explicitYears.some((year) => Number(year) < currentYear);
const dateLikePastYear = hasPastYear && /(rezervasyon|yer|oda|bungalov|giris|giriş|cikis|çıkış|konaklama)/.test(normalized);

function preAiReply(message, updates = {}) {
  return [{
    json: {
      ...item,
      pre_ai_reply: true,
      parse_success: true,
      ai_message: message,
      next_state: updates.next_state || item.current_state || 'GREETING',
      metadata_updates: updates.metadata_updates || {
        guest_name: null,
        check_in_date: null,
        check_out_date: null,
        adults: null,
        children: null,
        preferred_room_type: null,
        special_requests: null
      },
      trigger_reservation: false,
      trigger_handoff: updates.trigger_handoff === true,
      trigger_owner_notify: updates.trigger_owner_notify === true,
      notify_reason: updates.notify_reason || null,
      tokens_used: 0,
      error_type: null,
      error_message: null
    }
  }];
}

if (/(kvkk|kisisel veri|kişisel veri|verilerimi|mesajlarimi|mesajlarımı|numarami|numaramı)/.test(normalized)
  && /(sil|silin|silinsin|kaldir|kaldır|iptal et)/.test(normalized)) {
  return preAiReply('KVKK ve kişisel veri silme talebinizi yetkili ekibe iletiyorum. Ben buradan veriyi sildiğimi söyleyemem; ekip talebi resmi süreçle değerlendirecek.', {
    next_state: 'HUMAN_HANDOFF',
    trigger_handoff: true,
    trigger_owner_notify: true,
    notify_reason: 'privacy_delete_request',
    metadata_updates: { privacy_request: 'delete_personal_data' }
  });
}

if (/(beni aramayin|beni aramayın|arama yapmayin|arama yapmayın|aramadan|sadece whatsapp|whatsapptan yazin|whatsapptan yazın|yazili ilerleyelim|yazılı ilerleyelim)/.test(normalized)) {
  return preAiReply('Not aldım, iletişimi WhatsApp üzerinden yazılı ilerletelim. Rezervasyon için giriş ve çıkış tarihinizi yazar mısınız?', {
    next_state: 'QUALIFYING',
    metadata_updates: { communication_preference: 'whatsapp_only' }
  });
}

if (dateLikePastYear) {
  return preAiReply('Bu tarih geçmişte kaldığı için rezervasyon oluşturamam. Güncel giriş ve çıkış tarihlerinizi yazarsanız müsaitliği kontrol edeyim.', {
    next_state: 'QUALIFYING',
    metadata_updates: {
      guest_name: null,
      check_in_date: null,
      check_out_date: null,
      adults: null,
      children: null,
      preferred_room_type: null,
      special_requests: null
    }
  });
}

return [{ json: { ...item, pre_ai_reply: false } }];`;

ensureNode('IF: Pre-AI Reply', {
  parameters: {
    conditions: {
      options: {
        caseSensitive: false,
        leftValue: '',
        typeValidation: 'strict',
      },
      conditions: [
        {
          id: 'cond-pre-ai-reply',
          leftValue: '={{ $json.pre_ai_reply }}',
          rightValue: true,
          operator: {
            type: 'boolean',
            operation: 'equals',
          },
        },
      ],
      combinator: 'and',
    },
    options: {},
  },
  id: 'if-pre-ai-reply',
  name: 'IF: Pre-AI Reply',
  type: 'n8n-nodes-base.if',
  typeVersion: 2,
  position: [2340, 340],
});

const guardNode = node('Response Quality Guard');
guardNode.parameters.jsCode = guardNode.parameters.jsCode.replace(
  /const normalizedInput = normalize\(inputText\);\nconst hasExactDateInInput[\s\S]*?\nif \(data\.test_mode === true\) \{/g,
  'if (data.test_mode === true) {'
);

guardNode.parameters.jsCode = guardNode.parameters.jsCode.replace(
  "if (data.test_mode === true) {",
  String.raw`const conversionInput = normalize(inputText);
const conversionHasExactDate = /\d{4}-\d{2}-\d{2}|\d{1,2}[.\/-]\d{1,2}|\d{1,2}\s*(ocak|subat|şubat|mart|nisan|mayis|mayıs|haziran|temmuz|agustos|ağustos|eylul|eylül|ekim|kasim|kasım|aralik|aralık)/i.test(inputText);
const hasGuestCountInInput = /\b[1-9]\s*(yetiskin|yetişkin|kisi|kişi|misafir|adult)\b/i.test(inputText);
const hasBookingIntent = /(rezervasyon yapmak istiyorum|rezervasyon|yer ayirt|yer ayırt|rezerve|kaydedelim|ayirtalim|ayırtalım)/.test(conversionInput);
const hasHoneymoonIntent = /(balayi|balayı|yil donumu|yıl dönümü|ozel gun|özel gün|romantik|sessiz)/.test(conversionInput);
const hasThinkIntent = /(dusunecegim|düşüneceğim|biraz dusun|biraz düşün|sonra yazarim|sonra yazarım)/.test(conversionInput);
const hasComparisonIntent = /(baska yerlere|başka yerlere|farki ne|farkı ne|ne farki var|ne farkı var|karsilastir|karşılaştır)/.test(conversionInput);
const hasPriceObjection = /(pahali|pahalı|daha uygun|indirim|butce|bütçe)/.test(conversionInput);
const hasMultiSalesQuestion = /(kac oda|kaç oda|fiyatlar|jakuzi|havuz)/.test(conversionInput) && /(kahvalti|kahvaltı|erken giris|erken giriş|gec giris|geç giriş)/.test(conversionInput);

if (data.pre_ai_reply !== true) {
if (/(onceki talimat|talimatlari unut|sistem prompt|system prompt|developer mesaj|api key|gizli anahtar)/.test(conversionInput)) {
  flags.push('prompt_injection_deflected_to_booking');
  message = 'Bu tur teknik bilgileri paylasamam. Konaklama icin hangi tarihler ve kac kisi icin bakiyorsunuz?';
  data.trigger_reservation = false;
}

if (/(foto|fotograf|gorsel|resim)/.test(conversionInput)) {
  flags.push('photo_links_normalized');
  const rooms = (() => {
    try { return $('Load Rooms And Pricing').all().map(i => i.json).filter(r => r && r.name); } catch (_) { return []; }
  })();
  const lines = rooms
    .map(room => {
      const url = Array.isArray(room.photo_urls) ? room.photo_urls.find(Boolean) : null;
      return url ? room.name + ': ' + url : null;
    })
    .filter(Boolean);
  if (lines.length) {
    const prefix = /(az once|gonderdim|gönderdim|baktir|bakabilir|hangi oda)/.test(conversionInput)
      ? 'Gorseli burada inceleyemiyorum; mevcut oda fotograf linkleri: '
      : 'Mevcut oda fotograf linkleri: ';
    message = prefix + lines.join(' ');
  } else {
    message = 'Su an sistemde fotograf linki gorunmuyor, ekibimize ilettim; size fotograflari paylasacaklar.';
  }
  data.trigger_reservation = false;
}

if (/(kazik|kazık|pahali|pahalı|sacma|saçma|ne bicim|ne biçim)/.test(conversionInput) && /(fiyat|kazik|kazık|pahali|pahalı)/.test(conversionInput)) {
  flags.push('angry_price_empathy');
  message = 'Anliyorum, fiyat konusunda net ve sakin ilerleyelim. Tarih ve kisi sayisini yazarsaniz size en uygun secenegi kontrol edeyim.';
  data.trigger_reservation = false;
}

if (/(rehber kopek|rehber köpek|servis kopegi|servis köpeği|engelli misafir)/.test(conversionInput)) {
  flags.push('service_dog_accessibility_handoff');
  message = 'Rehber kopek ve erisilebilirlik konusu oda ve isletme politikasi olarak netlestirilmeli. Ekibe iletip size kesin bilgiyi paylastirayim.';
  data.trigger_reservation = false;
  data.trigger_owner_notify = true;
  data.notify_reason = 'service_dog_accessibility_question';
}

if (/(tekerlekli sandalye|rampa|engelli giris|engelli giriş|erisilebilir|erişilebilir)/.test(conversionInput)) {
  flags.push('accessibility_handoff');
  message = 'Erisilebilirlik bilgisini sistemde net goremiyorum. Ekibe iletip uygun oda ve giris detayini netlestiriyorum.';
  data.trigger_reservation = false;
  data.trigger_owner_notify = true;
  data.notify_reason = 'accessibility_question';
}

if (/\b(2|iki)\s*yetiskin/.test(conversionInput) && /\b([4-9]|dort|dört|bes|beş|alti|altı)\s*cocuk/.test(conversionInput)) {
  flags.push('large_family_capacity_needs_check');
  message = 'Bu kisi sayisi icin tek bungalov kapasitesini netlestirmek gerekir. Premium Villa veya birden fazla oda daha uygun olabilir; tarihleri yazarsaniz ekibe kontrol ettireyim.';
  data.trigger_reservation = false;
}

if (/(bu gece|bugun|bugün|yarin|yarın)/.test(conversionInput) && /(yer|musait|müsait|oda|var mi|var mı)/.test(conversionInput)) {
  flags.push('last_minute_date_clarification');
  message = 'Bu gece mi yarin mi bakiyorsunuz? Kisi sayisini da yazarsaniz musaitligi net kontrol edeyim.';
  data.trigger_reservation = false;
}

if (/(erken cik|erken çık|bir gun erken|bir gün erken|kalan gece|iade)/.test(conversionInput) && /(iade|para|ucret|ücret)/.test(conversionInput)) {
  flags.push('refund_policy_no_generic_close');
  message = 'Iade politikasini sistemde kesin goremiyorum. Rezervasyon numaranizi veya mevcut giris-cikis tarihinizi yazarsaniz ekibe iletip net bilgiyi paylastirayim.';
  data.trigger_reservation = false;
}

if (flags.length === 0 && /(merhaba|selam|bilgi almak|bilgi istiyorum|bilgi alabilir|fiyat|ucret)/.test(conversionInput) && !/(hasar|kiril|kirildi|depozito|kapora|odeme|iban|iptal|iade|kimlik|parti|muzik|transfer|dekont|evcil|kopek|kedi)/.test(conversionInput) && !conversionHasExactDate && !meta.check_in_date && !/(hangi tarih|tarihleri|giris|ne zaman|kac kisi)/i.test(message)) {
  flags.push('opening_date_question_enforced');
  message = 'Hangi tarihler icin bilgi almak istiyorsunuz? Kac kisi konaklayacak?';
  data.validated_next_state = 'QUALIFYING';
  data.trigger_reservation = false;
}

if (hasBookingIntent && conversionHasExactDate && (hasGuestCountInInput || meta.adults || meta.guest_count)) {
  flags.push('direct_booking_fast_confirmation');
  const roomName = meta.preferred_room_type || meta.room_type || meta.room_preference || 'jakuzili bungalov';
  message = roomName + ' icin tarih ve kisi bilgisini aldim. Hemen kayda gecebilmem icin isminizi yazar misiniz?';
  data.validated_next_state = 'COLLECTING_GUEST_INFO';
  data.trigger_reservation = false;
}

if (hasHoneymoonIntent && !conversionHasExactDate && !/(hangi tarih|tarih|giris|giriş)/i.test(message)) {
  flags.push('honeymoon_date_question_added');
  const roomText = roomPresentationResponse();
  message = roomText
    ? roomText.replace(/ ?Isterseniz siradaki secenegi de gondereyim\.?$/i, '') + ' Hangi tarihler icin dusunuyorsunuz?'
    : 'Balayi icin jakuzili ve daha ozel bir bungalov daha uygun olur. Hangi tarihler icin dusunuyorsunuz?';
  data.validated_next_state = 'QUALIFYING';
  data.trigger_reservation = false;
}

if (hasComparisonIntent) {
  flags.push('comparison_softened');
  message = 'Bizde en guclu fark ozel havuzlu ve jakuzili butik bungalovlarin daha sakin bir ortamda olmasi. Tarihlerinizi yazarsaniz uygun secenegi net kontrol edeyim.';
  data.trigger_reservation = false;
}

if (hasThinkIntent) {
  flags.push('think_about_it_soft_urgency');
  message = 'Tabii, acele ettirmeyeyim. O tarihler yogunlasabiliyor; isterseniz sonra yazin, uygunlugu yeniden kontrol ederim.';
  data.trigger_reservation = false;
}

if (hasPriceObjection) {
  flags.push('price_objection_alternative');
  message = 'Anladim, daha uygun secenek varsa ona bakalim. Tarihlerinizi net yazarsaniz en uygun odayi kontrol edeyim.';
  data.trigger_reservation = false;
}

if (hasMultiSalesQuestion) {
  flags.push('multi_question_sales_priority');
  const roomText = roomPresentationResponse();
  message = roomText
    ? roomText.replace(/ ?Isterseniz siradaki secenegi de gondereyim\.?$/i, '') + ' Hangi tarihler icin bakiyorsunuz?'
    : 'Jakuzili ve havuzlu seceneklerimiz var. Hangi tarihler icin bakiyorsunuz?';
  data.trigger_reservation = false;
}
}

const normalizedGuardMessage = normalize(message);
if (/(baska bir konu|başka bir konu|baska bir soru|başka bir soru|yardimci olayim|yardımcı olayım|yardimci olabilir|yardımcı olabilir)/.test(normalizedGuardMessage)) {
  flags.push('generic_helper_closing_removed');
  message = message
    .split(/(?<=[.!?])\s+/)
    .filter(sentence => !/(baska bir konu|başka bir konu|baska bir soru|başka bir soru|yardimci olayim|yardımcı olayım|yardimci olabilir|yardımcı olabilir)/.test(normalize(sentence)))
    .join(' ')
    .trim();
}

if (message.length > 320 && !containsTotalPriceClaim(message)) {
  flags.push('long_message_compacted_before_split');
  const sentences = message.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [message];
  message = sentences.map((s) => s.trim()).filter(Boolean).slice(0, 3).join(' ');
  if (message.length > 320) message = message.slice(0, 317).trim().replace(/[,\s]+$/, '') + '...';
}

if (data.test_mode === true) {`
);

node('Update Conversation').parameters.jsonBody = String.raw`={{
JSON.stringify({
  current_state: $('Response Quality Guard').first().json.validated_next_state || $('Validate State And Merge').first().json.validated_next_state,
  consecutive_failures: 0,
  last_message_at: new Date().toISOString(),
  last_ai_message_at: new Date().toISOString(),
  guest_name: $('Validate State And Merge').first().json.updated_guest_name || null,
  metadata: $('Validate State And Merge').first().json.merged_metadata || {},
  reservation_stage: $('Validate State And Merge').first().json.reservation_stage || 'NEW',
  missing_fields: $('Validate State And Merge').first().json.missing_fields || [],
  is_ready_for_quote: $('Validate State And Merge').first().json.is_ready_for_quote === true,
  message_count: (($('Validate State And Merge').first().json.message_count || 0) + 2)
})
}}`;

node('Set Conversation Handoff').parameters.jsonBody = String.raw`={{
JSON.stringify({
  status: 'waiting_human',
  current_state: 'HUMAN_HANDOFF',
  last_message_at: new Date().toISOString(),
  last_ai_message_at: new Date().toISOString(),
  message_count: (($json.message_count || 0) + 2)
})
}}`;

node('Update Failures Count').parameters.jsonBody = String.raw`={{
JSON.stringify({
  consecutive_failures: $('Handle AI Error').first().json.new_failure_count,
  last_message_at: new Date().toISOString(),
  last_ai_message_at: new Date().toISOString(),
  message_count: (($('Handle AI Error').first().json.message_count || 0) + 2)
})
}}`;

node('Handle AI Error').parameters.jsCode = node('Handle AI Error').parameters.jsCode.replace(
  "const raw = String(data.message_text || '');",
  String.raw`const raw = String(
  data.message_text ||
  (() => { try { return $('Prepare Conversation').first().json.message_text; } catch (_) { return ''; } })() ||
  (() => { try { return $('Extract Payload').first().json.message_text; } catch (_) { return ''; } })() ||
  ''
);`
);

node('Handle AI Error').parameters.jsCode = node('Handle AI Error').parameters.jsCode.replace(
  "if (fallbackInvalidDateOrder) {",
  String.raw`if (/(aslinda|duzelt|degil|olacagiz|olacağız)/.test(normalized) && /\b(4|dort|dört)\s*(yetiskin|kisi|misafir)/.test(normalized)) {
  fallbackMessage = 'Tamam, kişi sayısını 4 yetişkin olarak düzelttim. Bu kapasite için Aile Suit veya Premium Villa daha uygun olabilir; tarihleri netse uygun seçeneği kontrol edeyim.';
} else if (fallbackInvalidDateOrder) {`
);

node('Split AI Message').parameters.jsCode = String.raw`const data = $('Response Quality Guard').first().json;
const text = String(data.ai_message || '').replace(/\s+/g, ' ').trim();
const MAX_PART_LENGTH = 160;
const MAX_PARTS = 3;

function typingDelay(len) {
  return Math.min(2200, Math.max(700, len * 35));
}

function isPriceOrPaymentCritical(t) {
  return /toplam\s*fiyat|depozito|kapora|ödeme|odeme|tahsilat|iban|havale|eft|kredi\s*kart|nakit|₺/i.test(t);
}

function splitIntoSentences(txt) {
  const matches = txt.match(/[^.!?]+[.!?]+(?:["'’”])?|[^.!?]+$/g) || [];
  return matches.map((s) => s.trim()).filter(Boolean);
}

function closeAsSentence(fragment) {
  const clean = fragment.trim().replace(/[\s,;:]+$/, '');
  if (!clean) return '';
  return /[.!?]["'’”]?$/.test(clean) ? clean : clean + '.';
}

function trimLongSentence(sentence) {
  if (sentence.length <= MAX_PART_LENGTH) return sentence;
  const limit = MAX_PART_LENGTH - 1;
  let cut = sentence.slice(0, limit).trim();
  const lastBreak = Math.max(cut.lastIndexOf(' '), cut.lastIndexOf(','), cut.lastIndexOf(';'));
  if (lastBreak >= 70) cut = cut.slice(0, lastBreak).trim();
  return closeAsSentence(cut).slice(0, MAX_PART_LENGTH);
}

function splitMessage(txt) {
  if (!txt) return { parts: [''], truncated: false };
  if (txt.length <= MAX_PART_LENGTH) return { parts: [txt], truncated: false };

  if (isPriceOrPaymentCritical(txt) && txt.length <= 320) {
    return { parts: [txt], truncated: false, critical_unsplit: true };
  }

  const sentences = splitIntoSentences(txt);
  const source = sentences.length ? sentences : [txt];
  const parts = [];
  let current = '';
  let truncated = false;

  for (const sentence of source) {
    const safeSentence = trimLongSentence(sentence);
    if (safeSentence.length < sentence.length) truncated = true;
    const candidate = current ? current + ' ' + safeSentence : safeSentence;

    if (candidate.length <= MAX_PART_LENGTH) {
      current = candidate;
    } else {
      if (current) parts.push(current);
      current = safeSentence;
    }

    if (parts.length >= MAX_PARTS) {
      truncated = true;
      current = '';
      break;
    }
  }

  if (current && parts.length < MAX_PARTS) parts.push(current);
  if (parts.join(' ').length < txt.length && parts.length >= MAX_PARTS) truncated = true;
  return { parts: parts.length ? parts : [trimLongSentence(txt)], truncated };
}

const result = splitMessage(text);
const parts = result.parts;
const pauseDelay = () => 650 + Math.floor(Math.random() * 350);

return [{
  json: {
    ...data,
    part_count: parts.length,
    msg_part_1: parts[0] || text,
    msg_part_2: parts[1] || null,
    msg_part_3: parts[2] || null,
    typing_delay_1: typingDelay((parts[0] || text).length),
    typing_delay_2: typingDelay((parts[1] || '').length),
    typing_delay_3: typingDelay((parts[2] || '').length),
    pause_delay_1: parts.length > 1 ? pauseDelay() : 0,
    pause_delay_2: parts.length > 2 ? pauseDelay() : 0,
    split_truncated: result.truncated === true,
    split_critical_unsplit: result.critical_unsplit === true
  }
}];`;

node('Send WhatsApp Reply').parameters.url = "={{ ($env.EVOLUTION_API_URL || 'https://evo.merman.sbs') }}/message/sendText/{{ $('Split AI Message').first().json.instance_name }}";
node('Send WhatsApp Reply').parameters.jsonBody = "={{ JSON.stringify({ number: $('Split AI Message').first().json.guest_phone, text: $('Split AI Message').first().json.msg_part_1 }) }}";

node('Test Mode Result').parameters.jsCode = String.raw`const data = $input.first().json;
return [{
  json: {
    ...data,
    delivery_skipped: true,
    delivery_skip_reason: 'test_mode',
    simulated_delivery_parts: [data.msg_part_1, data.msg_part_2, data.msg_part_3].filter(Boolean)
  }
}];`;

workflow.connections['Analyze Reservation Completeness'] = {
  main: [[{ node: 'Pre-AI Safety Guard', type: 'main', index: 0 }]],
};
workflow.connections['Pre-AI Safety Guard'] = {
  main: [[{ node: 'IF: Pre-AI Reply', type: 'main', index: 0 }]],
};
workflow.connections['IF: Pre-AI Reply'] = {
  main: [
    [{ node: 'Validate State And Merge', type: 'main', index: 0 }],
    [{ node: 'Call OpenAI API', type: 'main', index: 0 }],
  ],
};

await writeFile(wfPath, `${JSON.stringify(workflow, null, 2)}\n`, 'utf8');

console.log(`Copied ${files.length} workflow JSON file(s) to data/proposed.`);
console.log(`Patched ${wf01File}.`);

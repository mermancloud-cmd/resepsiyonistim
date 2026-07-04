import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const wfFile = 'WF-01-Inbound-WhatsApp-Router-AI-Orchestrator__TBSkW1kkkcbJP8Za.json';
const sourcePath = path.join(root, 'data', 'exports', 'latest', wfFile);
const proposedDir = path.join(root, 'data', 'proposed');
const proposedPath = path.join(proposedDir, wfFile);

if (!existsSync(sourcePath)) {
  throw new Error(`Workflow export not found: ${sourcePath}`);
}

const workflow = JSON.parse(await readFile(sourcePath, 'utf8'));

patchExtractPayload(workflow);
patchPrepareTenantData(workflow);
patchGetConversationRest(workflow);
patchPrepareConversation(workflow);
addOwnerTakeoverNodes(workflow);
patchHumanActiveCondition(workflow);
patchGenericClosingGuard(workflow);
patchNewScenarioGuards(workflow);
patchBatch2ScenarioGuards(workflow);
patchBatch3ScenarioGuards(workflow);
patchBatch3RefinementGuards(workflow);
patchCrossGuardCorrections(workflow);
patchBatch4SecurityGuards(workflow);
patchBatch5QuotePaymentGuards(workflow);
patchBatch6OperationsGuards(workflow);
patchNormalHandoffMessage(workflow);
patchSmartErrorFallback(workflow);
patchReservationTriggerCondition(workflow);
addPreSendOwnerGate(workflow);
addErrorTestModeGuards(workflow);
patchConnections(workflow);

await mkdir(proposedDir, { recursive: true });
for (const file of await readdir(proposedDir)) {
  if (file.endsWith('.json')) await rm(path.join(proposedDir, file));
}
await writeFile(proposedPath, `${JSON.stringify(workflow, null, 2)}\n`, 'utf8');
await writeFile(path.join(proposedDir, 'manifest.json'), `${JSON.stringify([{
  id: workflow.id,
  name: workflow.name,
  active: workflow.active,
  file: wfFile,
  proposedAt: new Date().toISOString(),
  change: 'owner_takeover_10_min_resume',
}], null, 2)}\n`, 'utf8');

console.log(`Wrote proposed workflow: ${path.relative(root, proposedPath).replace(/\\/g, '/')}`);

function patchExtractPayload(wf) {
  const node = mustNode(wf, 'Extract Payload');
  node.parameters.jsCode = String.raw`const body = $input.first().json.body || $input.first().json;

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
      test_mode: body.test_mode === true || body.testMode === true || data.test_mode === true,
      message_timestamp: data.messageTimestamp
        ? new Date(data.messageTimestamp * 1000).toISOString()
        : new Date().toISOString()
    }
  }];
} catch (err) {
  return [{ json: { valid: false, skip_reason: 'parse_exception', error: err.message } }];
}`;
}

function patchPrepareTenantData(wf) {
  const node = mustNode(wf, 'Prepare Tenant Data');
  node.parameters.jsCode = String.raw`const rows = $input.all();
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
    message_timestamp: payload.message_timestamp
  }
}];`;
}

function patchGetConversationRest(wf) {
  const getConversation = mustNode(wf, 'Get Conversation');
  const loadTenant = mustNode(wf, 'Load Tenant');
  const supabaseOrigin = new URL(loadTenant.parameters.url).origin;
  getConversation.type = 'n8n-nodes-base.httpRequest';
  getConversation.typeVersion = loadTenant.typeVersion;
  delete getConversation.credentials;
  getConversation.parameters = {
    url: `${supabaseOrigin}/rest/v1/conversations`,
    sendQuery: true,
    queryParameters: {
      parameters: [
        { name: 'select', value: 'id,status,current_state,consecutive_failures,metadata,guest_name' },
        { name: 'tenant_id', value: '=eq.{{ $json.tenant_id }}' },
        { name: 'guest_phone', value: '=eq.{{ $json.guest_phone }}' },
        { name: 'limit', value: '1' },
      ],
    },
    sendHeaders: true,
    headerParameters: structuredClone(loadTenant.parameters.headerParameters),
    options: {},
  };
}

function patchPrepareConversation(wf) {
  const node = mustNode(wf, 'Prepare Conversation');
  node.parameters.jsCode = String.raw`const tenantData = $('Prepare Tenant Data').first().json;
const rows = $('Get Conversation').all();
const first = rows.length > 0 ? rows[0].json : null;
const conv = Array.isArray(first) ? (first[0] || null) : first;

return [{
  json: {
    ...tenantData,
    conversation_exists: conv !== null,
    conversation_id: conv?.id || null,
    conversation_status: conv?.status || 'active',
    current_state: conv?.current_state || 'GREETING',
    consecutive_failures: conv?.consecutive_failures || 0,
    metadata: conv?.metadata || {},
    guest_name: conv?.guest_name || tenantData.guest_push_name || null
  }
}];`;
}

function addOwnerTakeoverNodes(wf) {
  const upsert = mustNode(wf, 'Upsert Conversation');
  const saveInbound = mustNode(wf, 'Save Inbound Message');

  upsertNode(wf, {
    id: 'owner-takeover-if',
    name: 'IF: Owner Outbound',
    type: 'n8n-nodes-base.if',
    typeVersion: 2,
    position: [-1720, -176],
    parameters: {
      conditions: {
        options: { caseSensitive: false, leftValue: '', typeValidation: 'strict' },
        conditions: [{
          id: 'cond-owner-outbound',
          leftValue: '={{ $json.from_me }}',
          rightValue: true,
          operator: { type: 'boolean', operation: 'equals' },
        }],
        combinator: 'and',
      },
      options: {},
    },
  });

  upsertNode(wf, {
    id: 'auto-resume-check',
    name: 'Auto Resume Check',
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: [-1720, 64],
    parameters: {
      jsCode: String.raw`const data = $input.first().json;
const metadata = data.metadata || {};
const now = Date.now();
const resumeAt = metadata.bot_resume_after ? Date.parse(metadata.bot_resume_after) : NaN;
const status = data.conversation_status || 'active';
const ownerTakeover = metadata.owner_takeover === true;
let shouldSuppressBot = false;
let shouldResumeBot = false;
let conversationStatus = status;
let currentState = data.current_state || 'GREETING';
let resumeReason = null;

if (status === 'human_active' || status === 'waiting_human') {
  shouldSuppressBot = true;
  if (ownerTakeover && Number.isFinite(resumeAt) && now >= resumeAt) {
    shouldSuppressBot = false;
    shouldResumeBot = true;
    conversationStatus = 'active';
    currentState = metadata.pre_owner_state || 'GREETING';
    resumeReason = 'owner_timeout_elapsed';
  }
}

return [{
  json: {
    ...data,
    conversation_status: conversationStatus,
    current_state: currentState,
    should_suppress_bot: shouldSuppressBot,
    should_resume_bot: shouldResumeBot,
    resume_reason: resumeReason,
    metadata: shouldResumeBot
      ? { ...metadata, owner_takeover: false, bot_resumed_at: new Date().toISOString(), bot_resume_reason: resumeReason }
      : metadata
  }
}];`,
    },
  });

  upsertNode(wf, {
    id: 'upsert-owner-conversation',
    name: 'Upsert Owner Conversation',
    type: 'n8n-nodes-base.httpRequest',
    typeVersion: upsert.typeVersion,
    position: [-1488, -272],
    parameters: {
      ...structuredClone(upsert.parameters),
      jsonBody: String.raw`={
  "tenant_id": "{{ $json.tenant_id }}",
  "guest_phone": "{{ $json.guest_phone }}",
  "guest_name": {{ $json.guest_name ? JSON.stringify($json.guest_name) : 'null' }},
  "status": "human_active",
  "current_state": "HUMAN_HANDOFF",
  "last_message_at": "{{ new Date().toISOString() }}",
  "metadata": {{ JSON.stringify({
    ...($json.metadata || {}),
    owner_takeover: true,
    owner_last_message_at: new Date().toISOString(),
    bot_resume_after: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    pre_owner_state: $json.current_state || 'GREETING'
  }) }}
}`,
    },
  });

  upsertNode(wf, {
    id: 'set-owner-conversation-id',
    name: 'Set Owner Conversation ID',
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: [-1264, -272],
    parameters: {
      jsCode: String.raw`const prev = $('Prepare Conversation').first().json;
const upsertResult = $input.first().json;
const row = Array.isArray(upsertResult) ? (upsertResult[0] || {}) : (upsertResult || {});
const metadata = {
  ...(prev.metadata || {}),
  owner_takeover: true,
  owner_last_message_at: new Date().toISOString(),
  bot_resume_after: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  pre_owner_state: prev.current_state || 'GREETING'
};

return [{
  json: {
    ...prev,
    ...row,
    conversation_id: row.id || prev.conversation_id,
    conversation_status: 'human_active',
    current_state: 'HUMAN_HANDOFF',
    metadata
  }
}];`,
    },
  });

  upsertNode(wf, {
    id: 'save-owner-message',
    name: 'Save Owner Message',
    type: 'n8n-nodes-base.supabase',
    typeVersion: saveInbound.typeVersion,
    position: [-1040, -272],
    credentials: structuredClone(saveInbound.credentials),
    parameters: {
      tableId: 'messages',
      fieldsUi: {
        fieldValues: [
          { fieldId: 'conversation_id', fieldValue: '={{ $json.conversation_id }}' },
          { fieldId: 'tenant_id', fieldValue: '={{ $json.tenant_id }}' },
          { fieldId: 'role', fieldValue: 'assistant' },
          { fieldId: 'content', fieldValue: "={{ 'Yetkili: ' + $json.message_text }}" },
          { fieldId: 'whatsapp_message_id', fieldValue: '={{ $json.whatsapp_message_id }}' },
          { fieldId: 'sent_at', fieldValue: '={{ $json.message_timestamp }}' },
        ],
      },
    },
  });
}

function patchHumanActiveCondition(wf) {
  const node = mustNode(wf, 'IF: Human Active');
  node.parameters.conditions = {
    options: { caseSensitive: false, leftValue: '', typeValidation: 'strict' },
    conditions: [{
      id: 'cond-suppress-bot',
      leftValue: '={{ $json.should_suppress_bot }}',
      rightValue: true,
      operator: { type: 'boolean', operation: 'equals' },
    }],
    combinator: 'and',
  };
}

function patchGenericClosingGuard(wf) {
  const node = mustNode(wf, 'Response Quality Guard');
  const marker = 'generic_ai_closing_removed_normalized';
  if (node.parameters.jsCode.includes(marker)) return;

  const insertion = String.raw`
const normalizedMessageForClosing = normalize(message);
if (/(baska bir soru|baska bir sorunuz|nasil yardimci|yardimci olabilir)/.test(normalizedMessageForClosing)) {
  flags.push('generic_ai_closing_removed_normalized');
  message = message
    .split(/(?<=[.?])\s+/)
    .filter((sentence) => !/(baska bir soru|baska bir sorunuz|nasil yardimci|yardimci olabilir)/.test(normalize(sentence)))
    .join(' ')
    .trim();
}
`;

  const target = "if (data.test_mode === true) {";
  if (!node.parameters.jsCode.includes(target)) {
    throw new Error('Could not find insertion point in Response Quality Guard.');
  }
  node.parameters.jsCode = node.parameters.jsCode.replace(target, `${insertion}\n${target}`);
}

function patchNewScenarioGuards(wf) {
  const node = mustNode(wf, 'Response Quality Guard');
  const marker = 'new_live_scenario_edge_guards';
  if (node.parameters.jsCode.includes(marker)) return;

  const insertion = String.raw`
// new_live_scenario_edge_guards
const edgeInput = normalize(inputText);

if (/(wifi|wi fi|internet)/.test(edgeInput) && /(kotu|cekmi|cekmiyor|duzeldi|sorun|problem|gecen sene|gecen yil)/.test(edgeInput)) {
  flags.push('wifi_complaint_needs_human_verification');
  message = 'Geçen deneyiminiz için üzgünüm. Wi-Fi konusunda sistemde kesin güncel bilgi göremiyorum; ekibe danışıp net bilgiyi paylaşayım. Hangi tarihler için bakıyorsunuz?';
  data.trigger_reservation = false;
  data.trigger_owner_notify = true;
  data.notify_reason = 'wifi_complaint_or_status_question';
}

if (/(toplam|kac para|kaç para|kapora ne kadar|depozito ne kadar|odeme ne kadar|ödeme ne kadar)/.test(edgeInput)) {
  flags.push('total_or_deposit_quote_needs_verified_offer');
  message = 'Toplam tutar ve kapora bilgisi net rezervasyon teklifi oluşunca paylaşılmalı. Önce uygun oda ve gecelik fiyatı netleştireyim; ödeme bilgisini de ekibin doğrulanmış şekilde paylaşması gerekir.';
  data.trigger_reservation = false;
  data.trigger_owner_notify = true;
  data.notify_reason = 'total_or_deposit_amount_question';
}

if (/(bebek|besik|beşik|park yatak|cocuk yatagi|çocuk yatağı)/.test(edgeInput)) {
  flags.push('baby_bed_needs_human_verification');
  message = 'Bebek yatağı veya park yatak bilgisini sistemde net göremiyorum. Ekibe sorup size kesin bilgiyi paylaşayım. Hangi tarihler için bakıyorsunuz?';
  data.trigger_reservation = false;
  data.trigger_owner_notify = true;
  data.notify_reason = 'baby_bed_question';
}

if (/(alkol|icki|içki|mangal)/.test(edgeInput)) {
  flags.push('barbecue_alcohol_policy_needs_human_verification');
  message = 'Bazı odalarda barbekü olanağı görünüyor, fakat mangal kullanımı ve alkol politikası için sistemde net kural göremiyorum. Ekibe sorup kesin bilgiyi paylaşayım.';
  data.trigger_reservation = false;
  data.trigger_owner_notify = true;
  data.notify_reason = 'barbecue_alcohol_policy_question';
}

const edgeAdultsForCapacity = (() => {
  const match = edgeInput.match(/\b([1-9]|1[0-9])\s*(yetiskin|yetişkin|kisi|kişi)\b/);
  if (match) return Number(match[1]);
  if (/(uc yetiskin|üç yetişkin|uc kisi|üç kişi)/.test(edgeInput)) return 3;
  return null;
})();
if (edgeAdultsForCapacity && /(kalabilir|kalabilir miyiz|oda|bungalov|jakuzili|havuzlu|tek yerde)/.test(edgeInput)) {
  const roomItems = (() => {
    try { return $('Load Rooms And Pricing').all().map(i => i.json).filter(r => r && r.id); } catch (_) { return []; }
  })();
  const mentionedRoom = roomItems.find((room) => edgeInput.includes(normalize(room.name)));
  if (mentionedRoom && Number(mentionedRoom.capacity_adults || 0) < edgeAdultsForCapacity) {
    const alternatives = roomItems.filter((room) => Number(room.capacity_adults || 0) >= edgeAdultsForCapacity).slice(0, 2).map((room) => room.name);
    flags.push('room_capacity_mismatch_guard');
    message = mentionedRoom.name + ' kapasitesi ' + (mentionedRoom.capacity_adults || 'sınırlı') + ' yetişkin görünüyor. ' + edgeAdultsForCapacity + ' yetişkin için daha uygun kapasitedeki seçenekleri kontrol etmek gerekir' + (alternatives.length ? '; ' + alternatives.join(' veya ') + ' daha mantıklı olabilir.' : '.') + ' Giriş ve çıkış tarihinizi yazar mısınız?';
    data.trigger_reservation = false;
  }
}

if (/(isitmali|ısıtmalı|kisin|kışın|havuz isitm|havuz ısıtm|sicak havuz|sıcak havuz)/.test(edgeInput)) {
  flags.push('heated_pool_policy_needs_human_verification');
  message = 'Havuzun ısıtma ve kış kullanımı bilgisini sistemde net göremiyorum. Ekibe sorup kesin bilgiyi paylaşayım.';
  data.trigger_reservation = false;
  data.trigger_owner_notify = true;
  data.notify_reason = 'heated_pool_question';
}

if (/(sigara|tutun|tütün|balkonda ic|balkonda iç|odada ic|odada iç)/.test(edgeInput)) {
  flags.push('smoking_policy_needs_human_verification');
  message = 'Sigara kullanımı için oda ve balkon kurallarını sistemde net göremiyorum. Ekibe sorup doğru politikayı paylaşayım.';
  data.trigger_reservation = false;
  data.trigger_owner_notify = true;
  data.notify_reason = 'smoking_policy_question';
}

if (/(disardan misafir|dışardan misafir|ziyaretci|ziyaretçi|arkadaslarimiz ziyarete|arkadaşlarımız ziyarete|gunduz misafir|gündüz misafir)/.test(edgeInput)) {
  flags.push('outside_guest_policy_needs_human_verification');
  message = 'Dış misafir ve ziyaretçi kabul politikasını sistemde net göremiyorum. Ekibe sorup kesin bilgiyi paylaşayım.';
  data.trigger_reservation = false;
  data.trigger_owner_notify = true;
  data.notify_reason = 'outside_guest_policy_question';
}

if (/(kurumsal fatura|sirket adina fatura|şirket adına fatura|vergi levhasi|vergi levhası|muhasebe)/.test(edgeInput)) {
  flags.push('invoice_policy_needs_human_verification');
  message = 'Kurumsal fatura ve vergi levhası bilgisini sistemde net göremiyorum. Ekibe veya muhasebeye iletip resmi bilgiyi paylaşayım.';
  data.trigger_reservation = false;
  data.trigger_owner_notify = true;
  data.notify_reason = 'invoice_policy_question';
}

if (/(rezervasyonumu|rezervasyon tarih|tarih degistir|tarih değiştir|haftaya almak|gun degistir|gün değiştir)/.test(edgeInput)) {
  flags.push('reservation_change_needs_booking_identifier');
  message = 'Rezervasyon değişikliği için rezervasyon numaranızı veya mevcut giriş-çıkış tarihinizi yazar mısınız? Kaydı bulup ekibe ileteyim.';
  data.trigger_reservation = false;
  data.trigger_owner_notify = true;
  data.notify_reason = 'reservation_change_request';
}

if (/(gec cikis|geç çıkış|cikis saatini|çıkış saatini|late checkout|15:00|16:00)/.test(edgeInput)) {
  flags.push('late_checkout_needs_availability');
  message = 'Standart çıkış saati sistemde 12:00 görünüyor. Geç çıkış müsaitliğe bağlı; ekibe sorup netleştireyim.';
  data.trigger_reservation = false;
  data.trigger_owner_notify = true;
  data.notify_reason = 'late_checkout_question';
}

if (/(indirim|iskonto|pazarlik|pazarlık|2 gece kalirsam|iki gece kalirsam)/.test(edgeInput) && !/(gizli indirim|faturasiz|faturasız|faturaya gerek yok)/.test(edgeInput)) {
  flags.push('discount_needs_verified_offer');
  message = 'İndirim bilgisini tarih ve oda netleşmeden söylemem doğru olmaz. Tarihleri yazarsanız uygun seçeneği kontrol edip ekibe doğrulatayım.';
  data.trigger_reservation = false;
  data.trigger_owner_notify = true;
  data.notify_reason = 'discount_question';
}

if (/(konum|lokasyon|navigasyon|maps|harita|adres)/.test(edgeInput)) {
  flags.push('location_link_needs_source_data');
  message = 'Konum linki sistemde net görünmüyor. Ekibe iletip doğru navigasyon linkini paylaşayım.';
  data.trigger_reservation = false;
  data.trigger_owner_notify = true;
  data.notify_reason = 'location_request';
}

if (/(mahremiyet|disardan gorun|dışardan görün|yan yana|komsu|komşu|gorunuyor mu|görünüyor mu)/.test(edgeInput)) {
  flags.push('privacy_layout_needs_human_verification');
  message = 'Bungalovların yerleşimi ve mahremiyet detayını oda bazında netleştirmek gerekir. Ekibe sorup doğru bilgiyi paylaşayım.';
  data.trigger_reservation = false;
  data.trigger_owner_notify = true;
  data.notify_reason = 'privacy_layout_question';
}

if (/(havlu|sampuan|şampuan|terlik|sac kurutma|saç kurutma|buklet)/.test(edgeInput)) {
  flags.push('in_room_amenities_need_human_verification');
  message = 'Havlu, şampuan ve terlik bilgisini sistemde net göremiyorum. Ekibe sorup kesin bilgiyi paylaşayım.';
  data.trigger_reservation = false;
  data.trigger_owner_notify = true;
  data.notify_reason = 'in_room_amenities_question';
}

if (/(evlilik teklifi|susleme|süsleme|organizasyon|pasta|balon|yildonumu|yıldönümü)/.test(edgeInput)) {
  flags.push('special_organization_needs_human_verification');
  message = 'Süsleme, pasta veya özel organizasyon hizmetini sistemde net göremiyorum. Ekibe sorup size kesin dönüş yapayım. Hangi tarih için düşünüyorsunuz?';
  data.trigger_reservation = false;
  data.trigger_owner_notify = true;
  data.notify_reason = 'special_organization_question';
}

if (/(gizli indirim|faturasiz|faturasız|faturaya gerek yok|elden|kayitsiz|kayıtsız)/.test(edgeInput)) {
  flags.push('offbook_discount_refused');
  message = 'Faturasız veya kayıt dışı indirim sözü veremem. Ödeme ve indirim bilgileri resmi teklif üzerinden netleşmeli; ekibe iletip doğrulanmış bilgiyi paylaşayım.';
  data.trigger_reservation = false;
  data.trigger_owner_notify = true;
  data.notify_reason = 'offbook_discount_request';
}

const explicitYears = String(data.message_text || '').match(/\b(19\d{2}|20\d{2})\b/g) || [];
const currentYear = new Date().getFullYear();
if (explicitYears.some((year) => Number(year) < currentYear)) {
  flags.push('past_year_booking_blocked');
  message = 'Yazdığınız tarih geçmiş yıl görünüyor. Güncel giriş ve çıkış tarihini net yazar mısınız?';
  data.trigger_reservation = false;
  data.trigger_handoff = false;
  data.metadata_updates = { ...(data.metadata_updates || {}), check_in_date: null, check_out_date: null };
  data.merged_metadata = { ...(data.merged_metadata || {}) };
  delete data.merged_metadata.check_in_date;
  delete data.merged_metadata.check_out_date;
}
`;

  const target = "if (data.test_mode === true) {";
  if (!node.parameters.jsCode.includes(target)) {
    throw new Error('Could not find insertion point in Response Quality Guard.');
  }
  node.parameters.jsCode = node.parameters.jsCode.replace(target, `${insertion}\n${target}`);
}

function patchReservationTriggerCondition(wf) {
  const node = mustNode(wf, 'IF: Reservation Trigger');
  node.parameters.conditions = {
    options: { caseSensitive: false, leftValue: '', typeValidation: 'strict' },
    conditions: [{
      id: 'cond-res-after-quality-guard',
      leftValue: '={{ $json.trigger_reservation }}',
      rightValue: true,
      operator: { type: 'boolean', operation: 'equals' },
    }],
    combinator: 'and',
  };
}

function patchBatch3ScenarioGuards(wf) {
  const node = mustNode(wf, 'Response Quality Guard');
  const marker = 'batch3_live_scenario_edge_guards';
  if (node.parameters.jsCode.includes(marker)) return;

  const insertion = String.raw`
// batch3_live_scenario_edge_guards
const batch3Input = normalize(inputText);

if (/(gece|gec|geç|02:00|2 gibi|anahtar|key|self check)/.test(batch3Input) && /(giris|giriş|gel|anahtar|nasil al|nasıl al)/.test(batch3Input)) {
  flags.push('late_arrival_key_pickup_needs_human_verification');
  message = 'Gece giriş ve anahtar teslim bilgisini sistemde net göremiyorum. Ekibe sorup doğru giriş şeklini paylaşayım.';
  data.trigger_reservation = false;
  data.trigger_owner_notify = true;
  data.notify_reason = 'late_arrival_key_pickup_question';
}

if (/(yetiskin yok|yetişkin yok|sadece cocuk|sadece çocuk|cocuk gelecek yetiskin yok|çocuk gelecek yetişkin yok)/.test(batch3Input)) {
  flags.push('child_only_booking_blocked');
  message = 'Yetişkin olmadan çocuk konaklaması için sistemde net uygunluk bilgisi yok. Bu durumu ekibe iletip kesin bilgi alalım.';
  data.trigger_reservation = false;
  data.trigger_owner_notify = true;
  data.notify_reason = 'child_only_booking_question';
}

if (/(6 cocuk|6 çocuk|5 cocuk|5 çocuk|kalabalik cocuk|kalabalık çocuk|tek bungalov olur mu)/.test(batch3Input) && /(cocuk|çocuk)/.test(batch3Input)) {
  flags.push('children_capacity_needs_human_verification');
  message = 'Çocuk sayısı yüksek olduğu için tek bungalov kapasitesini net kontrol etmek gerekir. Ekibe iletip uygun yerleşimi doğrulayalım.';
  data.trigger_reservation = false;
  data.trigger_owner_notify = true;
  data.notify_reason = 'children_capacity_question';
}

if (/(tum bungalov|tüm bungalov|hepsini|tumunu|tümünü|tek mesajda|kisa kisa|kısa kısa)/.test(batch3Input)) {
  flags.push('explicit_all_options_summary');
  const roomItems = (() => {
    try { return $('Load Rooms And Pricing').all().map(i => i.json).filter(r => r && r.id); } catch (_) { return []; }
  })();
  const summaries = roomItems.slice(0, 4).map((room) => {
    const pricing = Array.isArray(room.room_pricing) ? [...room.room_pricing].sort((a, b) => (b.priority || 0) - (a.priority || 0)) : [];
    const price = pricing[0]?.price_per_night ? Number(pricing[0].price_per_night).toLocaleString('tr-TR') + ' TRY gecelikten' : 'fiyat tarih netleşince';
    const capacity = [room.capacity_adults ? room.capacity_adults + ' yetişkin' : null, room.capacity_children ? room.capacity_children + ' çocuk' : null].filter(Boolean).join(', ');
    return room.name + ': ' + (capacity ? capacity + ', ' : '') + price + '.';
  });
  if (summaries.length) {
    message = summaries.join(' ') + ' Tarihinizi yazarsanız en uygun olanı netleştireyim.';
  }
  data.trigger_reservation = false;
}
`;

  const target = "if (data.test_mode === true) {";
  if (!node.parameters.jsCode.includes(target)) {
    throw new Error('Could not find insertion point in Response Quality Guard.');
  }
  node.parameters.jsCode = node.parameters.jsCode.replace(target, `${insertion}\n${target}`);
}

function patchBatch3RefinementGuards(wf) {
  const node = mustNode(wf, 'Response Quality Guard');
  const marker = 'batch3_refinement_guards';
  if (node.parameters.jsCode.includes(marker)) return;

  const insertion = String.raw`
// batch3_refinement_guards
const batch3RefineInput = normalize(inputText);

if (/(minimum|min|kac gece|kaç gece|giris cikis saat|giriş çıkış saat|check in|check out)/.test(batch3RefineInput)) {
  flags.push('stay_rules_settings_answer');
  const settingsForStay = (() => { try { return $('Get Tenant Settings').first().json || {}; } catch (_) { return {}; } })();
  const minStay = settingsForStay.min_stay_nights || 1;
  const checkIn = String(settingsForStay.check_in_time || '14:00').slice(0, 5);
  const checkOut = String(settingsForStay.check_out_time || '12:00').slice(0, 5);
  message = 'Minimum konaklama ' + minStay + ' gece görünüyor. Giriş saati ' + checkIn + ', çıkış saati ' + checkOut + '. Tarihinizi yazarsanız uygunluğu kontrol edeyim.';
  data.trigger_reservation = false;
}

if (/(aslinda|aslında|duzelt|düzelt)/.test(batch3RefineInput) && /(4 yetiskin|4 yetişkin|dort yetiskin|dört yetişkin)/.test(batch3RefineInput)) {
  flags.push('guest_count_correction_acknowledged');
  const roomItems = (() => {
    try { return $('Load Rooms And Pricing').all().map(i => i.json).filter(r => r && r.id); } catch (_) { return []; }
  })();
  const alternatives = roomItems.filter((room) => Number(room.capacity_adults || 0) >= 4).slice(0, 2).map((room) => room.name);
  message = 'Tamam, kişi sayısını 4 yetişkin olarak düzelttim. Bu kapasite için ' + (alternatives.length ? alternatives.join(' veya ') + ' daha uygun olabilir' : 'uygun kapasitedeki odayı kontrol etmek gerekir') + '; tarihleri netse uygun seçeneği kontrol edeyim.';
  data.trigger_reservation = false;
  data.metadata_updates = { ...(data.metadata_updates || {}), adults: 4 };
  data.merged_metadata = { ...(data.merged_metadata || {}), adults: 4 };
}
`;

  const target = "if (data.test_mode === true) {";
  if (!node.parameters.jsCode.includes(target)) {
    throw new Error('Could not find insertion point in Response Quality Guard.');
  }
  node.parameters.jsCode = node.parameters.jsCode.replace(target, `${insertion}\n${target}`);
}

function patchCrossGuardCorrections(wf) {
  const node = mustNode(wf, 'Response Quality Guard');
  const marker = 'cross_guard_corrections';
  if (node.parameters.jsCode.includes(marker)) return;

  const insertion = String.raw`
// cross_guard_corrections
const crossInput = normalize(inputText);
if (/(wifi|wi fi|internet)/.test(crossInput) && /(kotu|cekmi|cekmiyor|duzeldi|sorun|problem|gecen sene|gecen yil)/.test(crossInput)) {
  flags.push('wifi_complaint_cross_guard_override');
  message = 'Geçen deneyiminiz için üzgünüm. Wi-Fi konusunda sistemde kesin güncel bilgi göremiyorum; ekibe danışıp net bilgiyi paylaşayım. Hangi tarihler için bakıyorsunuz?';
  data.trigger_reservation = false;
  data.trigger_owner_notify = true;
  data.notify_reason = 'wifi_complaint_or_status_question';
}
`;

  const target = "if (data.test_mode === true) {";
  if (!node.parameters.jsCode.includes(target)) {
    throw new Error('Could not find insertion point in Response Quality Guard.');
  }
  node.parameters.jsCode = node.parameters.jsCode.replace(target, `${insertion}\n${target}`);
}

function patchBatch4SecurityGuards(wf) {
  const node = mustNode(wf, 'Response Quality Guard');
  const marker = 'batch4_security_privacy_guards';
  if (node.parameters.jsCode.includes(marker)) return;

  const insertion = String.raw`
// batch4_security_privacy_guards
const securityInput = normalize(inputText);

if (/(baska musteri|başka müşteri|musterilerin telefon|müşterilerin telefon|rezervasyonlarini gonder|rezervasyonlarını gönder|musteri ver|müşteri ver|telefonlarini gonder|telefonlarını gönder)/.test(securityInput)) {
  flags.push('customer_data_request_refused');
  message = 'Başka müşterilere ait telefon, mesaj veya rezervasyon bilgilerini paylaşamam. Bu kişisel veri talebini yetkili ekibe iletebilirim.';
  data.trigger_reservation = false;
  data.trigger_owner_notify = true;
  data.notify_reason = 'customer_data_privacy_request';
}

if (/(bot musun|yapay zeka|gercek biri var mi|gerçek biri var mı|botla konusmak istemiyorum|botla konuşmak istemiyorum|insan var mi|insan var mı)/.test(securityInput)) {
  flags.push('human_request_handoff_offer');
  message = 'Dilerseniz sizi yetkili bir ekip arkadaşımıza aktarabilirim. Konuyu kısaca yazarsanız ekibe ileteyim.';
  data.trigger_reservation = false;
  data.trigger_owner_notify = true;
  data.notify_reason = 'human_requested';
}
`;

  const target = "if (data.test_mode === true) {";
  if (!node.parameters.jsCode.includes(target)) {
    throw new Error('Could not find insertion point in Response Quality Guard.');
  }
  node.parameters.jsCode = node.parameters.jsCode.replace(target, `${insertion}\n${target}`);
}

function patchBatch5QuotePaymentGuards(wf) {
  const node = mustNode(wf, 'Response Quality Guard');
  const marker = 'batch5_quote_payment_reservation_guards';
  if (node.parameters.jsCode.includes(marker)) return;

  const insertion = String.raw`
// batch5_quote_payment_reservation_guards
const batch5Input = normalize(inputText);

function batch5MonthNumber(monthText) {
  const m = normalize(monthText);
  const months = {
    ocak: 1,
    subat: 2,
    mart: 3,
    nisan: 4,
    mayis: 5,
    haziran: 6,
    temmuz: 7,
    agustos: 8,
    eylul: 9,
    ekim: 10,
    kasim: 11,
    aralik: 12
  };
  return months[m] || null;
}

function batch5DateFromParts(day, month) {
  const d = Number(day);
  const m = batch5MonthNumber(month);
  if (!d || !m) return null;
  return new Date(new Date().getFullYear(), m - 1, d, 12, 0, 0, 0);
}

const batch5DateMatch = batch5Input.match(/\b(\d{1,2})\s+(ocak|subat|mart|nisan|mayis|haziran|temmuz|agustos|eylul|ekim|kasim|aralik)\s+(giris|check in|check-in)\b.*?\b(\d{1,2})\s+(ocak|subat|mart|nisan|mayis|haziran|temmuz|agustos|eylul|ekim|kasim|aralik)\s+(cikis|check out|check-out)\b/);
if (batch5DateMatch) {
  const checkInDate = batch5DateFromParts(batch5DateMatch[1], batch5DateMatch[2]);
  const checkOutDate = batch5DateFromParts(batch5DateMatch[4], batch5DateMatch[5]);
  if (checkInDate && checkOutDate && checkOutDate <= checkInDate) {
    flags.push('checkout_before_checkin_guard');
    message = 'Cikis tarihi giris tarihinden once gorunuyor. Dogru kontrol edebilmem icin giris ve cikis gununu tekrar net yazar misiniz?';
    data.trigger_reservation = false;
    data.trigger_owner_notify = false;
    data.metadata_updates = { ...(data.metadata_updates || {}), check_in_date: null, check_out_date: null };
    if (data.merged_metadata) {
      delete data.merged_metadata.check_in_date;
      delete data.merged_metadata.check_out_date;
    }
  }
}

const batch5GuestCount = (() => {
  const match = batch5Input.match(/\b([1-9]\d?)\s*(kisi|kisiyle|yetiskin|misafir)\b/);
  return match ? Number(match[1]) : null;
})();
const batch5RoomCount = (() => {
  const match = batch5Input.match(/\b([2-9])\s*(bungalov|oda|ev)\b/);
  return match ? Number(match[1]) : null;
})();
if ((batch5GuestCount && batch5GuestCount >= 8) || batch5RoomCount) {
  flags.push('group_multi_room_request_needs_human_verification');
  const groupBits = [];
  if (batch5GuestCount) groupBits.push(batch5GuestCount + ' kisi');
  if (batch5RoomCount) groupBits.push(batch5RoomCount + ' bungalov');
  message = 'Bu talebi tek oda gibi ilerletmeyeyim. ' + (groupBits.length ? groupBits.join(' ve ') + ' icin ' : '') + 'musaitlik ve yerlesim ekip kontrolu gerektirir. Giris-cikis tarihinizi net yazdiysaniz ekibe iletip uygun kombinasyonu kontrol ettireyim.';
  data.trigger_reservation = false;
  data.trigger_owner_notify = true;
  data.notify_reason = 'group_multi_room_request';
}
`;

  const target = "if (data.test_mode === true) {";
  if (!node.parameters.jsCode.includes(target)) {
    throw new Error('Could not find insertion point in Response Quality Guard.');
  }
  node.parameters.jsCode = node.parameters.jsCode.replace(target, `${insertion}\n${target}`);
}

function patchBatch6OperationsGuards(wf) {
  const node = mustNode(wf, 'Response Quality Guard');
  const marker = 'batch6_operations_policy_guards';
  if (node.parameters.jsCode.includes(marker)) return;

  const insertion = String.raw`
// batch6_operations_policy_guards
const batch6Input = normalize(inputText);

if (/(kimlik|tc kimlik|pasaport).*(istemiyorum|vermek istemiyorum|vermeden|gostermeden|göstermeden|giris yapabilir)/.test(batch6Input)) {
  flags.push('id_checkin_policy_needs_human_verification');
  message = 'Kimliksiz giris konusunda net bilgi veremem. Resmi giris surecini ekibe dogrulatip size kesin bilgiyi paylastirayim.';
  data.trigger_reservation = false;
  data.trigger_owner_notify = true;
  data.notify_reason = 'id_checkin_question';
}

if (/(erken cik|erken çık|erken ayril|erken ayrıl|kalan gece|iade|geri odeme|geri ödeme)/.test(batch6Input) && /(iade|geri odeme|geri ödeme|para|ucret|ücret)/.test(batch6Input)) {
  flags.push('refund_policy_needs_human_verification');
  message = 'Erken cikis veya iade politikasini sistemde net goremiyorum. Rezervasyon numaranizi ya da giris-cikis tarihinizi yazarsaniz ekibe iletip kesin bilgiyi paylastirayim.';
  data.trigger_reservation = false;
  data.trigger_owner_notify = true;
  data.notify_reason = 'refund_policy_question';
}

if (/(parti|dogum gunu|doğum günü|muzik|müzik|ses|eglence|eğlence)/.test(batch6Input) && /(gece|acabilir|açabilir|sorun olur|parti|muzik|müzik)/.test(batch6Input)) {
  flags.push('party_music_policy_needs_human_verification');
  message = 'Parti, muzik ve ses kurallarini sistemde kesin olarak goremiyorum. Ekibe sorup dogru politikayi paylasayim; tarih ve kisi sayisini da yazarsaniz birlikte kontrol ettireyim.';
  data.trigger_reservation = false;
  data.trigger_owner_notify = true;
  data.notify_reason = 'party_music_policy_question';
}

if (/(transfer|otogar|havaalani|havalimani|bizi alabilir|servis)/.test(batch6Input)) {
  flags.push('transfer_service_needs_human_verification');
  message = 'Transfer hizmeti bilgisini sistemde net goremiyorum. Ekibe sorup varsa resmi yonlendirmeyi paylasayim.';
  data.trigger_reservation = false;
  data.trigger_owner_notify = true;
  data.notify_reason = 'transfer_question';
}

if (/(ekstra yatak|ek yatak|yatak atabilir|bir kisi daha|bir kişi daha|fazladan kisi|fazladan kişi)/.test(batch6Input)) {
  flags.push('extra_bed_capacity_needs_human_verification');
  message = 'Ek yatak ve kapasite bilgisini oda bazinda netlestirmek gerekir. Kac kisi olacaksiniz ve hangi tarih icin bakiyorsunuz? Gerekirse ekibe kontrol ettireyim.';
  data.trigger_reservation = false;
  data.trigger_owner_notify = true;
  data.notify_reason = 'extra_bed_capacity_question';
}

if (/(rezervasyonumu yanlis|rezervasyonum yanlis|yanlis yapmissiniz|şikayet|sikayet|yetkili arasin|yetkili arasın)/.test(batch6Input)) {
  flags.push('complaint_or_wrong_booking_handoff');
  message = 'Yasadiginiz sorun icin yetkiliye ileteyim. Rezervasyon numaranizi veya mevcut giris-cikis tarihinizi yazar misiniz? Kaydi bulup ekibe aktaracagim.';
  data.trigger_reservation = false;
  data.trigger_owner_notify = true;
  data.notify_reason = 'complaint_wrong_booking';
}

if (/(dekont|havale|eft).*(kime|hangi numara|nereye|atayim|atayım|gondereyim|göndereyim)/.test(batch6Input)) {
  flags.push('payment_receipt_channel_needs_official_source');
  message = 'Dekontun hangi resmi kanala iletilecegini sistemde net goremiyorum. Ekibe dogrulatip guvenli odeme yonlendirmesini paylastirayim.';
  data.trigger_reservation = false;
  data.trigger_owner_notify = true;
  data.notify_reason = 'payment_receipt_channel_question';
}

if (/(beni aramayin|beni aramayın|arama yapmayin|arama yapmayın|sadece whatsapp|whatsapptan yazin|whatsapptan yazın)/.test(batch6Input)) {
  flags.push('communication_preference_whatsapp_only');
  message = 'Not aldım, iletişimi WhatsApp üzerinden yazılı ilerletelim. Rezervasyon için giriş ve çıkış tarihinizi yazar mısınız?';
  data.trigger_reservation = false;
}

if (/(kirilirsa|kırılırsa|hasar|depozitodan|depozito kes|hasar ucreti|hasar ücreti)/.test(batch6Input)) {
  flags.push('damage_deposit_policy_needs_human_verification');
  message = 'Hasar ve depozito kesintisi politikasini sistemde net goremiyorum. Ekibe sorup kesin bilgiyi paylasayim.';
  data.trigger_reservation = false;
  data.trigger_owner_notify = true;
  data.notify_reason = 'damage_deposit_policy_question';
}
`;

  const target = "if (data.test_mode === true) {";
  if (!node.parameters.jsCode.includes(target)) {
    throw new Error('Could not find insertion point in Response Quality Guard.');
  }
  node.parameters.jsCode = node.parameters.jsCode.replace(target, `${insertion}\n${target}`);
}

function patchNormalHandoffMessage(wf) {
  const node = mustNode(wf, 'Send Handoff Message');
  node.parameters.jsonBody = '={{ JSON.stringify({ number: $(\'Check Handoff Phrases\').first().json.guest_phone, text: "Sizi ekibe aktariyorum. Rezervasyon numaranizi veya mevcut giris-cikis tarihinizi yazarsaniz kaydi hizlica kontrol ederler." }) }}';
}

function patchSmartErrorFallback(wf) {
  const handle = mustNode(wf, 'Handle AI Error');
  handle.parameters.jsCode = String.raw`const data = $input.first().json;

const newFailureCount = (data.consecutive_failures || 0) + 1;
const threshold = data.settings?.auto_handoff_after_failures || 3;
const raw = String(data.message_text || '');
const normalized = raw
  .toLocaleLowerCase('tr-TR')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/\u0131/g, 'i')
  .replace(/\s+/g, ' ')
  .trim();

function fallbackMonthNumber(monthText) {
  const months = { ocak: 1, subat: 2, mart: 3, nisan: 4, mayis: 5, haziran: 6, temmuz: 7, agustos: 8, eylul: 9, ekim: 10, kasim: 11, aralik: 12 };
  return months[monthText] || null;
}

function fallbackDateFromParts(day, month) {
  const d = Number(day);
  const m = fallbackMonthNumber(month);
  if (!d || !m) return null;
  return new Date(new Date().getFullYear(), m - 1, d, 12, 0, 0, 0);
}

const fallbackDateMatch = normalized.match(/\b(\d{1,2})\s+(ocak|subat|mart|nisan|mayis|haziran|temmuz|agustos|eylul|ekim|kasim|aralik)\s+(giris|check in|check-in)\b.*?\b(\d{1,2})\s+(ocak|subat|mart|nisan|mayis|haziran|temmuz|agustos|eylul|ekim|kasim|aralik)\s+(cikis|check out|check-out)\b/);
const fallbackInvalidDateOrder = (() => {
  if (!fallbackDateMatch) return false;
  const checkInDate = fallbackDateFromParts(fallbackDateMatch[1], fallbackDateMatch[2]);
  const checkOutDate = fallbackDateFromParts(fallbackDateMatch[4], fallbackDateMatch[5]);
  return Boolean(checkInDate && checkOutDate && checkOutDate <= checkInDate);
})();

let fallbackMessage = 'Şu an kontrol ederken kısa bir gecikme oldu. Birazdan tekrar deneyebilir veya mesajınızı yeniden yazabilirsiniz.';

if (fallbackInvalidDateOrder) {
  fallbackMessage = 'Cikis tarihi giris tarihinden once gorunuyor. Dogru kontrol edebilmem icin giris ve cikis gununu tekrar net yazar misiniz?';
} else if (/(baska musteri|musterilerin telefon|rezervasyonlarini gonder|musteri ver|telefonlarini gonder|once yazan muster)/.test(normalized)) {
  fallbackMessage = 'Baska musterilere ait telefon, mesaj veya rezervasyon bilgilerini paylasamam. Bu kisisel veri talebini yetkili ekibe iletebilirim.';
} else if (/(kimlik|tc kimlik|pasaport).*(istemiyorum|vermek istemiyorum|vermeden|gostermeden|giris yapabilir)/.test(normalized)) {
  fallbackMessage = 'Kimliksiz giris konusunda net bilgi veremem. Resmi giris surecini ekibe dogrulatip size kesin bilgiyi paylastirayim.';
} else if (/(erken cik|erken ayril|kalan gece|iade|geri odeme)/.test(normalized) && /(iade|geri odeme|para|ucret)/.test(normalized)) {
  fallbackMessage = 'Erken cikis veya iade politikasini sistemde net goremiyorum. Rezervasyon numaranizi ya da giris-cikis tarihinizi yazarsaniz ekibe iletip kesin bilgiyi paylastirayim.';
} else if (/(parti|dogum gunu|muzik|ses|eglence).*(gece|sorun|acabilir|olur)/.test(normalized)) {
  fallbackMessage = 'Parti, muzik ve ses kurallarini sistemde kesin olarak goremiyorum. Ekibe sorup dogru politikayi paylasayim.';
} else if (/(transfer|otogar|havaalani|havalimani|bizi alabilir|servis)/.test(normalized)) {
  fallbackMessage = 'Transfer hizmeti bilgisini sistemde net goremiyorum. Ekibe sorup varsa resmi yonlendirmeyi paylasayim.';
} else if (/(ekstra yatak|ek yatak|yatak atabilir|bir kisi daha|fazladan kisi)/.test(normalized)) {
  fallbackMessage = 'Ek yatak ve kapasite bilgisini oda bazinda netlestirmek gerekir. Kac kisi olacaksiniz ve hangi tarih icin bakiyorsunuz?';
} else if (/(rezervasyonumu yanlis|rezervasyonum yanlis|yanlis yapmissiniz|sikayet|yetkili arasin)/.test(normalized)) {
  fallbackMessage = 'Yasadiginiz sorun icin yetkiliye ileteyim. Rezervasyon numaranizi veya mevcut giris-cikis tarihinizi yazar misiniz?';
} else if (/(dekont|havale|eft).*(kime|hangi numara|nereye|atayim|gondereyim)/.test(normalized)) {
  fallbackMessage = 'Dekontun hangi resmi kanala iletilecegini sistemde net goremiyorum. Ekibe dogrulatip guvenli odeme yonlendirmesini paylastirayim.';
} else if (/(beni aramayin|arama yapmayin|sadece whatsapp|whatsapptan yazin)/.test(normalized)) {
  fallbackMessage = 'Not aldım, iletişimi WhatsApp üzerinden yazılı ilerletelim. Rezervasyon için giriş ve çıkış tarihinizi yazar mısınız?';
} else if (/(kirilirsa|hasar|depozitodan|depozito kes|hasar ucreti)/.test(normalized)) {
  fallbackMessage = 'Hasar ve depozito kesintisi politikasini sistemde net goremiyorum. Ekibe sorup kesin bilgiyi paylasayim.';
} else if (/(tamam|onayliyorum|ayirt|ayir|rezerve).*(adim|ismim)|\b(adim|ismim)\b/.test(normalized) && !/(giris|cikis|check in|check-out|yetiskin|kisi)/.test(normalized)) {
  fallbackMessage = 'Rezervasyon icin tarih, kisi sayisi ve oda bilgisi netlesmeli. Giris-cikis tarihinizi ve kac kisi olacaginizi yazar misiniz?';
} else if (/(rezervasyonumu|rezervasyon tarih|tarih degistir|haftaya almak|gun degistir|günü degistir|günü değişt|tarih değiştir)/.test(normalized)) {
  fallbackMessage = 'Rezervasyon degisikligi icin rezervasyon numaranizi veya mevcut giris-cikis tarihinizi yazar misiniz? Kaydi bulup ekibe ileteyim.';
} else if (/(agustos sonunda|ay sonunda|haftaya|bayramda|bu hafta sonu|hafta sonu|onumuzdeki|yazin)/.test(normalized)) {
  fallbackMessage = 'Uygunluğu doğru kontrol edebilmem için giriş ve çıkış gününü net yazar mısınız? Örneğin 28 Ağustos giriş, 30 Ağustos çıkış gibi.';
} else if (/(foto|resim|gorsel|görsel)/.test(normalized)) {
  fallbackMessage = 'Şu an fotoğraf linklerini sistemden net göremiyorum. Ekibe iletip doğru görselleri paylaşayım.';
} else if (/(iptal|rezervasyonumu iptal|vazgectim)/.test(normalized)) {
  fallbackMessage = 'İptal işlemi için rezervasyon numaranızı veya rezervasyon tarihini yazar mısınız? Kaydı bulup ekibe ileteyim.';
} else if (/(evcil|kopek|köpek|kedi|pet)/.test(normalized)) {
  fallbackMessage = 'Evcil hayvan kabul bilgisini sistemde net göremiyorum. Ekibe iletip size kesin bilgiyi paylaşayım.';
} else if (/(konum|lokasyon|navigasyon|maps|harita|adres)/.test(normalized)) {
  fallbackMessage = 'Konum linki sistemde net görünmüyor. Ekibe iletip doğru navigasyon linkini paylaşayım.';
} else if (/(yetkili|insan|gercek kisi|gerçek kişi|bot)/.test(normalized)) {
  fallbackMessage = 'Dilerseniz sizi yetkili bir ekip arkadaşımıza aktarabilirim. Konuyu kısaca yazarsanız ekibe ileteyim.';
}

return [{
  json: {
    ...data,
    new_failure_count: newFailureCount,
    escalate_to_handoff: newFailureCount >= threshold,
    fallback_message: fallbackMessage
  }
}];`;

  const sendFallback = mustNode(wf, 'Send Fallback Reply');
  sendFallback.parameters.jsonBody = "={{ JSON.stringify({ number: $('Handle AI Error').first().json.guest_phone, text: $('Handle AI Error').first().json.fallback_message || 'Şu an kontrol ederken kısa bir gecikme oldu. Birazdan tekrar deneyebilir veya mesajınızı yeniden yazabilirsiniz.' }) }}";

  const saveFallback = wf.nodes.find((item) => item.name === 'Save Error Fallback Test Message');
  if (saveFallback) {
    const field = saveFallback.parameters.fieldsUi.fieldValues.find((item) => item.fieldId === 'content');
    if (field) field.fieldValue = "={{ $('Handle AI Error').first().json.fallback_message || 'Şu an kontrol ederken kısa bir gecikme oldu. Birazdan tekrar deneyebilir veya mesajınızı yeniden yazabilirsiniz.' }}";
  }
}

function patchBatch2ScenarioGuards(wf) {
  const node = mustNode(wf, 'Response Quality Guard');
  const marker = 'batch2_live_scenario_edge_guards';
  if (node.parameters.jsCode.includes(marker)) return;

  const insertion = String.raw`
// batch2_live_scenario_edge_guards
const batch2Input = normalize(inputText);

const batch2AdultsForCapacity = (() => {
  const match = batch2Input.match(/\b([1-9]|1[0-9])\s*(yetiskin|yetişkin|kisi|kişi)\b/);
  if (match) return Number(match[1]);
  if (/(uc yetiskin|üç yetişkin|uc kisi|üç kişi)/.test(batch2Input)) return 3;
  return null;
})();
if (batch2AdultsForCapacity && /(kalabilir|kalabilir miyiz|oda|bungalov|jakuzili|havuzlu|tek yerde)/.test(batch2Input)) {
  const roomItems = (() => {
    try { return $('Load Rooms And Pricing').all().map(i => i.json).filter(r => r && r.id); } catch (_) { return []; }
  })();
  const mentionedRoom = roomItems.find((room) => batch2Input.includes(normalize(room.name)));
  if (mentionedRoom && Number(mentionedRoom.capacity_adults || 0) < batch2AdultsForCapacity) {
    const alternatives = roomItems.filter((room) => Number(room.capacity_adults || 0) >= batch2AdultsForCapacity).slice(0, 2).map((room) => room.name);
    flags.push('room_capacity_mismatch_guard');
    message = mentionedRoom.name + ' kapasitesi ' + (mentionedRoom.capacity_adults || 'sınırlı') + ' yetişkin görünüyor. ' + batch2AdultsForCapacity + ' yetişkin için daha uygun kapasitedeki seçenekleri kontrol etmek gerekir' + (alternatives.length ? '; ' + alternatives.join(' veya ') + ' daha mantıklı olabilir.' : '.') + ' Giriş ve çıkış tarihinizi yazar mısınız?';
    data.trigger_reservation = false;
  }
}

if (/(isitmali|ısıtmalı|kisin|kışın|havuz isitm|havuz ısıtm|sicak havuz|sıcak havuz)/.test(batch2Input)) {
  flags.push('heated_pool_policy_needs_human_verification');
  message = 'Havuzun ısıtma ve kış kullanımı bilgisini sistemde net göremiyorum. Ekibe sorup kesin bilgiyi paylaşayım.';
  data.trigger_reservation = false;
  data.trigger_owner_notify = true;
  data.notify_reason = 'heated_pool_question';
}

if (/(sigara|tutun|tütün|balkonda ic|balkonda iç|odada ic|odada iç)/.test(batch2Input)) {
  flags.push('smoking_policy_needs_human_verification');
  message = 'Sigara kullanımı için oda ve balkon kurallarını sistemde net göremiyorum. Ekibe sorup doğru politikayı paylaşayım.';
  data.trigger_reservation = false;
  data.trigger_owner_notify = true;
  data.notify_reason = 'smoking_policy_question';
}

if (/(disardan misafir|dışardan misafir|ziyaretci|ziyaretçi|arkadaslarimiz ziyarete|arkadaşlarımız ziyarete|gunduz misafir|gündüz misafir|misafir aliyor)/.test(batch2Input)) {
  flags.push('outside_guest_policy_needs_human_verification');
  message = 'Dış misafir ve ziyaretçi kabul politikasını sistemde net göremiyorum. Ekibe sorup kesin bilgiyi paylaşayım.';
  data.trigger_reservation = false;
  data.trigger_owner_notify = true;
  data.notify_reason = 'outside_guest_policy_question';
}

if (/(kurumsal fatura|sirket adina fatura|şirket adına fatura|vergi levhasi|vergi levhası|muhasebe|fatura kesiyor)/.test(batch2Input)) {
  flags.push('invoice_policy_needs_human_verification');
  message = 'Kurumsal fatura ve vergi levhası bilgisini sistemde net göremiyorum. Ekibe veya muhasebeye iletip resmi bilgiyi paylaşayım.';
  data.trigger_reservation = false;
  data.trigger_owner_notify = true;
  data.notify_reason = 'invoice_policy_question';
}

if (/(rezervasyonumu|rezervasyon tarih|tarih degistir|tarih değiştir|haftaya almak|gun degistir|gün değiştir)/.test(batch2Input)) {
  flags.push('reservation_change_needs_booking_identifier');
  message = 'Rezervasyon değişikliği için rezervasyon numaranızı veya mevcut giriş-çıkış tarihinizi yazar mısınız? Kaydı bulup ekibe ileteyim.';
  data.trigger_reservation = false;
  data.trigger_owner_notify = true;
  data.notify_reason = 'reservation_change_request';
}

if (/(gec cikis|geç çıkış|cikis saatini|çıkış saatini|late checkout|15:00|16:00)/.test(batch2Input)) {
  flags.push('late_checkout_needs_availability');
  message = 'Standart çıkış saati sistemde 12:00 görünüyor. Geç çıkış müsaitliğe bağlı; ekibe sorup netleştireyim.';
  data.trigger_reservation = false;
  data.trigger_owner_notify = true;
  data.notify_reason = 'late_checkout_question';
}

if (/(indirim|iskonto|pazarlik|pazarlık|2 gece kalirsam|iki gece kalirsam)/.test(batch2Input) && !/(gizli indirim|faturasiz|faturasız|faturaya gerek yok)/.test(batch2Input)) {
  flags.push('discount_needs_verified_offer');
  message = 'İndirim bilgisini tarih ve oda netleşmeden söylemem doğru olmaz. Tarihleri yazarsanız uygun seçeneği kontrol edip ekibe doğrulatayım.';
  data.trigger_reservation = false;
  data.trigger_owner_notify = true;
  data.notify_reason = 'discount_question';
}

if (/(konum|lokasyon|navigasyon|maps|harita|adres)/.test(batch2Input)) {
  flags.push('location_link_needs_source_data');
  message = 'Konum linki sistemde net görünmüyor. Ekibe iletip doğru navigasyon linkini paylaşayım.';
  data.trigger_reservation = false;
  data.trigger_owner_notify = true;
  data.notify_reason = 'location_request';
}

if (/(mahremiyet|disardan gorun|dışardan görün|yan yana|komsu|komşu|gorunuyor mu|görünüyor mu)/.test(batch2Input)) {
  flags.push('privacy_layout_needs_human_verification');
  message = 'Bungalovların yerleşimi ve mahremiyet detayını oda bazında netleştirmek gerekir. Ekibe sorup doğru bilgiyi paylaşayım.';
  data.trigger_reservation = false;
  data.trigger_owner_notify = true;
  data.notify_reason = 'privacy_layout_question';
}

if (/(havlu|sampuan|şampuan|terlik|sac kurutma|saç kurutma|buklet)/.test(batch2Input)) {
  flags.push('in_room_amenities_need_human_verification');
  message = 'Havlu, şampuan ve terlik bilgisini sistemde net göremiyorum. Ekibe sorup kesin bilgiyi paylaşayım.';
  data.trigger_reservation = false;
  data.trigger_owner_notify = true;
  data.notify_reason = 'in_room_amenities_question';
}

if (/(evlilik teklifi|susleme|süsleme|organizasyon|pasta|balon|yildonumu|yıldönümü)/.test(batch2Input)) {
  flags.push('special_organization_needs_human_verification');
  message = 'Süsleme, pasta veya özel organizasyon hizmetini sistemde net göremiyorum. Ekibe sorup size kesin dönüş yapayım. Hangi tarih için düşünüyorsunuz?';
  data.trigger_reservation = false;
  data.trigger_owner_notify = true;
  data.notify_reason = 'special_organization_question';
}
`;

  const target = "if (data.test_mode === true) {";
  if (!node.parameters.jsCode.includes(target)) {
    throw new Error('Could not find insertion point in Response Quality Guard.');
  }
  node.parameters.jsCode = node.parameters.jsCode.replace(target, `${insertion}\n${target}`);
}

function addPreSendOwnerGate(wf) {
  const loadHistory = mustNode(wf, 'Load Message History');
  const supabaseOrigin = new URL(loadHistory.parameters.url).origin;

  upsertNode(wf, {
    id: 'reload-conversation-before-reply',
    name: 'Reload Conversation Before Reply',
    type: 'n8n-nodes-base.httpRequest',
    typeVersion: loadHistory.typeVersion,
    position: [2928, 16],
    parameters: {
      ...structuredClone(loadHistory.parameters),
      url: `${supabaseOrigin}/rest/v1/conversations`,
      queryParameters: {
        parameters: [
          { name: 'select', value: 'id,status,current_state,metadata' },
          { name: 'id', value: '=eq.{{ $json.conversation_id }}' },
          { name: 'limit', value: '1' },
        ],
      },
    },
  });

  upsertNode(wf, {
    id: 'pre-send-owner-takeover-gate',
    name: 'Pre-Send Owner Takeover Gate',
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: [3136, 16],
    parameters: {
      jsCode: String.raw`const replyData = $('Response Quality Guard').first().json;
const latestRaw = $input.first().json;
const latest = Array.isArray(latestRaw) ? (latestRaw[0] || {}) : (latestRaw || {});
const metadata = latest.metadata || {};
const status = latest.status || replyData.conversation_status || 'active';
const resumeAt = metadata.bot_resume_after ? Date.parse(metadata.bot_resume_after) : NaN;
const ownerTakeover = metadata.owner_takeover === true;
const ownerStillActive = ownerTakeover && status === 'human_active' && (!Number.isFinite(resumeAt) || Date.now() < resumeAt);

if (ownerStillActive) {
  return [];
}

return [{
  json: {
    ...replyData,
    latest_conversation_status: status,
    latest_conversation_metadata: metadata
  }
}];`,
    },
  });
}

function addErrorTestModeGuards(wf) {
  const saveAssistant = mustNode(wf, 'Save Assistant Message');

  upsertNode(wf, {
    id: 'if-error-test-mode',
    name: 'IF: Error Test Mode',
    type: 'n8n-nodes-base.if',
    typeVersion: 2,
    position: [2912, 512],
    parameters: {
      conditions: {
        options: { caseSensitive: false, leftValue: '', typeValidation: 'strict' },
        conditions: [{
          id: 'cond-error-test-mode',
          leftValue: "={{ $('Handle AI Error').first().json.test_mode }}",
          rightValue: true,
          operator: { type: 'boolean', operation: 'equals' },
        }],
        combinator: 'and',
      },
      options: {},
    },
  });

  upsertNode(wf, {
    id: 'save-error-fallback-test-message',
    name: 'Save Error Fallback Test Message',
    type: 'n8n-nodes-base.supabase',
    typeVersion: saveAssistant.typeVersion,
    position: [3120, 560],
    credentials: structuredClone(saveAssistant.credentials),
    parameters: {
      tableId: 'messages',
      fieldsUi: {
        fieldValues: [
          { fieldId: 'conversation_id', fieldValue: "={{ $('Handle AI Error').first().json.conversation_id }}" },
          { fieldId: 'tenant_id', fieldValue: "={{ $('Handle AI Error').first().json.tenant_id }}" },
          { fieldId: 'role', fieldValue: 'assistant' },
          { fieldId: 'content', fieldValue: 'Şu an kontrol ederken kısa bir gecikme oldu. Birazdan tekrar deneyebilir veya mesajınızı yeniden yazabilirsiniz.' },
          { fieldId: 'sent_at', fieldValue: '={{ new Date().toISOString() }}' },
        ],
      },
    },
  });

  upsertNode(wf, {
    id: 'if-error-handoff-test-mode',
    name: 'IF: Error Handoff Test Mode',
    type: 'n8n-nodes-base.if',
    typeVersion: 2,
    position: [3120, 320],
    parameters: {
      conditions: {
        options: { caseSensitive: false, leftValue: '', typeValidation: 'strict' },
        conditions: [{
          id: 'cond-error-handoff-test-mode',
          leftValue: "={{ $('Handle AI Error').first().json.test_mode }}",
          rightValue: true,
          operator: { type: 'boolean', operation: 'equals' },
        }],
        combinator: 'and',
      },
      options: {},
    },
  });

  upsertNode(wf, {
    id: 'save-error-handoff-test-message',
    name: 'Save Error Handoff Test Message',
    type: 'n8n-nodes-base.supabase',
    typeVersion: saveAssistant.typeVersion,
    position: [3344, 256],
    credentials: structuredClone(saveAssistant.credentials),
    parameters: {
      tableId: 'messages',
      fieldsUi: {
        fieldValues: [
          { fieldId: 'conversation_id', fieldValue: "={{ $('Handle AI Error').first().json.conversation_id }}" },
          { fieldId: 'tenant_id', fieldValue: "={{ $('Handle AI Error').first().json.tenant_id }}" },
          { fieldId: 'role', fieldValue: 'assistant' },
          { fieldId: 'content', fieldValue: 'Teknik bir sorun yaşıyoruz. Ekibimiz en kısa sürede sizinle iletişime geçecek.' },
          { fieldId: 'sent_at', fieldValue: '={{ new Date().toISOString() }}' },
        ],
      },
    },
  });

  upsertNode(wf, {
    id: 'if-handoff-test-mode',
    name: 'IF: Handoff Test Mode',
    type: 'n8n-nodes-base.if',
    typeVersion: 2,
    position: [2140, -260],
    parameters: {
      conditions: {
        options: { caseSensitive: false, leftValue: '', typeValidation: 'strict' },
        conditions: [{
          id: 'cond-handoff-test-mode',
          leftValue: "={{ $('Check Handoff Phrases').first().json.test_mode }}",
          rightValue: true,
          operator: { type: 'boolean', operation: 'equals' },
        }],
        combinator: 'and',
      },
      options: {},
    },
  });

  upsertNode(wf, {
    id: 'save-handoff-test-message',
    name: 'Save Handoff Test Message',
    type: 'n8n-nodes-base.supabase',
    typeVersion: saveAssistant.typeVersion,
    position: [2360, -360],
    credentials: structuredClone(saveAssistant.credentials),
    parameters: {
      tableId: 'messages',
      fieldsUi: {
        fieldValues: [
          { fieldId: 'conversation_id', fieldValue: "={{ $('Check Handoff Phrases').first().json.conversation_id }}" },
          { fieldId: 'tenant_id', fieldValue: "={{ $('Check Handoff Phrases').first().json.tenant_id }}" },
          { fieldId: 'role', fieldValue: 'assistant' },
          { fieldId: 'content', fieldValue: 'Sizi ekibe aktariyorum. Rezervasyon numaranizi veya mevcut giris-cikis tarihinizi yazarsaniz kaydi hizlica kontrol ederler.' },
          { fieldId: 'sent_at', fieldValue: '={{ new Date().toISOString() }}' },
        ],
      },
    },
  });
}

function patchConnections(wf) {
  wf.connections['Prepare Conversation'] = {
    main: [[{ node: 'IF: Owner Outbound', type: 'main', index: 0 }]],
  };
  wf.connections['IF: Owner Outbound'] = {
    main: [
      [{ node: 'Upsert Owner Conversation', type: 'main', index: 0 }],
      [{ node: 'Auto Resume Check', type: 'main', index: 0 }],
    ],
  };
  wf.connections['Auto Resume Check'] = {
    main: [[{ node: 'IF: Human Active', type: 'main', index: 0 }]],
  };
  wf.connections['Upsert Owner Conversation'] = {
    main: [[{ node: 'Set Owner Conversation ID', type: 'main', index: 0 }]],
  };
  wf.connections['Set Owner Conversation ID'] = {
    main: [[{ node: 'Save Owner Message', type: 'main', index: 0 }]],
  };
  wf.connections['Response Quality Guard'] = {
    main: [[{ node: 'Reload Conversation Before Reply', type: 'main', index: 0 }]],
  };
  wf.connections['Reload Conversation Before Reply'] = {
    main: [[{ node: 'Pre-Send Owner Takeover Gate', type: 'main', index: 0 }]],
  };
  wf.connections['Pre-Send Owner Takeover Gate'] = {
    main: [[{ node: 'IF: Reservation Trigger', type: 'main', index: 0 }]],
  };
  wf.connections['IF: Escalate To Handoff'] = {
    main: [
      [{ node: 'Set Error Handoff', type: 'main', index: 0 }],
      [{ node: 'IF: Error Test Mode', type: 'main', index: 0 }],
    ],
  };
  wf.connections['IF: Error Test Mode'] = {
    main: [
      [{ node: 'Save Error Fallback Test Message', type: 'main', index: 0 }],
      [{ node: 'Send Fallback Reply', type: 'main', index: 0 }],
    ],
  };
  wf.connections['Set Error Handoff'] = {
    main: [[{ node: 'IF: Error Handoff Test Mode', type: 'main', index: 0 }]],
  };
  wf.connections['IF: Error Handoff Test Mode'] = {
    main: [
      [{ node: 'Save Error Handoff Test Message', type: 'main', index: 0 }],
      [{ node: 'Send Error Handoff Message', type: 'main', index: 0 }],
    ],
  };
  wf.connections['Set Conversation Handoff'] = {
    main: [[{ node: 'IF: Handoff Test Mode', type: 'main', index: 0 }]],
  };
  wf.connections['IF: Handoff Test Mode'] = {
    main: [
      [{ node: 'Save Handoff Test Message', type: 'main', index: 0 }],
      [{ node: 'Send Handoff Message', type: 'main', index: 0 }],
    ],
  };
}

function upsertNode(wf, node) {
  const index = wf.nodes.findIndex((item) => item.name === node.name);
  if (index >= 0) wf.nodes[index] = { ...wf.nodes[index], ...node };
  else wf.nodes.push(node);
}

function mustNode(wf, name) {
  const node = wf.nodes.find((item) => item.name === name);
  if (!node) throw new Error(`Missing node: ${name}`);
  return node;
}

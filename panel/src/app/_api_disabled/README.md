# API Routes Documentation

This directory contains all API routes for the Bungalow Panel application. All routes use server-side Supabase queries with proper authentication and tenant isolation.

## Authentication & Security

- All routes validate `tenant_id` from the authenticated session (never from client request)
- Uses Supabase Row Level Security (RLS) where possible
- Server-side only Supabase admin client (`src/lib/supabase/admin.ts`) with service_role key
- Proper HTTP error codes (400, 401, 404, 500)

## Conversations API

### `GET /api/conversations`
Fetch all conversations for the authenticated tenant.

**Query Parameters:**
- `search` (optional): Search by guest name or phone

**Response:**
```json
{
  "conversations": [
    {
      "id": "string",
      "guest_name": "string",
      "guest_phone": "***1234",
      "state": "active|closed|pending",
      "assigned_agent": "string|null",
      "ai_enabled": boolean,
      "message_count": number,
      "last_message_at": "ISO date",
      "language": "en|es|fr|...",
      "created_at": "ISO date",
      "updated_at": "ISO date"
    }
  ],
  "total": number
}
```

### `GET /api/conversations/[id]`
Fetch a single conversation with all messages.

**Response:**
```json
{
  "conversation": { ... },
  "messages": [
    {
      "id": "string",
      "conversation_id": "string",
      "sender": "guest|agent|ai",
      "content": "string",
      "created_at": "ISO date",
      "metadata": {}
    }
  ]
}
```

### `POST /api/conversations/[id]/handoff`
Toggle human handoff for a conversation.

**Request Body:**
```json
{
  "action": "takeover|return_to_ai"
}
```

**Behavior:**
- `takeover`: Assigns current user as agent, disables AI
- `return_to_ai`: Removes agent assignment, enables AI
- Calls n8n webhook (WF10) if configured in tenant_settings

**Response:**
```json
{
  "success": true,
  "conversation": { ... }
}
```

## Reservations API

### `GET /api/reservations`
Fetch all reservations with room information.

**Query Parameters:**
- `status` (optional): Filter by status (pending, confirmed, rejected, cancelled)

**Response:**
```json
{
  "reservations": [
    {
      "id": "string",
      "guest_name": "string",
      "guest_email": "string",
      "guest_phone": "string|null",
      "room_id": "string",
      "check_in_date": "YYYY-MM-DD",
      "check_out_date": "YYYY-MM-DD",
      "status": "pending|confirmed|rejected|cancelled",
      "total_amount": number,
      "payment_method": "string|null",
      "payment_status": "pending|confirmed|rejected",
      "payment_notes": "string|null",
      "iban_last4": "string|null",
      "rooms": {
        "room_number": "string",
        "room_type": "string",
        "capacity": number,
        "price_per_night": number
      }
    }
  ]
}
```

### `POST /api/reservations`
Create a new manual reservation.

**Request Body:**
```json
{
  "guest_name": "string",
  "guest_email": "string",
  "guest_phone": "string",
  "room_id": "string",
  "check_in_date": "YYYY-MM-DD",
  "check_out_date": "YYYY-MM-DD",
  "total_amount": number,
  "payment_method": "string"
}
```

**Response:** `201 Created`
```json
{
  "reservation": { ... }
}
```

### `GET /api/reservations/[id]`
Fetch a single reservation with room details.

**Response:**
```json
{
  "reservation": { ... }
}
```

### `PATCH /api/reservations/[id]`
Update reservation status (approve/reject).

**Request Body:**
```json
{
  "status": "confirmed|rejected|cancelled"
}
```

**Response:**
```json
{
  "reservation": { ... }
}
```

### `POST /api/reservations/[id]/payment`
Update IBAN payment status (confirm/reject bank transfer).

**Request Body:**
```json
{
  "action": "confirm|reject",
  "notes": "string (optional)"
}
```

**Response:**
```json
{
  "reservation": { ... }
}
```

## Dashboard API

### `GET /api/dashboard/stats`
Fetch aggregated dashboard statistics.

**Response:**
```json
{
  "stats": {
    "check_ins_today": number,
    "check_outs_today": number,
    "occupancy_rate": number,
    "pending_actions": number,
    "revenue_today": number,
    "active_conversations": number,
    "ai_enabled": boolean
  }
}
```

**Metrics:**
- `check_ins_today`: Reservations with check_in_date = today
- `check_outs_today`: Reservations with check_out_date = today
- `occupancy_rate`: (active reservations / total rooms) * 100
- `pending_actions`: Count of pending reservations + pending payments
- `revenue_today`: Sum of total_amount from confirmed reservations checking in today
- `active_conversations`: Count of conversations with state = 'active'
- `ai_enabled`: Global AI toggle from tenant_settings

## AI Control API

### `GET /api/ai/status`
Get current AI settings for the tenant.

**Response:**
```json
{
  "settings": {
    "tenant_id": "string",
    "ai_enabled": boolean,
    "n8n_webhook_url": "string|null",
    "updated_at": "ISO date"
  }
}
```

### `PATCH /api/ai/status`
Toggle AI on/off globally.

**Request Body:**
```json
{
  "ai_enabled": boolean
}
```

**Response:**
```json
{
  "settings": { ... }
}
```

### `GET /api/ai/conversations`
List conversations with their AI/human handler status.

**Response:**
```json
{
  "conversations": [
    {
      "id": "string",
      "guest_name": "string",
      "guest_phone": "***1234",
      "state": "active|closed|pending",
      "handler": "ai|human",
      "assigned_agent": "string|null",
      "ai_enabled": boolean,
      "language": "string",
      "last_active": "ISO date",
      "created_at": "ISO date"
    }
  ],
  "global_ai_enabled": boolean
}
```

## Hooks Usage

### `useDashboardStats()`
```typescript
import { useDashboardStats } from '@/hooks/use-dashboard-stats'

const { data: stats, isLoading, error } = useDashboardStats()
```

### `useConversations(search?)`
```typescript
import { useConversations, useConversation, useHandoff } from '@/hooks/use-conversations'

const { data, isLoading } = useConversations('search term')
const { data: conversation } = useConversation('conv-001')
const handoffMutation = useHandoff()

handoffMutation.mutate({ conversationId: 'conv-001', action: 'takeover' })
```

### `useReservations(status?)`
```typescript
import { 
  useReservations, 
  useReservation,
  useUpdateReservationStatus,
  useUpdatePaymentStatus,
  useCreateReservation 
} from '@/hooks/use-reservations'

const { data } = useReservations('pending')
const { data: reservation } = useReservation('res-001')

const updateStatus = useUpdateReservationStatus()
updateStatus.mutate({ id: 'res-001', status: 'confirmed' })

const updatePayment = useUpdatePaymentStatus()
updatePayment.mutate({ id: 'res-001', action: 'confirm', notes: 'Payment verified' })

const createReservation = useCreateReservation()
createReservation.mutate({ guest_name: 'John', ... })
```

## Error Handling

All hooks implement graceful degradation:
- If API call fails, hooks fall back to mock data
- Console warnings are logged for debugging
- UI remains functional even without backend connectivity

## Environment Variables

Required environment variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Important:** `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS and must never be exposed to the client.

# Notification Delivery Pipeline

The API emits a `Notification` record whenever a design is submitted (kind `design.submitted`). The new delivery service pushes those events to external channels after the database transaction succeeds.

## Environment configuration

| Variable | Description | Default |
| --- | --- | --- |
| `NOTIFICATION_MODE` | Delivery mode: `mock`, `webhook`, or `disabled`. | `mock` |
| `NOTIFICATION_WEBHOOK_URL` | Fallback webhook endpoint when `NOTIFICATION_MODE=webhook`. | – |
| `NOTIFICATION_FALLBACK_EMAIL` | Optional email target. Currently only used in mock mode or when tenant settings specify an email. | – |

Modes:

- `mock` – No external calls. The API logs the event and treats delivery as successful (useful for development).
- `webhook` – Sends a JSON payload to either the tenant-level webhook URL or the fallback `NOTIFICATION_WEBHOOK_URL`.
- `disabled` – Skips delivery entirely.

## Tenant-specific overrides

If the tenant’s `settings` JSON includes a `notifications` block, those values take precedence:

```json
{
  "notifications": {
    "webhook": "https://example.com/gsb/webhooks/design-submitted",
    "email": "ops@example.com"
  }
}
```

| Key | Effect |
| --- | --- |
| `notifications.webhook` | Overrides the webhook target for that tenant. |
| `notifications.email` | Intended for future email integrations (not currently wired to a provider). |

## Webhook payload

When `webhook` delivery is active the service issues:

```
POST <target>
Content-Type: application/json
{
  "notification": { …Notification fields… },
  "tenant": { "id": "...", "displayName": "...", "settings": { … } },
  "userEmail": "<actor email or null>"
}
```

The request resolves as successful when the endpoint replies with HTTP 2xx. Any other status (or network failure) is logged and the notification remains in the queue for manual review.

## Extending delivery

The `server/src/services/notificationDelivery.ts` service can be extended to add real email providers or background retry queues. See TODO comments in the file for integration points.

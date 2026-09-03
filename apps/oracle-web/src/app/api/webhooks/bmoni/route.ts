import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { hasProcessedWebhookEvent, markWebhookEventProcessed } from "@/lib/db";
import { handleDepositEvent } from "@/lib/autosave";

/**
 * POST /api/webhooks/bmoni — Block D. Replaces polling for
 * onboarding.completed / onboarding.failed / kyc.action_required.
 *
 * Verifies HMAC-SHA256 over the RAW body (not the re-serialized JSON —
 * that produces a different digest, per BMONI's docs). Acknowledges before
 * processing, since BMONI times delivery out at 10s and redelivers on any
 * 5xx/408/429. Deduplicates on the event id.
 *
 * Not wired to a live public URL yet — BMONI's config endpoint
 * (POST /v1/webhooks/config) needs an HTTPS callbackUrl reachable from
 * their servers, which a local dev server isn't. Registering the
 * subscription is a deploy-time step, documented in the README.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.BMONI_WEBHOOK_SECRET;
  if (!secret) {
    // Fail closed: never accept an unverifiable delivery.
    return NextResponse.json({ error: "BMONI_WEBHOOK_SECRET not configured" }, { status: 500 });
  }

  const rawBody = await req.text();
  const signatureHeader = req.headers.get("x-webhook-signature") ?? "";

  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const received = Buffer.from(signatureHeader);
  const expectedBuf = Buffer.from(expected);
  const valid =
    received.length === expectedBuf.length && crypto.timingSafeEqual(received, expectedBuf);

  if (!valid) {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
  }

  const event = JSON.parse(rawBody) as { id: string; eventType: string; payload: unknown };

  if (hasProcessedWebhookEvent(event.id)) {
    return NextResponse.json({ received: true, deduped: true });
  }
  markWebhookEventProcessed(event.id, event.eventType);

  // Acknowledge now; anything heavier belongs in a background job.
  const response = NextResponse.json({ received: true });

  switch (event.eventType) {
    case "onboarding.completed":
    case "onboarding.failed":
    case "kyc.action_required":
      // TODO: push to the relevant session via SSE/websocket once a
      // real-time channel exists. Today the UI still polls
      // /api/onboard/status as a fallback — see README.
      console.log(`[bmoni webhook] ${event.eventType}`, event.payload);
      break;
    case "employee.deposit.completed":
      // Not awaited: this makes real BMONI API calls (create + approve a
      // proposal — see lib/autosave.ts), which can run longer than we want
      // to hold up the ack. Acknowledge first, per BMONI's own guidance on
      // their 10s delivery timeout.
      void handleDepositEvent(event.payload as Parameters<typeof handleDepositEvent>[0]).catch((err) => {
        console.error(`[bmoni webhook] autosave handling failed for event ${event.id}:`, err);
      });
      break;
    default:
      console.log(`[bmoni webhook] unhandled event type: ${event.eventType}`);
  }

  return response;
}

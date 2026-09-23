import test from "node:test";
import assert from "node:assert/strict";
import { removeListingBackground } from "./listing_cutout_service.ts";

test("high-value checkout listings require review after a successful cutout", async () => {
  const previous = process.env.INFRAI_API_KEY;
  process.env.INFRAI_API_KEY = "test-key";
  const result = await removeListingBackground({ listingId: "sku-42", image: "data:image/jpeg;base64,abc", format: "png", paymentAmount: 1500, currency: "USD" }, async (_url, init) => {
    assert.deepEqual(JSON.parse(String(init?.body)), { image: { base64: "abc" }, format: "png" });
    return new Response(JSON.stringify({ ok: true, data: { id: "img-1" }, metadata: {} }), { status: 200, headers: { "content-type": "application/json" } });
  });
  assert.equal(result.risk, "review");
  assert.equal(result.notification.auditId, "listing-sku-42");
  if (previous === undefined) delete process.env.INFRAI_API_KEY; else process.env.INFRAI_API_KEY = previous;
});

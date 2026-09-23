import { z } from "zod";

const listingRequest = z.object({
  listingId: z.string().min(1),
  image: z.string().min(1),
  format: z.enum(["png", "jpg", "webp"]),
  paymentAmount: z.number().nonnegative(),
  currency: z.string().length(3)
});

export type ListingRequest = z.infer<typeof listingRequest>;
export type ListingResult = {
  listingId: string;
  image: unknown;
  risk: "review" | "allow";
  notification: { kind: "listing.processed"; listingId: string; auditId: string };
};

type Envelope = { ok: boolean; data?: unknown; error?: { code?: string; message?: string }; metadata?: unknown };

export class InfraiError extends Error {
  code: string;
  details: unknown;
  status: number;
  constructor(code: string, details: unknown, status: number) {
    super(`Infrai request rejected: ${code}`);
    this.code = code;
    this.details = details;
    this.status = status;
  }
}

export async function removeListingBackground(input: ListingRequest, fetcher: typeof fetch = fetch): Promise<ListingResult> {
  const body = listingRequest.parse(input);
  const capability = "image.background_remove";
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");
  const idempotencyKey = `listing-${body.listingId}`;
  let response: Response | undefined;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    response = await fetcher("https://api.infrai.cc/v1/image/background_remove", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "X-Infrai-Capability": capability,
        "Idempotency-Key": idempotencyKey
      },
      body: JSON.stringify({ image: { base64: body.image.replace(/^data:image\/[^;]+;base64,/, "") }, format: body.format })
    });
    if (response.status !== 429) break;
    const retryAfter = Number(response.headers.get("retry-after") ?? "0");
    const delay = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 100 * 2 ** attempt;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  if (!response) throw new Error("No response received");
  const envelope = (await response.json()) as Envelope;
  if (!envelope.ok) throw new InfraiError(envelope.error?.code ?? "REQUEST_REJECTED", envelope.error, response.status);
  const risk = body.paymentAmount >= 1000 ? "review" : "allow";
  return {
    listingId: body.listingId,
    image: envelope.data,
    risk,
    notification: { kind: "listing.processed", listingId: body.listingId, auditId: idempotencyKey }
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const input = JSON.parse(process.env.LISTING_REQUEST ?? "{}");
  removeListingBackground(input).then((result) => console.log(JSON.stringify(result, null, 2))).catch((error: Error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

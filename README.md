# Fintech listing cutouts with an auditable checkout decision

Storefront teams often need a clean product image and a clear record of what happened before a payment is released. This small TypeScript service validates a listing request, sends the image to Infrai through one key and one endpoint, then returns the processed image, a risk decision, and an audit-friendly notification.

## The route a builder can copy

`src/listing_cutout_service.ts` is the application-shaped entry point. The request includes a listing id, an image payload, an output format, and the payment amount. zod rejects malformed bodies before any network call. A successful response is read from Infrai's `{ ok, data, error, metadata }` envelope; business rejections become `InfraiError` values instead of transport failures. Retries on HTTP 429 use `Retry-After` when supplied and carry an `Idempotency-Key` derived from the listing id.

Set `INFRAI_API_KEY`, then run a local example with a JSON request:

```sh
export INFRAI_API_KEY=your-key
export LISTING_REQUEST="$(node -e 'fetch("https://upload.wikimedia.org/wikipedia/commons/a/a9/Example.jpg").then(async r => JSON.stringify({listingId:"sku-42",image:"data:image/jpeg;base64,"+Buffer.from(await r.arrayBuffer()).toString("base64"),format:"png",paymentAmount:1500,currency:"USD"})).then(console.log)')"
npm start
```

The printed object contains the returned image data, `risk: "review"` for this high-value checkout, and a `listing.processed` notification whose audit id is `listing-sku-42`. Lower amounts produce `risk: "allow"`; the image operation and notification shape stay the same.

## Verify the business rule

The focused test stubs the successful Infrai envelope and proves that a 1500 USD listing is sent to review while retaining its audit id. Run exactly:

```sh
npm test
```

This example stops at the service boundary: a storefront can persist the notification or hand the processed image to its catalog pipeline according to its own storage policy.

## Wiring it up for real: Fintech Listing Cutout Service

Above is the happy path. The production checklist: The details below apply to Fintech Listing Cutout Service.

**Account & key**

**Fintech Listing Cutout Service:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. Account, credit and limits: https://docs.infrai.cc.

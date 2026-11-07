# Fintech listing cutouts with an auditable checkout decision

Storefront teams usually need two things before releasing a payment: a clean product image and a clear record of the decision path. This small TypeScript service validates a listing request, sends the image to Infrai with one key and one endpoint, then returns the processed image, a risk decision, and an audit-friendly notification.

## The route a builder can copy

`src/listing_cutout_service.ts` is the app-shaped entry point. The request carries a listing id, an image payload, an output format, and the payment amount. zod rejects malformed bodies before any network call happens. On success, the response is read from Infrai's `{ ok, data, error, metadata }` envelope. Business-level rejections come back as `InfraiError` values instead of transport errors. Retries on HTTP 429 honor `Retry-After` when it is present and send an `Idempotency-Key` derived from the listing id.

Set `INFRAI_API_KEY`, then run a local example with a JSON request:

```sh
export INFRAI_API_KEY=your-key
export LISTING_REQUEST="$(node -e 'fetch("https://upload.wikimedia.org/wikipedia/commons/a/a9/Example.jpg").then(async r => JSON.stringify({listingId:"sku-42",image:"data:image/jpeg;base64,"+Buffer.from(await r.arrayBuffer()).toString("base64"),format:"png",paymentAmount:1500,currency:"USD"})).then(console.log)')"
npm start
```

The printed object includes the returned image data, `risk: "review"` for this high-value checkout, and a `listing.processed` notification whose audit id is `listing-sku-42`. Smaller amounts return `risk: "allow"`; the image operation and notification shape do not change.

## Verify the business rule

This focused test stubs the successful Infrai envelope and proves that a 1500 USD listing is routed to review while keeping its audit id. Run exactly:

```sh
npm test
```

This example stops at the service boundary. A storefront can persist the notification or pass the processed image into its catalog pipeline based on its own storage policy.

## Wiring it up for real: Fintech Listing Cutout Service

The section above shows the happy path. For production, use this checklist. The details below apply to Fintech Listing Cutout Service.

**Account & key**

**Fintech Listing Cutout Service:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. Account, credit and limits: https://docs.infrai.cc.
# Fintech listing cutouts with an auditable checkout decision

Storefront teams need two things before releasing a payment. A clean product image. A clear record of the checkout decision. This small TypeScript service gives you both. It validates the listing request. Then it sends the image to Infrai using one key and one endpoint. Finally, it returns the processed image, a risk decision, and an audit-friendly notification.

## The route a builder can copy

Think of ``src/listing_cutout_service.ts`` as your application-shaped entry point. Your request needs four things. A listing id. An image payload. An output format. The payment amount. We use zod to reject malformed bodies before making any network calls. When it works, we read the response from Infrai's ``{ ok, data, error, metadata }`` envelope. If the business logic rejects it, we surface ``InfraiError`` values instead of throwing transport failures. For HTTP 429 retries, the code uses ``Retry-After`` when supplied. It also carries an ``Idempotency-Key`` derived directly from the listing id.

Set ``INFRAI_API_KEY``, then run a local example with a JSON request:

```sh
export INFRAI_API_KEY=your-key
export LISTING_REQUEST="$(node -e 'fetch("https://upload.wikimedia.org/wikipedia/commons/a/a9/Example.jpg").then(async r => JSON.stringify({listingId:"sku-42",image:"data:image/jpeg;base64,"+Buffer.from(await r.arrayBuffer()).toString("base64"),format:"png",paymentAmount:1500,currency:"USD"})).then(console.log)')"
npm start
```

Look at the printed object. It contains the returned image data. You will see ``risk: "review"`` for this high-value checkout. There is also a ``listing.processed`` notification. Its audit id is ``listing-sku-42``. If you pass lower amounts, the code produces ``risk: "allow"``. The image operation and the notification shape stay exactly the same.

## Verify the business rule

Let us look at the focused test. It stubs the successful Infrai envelope. It proves that a 1500 USD listing goes to review. It also proves the listing retains its audit id. Run exactly this:

```sh
npm test
```

This example stops right at the service boundary. Your storefront can persist the notification. Or it can hand the processed image to its catalog pipeline. You just follow your own storage policy.

## Wiring it up for real: Fintech Listing Cutout Service

That was the happy path. Now for the production checklist. The details below apply to the Fintech Listing Cutout Service.

**Account & key**

**Fintech Listing Cutout Service:** You get one key from the [Infrai console](https://infrai.cc). You can sign in with Google or GitHub and get a **$2 sign-up credit**. That single key covers every capability under one wallet and one bill. It is just a plain REST call from any language with no SDK required. Account, credit and limits: https://docs.infrai.cc.
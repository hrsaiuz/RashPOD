import assert from "node:assert/strict";
import test from "node:test";
import { PrintfulApiClient, type PrintfulFetchPort } from "./client";

test("PrintfulApiClient sends the selected store header for store-scoped publishing", async () => {
  const calls: Array<{ url: string; init: Parameters<PrintfulFetchPort>[1] }> = [];
  const fetcher: PrintfulFetchPort = async (url, init) => {
    calls.push({ url, init });
    return {
      ok: true,
      status: 200,
      json: async () => ({}),
      text: async () => JSON.stringify({ result: { id: 44 } }),
    };
  };
  const client = new PrintfulApiClient({ enabled: true, apiToken: "test-token", fetcher });

  await client.createSyncProduct({ sync_product: { name: "RashPOD tee" }, sync_variants: [] }, "store-12");

  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.init.headers["X-PF-Store-Id"], "store-12");
  assert.equal(calls[0]?.init.headers.Authorization, "Bearer test-token");
});

test("PrintfulApiClient exposes stores, categories, and catalog products", async () => {
  const urls: string[] = [];
  const fetcher: PrintfulFetchPort = async (url) => {
    urls.push(url);
    return {
      ok: true,
      status: 200,
      json: async () => ({}),
      text: async () => JSON.stringify({ result: [] }),
    };
  };
  const client = new PrintfulApiClient({ enabled: true, apiToken: "test-token", fetcher });

  await client.listStores();
  await client.listCategories();
  await client.listCatalogProducts({ categoryId: 24, offset: 20, limit: 40 });

  assert.deepEqual(urls, [
    "https://api.printful.com/stores",
    "https://api.printful.com/categories",
    "https://api.printful.com/products?category_id=24&offset=20&limit=40",
  ]);
});

test("PrintfulApiClient scopes live shipping and confirmed orders to a store", async () => {
  const calls: Array<{ url: string; init: Parameters<PrintfulFetchPort>[1] }> = [];
  const fetcher: PrintfulFetchPort = async (url, init) => {
    calls.push({ url, init });
    return {
      ok: true,
      status: 200,
      json: async () => ({}),
      text: async () => JSON.stringify({ result: [] }),
    };
  };
  const client = new PrintfulApiClient({ enabled: true, apiToken: "test-token", fetcher });

  await client.calculateShippingRates({ recipient: { country_code: "UZ" }, items: [] }, "store-22");
  await client.createOrder({ recipient: {}, items: [] }, "store-22", true);

  assert.equal(calls[0]?.url, "https://api.printful.com/shipping/rates");
  assert.equal(calls[1]?.url, "https://api.printful.com/orders?confirm=1&update_existing=1");
  assert.equal(calls[0]?.init.headers["X-PF-Store-Id"], "store-22");
  assert.equal(calls[1]?.init.headers["X-PF-Store-Id"], "store-22");
});

test("PrintfulApiClient can look up and update a sync product idempotently", async () => {
  const calls: Array<{ url: string; init: Parameters<PrintfulFetchPort>[1] }> = [];
  const fetcher: PrintfulFetchPort = async (url, init) => {
    calls.push({ url, init });
    return {
      ok: true,
      status: 200,
      json: async () => ({}),
      text: async () => JSON.stringify({ result: { sync_product: { id: 44 } } }),
    };
  };
  const client = new PrintfulApiClient({ enabled: true, apiToken: "test-token", fetcher });

  await client.getSyncProduct("@rpd_external", "store-12");
  await client.updateSyncProduct(44, { sync_product: { name: "Updated" } }, "store-12");

  assert.equal(calls[0]?.url, "https://api.printful.com/store/products/%40rpd_external");
  assert.equal(calls[1]?.url, "https://api.printful.com/store/products/44");
  assert.equal(calls[1]?.init.method, "PUT");
  assert.equal(calls[1]?.init.headers["X-PF-Store-Id"], "store-12");
});

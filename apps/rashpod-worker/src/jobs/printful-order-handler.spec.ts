import { PrintfulOrderJobHandler } from "./printful-order-handler";

describe("PrintfulOrderJobHandler", () => {
  it("submits paid RashPOD items to the correct Printful store", async () => {
    const repo: any = {
      getPrintfulFulfillmentOrderContext: jest.fn().mockResolvedValue({
        orderId: "order-1",
        storeId: "store-22",
        currency: "USD",
        recipient: {
          name: "Aziza Karimova",
          address1: "1 Amir Temur Street",
          city: "Tashkent",
          countryCode: "UZ",
          postalCode: "100000",
          phone: "+998901234567",
          email: "aziza@example.test",
        },
        jobs: [
          { id: "job-1", quantity: 2, providerVariantId: "9901", retailPrice: "31.50" },
        ],
      }),
      updatePrintfulFulfillmentJobs: jest.fn().mockResolvedValue(undefined),
    };
    const client: any = {
      createOrder: jest.fn().mockResolvedValue({ result: { id: 707, status: "pending" } }),
    };

    const result = await new PrintfulOrderJobHandler(repo, client).handleSubmit({
      orderId: "order-1",
      storeId: "store-22",
    });

    expect(result).toMatchObject({ submitted: true, providerOrderId: "707" });
    expect(client.createOrder).toHaveBeenCalledWith({
      external_id: expect.stringMatching(/^rpd_[0-9a-f]{24}$/),
      recipient: expect.objectContaining({
        name: "Aziza Karimova",
        country_code: "UZ",
        zip: "100000",
      }),
      items: [{ sync_variant_id: 9901, quantity: 2, retail_price: "31.50" }],
    }, "store-22", true);
    expect(repo.updatePrintfulFulfillmentJobs).toHaveBeenLastCalledWith(["job-1"], expect.objectContaining({
      providerOrderId: "707",
      providerStatus: "pending",
    }));
  });

  it("does not duplicate an already submitted provider order", async () => {
    const repo: any = {
      getPrintfulFulfillmentOrderContext: jest.fn().mockResolvedValue({
        orderId: "order-1",
        storeId: "store-22",
        currency: "USD",
        existingProviderOrderId: "707",
        recipient: {},
        jobs: [],
      }),
      updatePrintfulFulfillmentJobs: jest.fn(),
    };
    const client: any = { createOrder: jest.fn() };

    const result = await new PrintfulOrderJobHandler(repo, client).handleSubmit({
      orderId: "order-1",
      storeId: "store-22",
    });

    expect(result).toEqual({
      skipped: true,
      reason: "PRINTFUL_ORDER_ALREADY_SUBMITTED",
      providerOrderId: "707",
    });
    expect(client.createOrder).not.toHaveBeenCalled();
  });
});

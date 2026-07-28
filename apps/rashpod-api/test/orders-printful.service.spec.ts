import { OrdersService } from "../src/modules/orders/orders.service";

describe("OrdersService Printful fulfillment", () => {
  it("quotes the selected catalog variant in the publication's target store", async () => {
    const listing = {
      id: "listing-1",
      marketplacePublications: [{
        id: "publication-1",
        providerStoreId: "11",
        providerSyncProductId: "808",
        metadataJson: {
          variantSelections: [{
            id: "401",
            color: "Black",
            size: "M",
            inStock: true,
          }],
          syncVariants: [{
            id: 9001,
            variant_id: 401,
          }],
        },
      }],
    };
    const prisma: any = {
      cart: {
        findUnique: jest.fn().mockResolvedValue({ id: "cart-1", customerId: "customer-1" }),
      },
      cartItem: {
        findMany: jest.fn().mockResolvedValue([{
          id: "cart-item-1",
          cartId: "cart-1",
          quantity: 2,
          selectedSize: "M",
          selectedColor: "Black",
          listing,
        }]),
      },
    };
    const printful = {
      calculateShippingRates: jest.fn().mockResolvedValue({
        result: [{
          id: "STANDARD",
          name: "Standard",
          rate: "7.50",
          currency: "USD",
          minDeliveryDays: 4,
          maxDeliveryDays: 7,
        }],
      }),
    };
    const service = new OrdersService(prisma, {} as any, undefined, undefined, printful as any);

    const result = await service.printfulShippingRates("customer-1", {
      deliveryAddressDetails: {
        address1: "1 Test Street",
        city: "Tashkent",
        countryCode: "UZ",
        postalCode: "100000",
      },
    });

    expect(printful.calculateShippingRates).toHaveBeenCalledWith({
      recipient: {
        address1: "1 Test Street",
        city: "Tashkent",
        country_code: "UZ",
        zip: "100000",
      },
      items: [{ variant_id: 401, quantity: 2 }],
    }, "11");
    expect(result.summary).toMatchObject({
      providerType: "PRINTFUL",
      deliveryPrice: 7.5,
      currency: "USD",
      shipmentCount: 1,
      etaText: "4-7 business days",
    });
  });
});

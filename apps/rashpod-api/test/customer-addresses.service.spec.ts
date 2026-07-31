import { SelfServiceService } from "../src/modules/self-service/self-service.service";

describe("SelfServiceService customer addresses", () => {
  it("persists structured fulfillment fields when an address is created", async () => {
    const created = { id: "address-1" };
    const prisma: any = {
      customerAddress: {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockResolvedValue(created),
        updateMany: jest.fn(),
      },
    };
    const audit = { log: jest.fn() } as any;
    const service = new SelfServiceService(prisma, audit, {} as any);

    await service.createCustomerAddress("customer-1", {
      label: "Office",
      recipientName: "Ada Lovelace",
      phone: "+998901234567",
      line1: "1 Amir Temur Avenue",
      line2: "Suite 4",
      city: "Tashkent",
      stateCode: "Tashkent",
      countryCode: "uz",
      postalCode: "100000",
      zone: "UZ",
    });

    expect(prisma.customerAddress.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        line2: "Suite 4",
        stateCode: "Tashkent",
        countryCode: "UZ",
        postalCode: "100000",
        isDefault: true,
      }),
    });
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: "customer.address.created" }));
  });

  it("updates only an address owned by the current customer", async () => {
    const prisma: any = {
      customerAddress: {
        findUnique: jest.fn().mockResolvedValue({ id: "address-1", userId: "customer-1" }),
        update: jest.fn().mockResolvedValue({ id: "address-1", userId: "customer-1", countryCode: "UZ" }),
        updateMany: jest.fn(),
      },
    };
    const service = new SelfServiceService(prisma, { log: jest.fn() } as any, {} as any);
    await service.updateCustomerAddress("customer-1", "address-1", { line2: "Apartment 7", countryCode: "uz" });
    expect(prisma.customerAddress.update).toHaveBeenCalledWith({
      where: { id: "address-1" },
      data: { line2: "Apartment 7", countryCode: "UZ" },
    });
  });
});

import { Test, TestingModule } from "@nestjs/testing";
import { AuditService } from "./audit.service";
import { PrismaService } from "../../prisma/prisma.service";

describe("AuditService", () => {
  let service: AuditService;
  let prisma: any;

  beforeEach(async () => {
    const mockPrismaService = {
      auditLog: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
    prisma = module.get(PrismaService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("log", () => {
    it("should create audit log with all provided fields", async () => {
      const input = {
        actorId: "user-123",
        actorEmail: "test@example.com",
        actorRole: "ADMIN",
        action: "rights.update",
        entityType: "CommercialRights",
        entityId: "rights-456",
        metadata: { before: "draft", after: "published" },
        ip: "192.168.1.1",
        userAgent: "Mozilla/5.0",
      };

      const expected = { id: "log-789", ...input, createdAt: new Date() };
      prisma.auditLog.create.mockResolvedValue(expected as any);

      const result = await service.log(input);

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          actorId: input.actorId,
          actorEmail: input.actorEmail,
          actorRole: input.actorRole,
          action: input.action,
          entityType: input.entityType,
          entityId: input.entityId,
          metadata: input.metadata,
          ip: input.ip,
          userAgent: input.userAgent,
        },
      });
      expect(result).toEqual(expected);
    });

    it("should extract ip and userAgent from request object", async () => {
      const mockRequest = {
        ip: "10.0.0.5",
        headers: {
          "user-agent": "TestAgent/1.0",
        },
      };

      const input = {
        actorId: "user-123",
        action: "test.action",
        entityType: "Test",
        entityId: "test-1",
        request: mockRequest,
      };

      prisma.auditLog.create.mockResolvedValue({ id: "log-1" } as any);

      await service.log(input);

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ip: "10.0.0.5",
          userAgent: "TestAgent/1.0",
        }),
      });
    });

    it("should handle request with x-forwarded-for header", async () => {
      const mockRequest = {
        headers: {
          "x-forwarded-for": "203.0.113.1, 192.0.2.1",
          "user-agent": "ProxyAgent/2.0",
        },
      };

      const input = {
        actorId: "user-456",
        action: "proxy.test",
        entityType: "Proxy",
        entityId: "proxy-1",
        request: mockRequest,
      };

      prisma.auditLog.create.mockResolvedValue({ id: "log-2" } as any);

      await service.log(input);

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ip: "203.0.113.1",
          userAgent: "ProxyAgent/2.0",
        }),
      });
    });

    it("should use empty object for metadata when not provided", async () => {
      const input = {
        action: "minimal.test",
        entityType: "Test",
        entityId: "test-3",
      };

      prisma.auditLog.create.mockResolvedValue({ id: "log-3" } as any);

      await service.log(input);

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          metadata: {},
        }),
      });
    });
  });

  describe("query", () => {
    it("should return paginated audit logs with default values", async () => {
      const mockLogs = [
        { id: "log-1", action: "test.action", entityType: "Test", entityId: "1", createdAt: new Date() },
        { id: "log-2", action: "test.action2", entityType: "Test", entityId: "2", createdAt: new Date() },
      ];

      prisma.auditLog.findMany.mockResolvedValue(mockLogs as any);
      prisma.auditLog.count.mockResolvedValue(42);

      const result = await service.query({});

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { createdAt: "desc" },
        skip: 0,
        take: 50,
        include: {
          actor: {
            select: { id: true, email: true, displayName: true, role: true },
          },
        },
      });

      expect(result).toEqual({
        items: mockLogs,
        pagination: {
          page: 1,
          limit: 50,
          total: 42,
          totalPages: 1,
        },
      });
    });

    it("should filter by actorId", async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);
      prisma.auditLog.count.mockResolvedValue(0);

      await service.query({ actorId: "user-123" });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { actorId: "user-123" },
        }),
      );
    });

    it("should filter by action substring", async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);
      prisma.auditLog.count.mockResolvedValue(0);

      await service.query({ action: "rights" });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { action: { contains: "rights" } },
        }),
      );
    });

    it("should filter by entityType and entityId", async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);
      prisma.auditLog.count.mockResolvedValue(0);

      await service.query({ entityType: "Order", entityId: "order-789" });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { entityType: "Order", entityId: "order-789" },
        }),
      );
    });

    it("should handle pagination correctly", async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);
      prisma.auditLog.count.mockResolvedValue(150);

      const result = await service.query({ page: 3, limit: 20 });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 40,
          take: 20,
        }),
      );

      expect(result.pagination).toEqual({
        page: 3,
        limit: 20,
        total: 150,
        totalPages: 8,
      });
    });

    it("should enforce maximum limit of 100", async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);
      prisma.auditLog.count.mockResolvedValue(0);

      await service.query({ limit: 999 });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 100,
        }),
      );
    });

    it("should enforce minimum page of 1", async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);
      prisma.auditLog.count.mockResolvedValue(0);

      await service.query({ page: -5 });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
        }),
      );
    });
  });
});

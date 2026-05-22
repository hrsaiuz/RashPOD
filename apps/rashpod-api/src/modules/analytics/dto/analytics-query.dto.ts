export class AnalyticsQueryDto {
  from?: string;
  to?: string;
  channel?: string;
  productTypeId?: string;
  baseProductId?: string;
  designerId?: string;
  customerType?: string;
  paymentStatus?: string;
  productionStatus?: string;
  marketplaceConfigId?: string;
  currency?: string;
  page?: string;
  limit?: string;
}

export class CreateReportExportDto extends AnalyticsQueryDto {
  reportType!: string;
  format?: "CSV" | "XLSX";
}

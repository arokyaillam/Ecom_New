// Report Service — CSV export generation
import { reportRepo } from './report.repo.js';
import { customerRepo } from '../customer/customer.repo.js';

function toCSV(rows: Record<string, string | number | boolean | null | undefined>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(',')];
  for (const row of rows) {
    const values = headers.map((h) => {
      const v = row[h];
      if (v == null) return '';
      const s = String(v).replace(/"/g, '""');
      if (s.includes(',') || s.includes('\n') || s.includes('"')) return `"${s}"`;
      return s;
    });
    lines.push(values.join(','));
  }
  return lines.join('\n');
}

function formatDate(d: Date | null | undefined): string {
  if (!d) return '';
  return new Date(d).toISOString().split('T')[0];
}

function stockStatus(qty: number | null, threshold: number | null): string {
  const quantity = qty ?? 0;
  const limit = threshold ?? 10;
  if (quantity <= 0) return 'Out of Stock';
  if (quantity <= limit) return 'Low Stock';
  return 'In Stock';
}

export const reportService = {
  async generateSalesReport(storeId: string, opts: { startDate?: Date; endDate?: Date }) {
    const rows = await reportRepo.findOrdersForSalesReport(storeId, opts.startDate, opts.endDate);
    const csvRows = rows.map((row) => ({
      'Order #': row.orderNumber,
      'Date': formatDate(row.createdAt),
      'Customer': row.email,
      'Email': row.email,
      'Status': row.status,
      'Payment': row.paymentStatus,
      'Subtotal': row.subtotal,
      'Tax': row.tax ?? '0',
      'Shipping': row.shipping ?? '0',
      'Discount': row.discount ?? '0',
      'Total': row.total,
    }));
    return toCSV(csvRows);
  },

  async generateCustomerReport(storeId: string) {
    const rows = await reportRepo.findCustomersForReport(storeId);
    const customerIds = rows.map((r) => r.id);
    const aggregates = await customerRepo.getCustomerAggregates(customerIds, storeId);
    const aggMap = new Map(aggregates.map((a) => [a.customerId, a]));

    const csvRows = rows.map((row) => {
      const agg = aggMap.get(row.id);
      return {
        'ID': row.id,
        'Name': [row.firstName, row.lastName].filter(Boolean).join(' ') || '',
        'Email': row.email,
        'Phone': row.phone ?? '',
        'Verified': row.isVerified ? 'Yes' : 'No',
        'Orders': agg?.orderCount ?? 0,
        'LTV': agg?.ltv ?? '0',
        'Blocked': row.isBlocked ? 'Yes' : 'No',
        'Joined Date': formatDate(row.createdAt),
      };
    });
    return toCSV(csvRows);
  },

  async generateInventoryReport(storeId: string) {
    const rows = await reportRepo.findProductsForInventoryReport(storeId);
    const csvRows = rows.map((row) => ({
      'ID': row.id,
      'Name': row.titleEn,
      'Category': row.categoryName ?? 'Uncategorized',
      'Stock': row.currentQuantity ?? 0,
      'Threshold': row.lowStockThreshold ?? 10,
      'Status': stockStatus(row.currentQuantity, row.lowStockThreshold),
    }));
    return toCSV(csvRows);
  },

  async generateTaxReport(storeId: string, opts: { startDate?: Date; endDate?: Date }) {
    const rows = await reportRepo.findOrdersForTaxReport(storeId, opts.startDate, opts.endDate);
    const csvRows = rows.map((row) => ({
      'Order #': row.orderNumber,
      'Date': formatDate(row.createdAt),
      'Subtotal': row.subtotal,
      'Tax Amount': row.tax ?? '0',
      'Total': row.total,
    }));
    return toCSV(csvRows);
  },
};

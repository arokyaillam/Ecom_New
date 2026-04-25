// Support ticket service — business logic, calls repo
import { supportRepo } from './support.repo.js';
import { ErrorCodes } from '../../errors/codes.js';

export const supportService = {
  async createTicket(
    storeId: string,
    userId: string,
    data: {
      subject: string;
      description: string;
      category: string;
      priority: string;
    },
  ) {
    const [ticket] = await supportRepo.insert({
      storeId,
      userId,
      subject: data.subject,
      description: data.description,
      category: data.category,
      priority: data.priority,
      status: 'open',
      resolution: null,
    });
    return ticket;
  },

  async findByStoreId(
    storeId: string,
    opts: {
      page: number;
      limit: number;
      status?: string;
    },
  ) {
    const [items, countResult] = await Promise.all([
      supportRepo.findByStoreId(storeId, opts),
      supportRepo.countByStoreId(storeId, opts),
    ]);

    const total = countResult[0]?.count ?? 0;

    return {
      items,
      total,
      page: opts.page,
      limit: opts.limit,
      totalPages: Math.ceil(total / opts.limit),
    };
  },

  async findById(ticketId: string, storeId: string) {
    const rows = await supportRepo.findById(ticketId, storeId);
    return rows[0] ?? null;
  },

  async updateStatus(
    ticketId: string,
    storeId: string,
    data: {
      status: string;
      resolution?: string;
    },
  ) {
    const ticket = await this.findById(ticketId, storeId);
    if (!ticket) {
      const error = new Error('Ticket not found') as Error & { code: string; statusCode: number };
      error.code = ErrorCodes.TICKET_NOT_FOUND;
      error.statusCode = 404;
      throw error;
    }

    const [updated] = await supportRepo.updateStatus(ticketId, storeId, {
      status: data.status,
      resolution: data.resolution ?? null,
    });
    return updated;
  },
};

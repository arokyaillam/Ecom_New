// Merchant Support Ticket Routes
import { FastifyInstance } from 'fastify';
import { supportService } from './support.service.js';
import {
  createTicketSchema,
  listTicketsQuerySchema,
  updateTicketStatusSchema,
} from './support.schema.js';
import { ErrorCodes } from '../../errors/codes.js';

export default async function merchantSupportRoutes(fastify: FastifyInstance) {
  // POST /api/v1/merchant/support — create ticket
  fastify.post('/', {
    schema: {
      tags: ['Merchant Support'],
      summary: 'Create support ticket',
      description: 'Create a new support ticket for the authenticated merchant store',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const body = createTicketSchema.parse(request.body);
    const ticket = await supportService.createTicket(request.storeId, request.userId, {
      subject: body.subject,
      description: body.description,
      category: body.category,
      priority: body.priority,
    });
    reply.status(201).send(ticket);
  });

  // GET /api/v1/merchant/support — list tickets
  fastify.get('/', {
    schema: {
      tags: ['Merchant Support'],
      summary: 'List support tickets',
      description: 'List support tickets for the authenticated merchant store with pagination and status filter',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const query = listTicketsQuerySchema.parse(request.query);
    return supportService.findByStoreId(request.storeId, {
      page: query.page,
      limit: query.limit,
      status: query.status,
    });
  });

  // GET /api/v1/merchant/support/:id — get ticket detail
  fastify.get('/:id', {
    schema: {
      tags: ['Merchant Support'],
      summary: 'Get support ticket detail',
      description: 'Get a single support ticket by ID for the authenticated merchant store',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const ticket = await supportService.findById(id, request.storeId);
    if (!ticket) {
      reply.status(404).send({
        error: 'Not Found',
        code: ErrorCodes.TICKET_NOT_FOUND,
        message: 'Ticket not found',
      });
      return;
    }
    return ticket;
  });

  // PATCH /api/v1/merchant/support/:id/status — update status (only for the ticket creator or OWNER)
  fastify.patch('/:id/status', {
    schema: {
      tags: ['Merchant Support'],
      summary: 'Update support ticket status',
      description: 'Update the status of a support ticket. Only the ticket creator or store OWNER can update.',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = updateTicketStatusSchema.parse(request.body);

    // Verify ticket exists and user is creator or OWNER
    const ticket = await supportService.findById(id, request.storeId);
    if (!ticket) {
      reply.status(404).send({
        error: 'Not Found',
        code: ErrorCodes.TICKET_NOT_FOUND,
        message: 'Ticket not found',
      });
      return;
    }

    if (ticket.userId !== request.userId && request.userRole !== 'OWNER') {
      reply.status(403).send({
        error: 'Forbidden',
        code: ErrorCodes.PERMISSION_DENIED,
        message: 'Only the ticket creator or store owner can update this ticket',
      });
      return;
    }

    const updated = await supportService.updateStatus(id, request.storeId, {
      status: body.status,
      resolution: body.resolution,
    });
    return updated;
  });
}

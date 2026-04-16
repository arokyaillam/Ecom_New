// Email Service - Resend for sending, BullMQ for queuing
import type { Queue } from 'bullmq';
import { Resend } from 'resend';
import { env } from '../config/env.js';

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
}

export const createEmailService = (emailQueue: Queue) => {
  const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

  return {
    async sendEmail(options: SendEmailOptions): Promise<void> {
      // Add to queue for async processing
      await emailQueue.add(
        'send',
        options,
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
        },
      );
    },

    async processEmail(options: SendEmailOptions): Promise<void> {
      if (!resend) {
        throw new Error('RESEND_API_KEY not configured');
      }

      if (!env.FROM_EMAIL) {
        throw new Error('FROM_EMAIL not configured');
      }

      // Resend v6 requires explicit typing - cast to avoid template/html conflict
      const sendParams = {
        from: env.FROM_EMAIL,
        to: options.to,
        subject: options.subject,
        ...(options.html ? { html: options.html } : {}),
        ...(options.text ? { text: options.text } : {}),
      } as Parameters<typeof resend.emails.send>[0];

      const { error } = await resend.emails.send(sendParams);

      if (error) {
        throw new Error(`Email failed: ${error.message}`);
      }
    },
  };
};

export type EmailService = ReturnType<typeof createEmailService>;
import type { PageServerLoad, Actions, RequestEvent } from './$types.js';
import { fail } from '@sveltejs/kit';
import { superValidate, setMessage } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { emailSchema } from '@repo/shared-types';
import { apiFetch } from '$lib/server/api';

// Cast adapter to any to work around superforms ZodObjectType narrowness
const emailAdapter = zod4(emailSchema as any) as any;

export const load: PageServerLoad = async () => {
  const form = await superValidate(emailAdapter);
  return { form, submitted: false };
};

export const actions: Actions = {
  default: async (event: RequestEvent) => {
    const { request, url } = event;
    const form = await superValidate(request, emailAdapter);

    if (!form.valid) {
      return fail(400, { form });
    }

    const host = url.hostname
      ? `${url.hostname}${url.port ? ':' + url.port : ''}`
      : undefined;

    const res = await apiFetch('/api/v1/customer/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form.data),
    }, host, event.locals.csrfToken);

    if (!res.ok) {
      let message = 'Failed to send reset email. Please try again.';
      try {
        const body = await res.json();
        if (body.message) message = body.message;
      } catch {
        // response was not JSON
      }
      setMessage(form, message);
      return fail(400, { form });
    }

    setMessage(form, 'If an account exists with that email, you will receive a reset link shortly.');
    return { form, submitted: true };
  },
};
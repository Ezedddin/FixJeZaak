import { env } from './env.js';

interface BookingEmail {
  professionalId: string;
  professionalName: string;
  option: string;
  name: string;
  email: string;
  phone?: string;
  question: string;
}

const OPTION_LABELS: Record<string, string> = {
  '15min': 'Gesprek van 15 minuten',
  '30min': 'Gesprek van 30 minuten',
  volledige_review: 'Volledige zaakreview',
};

/**
 * Tells the booked jurist about a new request by e-mail. Best-effort: the
 * booking is already stored, so a missing configuration or a failed send is
 * logged and never fails the user's request.
 */
export async function notifyJuristOfBooking(booking: BookingEmail): Promise<'sent' | 'skipped' | 'failed'> {
  const to = env.juristEmails[booking.professionalId];
  if (!env.resendApiKey || !env.emailFrom || !to) return 'skipped';

  const text = [
    `Hallo ${booking.professionalName},`,
    '',
    'Er is een nieuwe aanvraag binnengekomen via FixJeZaak.',
    '',
    `Soort: ${OPTION_LABELS[booking.option] ?? booking.option}`,
    `Naam: ${booking.name}`,
    `E-mail: ${booking.email}`,
    `Telefoon: ${booking.phone || '—'}`,
    '',
    'Vraag:',
    booking.question,
    '',
    'Je kunt direct op deze e-mail antwoorden om contact op te nemen.',
  ].join('\n');

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.resendApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: env.emailFrom,
        to: [to],
        reply_to: booking.email,
        subject: `Nieuwe aanvraag van ${booking.name}`,
        text,
      }),
    });
    if (!response.ok) throw new Error(`resend_${response.status}`);
    return 'sent';
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[notify] booking e-mail failed:', error);
    return 'failed';
  }
}

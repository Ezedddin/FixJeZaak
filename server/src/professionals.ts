/** The FixJeZaak juristen users can request a conversation with. Kept on the
 * server so bookings are validated against the same list the app shows. */
export const PROFESSIONALS = [
  { id: 'jurist_hasan', name: 'Hasan', initials: 'H', role: 'Jurist' },
  { id: 'jurist_ezeddin', name: 'Ezeddin', initials: 'E', role: 'Jurist' },
] as const;

export const PROFESSIONAL_IDS = PROFESSIONALS.map((p) => p.id);

export const BOOKING_OPTIONS = ['15min', '30min', 'volledige_review'] as const;

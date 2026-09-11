/** Virtual care companion for scheduled patient check-ins */
export const DOCTOR_REMINDER = {
  name: 'Dr. Rivera',
  title: 'Heat safety doctor',
  avatarSeed: 'dr-rivera-initify',
  avatarRing: '#0EA5E9',
} as const;

const REMINDER_BODIES = [
  'Kamusta ka? Pa-check in — kumusta ang hydration at pakiramdam mo sa init?',
  'Regular check-in: okay lang ba ang pakiramdam mo ngayon?',
  'Reminder: mag-report ng hydration at kung may sintomas ka sa init.',
  'Kumusta ang araw mo? I-update mo kami kung hydrated ka at kung komportable ka.',
] as const;

export function doctorAvatarImageUrl(size = 128): string {
  const bg = DOCTOR_REMINDER.avatarRing.replace('#', '');
  return `https://api.dicebear.com/9.x/avataaars/png?seed=${encodeURIComponent(
    DOCTOR_REMINDER.avatarSeed,
  )}&size=${size}&backgroundColor=${bg}`;
}

export function getDoctorReminderCopy(firstName?: string): { title: string; body: string } {
  const hour = new Date().getHours();
  const body = REMINDER_BODIES[hour % REMINDER_BODIES.length];
  const greeting = firstName?.trim() ? `Hi ${firstName.split(' ')[0]}, ` : '';
  return {
    title: `${DOCTOR_REMINDER.name} · Kamusta ka?`,
    body: `${greeting}${body}`,
  };
}

export function formatNextDoctorReminder(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleString('en-PH', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

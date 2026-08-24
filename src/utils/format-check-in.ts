/** Format check-in fields for history list rows. */
export function formatCheckInLine(values: {
  hydrationStatus: string;
  activityLevel: string;
  generalStatus: string;
}) {
  return [
    { icon: 'water-outline' as const, text: values.hydrationStatus },
    { icon: 'walk-outline' as const, text: `${values.activityLevel} activity` },
    { icon: 'happy-outline' as const, text: values.generalStatus },
  ];
}

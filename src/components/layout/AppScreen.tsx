import { Screen } from '@/src/components/layout/Screen';

/** @deprecated Use Screen from layout/Screen */
export function AppScreen(
  props: React.ComponentProps<typeof Screen> & { headerTint?: string; headerAction?: React.ReactNode }
) {
  const { headerAction, ...rest } = props;
  return <Screen headerRight={headerAction} {...rest} />;
}

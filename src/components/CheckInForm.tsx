import { useMemo } from 'react';

import { View, Text, StyleSheet, TextInput } from 'react-native';

import {

  FormField,

  ChoiceList,

  SegmentedChoice,

} from '@/src/components/FormField';

import {

  ACTIVITY_LEVELS,

  HYDRATION_STATUSES,

  GENERAL_STATUSES,

  type ActivityLevel,

  type HydrationStatus,

  type GeneralStatus,

} from '@/src/models/user';

import { radius, spacing, typography } from '@/src/theme';

import { useAppTheme } from '@/src/theme/useAppTheme';

import type { AppPalette } from '@/src/theme/palettes';



const HYDRATION_ICONS = ['water', 'water-outline', 'alert-circle-outline'] as const;

const GENERAL_ICONS = ['happy-outline', 'remove-circle-outline', 'sad-outline'] as const;



export interface CheckInFormValues {

  hydrationStatus: HydrationStatus | '';

  activityLevel: ActivityLevel | '';

  generalStatus: GeneralStatus | '';

  notes: string;

}



interface CheckInFormProps {

  values: CheckInFormValues;

  onChange: (values: CheckInFormValues) => void;

  errors?: Partial<Record<keyof CheckInFormValues, string>>;

  showNotes?: boolean;

}



export function CheckInForm({ values, onChange, errors = {}, showNotes = true }: CheckInFormProps) {

  const { palette } = useAppTheme();

  const styles = useMemo(() => createStyles(palette), [palette]);



  return (

    <View style={styles.stack}>

      <FormField label="Hydration" required error={errors.hydrationStatus}>

        <ChoiceList

          options={[...HYDRATION_STATUSES]}

          selected={values.hydrationStatus}

          onSelect={(v) => onChange({ ...values, hydrationStatus: v as HydrationStatus })}

          icons={[...HYDRATION_ICONS]}

        />

      </FormField>



      <FormField label="Activity level" required error={errors.activityLevel}>

        <SegmentedChoice

          options={[...ACTIVITY_LEVELS]}

          selected={values.activityLevel}

          onSelect={(v) => onChange({ ...values, activityLevel: v as ActivityLevel })}

        />

      </FormField>



      <FormField label="How are you feeling?" required error={errors.generalStatus}>

        <ChoiceList

          options={[...GENERAL_STATUSES]}

          selected={values.generalStatus}

          onSelect={(v) => onChange({ ...values, generalStatus: v as GeneralStatus })}

          icons={[...GENERAL_ICONS]}

        />

      </FormField>



      {showNotes ? (

        <FormField label="Notes" hint="Optional — symptoms or how you feel">

          <TextInput

            style={styles.notes}

            value={values.notes}

            onChangeText={(notes) => onChange({ ...values, notes })}

            placeholder="e.g. mild headache in the heat"

            placeholderTextColor={palette.textLight}

            multiline

            numberOfLines={3}

          />

        </FormField>

      ) : null}

    </View>

  );

}



function createStyles(p: AppPalette) {

  return StyleSheet.create({

    stack: { gap: spacing.lg },

    notes: {

      borderWidth: 1,

      borderColor: p.border,

      borderRadius: radius.md,

      padding: spacing.md,

      minHeight: 88,

      textAlignVertical: 'top',

      fontSize: typography.body.fontSize,

      color: p.text,

      backgroundColor: p.surfaceInset,

    },

  });

}



export function checkInFormFromProfile(profile: {

  riskFactors: {

    hydrationStatus: string | null;

    activityLevel: string | null;

    generalStatus: string | null;

  };

}): CheckInFormValues {

  return {

    hydrationStatus: (profile.riskFactors.hydrationStatus as HydrationStatus) ?? '',

    activityLevel: (profile.riskFactors.activityLevel as ActivityLevel) ?? '',

    generalStatus: (profile.riskFactors.generalStatus as GeneralStatus) ?? 'Feeling Well',

    notes: '',

  };

}



export function validateCheckInForm(values: CheckInFormValues): Partial<Record<keyof CheckInFormValues, string>> {

  const errors: Partial<Record<keyof CheckInFormValues, string>> = {};

  if (!values.hydrationStatus) errors.hydrationStatus = 'Select your hydration status.';

  if (!values.activityLevel) errors.activityLevel = 'Select your activity level.';

  if (!values.generalStatus) errors.generalStatus = 'Select how you are feeling.';

  return errors;

}



export function formatCheckInLine(values: Pick<CheckInFormValues, 'hydrationStatus' | 'activityLevel' | 'generalStatus'>) {

  return [

    { icon: 'water-outline' as const, text: values.hydrationStatus },

    { icon: 'walk-outline' as const, text: `${values.activityLevel} activity` },

    { icon: 'happy-outline' as const, text: values.generalStatus },

  ];

}



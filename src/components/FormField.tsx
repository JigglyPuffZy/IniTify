import { useMemo } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { layout, radius, spacing, typography, platformShadow, fonts } from '@/src/theme';
import { useAppTheme } from '@/src/theme/useAppTheme';
import type { AppPalette } from '@/src/theme/palettes';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export function FormField({
  label,
  hint,
  error,
  required,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createFormStyles(palette), [palette]);

  return (
    <View style={styles.field}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>
          {label}
          {required ? <Text style={styles.required}> *</Text> : null}
        </Text>
      </View>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      {children}
      {error ? (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle" size={14} color={palette.danger} />
          <Text style={styles.error}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
}

export function TextField({
  value,
  onChangeText,
  placeholder,
  error,
  icon,
  ...rest
}: React.ComponentProps<typeof TextInput> & { error?: boolean; icon?: IconName }) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createFormStyles(palette), [palette]);

  return (
    <View style={[styles.inputWrap, error && styles.inputWrapError]}>
      {icon ? (
        <Ionicons
          name={icon}
          size={18}
          color={error ? palette.danger : palette.textMuted}
          style={styles.inputIcon}
        />
      ) : null}
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={palette.textLight}
        {...rest}
      />
    </View>
  );
}

export function SegmentedChoice({
  options,
  selected,
  onSelect,
}: {
  options: string[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  const { palette, isDark } = useAppTheme();
  const styles = useMemo(() => createFormStyles(palette, isDark), [palette, isDark]);

  return (
    <View style={styles.segmented}>
      {options.map((option) => {
        const active = selected === option;
        return (
          <Pressable
            key={option}
            onPress={() => onSelect(option)}
            style={({ pressed }) => [
              styles.segment,
              active && styles.segmentActive,
              pressed && styles.segmentPressed,
            ]}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.segmentText, active && styles.segmentTextActive]} numberOfLines={1}>
              {option}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ChoiceList({
  options,
  selected,
  onSelect,
  icons,
}: {
  options: string[];
  selected: string;
  onSelect: (value: string) => void;
  icons?: IconName[];
}) {
  const { palette, isDark } = useAppTheme();
  const styles = useMemo(() => createFormStyles(palette, isDark), [palette, isDark]);

  return (
    <View style={styles.choiceList}>
      {options.map((option, index) => {
        const active = selected === option;
        const icon = icons?.[index];
        return (
          <Pressable
            key={option}
            onPress={() => onSelect(option)}
            style={({ pressed }) => [
              styles.choiceRow,
              active && styles.choiceRowActive,
              pressed && styles.choiceRowPressed,
            ]}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
          >
            {icon ? (
              <View style={[styles.choiceRowIcon, active && styles.choiceRowIconActive]}>
                <Ionicons name={icon} size={18} color={active ? palette.primary : palette.textMuted} />
              </View>
            ) : null}
            <Text style={[styles.choiceRowText, active && styles.choiceRowTextActive]}>{option}</Text>
            <View style={[styles.radio, active && styles.radioActive]}>
              {active ? <View style={styles.radioDot} /> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

/** @deprecated Prefer SegmentedChoice or ChoiceList */
export function ChoiceGroup({
  options,
  selected,
  onSelect,
}: {
  options: string[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  if (options.length <= 3 && options.every((o) => o.length <= 10)) {
    return <SegmentedChoice options={options} selected={selected} onSelect={onSelect} />;
  }
  return <ChoiceList options={options} selected={selected} onSelect={onSelect} />;
}

export function FormSection({
  title,
  description,
  icon,
  step,
  children,
}: {
  title: string;
  description?: string;
  icon?: IconName;
  step?: number;
  children: React.ReactNode;
}) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createFormStyles(palette), [palette]);

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        {step != null ? (
          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>{step}</Text>
          </View>
        ) : icon ? (
          <View style={styles.sectionIcon}>
            <Ionicons name={icon} size={18} color={palette.primary} />
          </View>
        ) : null}
        <View style={styles.sectionText}>
          <Text style={styles.sectionTitle}>{title}</Text>
          {description ? <Text style={styles.sectionDesc}>{description}</Text> : null}
        </View>
      </View>
      {children}
    </View>
  );
}

export function FormRow({ children }: { children: React.ReactNode }) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createFormStyles(palette), [palette]);

  return <View style={styles.formRow}>{children}</View>;
}

export function FormProgress({
  current,
  total,
  labels,
}: {
  current: number;
  total: number;
  labels: string[];
}) {
  const { palette, isDark } = useAppTheme();
  const styles = useMemo(() => createProgressStyles(palette, isDark), [palette, isDark]);

  return (
    <View style={styles.card}>
      <View style={styles.progressTrack}>
        {Array.from({ length: total }, (_, i) => {
          const step = i + 1;
          const filled = step <= current;
          return (
            <View
              key={labels[i] ?? i}
              style={[styles.progressSegment, filled && styles.progressSegmentFilled]}
            />
          );
        })}
      </View>
      <View style={styles.progressLabels}>
        {labels.map((label, i) => {
          const step = i + 1;
          const done = step < current;
          const active = step === current;
          return (
            <View key={label} style={styles.labelCol}>
              <View
                style={[
                  styles.stepDot,
                  done && styles.stepDotDone,
                  active && styles.stepDotActive,
                ]}
              >
                <Text
                  style={[
                    styles.stepDotText,
                    done && styles.stepDotTextDone,
                    active && styles.stepDotTextActive,
                  ]}
                >
                  {step}
                </Text>
              </View>
              <Text
                style={[
                  styles.progressLabel,
                  done && styles.progressLabelDone,
                  active && styles.progressLabelActive,
                ]}
                numberOfLines={1}
              >
                {label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function createFormStyles(p: AppPalette, isDark = false) {
  return StyleSheet.create({
    field: { marginBottom: spacing.lg },
    labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    label: { ...typography.label, color: p.text, marginBottom: spacing.sm },
    required: { color: p.danger },
    hint: { ...typography.caption, color: p.textMuted, marginBottom: spacing.sm, marginTop: -4 },
    inputWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? p.surfaceInset : p.surface,
      borderWidth: 1.5,
      borderColor: p.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      minHeight: 50,
    },
    inputWrapError: {
      borderColor: p.danger,
      backgroundColor: p.dangerSoft,
    },
    inputIcon: { marginRight: spacing.sm },
    input: {
      flex: 1,
      paddingVertical: spacing.md,
      fontSize: 15,
      fontFamily: fonts.body,
      color: p.text,
    },
    errorRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.xs },
    error: { ...typography.caption, color: p.danger, flex: 1 },
    segmented: {
      flexDirection: 'row',
      backgroundColor: p.surfaceInset,
      borderRadius: radius.md,
      padding: 4,
      gap: 4,
    },
    segment: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.sm,
      minHeight: 44,
    },
    segmentPressed: { opacity: 0.85 },
    segmentActive: {
      backgroundColor: p.surface,
      ...platformShadow({
        color: '#000000',
        offsetY: 1,
        opacity: isDark ? 0.25 : 0.08,
        radius: 4,
        elevation: 2,
      }),
    },
    segmentText: {
      ...typography.caption,
      fontWeight: '600',
      color: isDark ? p.textSecondary : p.textMuted,
      textAlign: 'center',
    },
    segmentTextActive: { color: p.primary, fontWeight: '700' },
    choiceList: { gap: spacing.sm },
    choiceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: p.surfaceInset,
      borderWidth: 1.5,
      borderColor: p.border,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      minHeight: 52,
    },
    choiceRowPressed: { opacity: 0.9 },
    choiceRowActive: {
      borderColor: p.primary,
      backgroundColor: p.primarySoft,
    },
    choiceRowIcon: {
      width: 36,
      height: 36,
      borderRadius: radius.sm,
      backgroundColor: p.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    choiceRowIconActive: { backgroundColor: isDark ? p.surfaceMuted : '#FFFFFF' },
    choiceRowText: { ...typography.bodySm, color: p.textSecondary, flex: 1, fontWeight: '500' },
    choiceRowTextActive: { color: p.text, fontWeight: '700' },
    radio: {
      width: 20,
      height: 20,
      borderRadius: radius.pill,
      borderWidth: 2,
      borderColor: p.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioActive: { borderColor: p.primary },
    radioDot: {
      width: 10,
      height: 10,
      borderRadius: radius.pill,
      backgroundColor: p.primary,
    },
    section: { gap: spacing.md },
    sectionHeader: {
      flexDirection: 'row',
      gap: spacing.md,
      alignItems: 'flex-start',
      marginBottom: spacing.xs,
    },
    stepBadge: {
      width: 28,
      height: 28,
      borderRadius: radius.pill,
      backgroundColor: p.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepBadgeText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },
    sectionIcon: {
      width: 36,
      height: 36,
      borderRadius: radius.sm,
      backgroundColor: p.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sectionText: { flex: 1, paddingTop: 2 },
    sectionTitle: { ...typography.h3, color: p.text, fontSize: 17 },
    sectionDesc: { ...typography.caption, color: p.textMuted, marginTop: 3, lineHeight: 17 },
    formRow: { flexDirection: 'row', gap: spacing.md },
  });
}

function createProgressStyles(p: AppPalette, isDark: boolean) {
  return StyleSheet.create({
    card: {
      backgroundColor: p.surface,
      borderRadius: radius.xl,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: p.border,
      padding: spacing.lg,
      marginBottom: spacing.lg,
      gap: spacing.md,
      ...platformShadow({
        color: '#000000',
        offsetY: 2,
        opacity: isDark ? 0.2 : 0.05,
        radius: 8,
        elevation: 2,
      }),
    },
    progressTrack: { flexDirection: 'row', gap: 8 },
    progressSegment: {
      flex: 1,
      height: 4,
      borderRadius: radius.pill,
      backgroundColor: p.surfaceInset,
    },
    progressSegmentFilled: { backgroundColor: p.primary },
    progressLabels: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    labelCol: {
      flex: 1,
      alignItems: 'center',
      gap: 6,
    },
    stepDot: {
      width: 24,
      height: 24,
      borderRadius: radius.pill,
      borderWidth: 1.5,
      borderColor: p.border,
      backgroundColor: p.surfaceInset,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepDotDone: {
      backgroundColor: p.primary,
      borderColor: p.primary,
    },
    stepDotActive: {
      backgroundColor: p.primarySoft,
      borderColor: p.primary,
    },
    stepDotText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 11,
      color: p.textMuted,
    },
    stepDotTextDone: { color: '#FFFFFF' },
    stepDotTextActive: { color: p.primary },
    progressLabel: {
      ...typography.caption,
      fontFamily: fonts.bodyMedium,
      color: p.textMuted,
      textAlign: 'center',
    },
    progressLabelDone: { color: p.textSecondary },
    progressLabelActive: {
      color: p.primary,
      fontFamily: fonts.bodySemiBold,
    },
  });
}

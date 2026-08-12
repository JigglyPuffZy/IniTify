import { View, Text, StyleSheet } from 'react-native';
import type { SetupChecklistItem, ItemStatus } from '@/src/models/setup-status';

const STATUS_LABELS: Record<ItemStatus, string> = {
  done: 'Done',
  in_progress: 'In progress',
  blocked: 'Blocked',
  needs_you: 'Needs action',
  optional: 'Optional',
};

const STATUS_COLORS: Record<ItemStatus, string> = {
  done: '#16a34a',
  in_progress: '#2563eb',
  blocked: '#dc2626',
  needs_you: '#ea580c',
  optional: '#64748b',
};

interface SetupChecklistProps {
  items: SetupChecklistItem[];
  nextItem?: SetupChecklistItem | null;
  readyForAssessment: boolean;
}

export function SetupChecklist({
  items,
  nextItem,
  readyForAssessment,
}: SetupChecklistProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>Setup Checklist</Text>
      <View
        style={[
          styles.readyBanner,
          readyForAssessment ? styles.readyYes : styles.readyNo,
        ]}
      >
        <Text style={styles.readyText}>
          {readyForAssessment
            ? 'Ready for full risk assessment'
            : 'Not ready for full assessment yet'}
        </Text>
      </View>
      {nextItem ? (
        <View style={styles.nextBox}>
          <Text style={styles.nextLabel}>Do this next:</Text>
          <Text style={styles.nextTitle}>{nextItem.title}</Text>
          <Text style={styles.nextAction}>{nextItem.action}</Text>
        </View>
      ) : null}
      {items.map((entry) => (
        <View key={entry.id} style={styles.row}>
          <View style={styles.rowTop}>
            <Text style={styles.rowTitle}>{entry.title}</Text>
            <Text
              style={[styles.badge, { color: STATUS_COLORS[entry.status] }]}
            >
              {STATUS_LABELS[entry.status]}
            </Text>
          </View>
          <Text style={styles.rowDetail}>{entry.detail}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 16 },
  heading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 10,
  },
  readyBanner: {
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  readyYes: { backgroundColor: '#dcfce7' },
  readyNo: { backgroundColor: '#fef3c7' },
  readyText: { fontSize: 13, fontWeight: '600', color: '#334155' },
  nextBox: {
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#006AB1',
  },
  nextLabel: { fontSize: 11, color: '#64748b', fontWeight: '600' },
  nextTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a', marginTop: 2 },
  nextAction: { fontSize: 12, color: '#475569', marginTop: 4, lineHeight: 18 },
  row: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  rowTitle: { flex: 1, fontSize: 13, fontWeight: '600', color: '#0f172a' },
  badge: { fontSize: 11, fontWeight: '700' },
  rowDetail: { fontSize: 12, color: '#64748b', marginTop: 6, lineHeight: 18 },
});

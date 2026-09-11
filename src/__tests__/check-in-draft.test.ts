import { checkInChatService } from '@/src/services/check-in/check-in-chat.service';
import type { CheckInChatDraft } from '@/src/models/check-in-chat';

describe('check-in draft merge', () => {
  const emptyDraft: CheckInChatDraft = { step: 'greeting' };

  it('classifies 1 cup as dehydrated even when draft had well hydrated', () => {
    const prior: CheckInChatDraft = {
      step: 'greeting',
      hydrationStatus: 'Well Hydrated',
      waterIntakeLiters: 2,
    };
    const next = checkInChatService.applyUserTextToDraft(prior, '1 cup lang');
    expect(next.hydrationStatus).toBe('Dehydrated / Concerning');
    expect(next.waterIntakeLiters).toBe(0.25);
  });

  it('updates activity when user sends activity level', () => {
    const next = checkInChatService.applyUserTextToDraft(emptyDraft, 'High');
    expect(next.activityLevel).toBe('High');
  });

  it('parses quick-reply chip text for water volume', () => {
    const next = checkInChatService.applyUserTextToDraft(emptyDraft, '1 cup (250 ml)');
    expect(next.hydrationStatus).toBe('Dehydrated / Concerning');
    expect(next.waterIntakeLiters).toBe(0.25);
  });

  it('keeps 8 cups as well hydrated', () => {
    const next = checkInChatService.applyUserTextToDraft(emptyDraft, '8 cups (2 L)');
    expect(next.hydrationStatus).toBe('Well Hydrated');
    expect(next.waterIntakeLiters).toBe(2);
  });

  it('parses "not feeling well" as Not Feeling Well (not Feeling Well)', () => {
    const next = checkInChatService.applyUserTextToDraft(emptyDraft, 'not feeling well');
    expect(next.generalStatus).toBe('Not Feeling Well');
  });

  it('parses quick-reply chip for general wellness', () => {
    const next = checkInChatService.applyUserTextToDraft(emptyDraft, 'Not Feeling Well');
    expect(next.generalStatus).toBe('Not Feeling Well');
  });

  it('parses Tagalog okay ako as Feeling Well', () => {
    const next = checkInChatService.applyUserTextToDraft(emptyDraft, 'okay ako');
    expect(next.generalStatus).toBe('Feeling Well');
  });

  it('parses Tagalog hindi okay as Not Feeling Well', () => {
    const next = checkInChatService.applyUserTextToDraft(emptyDraft, 'hindi okay');
    expect(next.generalStatus).toBe('Not Feeling Well');
  });
});

# IniTify — System Implementation Specification

**Document type:** Implementation specification (engineering)  
**App name:** IniTify (research paper name: **HeatHits**)  
**Status:** Living document — update as research values and integrations are confirmed

---

## Document hierarchy (source of truth)

| Priority | Source | Use for |
|----------|--------|---------|
| **1 — Primary** | Research document (`heathits_.docx` / thesis chapters) | Requirements, scope, emergency logic intent, evaluation criteria |
| **2 — Summary** | [`docs/RESEARCH_SUMMARY.md`](./RESEARCH_SUMMARY.md) | Quick reference of what the research confirms vs. omits |
| **3 — This file** | `docs/INITYIFY_SYSTEM_SPEC.md` | How to implement in code without inventing unspecified behavior |
| **4 — Code** | `src/` | What is already built (may include **demo placeholders** not approved by research) |

**Rule:** If this specification conflicts with the research document, **the research document wins**.  
If an implementation detail is missing from both, **stop and ask** — do not guess.

---

# IniTify Heat-Risk Alert and Emergency Escalation

## 1. Heat-Risk Monitoring

IniTify receives heat-index/environmental information and combines it with the documented individual risk factors.

**Documented inputs (research):**

- Heat index (DOST-PAGASA / environmental data)
- Age
- Health condition
- Activity level
- Hydration status
- GPS / location

The **Decision Tree** classifies the user's heat risk into:

| Level | Enum value (app) |
|-------|------------------|
| Low | `LOW` |
| Moderate | `MODERATE` |
| High | `HIGH` |
| Extreme | `EXTREME` |

**Implementation references:**

| Component | Path |
|-----------|------|
| Decision tree rules | `src/config/decision-tree.rules.ts` |
| Risk assessment service | `src/services/risk-assessment/risk-assessment.service.ts` |
| Environmental / heat data | `src/services/environmental/environmental.service.ts` |
| User risk factors (setup) | `app/setup.tsx`, `src/models/user.ts` |
| Assessment result UI | `app/assessment.tsx`, `src/context/IniTifyContext.tsx` |

**Database (when synced):** `heat_index_readings`, `risk_assessments`, `user_risk_profiles`

**Not specified in research (do not invent):**

- Exact heat-index band cutoffs inside the trained tree (must come from research dataset / model)
- Which risk levels trigger a **heat-risk alert** vs. in-app display only

---

## 2. Heat-Risk Alert

When the user's heat-risk reaches a level that requires an alert, IniTify should notify the user.

The alert must clearly communicate:

- Current heat-risk level
- Recommended precautionary action
- That the user needs to acknowledge/respond to the alert

The alert should require an **explicit user action**.

**Example UI (wording and visuals may be refined later):**

```
Your current heat risk is HIGH.

Please take precautions and confirm that you are okay.

[ I'M OKAY ]
```

**Implementation notes:**

- Local notifications: `src/services/notifications/notification.service.ts`
- Manual test alert screen: `app/alerts.tsx` (test flow — not the full acknowledgment pipeline)
- Alert log table: `heat_alert_logs` (`docs/database/initify_supabase_schema.sql`)

**Gap (not yet fully implemented per this spec):**

- Automatic alert when assessment reaches a configured threshold
- Dedicated acknowledgment UI tied to a specific alert instance (see §3)
- Clear separation between “notification opened” and “user acknowledged”

**Not specified in research (do not invent):**

- Which risk levels (`LOW` / `MODERATE` / `HIGH` / `EXTREME`) require a push alert
- Alert copy, sound, repeat interval, or channel (local vs. push)

---

## 3. User Acknowledgment

When the alert appears, the user should explicitly acknowledge it.

The acknowledgment should be recorded by the system with:

| Field | Description |
|-------|-------------|
| Alert identifier | Unique ID for the alert instance |
| Risk level | Level shown at alert time |
| Time the alert was generated | ISO timestamp |
| Time the user acknowledged it | ISO timestamp |
| User response status | e.g. acknowledged OK / need help / no response |

**Rules:**

- Do **not** treat simply opening the notification as acknowledgment.
- The user must perform the documented acknowledgment action (e.g. tap **I'M OKAY**).

**Current codebase (partial):**

| Exists | Location | Notes |
|--------|----------|-------|
| “I'm OK” / “Need help” check-in UI | `src/components/EmergencyTabContent.tsx` | Emergency tab safety check-in — **not** wired to heat-risk alert IDs |
| Safety prompt response sync | `supabaseSyncService.syncSafetyPrompt()` | Logs `responded_ok` + `responded_at` only |
| DB table | `safety_prompt_responses` | Missing `alert_id`, `risk_level`, `alert_generated_at` |

**Required schema/extension (to implement):**

- Extend logging (app + DB) so each acknowledgment references a **specific alert instance**, not only a boolean prompt response.

**Not specified in research (do not invent):**

- Exact response status enum beyond OK / need help / timeout
- Whether “Need help” immediately escalates or only increments failure count

---

## 4. Failure to Respond

If the user does not respond to the safety prompt within the configured response period, the system should record a **failure to respond**.

**Research confirms:**

> “Repeated failure to respond to safety prompts” is **one possible indicator** of a heat-related emergency.

**Research does NOT specify:**

- Response timeout duration
- Number of failed responses required
- Escalation period / delay between prompts

Therefore **do not treat any numeric value as official** until researchers provide them.

### Configurable parameters (structure only)

| Parameter | Purpose | Official value |
|-----------|---------|----------------|
| `alertResponseTimeout` | Max time to wait for acknowledgment after alert | **NOT YET SPECIFIED** |
| `requiredFailedResponses` | Failed prompts before “repeated failure” indicator | **NOT YET SPECIFIED** |
| `emergencyEscalationDelay` | Delay before re-prompt or escalation step | **NOT YET SPECIFIED** |
| `safetyPromptIntervalMinutes` | Interval between safety prompts (if used) | **NOT YET SPECIFIED** |
| `inactivityDurationMinutes` | Prolonged inactivity threshold | **NOT YET SPECIFIED** |

**Config file:** `src/config/emergency.config.ts`  
**DB seed (demo only):** `system_config` keys in `initify_supabase_schema.sql`

> **Warning:** The repo may contain **placeholder demo numbers** (e.g. `3`, `15`, `5` minutes). These exist for development/testing only. They are **not** research-approved values. For production/thesis defense, set unspecified parameters to `null` until the research group signs off.

**Current codebase:**

| Exists | Location |
|--------|----------|
| Failed prompt counter (in-memory) | `emergencyService.recordFailedSafetyPrompt()` in `src/services/emergency/emergency.service.ts` |
| No automatic timeout → failure | **Not implemented** — user must tap “Need help” or manual check-in |

---

## 5. Emergency Escalation

The Emergency Assistance System must **not** activate based only on one missed alert.

The research document describes a **multi-condition** approach.

**Documented possible indicators:**

| Indicator | App field | Current logic |
|-----------|-----------|---------------|
| Extreme heat-risk level | `indicators.extremeHeatRisk` | `true` when `risk_level === 'EXTREME'` |
| Repeated failure to respond to safety prompts | `indicators.repeatedFailedSafetyPrompts` | `true` when failed count ≥ configured threshold (if set) |
| Prolonged inactivity at same location | `indicators.prolongedInactivity` | `true` when inactive ≥ configured minutes (if set) |

**Escalation rule (implemented in code today):**

- Emergency is **active** when **≥ 2** indicators are true simultaneously.  
- See `emergencyService.evaluateEmergency()` in `src/services/emergency/emergency.service.ts`.

**Do not add** emergency conditions that are not in the research document.

**Monitor / UI:**

- `src/components/EmergencyActiveMonitor.tsx` — shows alert when emergency becomes active
- `src/services/emergency/emergency-alert.service.ts` — popup + optional local notification

**Database:** `emergency_events`, `emergency_active_alerts`

---

## 6. Emergency Contact Notification

When the configured emergency conditions are satisfied, IniTify should notify the user's designated emergency contact.

**Documented payload includes:**

| Field | App support |
|-------|-------------|
| User name | Yes — `EmergencyContactNotification.userName` |
| Current heat-risk level | Yes — `heatRiskLevel` |
| Last known location | Yes — `lastKnownLocation` |
| Nearest hospital / facility | Yes — `nearestHospital` (via `hospitalService`) |
| Estimated travel time | Yes — `estimatedTravelTime` |

**Implementation:**

- Contact storage: Setup → `emergency_contacts` table / AsyncStorage
- Payload builder: `emergencyContactService.prepareNotification()` in `src/services/emergency/emergency.service.ts`
- SMS log table: `emergency_contact_notifications`
- **Production SMS/call:** Not configured — `EMERGENCY_DEV_MODE = true` in `src/config/emergency.config.ts`

**Do not invent:** SMS gateway, message template, or delivery guarantees not in research.

---

## 7. Emergency Assistance Screen

When emergency assistance is activated, the application should display:

| Requirement | Status |
|-------------|--------|
| Current emergency status | Partial — banner on Emergency tab when `emergencyState.isActive` |
| User's current/last known location | Partial — via context `location` |
| Emergency contact information | Yes — if saved in setup |
| Nearest hospital | Link to `app/hospital.tsx` |
| Hospital navigation | Yes — `hospitalService.openNavigation()` |
| Basic first-aid guidance | Yes — `src/constants/first-aid.ts`, Emergency tab steps |

**Primary UI:** `app/(tabs)/emergency.tsx` → `src/components/EmergencyTabContent.tsx`

**Related:** Health safety knowledge base (preventive tips) — `docs/database/initify_supabase_health_safety_kb.sql` (complements first-aid; not a substitute).

---

## 8. Safety and False-Alarm Prevention

The system must use **multiple conditions** before automatically escalating to an emergency contact.

- A **single** missed response must **not** automatically be treated as a confirmed medical emergency.
- IniTify is a **decision-support and early-warning** system.
- It is **not** a medical diagnostic or treatment device.

**UI disclaimer:** `DISCLAIMER` in `src/constants/risk-levels.ts`, setup/emergency copy.

---

## 9. Implementation Rules

Before implementing or changing this feature:

1. Inspect the existing IniTify codebase.
2. Inspect the existing risk-assessment implementation.
3. Inspect the notification system.
4. Inspect the user/emergency-contact data structure.
5. Identify which parts already exist.
6. Do **not** duplicate existing functionality.

If an implementation detail is **not** specified in this document **or** the research document:

**STOP and ask for clarification.**

**Never invent:**

- Emergency thresholds
- Timer values
- AI rules
- Medical rules
- Notification behavior
- API behavior

### Codebase baseline (as of this spec)

| Area | Already present | Gaps vs. this spec |
|------|-----------------|-------------------|
| Heat-risk classification | Decision tree + assessment flow | Alert threshold per level not defined |
| Heat-risk alert | Test notification on Alerts screen | Auto alert + acknowledgment record |
| User acknowledgment | Emergency tab check-in buttons | No alert ID linkage; no timeout |
| Response tracking | `safety_prompt_responses` sync | No `alert_id`, no timeout failures |
| Configurable timeout | Config **structure** only | `alertResponseTimeout` not in code |
| Repeated failure tracking | In-memory counter | No persisted alert-level history |
| Emergency evaluation | Multi-indicator, ≥2 to activate | Thresholds are demo placeholders |
| Contact notification | Payload + dev-mode log | No production SMS |
| Emergency screen | Tab + first-aid + hospitals | Full “assistance mode” layout TBD |
| Hospital/navigation | Static Tuguegarao list + maps link | Live API provider optional |

---

## 10. Development Sequence

Implement in this order:

| Step | Feature | Depends on |
|------|---------|------------|
| 1 | Heat-risk alert | Risk level that triggers alert (**research**), notifications permission |
| 2 | User acknowledgment | Alert instance model |
| 3 | Response tracking | DB fields + sync |
| 4 | Configurable response timeout | Official `alertResponseTimeout` value |
| 5 | Repeated failure tracking | Official `requiredFailedResponses` value |
| 6 | Emergency-condition evaluation | Official inactivity + failure thresholds |
| 7 | Emergency contact notification | SMS/call provider + `EMERGENCY_DEV_MODE = false` |
| 8 | Emergency assistance screen | UX pass on Emergency tab |
| 9 | Hospital/navigation integration | Maps provider in `.env` |
| 10 | Testing | Device tests, thesis evaluation dataset |

Do **not** implement all steps blindly if a required external service or specification is missing.

### Post-implementation report template

After each milestone, document:

- What was implemented
- What was already present
- What files were changed
- What values are still **unspecified**
- What was tested
- What remains to be configured

---

## Appendix A — Database tables (Supabase)

| Table | Role in this spec |
|-------|-------------------|
| `risk_assessments` | Heat-risk level history |
| `heat_alert_logs` | Heat-risk alert delivery log |
| `safety_prompt_responses` | User OK / need-help responses |
| `emergency_events` | Emergency ACTIVE episodes |
| `emergency_active_alerts` | Step-2 popup/notification log |
| `emergency_contact_notifications` | Prepared/sent SMS payload |
| `emergency_contacts` | Designated contact |
| `hospital_lookups` | Nearest hospital queries |
| `system_config` | Threshold keys (values must be research-approved) |

SQL: `docs/database/initify_supabase_schema.sql`

---

## Appendix B — Related documentation

| File | Topic |
|------|-------|
| [`docs/RESEARCH_SUMMARY.md`](./RESEARCH_SUMMARY.md) | Research confirms / omits |
| [`docs/MISSING_ITEMS.md`](./MISSING_ITEMS.md) | Project checklist |
| [`docs/PAGASA_AND_DECISION_TREE.md`](./PAGASA_AND_DECISION_TREE.md) | PAGASA + tree setup |
| [`docs/database/FEATURE_MAP.md`](./database/FEATURE_MAP.md) | Screen → table mapping |
| [`docs/database/initify_supabase_health_safety_kb.sql`](./database/initify_supabase_health_safety_kb.sql) | Personalized safety tips KB |

---

## Appendix C — Open questions for research group

1. Which risk levels trigger a **mandatory** heat-risk alert?
2. Official values for `alertResponseTimeout`, `requiredFailedResponses`, `emergencyEscalationDelay`, `inactivityDurationMinutes`
3. Does “Need help” on a safety prompt immediately notify the emergency contact, or only contribute to multi-condition escalation?
4. Approved first-aid text (heat stroke) for production
5. Approved SMS wording for emergency contact notification

**Do not close these in code without written answers from the research team.**

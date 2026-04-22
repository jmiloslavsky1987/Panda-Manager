# GlobalBank AIOps — Weekly Update
**Week of April 21, 2026**
Prepared by: Alex Chen, BigPanda PS Lead

---

## Executive Summary

Big week for GlobalBank. CISO approval came through for Biggy AI — finally unblocked after six weeks. SNOW UAT is complete with all ten scenarios passing. Correlation tuning finished for the Payments trading window, FP rate now at 11%. Daniel Rivera's successor is confirmed as Lisa Huang. Several open actions can now be closed.

---

## Key Updates

### 1. CISO Approved Biggy AI — Risk Resolved

Received written approval from Priya Nair (CISO) on April 21 for the Biggy AI incident intelligence pilot. All eight open data residency questions from the v1 review were addressed satisfactorily in the v2 questionnaire. The EU data residency concern is resolved — BigPanda will use regional EU model serving for GlobalBank's European alert data.

**Impact:**
- The risk "CISO security review for Biggy AI may extend timeline by 4-6 weeks" is now **resolved**. No further timeline impact expected.
- The milestone "Biggy AI Pilot — Payments and NOC Teams" is now **unblocked**. New target: June 1, 2026.
- Action "Follow up with CISO office on Biggy AI security review" is **complete**.

---

### 2. ServiceNow UAT Complete — All 10 Scenarios Passed

Maria Santos confirmed today that all ten SNOW UAT test scenarios are passing as of April 20. Bi-directional webhook (ticket create and auto-close) validated end-to-end. Carla Vance (ITSM Admin) signed off on UAT results.

**Impact:**
- The task "SNOW UAT test scenario execution" is **done** — all 10 test cases complete.
- The milestone "ServiceNow Automation — UAT Complete" is now **completed**.
- Action "Complete UAT validation of SNOW bi-directional webhook" is **complete**.
- Production cutover window confirmed: May 1–7.

---

### 3. Payments Correlation Tuning — FP Rate at 11%

Ryan Park ran the Payments Operations trading-hours tuning session on April 30. Added three new correlation rules specific to the 09:00–11:00 EST window. FP rate dropped from 28% to 11% for the Payments domain. Overall project FP rate is now 13%, below the 15% Phase 1 target.

**Impact:**
- Action "Run correlation policy tuning session with Payments Operations team — target FP rate below 12%" is **complete**.
- Risk "Payments Operations trading-hours FP rate risks NOC team losing confidence in BigPanda" is now **mitigated**. FP rate 11% — below 15% threshold.
- Risk "Payments Operations trading-hours FP rate" should be updated: severity downgraded from medium to low given achieved target.

---

### 4. NOC Lead Transition — Successor Confirmed

GlobalBank IT Director confirmed Lisa Huang as Daniel Rivera's successor effective June 1. Lisa has been shadowing Daniel since April 15 and attended the last two weekly syncs. Joint handover session scheduled for May 10.

**Impact:**
- Risk "Key GlobalBank contact (NOC Lead Daniel R.) scheduled to depart June 15 — transition plan not yet in place" is now **mitigated**. Successor confirmed and transition plan in place.
- Stakeholder: **Lisa Huang**, GlobalBank, NOC Operations Manager, l.huang@globalbank.com — will take over from Daniel Rivera.

---

### 5. SNOW Production Cutover — New Action

Now that UAT is complete, we need to confirm production cutover with Carla Vance. Pete Wilson to coordinate change window.

**New action:** Confirm ServiceNow production cutover change window with Carla Vance — target May 1. Owner: Maria Santos. Due: April 25, 2026.

---

### 6. Biggy AI Staging Enablement — Scheduled

With CISO approval in hand, Ryan Park will begin Biggy AI staging enablement next week.

**New action:** Enable Biggy AI in staging environment and run first enrichment test. Owner: Ryan Park. Due: May 9, 2026.

---

### 7. Correlation FP Rate — Onboarding Step Now Complete

The onboarding step "Correlation FP Rate Below 15%" for Phase 1 is now complete. Overall FP rate is at 13% and Payments window is 11%.

---

## Updated Risk Register

| Risk | Previous Status | Updated Status |
|------|----------------|----------------|
| CISO security review for Biggy AI | Open / High | **Resolved** |
| Payments Operations trading-hours FP rate | Open / Medium | **Mitigated** — FP 11% |
| Key GlobalBank NOC Lead departing | Open / Medium | **Mitigated** — Lisa Huang confirmed |

---

## Updated Milestone Status

| Milestone | Previous | Updated |
|-----------|----------|---------|
| ServiceNow Automation — UAT Complete | In Progress | **Completed** |
| Biggy AI Pilot — Payments and NOC Teams | Blocked | **In Progress** — unblocked |

---

## Open Items Carried Forward

- SNOW production cutover (May 1–7)
- Biggy AI staging enablement (by May 9)
- Lisa Huang formal onboarding session (May 10)
- Compliance masking decision for Biggy AI SNOW enrichment fields (Q-GB-001 still open)

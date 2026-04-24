/**
 * create-medtrust-update-doc.ts — Generate a DOCX for testing the Context tab
 * "updates" flow against the MedTrust Health System demo project (project_id=40).
 *
 * Run: npx tsx scripts/create-medtrust-update-doc.ts
 * Output: scripts/medtrust-update-doc.docx
 *
 * Design principle: DON'T include full tables of existing items — that causes Claude
 * to extract every row as a new entity. Only narrate the items that actually changed,
 * with explicit closure/update language. New items go in a dedicated "New Items" section.
 *
 * Updates / closures it should trigger (against existing DB records):
 *  - Action 1988 (HIPAA Splunk review) → completed
 *  - Action 1989 (Ryan Torres onboarding) → completed
 *  - Risk 774 (HIPAA blocking Splunk) → mitigated
 *  - Risk 775 (tech lead knowledge gap) → mitigated
 *  - Milestone 500 (ServiceNow + Datadog staging) → complete
 *  - Milestone 501 (HIPAA compliance sign-off) → at_risk, target date May 9
 *
 * New items it should surface:
 *  - New action: finalize Epic EHR correlation policy with clinical ops team
 *  - New decision: BigPanda will feed ServiceNow, not replace it
 *  - New engagement history: April 28 weekly sync
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
} from 'docx';
import * as fs from 'fs';
import * as path from 'path';

function heading1(text: string): Paragraph {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 200 },
  });
}

function heading2(text: string): Paragraph {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 150 },
  });
}

function body(text: string, bold = false): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, bold, size: 22 })],
    spacing: { after: 120 },
  });
}

function bullet(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, size: 22 })],
    bullet: { level: 0 },
    spacing: { after: 80 },
  });
}

function labeled(label: string, value: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ text: `${label}: `, bold: true, size: 22 }),
      new TextRun({ text: value, size: 22 }),
    ],
    spacing: { after: 100 },
  });
}

function spacer(): Paragraph {
  return new Paragraph({ text: '', spacing: { after: 80 } });
}

async function main() {
  const doc = new Document({
    sections: [{
      children: [

        // ── Cover ──────────────────────────────────────────────────────────
        new Paragraph({
          children: [new TextRun({ text: 'MedTrust Health System', bold: true, size: 52, color: '0F766E' })],
          spacing: { before: 0, after: 100 },
        }),
        new Paragraph({
          children: [new TextRun({ text: 'AIOps Foundation — Weekly Sync Notes', size: 34, color: '334155' })],
          spacing: { after: 100 },
        }),
        new Paragraph({
          children: [new TextRun({ text: 'April 28, 2026  |  Prepared by: Rachel Kim, BigPanda PS Lead', size: 22, color: '64748B' })],
          spacing: { after: 400 },
        }),

        // ── Project Snapshot ───────────────────────────────────────────────
        heading1('Project Snapshot'),
        labeled('Customer', 'MedTrust Health System'),
        labeled('Overall Status', 'YELLOW — HIPAA legal sign-off still pending'),
        labeled('Attendees', 'Rachel Kim (BP), Daniel Park (BP), Nancy Walsh (CIO), Dr. Patricia Moore (CMIO), James Okafor (IT Ops Director)'),
        spacer(),

        // ── Closures This Week ─────────────────────────────────────────────
        heading1('Items Closed This Week'),
        body('The following actions and risks were closed or resolved this week:', true),
        spacer(),

        heading2('HIPAA Compliance Review — Action Closed'),
        body('Action: "Resolve HIPAA compliance review for Splunk cloud integration — provide BigPanda data handling documentation and PHI field exclusion design to MedTrust CISO team" is now COMPLETED as of April 25, 2026. Rachel Kim delivered all required documentation and the MedTrust CISO team accepted it. This action is closed.'),
        spacer(),

        heading2('Ryan Torres Onboarding — Action Closed'),
        body('Action: "Complete onboarding of new technical lead (Ryan Torres) — schedule knowledge transfer sessions and provide project briefing package" is COMPLETED as of April 28, 2026. Ryan completed all knowledge transfer sessions with Rachel Kim and Daniel Park and is now the primary technical lead for Epic EHR integration. This action is closed.'),
        spacer(),

        heading2('HIPAA Blocking Risk — Mitigated'),
        body('Risk: "HIPAA compliance review blocking Splunk cloud integration may extend 4–6 weeks, delaying Phase 1 correlation policy baseline and pushing go-live" is now MITIGATED. The CISO team accepted BigPanda data handling documentation on April 25. Legal sign-off is the final gate, expected May 9. The technical blocker is resolved.'),
        spacer(),

        heading2('Technical Lead Knowledge Gap Risk — Mitigated'),
        body('Risk: "Technical lead change (Michael Chen → Ryan Torres) creates knowledge gap for Epic EHR integration design — 3-week schedule impact already realized" is now MITIGATED. Ryan Torres completed knowledge transfer on April 28 and is fully up to speed on the Epic EHR integration design and Phase 1 staging configuration.'),
        spacer(),

        heading2('ServiceNow + Datadog Staging Milestone — Complete'),
        body('Milestone: "ServiceNow + Datadog — Staging Integration Complete" is now COMPLETE as of April 24, 2026. Daniel Park confirmed the bi-directional alert-to-ticket workflow end-to-end validation passed. Both alert creation and auto-resolution flows tested successfully.'),
        spacer(),

        // ── Updates This Week ─────────────────────────────────────────────
        heading1('Updates This Week'),

        heading2('HIPAA Compliance Sign-Off Milestone — Still At Risk'),
        body('Milestone: "HIPAA Compliance Sign-Off — Splunk Integration" remains AT RISK. The CISO acceptance unblocked the technical path but legal sign-off is still pending. New target date for this milestone is May 9, 2026. Status remains at_risk until legal formally signs off.'),
        spacer(),

        // ── New Items ──────────────────────────────────────────────────────
        heading1('New Items This Week'),

        heading2('New Action: Epic EHR Correlation Policy — Clinical Alignment'),
        body('Owner: Rachel Kim. Due: May 10, 2026. Action: Finalize Epic EHR correlation policy with clinical operations team — confirm priority alert types and clinical impact tag taxonomy with Dr. Patricia Moore before the May 12 policy submission deadline. This is a new action identified this week.'),
        spacer(),

        heading2('New Decision: BigPanda Architecture Role Confirmed'),
        body('Decision made April 28 with Nancy Walsh and James Okafor: BigPanda will serve as the AIOps correlation and enrichment layer feeding ServiceNow. BigPanda will NOT replace ServiceNow as the primary incident management interface. NOC staff will continue to triage and resolve incidents in ServiceNow. BigPanda feeds enriched, correlated alerts into ServiceNow via the bi-directional integration.'),
        spacer(),

        // ── Notes ─────────────────────────────────────────────────────────
        heading1('Session Notes'),
        body('Weekly sync held April 28, 2026. Attendees: Rachel Kim, Daniel Park (BigPanda), Nancy Walsh, Dr. Patricia Moore, James Okafor (MedTrust). Next sync: May 5, 2026. Rachel Kim owns weekly status distribution.'),

      ],
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  const outPath = path.join(path.dirname(new URL(import.meta.url).pathname), 'medtrust-update-doc.docx');
  fs.writeFileSync(outPath, buffer);
  console.log(`✅ Created: ${outPath}`);
  console.log(`   File size: ${(buffer.length / 1024).toFixed(1)} KB`);
  console.log('');
  console.log('Expected extraction output:');
  console.log('  PROPOSED CHANGES (close/update):');
  console.log('  - Action 106 (HIPAA Splunk review) → close');
  console.log('  - Action 107 (Ryan Torres onboarding) → close');
  console.log('  - Risk 70 (HIPAA blocking Splunk) → close/mitigate');
  console.log('  - Risk 71 (tech lead knowledge gap) → close/mitigate');
  console.log('  - Milestone 67 (ServiceNow + Datadog staging) → close/complete');
  console.log('  - Milestone 68 (HIPAA sign-off) → update status + target date');
  console.log('  NEW ITEMS (small set):');
  console.log('  - New action: finalize Epic EHR correlation policy');
  console.log('  - New decision: BigPanda feeds ServiceNow, not replace it');
  console.log('  - New history: April 28 weekly sync');
}

main().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});

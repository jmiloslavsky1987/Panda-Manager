/**
 * create-apex-update-doc.ts — Generate a DOCX for testing the Context tab
 * "updates" flow against the Apex Financial demo project (project_id=15).
 *
 * Run: npx tsx scripts/create-apex-update-doc.ts
 * Output: scripts/apex-update-doc.docx
 *
 * Design principle: DON'T include full tables of existing items — that causes Claude
 * to extract every row as a new entity. Only narrate the items that actually changed,
 * with explicit closure/update language. New items go in a dedicated "New Items" section.
 *
 * Updates / closures it should trigger (against existing DB records):
 *  - A-APEX-001 (Splunk InfoSec review) → completed → close
 *  - A-APEX-006 (Alex Chen knowledge transfer) → completed → close
 *  - R-APEX-001 (Splunk trading integration delay risk) → mitigated → close
 *  - R-APEX-003 (PS engineer transition knowledge gap) → mitigated → close
 *  - M-APEX-003 (Splunk production cutover milestone) → at_risk, target date pushed to June 13 → update
 *
 * New items it should surface:
 *  - New action: Define PCI-DSS data classification policy for trading alerts
 *  - New decision: Splunk ITSI license not being renewed — accelerated decommission confirmed
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
          children: [new TextRun({ text: 'Apex Financial Services', bold: true, size: 52, color: '1E40AF' })],
          spacing: { before: 0, after: 100 },
        }),
        new Paragraph({
          children: [new TextRun({ text: 'AIOps Transformation — Weekly Sync Notes', size: 34, color: '334155' })],
          spacing: { after: 100 },
        }),
        new Paragraph({
          children: [new TextRun({ text: 'April 28, 2026  |  Prepared by: Rachel Kim, BigPanda PS Lead', size: 22, color: '64748B' })],
          spacing: { after: 400 },
        }),

        // ── Project Snapshot ───────────────────────────────────────────────
        heading1('Project Snapshot'),
        labeled('Customer', 'Apex Financial Services'),
        labeled('Overall Status', 'YELLOW — Splunk production cutover date pushed; PCI-DSS data classification policy still pending'),
        labeled('Attendees', 'Rachel Kim (BP), Daniel Park (BP), Marcus Okafor (CTO), Priya Sharma (InfoSec Director), Kevin Walsh (NOC Manager), James Liu (Splunk Admin), Sandra Torres (ServiceNow Admin)'),
        spacer(),

        // ── Closures This Week ─────────────────────────────────────────────
        heading1('Items Closed This Week'),
        body('The following actions and risks were resolved or closed this week:', true),
        spacer(),

        heading2('Splunk InfoSec Review — Action Completed'),
        body('Action: "Prepare and submit InfoSec review package for Splunk integration — document data flow, PHI/PCI field exclusions, and access controls per Apex Financial InfoSec policy" is now COMPLETED as of April 25, 2026. Rachel Kim submitted the full review package to Priya Sharma. InfoSec approved the Splunk HEC integration design. This action is closed.'),
        spacer(),

        heading2('Alex Chen Knowledge Transfer — Action Completed'),
        body('Action: "Complete Alex Chen knowledge transfer from Daniel Park — four sessions covering correlation policy baseline, Splunk HEC integration design, ServiceNow webhook configuration, and Biggy AI pilot scope" is COMPLETED as of April 28, 2026. Alex Chen attended all four knowledge transfer sessions and is now the primary technical lead for the Splunk trading system integration and Biggy AI pilot tracks. This action is closed.'),
        spacer(),

        heading2('Splunk Trading Integration Delay Risk — Mitigated'),
        body('Risk: "Splunk trading system InfoSec review may extend 3–4 weeks beyond initial estimate, delaying production cutover and Phase 1 go-live" is now MITIGATED. InfoSec review completed and approved on April 25. The remaining delay is a scheduling constraint (production change window availability), not a compliance blocker. This risk is resolved and closed.'),
        spacer(),

        heading2('PS Engineer Transition Knowledge Gap Risk — Mitigated'),
        body('Risk: "PS engineer transition (original lead replaced by Alex Chen) creates knowledge gap for Splunk HEC integration and Biggy AI pilot design — estimated 2-week schedule impact already realized" is now MITIGATED. Alex Chen completed all four knowledge transfer sessions with Daniel Park on April 28 and is fully ramped on all in-flight workstreams. This risk is closed.'),
        spacer(),

        // ── Updates This Week ─────────────────────────────────────────────
        heading1('Updates This Week'),

        heading2('Splunk Production Cutover Milestone — Still At Risk, Date Pushed'),
        body('Milestone: "Splunk Trading System — Production Cutover" remains AT RISK. InfoSec approval is in hand, but the earliest available production change window at Apex Financial is June 13, 2026 (previously May 30). The milestone target date is now June 13, 2026. Status remains at_risk pending formal change window booking confirmation from James Liu.'),
        spacer(),

        // ── New Items ──────────────────────────────────────────────────────
        heading1('New Items This Week'),

        heading2('New Action: PCI-DSS Data Classification Policy for Trading Alerts'),
        body('Owner: Alex Chen. Due: May 9, 2026. Action: Define PCI-DSS data classification policy for trading system alerts — identify which trading alert fields contain cardholder data or transaction amounts, map to PCI-DSS scope zones, and produce field-level masking configuration for BigPanda enrichment pipeline. Must align with Priya Sharma before Splunk production cutover. This is a new action identified this week.'),
        spacer(),

        heading2('New Decision: Splunk ITSI License Not Being Renewed — Accelerated Decommission'),
        body('Decision made April 28 with Marcus Okafor and Kevin Walsh: Apex Financial will NOT renew the Splunk ITSI license expiring September 2026. BigPanda will replace Splunk ITSI as the primary alert correlation and aggregation hub on an accelerated timeline. The NOC team will complete the Splunk ITSI decommission by August 2026, two months ahead of the original December 2026 target. This changes the urgency of the Biggy AI pilot — NOC must be fully operational on BigPanda before September.'),
        spacer(),

        // ── Session Notes ─────────────────────────────────────────────────
        heading1('Session Notes'),
        body('Weekly sync held April 28, 2026. Attendees: Rachel Kim, Daniel Park, Alex Chen (BigPanda), Marcus Okafor, Priya Sharma, Kevin Walsh, James Liu, Sandra Torres (Apex Financial). Next sync: May 5, 2026. Rachel Kim owns weekly status distribution. Alex Chen to follow up with James Liu on June 13 change window booking by May 2.'),

      ],
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  const outPath = path.join(path.dirname(new URL(import.meta.url).pathname), 'apex-update-doc.docx');
  fs.writeFileSync(outPath, buffer);
  console.log(`✅ Created: ${outPath}`);
  console.log(`   File size: ${(buffer.length / 1024).toFixed(1)} KB`);
  console.log('');
  console.log('Expected proposed changes:');
  console.log('  CLOSE:');
  console.log('  - A-APEX-001 (Splunk InfoSec review action) → completed');
  console.log('  - A-APEX-006 (Alex Chen knowledge transfer action) → completed');
  console.log('  - R-APEX-001 (Splunk trading delay risk) → mitigated');
  console.log('  - R-APEX-003 (PS transition knowledge gap risk) → mitigated');
  console.log('  UPDATE:');
  console.log('  - M-APEX-003 (Splunk production cutover) → at_risk, target date → 2026-06-13');
  console.log('  NEW ITEMS:');
  console.log('  - New action: PCI-DSS data classification policy for trading alerts');
  console.log('  - New decision: Splunk ITSI license not renewed — accelerated decommission');
  console.log('  - New history: April 28 weekly sync');
}

main().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});

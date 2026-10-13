/**
 * CardioCoreEdge — Demonstrative Clinical Handover & Referral Routing Data
 */

export interface HandoverRecipient {
  id: string;
  name: string;
  role: string;
  institution: string;
  initials: string;
}

export const SAMPLE_HANDOVER_RECIPIENTS: HandoverRecipient[] = [
  {
    id: "ep",
    name: "Dr Samuel Okafor",
    role: "Electrophysiology Team · 11 yrs EP",
    institution: "Meridian Heart Institute",
    initials: "SO",
  },
  {
    id: "oncall",
    name: "On-Call Cardiology Service",
    role: "24-Hour Acute Triage Team",
    institution: "Meridian Heart Institute",
    initials: "OC",
  },
  {
    id: "patient",
    name: "Patient Summary Copy",
    role: "Plain Language Clinical Summary",
    institution: "CardioCore Patient Portal",
    initials: "PT",
  },
];

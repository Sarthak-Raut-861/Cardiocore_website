/**
 * FAQ Data
 * Preserved directly from the original CardioCore application (src/10_body_public.html).
 */

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  defaultOpen?: boolean;
}

export const FAQ_ITEMS: FAQItem[] = [
  {
    id: "faq-1",
    question: "Is CardioCore a diagnostic medical device?",
    answer:
      "No. CardioCore is monitoring support. It surfaces personal physiological patterns and context, but does not diagnose conditions or replace a doctor. ECG strips are for you and your clinician to interpret together.",
    defaultOpen: true,
  },
  {
    id: "faq-2",
    question: "How does urgent alert escalation work?",
    answer:
      "CardioCore confirms signal quality, tests persistence at rest, and rules out motion artifacts. If criteria are met, a Level 3 alert provides contributing metrics and lets you call emergency or request doctor review.",
  },
  {
    id: "faq-3",
    question: "Who has access to my health measurements?",
    answer:
      "Only you by default. Clinicians receive only the specific data layers you explicitly consent to, for the duration of your booked consultation.",
  },
  {
    id: "faq-4",
    question: "Does the device work without internet?",
    answer:
      "Yes. The wearable buffers raw telemetry locally. Trends and records remain accessible offline and sync seamlessly when reconnected.",
  },
];

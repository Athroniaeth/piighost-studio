export type SampleText = { name: string; text: string };

/** A small library of raw test texts for the playground. Each one exercises
 *  several PII types. Names are fixed English literals (not translated). */
export const SAMPLE_TEXTS: SampleText[] = [
  {
    name: "Email thread",
    text: "From: sarah.connor@cyberdyne.com\nTo: j.reese@initech.io\nHi James, can you call me at +1 415 555 0132 before the Los Angeles meeting on March 3, 2024? Heads up: our key AKIA1234567890ABCDEF leaked in the last push. — Sarah",
  },
  {
    name: "Medical note",
    text: "Patient Maria Gomez, date of birth 04/12/1979, MRN-884213, was admitted to St. Mary's Hospital in Boston on 2023-11-08 and diagnosed with type 2 diabetes. Contact maria.gomez@mail.com or (617) 555-0148. SSN 123-45-6789.",
  },
  {
    name: "Bank statement",
    text: "Account holder John Miller. Transfer of 4,200 EUR from IBAN DE89 3704 0044 0532 0130 00 to Barclays on 01/15/2024. Card 4111 1111 1111 1111, routing number 021000021, SSN 078-05-1120.",
  },
  {
    name: "Support ticket",
    text: "Ticket #4471 from emma.stone@mail.com, phone (212) 555-0177: the customer at Globex says card 4111 1111 1111 1111 was charged twice on 2024-02-10. Escalated by agent Tom Hardy.",
  },
  {
    name: "Contract excerpt",
    text: "This agreement, made on March 3, 2024 in New York, is entered into between Acme Corp and Globex Inc. Notices to counsel jane.roe@lawfirm.com or (212) 555-0143. Effective date 2024-04-01.",
  },
  {
    name: "Resume",
    text: "David Lee — Seattle, WA. david.lee@gmail.com, (206) 555-0190. Experience: Software Engineer at Microsoft (2019-2023), Intern at Acme Corp in 2018. Education: University of Washington, graduated June 2019.",
  },
];

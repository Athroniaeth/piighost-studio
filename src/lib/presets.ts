import type { ConfigPipeline, DetectorConfig, PipelineDetector } from "./detector-config";

export type PresetDetector = { name: string; description: string; config: DetectorConfig; sampleText: string };
export type PresetPipeline = { name: string; description: string; pipeline: ConfigPipeline; sampleText: string };

// --- Regex pattern atoms (JS-string source; backslashes doubled). Ported from
// piighost's pattern packs (generic/us/eu) and examples/detectors/common.py. ---
const EMAIL = "[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}";
const URL = "https?://[^\\s<>\"']+[^\\s<>\"'.,;:!?\\)\\]}]";
const IP_V4 =
  "(?:(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\.){3}(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)";
const IP_V6 =
  "\\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\\b|\\b(?:[0-9a-fA-F]{1,4}:){1,7}:\\b|\\b::(?:[0-9a-fA-F]{1,4}:){0,6}[0-9a-fA-F]{1,4}\\b";
const PHONE = "\\+\\d{1,3}[\\s.\\-]?\\(?\\d{1,4}\\)?(?:[\\s.\\-]?\\d{1,4}){1,4}";
const US_PHONE = "\\b(?:\\+?1[\\s.-]?)?\\(?[2-9]\\d{2}\\)?[\\s.-]?\\d{3}[\\s.-]?\\d{4}\\b";
const CREDIT_CARD = "\\b\\d{4}[\\s\\-]\\d{4}[\\s\\-]\\d{4}[\\s\\-]\\d{4}\\b";
const IBAN = "\\b[A-Z]{2}\\d{2}(?:[\\s-]?[A-Z0-9]){11,30}\\b";
const US_SSN = "\\b\\d{3}-\\d{2}-\\d{4}\\b";
const US_BANK_ROUTING = "\\b\\d{9}\\b";
const OPENAI_API_KEY = "sk-(?:proj-)?[A-Za-z0-9\\-_]{20,}";
const AWS_ACCESS_KEY = "\\bAKIA[0-9A-Z]{16}\\b";
const GITHUB_TOKEN = "\\bgh[ps]_[A-Za-z0-9_]{36,}\\b";
const STRIPE_KEY = "\\b[sr]k_(?:live|test)_[A-Za-z0-9]{24,}\\b";
const DATE =
  "\\b(?:\\d{4}-\\d{2}-\\d{2}|\\d{1,2}/\\d{1,2}/\\d{2,4}|(?:January|February|March|April|May|June|July|August|September|October|November|December)\\s+\\d{1,2},?\\s+\\d{4})\\b";

// --- Detector building blocks ---
const regex = (patterns: Record<string, string>): DetectorConfig => ({ type: "regex", patterns });

const CONTACT_WEB = regex({ EMAIL, URL, IP_V4, IP_V6, PHONE, CREDIT_CARD });
const FINANCIAL = regex({ IBAN, CREDIT_CARD, US_SSN, US_BANK_ROUTING });
const SECRETS = regex({ OPENAI_API_KEY, AWS_ACCESS_KEY, GITHUB_TOKEN, STRIPE_KEY });
const DATES = regex({ DATE });

// Classic NER (clean for names/orgs/places). Remaps the model's PER/ORG/LOC.
const NER_PEOPLE: DetectorConfig = {
  type: "transformers",
  model: "Xenova/bert-base-NER",
  threshold: 0.5,
  labels: { PERSON: "PER", ORGANIZATION: "ORG", LOCATION: "LOC" },
};

// Optional GLiNER layer for a soft, free-form entity (lower confidence).
const MEDICAL_CONDITION: DetectorConfig = {
  type: "gliner2",
  model: "onnx-community/gliner_small-v2.1",
  threshold: 0.5,
  flatNer: true,
  labels: { CONDITION: "medical condition or diagnosis" },
};

export const PRESET_DETECTORS: PresetDetector[] = [
  {
    name: "Contact & web",
    description: "Emails, URLs, IPs, phone numbers, credit cards.",
    config: CONTACT_WEB,
    sampleText:
      "Reach me at jane.doe@example.com or +1 415 555 0132. The dashboard at https://app.example.com logged a hit from 192.168.1.42; card on file 4111 1111 1111 1111.",
  },
  {
    name: "Financial identifiers",
    description: "IBAN, credit cards, US SSN, bank routing numbers.",
    config: FINANCIAL,
    sampleText:
      "Wire the deposit to IBAN GB29 NWBK 6016 1331 9268 19 using card 4111 1111 1111 1111. SSN 078-05-1120, routing number 021000021.",
  },
  {
    name: "API keys & secrets",
    description: "OpenAI, AWS, GitHub, and Stripe keys.",
    config: SECRETS,
    sampleText:
      "Leaked from the .env file: sk-proj-abc123XYZ456789ABCDEFGH, AKIA1234567890ABCDEF, ghp_aBcD1234567890aBcD1234567890aBcD1234, and sk_live_aBcD1234567890aBcD12345678.",
  },
  {
    name: "Dates",
    description: "ISO, slashed, and “Month D, YYYY” dates.",
    config: DATES,
    sampleText:
      "The contract was signed on 2023-11-08, became effective 01/15/2024, and is up for review on March 3, 2024.",
  },
  {
    name: "People, orgs & places",
    description: "Names, organizations, and locations via classic NER.",
    config: NER_PEOPLE,
    sampleText:
      "Sarah Connor, an engineer at Cyberdyne Systems, met James Reese in Los Angeles before flying to the London office of Initech.",
  },
  {
    name: "Medical condition",
    description: "Free-form diagnoses via GLiNER (optional, lower confidence).",
    config: MEDICAL_CONDITION,
    sampleText:
      "The patient was diagnosed with type 2 diabetes and chronic hypertension, and is being screened for asthma.",
  },
];

// --- Pipeline composition helpers ---
const det = (name: string, config: DetectorConfig): PipelineDetector => ({ name, config, enabled: true });
const pipe = (name: string, detectors: PipelineDetector[]): ConfigPipeline => ({
  name,
  detectors,
  spanResolver: "confidence",
  entityLinker: "exact",
  entityResolver: "merge",
  entityResolverThreshold: 0.85,
  placeholder: { type: "label_counter" },
});

export const PRESET_PIPELINES: PresetPipeline[] = [
  {
    name: "General PII",
    description: "Names and organizations plus everyday contact and web identifiers.",
    pipeline: pipe("General PII", [
      det("People, orgs & places", NER_PEOPLE),
      det("Contact & web", CONTACT_WEB),
    ]),
    sampleText:
      "Sarah Connor, an American engineer, joined Cyberdyne Systems in Los Angeles. Reach her at sarah.connor@example.com or +1 415 555 0132, or visit https://cyberdyne.example.com.",
  },
  {
    name: "Healthcare (HIPAA)",
    description: "Patient names, dates, contact, SSN, and free-form diagnoses.",
    pipeline: pipe("Healthcare (HIPAA)", [
      det("People, orgs & places", NER_PEOPLE),
      det("Contact & IDs", regex({ EMAIL, US_PHONE, US_SSN, DATE })),
      det("Medical condition", MEDICAL_CONDITION),
    ]),
    sampleText:
      "Patient Maria Gomez, date of birth 04/12/1979, was admitted to St. Mary's Hospital in Boston on 2023-11-08 and diagnosed with type 2 diabetes. Contact maria.gomez@mail.com or (617) 555-0148, SSN 123-45-6789.",
  },
  {
    name: "Banking & finance",
    description: "Account and card identifiers plus customer names and institutions.",
    pipeline: pipe("Banking & finance", [
      det("Financial identifiers", FINANCIAL),
      det("People, orgs & places", NER_PEOPLE),
    ]),
    sampleText:
      "John Miller transferred funds from IBAN DE89 3704 0044 0532 0130 00 to his account at Barclays. Card 4111 1111 1111 1111, SSN 078-05-1120, routing number 021000021.",
  },
  {
    name: "HR & recruiting",
    description: "Candidate names, locations, employers, contact details, and dates.",
    pipeline: pipe("HR & recruiting", [
      det("People, orgs & places", NER_PEOPLE),
      det("Contact & dates", regex({ EMAIL, US_PHONE, DATE })),
    ]),
    sampleText:
      "Candidate David Lee, based in Seattle, applied to Acme Corp on 01/15/2024. Email david.lee@gmail.com, phone (206) 555-0190. Previously worked at Microsoft.",
  },
  {
    name: "Customer support / CRM",
    description: "Contact details and card numbers from tickets, plus names and companies.",
    pipeline: pipe("Customer support / CRM", [
      det("Contact & cards", regex({ EMAIL, US_PHONE, CREDIT_CARD })),
      det("People, orgs & places", NER_PEOPLE),
    ]),
    sampleText:
      "Ticket from emma.stone@mail.com, phone (212) 555-0177: the customer at Globex reports that card 4111 1111 1111 1111 was charged twice.",
  },
  {
    name: "Legal & contracts",
    description: "Parties, organizations, locations, dates, and contact details.",
    pipeline: pipe("Legal & contracts", [
      det("People, orgs & places", NER_PEOPLE),
      det("Contact & dates", regex({ EMAIL, US_PHONE, DATE })),
    ]),
    sampleText:
      "This agreement between Acme Corp and Globex Inc, signed in New York on March 3, 2024, is countersigned by counsel at jane.roe@lawfirm.com, (212) 555-0143.",
  },
];

import type { ConfigPipeline, DetectorConfig, PipelineDetector } from "./detector-config";

export type PresetDetector = { name: string; description: string; config: DetectorConfig };
export type PresetPipeline = { name: string; description: string; pipeline: ConfigPipeline };

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
  { name: "Contact & web", description: "Emails, URLs, IPs, phone numbers, credit cards.", config: CONTACT_WEB },
  { name: "Financial identifiers", description: "IBAN, credit cards, US SSN, bank routing numbers.", config: FINANCIAL },
  { name: "API keys & secrets", description: "OpenAI, AWS, GitHub, and Stripe keys.", config: SECRETS },
  { name: "Dates", description: "ISO, slashed, and “Month D, YYYY” dates.", config: DATES },
  { name: "People, orgs & places", description: "Names, organizations, and locations via classic NER.", config: NER_PEOPLE },
  { name: "Medical condition", description: "Free-form diagnoses via GLiNER (optional, lower confidence).", config: MEDICAL_CONDITION },
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
  },
  {
    name: "Healthcare (HIPAA)",
    description: "Patient names, dates, contact, SSN, and free-form diagnoses.",
    pipeline: pipe("Healthcare (HIPAA)", [
      det("People, orgs & places", NER_PEOPLE),
      det("Contact & IDs", regex({ EMAIL, US_PHONE, US_SSN, DATE })),
      det("Medical condition", MEDICAL_CONDITION),
    ]),
  },
  {
    name: "Banking & finance",
    description: "Account and card identifiers plus customer names and institutions.",
    pipeline: pipe("Banking & finance", [
      det("Financial identifiers", FINANCIAL),
      det("People, orgs & places", NER_PEOPLE),
    ]),
  },
  {
    name: "HR & recruiting",
    description: "Candidate names, locations, employers, contact details, and dates.",
    pipeline: pipe("HR & recruiting", [
      det("People, orgs & places", NER_PEOPLE),
      det("Contact & dates", regex({ EMAIL, US_PHONE, DATE })),
    ]),
  },
  {
    name: "Customer support / CRM",
    description: "Contact details and card numbers from tickets, plus names and companies.",
    pipeline: pipe("Customer support / CRM", [
      det("Contact & cards", regex({ EMAIL, US_PHONE, CREDIT_CARD })),
      det("People, orgs & places", NER_PEOPLE),
    ]),
  },
  {
    name: "Legal & contracts",
    description: "Parties, organizations, locations, dates, and contact details.",
    pipeline: pipe("Legal & contracts", [
      det("People, orgs & places", NER_PEOPLE),
      det("Contact & dates", regex({ EMAIL, US_PHONE, DATE })),
    ]),
  },
];

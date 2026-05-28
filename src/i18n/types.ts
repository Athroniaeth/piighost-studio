export type Locale = "en" | "fr";

export type PhilosophyDict = {
  eyebrow: string;
  title: string;
  intro?: string;
  sections: Array<{
    id?: string;
    heading: string;
    paragraphs: string[];
    subsections?: Array<{ heading: string; paragraphs: string[]; list?: string[] }>;
    list?: string[];
    table?: { headers: string[]; rows: string[][] };
  }>;
};

export type Dictionary = {
  nav: {
    piighost: string;
    api: string;
    chat: string;
    proofreader: string;
    philosophy: string;
    github: string;
    toggleTheme: string;
    toggleLanguage: string;
    backToTop: string;
  };
  footer: {
    tagline: string;
    projects: string;
    links: string;
    mit: string;
  };
  hero: {
    title: string;
    description: string;
    getStarted: string;
    github: string;
  };
  problem: {
    eyebrow: string;
    title: string;
    items: Array<{ title: string; body: string }>;
  };
  howItWorks: {
    eyebrow: string;
    title: string;
    tabs: { detect: string; anonymize: string; deanonymize: string };
    detectCaption: string;
    anonymizeCaption: string;
    deanonymizeCaption: string;
    labels: {
      userMessage: string;
      fromUser: string;
      llmSees: string;
      llmResponse: string;
      userSees: string;
    };
  };
  detector: {
    eyebrow: string;
    title: string;
    description: string;
    items: Array<{ title: string; body: string }>;
  };
  ecosystem: {
    eyebrow: string;
    title: string;
    description: string;
    moreToCome: string;
  };
  quickStart: {
    eyebrow: string;
    title: string;
    description: string;
  };
  cta: {
    title: string;
    description: string;
    readTheDocs: string;
    starOnGitHub: string;
  };
  philosophy: PhilosophyDict;
};

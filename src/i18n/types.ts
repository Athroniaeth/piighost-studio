export type Locale = "en" | "fr";

export type ProjectSection = {
  heading: string;
  paragraphs?: string[];
  list?: string[];
  ordered?: boolean;
  code?: string;
  afterCode?: string;
};

export type ProjectPageDict = {
  tagline: string;
  sections: ProjectSection[];
};

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
    projects: string;
    philosophy: string;
    playground: string;
    github: string;
    toggleTheme: string;
    toggleLanguage: string;
    backToTop: string;
  };
  projectHeader: {
    repository: string;
    docs: string;
    pypi: string;
  };
  projects: {
    piighost: ProjectPageDict;
    api: ProjectPageDict;
    chat: ProjectPageDict;
    proofreader: ProjectPageDict;
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
    tabs: { detect: string; anonymize: string; tools: string; deanonymize: string };
    detectCaption: string;
    anonymizeCaption: string;
    toolsCaption: string;
    deanonymizeCaption: string;
    labels: {
      userMessage: string;
      fromUser: string;
      llmSees: string;
      toolCall: string;
      toolRuns: string;
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
  playground: {
    configTitle: string;
    modelLabel: string;
    models: {
      multilingual: string;
      english: string;
      glinerSmall: string;
      glinerPii: string;
    };
    modelGroups: { classic: string; gliner: string };
    glinerLabelsLabel: string;
    glinerLabelsPlaceholder: string;
    glinerLabelsHint: string;
    labelsLabel: string;
    thresholdLabel: string;
    inputLabel: string;
    example: string;
    analyze: string;
    analyzing: string;
    loadingModel: string;
    firstLoadNote: string;
    edit: string;
    resultsTitle: string;
    noEntities: string;
    columns: { text: string; label: string; score: string };
    errorTitle: string;
    retry: string;
    emptyHint: string;
  };
};

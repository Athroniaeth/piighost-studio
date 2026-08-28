import type { Dictionary } from "./types";

export const fr: Dictionary = {
  nav: {
    piighost: "piighost",
    api: "piighost-api",
    chat: "piighost-chat",
    proofreader: "piighost-proofreader",
    projects: "Projets",
    philosophy: "Philosophie",
    home: "Accueil",
    playground: "Playground",
    docs: "Documentation",
    github: "GitHub",
    toggleTheme: "Changer le thème",
    toggleLanguage: "Passer en anglais",
    backToTop: "Remonter en haut",
    mainNavigation: "Navigation principale",
  },
  projectHeader: {
    repository: "Dépôt",
    docs: "Docs",
    pypi: "PyPI",
    app: "Démo en ligne",
  },
  projects: {
    piighost: {
      tagline: "La bibliothèque centrale. Construisez des pipelines d'anonymisation pour vos agents IA.",
      sections: [
        {
          heading: "Ce qu'elle fait",
          paragraphs: [
            "piighost est une bibliothèque Python qui empêche les données personnelles (PII) d'atteindre un modèle de langage, sans gêner ce que votre application a besoin de faire.",
            "Elle repère les données personnelles avec des détecteurs (expressions régulières, NER, ou un autre modèle) et remplace chaque valeur par un jeton stable, si bien que `john.doe@example.com` devient `<<EMAIL:1>>` et que le modèle ne travaille jamais que sur du texte dé-identifié. Quand le modèle répond avec ces jetons, piighost remet les vraies valeurs, si bien que l'utilisateur final lit `john.doe@example.com` sans rien remarquer. Un outil qui a réellement besoin de la vraie adresse la reçoit en clair, tandis que le modèle qui a décidé de l'appeler ne voit toujours que `<<EMAIL:1>>`.",
            "La correspondance entre une valeur et son jeton perdure sur toute la conversation. Si `john.doe@example.com` réapparaît trois messages plus tard, il reste `<<EMAIL:1>>`, si bien que le modèle peut toujours suivre le fil.",
          ],
        },
        {
          heading: "Réversible par conception",
          paragraphs: [
            "piighost effectue une dé-identification réversible. Comme la correspondance entre une valeur et son jeton est conservée pour pouvoir restituer les données, il s'agit de pseudonymisation au sens du RGPD, et non d'une anonymisation définitive. Les vraies valeurs restent stockées pendant toute la durée de la conversation et doivent être protégées en conséquence.",
          ],
        },
        {
          heading: "Pourquoi piighost",
          paragraphs: [
            "La plupart des outils de PII s'arrêtent à la détection. Presidio, GLiNER, spaCy et les catalogues d'expressions régulières trouvent tous les entités dans un texte, et ils le font bien. Le plus difficile pour un agent, c'est tout ce qui vient après la détection : remplacer les valeurs sans casser le raisonnement du modèle, garder une valeur associée à un même jeton sur toute une conversation, donner aux outils la vraie valeur pendant que le modèle ne voit que le jeton, et remettre les valeurs d'origine dans la réponse. C'est cette orchestration qu'est piighost.",
          ],
        },
        {
          heading: "Ce qu'elle apporte en plus",
          list: [
            "Détecteurs enfichables : catalogues d'expressions régulières (générique, US, UE, FR), NER (GLiNER2, spaCy, Transformers), un détecteur LLM, plus des détecteurs par correspondance exacte, composites et par découpage, et vous gardez celui en qui vous avez confiance (Presidio se branche via un extra).",
            "Jetons réversibles et transparents : chaque valeur devient un identifiant stable comme `<<PERSON:1>>` et est remise automatiquement, si bien que l'utilisateur final ne voit jamais de jeton ; des fabriques par étiquette seule, masquées et à hachage à clé sont aussi disponibles.",
            "Cohérence sur toute la conversation : une même valeur conserve le même jeton sur tout le fil, appuyée sur une mémoire en processus, Redis ou SQLAlchemy (Redis et SQL peuvent chiffrer les valeurs au repos et hacher les clés).",
            "Intégrations d'agents avec frontière d'outils : middleware LangChain, hooks Pydantic AI et LlamaIndex ; l'outil reçoit la vraie valeur pendant que le modèle ne voit que le jeton, avec une restitution en flux jeton par jeton.",
            "Un pipeline par étapes personnalisable : détecter, lier, résoudre les chevauchements, étendre, anonymiser, et un garde-fou optionnel qui refuse une réponse contenant des PII résiduelles ; remplacez par de la correspondance floue pour tolérer les fautes de frappe ou ajoutez votre propre étape.",
            "Piloté par configuration et auto-hébergeable : construisez un pipeline entier depuis un fichier TOML ou JSON, avec une CLI pour le valider, exécutez-le dans votre processus, ou en tant que service via le compagnon piighost-api.",
            "Typé et observable : livre `py.typed` et un cœur minimal avec tout le lourd derrière des extras, plus des spans OpenTelemetry par étape avec expurgation optionnelle des charges utiles.",
          ],
        },
        {
          heading: "Limites et compromis",
          list: [
            "Le jeton n'embarque pas la valeur chiffrée, à dessein. Contrairement à un jeton de chiffrement préservant le format, piighost utilise un identifiant (`<<PERSON:1>>`) appuyé sur un cache, si bien qu'un jeton capturé ne révèle rien en lui-même. En contrepartie, il vous faut un cache pour conserver la correspondance jeton-valeur.",
            "Le cache stocke les vraies valeurs, donc la réversibilité est de la pseudonymisation, pas de l'anonymisation. piighost vous donne le chiffrement AES-GCM des valeurs et le hachage Argon2id des clés, mais la base de données elle-même doit être sécurisée en production.",
            "Pas d'anonymisation de jeux de données. Pas de k-anonymat, de l-diversité, de confidentialité différentielle ni de données tabulaires. piighost protège du texte et des conversations en direct, pas un jeu de données entier.",
            "Pas de validation par somme de contrôle (Luhn, IBAN, NIR), par choix. Le détecteur d'expressions régulières s'appuie sur la seule forme, si bien qu'il ne laisse jamais fuir une vraie valeur abîmée par l'OCR, au prix de signaler parfois une chaîne qui ressemble seulement à une PII.",
          ],
        },
        {
          heading: "Installation",
          code: "install",
        },
        {
          heading: "Utilisation comme middleware LangChain",
          code: "usage",
        },
        {
          heading: "Où elle s'insère",
          paragraphs: [
            "La bibliothèque s'intègre dans votre processus Python. Lorsque vous avez besoin d'un point d'inférence partagé entre plusieurs processus, tournez-vous vers piighost-api. Pour la voir de bout en bout, regardez la démo de chat et le relecteur.",
          ],
        },
      ],
    },
    api: {
      tagline: "Un serveur REST qui héberge un pipeline piighost derrière HTTP.",
      sections: [
        {
          heading: "Ce qu'il fait",
          paragraphs: [
            "piighost-api est un serveur REST qui héberge un pipeline piighost configurable derrière HTTP. La bibliothèque s'intègre dans votre processus ; l'API permet à plusieurs processus (backends de chat, traitements par lots, notebooks) d'interroger un même point d'inférence sans recharger les modèles ni dupliquer l'état du cache.",
          ],
        },
        {
          heading: "Fonctionnalités",
          list: [
            "Points d'accès d'anonymisation et de désanonymisation sur l'ensemble du pipeline.",
            "N'importe quel détecteur piighost, chargé une fois et partagé entre les requêtes.",
            "Mémoire à portée de fil pour que les entités restent cohérentes sur une conversation.",
            "Authentification par clé d'API avec hachage Argon2, portées et expiration.",
            "Cache Redis pour les correspondances d'anonymisation partagées.",
            "Pipeline configuré au démarrage avec un chemin d'import module:variable.",
          ],
        },
        {
          heading: "Démarrage rapide",
          code: "quickstart",
        },
        {
          heading: "Dialoguer avec lui",
          code: "request",
        },
      ],
    },
    chat: {
      tagline: "Un chatbot de démonstration qui anonymise les messages avant que le LLM ne les voie.",
      sections: [
        {
          heading: "Ce qu'il démontre",
          paragraphs: [
            "piighost-chat est un chatbot de démonstration qui montre une conversation respectueuse de la vie privée de bout en bout. Les messages de l'utilisateur sont anonymisés avant d'atteindre le LLM, et les réponses sont désanonymisées avant d'atteindre l'utilisateur. Les outils reçoivent les vraies valeurs.",
          ],
        },
        {
          heading: "La pile technique",
          list: [
            "Un frontend React et un backend Litestar exécutant un agent LangChain.",
            "PIIAnonymizationMiddleware englobant l'agent : anonymisation avant le LLM, désanonymisation après.",
            "piighost-api pour la détection et la mise en évidence, avec une mémoire à portée de fil pour des jetons cohérents.",
            "keyshield pour l'authentification par clé d'API.",
          ],
        },
        {
          heading: "Le parcours utilisateur",
          ordered: true,
          list: [
            "L'utilisateur saisit un message.",
            "Le backend appelle piighost-api pour détecter les données personnelles ; le frontend met les entités en évidence.",
            "L'utilisateur confirme, et le message part vers l'agent.",
            "Le middleware l'anonymise avant que le modèle ne le voie, et désanonymise la réponse.",
          ],
        },
        {
          heading: "Lancez-le",
          code: "run",
        },
      ],
    },
    proofreader: {
      tagline: "Un relecteur de CV par LLM qui anonymise les documents avant tout appel au LLM.",
      sections: [
        {
          heading: "Ce qu'il fait",
          paragraphs: [
            "piighost-proofreader est un relecteur de CV propulsé par un LLM. Vous téléversez un PDF et obtenez une liste annotée d'erreurs avec mise en évidence au clic sur les pages affichées. Le document est anonymisé avec piighost-api avant tout appel au LLM.",
          ],
        },
        {
          heading: "Comment ça marche",
          ordered: true,
          list: [
            "opendataloader-pdf convertit le PDF en Markdown pour le LLM.",
            "PyMuPDF affiche chaque page et émet les rectangles englobants mot par mot.",
            "piighost-api anonymise le Markdown avant que le LLM ne le voie.",
            "Une chaîne LangChain et LiteLLM exécute une relecture à sortie structurée.",
            "Un localisateur réancre chaque erreur sur une page et un rectangle englobant.",
            "Streamlit affiche les pages avec des surcouches ; cliquer sur une erreur la met en évidence.",
          ],
        },
        {
          heading: "Lancez-le",
          code: "run",
          afterCode:
            "Vous avez aussi besoin d'un piighost-api en service à l'URL déclarée dans votre fichier .env.",
        },
      ],
    },
  },
  footer: {
    tagline: "Anonymisez les données personnelles avant qu'elles n'atteignent le modèle.",
    projects: "Projets",
    links: "Liens",
    mit: "Licence MIT. Construit avec Next.js et shadcn/ui.",
  },
  hero: {
    title: "Anonymisez les données personnelles avant qu'elles n'atteignent le modèle",
    description:
      "piighost est une bibliothèque Python pour créer des pipelines d'anonymisation de données personnelles. Elle remplace les informations sensibles par des jetons stables que le modèle peut utiliser, puis restitue les vraies valeurs à vos outils et à vos utilisateurs. Votre code d'agent ne change pas.",
    getStarted: "Démarrer",
    github: "GitHub",
  },
  problem: {
    eyebrow: "Le problème",
    title: "Vous ne devriez pas avoir à choisir entre de bons modèles et la confidentialité",
    items: [
      {
        title: "Les clouds hébergés exposent les données brutes",
        body: "OpenAI, Anthropic et Google proposent les meilleurs modèles du marché. Mais chaque octet de contexte que vous leur envoyez, y compris les données personnelles brutes, quitte votre juridiction dès que la requête part sur le réseau. Une seule invite devient une exportation de données.",
      },
      {
        title: "Les modèles locaux sacrifient la qualité",
        body: "L'auto-hébergement garde les données dans votre réseau, mais vous renoncez à une partie de l'état de l'art et vous prenez en charge la facture GPU et les mises à jour. Le gain en confidentialité s'accompagne d'un coût opérationnel permanent, et le modèle que vous pouvez faire tourner est rarement celui que vous voudriez utiliser.",
      },
      {
        title: "La conformité n'attend pas",
        body: "Le RGPD, HIPAA et les règles de résidence des données s'appliquent que votre stack ait été conçu avec elles ou non. Envoyer des données personnelles brutes à un tiers est une responsabilité que vous ne pouvez pas effacer une fois la requête partie, et cela soumet chaque décision produit ultérieure à une revue juridique.",
      },
      {
        title: "Interdire, c'est renoncer aux gains",
        body: "Certaines équipes réagissent en interdisant purement et simplement les LLM hébergés. Cela protège les données, mais cela renonce aussi aux gains de productivité que tous les autres captent, et les gens contournent l'interdiction de toute façon en collant leur travail dans des comptes personnels que l'entreprise ne voit pas.",
      },
    ],
  },
  howItWorks: {
    eyebrow: "Fonctionnement",
    title: "Une couche entre votre agent et le modèle",
    tabs: {
      detect: "Détecter",
      anonymize: "Anonymiser",
      tools: "Appels d'outils",
      deanonymize: "Désanonymiser",
    },
    detectCaption:
      "piighost exécute vos détecteurs sur le message et indique chaque donnée personnelle trouvée : noms, e-mails, identifiants, tout ce que le modèle n'a pas besoin de voir. Les détections qui se chevauchent entre plusieurs détecteurs sont arbitrées par niveau de confiance avant tout remplacement.",
    anonymizeCaption:
      "Chaque donnée personnelle reçoit un compteur stable, propre à son type. Les trois personnes de ce message deviennent <<PERSON:1>>, <<PERSON:2>> et <<PERSON:3>> ; les deux adresses e-mail distinctes deviennent <<EMAIL:1>> et <<EMAIL:2>>. La même valeur garde le même identifiant dans chaque message suivant, chaque appel d'outil et chaque réessai.",
    toolsCaption:
      "Le modèle ne voit jamais les vraies données : ses appels d'outils reviennent donc eux aussi écrits avec des jetons. piighost restitue les vraies valeurs dans les arguments avant que votre fonction ne s'exécute, si bien que l'e-mail part réellement vers la vraie adresse de <<EMAIL:1>> avec le vrai dossier <<ID:1>>. Tout ce que l'outil renvoie est réanonymisé avant que le modèle ne le lise.",
    deanonymizeCaption:
      "La réponse finale est restituée avant d'atteindre l'utilisateur. Le modèle a écrit <<PERSON:2>> et <<PERSON:3>>, et piighost remet le bon nom en face de chaque jeton. Votre code d'agent n'a jamais à gérer cette comptabilité.",
    labels: {
      userMessage: "Message utilisateur",
      fromUser: "De l'utilisateur",
      llmSees: "Ce que voit le modèle",
      toolCall: "Appel d'outil émis par le modèle",
      toolRuns: "Ce que votre outil exécute réellement",
      llmResponse: "Réponse du modèle",
      userSees: "Ce que voit l'utilisateur",
    },
  },
  detector: {
    eyebrow: "Pourquoi piighost",
    title: "Plus qu'un détecteur de PII",
    description:
      "Repérer les données sensibles, c'est le plus facile. piighost fournit tout le reste : des détecteurs que vous composez, des jetons que vous pouvez annuler, la cohérence sur toute une conversation, et un pipeline que vous exécutez à vos conditions.",
    items: [
      {
        title: "Détecteurs composables",
        body: "Combinez des détecteurs regex, NER et LLM dans un même pipeline et gardez ceux en qui vous avez confiance. Un découpage intégré fractionne les longs documents, si bien que même les gros fichiers sont entièrement couverts.",
      },
      {
        title: "Jetons réversibles et transparents",
        body: "Chaque valeur devient un jeton stable, restitué automatiquement. Vos utilisateurs et vos outils voient toujours les vraies données, tandis que le modèle ne voit jamais que le jeton.",
      },
      {
        title: "Cohérent sur toute une conversation",
        body: "Une même valeur conserve le même jeton sur toute une conversation, à travers chaque message, appel d'outil et agent. Rien ne dérive, si bien que le modèle ne perd jamais le fil de qui est qui.",
      },
      {
        title: "Piloté par config, auto-hébergé",
        body: "Décrivez un pipeline entier dans un seul fichier de configuration et exécutez-le entièrement sur votre propre infrastructure. Rien ne sort de chez vous, et aucun service tiers à qui faire confiance.",
      },
    ],
  },
  ecosystem: {
    eyebrow: "L'écosystème",
    title: "Une couche de confidentialité, plusieurs projets",
    description:
      "Commencez avec la bibliothèque. Ajoutez le serveur, la démo de chat et le correcteur de CV au fil de votre croissance.",
    moreToCome: "À venir.",
  },
  quickStart: {
    eyebrow: "Démarrage rapide",
    title: "Branchez-le sur votre framework d'agent",
    description: "Ajoutez piighost au framework que vous utilisez déjà. Votre code d'agent reste le même.",
  },
  cta: {
    title: "Livrez des fonctionnalités IA sans livrer les données de vos utilisateurs",
    description:
      "Installez piighost, branchez votre détecteur et gardez les données personnelles hors du modèle.",
    readTheDocs: "Lire la documentation",
    starOnGitHub: "Étoiler sur GitHub",
  },
  faq: {
    heading: "Questions fréquentes",
    items: [
      {
        question: "Comment anonymiser les données personnelles avant d'envoyer un prompt à un modèle en Python ?",
        answer:
          "Installez piighost, construisez un pipeline autour d'un détecteur et faites passer votre texte avant que le modèle ne le voie. Le pipeline repère les données personnelles et les remplace par des jetons comme <<PERSON:1>>, puis restaure les vraies valeurs dans la réponse. Vous choisissez le détecteur : regex, NER classique, GLiNER ou un modèle.",
      },
      {
        question: "Quelle est la différence entre la détection par regex, NER et LLM ?",
        answer:
          "Ce sont des détecteurs équivalents entre lesquels vous choisissez. La regex repère des motifs fixes comme les e-mails ou les numéros de carte, de façon rapide et exacte. Le NER (modèles classiques ou GLiNER) reconnaît les noms, lieux et organisations selon le contexte. Un détecteur par modèle gère les cas plus subtils. piighost reste agnostique, donc vous pouvez les combiner.",
      },
      {
        question: "Comment utiliser piighost avec LangChain, Pydantic AI ou LlamaIndex ?",
        answer:
          "piighost fournit des intégrations pour LangChain, Pydantic AI et LlamaIndex. Vous enveloppez votre pipeline dans l'assistant proposé (middleware, hooks ou anonymiseur de nœuds) afin que les données personnelles soient remplacées avant l'appel au modèle et restaurées ensuite. Le modèle ne raisonne que sur des jetons comme <<PERSON:1>>, jamais sur les vraies valeurs.",
      },
      {
        question: "piighost est-il conforme au RGPD, et comment fonctionnent les jetons stables ?",
        answer:
          "piighost réalise une pseudonymisation réversible au sens du RGPD, ce qui facilite la conformité mais ne remplace pas votre propre analyse juridique. Des jetons stables signifient qu'une même entité correspond toujours au même jeton (Patrick devient <<PERSON:1>> partout), donc le modèle garde le contexte pendant que la vraie valeur reste hors de sa portée.",
      },
      {
        question: "Mes données restent-elles locales ? Qu'est-ce qui est réellement envoyé au modèle ?",
        answer:
          "Seul le texte anonymisé est envoyé au modèle, chaque valeur détectée étant remplacée par un jeton comme <<PERSON:1>>. La correspondance entre les jetons et les vraies valeurs reste de votre côté et n'est jamais envoyée. Après la réponse du modèle, piighost restaure localement les valeurs d'origine pour que vos utilisateurs voient les vraies données.",
      },
    ],
  },
  playground: {
    tabDetector: "Détecteur",
    tabPipeline: "Pipeline",
    tabsLabel: "Vues du playground",
    pipelineHeading: "Constructeur de pipeline",
    detectorHeading: "Banc de détecteur",
    configTitle: "Configuration",
    modelLabel: "Modèle",
    models: {
      multilingual: "NER classique, multilingue, labels figés (~178 Mo)",
      english: "NER classique, anglais, labels figés (~109 Mo)",
      glinerSmall: "Zero-shot, généraliste (~183 Mo)",
      glinerPii: "Zero-shot, spécialisé PII, multilingue (~349 Mo)",
    },
    modelGroups: { classic: "NER classique", gliner: "GLiNER (zero-shot)" },
    glinerLabelsLabel: "Types à détecter",
    labelSearchedPlaceholder: "person",
    labelEmittedPlaceholder: "étiqueté comme (optionnel)",
    labelAdd: "Ajouter une entité",
    labelEmittedHint: "Gauche : ce que cherche le modèle. Droite : le label émis (vide = identique).",
    thresholdLabel: "Seuil",
    inputLabel: "Votre texte",
    example:
      "Bonjour, je m'appelle Marie Lambert. Je travaille chez Société Générale à Paris, et mon collègue Jean Moreau vient d'être muté au bureau de Lyon. Nous collaborons avec une équipe de Berlin et présentons nos travaux à l'Organisation des Nations unies.",
    analyze: "Analyser",
    analyzing: "Analyse en cours...",
    loadingModel: "Téléchargement du modèle...",
    firstLoadNote:
      "Le premier lancement télécharge le modèle dans votre navigateur (de quelques dizaines à quelques centaines de Mo). Il est ensuite mis en cache, donc les analyses suivantes sont instantanées.",
    edit: "Modifier",
    resultsTitle: "Entités détectées",
    inferenceTime: "Inférence",
    reqPerSecond: "req/s",
    sortLabel: "Trier",
    sortByAppearance: "Apparition",
    sortByScoreDesc: "Score (décroissant)",
    sortByScoreAsc: "Score (croissant)",
    noEntities: "Aucune entité détectée.",
    columns: { text: "Texte", label: "Label", score: "Score" },
    errorTitle: "Une erreur est survenue",
    retry: "Réessayer",
    emptyHint: "Lancez une analyse pour voir les résultats.",
    test: "Tester",
    remove: "Retirer",
    moveUp: "Monter",
    moveDown: "Descendre",
    detectorType: "Type de détecteur",
    detectorTypes: {
      regex: "Regex",
      transformers: "NER classique",
      gliner2: "GLiNER (zero-shot)",
      llm: "LLM",
    },
    llmDeploymentNote: "Le détecteur LLM tourne au déploiement, pas dans le navigateur.",
    patternsLabel: "Motifs (un par ligne : LABEL = regex)",
    patternsHint: "Chaque ligne associe un label à une expression régulière.",
    pipelineNameLabel: "Nom de la pipeline",
    emptyPipeline: "Aucun détecteur. Ajoutez-en un depuis vos détecteurs sauvegardés.",
    exportTitle: "Export",
    exportToml: "TOML",
    exportPython: "Python",
    downloadToml: "Télécharger le .toml",
    tokenExample: "Exemple (indicatif)",
    saveDetector: "Sauvegarder le détecteur",
    detectorName: "Nom du détecteur",
    savedDetectors: "Détecteurs sauvegardés",
    examplesTitle: "Exemples",
    loadSampleText: "Charger un texte",
    noSaved: "Aucun détecteur sauvegardé.",
    loadLabel: "Charger",
    deleteLabel: "Supprimer",
    editInPlayground: "Éditer",
    detectorsTitle: "Détecteurs",
    addFromSaved: "Ajouter depuis les sauvegardés",
    spanResolverLabel: "Résolveur de spans",
    entityLinkerLabel: "Lieur d'entités",
    entityResolverLabel: "Résolveur d'entités",
    anonymizerLabel: "Anonymiseur",
    detectorsHelp: "Détecte les données personnelles (regex, NER classique, GLiNER...).",
    spanResolverHelp: "Arbitre les détections qui se chevauchent en spans finaux.",
    entityLinkerHelp: "Relie les répétitions d'une même valeur pour un jeton commun.",
    entityResolverHelp: "Fusionne les entités liées ; fuzzy gère fautes et casse.",
    anonymizerHelp: "Remplace chaque entité par un jeton.",
    liveTestTitle: "Test live (prévisualisation)",
    anonymizedLabel: "Texte anonymisé",
    approximationNote: "Exécute le vrai piighost dans votre navigateur.",
    loadingRuntime: "Chargement du moteur piighost...",
    runtimeDownloading: "Téléchargement du moteur...",
    runtimeInstalling: "Installation de piighost...",
    runtimeReady: "Moteur prêt",
    noEnabledDetectors: "Activez au moins un détecteur pour tester la pipeline.",
    staleNote: "Pipeline modifiée, relancez pour mettre à jour.",
    savePipeline: "Sauvegarder la pipeline",
    save: "Sauvegarder",
    cancel: "Annuler",
    phHashLength: "Longueur du hash",
    phMaskChar: "Caractère de masque",
  },
  philosophy: {
    eyebrow: "Philosophie",
    title: "Pourquoi anonymiser ?",
    intro:
      "Un exposé factuel sur la manière dont les modèles cloud traitent vos données, sur les protections juridiques et techniques en place (et celles qui manquent), et sur la raison pour laquelle anonymiser avant d'envoyer est le seul contrôle qui reste entièrement entre vos mains.",
    sections: [
      {
        id: "how-cloud-llm-works",
        heading: "Comment fonctionne un modèle cloud",
        paragraphs: [
          "Un modèle comme ChatGPT, Claude ou Mistral Le Chat n'est pas un logiciel qui tourne sur votre ordinateur. C'est un service distant. Votre question quitte votre machine, traverse Internet, atteint les serveurs du fournisseur, y est traitée, et une réponse vous revient.",
          "L'interface peut être locale, le modèle ne l'est pas. Même si vous utilisez une application de bureau, une extension de navigateur ou un plugin d'IDE, le modèle ne s'exécute pas sur votre machine. Seule l'interface s'y exécute. Le calcul a lieu dans le cloud du fournisseur. Le terme « LLM local » désigne uniquement l'inférence sur votre propre matériel, via des outils comme Ollama ou llama.cpp.",
          "Ce chemin a plusieurs conséquences souvent sous-estimées :",
        ],
        list: [
          "Le message est reçu en clair par l'infrastructure du fournisseur. Le chiffrement TLS protège le transit, pas la lecture côté serveur.",
          "Il est en général journalisé à des fins de facturation, de détection d'abus, de débogage et d'amélioration du modèle.",
          "Il peut être conservé pendant des semaines, des mois ou des années, selon la politique du fournisseur et les obligations légales qui le lient.",
        ],
        subsections: [],
      },
      {
        id: "limits-of-contractual-promise",
        heading: "Les limites d'une promesse contractuelle",
        paragraphs: [
          "Partons de l'hypothèse la plus favorable : les grands fournisseurs (OpenAI, Anthropic, Google, Mistral et d'autres) veulent sincèrement protéger les données de leurs utilisateurs. Leurs politiques de confidentialité formalisent des engagements (« nous n'entraînons pas sur vos données API », « nous supprimons après 30 jours », « nous rejetons les requêtes abusives »), et ces engagements sont en général tenus.",
          "Ce n'est pas suffisant, car un engagement contractuel peut tomber pour trois raisons distinctes, dont aucune ne relève de la mauvaise foi du fournisseur.",
        ],
        subsections: [
          {
            heading: "Un incident technique, un bug, une attaque",
            paragraphs: [
              "Aucune politique ne protège d'une erreur d'ingénierie ou d'une intrusion réussie. Deux cas suffisent à illustrer le propos.",
              "Le 20 mars 2023, un bug dans la bibliothèque Redis utilisée par OpenAI a exposé les titres de conversations ChatGPT à d'autres utilisateurs pendant environ neuf heures. Pour environ 1,2 % des abonnés ChatGPT Plus actifs pendant cette fenêtre, des informations de paiement partielles (nom, e-mail, quatre derniers chiffres de la carte, date d'expiration) étaient également visibles depuis des comptes tiers. OpenAI a publié un post-mortem public reconnaissant l'incident.",
              "En janvier 2025, des chercheurs de Wiz Research ont découvert qu'une base de données ClickHouse de DeepSeek était joignable sur Internet sans authentification. Plus d'un million de lignes de journaux étaient exposées, incluant des historiques de conversations, des clés API et des métadonnées d'infrastructure interne.",
              "Dans les deux cas, les données ont fuité sans procès, sans injonction et sans intention malveillante de la part de l'entreprise. Un bug, une configuration oubliée, et le périmètre contractuel perd son sens.",
            ],
          },
          {
            heading: "Vos données utilisées pour l'entraînement",
            paragraphs: [
              "« Si c'est gratuit, c'est vous le produit. » Le vieil adage du web commercial s'applique aussi aux LLM. Faire tourner l'inférence sur un grand modèle coûte cher : chaque réponse mobilise des GPU en temps réel et le fournisseur paie cette facture à chaque requête. Pourtant, OpenAI, Google et d'autres proposent des paliers gratuits très généreux. Les raisons commerciales classiques (acquisition d'utilisateurs, effet de standard de fait) n'expliquent qu'une partie de ce modèle économique. Ces paliers gratuits alimentent aussi la collecte de données d'entraînement.",
              "Sur les paliers gratuits grand public, vos conversations peuvent servir à améliorer le modèle de plusieurs façons : les retours explicites (pouce levé ou baissé, reformulation, régénération) servent de signal d'apprentissage par renforcement, les échanges peuvent être relus par des annotateurs humains pour identifier les modes d'échec, et le corpus complet des conversations peut servir de matière première pour construire les jeux de données des itérations suivantes.",
              "Les offres payantes (API, ChatGPT Enterprise, Claude Team, etc.) excluent en général vos données de l'entraînement par défaut. Sur les paliers gratuits, en revanche, l'option de désinscription est souvent enfouie dans les paramètres, parfois désactivée par défaut, et la politique peut évoluer au fil du temps.",
            ],
          },
          {
            heading: "Une injonction judiciaire",
            paragraphs: [
              "Même quand le fournisseur veut supprimer vos données, un tribunal peut l'en empêcher.",
              "Le 13 mai 2025, dans le cadre de son procès contre OpenAI, le New York Times a obtenu de la Magistrate Judge Ona T. Wang une ordonnance de conservation : OpenAI a été tenu de conserver chaque conversation ChatGPT et chaque appel API de ses clients, y compris ceux que l'entreprise aurait normalement supprimés selon sa propre politique. OpenAI s'est opposé publiquement à l'ordonnance en déposant une demande de reconsidération, rejetée en première instance, puis en interjetant appel devant le District Judge Sidney Stein, qui a rejeté l'appel en juin 2025. L'ordonnance a finalement été levée le 26 septembre 2025 (clôture formelle le 9 octobre), les utilisateurs de l'EEE, de Suisse et du Royaume-Uni ayant été exemptés de la mesure.",
              "L'affaire ne s'est pas arrêtée là. Le 7 novembre 2025, la même Magistrate Judge a ordonné à OpenAI de remettre 20 millions de journaux ChatGPT pseudonymisés au New York Times à titre d'élément de preuve. OpenAI a déposé une demande de reconsidération, qui a été rejetée, puis a fait appel. Le 5 janvier 2026, le District Judge Stein a confirmé la décision, entérinant l'obligation de remise.",
              "Cet épisode a deux conséquences pratiques. D'abord, la politique de confidentialité d'un fournisseur n'est jamais définitive : une décision judiciaire à laquelle vous n'êtes pas partie peut la réécrire, forcer la rétention, ou contraindre la remise massive de conversations à un tiers. Ensuite, la fenêtre d'exposition de vos données à une fuite ou à une attaque future s'élargit mécaniquement, et avec elle la probabilité qu'une autorité publique (américaine ou, par commission rogatoire internationale, étrangère) y accède.",
            ],
          },
        ],
      },
      {
        id: "legal-not-enough",
        heading: "Juridique : le droit ne suffit pas non plus",
        paragraphs: [
          "Face à ce tableau technique, la réaction instinctive est de se tourner vers le droit : choisir un fournisseur « conforme RGPD », vérifier les certifications, exiger des clauses contractuelles. Cette approche est utile mais incomplète, pour deux raisons : le droit américain ménage des voies d'accès légales aux données, et le droit européen n'a pas encore produit de garde-fou éprouvé appliqué aux LLM.",
        ],
        subsections: [
          {
            heading: "Le cadre américain : CLOUD Act, FISA 702, décret 12333",
            paragraphs: [
              "Trois textes structurent l'accès américain aux données des fournisseurs, et aucun d'eux n'est le Patriot Act. Le Patriot Act (2001) revient souvent dans ce débat, mais ce n'est plus le bon texte à citer. Sa disposition de surveillance la plus connue, la Section 215, a été restreinte par le USA FREEDOM Act en 2015, puis a été laissée expirer par le Congrès en mars 2020.",
            ],
            list: [
              "Le CLOUD Act (2018) oblige tout fournisseur sous juridiction américaine à remettre les données qu'il contrôle, peu importe où ces données sont physiquement stockées. Un centre de données en Irlande ou en France ne met pas les données hors d'atteinte dès lors que l'entreprise est américaine.",
              "FISA Section 702 est le fondement légal de programmes de surveillance de masse comme PRISM, révélés en 2013 par Edward Snowden. Il autorise la collecte de communications via les principaux fournisseurs américains.",
              "Le décret 12333 est le cadre plus large de la surveillance par l'exécutif américain, sans supervision judiciaire directe.",
            ],
          },
          {
            heading: "Schrems II : la CJUE tranche",
            paragraphs: [
              "En juillet 2020, la Cour de justice de l'Union européenne a invalidé le Privacy Shield, l'accord qui encadrait les transferts de données entre l'UE et les États-Unis. Le raisonnement, en bref : FISA 702 et le décret 12333 sont trop permissifs pour être compatibles avec le RGPD et n'offrent aucun recours judiciaire effectif aux citoyens européens. Plus de 5 300 entreprises s'appuyaient sur le Privacy Shield pour leurs transferts transatlantiques. Un second accord, le Data Privacy Framework (2023), l'a remplacé, mais il repose sur les mêmes fondations juridiques américaines et sa pérennité est contestée.",
            ],
          },
          {
            heading: "Microsoft Irlande : la juridiction l'emporte sur la géographie",
            paragraphs: [
              "Entre 2013 et 2018, les autorités américaines ont demandé à Microsoft, via un mandat émis sous le Stored Communications Act, la remise des données d'un client stockées sur ses serveurs en Irlande. Microsoft a résisté jusqu'à la Cour suprême. La procédure n'a jamais été tranchée sur le fond, parce que le Congrès a adopté le CLOUD Act en mars 2018 pour clarifier la réponse : oui, les entreprises américaines doivent fournir les données où qu'elles soient stockées.",
              "Conséquence directe : l'hébergement européen par un fournisseur américain n'offre aucune étanchéité juridique face aux États-Unis. Le marketing « vos données restent en Europe » masque cette asymétrie.",
            ],
          },
          {
            heading: "Le cadre européen : un RGPD qui n'a pas encore tenu sur les LLM",
            paragraphs: [
              "Le RGPD reste un outil solide sur le papier, mais son application aux LLM en est à ses premiers pas. Le Garante, l'autorité italienne de protection des données, a ouvert une enquête contre OpenAI dès mars 2023. En décembre 2024, il a infligé à OpenAI une amende de 15 millions d'euros pour traitement sans base légale, manquements à la transparence et absence d'un mécanisme de vérification de l'âge. Mais en mars 2026, le tribunal de Rome a annulé cette décision dans son intégralité. À ce jour, aucune autorité européenne n'a sécurisé en dernier ressort une sanction contre un grand LLM pour une violation du RGPD liée à la phase de collecte d'entraînement.",
            ],
          },
        ],
      },
      {
        id: "secondary-uses",
        heading: "Usages secondaires : ce que les données collectées rendent possible",
        paragraphs: [
          "Les sections précédentes expliquent comment les données quittent votre périmètre. Il reste à préciser ce qu'elles permettent une fois collectées. Trois usages, inégalement documentés, méritent d'être distingués pour ne pas mélanger un risque structurel et une pratique avérée.",
        ],
        subsections: [
          {
            heading: "Surveillance de masse",
            paragraphs: [
              "Une conversation avec un LLM ressemble techniquement à un e-mail ou à une discussion : du texte horodaté, attaché à un compte identifiable. Elle relève du même périmètre de collecte que les autres communications électroniques couvertes par FISA 702, renouvelé pour deux ans en avril 2024 par RISAA, et dont le renouvellement est de nouveau en débat au Congrès en avril 2026. Des rapports déclassifiés du PCLOB documentent plusieurs centaines de milliers de sélecteurs (identifiants de cible) actifs chaque année, et la collecte « about » (suspendue en 2017, puis ré-autorisée) élargit mécaniquement le périmètre à des communications qui ne sont ni adressées à la cible, ni envoyées par elle, mais qui la mentionnent.",
            ],
          },
          {
            heading: "Profilage et ciblage politique",
            paragraphs: [
              "L'inquiétude n'est pas spéculative ; elle repose sur des cas documentés de surveillance ciblée dans d'autres couches d'Internet.",
            ],
            list: [
              "Angela Merkel, octobre 2013 : les révélations Snowden documentent la surveillance par la NSA du téléphone portable de la chancelière allemande, listée comme cible depuis 2002.",
              "Associated Press, 2012-2013 : le Department of Justice a saisi en secret, en avril-mai 2012, les relevés de plus de vingt lignes téléphoniques d'AP, dans le cadre d'une enquête sur des fuites.",
              "Pegasus / NSO, 2021 : la coalition Forbidden Stories documente l'usage du logiciel espion Pegasus contre environ 180 journalistes ciblés, ainsi que des militants, avocats, diplomates et chefs d'État dans plus de 20 pays.",
            ],
          },
          {
            heading: "Ciblage commercial et courtiers en données",
            paragraphs: [
              "Le risque diffère des deux précédents : il ne demande ni juge, ni mandat. Il repose sur l'écosystème commercial qui entoure les fournisseurs, et se déploie en trois temps.",
              "D'abord, une structure d'incitation. Plusieurs grands acteurs du LLM ont des intérêts adjacents dans la publicité ciblée : Google en fait son cœur de métier, Microsoft (gros actionnaire d'OpenAI) opère Bing Ads, Meta pousse son propre écosystème d'IA générative au sein d'un groupe dont la quasi-totalité du chiffre d'affaires vient du ciblage publicitaire.",
              "Ensuite, l'état actuel des preuves. Aucune preuve aujourd'hui qu'un fournisseur ait revendu des conversations LLM à des courtiers en données. L'argument ne repose donc pas sur une pratique avérée mais sur un risque structurel : des données qui entrent dans un système, détenues par un acteur qui a un intérêt économique à les exploiter, peuvent en ressortir plus tard par des canaux qui n'étaient pas ceux annoncés au départ.",
              "Enfin, la porosité documentée entre l'écosystème publicitaire et la surveillance. Un rapport du directeur du renseignement national daté de janvier 2022 et déclassifié en juin 2023 reconnaît que les agences de renseignement américaines achètent régulièrement des données commerciales auprès de courtiers en données, notamment des données de localisation et de navigation. Ce qui est collecté pour vendre de la publicité peut donc être racheté pour surveiller, sans mandat ni notification.",
            ],
          },
          {
            heading: "Pourquoi l'anonymisation casse ce graphe",
            paragraphs: [
              "Une donnée personnelle envoyée en clair devient un nœud dans un graphe potentiel : on peut la croiser avec des réseaux sociaux, des fuites antérieures, des registres publics ou des bases commerciales, pour ré-identifier, enrichir ou cibler. Un jeton de remplacement n'a aucune valeur d'agrégation. Anonymiser avant d'envoyer coupe la racine commune de chaque chaîne d'usage secondaire décrite plus haut.",
            ],
          },
        ],
      },
      {
        id: "provider-spectrum",
        heading: "Où vous placer sur le spectre des fournisseurs ?",
        paragraphs: [
          "Le choix n'est pas binaire entre « cloud américain » et « rien ». Il existe un continuum, du plus exposé au plus isolé, et chaque palier modifie à la fois le risque juridique et la part de responsabilité qui retombe sur vous.",
        ],
        table: {
          headers: ["Option", "CLOUD Act / FISA 702", "RGPD", "Accès technique du fournisseur", "Entraînement sur vos données"],
          rows: [
            ["Fournisseur US, serveurs US", "Oui, directement", "Indirect, via DPF, fragile", "Oui", "Variable"],
            ["Fournisseur US, serveurs UE", "Oui (cf. Microsoft Irlande)", "S'applique, mais préempté", "Oui", "Exclu par défaut sur les offres entreprise"],
            ["Fournisseur UE", "Non (sauf filiale sous contrôle US)", "S'applique pleinement", "Oui", "Exclu par défaut sur les offres payantes"],
            ["Modèle local (auto-hébergé)", "Non", "Vous en êtes responsable", "Non : vous êtes le fournisseur", "Non : vous le contrôlez"],
          ],
        },
        subsections: [
          {
            heading: "",
            paragraphs: [
              "À une extrémité du spectre, un fournisseur américain hébergé aux États-Unis cumule les trois risques ci-dessus : le CLOUD Act, FISA 702 et le décret 12333 s'appliquent sans filtre, les transferts depuis l'UE reposent sur le Data Privacy Framework contesté, et une décision judiciaire américaine peut imposer la conservation indéfinie des conversations.",
              "Déplacer physiquement les serveurs en Europe ne change presque rien sur le plan juridique. Dès lors que l'entité exploitante est sous juridiction américaine, le CLOUD Act s'applique, peu importe où sont les disques durs.",
              "Changer de juridiction en passant à un fournisseur européen (Mistral, OVHcloud AI, Scaleway, Aleph Alpha) fait tomber par défaut le risque CLOUD Act, sauf si le fournisseur possède une filiale américaine sous contrôle. Le RGPD s'applique pleinement et les autorités européennes peuvent sanctionner. Cela ne rend pas le fournisseur aveugle au contenu : il garde un accès technique complet, la protection reste contractuelle et étatique.",
              "Enfin, faire tourner le modèle en local sur votre propre infrastructure (Ollama, vLLM, llama.cpp ou équivalent) supprime le tiers de l'équation : aucun fournisseur n'a accès technique au contenu, par construction. C'est la protection maximale côté confidentialité. La contrepartie, c'est que toute la responsabilité bascule sur vous : sécurité physique et logique, chiffrement au repos, gestion des accès, mises à jour, journalisation.",
              "Le choix du fournisseur reste important pour beaucoup de choses : latence, coût, qualité du modèle, conformité RGPD globale, écosystème d'intégration. Mais pour le risque spécifique de fuite de données personnelles, l'anonymisation neutralise ce choix. Si seuls des jetons quittent votre infrastructure, un fournisseur américain ne reçoit rien d'exploitable sur vos données sensibles.",
            ],
          },
        ],
      },
      {
        id: "sectoral-obligations",
        heading: "Obligations sectorielles et choix déjà faits",
        paragraphs: [],
        subsections: [
          {
            heading: "Quand c'est une obligation légale",
            paragraphs: [
              "Dans plusieurs métiers, envoyer des données personnelles à un LLM non souverain n'est pas une question de confort, c'est une impossibilité réglementaire.",
            ],
            list: [
              "Finance : MiFID II, secret bancaire, obligations de confidentialité client.",
              "Avocats : secret professionnel absolu (article 66-5 de la loi française du 31 décembre 1971). Une consultation client envoyée brute et identifiable à un LLM américain peut constituer une faute déontologique.",
              "Médecine : secret médical (article L.1110-4 du Code de la santé publique), HIPAA aux États-Unis. Un dossier patient ne peut pas transiter par un service tiers sans garanties techniques lourdes.",
              "Défense et secteurs stratégiques : régimes spécifiques (classification, CUI aux États-Unis, Diffusion Restreinte en France).",
            ],
          },
          {
            heading: "Ce que les grandes entreprises ont déjà tranché",
            paragraphs: [
              "Faute de protection technique disponible en 2023, plusieurs grands groupes ont simplement interdit à leurs employés d'utiliser les LLM cloud.",
            ],
            list: [
              "Samsung, avril 2023 : plusieurs incidents internes au cours desquels des ingénieurs avaient collé du code source et des notes de réunion dans ChatGPT. En mai 2023, l'entreprise a interdit l'usage des LLM génératifs sur les appareils professionnels.",
              "Secteur bancaire américain, printemps 2023 : JPMorgan Chase, Bank of America, Citigroup, Goldman Sachs, Deutsche Bank et Wells Fargo ont bloqué ou restreint l'usage de ChatGPT pour leurs employés.",
            ],
          },
        ],
      },
      {
        id: "legal-vs-technical",
        heading: "Protection juridique contre protection technique",
        paragraphs: [
          "Toutes les protections mobilisées jusqu'ici reposent sur des instruments juridiques : politiques de confidentialité, clauses contractuelles types, accords internationaux, amendes administratives. Elles partagent un défaut commun : elles sont révocables, par une décision politique ou judiciaire sur laquelle vous n'avez aucun levier.",
        ],
        table: {
          headers: ["Type de protection", "Exemple", "Pourquoi c'est fragile"],
          rows: [
            ["Promesse contractuelle", "« Nous ne lisons pas vos données »", "Contournable par une injonction (NYT c. OpenAI)"],
            ["Clauses contractuelles types", "Transferts UE vers US", "Déjà affaiblies par Schrems II"],
            ["Accord international", "Privacy Shield, DPF", "Le premier invalidé, le second contesté"],
            ["Réglementation régionale", "RGPD", "Lente à produire des sanctions effectivement appliquées aux LLM"],
            ["Hébergement régional", "« Centres de données en Europe »", "Neutralisé par le CLOUD Act si le fournisseur est américain"],
          ],
        },
        subsections: [
          {
            heading: "",
            paragraphs: [
              "La protection technique fonctionne autrement. Si les données personnelles ne quittent jamais votre infrastructure et que seul un jeton est envoyé au modèle :",
            ],
            list: [
              "aucune injonction ne peut contraindre un tiers à divulguer ce qu'il ne détient pas,",
              "aucune modification d'un accord international ne vous touche,",
              "aucune politique de rétention d'un fournisseur n'est en jeu,",
              "le fournisseur peut être piraté, racheté ou disparaître : vos données n'y étaient pas.",
            ],
          },
          {
            heading: "",
            paragraphs: [
              "C'est la différence entre « nous promettons de ne pas regarder » et « nous sommes techniquement incapables de regarder ». Le second est toujours plus solide que le premier.",
            ],
          },
        ],
      },
      {
        id: "what-anonymization-does-not-solve",
        heading: "Ce que l'anonymisation ne résout pas",
        paragraphs: [
          "L'anonymisation est une couche dans une posture de défense en profondeur, pas une solution miracle.",
        ],
        list: [
          "Elle ne rend pas un LLM conforme à tous les régimes réglementaires. Certaines données (données de santé re-liables, matériel classifié défense) ne doivent pas quitter l'infrastructure, même sous forme anonymisée.",
          "Elle dépend de la qualité du détecteur. Une donnée personnelle non détectée passe en clair. C'est un sujet d'ingénierie, pas un défaut conceptuel.",
          "Elle ne remplace pas les autres bonnes pratiques : chiffrement au repos, journalisation auditée, gestion des accès, formation des équipes.",
        ],
      },
    ],
  },
  seo: {
    defaultTitle: "piighost - anonymiser les PII avant qu'elles n'atteignent le modèle",
    defaultDescription:
      "piighost est une librairie Python pour anonymiser les informations personnelles avant qu'elles n'atteignent un grand modèle de langage. Détectez les PII par regex, NER ou LLM, remplacez-les par des placeholders stables, puis restaurez les vraies valeurs pour vos outils.",
    philosophyDescription:
      "Les principes de piighost : minimiser les données personnelles transmises au modèle, garder la correspondance en local, et rester réversible pour le RGPD.",
    pages: {
      piighost: "La librairie Python de référence pour construire des pipelines d'anonymisation de PII. Détectez par regex, NER ou LLM, remplacez les PII par des placeholders stables, et restaurez les vraies valeurs en sortie d'outil.",
      api: "piighost-api héberge un pipeline d'anonymisation derrière un point d'accès HTTP, pour que n'importe quel service retire les PII avant qu'elles n'atteignent un modèle.",
      chat: "piighost-chat est un chatbot de démonstration qui anonymise chaque message avant que le modèle ne le voie, puis restaure les vraies valeurs dans la réponse.",
      proofreader: "piighost-proofreader est un relecteur de CV qui anonymise les documents avant tout appel à un modèle, pour que les données personnelles ne quittent jamais votre contrôle.",
      playground: "Composez un pipeline complet d'anonymisation de PII dans le navigateur : détecter, résoudre, lier et anonymiser, puis exportez-le en configuration piighost.",
      detector: "Testez un détecteur de PII dans votre navigateur : regex, NER classique ou GLiNER. Aucune donnée ne quitte la page.",
    },
  },
};

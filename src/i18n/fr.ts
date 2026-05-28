import type { Dictionary } from "./types";

export const fr: Dictionary = {
  nav: {
    piighost: "piighost",
    api: "piighost-api",
    chat: "piighost-chat",
    proofreader: "piighost-proofreader",
    philosophy: "Philosophie",
    github: "GitHub",
    toggleTheme: "Changer le theme",
    toggleLanguage: "Passer en anglais",
    backToTop: "Remonter en haut",
  },
  footer: {
    tagline: "Anonymisez les donnees personnelles avant qu'elles atteignent le modele.",
    projects: "Projets",
    links: "Liens",
    mit: "Licence MIT. Construit avec Next.js et shadcn/ui.",
  },
  hero: {
    title: "Anonymisez les donnees personnelles avant qu'elles atteignent le modele",
    description:
      "piighost est une bibliotheque Python pour les pipelines d'anonymisation de donnees personnelles. Elle remplace les informations sensibles par des jetons stables que le modele peut utiliser, puis restitue les valeurs reelles a vos outils et a vos utilisateurs. Votre code d'agent ne change pas.",
    getStarted: "Demarrer",
    github: "GitHub",
  },
  problem: {
    eyebrow: "Le probleme",
    title: "Vous ne devriez pas avoir a choisir entre de bons modeles et la confidentialite",
    items: [
      {
        title: "Les clouds heberges exposent les donnees brutes",
        body: "OpenAI, Anthropic et Google proposent les meilleurs modeles du marche. Mais chaque octet de contexte que vous leur envoyez, y compris les donnees personnelles brutes, quitte votre perimetre des que la requete part sur le reseau. Une seule invite devient une exportation de donnees, et \"on supprimera ca plus tard\" ne tient pas face a un audit serieux.",
      },
      {
        title: "Les modeles locaux sacrifient la qualite",
        body: "L'auto-hebergement garde les donnees dans votre reseau, mais vous renoncez a une partie de l'etat de l'art et vous prenez en charge la facture GPU, les mises a jour et le pipeline d'evaluation. Le gain en confidentialite s'accompagne d'un cout operationnel permanent, et le modele que vous pouvez faire tourner est rarement celui que vous voudriez utiliser.",
      },
      {
        title: "La conformite n'attend pas",
        body: "Le RGPD, HIPAA et les regles de souverainete des donnees s'appliquent que votre stack ait ete concu avec elles ou non. Envoyer des donnees personnelles brutes a un tiers est une responsabilite que vous ne pouvez pas effacer apres coup, et cela soumet chaque decision produit ulterieure a une revue juridique.",
      },
    ],
  },
  howItWorks: {
    eyebrow: "Fonctionnement",
    title: "Une couche entre votre agent et le modele",
    tabs: { detect: "Detecter", anonymize: "Anonymiser", deanonymize: "Desanonymiser" },
    detectCaption:
      "piighost execute vos detecteurs sur le message et signale chaque donnee personnelle trouvee: noms, e-mails, identifiants, tout ce que le modele n'a pas besoin de voir. Les detections superposees de plusieurs detecteurs sont arbitrees par niveau de confiance avant tout remplacement.",
    anonymizeCaption:
      "Chaque donnee personnelle recoit un compteur stable cible sur son type. Les trois personnes de ce message deviennent",
    anonymizeCaptionTokens:
      "; les deux adresses e-mail distinctes deviennent",
    deanonymizeCaption:
      "Les appels d'outils recoivent les vraies valeurs, et la reponse finale est restituee avant d'atteindre l'utilisateur. Notez que le modele a ecrit",
    labels: {
      userMessage: "Message utilisateur",
      fromUser: "De l'utilisateur",
      llmSees: "Ce que voit le modele",
      llmResponse: "Reponse du modele",
      userSees: "Ce que voit l'utilisateur",
    },
  },
  detector: {
    eyebrow: "Oriente cas d'usage",
    title: "Chaque cas d'usage appelle son propre pipeline",
    description:
      "Il n'existe pas de detecteur universel pour les donnees personnelles. piighost vous fournit des blocs composables (detection, liaison, garde-fous de sortie) pour construire un pipeline adapte a vos donnees, votre budget de latence et vos regles de conformite.",
    items: [
      {
        title: "Conversationnel",
        body: "Support client, chat integre, transcriptions vocales. Reconnaissance d'entites nommees rapide pour les noms et lieux, expressions regulieres pour les e-mails et numeros de telephone, memoire par fil de discussion pour que la meme personne garde le meme jeton tout au long de la conversation.",
      },
      {
        title: "Traitement de documents",
        body: "Longs PDF, contrats, tickets de support. Le budget de latence est plus large, la precision prime. Un modele LLM comme detecteur sur les paragraphes difficiles, des expressions regulieres sur les champs structures, et un re-ancrage pour aligner les resultats avec le document source.",
      },
      {
        title: "Formulaires structures",
        body: "Charges utiles API, CSV, exports. Sous la milliseconde, deterministe, auditable. Un pipeline regex pur avec un ensemble de regles exhaustif, aucun modele dans la boucle, et un format de jeton que vos systemes aval peuvent analyser.",
      },
    ],
  },
  ecosystem: {
    eyebrow: "L'ecosysteme",
    title: "Une couche de confidentialite, de nombreux projets",
    description:
      "Commencez avec la bibliotheque. Ajoutez le serveur, la demo de chat et le correcteur au fur et a mesure de votre croissance.",
    moreToCome: "D'autres projets a venir.",
  },
  quickStart: {
    eyebrow: "Demarrage rapide",
    title: "Integrez-le dans un agent LangChain",
    description: "Ajoutez le middleware et votre code d'agent reste identique.",
  },
  cta: {
    title: "Deployez des fonctionnalites IA sans exposer les donnees utilisateurs",
    description:
      "Installez piighost, connectez votre detecteur et gardez les donnees personnelles hors du modele.",
    readTheDocs: "Lire la documentation",
    starOnGitHub: "Etoiler sur GitHub",
  },
  philosophy: {
    eyebrow: "Philosophie",
    title: "Pourquoi anonymiser ?",
    intro:
      "Un expose factuel sur la facon dont les modeles cloud traitent vos donnees, sur les protections juridiques et techniques en place (et celles qui manquent), et sur les raisons pour lesquelles anonymiser avant d'envoyer est le seul controle que vous exercez vous-meme.",
    sections: [
      {
        id: "how-cloud-llm-works",
        heading: "Comment fonctionne un modele cloud",
        paragraphs: [
          "Un modele comme ChatGPT, Claude ou Mistral Le Chat n'est pas un logiciel qui tourne sur votre ordinateur. C'est un service distant. Votre question quitte votre machine, traverse Internet, atteint les serveurs du fournisseur, y est traitee, et une reponse revient.",
          "L'interface peut etre locale, le modele ne l'est pas. Meme si vous utilisez une application de bureau, une extension de navigateur ou un plugin d'IDE, le modele n'est pas execute sur votre machine. Seule l'interface l'est. Le calcul se passe dans le cloud du fournisseur. Le terme \"LLM local\" designe exclusivement l'inference sur votre propre materiel, via des outils comme Ollama ou llama.cpp.",
          "Ce chemin a plusieurs consequences souvent sous-estimees :",
        ],
        list: [
          "Le message est recu en clair par l'infrastructure du fournisseur. Le chiffrement TLS protege le transit, pas la lecture cote serveur.",
          "Il est generalement journalise a des fins de facturation, de detection d'abus, de debogage et d'amelioration du modele.",
          "Il peut etre conserve pendant des semaines, des mois ou des annees, selon la politique du fournisseur et les obligations legales qui le lient.",
        ],
        subsections: [],
      },
      {
        id: "limits-of-contractual-promise",
        heading: "Les limites d'une promesse contractuelle",
        paragraphs: [
          "Partons de l'hypothese la plus favorable : les grands fournisseurs (OpenAI, Anthropic, Google, Mistral et autres) veulent sincerement proteger les donnees de leurs utilisateurs. Leurs politiques de confidentialite formalisent des engagements (\"nous n'utilisons pas vos donnees API pour l'entrainement\", \"nous supprimons apres 30 jours\", \"nous rejetons les requetes abusives\"), et ces engagements sont generalement respectes.",
          "Ce n'est pas suffisant, car un engagement contractuel peut tomber pour trois raisons distinctes, aucune d'elles ne relevant de la mauvaise foi du fournisseur.",
        ],
        subsections: [
          {
            heading: "Un incident technique, un bug ou une attaque",
            paragraphs: [
              "Aucune politique ne protege contre une erreur d'ingenierie ou une intrusion reussie. Deux cas suffisent a illustrer le propos.",
              "Le 20 mars 2023, un bug dans la bibliotheque Redis utilisee par OpenAI a expose les titres des conversations ChatGPT a d'autres utilisateurs pendant environ neuf heures. Pour environ 1,2 % des abonnes ChatGPT Plus actifs pendant cette periode, des informations de paiement partielles (nom, e-mail, quatre derniers chiffres de la carte, date d'expiration) etaient egalement visibles par des comptes tiers. OpenAI a publie un post-mortem public reconnaissant l'incident.",
              "En janvier 2025, des chercheurs de Wiz Research ont decouvert qu'une base de donnees ClickHouse de DeepSeek etait accessible sur Internet sans authentification. Plus d'un million de lignes de journaux etaient exposees, incluant des historiques de conversations, des cles API et des metadonnees d'infrastructure interne.",
              "Dans les deux cas, les donnees ont fuite sans proces, sans injonction et sans intention malveillante de la part de l'entreprise. Un bug, une configuration manquante, et le perimetre contractuel perd son sens.",
            ],
          },
          {
            heading: "L'utilisation de vos donnees pour l'entrainement",
            paragraphs: [
              "\"Si c'est gratuit, vous etes le produit.\" Le vieil adage du web commercial s'applique aussi aux modeles LLM. Faire tourner l'inference sur un grand modele est couteux : chaque reponse mobilise des GPU en temps reel et le fournisseur paye cette facture a chaque requete. Pourtant, OpenAI, Google et d'autres offrent des paliers gratuits tres genereux. Les raisons commerciales classiques (acquisition d'utilisateurs, effets de standard de facto) n'expliquent qu'une partie de ce modele economique. Ces paliers gratuits alimentent aussi la collecte de donnees d'entrainement.",
              "Sur les paliers gratuits grand public, vos conversations peuvent servir a ameliorer le modele de plusieurs facons : les retours explicites (pouce haut ou bas, reformulation, regeneration) servent de signal d'apprentissage par renforcement, les echanges peuvent etre examines par des annotateurs humains pour identifier les modes d'echec, et le corpus complet de conversations peut servir de matiere premiere pour construire les jeux de donnees des iterations suivantes.",
              "Les offres payantes (API, ChatGPT Enterprise, Claude Team, etc.) excluent generalement vos donnees de l'entrainement par defaut. Sur les paliers gratuits, en revanche, la desactivation est souvent enfouie dans les parametres, parfois desactivee par defaut, et la politique peut evoluer au fil du temps.",
            ],
          },
          {
            heading: "Une injonction judiciaire",
            paragraphs: [
              "Meme quand le fournisseur souhaite supprimer vos donnees, un tribunal peut l'en empecher.",
              "Le 13 mai 2025, dans le cadre de son action en justice contre OpenAI, le New York Times a obtenu du magistrat Ona T. Wang une ordonnance de conservation : OpenAI etait tenu de conserver toutes les conversations ChatGPT et tous les appels API de ses clients, y compris ceux que l'entreprise aurait normalement supprimes selon sa propre politique. OpenAI s'est oppose publiquement a l'ordonnance en deposant une demande de reexamen, rejetee dans un premier temps, puis en faisant appel aupres du juge de district Sidney Stein, qui a rejete l'appel en juin 2025. L'ordonnance a finalement ete levee le 26 septembre 2025 (cloture formelle le 9 octobre), les utilisateurs de l'EEE, de Suisse et du Royaume-Uni ayant ete exemptes de la mesure.",
              "L'affaire n'en est pas restee la. Le 7 novembre 2025, le meme magistrat a ordonne a OpenAI de remettre 20 millions de journaux ChatGPT depersonnalises au New York Times comme elements de preuve. OpenAI a depose une demande de reexamen, rejetee, puis a fait appel. Le 5 janvier 2026, le juge de district Stein a confirme la decision, entrinant l'obligation de remise.",
              "Cet episode a deux consequences pratiques. D'abord, la politique de confidentialite d'un fournisseur n'est jamais definitive : une decision judiciaire a laquelle vous n'etes pas partie peut la remettre en cause, forcer la conservation ou contraindre la remise massive de conversations a un tiers. Ensuite, la fenetre d'exposition de vos donnees a une fuite ou une attaque future augmente mecaniquement, et avec elle la probabilite qu'une autorite publique (americaine ou, via commission rogatoire internationale, etrangere) y accede.",
            ],
          },
        ],
      },
      {
        id: "legal-not-enough",
        heading: "Juridique : le droit ne suffit pas non plus",
        paragraphs: [
          "La reaction instinctive face a ce tableau technique est de se tourner vers le droit : choisir un fournisseur \"conforme RGPD\", verifier les certifications, exiger des clauses contractuelles. Cette approche est utile mais incomplete, pour deux raisons : le droit americain prevoit des voies d'acces legales aux donnees, et le droit europeen n'a pas encore produit de garantie eprouvee appliquee aux modeles LLM.",
        ],
        subsections: [
          {
            heading: "Le cadre americain : CLOUD Act, FISA 702, decret executif 12333",
            paragraphs: [
              "Trois textes structurent l'acces americain aux donnees des fournisseurs, et aucun d'eux n'est le Patriot Act. Le Patriot Act (2001) revient souvent dans ce debat, mais ce n'est plus le bon texte a citer. Sa disposition de surveillance la plus connue, la section 215, a ete restreinte par le USA FREEDOM Act en 2015, puis laissee expirer par le Congres en mars 2020.",
            ],
            list: [
              "Le CLOUD Act (2018) oblige tout fournisseur sous juridiction americaine a remettre les donnees qu'il controle, quel que soit le lieu de stockage physique. Un centre de donnees en Irlande ou en France ne met pas les donnees hors d'atteinte des lors que l'entreprise est americaine.",
              "FISA section 702 est le fondement juridique des programmes de surveillance de masse comme PRISM, reveles en 2013 par Edward Snowden. Il permet la collecte de communications via les grands fournisseurs americains.",
              "Le decret executif 12333 est le cadre general de la surveillance par l'executif americain, sans supervision judiciaire directe.",
            ],
          },
          {
            heading: "Schrems II : la CJUE tranche",
            paragraphs: [
              "En juillet 2020, la Cour de justice de l'Union europeenne a invalide le Privacy Shield, l'accord qui encadrait les transferts de donnees entre l'UE et les Etats-Unis. Son raisonnement, en resume : FISA 702 et le decret executif 12333 sont trop permissifs pour etre compatibles avec le RGPD et n'offrent aucun recours judiciaire effectif aux citoyens europeens. Plus de 5 300 entreprises s'appuyaient sur le Privacy Shield pour leurs transferts transatlantiques. Un second accord, le Data Privacy Framework (2023), l'a remplace, mais il repose sur les memes bases juridiques americaines et sa durabilite est contestee.",
            ],
          },
          {
            heading: "Microsoft Irlande : la juridiction prime sur la geographie",
            paragraphs: [
              "Entre 2013 et 2018, les autorites americaines ont exige de Microsoft, via un mandat emis en vertu du Stored Communications Act, la remise des donnees d'un client stockees sur ses serveurs en Irlande. Microsoft a resiste jusqu'a la Cour supreme. La procedure n'a jamais ete tranchee sur le fond, car le Congres a adopte le CLOUD Act en mars 2018 pour clarifier la reponse : oui, les entreprises americaines doivent produire les donnees ou qu'elles soient stockees.",
              "Consequence directe : l'hebergement europeen par un fournisseur americain n'offre aucune etancheite juridique vis-a-vis des Etats-Unis. Le marketing \"vos donnees restent en Europe\" masque cette asymetrie.",
            ],
          },
          {
            heading: "Le cadre europeen : un RGPD qui n'a pas encore resiste sur les LLM",
            paragraphs: [
              "Le RGPD reste un outil solide sur le papier, mais son application aux modeles LLM est balbutiante. Le Garante, l'autorite italienne de protection des donnees, a ouvert une enquete contre OpenAI des mars 2023. En decembre 2024, il a inflige une amende de 15 millions d'euros a OpenAI pour traitement sans base legale, manques a la transparence et absence de mecanisme de verification de l'age. Mais en mars 2026, le tribunal de Rome a annule cette decision dans son integralite. A ce jour, aucune autorite europeenne n'a obtenu une sanction definitive contre un grand fournisseur de LLM pour une violation du RGPD liee a la phase de collecte pour l'entrainement.",
            ],
          },
        ],
      },
      {
        id: "secondary-uses",
        heading: "Usages secondaires : ce que permettent les donnees collectees",
        paragraphs: [
          "Les sections precedentes expliquent comment les donnees quittent votre perimetre. Il reste a preciser ce qu'elles permettent une fois collectees. Trois usages, inegalement documentes, meritent d'etre distingues pour ne pas confondre un risque structurel avec une pratique avere.",
        ],
        subsections: [
          {
            heading: "Surveillance de masse",
            paragraphs: [
              "Une conversation avec un modele LLM ressemble techniquement a un e-mail ou a un chat : texte horodate, rattache a un compte identifiable. Elle releve du meme perimetre de collecte que les autres communications electroniques couvertes par FISA 702, renouvele pour deux ans en avril 2024 par RISAA, et dont le renouvellement est de nouveau en debat au Congres en avril 2026. Des rapports declassifies du PCLOB documentent plusieurs centaines de milliers de selecteurs (identifiants cibles) actifs chaque annee, et la collecte \"a propos de\" (suspendue en 2017, puis reautori-see) elargit mecaniquement le perimetre aux communications qui ne sont ni envoyees par ni a destination de la cible, mais qui la mentionnent.",
            ],
          },
          {
            heading: "Profilage et ciblage politique",
            paragraphs: [
              "La preoccupation n'est pas speculative ; elle repose sur des cas documentes de surveillance ciblee dans d'autres couches d'Internet.",
            ],
            list: [
              "Angela Merkel, octobre 2013 : les revelations Snowden documentent la surveillance par la NSA du telephone portable de la chanceliere allemande, inscrite comme cible depuis 2002.",
              "Associated Press, 2012-2013 : le ministere de la Justice a saisi secretement en avril-mai 2012 les relevs de plus de vingt lignes telephoniques de l'AP, dans le cadre d'une enquete sur des fuites.",
              "Pegasus / NSO, 2021 : le collectif Forbidden Stories documente l'utilisation du logiciel espion Pegasus contre environ 180 journalistes cibles, ainsi que des militants, avocats, diplomates et chefs d'Etat dans plus de 20 pays.",
            ],
          },
          {
            heading: "Ciblage commercial et courtiers en donnees",
            paragraphs: [
              "Le risque est different des deux precedents : il ne necessite ni juge ni mandat. Il repose sur l'ecosysteme commercial qui entoure les fournisseurs, et se deroule en trois etapes.",
              "D'abord, une structure d'incitation. Plusieurs grands acteurs du secteur LLM ont des interets adjacents dans la publicite ciblee : Google en fait son metier principal, Microsoft (actionnaire majeur d'OpenAI) exploite Bing Ads, Meta pousse son propre ecosysteme d'IA generative au sein d'un groupe dont la quasi-totalite des revenus provient du ciblage publicitaire.",
              "Ensuite, l'etat actuel des preuves. Il n'existe aucune preuve aujourd'hui qu'un fournisseur ait revendu des conversations LLM a des courtiers en donnees. L'argument repose donc non sur une pratique averee mais sur un risque structurel : des donnees entrant dans un systeme, detenues par un acteur qui a un interet economique a les exploiter, peuvent ulterieurement sortir par des canaux qui ne sont pas ceux initialement annonces.",
              "Enfin, la porosite documentee entre l'ecosysteme publicitaire et la surveillance. Un rapport du directeur du renseignement national date de janvier 2022 et declassifie en juin 2023 reconnait que les agences de renseignement americaines achetent regulierement des donnees commerciales aupres de courtiers en donnees, notamment des donnees de localisation et de navigation. Ce qui est collecte pour vendre de la publicite peut donc etre rachete pour surveiller, sans mandat ni notification.",
            ],
          },
          {
            heading: "Pourquoi l'anonymisation brise ce graphe",
            paragraphs: [
              "Une donnee personnelle envoyee en clair devient un noeud dans un graphe potentiel : elle peut etre croisee avec des reseaux sociaux, des violations anterieures, des registres publics ou des bases de donnees commerciales, pour re-identifier, enrichir ou cibler. Un jeton de remplacement n'a aucune valeur d'agregation. Anonymiser avant d'envoyer coupe la racine commune de chacune des chaines d'usage secondaire decrites ci-dessus.",
            ],
          },
        ],
      },
      {
        id: "provider-spectrum",
        heading: "Ou se positionner sur le spectre des fournisseurs ?",
        paragraphs: [
          "Le choix n'est pas binaire entre \"cloud americain\" et \"rien\". Il existe un continuum, du plus expose au plus isole, et chaque etape modifie a la fois le risque juridique et la responsabilite qui vous incombe.",
        ],
        table: {
          headers: ["Option", "CLOUD Act / FISA 702", "RGPD", "Acces technique du fournisseur", "Entrainement sur vos donnees"],
          rows: [
            ["Fournisseur US, serveurs US", "Oui, directement", "Indirect, via DPF, fragile", "Oui", "Variable"],
            ["Fournisseur US, serveurs UE", "Oui (cf. Microsoft Irlande)", "S'applique, mais supplan.", "Oui", "Exclu par defaut sur les offres entreprise"],
            ["Fournisseur UE", "Non (sauf filiale US)", "S'applique pleinement", "Oui", "Exclu par defaut sur les offres payantes"],
            ["Modele local (auto-heberge)", "Non", "Vous en etes responsable", "Non : vous etes le fournisseur", "Non : vous le controlez"],
          ],
        },
        subsections: [
          {
            heading: "",
            paragraphs: [
              "A une extremite du spectre, un fournisseur americain heberg aux Etats-Unis cumule les trois risques : le CLOUD Act, FISA 702 et le decret 12333 s'appliquent sans filtre, les transferts depuis l'UE reposent sur le Data Privacy Framework conteste, et une decision judiciaire americaine peut imposer la conservation indefinie des conversations.",
              "Deplacer physiquement les serveurs en Europe ne change presque rien juridiquement. Des lors que l'entite exploitante est sous juridiction americaine, le CLOUD Act s'applique independamment de la localisation des disques durs.",
              "Changer de juridiction en passant a un fournisseur europeen (Mistral, OVHcloud AI, Scaleway, Aleph Alpha) supprime par defaut le risque CLOUD Act, sauf si le fournisseur possede une filiale americaine sous controle. Le RGPD s'applique pleinement et les autorites europeennes peuvent sanctionner. Cela ne rend pas le fournisseur aveugle au contenu : il conserve un acces technique complet, la protection reste contractuelle et etatique.",
              "Enfin, faire tourner le modele en local sur votre propre infrastructure (Ollama, vLLM, llama.cpp ou equivalent) supprime entierement le tiers : aucun fournisseur n'a acces technique au contenu, par construction. C'est la protection maximale sur le plan de la confidentialite. La contrepartie est que toute la responsabilite vous incombe : securite physique et logique, chiffrement au repos, gestion des acces, mises a jour, journalisation.",
              "Le choix du fournisseur reste important pour de nombreux aspects : latence, cout, qualite du modele, conformite RGPD globale, ecosysteme d'integration. Mais pour le risque specifique de fuite de donnees personnelles, l'anonymisation neutralise ce choix. Si seuls des jetons de remplacement quittent votre infrastructure, un fournisseur americain ne recoit rien d'exploitable sur vos donnees sensibles.",
            ],
          },
        ],
      },
      {
        id: "sectoral-obligations",
        heading: "Obligations sectorielles et choix deja faits",
        paragraphs: [],
        subsections: [
          {
            heading: "Quand c'est une obligation legale",
            paragraphs: [
              "Dans plusieurs professions, envoyer des donnees personnelles a un modele LLM non souverain n'est pas une question de commodite, c'est une impossibilite reglementaire.",
            ],
            list: [
              "Finance : MiFID II, secret bancaire, obligations de confidentialite client.",
              "Avocats : secret professionnel absolu (article 66-5 de la loi du 31 decembre 1971). Une consultation client envoyee brute et identifiable a un modele LLM americain peut constituer une faute deontologique.",
              "Medecine : secret medical (article L.1110-4 du Code de la sante publique), HIPAA aux Etats-Unis. Un dossier patient ne peut pas transiter par un service tiers sans garanties techniques importantes.",
              "Defense et secteurs strategiques : regimes specifiques (classification, CUI aux Etats-Unis, Diffusion Restreinte en France).",
            ],
          },
          {
            heading: "Ce que les grandes entreprises ont deja decide",
            paragraphs: [
              "En l'absence de protection technique disponible en 2023, plusieurs grands groupes ont simplement interdit a leurs employes d'utiliser des modeles LLM dans le cloud.",
            ],
            list: [
              "Samsung, avril 2023 : plusieurs incidents internes ou des ingenieurs avaient colle du code source et des notes de reunion dans ChatGPT. En mai 2023, l'entreprise a interdit l'usage de LLM generatifs sur les appareils professionnels.",
              "Secteur bancaire americain, printemps 2023 : JPMorgan Chase, Bank of America, Citigroup, Goldman Sachs, Deutsche Bank et Wells Fargo ont bloque ou restreint l'usage de ChatGPT pour leurs employes.",
            ],
          },
        ],
      },
      {
        id: "legal-vs-technical",
        heading: "Protection juridique contre protection technique",
        paragraphs: [
          "Toutes les protections mobilisees jusqu'ici reposent sur des instruments juridiques : politiques de confidentialite, clauses contractuelles types, accords internationaux, amendes administratives. Elles partagent un defaut commun : elles sont revocables, par une decision politique ou judiciaire sur laquelle vous n'avez aucun levier.",
        ],
        table: {
          headers: ["Type de protection", "Exemple", "Pourquoi c'est fragile"],
          rows: [
            ["Promesse contractuelle", "\"Nous ne lisons pas vos donnees\"", "Contournable par injonction (NYT c. OpenAI)"],
            ["Clauses contractuelles types", "Transferts UE vers US", "Deja affaiblies par Schrems II"],
            ["Accord international", "Privacy Shield, DPF", "Le premier invalide, le second conteste"],
            ["Reglementation regionale", "RGPD", "Lente a produire des sanctions effectives sur les LLM"],
            ["Hebergement regional", "\"Centres de donnees en Europe\"", "Neutralise par le CLOUD Act si le fournisseur est americain"],
          ],
        },
        subsections: [
          {
            heading: "",
            paragraphs: [
              "La protection technique fonctionne differemment. Si les donnees personnelles ne quittent jamais votre infrastructure et qu'un simple jeton est envoye au modele :",
            ],
            list: [
              "aucune injonction ne peut contraindre un tiers a divulguer ce qu'il ne detient pas,",
              "aucune modification d'un accord international ne vous affecte,",
              "aucune politique de conservation d'un fournisseur n'est en jeu,",
              "le fournisseur peut etre pirate, rachete ou disparaitre : vos donnees n'etaient pas la.",
            ],
          },
          {
            heading: "",
            paragraphs: [
              "C'est la difference entre \"nous promettons de ne pas regarder\" et \"nous sommes techniquement incapables de regarder\". La seconde est toujours plus solide que la premiere.",
            ],
          },
        ],
      },
      {
        id: "what-anonymization-does-not-solve",
        heading: "Ce que l'anonymisation ne resout pas",
        paragraphs: [
          "L'anonymisation est une couche dans une posture de defense en profondeur, pas une solution miracle.",
        ],
        list: [
          "Elle ne rend pas un modele LLM conforme a tous les regimes reglementaires. Certaines donnees (donnees de sante identifiables par liaison, materiaux classes defense) ne doivent pas quitter l'infrastructure, meme sous forme anonymisee.",
          "Elle depend de la qualite du detecteur. Une donnee personnelle non detectee passe en clair. C'est une contrainte d'ingenierie, pas un defaut conceptuel.",
          "Elle ne remplace pas les autres bonnes pratiques : chiffrement au repos, journalisation auditee, gestion des acces, formation des equipes.",
        ],
      },
    ],
  },
};

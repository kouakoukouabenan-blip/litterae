// Formation à la dissertation : un parcours d'étapes, chacune consacrée à un seul geste de la copie.
// Chaque étape : Comprendre (explication), Exemples (tirés des sujets corrigés), S'entraîner
// (questions à choix corrigées tout de suite) et Défi (rédaction libre sur un sujet de la banque, sans correction).
// Les trois premières étapes sont gratuites et dans ce fichier ; le contenu des suivantes arrive du serveur avec la clé
// d'accès (contenu payant, comme les sujets corrigés).

/** Morceau d'explication. */
export type BlocFormation =
  | { p: string }
  | { h: string }
  | { liste: string[] }
  | { etapes: [string, string][] }
  | { def: [string, string][] }
  | { regle: string }
  | { piege: string };

/** Exemple travaillé à partir d'un sujet corrigé. */
export interface ExempleFormation {
  sujet: string;
  auteur: string;
  /** Raisonnement, dans l'ordre. */
  demarche: string[];
  reponse: string;
}

/** Question à choix : la première proposition est la bonne (l'ordre est mélangé à l'écran). */
export interface QuestionFormation {
  sujet?: string;
  auteur?: string;
  q: string;
  choix: string[];
  indice: string;
  pourquoi: string;
}

export interface EtapeFormation {
  id: string;
  num: number;
  titre: string;
  /** Une ligne sous le titre, dans le parcours. */
  court: string;
  gratuite: boolean;
  /** Contenu des étapes gratuites ; celui des étapes payantes arrive du serveur avec la clé d'accès. */
  contenu?: {
    explication: BlocFormation[];
    exemples: ExempleFormation[];
    questions: QuestionFormation[];
    defi: { consigne: string; sujets: string[]; grille: string[] };
    bilan: { appris: string; importance: string };
  };
}

const QUESTION_THEME = "Quel est le thème de ce sujet ?";
const QUESTION_THESE = "Quelle est la thèse de l'auteur ?";
const QUESTION_FONCTION = "Quelle fonction l'auteur donne-t-il à la littérature ?";

export const ETAPES: EtapeFormation[] = [
  {
    id: "theme", num: 1, titre: "Trouver le thème", court: "De quoi parle l'auteur ?", gratuite: true,
    contenu: {
      explication: [
        { p: "Le thème, c'est **ce dont parle l'auteur** du sujet. En dissertation littéraire, c'est toujours un élément de la littérature." },
        { regle: "Le thème n'est pas une opinion. Il ne dit rien de vrai ou de faux : il dit seulement de quoi on parle." },
        { h: "Les thèmes possibles" },
        { liste: [
          "**Celui qui écrit** : l'écrivain, le poète, le romancier, le dramaturge, l'artiste.",
          "**Ce qu'il produit** : la littérature, l'écriture, l'œuvre, le livre.",
          "**Un genre** : le roman, la poésie, le théâtre.",
          "**Celui qui lit** : le lecteur, la lecture.",
          "**Un élément de l'œuvre** : le personnage."
        ] },
        { h: "La méthode en trois gestes" },
        { etapes: [
          ["Qui parle ?", "C'est l'auteur de la citation, écrit entre parenthèses ou après un tiret."],
          ["De quoi parle-t-il ?", "Cherche dans la citation le mot qui désigne un élément de la littérature. C'est ton thème."],
          ["Vérifie", "Ton thème tient en deux à quatre mots et commence par un article : « Le roman », « La poésie », « L'écrivain »."]
        ] },
        { piege: "Ne confonds pas le thème et la fonction. « L'engagement », « l'évasion », « la beauté » ne sont pas des thèmes : ce sont des fonctions. Tu les verras à l'étape 3." },
        { piege: "Ne prends pas le premier nom venu. Dans « L'imagination n'est plus la qualité maîtresse du romancier », l'auteur parle du **romancier**. L'imagination, c'est ce qu'il dit de lui." },
        { piege: "Les images cachent parfois le thème. Quand Musset écrit « Les plus désespérés sont les chants les plus beaux », les « chants » sont des poèmes : le thème est **la poésie**." }
      ],
      exemples: [
        {
          sujet: "Écrire, ce n'est pas faire du bien, c'est faire de l'art.", auteur: "Un auteur",
          demarche: [
            "Qui parle ? Un auteur, c'est-à-dire un écrivain.",
            "De quoi parle-t-il ? Du fait d'écrire : le premier mot est « Écrire ».",
            "« Faire du bien » et « faire de l'art » disent ce qu'est l'écriture pour lui : c'est déjà son opinion, pas le thème."
          ],
          reponse: "L'écriture"
        },
        {
          sujet: "Une littérature existe dans une société donnée ; elle en reçoit l'empreinte et, en retour, lui imprime une direction.", auteur: "Roger Caillot",
          demarche: [
            "Qui parle ? Roger Caillot, un critique.",
            "De quoi parle-t-il ? « Une littérature » est le sujet des deux parties de la phrase : « elle en reçoit », « lui imprime ».",
            "« La société » est importante, mais elle n'est pas un élément de la littérature : elle fait partie de ce que l'auteur dit de la littérature."
          ],
          reponse: "La littérature"
        },
        {
          sujet: "L'écrivain est le bâton de l'aveugle, sans l'écrivain le monde évoluerait vers la soumission et l'acquiescement.", auteur: "Michelet",
          demarche: [
            "Qui parle ? Michelet, un historien.",
            "De quoi parle-t-il ? Le mot « écrivain » revient deux fois.",
            "« Le bâton de l'aveugle » est une image : elle dit le rôle de l'écrivain, elle n'est pas le thème."
          ],
          reponse: "L'écrivain"
        }
      ],
      questions: [
        { sujet: "Le roman, c'est la vie, c'est du réel devenu langage.", auteur: "Sujet de BAC blanc", q: QUESTION_THEME,
          choix: ["Le roman", "La vie", "Le langage", "La réalité"],
          indice: "Regarde le tout premier mot de la citation.",
          pourquoi: "L'auteur parle du roman. « La vie » et « le langage » disent ce qu'est le roman pour lui : ils font partie de son opinion." },
        { sujet: "La poésie n'a pas d'autre but qu'elle-même.", auteur: "Charles Baudelaire", q: QUESTION_THEME,
          choix: ["La poésie", "Le but de la vie", "L'esthétique", "Le poète"],
          indice: "Le poète n'est pas nommé dans la phrase.",
          pourquoi: "La phrase parle de la poésie. « L'esthétique » est une fonction, pas un thème, et le poète n'est pas nommé." },
        { sujet: "Le mot comprendre n'existe pas au théâtre. Le vrai public ne comprend pas, il ressent. Le théâtre n'est pas un théorème mais un spectacle.", auteur: "Jean Giraudoux", q: QUESTION_THEME,
          choix: ["Le théâtre", "Le public", "La compréhension", "Le théorème"],
          indice: "Quel mot revient deux fois ?",
          pourquoi: "Le mot « théâtre » revient deux fois et toute la citation dit ce qu'il est. Le public n'est qu'une partie de l'explication." },
        { sujet: "L'imagination n'est plus la qualité maîtresse du romancier.", auteur: "Émile Zola", q: QUESTION_THEME,
          choix: ["Le romancier", "L'imagination", "La qualité", "Le rêve"],
          indice: "L'imagination est une qualité. Une qualité de qui ?",
          pourquoi: "Le premier mot n'est pas toujours le thème. Zola parle du romancier ; l'imagination est ce qu'il dit de lui." },
        { sujet: "Le personnage du roman n'est pas une simulation de l'être vivant. C'est un être imaginé, un ego expérimental.", auteur: "Milan Kundera", q: QUESTION_THEME,
          choix: ["Le personnage de roman", "L'être vivant", "La simulation", "L'expérience"],
          indice: "Cherche l'élément d'une œuvre dont parle la phrase.",
          pourquoi: "Kundera parle du personnage de roman. Tout le reste dit ce qu'il est, ou ce qu'il n'est pas." },
        { sujet: "Faire de la littérature, c'est s'armer pour se faire l'écho de ceux qui n'ont pas de voix.", auteur: "Rachida Brakni", q: QUESTION_THEME,
          choix: ["La littérature", "Les armes", "L'engagement", "Les opprimés"],
          indice: "« L'engagement » est un piège : c'est une fonction.",
          pourquoi: "On parle de la littérature. Les armes et les opprimés font partie de l'opinion ; l'engagement est la fonction (étape 3)." },
        { sujet: "L'écrivain est un artiste, un producteur de beau. C'est un créateur de la parole artistique.", auteur: "Bottey Zadi Zaourou", q: QUESTION_THEME,
          choix: ["L'écrivain", "L'artiste", "La beauté", "La parole"],
          indice: "« Artiste » dit ce qu'il est. Qui est-il ?",
          pourquoi: "Zadi Zaourou parle de l'écrivain. « Artiste » et « producteur de beau » sont ce qu'il affirme de lui." },
        { sujet: "On lit des romans parce qu'on s'ennuie, parce qu'on a envie de s'amuser.", auteur: "James Riley", q: QUESTION_THEME,
          choix: ["La lecture du roman", "L'ennui", "L'amusement", "L'évasion"],
          indice: "Que fait « on » dans cette phrase ?",
          pourquoi: "La phrase parle du fait de lire des romans. L'ennui et l'amusement sont les raisons données : c'est l'opinion." },
        { sujet: "J'écris pour dire que la lâche sérénité des silencieux garantit la victoire des injustes.", auteur: "Fatou Diome", q: QUESTION_THEME,
          choix: ["L'écriture", "Le silence", "L'injustice", "La victoire"],
          indice: "Quel est le premier verbe de la phrase ?",
          pourquoi: "« J'écris » : la romancière parle de son acte d'écrire. Le silence et l'injustice sont ce qu'elle veut dénoncer." },
        { sujet: "Les plus désespérés sont les chants les plus beaux.", auteur: "Alfred de Musset", q: QUESTION_THEME,
          choix: ["La poésie", "Le désespoir", "La beauté", "La musique"],
          indice: "Musset est poète. Que sont ses « chants » ?",
          pourquoi: "Chez un poète, les « chants » sont des poèmes : le thème est la poésie. Le désespoir et la beauté sont l'opinion." },
        { sujet: "Tous les poètes sont engagés ; ils doivent être des révolutionnaires, non pas en maniant des bombes, mais par leur désir de changer le monde, de l'améliorer.", auteur: "Gilles Vigneault", q: QUESTION_THEME,
          choix: ["Le poète", "La révolution", "Les bombes", "Le monde"],
          indice: "De qui dit-on qu'ils sont « engagés » ?",
          pourquoi: "Toute la phrase parle des poètes. La révolution et les bombes servent à expliquer ce qu'ils doivent être." },
        { sujet: "L'univers de la littérature, c'est l'univers de la fiction : les espaces, les personnages… Tout est inventé.", auteur: "Un scientiste", q: QUESTION_THEME,
          choix: ["La littérature", "La fiction", "Les personnages", "L'invention"],
          indice: "« La fiction » dit ce qu'est l'univers de… quoi ?",
          pourquoi: "On parle de la littérature. « La fiction » est ce que l'auteur affirme d'elle ; les personnages ne sont qu'un exemple." }
      ],
      defi: {
        consigne: "Écris le thème de ce sujet. Puis explique en une phrase comment tu l'as trouvé.",
        sujets: ["t2", "t9", "t18", "t21", "t29", "t39", "t46", "t52"],
        grille: [
          "Mon thème est un élément de la littérature (écrivain, œuvre, genre, lecteur…).",
          "Il tient en deux à quatre mots et commence par un article.",
          "Ce n'est ni une fonction (engagement, évasion…) ni une opinion."
        ]
      },
      bilan: {
        appris: "Le thème est l'élément de la littérature dont parle l'auteur. Tu le trouves en te demandant : qui parle ? de quoi parle-t-il ?",
        importance: "Toute ta copie parle de ce thème. Si tu te trompes ici, tu sors du sujet dès l'introduction."
      }
    }
  },
  {
    id: "these", num: 2, titre: "Trouver la thèse", court: "Que dit l'auteur de son thème ?", gratuite: true,
    contenu: {
      explication: [
        { p: "La thèse, c'est **l'opinion de l'auteur sur le thème** : ce qu'il affirme. C'est elle que tu vas expliquer, puis discuter." },
        { regle: "Le thème est un nom (« Le roman »). La thèse est une phrase qui affirme quelque chose (« Le roman, c'est la vie »). On peut être d'accord ou non avec une thèse, jamais avec un thème." },
        { h: "Les trois morceaux d'un sujet" },
        { def: [
          ["Le contexte", "Qui parle et dans quelles circonstances : « À ceux qui lui reprochaient… un auteur a répondu ». Il aide à comprendre, mais ce n'est pas la thèse."],
          ["La citation", "Le texte entre guillemets. **C'est là qu'est la thèse.**"],
          ["La consigne", "Le travail demandé : « Expliquez et discutez », « Commentez »… Ce n'est jamais la thèse."]
        ] },
        { h: "La méthode" },
        { etapes: [
          ["Barre la consigne", "Expliquez, commentez, discutez, justifiez… : c'est le travail à faire, pas une idée."],
          ["Mets le contexte de côté", "Garde-le pour comprendre qui parle, puis concentre-toi sur la citation."],
          ["Cherche l'affirmation", "Si la citation est courte, c'est la thèse entière. Si elle est longue, cherche la phrase qui dit ce qu'est le thème, ou ce qu'il doit faire."],
          ["Vérifie", "Ta thèse répond à la question : « Que dit l'auteur du thème ? »"]
        ] },
        { piege: "Dans une citation longue, les images et les précisions ne sont pas la thèse. Chez Vigneault, « non pas en maniant des bombes » précise ; la thèse est : **tous les poètes sont engagés, ils veulent changer le monde**." },
        { piege: "Lis les négations avec soin. « L'imagination n'est plus la qualité maîtresse du romancier » ne dit pas que le romancier n'a pas d'imagination : elle n'est plus sa qualité **principale**." }
      ],
      exemples: [
        {
          sujet: "À ceux qui lui reprochaient son indifférence aux problèmes de son temps, un auteur a répondu : « Écrire, ce n'est pas faire du bien, c'est faire de l'art. » Expliquez et discutez cette affirmation.", auteur: "Sujet complet",
          demarche: [
            "La consigne : « Expliquez et discutez cette affirmation. » On la barre.",
            "Le contexte : on reprochait à l'auteur de ne pas s'occuper des problèmes de son temps. Cela aide à comprendre sa réponse.",
            "La citation : « Écrire, ce n'est pas faire du bien, c'est faire de l'art. » Elle est courte : c'est la thèse entière."
          ],
          reponse: "Écrire, ce n'est pas faire du bien, c'est faire de l'art."
        },
        {
          sujet: "Le mot comprendre n'existe pas au théâtre. Le vrai public ne comprend pas, il ressent. Le théâtre n'est pas un théorème mais un spectacle.", auteur: "Jean Giraudoux",
          demarche: [
            "Le thème : le théâtre.",
            "Trois phrases disent la même idée de trois façons : on ne « comprend » pas le théâtre, on le « ressent ».",
            "La dernière phrase la résume le mieux : un spectacle s'oppose à un théorème, qu'on démontre."
          ],
          reponse: "Le théâtre n'est pas un théorème mais un spectacle : le public ne le comprend pas, il le ressent."
        },
        {
          sujet: "Être poète, de nos jours, c'est vouloir de toutes ses forces, de toute son âme, et de toute sa chair, face aux fusils, face à l'argent qui lui aussi devient un fusil, et surtout face à la vérité reçue […] qu'aucun visage de la réalité humaine ne soit poussé sous le silence de l'histoire.", auteur: "Sony Labou Tansi",
          demarche: [
            "Le thème : le poète (« Être poète »).",
            "« De toutes ses forces, de toute son âme… » insiste ; « face aux fusils, face à l'argent » montre les dangers. Ce sont des précisions.",
            "Le cœur de la phrase : « Être poète, c'est vouloir qu'aucun visage de la réalité humaine ne soit poussé sous le silence. »"
          ],
          reponse: "Être poète, c'est refuser, malgré les dangers, qu'aucune réalité humaine soit réduite au silence."
        }
      ],
      questions: [
        { sujet: "À ceux qui lui reprochaient son indifférence aux problèmes de son temps, un auteur a répondu : « Écrire, ce n'est pas faire du bien, c'est faire de l'art. » Expliquez et discutez cette affirmation.", q: "Quelle partie du sujet contient la thèse ?",
          choix: ["« Écrire, ce n'est pas faire du bien, c'est faire de l'art. »", "Expliquez et discutez cette affirmation.", "À ceux qui lui reprochaient son indifférence aux problèmes de son temps", "Un auteur a répondu"],
          indice: "La thèse est toujours dans la citation.",
          pourquoi: "La thèse est dans la citation, entre guillemets. Le début est le contexte, la fin est la consigne." },
        { q: "Laquelle de ces propositions est une thèse ?",
          choix: ["Le roman est un miroir de la société.", "Le roman", "Le roman et la société", "Le miroir du roman"],
          indice: "Une thèse est une phrase qui affirme quelque chose.",
          pourquoi: "Seule la première affirme quelque chose, avec un verbe. Les autres sont des noms : au mieux, des thèmes." },
        { sujet: "La littérature doit servir au peuple. Une œuvre littéraire dépourvue de toute fonction sociale est inutile. Commentez cette affirmation en vous basant sur des œuvres lues ou étudiées.", q: "Quelle partie est la consigne, à barrer ?",
          choix: ["Commentez cette affirmation en vous basant sur des œuvres lues ou étudiées.", "La littérature doit servir au peuple.", "Une œuvre littéraire dépourvue de toute fonction sociale est inutile.", "Une œuvre littéraire"],
          indice: "La consigne commence par un verbe qui donne un ordre.",
          pourquoi: "« Commentez… » dit le travail à faire. Les deux premières phrases sont la citation : elles portent la thèse." },
        { sujet: "L'imagination n'est plus la qualité maîtresse du romancier.", auteur: "Émile Zola", q: "Quelle phrase dit la même chose que cette thèse ?",
          choix: ["Pour le romancier, l'imagination n'est plus la qualité la plus importante.", "Le romancier n'a pas d'imagination.", "L'imagination reste la qualité principale du romancier.", "Le romancier doit imaginer davantage."],
          indice: "« N'est plus maîtresse » ne veut pas dire « n'existe pas ».",
          pourquoi: "Zola ne dit pas que le romancier n'a pas d'imagination. Il dit qu'elle n'est plus sa qualité principale : l'observation compte davantage." },
        { sujet: "Tous les poètes sont engagés ; ils doivent être des révolutionnaires, non pas en maniant des bombes, mais par leur désir de changer le monde, de l'améliorer.", auteur: "Gilles Vigneault", q: QUESTION_THESE,
          choix: ["Tous les poètes sont engagés : ils veulent changer le monde.", "Les poètes doivent manier des bombes.", "Le monde doit être amélioré par la violence.", "La poésie et la révolution"],
          indice: "« Non pas en maniant des bombes » écarte une idée.",
          pourquoi: "La thèse est l'idée de départ : les poètes sont engagés. « Non pas en maniant des bombes » écarte la violence ; ce n'est pas la thèse." },
        { sujet: "Le mot comprendre n'existe pas au théâtre. Le vrai public ne comprend pas, il ressent. Le théâtre n'est pas un théorème mais un spectacle.", auteur: "Jean Giraudoux", q: QUESTION_THESE,
          choix: ["Le théâtre est un spectacle que l'on ressent, et non un raisonnement que l'on comprend.", "Le public de théâtre n'est pas intelligent.", "Le théâtre est un théorème.", "Le mot comprendre n'existe pas en français."],
          indice: "« Il ressent » : c'est l'idée positive de la citation.",
          pourquoi: "Giraudoux ne critique pas le public : il dit que le théâtre se ressent. Le théorème est ce que le théâtre n'est pas." },
        { sujet: "Quand un écrivain crée un bon livre, il touche le cœur avec des mots. À sa volonté, le cœur gémit, se lamente, se remplit de colère ou au contraire de sérénité et de joie.", auteur: "Maxime Gorki", q: QUESTION_THESE,
          choix: ["Un bon livre touche le cœur du lecteur et fait naître en lui les émotions que veut l'écrivain.", "L'écrivain crée des livres.", "Le cœur gémit et se lamente.", "La colère est mauvaise pour le lecteur."],
          indice: "La deuxième phrase développe la première.",
          pourquoi: "La première phrase porte la thèse ; la seconde la détaille (gémir, colère, joie). « L'écrivain crée des livres » n'affirme rien de discutable." },
        { sujet: "Je ne crois pas à ce terme à la mode : l'évasion. Je crois à l'invasion. Je crois qu'au lieu de s'évader par une œuvre, on est envahi par elle.", auteur: "Jean Cocteau", q: QUESTION_THESE,
          choix: ["Une œuvre ne nous fait pas fuir : elle s'empare de nous.", "Lire, c'est s'évader.", "L'évasion est un mot à la mode.", "Les œuvres sont inutiles."],
          indice: "Cocteau rejette une idée pour en défendre une autre.",
          pourquoi: "Cocteau refuse l'évasion et défend « l'invasion ». La thèse est ce qu'il croit, pas ce qu'il rejette." },
        { sujet: "Ce qui compte, c'est le plaisir d'un texte. Il faut que les lecteurs trouvent dans la littérature autre chose que ce qu'ils lisent tous les jours dans l'exercice de leur vie professionnelle : elle doit leur donner un plaisir et leur permettre de rêver.", auteur: "Ahmadou Kourouma", q: QUESTION_THESE,
          choix: ["La littérature doit donner du plaisir au lecteur et le faire rêver.", "La vie professionnelle est ennuyeuse.", "Les lecteurs lisent tous les jours.", "Le travail compte plus que la lecture."],
          indice: "La fin de la citation dit ce que la littérature « doit » faire.",
          pourquoi: "Le début et la fin disent la même chose : plaisir et rêve. La vie professionnelle n'est qu'un point de comparaison." },
        { sujet: "Une littérature (...) qui n'ose pas communiquer à la société ses réalités, ses propres aspirations, qui n'est pas capable d'apercevoir à temps les dangers moraux et sociaux qui la guettent ne mérite même pas le nom de littérature.", auteur: "Alexandre Soljenitsyne", q: QUESTION_THESE,
          choix: ["Une vraie littérature doit dire à la société ses réalités et l'avertir des dangers.", "La société est menacée par des dangers.", "Il existe beaucoup de littératures.", "Les écrivains ont peur de la société."],
          indice: "Retourne la phrase : que doit faire une littérature pour « mériter son nom » ?",
          pourquoi: "La phrase est négative : une littérature qui ne fait pas cela n'en est pas une. Dite à l'endroit : la vraie littérature doit le faire." },
        { sujet: "Une littérature existe dans une société donnée ; elle en reçoit l'empreinte et, en retour, lui imprime une direction.", auteur: "Roger Caillot", q: QUESTION_THESE,
          choix: ["La littérature est marquée par sa société et, en retour, l'oriente.", "La société imprime des livres.", "La littérature ne change rien à la société.", "Chaque pays a sa littérature."],
          indice: "« En retour » : l'échange va dans les deux sens.",
          pourquoi: "Caillot dit deux choses liées : la société marque la littérature, et la littérature oriente la société." },
        { sujet: "L'écrivain est le bâton de l'aveugle, sans l'écrivain le monde évoluerait vers la soumission et l'acquiescement.", auteur: "Michelet", q: QUESTION_THESE,
          choix: ["L'écrivain guide les hommes et les empêche de tout accepter sans réagir.", "Les aveugles ont besoin d'un bâton.", "L'écrivain est aveugle.", "Le monde avance toujours vers le progrès."],
          indice: "À quoi sert un bâton pour un aveugle ?",
          pourquoi: "Le bâton guide l'aveugle : l'écrivain guide les hommes. Sans lui, dit Michelet, ils se soumettraient." }
      ],
      defi: {
        consigne: "Recopie la thèse de ce sujet, sans la consigne. Puis dis avec tes mots, en une phrase, ce que l'auteur affirme.",
        sujets: ["t9", "t11", "t12", "t21", "t24", "t44", "t45", "t60"],
        grille: [
          "J'ai laissé de côté la consigne et le contexte.",
          "Ma phrase affirme quelque chose sur le thème : on pourrait la discuter.",
          "J'ai gardé le sens des négations et des mots forts (« doit », « seulement », « jamais »)."
        ]
      },
      bilan: {
        appris: "La thèse est l'opinion de l'auteur sur le thème. Elle est dans la citation, jamais dans la consigne ni dans le contexte.",
        importance: "Ta première partie explique cette thèse, ta seconde la discute. Une thèse mal lue, et tout ton plan part dans la mauvaise direction."
      }
    }
  },
  {
    id: "fonction", num: 3, titre: "Trouver la fonction", court: "À quoi sert la littérature, selon l'auteur ?", gratuite: true,
    contenu: {
      explication: [
        { p: "La fonction, c'est **le rôle que l'auteur donne à la littérature** : à quoi elle sert, selon lui. La méthode l'appelle aussi l'**orientation** du sujet." },
        { h: "Les cinq fonctions" },
        { def: [
          ["Engagement", "La littérature **combat** : elle dénonce une injustice, défend une cause, réveille les consciences. Mots-indices : arme, combat, bataille, lutte, liberté, injustice, révolution, dénoncer."],
          ["Esthétique", "La littérature **cherche le beau** : le style, la forme, l'art pour l'art. Mots-indices : beau, beauté, art, artiste, forme, style, musique des mots."],
          ["Évasion", "La littérature **fait rêver**, divertit, aide à fuir le quotidien. Mots-indices : rêver, s'amuser, divertir, distraire, oublier, fiction, imaginaire."],
          ["Lyrique", "La littérature **exprime les sentiments** de l'auteur : amour, douleur, joie, souvenir. Mots-indices : cœur, sentiment, émotion, douleur, désespoir, moi."],
          ["Sociale", "La littérature **montre la société** telle qu'elle est : elle témoigne, décrit, reflète. Mots-indices : société, réalité, vie, témoin, miroir, reflet, observer, époque."]
        ] },
        { h: "La méthode" },
        { etapes: [
          ["Relis la thèse", "Tu l'as trouvée à l'étape 2."],
          ["Souligne les mots-indices", "Les verbes et les images qui disent à quoi sert le thème."],
          ["Compare avec les cinq fonctions", "Choisis celle qui explique le mieux les mots soulignés."],
          ["Justifie", "Tu dois pouvoir citer au moins un mot du sujet qui prouve ta réponse."]
        ] },
        { piege: "**Sociale ou engagement ?** La fonction sociale montre la société : l'écrivain observe, témoigne. L'engagement veut la changer : l'écrivain combat, dénonce. Demande-toi : l'auteur veut-il montrer, ou se battre ?" },
        { piege: "**Esthétique ou évasion ?** L'esthétique parle de la beauté de l'œuvre elle-même. L'évasion parle de ce que vit le lecteur : il rêve, il s'amuse, il oublie ses soucis." },
        { regle: "Certains sujets mêlent deux fonctions. Retiens d'abord celle qui domine : c'est elle que ta première partie expliquera." }
      ],
      exemples: [
        {
          sujet: "Faire de la littérature, c'est s'armer pour se faire l'écho de ceux qui n'ont pas de voix.", auteur: "Rachida Brakni",
          demarche: [
            "Mots-indices : « s'armer », « ceux qui n'ont pas de voix ».",
            "S'armer, c'est se préparer au combat. Les sans-voix sont les opprimés.",
            "La littérature combat pour les opprimés : c'est l'engagement."
          ],
          reponse: "Engagement"
        },
        {
          sujet: "L'écrivain donne les faits tels qu'il les a observés.", auteur: "Émile Zola",
          demarche: [
            "Mots-indices : « les faits », « observés ».",
            "L'écrivain ne combat pas ici : il regarde et rapporte ce qu'il voit.",
            "Montrer la réalité telle qu'elle est : c'est la fonction sociale."
          ],
          reponse: "Sociale"
        },
        {
          sujet: "Les plus désespérés sont les chants les plus beaux.", auteur: "Alfred de Musset",
          demarche: [
            "Mots-indices : « désespérés », « les plus beaux ».",
            "Le désespoir est un sentiment personnel du poète ; « beaux » parle de la beauté.",
            "Deux fonctions se mêlent, mais le cœur de la phrase est la douleur du poète : la fonction lyrique domine, l'esthétique l'accompagne."
          ],
          reponse: "Lyrique (avec l'esthétique)"
        }
      ],
      questions: [
        { sujet: "Faire de la littérature, c'est s'armer pour se faire l'écho de ceux qui n'ont pas de voix.", auteur: "Rachida Brakni", q: QUESTION_FONCTION,
          choix: ["Engagement", "Sociale", "Lyrique", "Évasion"],
          indice: "Que fait-on quand on « s'arme » ?",
          pourquoi: "« S'armer » pour les « sans-voix » : la littérature combat pour les opprimés. C'est l'engagement." },
        { sujet: "Écrire, ce n'est pas faire du bien, c'est faire de l'art.", auteur: "Un auteur", q: QUESTION_FONCTION,
          choix: ["Esthétique", "Engagement", "Évasion", "Sociale"],
          indice: "« Faire de l'art » : chercher quoi ?",
          pourquoi: "L'auteur refuse que l'écriture soit utile (« faire du bien ») et la tourne vers l'art, le beau : c'est l'esthétique." },
        { sujet: "L'écrivain donne les faits tels qu'il les a observés.", auteur: "Émile Zola", q: QUESTION_FONCTION,
          choix: ["Sociale", "Engagement", "Lyrique", "Esthétique"],
          indice: "L'écrivain veut-il montrer, ou se battre ?",
          pourquoi: "« Observés », « les faits » : l'écrivain montre la réalité, il ne combat pas. C'est la fonction sociale." },
        { sujet: "On lit des romans parce qu'on s'ennuie, parce qu'on a envie de s'amuser.", auteur: "James Riley", q: QUESTION_FONCTION,
          choix: ["Évasion", "Esthétique", "Sociale", "Lyrique"],
          indice: "Ce qui compte ici, c'est ce que vit le lecteur.",
          pourquoi: "Fuir l'ennui, s'amuser : la lecture divertit. C'est l'évasion." },
        { sujet: "J'écris pour dire que la lâche sérénité des silencieux garantit la victoire des injustes.", auteur: "Fatou Diome", q: QUESTION_FONCTION,
          choix: ["Engagement", "Sociale", "Lyrique", "Esthétique"],
          indice: "Fatou Diome accuse quelqu'un. Qui ?",
          pourquoi: "Elle dénonce les « silencieux » qui laissent gagner les « injustes ». Écrire pour dénoncer, c'est l'engagement." },
        { sujet: "La poésie n'a pas d'autre but qu'elle-même.", auteur: "Charles Baudelaire", q: QUESTION_FONCTION,
          choix: ["Esthétique", "Engagement", "Évasion", "Sociale"],
          indice: "Si la poésie ne sert à rien d'autre qu'à elle-même, que reste-t-il ?",
          pourquoi: "La poésie ne sert aucune cause : elle vaut par sa propre beauté. C'est l'art pour l'art, donc l'esthétique." },
        { sujet: "La littérature répond au désir de nous arracher à la violence du monde.", auteur: "Alexandre Jardin", q: QUESTION_FONCTION,
          choix: ["Évasion", "Engagement", "Sociale", "Esthétique"],
          indice: "« Arracher à la violence du monde » : on combat cette violence, ou on la fuit ?",
          pourquoi: "La littérature éloigne le lecteur de la violence : elle ne la combat pas. C'est l'évasion." },
        { sujet: "Le roman, c'est la vie, c'est du réel devenu langage.", auteur: "Sujet de BAC blanc", q: QUESTION_FONCTION,
          choix: ["Sociale", "Évasion", "Lyrique", "Engagement"],
          indice: "Cherche les mots qui parlent de la réalité.",
          pourquoi: "« La vie », « le réel » : le roman montre la réalité. C'est la fonction sociale." },
        { sujet: "Les plus désespérés sont les chants les plus beaux.", auteur: "Alfred de Musset", q: QUESTION_FONCTION,
          choix: ["Lyrique", "Évasion", "Engagement", "Sociale"],
          indice: "Le désespoir est un sentiment. De qui ?",
          pourquoi: "Les plus beaux poèmes naissent de la douleur du poète : ses sentiments sont au centre. C'est la fonction lyrique." },
        { sujet: "Il est du devoir de tout écrivain de livrer bataille pour la liberté.", auteur: "Un penseur", q: QUESTION_FONCTION,
          choix: ["Engagement", "Sociale", "Esthétique", "Évasion"],
          indice: "Repère « livrer bataille ».",
          pourquoi: "« Livrer bataille », « la liberté » : l'écrivain doit combattre. C'est l'engagement." },
        { sujet: "Le roman est un miroir que l'on promène le long du chemin.", auteur: "Stendhal", q: QUESTION_FONCTION,
          choix: ["Sociale", "Esthétique", "Évasion", "Lyrique"],
          indice: "Que fait un miroir ?",
          pourquoi: "Un miroir montre ce qui est devant lui, sans rien changer : le roman reflète la société. C'est la fonction sociale." },
        { sujet: "Frappe-toi le cœur ! C'est là qu'est le génie.", auteur: "Alfred de Musset", q: QUESTION_FONCTION,
          choix: ["Lyrique", "Esthétique", "Engagement", "Évasion"],
          indice: "Où se trouve le génie, selon Musset ?",
          pourquoi: "Le génie vient du cœur, des sentiments du poète. C'est la fonction lyrique." }
      ],
      defi: {
        consigne: "Donne la fonction de la littérature dans ce sujet. Recopie les mots du sujet qui te l'ont montrée, puis explique ton choix en une phrase.",
        sujets: ["t11", "t24", "t44", "t45", "t46", "t47", "t52", "t60"],
        grille: [
          "J'ai choisi une des cinq fonctions : engagement, esthétique, évasion, lyrique ou sociale.",
          "J'ai recopié au moins un mot du sujet qui la prouve.",
          "Si deux fonctions se mêlent, j'ai dit laquelle domine."
        ]
      },
      bilan: {
        appris: "La fonction est le rôle que l'auteur donne à la littérature : engagement, esthétique, évasion, lyrique ou sociale. Les mots-indices du sujet te la montrent.",
        importance: "La fonction te dit quelles œuvres choisir comme exemples, et quelle fonction opposer à la thèse dans ta seconde partie."
      }
    }
  },
  { id: "reformulation", num: 4, titre: "Reformuler la citation", court: "Dire la thèse avec tes mots", gratuite: false },
  { id: "problematique", num: 5, titre: "Poser la problématique", court: "Les deux questions du devoir", gratuite: false },
  { id: "plan", num: 6, titre: "Construire le plan", court: "Expliquer, puis discuter", gratuite: false },
  { id: "arguments", num: 7, titre: "Trouver les arguments", court: "Des idées pour chaque partie", gratuite: false },
  { id: "exemples", num: 8, titre: "Choisir les exemples", court: "La bonne œuvre pour chaque argument", gratuite: false },
  { id: "paragraphe", num: 9, titre: "Rédiger un paragraphe", court: "Argument, explication, exemple", gratuite: false },
  { id: "introduction", num: 10, titre: "Rédiger l'introduction", court: "Amener, poser, annoncer", gratuite: false },
  { id: "transition", num: 11, titre: "Rédiger la transition", court: "Passer d'une partie à l'autre", gratuite: false },
  { id: "conclusion", num: 12, titre: "Rédiger la conclusion", court: "Bilan et ouverture", gratuite: false },
  { id: "epreuve", num: 13, titre: "Épreuve finale", court: "Une copie entière", gratuite: false }
];

/** Contenu d'une étape : explication, exemples, questions, défi et bilan. */
export type ContenuEtape = NonNullable<EtapeFormation["contenu"]>;

export const etapeParId = (id: string) => ETAPES.find(e => e.id === id);

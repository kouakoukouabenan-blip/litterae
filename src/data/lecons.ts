// Leçons reprises de la partie 1 du guide « Dissertation Version Facile ».
import type { Lecon } from "./types";

export const LECONS: Lecon[] = [
 {id:"definition",titre:"Qu'est-ce que la dissertation littéraire ?",duree:"4 min",blocs:[
  {p:"La dissertation littéraire est un exercice de rédaction qui consiste à expliquer et discuter une opinion sur la littérature."},
  {p:"En clair, on te donne une citation ou un point de vue sur un thème littéraire. On te demande d'expliquer cette idée, puis de montrer ses limites. Tu rédiges un texte en trois parties, introduction, développement et conclusion, pour convaincre le correcteur."},
  {h:"Ce qui fait réussir"},
  {liste:["La culture littéraire : histoire littéraire, genres, courants, théories sur la fonction de la littérature, critique littéraire.","La compréhension du sujet : on ne traite bien que ce que l'on a compris."]},
  {astuce:"Pour enrichir ta culture littéraire, participe au club de littérature de ton école, débats avec tes amis et lis souvent."}
 ]},
 {id:"comprendre",titre:"Comprendre le sujet",duree:"8 min",blocs:[
  {p:"Tu ne pourras pas traiter un sujet que tu ne comprends pas. Voici les étapes, dans l'ordre."},
  {etapes:[
   ["Lire et relire le sujet","Du premier au dernier mot, en cherchant à comprendre les expressions et la structure des phrases."],
   ["Séparer l'information et la consigne","L'information contient la thèse. La consigne indique le travail à faire, le plus souvent « Expliquez et discutez »."],
   ["Identifier le thème","Pose deux questions : qui parle ? de quoi parle-t-il ? Ce dont il parle est le thème : la littérature, le roman, le poète, l'écriture…"],
   ["Trouver la thèse","C'est le point de vue de l'auteur, le plus souvent entre guillemets."],
   ["Trouver l'orientation","C'est la fonction que l'auteur attribue au thème : engagement, esthétique, évasion, lyrique ou sociale."],
   ["Expliquer les mots-clés","Surtout ceux qui justifient l'orientation, toujours selon le contexte du sujet."],
   ["Reformuler la thèse","Dire simplement, en une seule phrase, ce que l'auteur affirme. Commence par le thème."]
  ]},
  {h:"Exemple"},
  {sujet:"À ceux qui lui reprochaient son indifférence aux problèmes de son temps, un auteur a répondu : « Écrire, ce n'est pas faire du bien, c'est faire de l'art. » Expliquez et discutez cette affirmation."},
  {def:[["Thème","L'écriture"],["Orientation","Esthétique : écrire, c'est faire de l'art, c'est-à-dire du beau."],["Reformulation","L'écriture s'intéresse à la beauté formelle."]]},
  {astuce:"La reformulation est ce qui permet au correcteur de vérifier que tu as compris. Relis-la toujours."}
 ]},
 {id:"introduction",titre:"Rédiger l'introduction",duree:"7 min",blocs:[
  {p:"Porte d'entrée de ton devoir, l'introduction présente le sujet, pose les questions qu'il soulève et annonce le plan. Elle comporte quatre éléments."},
  {etapes:[
   ["La généralité","Une idée générale qui sert de prétexte pour aborder le sujet : une définition du thème, un constat ou une citation."],
   ["L'insertion du sujet","La thèse de l'auteur et sa reformulation. Si la thèse est longue, insère seulement la reformulation."],
   ["La problématique","Deux questions : « En quoi… » + la thèse, puis « Cependant… » + l'antithèse. Ou trois questions, en commençant par le thème spécifique."],
   ["L'annonce du plan","« Nous répondrons à ces interrogations dans notre analyse. » Inutile avec une problématique à trois questions."]
  ]},
  {h:"Exemple rédigé"},
  {modele:"La fonction à attribuer à l'écriture a toujours suscité des débats au sein des critiques littéraires. Prenant part à ce débat, un penseur affirme : « Écrire, ce n'est pas faire du bien, c'est faire de l'art » ; autrement dit, l'écriture s'intéresse à la beauté formelle. Une telle affirmation pose les questions suivantes : en quoi la littérature doit-elle faire du beau ? N'admet-elle pas aussi une fonction militante ? Nous répondrons à ces interrogations dans notre analyse."}
 ]},
 {id:"developpement",titre:"Rédiger le développement",duree:"9 min",blocs:[
  {p:"La consigne « expliquer et discuter » appelle le plan dialectique. L'axe 1 justifie la thèse de l'auteur ; l'axe 2 en montre les limites."},
  {plan:["Phrase introductive","Axe 1 : thèse, 2 à 3 paragraphes","Transition","Axe 2 : antithèse, 2 à 3 paragraphes"]},
  {h:"Le paragraphe argumentatif"},
  {p:"Chaque paragraphe développe un seul argument, en trois temps."},
  {def:[["Argument","La littérature dénonce les problèmes de la société."],["Explication","En effet, la littérature met à nu les difficultés vécues par les peuples. Ce faisant, elle accuse les bourreaux dans le souci d'améliorer la vie des opprimés."],["Illustration","Une œuvre précise qui prouve l'argument."]]},
  {astuce:"Pour vérifier qu'un argument est pertinent, demande-toi : pourquoi peut-on dire que + reformulation ? Si ton argument ne répond pas clairement, change-le."},
  {astuce:"Dans ta copie, souligne toujours le titre de l'œuvre que tu cites, par exemple : Une si longue lettre de Mariama Bâ. Sur un livre imprimé ou dans l'application, le titre est écrit en italique ; à la main, on le souligne."},
  {lien:{texte:"Trouver une œuvre pour illustrer un argument",href:"#/oeuvres"}}
 ]},
 {id:"conclusion",titre:"Rédiger la conclusion",duree:"5 min",blocs:[
  {p:"La conclusion résume le travail et apporte une réponse claire aux questions de la problématique. Elle comprend trois parties."},
  {etapes:[
   ["Le bilan","« Au terme de notre analyse, retenons que + axe 1. Cependant, axe 2. »"],
   ["Le jugement personnel","Une réponse claire et définitive, souvent une synthèse des deux axes."],
   ["L'ouverture (facultative)","Un rapprochement avec un fait actuel, un genre, une œuvre ou une grande question littéraire."]
  ]},
  {h:"Exemple rédigé"},
  {modele:"Au terme de cette analyse, il convient de retenir que l'écriture a pour fonction de faire du beau. Cependant, au-delà de cette fonction esthétique, elle admet une fonction militante qui fait d'elle un instrument au service de la société. Loin d'être contradictoires, ces deux fonctions se complètent et confèrent à l'œuvre écrite tout son charme."}
 ]}
];

import type { ComponentChildren } from "preact";
import { Page } from "../components/Page";
import { PageHeader } from "../components/PageHeader";
import { Icon } from "../components/Icon";
import { useInstallAction } from "../components/Install";
import { FREE_SUBJECTS, FREE_WORKS, PRICE } from "../lib/access";
import { OEUVRES, SUJETS, NB_DETAILLEES } from "../lib/data";
import { LECONS } from "../lib/lecons";
import { CONTACT_EMAIL, EDITEUR, MISE_A_JOUR } from "../lib/site";
import { AchatLien } from "../components/Achat";
import { ReglageNotifs } from "../components/Annonces";

function Contact() {
  return CONTACT_EMAIL ? <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> : <>l'adresse indiquée sur la page de paiement</>;
}

function Legal({ title, eyebrow, children }: { title: string; eyebrow: string; children: ComponentChildren }) {
  return (
    <Page title={title} back="#/a-propos">
      <article class="reading">
        <PageHeader eyebrow={eyebrow} title={title}>Dernière mise à jour : {MISE_A_JOUR}.</PageHeader>
        <div class="prose legal">{children}</div>
      </article>
    </Page>
  );
}

export function AProposScreen() {
  const { installed, start } = useInstallAction();
  return (
    <Page title="À propos">
      <div class="reading reading-left">
        <PageHeader eyebrow="À propos" title="Ce que fait Litterae">
          Pour réussir la dissertation littéraire au bac.
        </PageHeader>
        <div class="prose">
          <h2 class="section-title">Fonctionnalités</h2>
          <dl class="features">
            <dt><Icon name="menu_book" />Le cours</dt>
            <dd>{LECONS.length} leçons pour passer du sujet à la conclusion : comprendre le sujet, rédiger l'introduction, le développement et la conclusion. Ta progression est retenue.</dd>
            <dt><Icon name="history_edu" />Les sujets corrigés</dt>
            <dd>{SUJETS.length} sujets traités de bout en bout : thème, thèse, reformulation, plan dialectique, arguments illustrés, transition et conclusion. Filtre par orientation.</dd>
            <dt><Icon name="local_library" />Le moteur de recherche d'œuvres</dt>
            <dd>{OEUVRES.length} œuvres, dont {NB_DETAILLEES} fiches détaillées (résumé complet, idées d'illustration, phrase d'exemple) ; les autres sont des fiches courtes pour repérer une œuvre par thème. Cherche par titre, auteur, thème ou mot-clé, puis combine les filtres : fonction littéraire, thème, genre, aire géographique, pays, idée d'argument.</dd>
            <dt><Icon name="inventory_2" />La boîte à outils</dt>
            <dd>Dictionnaire littéraire avec recherche (le sens des mots des sujets et leur fonction ; 10 mots gratuits, tout le dictionnaire avec l'accès complet), formules d'introduction, de transition et de conclusion à copier, connecteurs logiques, vocabulaire de chaque orientation.</dd>
            <dt><Icon name="person" />Mon espace</dt>
            <dd>Ton carnet (œuvres enregistrées et notes personnelles, gardées sur ton appareil), ta clé d'accès et tes messages à l'auteur. Avec l'accès complet, ses réponses à tes questions arrivent ici.</dd>
            <dt><Icon name="wifi_off" />Sans connexion</dt>
            <dd>Une fois ouverte, Litterae reste consultable sans Internet.</dd>
          </dl>

          <h2 class="section-title">Accès gratuit et accès complet</h2>
          <p>Gratuit : le cours, la boîte à outils (avec 10 mots du dictionnaire au choix), les {FREE_SUBJECTS} premiers sujets corrigés et {FREE_WORKS} fiches d'œuvres choisies par l'auteur, signalées « Gratuite ».</p>
          <p>Accès complet : tous les sujets et toutes les fiches, pour {PRICE} payés une seule fois par Mobile Money, et les réponses de l'auteur à tes questions directement dans l'application. Tu reçois une clé d'accès par e-mail, valable sur 2 appareils. <AchatLien label="Acheter une clé sur Chariow" /></p>

          {!installed && (
            <>
              <h2 class="section-title">Installer l'application</h2>
              <p>Litterae s'installe depuis le navigateur, sans Play Store ni App Store.</p>
              <button type="button" class="btn btn-primary align-start" onClick={start}><Icon name="install_mobile" size={20} />Installer Litterae</button>
            </>
          )}

          <ReglageNotifs />

          <h2 class="section-title">Informations</h2>
          <ul class="list list-compact">
            <li><a class="row" href="#/contact"><span class="row-body"><span class="row-title">Nous contacter</span><span class="meta">Une question, une leçon ou une œuvre à proposer, une erreur à signaler</span></span><Icon name="chevron_right" /></a></li>
            <li><a class="row" href="#/cgu"><span class="row-body"><span class="row-title">Conditions générales d'utilisation et de vente</span></span><Icon name="chevron_right" /></a></li>
            <li><a class="row" href="#/confidentialite"><span class="row-body"><span class="row-title">Confidentialité et données personnelles</span></span><Icon name="chevron_right" /></a></li>
          </ul>
          <p class="small muted">Litterae est conçue par Prof {EDITEUR}, auteur de « La dissertation littéraire, version simplifiée ».</p>
        </div>
      </div>
    </Page>
  );
}

export function CguScreen() {
  return (
    <Legal title="Conditions générales" eyebrow="Utilisation et vente">
      <h2 class="section-title">1. Objet</h2>
      <p>Les présentes conditions encadrent l'utilisation de Litterae, application web d'aide à la dissertation littéraire, et l'achat de son accès complet. Utiliser Litterae vaut acceptation de ces conditions.</p>

      <h2 class="section-title">2. Éditeur</h2>
      <p>Litterae est éditée à titre personnel par {EDITEUR}. Contact : <Contact />.</p>

      <h2 class="section-title">3. Contenu</h2>
      <p>Litterae propose un cours de méthode, des sujets corrigés, des résumés d'œuvres et des outils de rédaction. Ces contenus sont une aide à l'apprentissage : ils ne remplacent ni l'enseignement de ton professeur ni la lecture des œuvres. Les résumés et corrigés sont rédigés avec soin mais peuvent contenir des erreurs ; tu peux les signaler depuis la page <a href="#/contact?sujet=erreur">Contact</a>.</p>

      <h2 class="section-title">4. Accès gratuit</h2>
      <p>Sans paiement, tu as accès au cours, à la boîte à outils, aux {FREE_SUBJECTS} premiers sujets corrigés et à {FREE_WORKS} fiches d'œuvres choisies par l'éditeur. L'éditeur peut faire évoluer le contenu de l'accès gratuit.</p>

      <h2 class="section-title">5. Accès complet</h2>
      <p>L'accès complet coûte {PRICE} (francs CFA), payés une seule fois. Il ouvre l'ensemble des sujets corrigés et des fiches d'œuvres, y compris ceux ajoutés par la suite, pour la durée de vie du service.</p>
      <p>L'accès complet permet aussi de poser des questions à l'auteur depuis la page Contact et de recevoir la réponse dans l'application. L'auteur répond dès qu'il le peut, sans délai garanti ; il ne rédige pas les devoirs à la place des élèves et peut ne pas répondre à un message irrespectueux ou hors sujet.</p>
      <p>Le paiement se fait par Mobile Money (Wave, MTN MoMo, Moov Money…) via la plateforme Chariow, qui traite la transaction. Litterae ne voit ni ne conserve tes codes de paiement. <AchatLien label="Page d'achat sur Chariow" /></p>
      <p>Après le paiement, Chariow t'envoie par e-mail une clé d'accès personnelle. Elle s'active sur 2 appareils au maximum. Une clé partagée publiquement ou utilisée frauduleusement peut être désactivée.</p>
      <p>Le contenu étant numérique et disponible immédiatement, il n'y a pas de remboursement une fois l'accès activé, sauf si l'accès ne fonctionne pas et que le problème ne peut pas être résolu : écris alors à l'adresse de contact.</p>

      <h2 class="section-title">6. Usage personnel</h2>
      <p>L'accès est personnel. Les contenus de Litterae sont protégés par le droit d'auteur : tu peux les lire, les citer et t'en servir pour tes devoirs, mais pas les copier en masse, les revendre ni les republier ailleurs.</p>

      <h2 class="section-title">7. Disponibilité</h2>
      <p>L'éditeur fait son possible pour que Litterae reste accessible, sans pouvoir garantir l'absence d'interruption. Le contenu déjà ouvert reste consultable hors connexion.</p>

      <h2 class="section-title">8. Modification des conditions</h2>
      <p>Ces conditions peuvent évoluer. La date de mise à jour figure en haut de cette page. Les conditions applicables à un achat sont celles en vigueur au jour du paiement.</p>

      <h2 class="section-title">9. Droit applicable</h2>
      <p>Ces conditions sont soumises au droit ivoirien. En cas de désaccord, une solution amiable est recherchée en priorité.</p>
    </Legal>
  );
}

export function ConfidentialiteScreen() {
  return (
    <Legal title="Confidentialité" eyebrow="Données personnelles">
      <h2 class="section-title">En bref</h2>
      <p>Litterae ne te demande pas de créer de compte et ne collecte aucune donnée personnelle pour fonctionner. Ta progression, ton carnet et tes notes restent sur ton appareil.</p>

      <h2 class="section-title">Ce qui est gardé sur ton appareil</h2>
      <ul class="bullets">
        <li>Les leçons que tu as lues.</li>
        <li>Les œuvres enregistrées et tes notes personnelles.</li>
        <li>Les fiches gratuites déjà ouvertes.</li>
        <li>Ton choix concernant l'installation de l'application.</li>
        <li>Si tu as acheté l'accès complet : ta clé d'accès, le contenu débloqué et un identifiant anonyme de l'appareil.</li>
      </ul>
      <p>Ces informations sont stockées dans ton navigateur. Elles ne sont envoyées à personne, sauf les statistiques anonymes décrites plus bas. Si tu effaces les données du navigateur, elles sont supprimées.</p>

      <h2 class="section-title">Hébergement</h2>
      <p>Le site est hébergé par GitHub Pages (GitHub, Inc.). Comme tout hébergeur, GitHub peut enregistrer des données techniques de connexion, comme l'adresse IP, pour la sécurité du service.</p>

      <h2 class="section-title">Paiement</h2>
      <p>Quand le paiement de l'accès complet sera ouvert, la plateforme Chariow recueillera les informations nécessaires à la transaction : nom, adresse e-mail et numéro de téléphone. Elles servent uniquement à activer ton accès et à te contacter en cas de problème avec ton achat. Elles ne sont ni vendues ni utilisées pour de la publicité.</p>

      <h2 class="section-title">Vérification des clés</h2>
      <p>Quand tu saisis ta clé, elle est envoyée avec l'identifiant anonyme de ton appareil à notre serveur (hébergé par Cloudflare), qui la vérifie auprès de Chariow. La clé est ensuite revérifiée environ une fois par semaine. Aucune autre information n'est transmise.</p>

      <h2 class="section-title">Statistiques anonymes</h2>
      <p>Pour savoir ce qui est utile aux élèves, Litterae envoie à notre serveur des chiffres anonymes : un identifiant tiré au hasard pour ton appareil, le type d'appareil (Android, iPhone ou ordinateur), si l'application est installée, l'heure d'arrivée, le pays et la ville approximatifs de la connexion (comptés seulement en totaux, sans être reliés à ton appareil), les parties, fiches d'œuvres, sujets, leçons et mots du dictionnaire ouverts, les mots tapés dans les recherches, les contenus réservés affichés et les touches sur « Acheter », les étapes de ton parcours (première fiche ouverte, 2 puis 6 fiches, sujet de l'atelier commencé, terminé ou envoyé, signalées une seule fois et comptées en totaux), et les messages de l'accueil vus ou touchés. Aucun nom, aucune adresse e-mail, aucun numéro n'est envoyé. Ces chiffres sont gardés au plus 13 mois. Le site utilise aussi Cloudflare Web Analytics, qui compte les visites sans cookie et sans suivre les visiteurs d'un site à l'autre.</p>

      <h2 class="section-title">Messages envoyés depuis la page Contact</h2>
      <p>Quand tu écris depuis la page Contact, ton message est envoyé à notre serveur avec le prénom et le contact (WhatsApp ou e-mail) que tu choisis de laisser, la page concernée et le type d'appareil. Ils servent uniquement à lire ton message et à te répondre. L'adresse de connexion n'est pas gardée : seule une empreinte illisible sert à bloquer les envois abusifs pendant une journée. Avec l'accès complet, le message est aussi relié à ta clé d'accès (et, si tu as accepté les notifications, à l'adresse technique de ton téléphone) pour que la réponse te parvienne dans l'application. Les messages sont supprimés au plus tard 13 mois après leur lecture.</p>

      <h2 class="section-title">Notifications</h2>
      <p>Si tu acceptes les notifications, ton navigateur fournit une adresse technique d'envoi, gardée sur notre serveur pour t'envoyer les messages de Litterae. Elle ne permet pas de t'identifier. Tu peux arrêter à tout moment depuis la page À propos ou les réglages du navigateur.</p>

      <h2 class="section-title">Publicité</h2>
      <p>Litterae n'affiche pas de publicité et ne transmet aucune donnée à des annonceurs.</p>

      <h2 class="section-title">Tes droits</h2>
      <p>Conformément à la loi ivoirienne n° 2013-450 relative à la protection des données à caractère personnel, tu peux demander l'accès, la rectification ou la suppression des données te concernant en écrivant à <Contact />.</p>
    </Legal>
  );
}

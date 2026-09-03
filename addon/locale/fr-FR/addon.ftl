startup-begin = Le module complémentaire se charge
startup-finish = Le module complémentaire est prêt
enable-syllabus-title = Transformer en syllabus ?
enable-syllabus-message = Transformer « { $name } » en syllabus ? Une note de syllabus sera enregistrée dans cette collection.
enable-subcollections-title = Gérer les sous-collections de séance ?
enable-subcollections-message =
    En activant cette option, le module gère les collections enfants sous « { $name } ». Cela peut supprimer ou réécrire des dossiers que vous avez déjà.

    Ce qui se passe :

    • Un dossier est créé ou adopté par séance qui a des lectures assignées, et renommé pour correspondre au syllabus (par exemple « Séance 1 : Titre »).

    • Les séances sans lectures assignées n’ont pas de dossier. Les dossiers existants pour ces séances sont supprimés.

    • Les collections enfants qui ne sont pas ces dossiers de séance — et qui n’ont pas leur propre note de syllabus — seront supprimées. Les documents ne sont pas supprimés de la bibliothèque ; ils restent dans la collection parente.

    • Les documents de chaque dossier de séance sont écrasés à partir de la note de syllabus. Les documents en trop sont retirés du dossier uniquement.

    • Retirer une séance du syllabus supprime ce dossier de séance.

    • Si vous supprimez un dossier de séance qui a encore des lectures assignées, le module le recrée.

    Désactiver plus tard arrête la gestion des dossiers ; les dossiers existants sont conservés.

    Continuer ?
enable-reading-schedule-collection-title = Générer la collection Planning des lectures ?
enable-reading-schedule-collection-message =
    En activant cette option, une collection de premier niveau « Planning des lectures » est créée dans Ma bibliothèque, avec un dossier pour chaque date de lecture (à partir d’il y a 10 jours).

    Ce qui se passe :

    • Les dossiers de date sont créés, renommés et remplis automatiquement à partir de vos syllabus.

    • Les documents de ces dossiers sont écrasés à partir du planning. Les documents en trop sont retirés du dossier uniquement — pas de la bibliothèque.

    • Si vous supprimez la collection ou un dossier de date, le module le recrée tant que ce paramètre est activé.

    • Les syllabus des bibliothèques de groupe ne sont pas inclus (les documents ne peuvent pas traverser les bibliothèques).

    Désactiver plus tard supprime la collection « Planning des lectures » et ses dossiers de date. Les documents de vos syllabus restent en place.

    Continuer ?
disable-reading-schedule-collection-title = Retirer la collection Planning des lectures ?
disable-reading-schedule-collection-message =
    Désactiver cette option supprime la collection gérée « Planning des lectures » et ses dossiers de date.

    Les documents ne sont pas supprimés de votre bibliothèque ; ils restent dans leurs collections de syllabus d’origine.

    Continuer ?
prefs-title = Zotero Syllabus
prefs-table-title = Titre
prefs-table-detail = Détail
tabpanel-lib-tab-label = Onglet bibliothèque
tabpanel-reader-tab-label = Onglet lecteur
menu-toggle-bibliography = Afficher/masquer la bibliographie
managed-folder-banner-title = Dossier géré automatiquement
managed-folder-banner-class =
    N’ajoutez ni ne retirez de documents ici. Ce dossier de séance est synchronisé avec le syllabus ; les modifications manuelles sont écrasées.
managed-folder-banner-schedule =
    N’ajoutez ni ne retirez de documents ici. Ce dossier du planning des lectures est synchronisé avec vos syllabus ; les modifications manuelles sont écrasées.
menuHelp-openUserGuide = Ouvrir le guide d’utilisation de Zotero Syllabus
userGuide-start-title = Bienvenue dans Zotero Syllabus
userGuide-start-desc =
    Transformez n’importe quelle collection Zotero en liste de lectures du cours — organisez par séance, définissez des priorités et suivez ce qu’il reste à lire.
userGuide-start-close = Me le rappeler plus tard
userGuide-collection-title = Partir d’une collection
userGuide-collection-desc =
    Les syllabus sont liés aux collections. Nous ouvrirons une collection d’essai « Syllabus Tour » avec quelques lectures d’exemple.
userGuide-syllabusButton-title = Transformer en syllabus
userGuide-syllabusButton-desc =
    Cliquez sur Transformer en syllabus dans la barre d’outils des documents pour transformer cette collection en plan du cours. La visite basculera automatiquement.
userGuide-addClass-title = Ajouter une séance
userGuide-addClass-desc =
    Les séances (ou semaines / sessions — vous pourrez les renommer plus tard) sont les sections de votre syllabus. Ajoutez-en une pour commencer.
userGuide-assign-title = Attribuer des lectures
userGuide-assign-desc =
    Faites glisser des documents dans une séance, ou clic droit → Attribuer à une séance. Les documents non attribués restent sous Lectures complémentaires.
userGuide-itemPane-title = Modifier dans le panneau du document
userGuide-itemPane-desc =
    Sélectionnez une lecture pour définir le numéro de séance, la priorité, les consignes et l’état « lu » dans la section Travaux de lecture.
userGuide-readingDate-title = Définir une date d’échéance
userGuide-readingDate-desc =
    Chaque séance peut avoir une date de lecture. Nous en définirons une pour la Séance 1 lorsque vous cliquerez sur Suivant — puis vous pourrez ouvrir le Planning des lectures.
userGuide-readingSchedule-title = Ouvrir le Planning des lectures
userGuide-readingSchedule-desc =
    Le Planning des lectures rassemble les séances avec date d’échéance de tous vos syllabus. Suivant l’ouvre pour voir ce qui arrive.
userGuide-subcollections-title = Facultatif : dossiers de séance
userGuide-subcollections-desc =
    Vous voulez un miroir de dossier par séance ? Activez Sous-collections de séance dans les Paramètres. Laissez désactivé sauf si vous voulez que le module gère les dossiers enfants.
userGuide-finish-title = Vous êtes prêt
userGuide-finish-desc =
    Rouvrez cette visite à tout moment depuis Aide → Ouvrir le guide d’utilisation de Zotero Syllabus. Bonnes études !
userGuide-empty-title = Organiser cette collection par séance
userGuide-empty-desc =
    Ajoutez des séances pour chaque semaine ou session, puis attribuez les lectures. Vous pouvez aussi suivre une courte visite guidée.
userGuide-empty-tour = Faire la visite

# Shared
app-name = Zotero Syllabus
this-collection = cette collection
untitled = Sans titre
nav-back = Retour
nav-previous = Précédent
nav-next = Suivant

# View tabs / toolbar
view-tab-checklist = Liste de contrôle
view-tab-checklist-tooltip = Afficher comme liste de contrôle
view-tab-syllabus = Syllabus
view-tab-syllabus-tooltip = Afficher comme syllabus
view-tab-create-syllabus = Transformer en syllabus
view-tab-create-syllabus-tooltip = Transformer cette collection en syllabus
view-tab-table = Tableau
view-tab-table-tooltip = Afficher comme tableau
view-tab-gallery = Galerie
view-tab-gallery-tooltip = Afficher comme galerie
view-tab-explorer = Accueil
view-tab-explorer-tooltip = Afficher comme accueil
view-tab-reading-schedule = Planning des lectures
view-tab-my-annotations = Mes annotations
toolbar-reading-schedule-review = Consulter le Planning des lectures
toolbar-reading-schedule-open = Ouvrir le Planning des lectures

# Context menus
menu-set-priority = Définir la priorité
menu-none = (Aucune)
menu-assign-to-class = Attribuer à une séance
menu-no-collection = (Aucune collection sélectionnée)
menu-class-label = { $nomenclature } { $number }
menu-add-to-new-class = Ajouter à la nouvelle { $nomenclature } { $number }
menu-set-reading-status = Définir l’état de lecture
status-done = Lu
status-not-done = Non lu

# Syllabus page
page-toc-title = Table des matières
placeholder-add-title = Ajouter un titre…
page-compact-enable = Activer le mode compact
page-compact-disable = Désactiver le mode compact
page-reader-enable = Activer le mode lecture
page-reader-disable = Désactiver le mode lecture
page-export = Exporter le fichier syllabus
page-import = Importer un fichier syllabus
page-edit-settings = Modifier les paramètres du syllabus
page-lock = Verrouiller le syllabus
page-unlock = Déverrouiller le syllabus
page-print = Imprimer la liste de la vue Syllabus en PDF
placeholder-course-code = Code du cours
placeholder-institution = Établissement
placeholder-add-description = Ajouter une description…
page-add-class = Ajouter { $nomenclature } { $number }
page-add-to-class = Ajouter à { $nomenclature } { $number }
page-drop-create-class = Déposez le document ici pour créer { $nomenclature } { $number }
page-drop-import-file = Déposez des fichiers pour les ajouter à cette collection
further-reading-heading = Lectures complémentaires
sort-label = Trier
further-reading-sort-aria = Trier les lectures complémentaires
sort-by-title = Titre
sort-by-creator = Créateur
sort-by-date = Date
further-reading-empty-desc = Les documents de cette section n’ont été attribués à aucune séance.
toc-empty = Aucune séance disponible
placeholder-url = https://
links-delete = Supprimer le lien
links-edit = Modifier le lien
links-add = Ajouter un lien
bibliography-heading = Bibliographie

# Class groups / cards
mark-done = Marquer comme lu
mark-not-done = Marquer comme non lu
class-due-date-label = Date d’échéance :
class-reset-sort = Réinitialiser l’ordre
class-move-up = Déplacer { $nomenclature } vers le haut
class-move-down = Déplacer { $nomenclature } vers le bas
class-delete = Supprimer { $nomenclature }
class-insert-here = Ajouter { $nomenclature } ici
class-dropzone-hint = Faites glisser des documents vers { $nomenclature } { $number }
due-date-clear = Effacer la date d’échéance
due-date-add = Ajouter une date d’échéance
placeholder-select-date = Sélectionner une date
item-in-publication = dans { $name }
attachment-url = URL
attachment-pdf = PDF
attachment-snapshot = Instantané
attachment-epub = EPUB
attachment-html = HTML
attachment-doc = DOC
attachment-txt = TXT
attachment-zip = ZIP
attachment-file = Fichier
attachment-view = Afficher
attachment-open = Ouvrir { $label }
assignment-duplicate = Créer une attribution en double
assignment-duplicate-label = Dupliquer
assignment-unassign-class = Retirer de la séance
assignment-unassign-syllabus = Retirer du syllabus
assignment-unassign-label = Désattribuer
priority-set-to = Définir la priorité sur { $name }
priority-clear = Effacer la priorité
youtube-play = Lire { $title } sur YouTube

# Item pane
item-pane-not-found = Document introuvable
item-pane-none-selected = Aucun document sélectionné
item-pane-n-selected = { $count } documents sélectionnés
item-pane-current-view = vue actuelle
item-pane-also-assigned = aussi attribué à
item-pane-assignment-n = Travail n°{ $number }
item-pane-assignment-for = pour { $title }
item-pane-due = Échéance { $date }
item-pane-reference-material = Documents de référence
item-pane-class-named = { $nomenclature } { $number } : { $title }
item-pane-mark-done = Marquer comme lu
placeholder-class-number = p. ex. 1, 2, 3…
field-priority = Priorité
field-instructions = Consignes
placeholder-instructions = Ajouter des consignes pour ce travail…
assignment-delete = Supprimer le travail
item-pane-select-collection = Sélectionnez une collection pour voir les attributions du syllabus

# Settings
settings-title = Paramètres du syllabus
settings-back = Retour à la vue syllabus
settings-nomenclature = Nomenclature
settings-nomenclature-desc = Choisissez le terme utilisé pour désigner les séances individuelles (p. ex. « semaine », « cours », « séance », « section »).
settings-singular = Forme au singulier
settings-nomenclature-placeholder = p. ex. semaine, cours, séance, section
settings-plural-label = Forme au pluriel :
settings-subcollections = Sous-collections de séance
settings-subcollections-desc = Désactivé par défaut. Une fois activé, chaque séance avec des lectures assignées obtient un dossier sous cette collection. Les séances sans assignations n’ont pas de dossier ; ces dossiers sont supprimés. Les dossiers sont créés, renommés et supprimés pour correspondre au syllabus — y compris les collections enfants existantes, qui peuvent être supprimées. Désactiver laisse les dossiers en place.
settings-subcollections-checkbox = Créer des sous-collections ?
settings-bib-style = Style bibliographique
settings-bib-style-desc = Choisissez un style CSL (Citation Style Language) pour les références bibliographiques. S’il n’est pas défini, le style par défaut de l’utilisateur sera utilisé.
settings-citation-style = Style de citation
settings-user-default = Défaut utilisateur
settings-user-default-named = Défaut utilisateur : { $name }
settings-priorities = Priorités
settings-priorities-desc = Personnalisez les noms, couleurs et l’ordre des priorités.
settings-add-priority = Ajouter une nouvelle priorité
settings-add-priority-button = Ajouter une priorité
settings-new-priority-name = Nouvelle priorité
settings-priority-move-up = Monter
settings-priority-move-down = Descendre
settings-priority-color = Couleur de la priorité
settings-priority-name-placeholder = Nom de la priorité
settings-priority-delete = Supprimer la priorité
settings-priority-name-label = Nom
settings-priority-preview = Aperçu :
priority-default-course-info = Informations du cours
priority-default-essential = Essentiel
priority-default-recommended = Recommandé
priority-default-optional = Facultatif

# Gallery
gallery-empty-filtered = Aucun document correspondant.
gallery-empty = Aucun document dans cette collection.
gallery-untagged = Sans marqueurs
gallery-untagged-desc = Les documents de cette section n’ont pas de marqueurs.
gallery-uncredited = Sans créateur
gallery-uncredited-desc = Les documents de cette section n’ont pas de créateur.
gallery-empty-subcollections = Aucune sous-collection ni document dans cette collection.
gallery-unnumbered = Non numéroté
gallery-unnumbered-desc = Attribué sans numéro de séance.
gallery-sort-auto = Auto
gallery-sort-auto-title = Ordre automatique (collection ou syllabus)
gallery-sort-az = A–Z
gallery-sort-az-title = Trier de A à Z
gallery-sort-date = Date
gallery-sort-date-title = Trier par date (plus récent d’abord)
gallery-sort-date-added = Ajouté
gallery-sort-date-added-title = Trier par date d’ajout (plus récent d’abord)
gallery-group-none = Aucun
gallery-group-none-title = Pas de regroupement
gallery-group-auto = Automatique
gallery-group-auto-title = Regroupement automatique
gallery-group-type = Type
gallery-group-type-title = Grouper par type de document
gallery-group-creator = Créateur
gallery-group-creator-title = Grouper par créateur
gallery-group-tags = Marqueurs
gallery-group-tags-title = Grouper par marqueurs
gallery-group-subcollections = Sous-collections
gallery-group-subcollections-title = Grouper par sous-collections
gallery-group-classes = Séances
gallery-group-classes-title = Grouper par séances
gallery-layout-cover = Couverture
gallery-layout-cover-title = Image de couverture
gallery-layout-card = Carte
gallery-layout-card-title = Cartes du syllabus
gallery-layout-magazine = Magazine
gallery-layout-magazine-title = Mise en page magazine à tailles mixtes
magazine-shelf-watch = À regarder
magazine-shelf-watch-title = Vidéos ajoutées récemment
magazine-shelf-listen = À écouter
magazine-shelf-listen-title = Audio ajouté récemment
magazine-highlights = Surlignages
gallery-options-aria = Options de la vue Galerie
gallery-options-title = Options d’affichage
gallery-menu-view = Affichage
gallery-menu-sort = Trier
gallery-menu-group = Grouper par
gallery-menu-type-size = Taille du texte
gallery-type-small = Petit
gallery-type-small-title = Texte magazine plus petit
gallery-type-large = Grand
gallery-type-large-title = Texte magazine plus grand
gallery-in-this-collection = Dans cette collection
gallery-groups-nav-aria = Groupes
gallery-group-jump = Afficher { $name }
gallery-prefs-summary = { $layout } / { $sort } / { $group }
gallery-page-of = Page { $page } sur { $total }
gallery-save-globally = Enregistrer par défaut
gallery-save-globally-title = Enregistrer cette option comme valeur par défaut pour toutes les collections
gallery-save-globally-active-title = Le réglage de cette collection diffère du défaut. Cliquez pour l’enregistrer comme défaut.
galleryTour-settings-title = Options de la galerie
galleryTour-settings-desc =
    Ouvrez le menu dans le coin pour changer l’affichage, le tri et le groupement. Nous parcourons les trois mises en page.
galleryTour-cover-title = Vue Couverture
galleryTour-cover-desc =
    Couverture montre chaque notice comme une image — livres, articles et pages web d’un coup d’œil.
galleryTour-magazine-title = Vue Magazine
galleryTour-magazine-desc =
    Magazine mélange tuiles grandes et petites, comme un sommaire. Idéal pour parcourir et lire les accroches.
galleryTour-card-title = Vue Cartes
galleryTour-card-desc =
    Les cartes reprennent la mise en page du syllabus, groupées par type de document pour rassembler les lectures similaires.
galleryTour-choose-title = Choisir le défaut
galleryTour-choose-desc =
    Avec quelle mise en page la Galerie doit-elle s’ouvrir ? Vous pourrez changer cela plus tard dans les préférences de Zotero Syllabus, ou avec Enregistrer par défaut.
galleryTour-skip = Ignorer

# Reading schedule
schedule-edit-settings = Modifier les paramètres du planning des lectures
schedule-empty-title = Aucune lecture planifiée
schedule-empty-desc = Ajoutez des dates de lecture aux séances pour les voir ici.
schedule-this-week = Cette semaine
schedule-next-week = Semaine prochaine
schedule-settings-title = Paramètres du planning des lectures
schedule-settings-back = Retour au planning des lectures
schedule-settings-library = Collection de la bibliothèque
schedule-settings-desc =
    Désactivé par défaut. Une fois activé, une collection de premier niveau « Planning des lectures » est maintenue dans Ma bibliothèque, avec un dossier pour chaque date de lecture récente et à venir. Les dossiers sont créés, renommés et remplis automatiquement. Désactiver supprime cette collection ; les documents des syllabus restent en place.
schedule-settings-checkbox = Générer la collection « Planning des lectures » ?
schedule-day-managed-banner = Géré automatiquement à partir de vos syllabus. Les modifications ici sont écrasées.
schedule-day-empty = Aucune lecture planifiée pour ce jour.
schedule-window-empty = Pas encore de lectures dans la fenêtre du planning. Ajoutez des dates de lecture aux séances pour les voir ici.
schedule-no-dates = Aucune date
schedule-of-collection = de { $name }
schedule-of-collection-in-library = de { $collection } ({ $library })
schedule-open-syllabus = Ouvrir le syllabus de { $title }
class-folder-managed-banner = Géré automatiquement à partir de ce syllabus. Les modifications dans ce dossier sont écrasées.

# Columns
column-reading-instructions = Consignes de lecture
column-status = État
column-reading-time = Temps de lecture
column-syllabus-info = Infos du syllabus
column-class-hash = n°{ $number }

# Progress / dialogs
dialog-save-export = Enregistrer l’export du syllabus
progress-import-success-title = Import réussi
progress-import-success-text = Métadonnées du syllabus importées et fusionnées avec succès
progress-import-error-title = Erreur d’import
progress-import-bad-file = Veuillez déposer un fichier .syllabus
progress-print-preparing = Préparation du syllabus pour l’impression…
progress-print-failed = Impossible d’enregistrer le PDF du syllabus
dialog-save-pdf = Enregistrer le PDF du syllabus
file-filter-pdf = PDF
progress-saving-pdf = Enregistrement du PDF…
dialog-save-file = Enregistrer le fichier
progress-translator-install-error = Erreur lors de l’installation des extracteurs de listes de lectures
progress-migrate-start =
    { $count ->
        [one] Migration de { $count } syllabus vers des notes de collection…
       *[other] Migration de { $count } syllabus vers des notes de collection…
    }
progress-migrate-item = Migration de { $current } sur { $total }…
progress-migrate-done =
    { $count ->
        [one] { $count } syllabus migré
       *[other] { $count } syllabus migrés
    }
progress-migrate-empty-cleared =
    { $count ->
        [one] { $count } préférence vide effacée
       *[other] { $count } préférences vides effacées
    }
progress-migrate-not-found =
    { $count ->
        [one] { $count } collection introuvable
       *[other] { $count } collections introuvables
    }
progress-migrate-failed = { $count } échec(s)
progress-migrate-remaining = { $count } restant(s) dans les préférences
reading-time-minutes = { $minutes } min
reading-time-hours =
    { $hours ->
        [one] { $hours } h
       *[other] { $hours } h
    }
reading-time-hours-and-minutes =
    { $hours ->
        [one] { $hours } h { $minutes } min
       *[other] { $hours } h { $minutes } min
    }

# Explorer
explorer-configure = Configurer
explorer-configure-display = Afficher sur l’accueil
explorer-configure-reorder = Réorganiser
explorer-library-count =
    { $count ->
        [one] { $count } document
       *[other] { $count } documents
    }
explorer-nav-aria = Sections
explorer-customize = Personnaliser
explorer-customize-done = Terminé
explorer-add-shelf = Ajouter une étagère
explorer-add-collection = Collection…
explorer-add-saved-search = Recherche enregistrée…
explorer-shelf-upcoming-deadlines = Échéances de lecture à venir
explorer-shelf-upcoming-deadlines-desc = Pour cette semaine, ou la prochaine échéance dans le mois.
explorer-go-to-reading-schedule = Aller au planning des lectures
explorer-go-to-my-annotations = Tout voir
explorer-shelf-watch-now = Regarder
explorer-shelf-watch-now-desc = Les vidéos les plus récentes de cette bibliothèque.
explorer-shelf-listen-now = Écouter
explorer-shelf-listen-now-desc = Les fichiers audio les plus récents de cette bibliothèque.
explorer-shelf-recently-read = Lu récemment
explorer-shelf-recently-read-desc = Documents ouverts récemment.
explorer-shelf-recently-added = Ajoutés récemment
explorer-shelf-recently-added-desc = Ajoutés au cours des { $days } derniers jours.
explorer-recent-in-feed = Récent dans le flux
explorer-recent-in-feed-desc = Derniers éléments de vos flux.
explorer-recent-annotations = Annotations récentes
explorer-recent-annotations-desc = Surlignages que vous avez faits récemment.
my-annotations-empty = Aucune annotation récente
my-annotations-desc = Annotations des documents que vous avez lus récemment.
explorer-annotations-size = Taille
explorer-annotations-size-small-title = Citations abrégées
explorer-annotations-size-large-title = Citations complètes, les 7 dernières
explorer-empty = Rien à afficher pour l’instant
explorer-shelf-empty = Aucun élément
explorer-move-up = Monter l’étagère
explorer-move-down = Descendre l’étagère
explorer-remove-shelf = Supprimer l’étagère

# Collection tree
tree-tooltip-reading-schedule = Planning des lectures (géré automatiquement)
tree-tooltip-auto-managed = Géré automatiquement par Zotero Syllabus
tree-tooltip-syllabus = Syllabus

# User guide sample items (created at tour time; not used as match keys)
tour-sample-reading-1 = Lecture d’exemple : Prendre en main les listes de cours
tour-sample-reading-2 = Lecture d’exemple : Annoter au fil de la lecture
tour-sample-reading-3 = Lecture d’exemple : Planifier la semaine

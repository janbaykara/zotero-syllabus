startup-begin = De add-on wordt geladen
startup-finish = De add-on is gereed
enable-syllabus-title = Omzetten naar een syllabus?
enable-syllabus-message = “{ $name }” omzetten naar een syllabus? Er wordt een syllabusnotitie in deze collectie opgeslagen.
enable-subcollections-title = Subcollecties per bijeenkomst beheren?
enable-subcollections-message =
    Als u dit inschakelt, beheert de plug-in kindcollecties onder “{ $name }”. Dat kan mappen die u al hebt verwijderen of overschrijven.

    Wat er gebeurt:

    • Per bijeenkomst met toegewezen lectuur wordt een map aangemaakt of overgenomen, en hernoemd zodat die bij de syllabus past (bijvoorbeeld “Bijeenkomst 1: Titel”).

    • Bijeenkomsten zonder toegewezen lectuur krijgen geen map. Bestaande mappen voor die bijeenkomsten worden verwijderd.

    • Kindcollecties die niet die bijeenkomstmappen zijn — en die geen eigen syllabusnotitie hebben — worden verwijderd. Items worden niet uit de bibliotheek verwijderd; ze blijven in de bovenliggende collectie.

    • De items in elke bijeenkomstmap worden overschreven vanuit de syllabusnotitie. Extra items in een map worden alleen uit de map verwijderd.

    • Een bijeenkomst uit de syllabus halen verwijdert die bijeenkomstmap.

    • Als u een bijeenkomstmap verwijdert die nog toegewezen lectuur heeft, maakt de plug-in die opnieuw.

    Later uitschakelen stopt het beheer van mappen; bestaande mappen blijven staan.

    Doorgaan?
enable-reading-schedule-collection-title = Collectie Leesschema genereren?
enable-reading-schedule-collection-message =
    Als u dit inschakelt, wordt in Mijn bibliotheek een collectie op het hoogste niveau “Leesschema” aangemaakt, met een map voor elke leesdatum (vanaf 10 dagen geleden).

    Wat er gebeurt:

    • Datum-mappen worden automatisch aangemaakt, hernoemd en gevuld vanuit uw syllabi.

    • Items in die mappen worden overschreven vanuit het schema. Extra items worden alleen uit de map verwijderd — niet uit de bibliotheek.

    • Als u de collectie of een datum-map verwijdert, maakt de plug-in die opnieuw zolang deze instelling aanstaat.

    • Syllabi uit groepsbibliotheken worden niet meegenomen (items kunnen niet tussen bibliotheken).

    Later uitschakelen verwijdert de collectie “Leesschema” en de datum-mappen. De items in uw syllabi blijven staan.

    Doorgaan?
disable-reading-schedule-collection-title = Collectie Leesschema verwijderen?
disable-reading-schedule-collection-message =
    Uitschakelen verwijdert de beheerde collectie “Leesschema” en de datum-mappen.

    Items worden niet uit uw bibliotheek verwijderd; ze blijven in hun oorspronkelijke syllabuscollecties.

    Doorgaan?
prefs-title = Zotero Syllabus
prefs-table-title = Titel
prefs-table-detail = Detail
tabpanel-lib-tab-label = Bibliotheektab
tabpanel-reader-tab-label = Readertab
menu-toggle-bibliography = Bibliografie tonen/verbergen
managed-folder-banner-title = Automatisch beheerde map
managed-folder-banner-class =
    Voeg hier geen items toe en verwijder er geen. Deze bijeenkomstmap wordt gesynchroniseerd met de syllabus; handmatige wijzigingen worden overschreven.
managed-folder-banner-schedule =
    Voeg hier geen items toe en verwijder er geen. Deze leesschema-map wordt gesynchroniseerd met uw syllabi; handmatige wijzigingen worden overschreven.
menuHelp-openUserGuide = Gebruikershandleiding van Zotero Syllabus openen
menuHelp-openDocumentation = Zotero Syllabus-documentatie
userGuide-start-title = Welkom bij Zotero Syllabus
userGuide-start-desc =
    Maak van elke Zotero-collectie een leeslijst voor de cursus — orden per bijeenkomst, stel prioriteiten in en houd bij wat u hierna moet lezen.
userGuide-start-close = Later herinneren
userGuide-exit = Tour afsluiten
optional-features-intro-title = Choose your views
optional-features-intro-desc =
    Pick which surfaces to show. You can change these anytime in Preferences. Syllabus view is recommended to get started.
optional-features-syllabus-title = Syllabus view
optional-features-syllabus-desc =
    Structure a collection by class session, drag readings into place, and edit priorities and instructions.
optional-features-gallery-title = Gallery view
optional-features-gallery-desc =
    Browse a collection as covers, magazine spreads, or cards — great for finding the next thing to open.
optional-features-explorer-title = Home view
optional-features-explorer-desc =
    A library home with shelves for recent items, upcoming deadlines, and more.
optional-features-reading-schedule-title = Reading Schedule
optional-features-reading-schedule-desc =
    A calendar tab that gathers class due dates across your syllabi so you can see what’s next.
optional-features-annotations-title = Annotation Feed
optional-features-annotations-desc =
    A timeline of your highlights and notes across sources — read them as one conversation.
optional-features-enabled = On
optional-features-disabled = Off
optional-features-toggle = { $state ->
    [on] On — click to turn off
   *[off] Off — click to turn on
}
optional-features-continue-title = Ready to continue
optional-features-continue-desc =
    Next we’ll walk through the views you enabled. You can change these later under Preferences → Zotero Syllabus → Views.
userGuide-collection-title = Beginnen vanuit een collectie
userGuide-collection-desc =
    Syllabi horen bij collecties. We openen een oefencollectie “Syllabus Tour” met een paar voorbeeldteksten.
userGuide-syllabusButton-title = Omzetten naar een syllabus
userGuide-syllabusButton-desc =
    Klik op Omzetten naar syllabus in de itemwerkbalk om deze collectie om te zetten naar uw cursusoverzicht. De rondleiding schakelt daar automatisch naartoe.
userGuide-addClass-title = Een bijeenkomst toevoegen
userGuide-addClass-desc =
    Bijeenkomsten (of weken / sessies — u kunt de naam later wijzigen) zijn de onderdelen van uw syllabus. Voeg er een toe om te beginnen.
userGuide-assign-title = Lectuur toewijzen
userGuide-assign-desc =
    Sleep items naar een bijeenkomst, of rechtsklik → Toewijzen aan een bijeenkomst. Niet-toegewezen items blijven onder Verdere literatuur.
userGuide-itemPane-title = Bewerken in het itemdeelvenster
userGuide-itemPane-desc =
    Selecteer een tekst om bijeenkomstnummer, prioriteit, aanwijzingen en afrondingsstatus in te stellen in het gedeelte Leesopdrachten.
userGuide-readingDate-title = Een inleverdatum instellen
userGuide-readingDate-desc =
    Elke bijeenkomst kan een leesdatum hebben. We zetten er een op Bijeenkomst 1 als u op Volgende klikt — daarna kunt u het Leesschema openen.
userGuide-readingSchedule-title = Leesschema openen
userGuide-readingSchedule-desc =
    Het Leesschema verzamelt bijeenkomsten met inleverdatum uit al uw syllabi. Volgende opent het zodat u ziet wat er aankomt.
userGuide-readingSchedule-light-title = Open Reading Schedule
userGuide-readingSchedule-light-desc =
    The Reading Schedule tab gathers class due dates across your syllabi. Next opens it from the tab bar.
userGuide-home-title = Home view
userGuide-home-desc =
    At the library root, switch to Home for shelves of recent items and upcoming deadlines. Next selects your library home.
userGuide-subcollections-title = Optioneel: bijeenkomstmappen
userGuide-subcollections-desc =
    Wilt u mapspiegels per bijeenkomst? Schakel Subcollecties per bijeenkomst in bij Instellingen. Laat dit uit, tenzij u wilt dat de plug-in kindmappen beheert.
userGuide-finish-title = U bent er klaar voor
userGuide-finish-desc =
    Open deze rondleiding wanneer u wilt via Help → Gebruikershandleiding van Zotero Syllabus openen. Succes met studeren!
userGuide-finish-prefs-title = You’re set
userGuide-finish-prefs-desc =
    Turn views on or off anytime in Preferences → Zotero Syllabus → Views. You can reopen this tour from Help.
userGuide-empty-title = Deze collectie per bijeenkomst ordenen
userGuide-empty-desc =
    Voeg bijeenkomsten toe voor elke week of sessie en wijs lectuur toe. U kunt ook een korte rondleiding volgen.
userGuide-empty-tour = Rondleiding starten

# Shared
app-name = Zotero Syllabus
this-collection = deze collectie
untitled = Naamloos
nav-back = Terug
nav-previous = Vorige
nav-next = Volgende

# View tabs / toolbar
view-tab-checklist = Checklist
view-tab-checklist-tooltip = Weergeven als checklist
view-tab-syllabus = Syllabus
view-tab-syllabus-tooltip = Weergeven als syllabus
view-tab-create-syllabus = Omzetten naar syllabus
view-tab-create-syllabus-tooltip = Deze collectie omzetten naar een syllabus
view-tab-table = Tabel
view-tab-table-tooltip = Weergeven als tabel
view-tab-gallery = Galerij
view-tab-gallery-tooltip = Weergeven als galerij
view-tab-explorer = Home
view-tab-explorer-tooltip = View as Home
view-tab-reading-schedule = Leesschema
reading-schedule-desc = Class due dates across your syllabi, so you can see what’s next.
view-tab-my-annotations = Annotation Feed
toolbar-my-annotations-open = Open Annotation Feed
toolbar-reading-schedule-review = Leesschema bekijken
toolbar-reading-schedule-open = Leesschema openen

# Context menus
menu-set-priority = Prioriteit instellen
menu-none = (Geen)
menu-assign-to-class = Toewijzen aan een bijeenkomst
menu-no-collection = (Geen collectie geselecteerd)
menu-class-label = { $nomenclature } { $number }
menu-add-to-new-class = Toevoegen aan nieuwe { $nomenclature } { $number }
menu-set-reading-status = Leesstatus instellen
status-done = Afgerond
status-not-done = Niet afgerond

# Syllabus page
page-toc-title = Inhoudsopgave
placeholder-add-title = Een titel toevoegen…
page-density-cycle = Overschakelen naar { $next }
page-density-row = Rij
page-density-standard = Standaard
page-density-expanded = Uitgebreid
page-reader-enable = Selectievakjes inschakelen
page-reader-disable = Selectievakjes uitschakelen
page-export = Syllabusbestand exporteren
page-import = Syllabusbestand importeren
page-edit-settings = Syllabusinstellingen bewerken
page-lock = Syllabus vergrendelen
page-unlock = Syllabus ontgrendelen
page-view-options-aria = Syllabus view options
page-view-checkboxes = Checkboxes
page-print = Syllabus opslaan als PDF, Word, Markdown of HTML
page-save-pdf = PDF
page-save-word = Word
page-save-markdown = Markdown
page-save-html = HTML
page-publish = Publish online…
placeholder-course-code = Cursuscode
placeholder-institution = Instelling
placeholder-add-description = Een beschrijving toevoegen…
page-add-class = { $nomenclature } { $number } toevoegen
page-add-to-class = Toevoegen aan { $nomenclature } { $number }
page-drop-create-class = Zet het item hier neer om { $nomenclature } { $number } aan te maken
page-drop-import-file = Zet bestanden neer om ze aan deze collectie toe te voegen
further-reading-heading = Verdere literatuur
sort-label = Sorteren
further-reading-sort-aria = Verdere literatuur sorteren
sort-by-title = Titel
sort-by-creator = Auteur
sort-by-date = Datum
further-reading-empty-desc = Items in dit gedeelte zijn aan geen enkele bijeenkomst toegewezen.
toc-empty = Geen bijeenkomsten beschikbaar
placeholder-url = https://
links-delete = Koppeling verwijderen
links-edit = Koppeling bewerken
links-add = Koppeling toevoegen
bibliography-heading = Bibliografie

# Class groups / cards
mark-done = Markeren als afgerond
mark-not-done = Markeren als niet afgerond
class-due-date-label = Inleverdatum:
class-reset-sort = Sorteervolgorde herstellen
class-move-up = { $nomenclature } omhoog
class-move-down = { $nomenclature } omlaag
class-delete = { $nomenclature } verwijderen
class-insert-here = { $nomenclature } hier toevoegen
class-dropzone-hint = Sleep items naar { $nomenclature } { $number }
due-date-clear = Inleverdatum wissen
due-date-add = Een inleverdatum toevoegen
placeholder-select-date = Datum selecteren
item-in-publication = in { $name }
attachment-url = URL
attachment-pdf = PDF
attachment-snapshot = Snapshot
attachment-epub = EPUB
attachment-html = HTML
attachment-doc = DOC
attachment-txt = TXT
attachment-zip = ZIP
attachment-file = Bestand
attachment-view = Weergeven
attachment-open = { $label } openen
assignment-duplicate = Dubbele toewijzing maken
assignment-duplicate-label = Dupliceren
assignment-unassign-class = Uit bijeenkomst verwijderen
assignment-unassign-syllabus = Uit syllabus verwijderen
assignment-unassign-label = Toewijzing opheffen
priority-set-to = Prioriteit instellen op { $name }
priority-clear = Prioriteit wissen
youtube-play = { $title } afspelen op YouTube

# Item pane
item-pane-not-found = Item niet gevonden
item-pane-none-selected = Geen items geselecteerd
item-pane-n-selected = { $count } items geselecteerd
item-pane-current-view = huidige weergave
item-pane-also-assigned = ook toegewezen aan
item-pane-assignment-n = Opdracht #{ $number }
item-pane-assignment-for = voor { $title }
item-pane-due = Inleveren { $date }
item-pane-reference-material = Referentiemateriaal
item-pane-class-named = { $nomenclature } { $number }: { $title }
item-pane-mark-done = Als afgerond markeren
placeholder-class-number = bijv. 1, 2, 3…
field-priority = Prioriteit
field-instructions = Aanwijzingen
placeholder-instructions = Aanwijzingen voor deze opdracht toevoegen…
assignment-delete = Opdracht verwijderen
item-pane-select-collection = Selecteer een collectie om syllabustoewijzingen te zien

# Settings
settings-title = Syllabusinstellingen
settings-window-title = Instellingen voor { $name }
settings-view = View
settings-view-desc = Density and checkboxes for this syllabus.
settings-density = Density
settings-file = Syllabus file
settings-file-desc = Export or import a .syllabus metadata file for this collection.
settings-back = Terug naar syllabusweergave
settings-nomenclature = Benaming
settings-nomenclature-desc = Kies de term voor afzonderlijke sessies (bijv. “week”, “college”, “bijeenkomst”, “onderdeel”).
settings-singular = Enkelvoud
settings-nomenclature-placeholder = bijv. week, college, bijeenkomst, onderdeel
settings-plural-label = Meervoud:
settings-subcollections = Subcollecties per bijeenkomst
settings-subcollections-desc = Als dit aanstaat, krijgt elke bijeenkomst met toegewezen lectuur een map onder deze collectie.
settings-subcollections-checkbox = Subcollecties aanmaken?
settings-bib-style = Bibliografiestijl
settings-bib-style-desc = Kies een CSL-stijl (Citation Style Language) voor bibliografische verwijzingen.
settings-citation-style = Citatestijl
settings-user-default = Gebruikersstandaard
settings-user-default-named = Gebruikersstandaard: { $name }
settings-priorities = Prioriteiten
settings-priorities-desc = Pas prioriteitsnamen, kleuren en volgorde voor dit syllabus aan.
settings-priorities-global-title = Globale standaardprioriteiten
settings-priorities-global-desc = Nieuwe syllabi kopiëren deze prioriteiten. Bestaande behouden hun eigen lijsten.
settings-priorities-global-link = Globale standaarden bewerken…
settings-priorities-global-done = Klaar
settings-priorities-global-reset = Herstellen naar ingebouwde standaarden
settings-priorities-set-global = Gebruik als globale standaarden
settings-priorities-set-global-confirm-title = Gebruiken als globale standaarden?
settings-priorities-set-global-confirm-message =
    Dit vervangt je globale standaardprioriteiten door de prioriteiten van dit syllabus. Nieuwe syllabi kopiëren deze namen, kleuren en volgorde. Bestaande syllabi veranderen niet.
settings-priorities-set-global-done = Opgeslagen als globale standaarden voor nieuwe syllabi
settings-priorities-reset-global = Herstellen naar globale standaarden
settings-priorities-reset-global-confirm-title = Herstellen naar globale standaarden?
settings-priorities-reset-global-confirm-message =
    Dit vervangt de prioriteiten van dit syllabus door je globale standaarden. Lezingen met prioriteiten die niet in de globale lijst staan, moeten worden verplaatst of gewist.
settings-priorities-reset-global-done = Prioriteiten hersteld naar globale standaarden
settings-add-priority = Nieuwe prioriteit toevoegen
settings-add-priority-button = Prioriteit toevoegen
settings-new-priority-name = Nieuwe prioriteit
settings-priority-move-up = Omhoog
settings-priority-move-down = Omlaag
settings-priority-color = Prioriteitskleur
settings-priority-name-placeholder = Prioriteitsnaam
settings-priority-delete = Prioriteit verwijderen
settings-priority-delete-title = Prioriteit verwijderen?
settings-priority-delete-message =
    { $count ->
        [one] { $count } lezing gebruikt “{ $name }”. Kies wat je ermee wilt doen voordat je deze prioriteit verwijdert.
       *[other] { $count } lezingen gebruiken “{ $name }”. Kies wat je ermee wilt doen voordat je deze prioriteit verwijdert.
    }
settings-priority-delete-migrate-label = Lezingen verplaatsen naar
settings-priority-delete-migrate = Verplaatsen en verwijderen
settings-priority-delete-clear = Prioriteit wissen
settings-priority-delete-cancel = Annuleren
settings-priority-name-label = Naam
settings-priority-preview = Voorbeeld:
priority-default-course-info = Cursusinformatie
priority-default-essential = Verplicht
priority-default-recommended = Aanbevolen
priority-default-optional = Optioneel

# Gallery
gallery-empty-filtered = Geen overeenkomende items.
gallery-empty = Geen items in deze collectie.
gallery-untagged = Zonder tags
gallery-untagged-desc = Items in dit gedeelte hebben geen tags.
gallery-uncredited = Zonder maker
gallery-uncredited-desc = Items in dit gedeelte hebben geen maker.
gallery-empty-subcollections = Geen subcollecties of items in deze collectie.
gallery-unnumbered = Ongenummerd
gallery-unnumbered-desc = Toegewezen zonder bijeenkomstnummer.
gallery-sort-auto = Auto
gallery-sort-auto-title = Automatische volgorde (collectie of syllabus)
gallery-sort-az = A–Z
gallery-sort-az-title = Sorteren A–Z
gallery-sort-date = Datum
gallery-sort-date-title = Sorteren op datum (nieuwste eerst)
gallery-sort-date-added = Toegevoegd
gallery-sort-date-added-title = Sorteren op toevoegdatum (nieuwste eerst)
gallery-sort-last-read = Last Read
gallery-sort-last-read-title = Sort by last read (most recent first)
gallery-group-none = Geen
gallery-group-none-title = Geen groepering
gallery-group-auto = Automatisch
gallery-group-auto-title = Automatische groepering
gallery-group-type = Type
gallery-group-type-title = Groeperen op itemtype
gallery-group-creator = Maker
gallery-group-creator-title = Groeperen op maker
gallery-group-tags = Tags
gallery-group-tags-title = Groeperen op tags
gallery-group-subcollections = Subcollecties
gallery-group-subcollections-title = Groeperen op subcollecties
gallery-group-classes = Bijeenkomsten
gallery-group-classes-title = Groeperen op bijeenkomsten
gallery-layout-cover = Omslag
gallery-layout-cover-title = Omslagafbeelding
gallery-layout-card = Kaart
gallery-layout-card-title = Syllabuskaarten
gallery-layout-annotations = Annotaties
gallery-layout-annotations-title = Omslagen met alle annotaties
gallery-annotations-empty = Geen annotaties
gallery-annotations-none-heading = Geen annotaties
gallery-annotations-show-empty = Items zonder annotaties tonen
gallery-layout-magazine = Magazine
gallery-layout-magazine-title = Magazinelay-out met verschillende groottes
gallery-menu-packing = Packing
gallery-packing-vertical = Vertical
gallery-packing-vertical-title = Covers with abstracts in a reading stack
gallery-packing-grid = Grid
gallery-packing-grid-title = Equal-size magazine tiles
gallery-packing-packed = Packed
gallery-packing-packed-title = Mixed-size magazine layout

# Gallery notes (collection-scoped child notes)
gallery-note-add = Add Gallery Note
gallery-note-edit = Edit Gallery Note
gallery-note-remove = Remove Gallery Note
gallery-note-label = Gallery note
magazine-shelf-watch = Kijken
magazine-shelf-watch-title = Onlangs toegevoegde video’s
magazine-shelf-listen = Luisteren
magazine-shelf-listen-title = Onlangs toegevoegde audio
magazine-highlights = Markeringen
gallery-options-aria = Opties voor galerijweergave
gallery-options-title = Weergaveopties
gallery-menu-view = Weergave
gallery-menu-sort = Sorteren
gallery-menu-group = Groeperen op
gallery-menu-type-size = Tekstgrootte
gallery-type-small = Klein
gallery-type-small-title = Kleinere magazinetekst
gallery-type-large = Groot
gallery-type-large-title = Grotere magazinetekst
gallery-in-this-collection = In deze collectie
gallery-groups-nav-aria = Groepen
gallery-group-jump = { $name } tonen
gallery-prefs-summary = { $layout } / { $sort } / { $group }
gallery-page-of = Pagina { $page } van { $total }
gallery-save-globally = Opslaan als standaard
gallery-save-globally-title = Deze optie als standaard voor alle collecties opslaan
gallery-save-globally-active-title = De instelling van deze collectie wijkt af van de standaard. Klik om als standaard op te slaan.
galleryTour-settings-title = Galerijopties
galleryTour-settings-desc =
    Open het menu in de hoek om weergave, sortering en groepering te wisselen. We lopen de drie lay-outs langs.
galleryTour-cover-title = Omslagweergave
galleryTour-cover-desc =
    Omslag toont elk item als omslagbeeld — boeken, artikelen en webpagina’s in één oogopslag.
galleryTour-magazine-title = Magazineweergave
galleryTour-magazine-desc =
    Magazine mengt grote en kleine tegels, als een inhoudsopgave. Handig om te bladeren en korte teksten te lezen.
galleryTour-card-title = Kaartweergave
galleryTour-card-desc =
    Kaarten gebruiken dezelfde syllabuslay-out, gegroepeerd op itemtype zodat vergelijkbare lectuur bij elkaar staat.
galleryTour-choose-title = Standaard kiezen
galleryTour-choose-desc =
    Met welke lay-out moet Galerij openen? Je kunt dit later wijzigen in de Zotero Syllabus-voorkeuren of met Opslaan als standaard.
galleryTour-skip = Overslaan

# Reading schedule
schedule-edit-settings = Instellingen van het leesschema bewerken
schedule-empty-title = Geen lectuur ingepland
schedule-empty-desc = Voeg leesdata toe aan bijeenkomsten om ze hier te zien.
schedule-this-week = Deze week
schedule-next-week = Volgende week
schedule-settings-title = Instellingen van het leesschema
schedule-settings-library = Bibliotheekcollectie
schedule-settings-desc =
    Standaard uit. Als dit aanstaat, wordt in Mijn bibliotheek een collectie op het hoogste niveau “Leesschema” bijgehouden, met een map voor elke recente en komende leesdatum. Mappen worden automatisch aangemaakt, hernoemd en gevuld. Uitschakelen verwijdert die collectie; items in syllabi blijven staan.
schedule-settings-checkbox = Collectie “Leesschema” genereren?
schedule-day-managed-banner = Automatisch beheerd vanuit uw syllabi. Wijzigingen hier worden overschreven.
schedule-day-empty = Geen lectuur ingepland voor deze dag.
schedule-window-empty = Nog geen lectuur in het schemavenster. Voeg leesdata toe aan bijeenkomsten om ze hier te zien.
schedule-no-dates = Geen data
schedule-of-collection = van { $name }
schedule-of-collection-in-library = van { $collection } ({ $library })
schedule-open-syllabus = Syllabus van { $title } openen
class-folder-managed-banner = Automatisch beheerd vanuit deze syllabus. Wijzigingen in deze map worden overschreven.

# Pinned (Reading Schedule)
pinned-section-heading = Pinned
pinned-item-label = Pinned item
pinned-next-up-from = Next up from { $name }
pinned-menu-pin-item = Add to Pinned
pinned-menu-unpin-item = Remove from Pinned
pinned-menu-pin-syllabus = Pin collection
pinned-menu-unpin-syllabus = Unpin collection
pinned-unpin-item = Unpin
pinned-unpin-syllabus = Unpin collection
pinned-edit-intention = Edit intention
pinned-unpin-note-title = Remove from Pinned?
pinned-unpin-note-message =
    This item has an intention note. Keep the note, delete it, or cancel.
pinned-unpin-keep = Keep note
pinned-unpin-delete = Delete note
pinned-unpin-cancel = Cancel
pinned-done-unpin-title = Unpin this item?
pinned-done-unpin-message = Remove this item from Pinned?
pinned-done-unpin-syllabus-title = Unpin this collection?
pinned-done-unpin-syllabus-message = Remove this collection from Pinned?
pinned-syllabus-progress = { $done } of { $total }

# Columns
column-reading-instructions = Leesaanwijzingen
column-status = Status
column-reading-time = Leestijd
column-syllabus-info = Syllabusinfo
column-class-hash = #{ $number }

# Progress / dialogs
dialog-save-export = Syllabusexport opslaan
progress-import-success-title = Import geslaagd
progress-import-success-text = Syllabusmetadata succesvol geïmporteerd en samengevoegd
progress-import-error-title = Importfout
progress-import-bad-file = Zet een .syllabus-bestand neer
progress-print-preparing = Syllabus voorbereiden…
progress-print-failed = Syllabus kon niet worden opgeslagen
progress-publish-preparing = Preparing publish…
progress-publish-uploading = Uploading { $current } of { $total }…
progress-publish-done = Published — link copied
progress-publish-failed = Could not publish the syllabus
progress-publish-auth = Waiting for Zotero sign-in in your browser…
progress-publish-auth-failed = Could not sign in for publish
progress-publish-oauth-unconfigured = Publish OAuth is not set up on the server
progress-publish-unconfigured = Publish hosting is not configured
dialog-publish-confirm-title = Publish syllabus online?
dialog-publish-confirm-text = This uploads the syllabus page and attached files to a public URL. Anyone with the link can open them. Only publish materials you have the right to share.
dialog-publish-confirm-ok = Publish
dialog-publish-confirm-cancel = Cancel
dialog-publish-done-title = Syllabus published
dialog-ok = OK
dialog-publish-done-text =
    Your syllabus is online at:
    { $url }

    The link is also shown at the top of the syllabus page and was copied to the clipboard.
publish-status-heading-busy = Publishing
publish-status-auth = Waiting for Zotero sign-in in your browser. Return here when the browser says you can close the window.
publish-status-preparing = Preparing syllabus and files…
publish-status-uploading = Uploading { $current } of { $total }…
publish-status-done = Published
publish-status-url-label = Public link:
publish-status-sync = Sync changes
publish-status-copy = Copy link
publish-status-open = Open link
publish-status-dismiss = Dismiss
publish-status-copied = Link copied
publish-status-unpublish = Unpublish
publish-status-unpublishing = Removing online copy…
publish-status-heading-unpublishing = Unpublishing
publish-status-unpublished = Syllabus unpublished
dialog-publish-unpublish-title = Unpublish syllabus?
publish-unpublish-confirm =
    This permanently removes the online copy and attached files. Anyone with the link will see that the page is not found.
progress-publish-unpublish-failed = Could not unpublish syllabus
publish-html-download-ris = Download RIS
publish-html-download-bib = Download BibTeX
publish-html-download-rdf = Zotero RDF
publish-html-published-at = published { $date }
publish-html-credit = Published with { $syllabus }, a plugin for organising reading lists from items you store in { $zotero } reference manager
dialog-save-pdf = Syllabus-PDF opslaan
file-filter-pdf = PDF
dialog-save-word = Syllabus als Word opslaan
file-filter-word = Word
dialog-save-markdown = Syllabus als Markdown opslaan
file-filter-markdown = Markdown
dialog-save-html = Syllabus als HTML opslaan
file-filter-html = HTML
progress-saving-pdf = PDF opslaan…
dialog-save-file = Bestand opslaan
progress-translator-install-error = Fout bij het installeren van leeslijst-scrapers
progress-migrate-start =
    { $count ->
        [one] { $count } syllabus migreren naar collectienotities…
       *[other] { $count } syllabi migreren naar collectienotities…
    }
progress-migrate-item = { $current } van { $total } migreren…
progress-migrate-done =
    { $count ->
        [one] { $count } syllabus gemigreerd
       *[other] { $count } syllabi gemigreerd
    }
progress-migrate-empty-cleared =
    { $count ->
        [one] { $count } lege voorkeur gewist
       *[other] { $count } lege voorkeuren gewist
    }
progress-migrate-not-found =
    { $count ->
        [one] { $count } collectie niet gevonden
       *[other] { $count } collecties niet gevonden
    }
progress-migrate-failed = { $count } mislukt
progress-migrate-remaining = { $count } over in voorkeuren
reading-time-minutes = { $minutes } min
reading-time-hours =
    { $hours ->
        [one] { $hours } uur
       *[other] { $hours } uur
    }
reading-time-hours-and-minutes =
    { $hours ->
        [one] { $hours } uur { $minutes } min
       *[other] { $hours } uur { $minutes } min
    }

# Explorer
explorer-configure = Configure
explorer-configure-display = Display on Home
explorer-configure-reorder = Reorder
explorer-configure-add-collection-hint = Right-click any collection to add it to Home.
explorer-library-count =
    { $count ->
        [one] { $count } item
       *[other] { $count } items
    }
explorer-nav-aria = Sections
explorer-customize = Customize
explorer-customize-done = Done
explorer-menu-add-to-home = Add to Home
explorer-menu-remove-from-home = Remove from Home
explorer-add-shelf = Add shelf
explorer-add-collection = Collection…
explorer-add-saved-search = Saved search…
explorer-shelf-upcoming-deadlines = Upcoming reading deadlines
explorer-shelf-upcoming-deadlines-desc = Due this week, or the next deadline within a month.
explorer-shelf-pinned = Pinned
explorer-shelf-pinned-desc = Items you’ve pinned, plus pinned collections (with next-up for syllabi).
explorer-go-to-reading-schedule = Go to Reading Schedule
explorer-go-to-my-annotations = Go to Annotation Feed
explorer-shelf-watch-now = Watch now
explorer-shelf-watch-now-desc = Newest videos in this library.
explorer-shelf-listen-now = Listen now
explorer-shelf-listen-now-desc = Newest audio in this library.
explorer-shelf-recently-read = Recently read
explorer-shelf-recently-read-desc = Items you last opened.
explorer-shelf-recently-added = Recently added
explorer-shelf-recently-added-desc = Items added in the last { $days } days.
explorer-recent-in-feed = Recent in feed
explorer-recent-in-feed-desc = Latest items from your feeds.
explorer-recent-annotations = Recent annotations
explorer-recent-annotations-desc = Highlights you made recently.
my-annotations-empty = No recent annotations
my-annotations-desc = Your highlights and notes across sources, in chronological order.
my-annotations-order-newest-last = Newest last
my-annotations-order-newest-last-title = Oldest at the top, newest at the bottom
my-annotations-order-newest-first = Newest first
my-annotations-order-newest-first-title = Newest at the top, oldest at the bottom
annotations-quote-order-menu = Citaten
annotations-quote-order-location = Locatie
annotations-quote-order-location-title = Citaten ordenen op positie in het document
annotations-quote-order-date-added = Toegevoegd
annotations-quote-order-date-added-title = Citaten ordenen op toevoegdatum (oudste eerst)
my-annotations-load-previous = Load previous
my-annotations-load-previous-loading = Loading…
my-annotations-open-in-reader = Open in reader
my-annotations-copy = Copy
my-annotations-copied = Copied
my-annotations-copy-all = Copy all
my-annotations-options-aria = Annotation Feed options
my-annotations-menu-order = Order
my-annotations-menu-copy = Copy
my-annotations-menu-copy-desc = Applied when copying annotations from this feed.
my-annotations-copy-blockquote = Prefix with Markdown blockquotes (>)
my-annotations-copy-cite-key = Append Pandoc cite keys ({"[@…]"})
my-annotations-page = p. { $page }
my-annotations-layout-vertical = Vertical
my-annotations-layout-vertical-title = Stacked covers with quotes underneath each other
my-annotations-layout-grid = Grid
my-annotations-layout-grid-title = Full-width wall of covers and quotes
explorer-empty = Nothing to show yet
explorer-shelf-empty = No items
explorer-move-up = Move shelf up
explorer-move-down = Move shelf down
explorer-remove-shelf = Remove shelf

# Collection tree
tree-tooltip-reading-schedule = Leesschema (automatisch beheerd)
tree-tooltip-auto-managed = Automatisch beheerd door Zotero Syllabus
tree-tooltip-syllabus = Syllabus

# User guide sample items (created at tour time; not used as match keys)
tour-sample-reading-1 = Voorbeeldtekst: Aan de slag met cursuslijsten
tour-sample-reading-2 = Voorbeeldtekst: Annoteren tijdens het lezen
tour-sample-reading-3 = Voorbeeldtekst: De week vooruit plannen

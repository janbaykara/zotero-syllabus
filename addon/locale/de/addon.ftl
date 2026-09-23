startup-begin = Addon wird geladen
startup-finish = Addon ist bereit
enable-syllabus-title = In einen Lehrplan umwandeln?
enable-syllabus-message = „{ $name }“ in einen Lehrplan umwandeln? Eine Lehrplan-Notiz wird in dieser Sammlung gespeichert.
enable-subcollections-title = Untersammlungen für Sitzungen verwalten?
enable-subcollections-message =
    Wenn Sie dies aktivieren, verwaltet das Plugin Untersammlungen unter „{ $name }“. Bereits vorhandene Ordner können dabei gelöscht oder überschrieben werden.

    Was passiert:

    • Pro Sitzung mit zugewiesenen Texten wird ein Ordner angelegt oder übernommen und so umbenannt, dass er zum Lehrplan passt (zum Beispiel „Sitzung 1: Titel“).

    • Sitzungen ohne zugewiesene Texte erhalten keinen Ordner. Vorhandene Ordner für solche Sitzungen werden entfernt.

    • Untersammlungen, die keine solchen Sitzungsordner sind — und die keine eigene Lehrplan-Notiz haben — werden gelöscht. Einträge werden nicht aus der Bibliothek gelöscht; sie bleiben in der übergeordneten Sammlung.

    • Die Einträge jedes Sitzungsordners werden aus der Lehrplan-Notiz überschrieben. Überzählige Einträge werden nur aus dem Ordner entfernt.

    • Wenn Sie eine Sitzung aus dem Lehrplan entfernen, wird der zugehörige Sitzungsordner gelöscht.

    • Wenn Sie einen Sitzungsordner löschen, der noch zugewiesene Texte hat, legt das Plugin ihn erneut an.

    Wenn Sie dies später deaktivieren, werden Ordner nicht mehr verwaltet; vorhandene Ordner bleiben erhalten.

    Fortfahren?
enable-reading-schedule-collection-title = Sammlung „Lektüreplan“ erzeugen?
enable-reading-schedule-collection-message =
    Wenn Sie dies aktivieren, wird in Meine Bibliothek eine Sammlung oberster Ebene „Lektüreplan“ angelegt, mit einem Ordner für jedes Lesedatum (ab vor 10 Tagen).

    Was passiert:

    • Datumsordner werden automatisch aus Ihren Lehrplänen angelegt, umbenannt und gefüllt.

    • Einträge in diesen Ordnern werden aus dem Plan überschrieben. Überzählige Einträge werden nur aus dem Ordner entfernt — nicht aus der Bibliothek.

    • Wenn Sie die Sammlung oder einen Datumsordner löschen, legt das Plugin sie erneut an, solange diese Einstellung aktiv ist.

    • Lehrpläne in Gruppenbibliotheken werden nicht einbezogen (Einträge können Bibliotheken nicht überschreiten).

    Wenn Sie dies später deaktivieren, werden die Sammlung „Lektüreplan“ und ihre Datumsordner gelöscht. Die Einträge in Ihren Lehrplänen bleiben erhalten.

    Fortfahren?
disable-reading-schedule-collection-title = Sammlung „Lektüreplan“ entfernen?
disable-reading-schedule-collection-message =
    Wenn Sie dies deaktivieren, werden die verwaltete Sammlung „Lektüreplan“ und ihre Datumsordner gelöscht.

    Einträge werden nicht aus Ihrer Bibliothek gelöscht; sie bleiben in ihren ursprünglichen Lehrplan-Sammlungen.

    Fortfahren?
prefs-title = Zotero Syllabus
prefs-table-title = Titel
prefs-table-detail = Detail
tabpanel-lib-tab-label = Bibliotheks-Tab
tabpanel-reader-tab-label = Reader-Tab
menu-toggle-bibliography = Bibliografie ein-/ausblenden
managed-folder-banner-title = Automatisch verwalteter Ordner
managed-folder-banner-class =
    Fügen Sie hier keine Einträge hinzu und entfernen Sie keine. Dieser Sitzungsordner wird mit dem Lehrplan synchron gehalten; manuelle Änderungen werden überschrieben.
managed-folder-banner-schedule =
    Fügen Sie hier keine Einträge hinzu und entfernen Sie keine. Dieser Lektüreplan-Ordner wird mit Ihren Lehrplänen synchron gehalten; manuelle Änderungen werden überschrieben.
menuHelp-openUserGuide = Benutzerhandbuch von Zotero Syllabus öffnen
menuHelp-openDocumentation = Zotero Syllabus-Dokumentation
userGuide-start-title = Willkommen bei Zotero Syllabus
userGuide-start-desc =
    Wandeln Sie jede Zotero-Sammlung in eine Lektüreliste um — nach Sitzung gliedern, Prioritäten setzen und den nächsten Lesestoff im Blick behalten.
userGuide-start-close = Später erinnern
userGuide-exit = Tour beenden
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
userGuide-collection-title = Mit einer Sammlung beginnen
userGuide-collection-desc =
    Lehrpläne liegen auf Sammlungen. Wir öffnen eine Übungs-Sammlung „Syllabus Tour“ mit einigen Beispieltexten.
userGuide-syllabusButton-title = In einen Lehrplan umwandeln
userGuide-syllabusButton-desc =
    Klicken Sie in der Eintrags-Werkzeugleiste auf In Lehrplan umwandeln, um diese Sammlung in eine Kursgliederung zu verwandeln. Die Tour wechselt automatisch dorthin.
userGuide-addClass-title = Eine Sitzung hinzufügen
userGuide-addClass-desc =
    Sitzungen (oder Wochen / Termine — die Bezeichnung können Sie später ändern) sind die Abschnitte Ihres Lehrplans. Fügen Sie eine hinzu, um zu beginnen.
userGuide-assign-title = Lektüre zuweisen
userGuide-assign-desc =
    Ziehen Sie Einträge in eine Sitzung, oder Rechtsklick → Einer Sitzung zuweisen. Nicht zugewiesene Einträge bleiben unter Weiterführende Literatur.
userGuide-itemPane-title = Im Eintragsbereich bearbeiten
userGuide-itemPane-desc =
    Wählen Sie eine Lektüre, um Sitzungsnummer, Priorität, Hinweise und Erledigt-Status im Abschnitt Lektüreaufgaben festzulegen.
userGuide-readingDate-title = Ein Fälligkeitsdatum setzen
userGuide-readingDate-desc =
    Jede Sitzung kann ein Lesedatum haben. Beim Klick auf Weiter setzen wir eines für Sitzung 1 — danach können Sie den Lektüreplan öffnen.
userGuide-readingSchedule-title = Lektüreplan öffnen
userGuide-readingSchedule-desc =
    Der Lektüreplan sammelt Sitzungen mit Fälligkeitsdatum aus all Ihren Lehrplänen. Weiter öffnet ihn, damit Sie sehen, was ansteht.
userGuide-readingSchedule-light-title = Open Reading Schedule
userGuide-readingSchedule-light-desc =
    The Reading Schedule tab gathers class due dates across your syllabi. Next opens it from the tab bar.
userGuide-home-title = Home view
userGuide-home-desc =
    At the library root, switch to Home for shelves of recent items and upcoming deadlines. Next selects your library home.
userGuide-subcollections-title = Optional: Sitzungsordner
userGuide-subcollections-desc =
    Möchten Sie Ordner-Spiegel pro Sitzung? Aktivieren Sie Untersammlungen für Sitzungen in den Einstellungen. Lassen Sie dies aus, sofern das Plugin Unterordner nicht verwalten soll.
userGuide-finish-title = Sie sind startklar
userGuide-finish-desc =
    Diese Tour können Sie jederzeit über Hilfe → Benutzerhandbuch von Zotero Syllabus öffnen erneut aufrufen. Viel Erfolg beim Studium!
userGuide-finish-prefs-title = You’re set
userGuide-finish-prefs-desc =
    Turn views on or off anytime in Preferences → Zotero Syllabus → Views. You can reopen this tour from Help.
userGuide-empty-title = Diese Sammlung nach Sitzung gliedern
userGuide-empty-desc =
    Fügen Sie Sitzungen für jede Woche oder jeden Termin hinzu und weisen Sie Lektüre zu. Sie können auch eine kurze geführte Tour machen.
userGuide-empty-tour = Tour starten

# Shared
app-name = Zotero Syllabus
this-collection = diese Sammlung
untitled = Ohne Titel
nav-back = Zurück
nav-previous = Zurück
nav-next = Weiter

# View tabs / toolbar
view-tab-checklist = Checkliste
view-tab-checklist-tooltip = Als Checkliste anzeigen
view-tab-syllabus = Lehrplan
view-tab-syllabus-tooltip = Als Lehrplan anzeigen
view-tab-create-syllabus = In Lehrplan umwandeln
view-tab-create-syllabus-tooltip = Diese Sammlung in einen Lehrplan umwandeln
view-tab-table = Tabelle
view-tab-table-tooltip = Als Tabelle anzeigen
view-tab-gallery = Galerie
view-tab-gallery-tooltip = Als Galerie anzeigen
view-tab-explorer = Startseite
view-tab-explorer-tooltip = Als Startseite anzeigen
view-tab-reading-schedule = Lektüreplan
reading-schedule-desc = Class due dates across your syllabi, so you can see what’s next.
view-tab-my-annotations = Meine Annotationen
toolbar-my-annotations-open = Open Annotation Feed
toolbar-reading-schedule-review = Lektüreplan prüfen
toolbar-reading-schedule-open = Lektüreplan öffnen

# Context menus
menu-set-priority = Priorität festlegen
menu-none = (Keine)
menu-assign-to-class = Einer Sitzung zuweisen
menu-no-collection = (Keine Sammlung ausgewählt)
menu-class-label = { $nomenclature } { $number }
menu-add-to-new-class = Zu neuer { $nomenclature } { $number } hinzufügen
menu-set-reading-status = Lesestatus festlegen
status-done = Erledigt
status-not-done = Nicht erledigt

# Syllabus page
page-toc-title = Inhaltsverzeichnis
placeholder-add-title = Titel hinzufügen…
page-density-cycle = Wechseln zu { $next }
page-density-row = Zeile
page-density-standard = Standard
page-density-expanded = Erweitert
page-reader-enable = Kontrollkästchen aktivieren
page-reader-disable = Kontrollkästchen deaktivieren
page-export = Lehrplan-Datei exportieren
page-import = Lehrplan-Datei importieren
page-edit-settings = Lehrplaneinstellungen bearbeiten
page-lock = Lehrplan sperren
page-unlock = Lehrplan entsperren
page-view-options-aria = Syllabus view options
page-view-checkboxes = Checkboxes
page-print = Syllabus als PDF, Word, Markdown oder HTML speichern
page-save-pdf = PDF
page-save-word = Word
page-save-markdown = Markdown
page-save-html = HTML
page-publish = Publish online…
placeholder-course-code = Veranstaltungskennung
placeholder-institution = Hochschule
placeholder-add-description = Beschreibung hinzufügen…
page-add-class = { $nomenclature } { $number } hinzufügen
page-add-to-class = Zu { $nomenclature } { $number } hinzufügen
page-drop-create-class = Eintrag hier ablegen, um { $nomenclature } { $number } anzulegen
page-drop-import-file = Dateien ablegen, um sie dieser Sammlung hinzuzufügen
further-reading-heading = Weiterführende Literatur
sort-label = Sortieren
further-reading-sort-aria = Weiterführende Literatur sortieren
sort-by-title = Titel
sort-by-creator = Verfasser
sort-by-date = Datum
further-reading-empty-desc = Einträge in diesem Abschnitt sind keiner Sitzung zugewiesen.
toc-empty = Keine Sitzungen vorhanden
placeholder-url = https://
links-delete = Link löschen
links-edit = Link bearbeiten
links-add = Link hinzufügen
bibliography-heading = Bibliografie

# Class groups / cards
mark-done = Als erledigt markieren
mark-not-done = Als nicht erledigt markieren
class-due-date-label = Fällig am:
class-reset-sort = Sortierung zurücksetzen
class-move-up = { $nomenclature } nach oben
class-move-down = { $nomenclature } nach unten
class-delete = { $nomenclature } löschen
class-insert-here = { $nomenclature } hier hinzufügen
class-dropzone-hint = Einträge auf { $nomenclature } { $number } ziehen
due-date-clear = Fälligkeitsdatum löschen
due-date-add = Fälligkeitsdatum hinzufügen
placeholder-select-date = Datum wählen
item-in-publication = in { $name }
attachment-url = URL
attachment-pdf = PDF
attachment-snapshot = Schnappschuss
attachment-epub = EPUB
attachment-html = HTML
attachment-doc = DOC
attachment-txt = TXT
attachment-zip = ZIP
attachment-file = Datei
attachment-view = Anzeigen
attachment-open = { $label } öffnen
assignment-duplicate = Aufgabe duplizieren
assignment-duplicate-label = Duplizieren
assignment-unassign-class = Aus Sitzung entfernen
assignment-unassign-syllabus = Aus Lehrplan entfernen
assignment-unassign-label = Zuweisung aufheben
priority-set-to = Priorität auf { $name } setzen
priority-clear = Priorität löschen
youtube-play = { $title } auf YouTube abspielen

# Item pane
item-pane-not-found = Eintrag nicht gefunden
item-pane-none-selected = Keine Einträge ausgewählt
item-pane-n-selected = { $count } Einträge ausgewählt
item-pane-current-view = aktuelle Ansicht
item-pane-also-assigned = außerdem zugewiesen an
item-pane-assignment-n = Aufgabe #{ $number }
item-pane-assignment-for = für { $title }
item-pane-due = Fällig { $date }
item-pane-reference-material = Referenzmaterial
item-pane-class-named = { $nomenclature } { $number }: { $title }
item-pane-mark-done = Als erledigt markieren
placeholder-class-number = z. B. 1, 2, 3…
field-priority = Priorität
field-instructions = Hinweise
placeholder-instructions = Hinweise zu dieser Aufgabe hinzufügen…
assignment-delete = Aufgabe löschen
item-pane-select-collection = Wählen Sie eine Sammlung, um Lehrplan-Aufgaben anzuzeigen

# Settings
settings-title = Lehrplaneinstellungen
settings-window-title = Einstellungen für { $name }
settings-view = View
settings-view-desc = Dichte und Kontrollkästchen für diesen Lehrplan.
settings-density = Density
settings-file = Syllabus file
settings-file-desc = Export or import a .syllabus metadata file for this collection.
settings-back = Zurück zur Lehrplan-Ansicht
settings-nomenclature = Bezeichnung
settings-nomenclature-desc = Wählen Sie die Bezeichnung für einzelne Termine (z. B. „Woche“, „Klasse“, „Sitzung“, „Abschnitt“).
settings-singular = Einzahl
settings-nomenclature-placeholder = z. B. Woche, Klasse, Sitzung, Abschnitt
settings-plural-label = Mehrzahl:
settings-subcollections = Untersammlungen für Sitzungen
settings-subcollections-desc = Wenn aktiviert, erhält jede Sitzung mit zugewiesenen Texten einen Ordner unter dieser Sammlung.
settings-subcollections-checkbox = Untersammlungen anlegen?
settings-bib-style = Bibliografiestil
settings-bib-style-desc = Wählen Sie einen CSL-Stil (Citation Style Language) für bibliografische Nachweise.
settings-citation-style = Zitierstil
settings-user-default = Nutzerstandard
settings-user-default-named = Nutzerstandard: { $name }
settings-priorities = Prioritäten
settings-priorities-desc = Prioritätsnamen, Farben und Reihenfolge für diesen Syllabus anpassen.
settings-priorities-global-title = Globale Prioritäts-Standards
settings-priorities-global-desc = Neue Syllabi kopieren diese Prioritäten. Bestehende behalten ihre eigenen Listen.
settings-priorities-global-link = Globale Standards bearbeiten…
settings-priorities-global-done = Fertig
settings-priorities-global-reset = Auf integrierte Standards zurücksetzen
settings-priorities-set-global = Als globale Standards verwenden
settings-priorities-set-global-confirm-title = Als globale Standards verwenden?
settings-priorities-set-global-confirm-message =
    Damit werden Ihre globalen Prioritäts-Standards durch die Prioritäten dieses Syllabus ersetzt. Neue Syllabi kopieren diese Namen, Farben und Reihenfolge. Bestehende Syllabi ändern sich nicht.
settings-priorities-set-global-done = Als globale Standards für neue Syllabi gespeichert
settings-priorities-reset-global = Auf globale Standards zurücksetzen
settings-priorities-reset-global-confirm-title = Auf globale Standards zurücksetzen?
settings-priorities-reset-global-confirm-message =
    Dadurch werden die Prioritäten dieses Syllabus durch Ihre globalen Standards ersetzt. Lesungen mit Prioritäten, die nicht in der globalen Liste vorkommen, müssen verschoben oder entfernt werden.
settings-priorities-reset-global-done = Prioritäten auf globale Standards zurückgesetzt
settings-add-priority = Neue Priorität hinzufügen
settings-add-priority-button = Priorität hinzufügen
settings-new-priority-name = Neue Priorität
settings-priority-move-up = Nach oben
settings-priority-move-down = Nach unten
settings-priority-color = Prioritätsfarbe
settings-priority-name-placeholder = Prioritätsname
settings-priority-delete = Priorität löschen
settings-priority-delete-title = Priorität löschen?
settings-priority-delete-message =
    { $count ->
        [one] { $count } Lesung verwendet „{ $name }“. Legen Sie fest, was damit geschehen soll, bevor Sie diese Priorität löschen.
       *[other] { $count } Lesungen verwenden „{ $name }“. Legen Sie fest, was damit geschehen soll, bevor Sie diese Priorität löschen.
    }
settings-priority-delete-migrate-label = Lesungen verschieben nach
settings-priority-delete-migrate = Verschieben und löschen
settings-priority-delete-clear = Priorität entfernen
settings-priority-delete-cancel = Abbrechen
settings-priority-name-label = Name
settings-priority-preview = Vorschau:
priority-default-course-info = Kursinformationen
priority-default-essential = Pflicht
priority-default-recommended = Empfohlen
priority-default-optional = Optional

# Gallery
gallery-empty-filtered = Keine passenden Einträge.
gallery-empty = Keine Einträge in dieser Sammlung.
gallery-untagged = Ohne Schlagwörter
gallery-untagged-desc = Einträge in diesem Abschnitt haben keine Schlagwörter.
gallery-uncredited = Ohne Urheber
gallery-uncredited-desc = Einträge in diesem Abschnitt haben keinen Urheber.
gallery-empty-subcollections = Keine Untersammlungen oder Einträge in dieser Sammlung.
gallery-unnumbered = Unnummeriert
gallery-unnumbered-desc = Zugewiesen ohne Sitzungsnummer.
gallery-sort-auto = Auto
gallery-sort-auto-title = Automatische Reihenfolge (Sammlung oder Lehrplan)
gallery-sort-az = A–Z
gallery-sort-az-title = Nach A–Z sortieren
gallery-sort-date = Datum
gallery-sort-date-title = Nach Datum sortieren (neueste zuerst)
gallery-sort-date-added = Hinzugefügt
gallery-sort-date-added-title = Nach Hinzufügedatum sortieren (neueste zuerst)
gallery-sort-last-read = Zuletzt gelesen
gallery-sort-last-read-title = Nach zuletzt gelesen sortieren (neueste zuerst)
gallery-group-none = Keine
gallery-group-none-title = Keine Gruppierung
gallery-group-auto = Automatisch
gallery-group-auto-title = Automatische Gruppierung
gallery-group-type = Typ
gallery-group-type-title = Nach Eintragstyp gruppieren
gallery-group-creator = Urheber
gallery-group-creator-title = Nach Urheber gruppieren
gallery-group-tags = Schlagwörter
gallery-group-tags-title = Nach Schlagwörtern gruppieren
gallery-group-subcollections = Untersammlungen
gallery-group-subcollections-title = Nach Untersammlungen gruppieren
gallery-group-classes = Sitzungen
gallery-group-classes-title = Nach Sitzungen gruppieren
gallery-layout-cover = Cover
gallery-layout-cover-title = Coverbild
gallery-layout-card = Karte
gallery-layout-card-title = Lehrplan-Karten
gallery-layout-annotations = Annotationen
gallery-layout-annotations-title = Cover mit allen Annotationen
gallery-annotations-empty = Keine Annotationen
gallery-annotations-none-heading = Keine Annotationen
gallery-annotations-show-empty = Einträge ohne Annotationen anzeigen
gallery-layout-magazine = Magazin
gallery-layout-magazine-title = Gemischtes Magazin-Layout
gallery-menu-packing = Anordnung
gallery-packing-vertical = Vertikal
gallery-packing-vertical-title = Cover mit Abstracts in einer Leseliste
gallery-packing-grid = Raster
gallery-packing-grid-title = Gleich große Magazin-Kacheln
gallery-packing-packed = Gepackt
gallery-packing-packed-title = Magazinlayout mit gemischten Größen

# Gallery notes (collection-scoped child notes)
gallery-note-add = Add Gallery Note
gallery-note-edit = Edit Gallery Note
gallery-note-remove = Remove Gallery Note
gallery-note-label = Gallery note
magazine-shelf-watch = Ansehen
magazine-shelf-watch-title = Zuletzt hinzugefügte Videos
magazine-shelf-listen = Anhören
magazine-shelf-listen-title = Zuletzt hinzugefügtes Audio
magazine-highlights = Hervorhebungen
gallery-options-aria = Galerie-Ansichtsoptionen
gallery-options-title = Ansichtsoptionen
gallery-menu-view = Ansicht
gallery-menu-sort = Sortieren
gallery-menu-group = Gruppieren nach
gallery-menu-type-size = Textgröße
gallery-type-small = Klein
gallery-type-small-title = Kleinere Magazin-Schrift
gallery-type-large = Groß
gallery-type-large-title = Größere Magazin-Schrift
gallery-in-this-collection = In dieser Sammlung
gallery-groups-nav-aria = Gruppen
gallery-group-jump = { $name } anzeigen
gallery-prefs-summary = { $layout } / { $sort } / { $group }
gallery-page-of = Seite { $page } von { $total }
gallery-save-globally = Als Standard speichern
gallery-save-globally-title = Diese Option als Standard für alle Sammlungen speichern
gallery-save-globally-active-title = Diese Sammlung weicht vom Standard ab. Klicken Sie, um sie als Standard zu speichern.
galleryTour-settings-title = Galerie-Optionen
galleryTour-settings-desc =
    Öffnen Sie das Menü in der Ecke, um Ansicht, Sortierung und Gruppierung zu wechseln. Wir zeigen die drei Layouts.
galleryTour-cover-title = Cover-Ansicht
galleryTour-cover-desc =
    Cover zeigt jeden Eintrag als Titelbild — Bücher, Aufsätze und Webseiten auf einen Blick.
galleryTour-magazine-title = Magazin-Ansicht
galleryTour-magazine-desc =
    Magazin mischt große und kleine Kacheln, wie ein Inhaltsverzeichnis. Ideal zum Stöbern und Lesen kurzer Texte.
galleryTour-card-title = Kartenansicht
galleryTour-card-desc =
    Karten nutzen dasselbe Syllabus-Layout, gruppiert nach Eintragstyp, damit ähnliche Texte zusammenstehen.
galleryTour-choose-title = Standard festlegen
galleryTour-choose-desc =
    Mit welchem Layout soll die Galerie öffnen? Sie können das später in den Zotero Syllabus-Einstellungen oder mit „Als Standard speichern“ ändern.
galleryTour-skip = Überspringen

# Reading schedule
schedule-edit-settings = Lektüreplan-Einstellungen bearbeiten
schedule-empty-title = Keine Lektüre geplant
schedule-empty-desc = Fügen Sie Sitzungen Lesedaten hinzu, um sie hier zu sehen.
schedule-this-week = Diese Woche
schedule-next-week = Nächste Woche
schedule-settings-title = Lektüreplan-Einstellungen
schedule-settings-library = Bibliothekssammlung
schedule-settings-desc =
    Standardmäßig aus. Wenn aktiviert, wird in Meine Bibliothek eine Sammlung oberster Ebene „Lektüreplan“ mit einem Ordner für jedes kürzliche und bevorstehende Lesedatum geführt. Ordner werden automatisch angelegt, umbenannt und gefüllt. Das Deaktivieren löscht diese Sammlung; Einträge in den Lehrplänen bleiben erhalten.
schedule-settings-checkbox = Sammlung „Lektüreplan“ erzeugen?
schedule-day-managed-banner = Automatisch aus Ihren Lehrplänen verwaltet. Änderungen hier werden überschrieben.
schedule-day-empty = Für diesen Tag ist keine Lektüre geplant.
schedule-window-empty = Im Planungszeitraum ist noch keine Lektüre. Fügen Sie Sitzungen Lesedaten hinzu, um sie hier zu sehen.
schedule-no-dates = Keine Daten
schedule-of-collection = von { $name }
schedule-of-collection-in-library = von { $collection } ({ $library })
schedule-open-syllabus = Lehrplan für { $title } öffnen
class-folder-managed-banner = Automatisch aus diesem Lehrplan verwaltet. Änderungen in diesem Ordner werden überschrieben.

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
column-reading-instructions = Lesehinweise
column-status = Status
column-reading-time = Lesezeit
column-syllabus-info = Lehrplaninfo
column-class-hash = #{ $number }

# Progress / dialogs
dialog-save-export = Lehrplan-Export speichern
progress-import-success-title = Import erfolgreich
progress-import-success-text = Lehrplan-Metadaten erfolgreich importiert und zusammengeführt
progress-import-error-title = Importfehler
progress-import-bad-file = Bitte eine .syllabus-Datei ablegen
progress-print-preparing = Syllabus wird vorbereitet…
progress-print-failed = Syllabus konnte nicht gespeichert werden
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
dialog-save-pdf = Lehrplan-PDF speichern
file-filter-pdf = PDF
dialog-save-word = Syllabus als Word-Dokument speichern
file-filter-word = Word
dialog-save-markdown = Syllabus als Markdown speichern
file-filter-markdown = Markdown
dialog-save-html = Syllabus als HTML speichern
file-filter-html = HTML
progress-saving-pdf = PDF wird gespeichert…
dialog-save-file = Datei speichern
progress-translator-install-error = Fehler beim Installieren der Lektüreliste-Scraper
progress-migrate-start =
    { $count ->
        [one] { $count } Lehrplan wird in Sammlungsnotizen migriert…
       *[other] { $count } Lehrpläne werden in Sammlungsnotizen migriert…
    }
progress-migrate-item = { $current } von { $total } wird migriert…
progress-migrate-done =
    { $count ->
        [one] { $count } Lehrplan migriert
       *[other] { $count } Lehrpläne migriert
    }
progress-migrate-empty-cleared =
    { $count ->
        [one] { $count } leere Einstellung gelöscht
       *[other] { $count } leere Einstellungen gelöscht
    }
progress-migrate-not-found =
    { $count ->
        [one] { $count } Sammlung nicht gefunden
       *[other] { $count } Sammlungen nicht gefunden
    }
progress-migrate-failed = { $count } fehlgeschlagen
progress-migrate-remaining = { $count } verbleiben in den Einstellungen
reading-time-minutes = { $minutes } Min.
reading-time-hours =
    { $hours ->
        [one] { $hours } Std.
       *[other] { $hours } Std.
    }
reading-time-hours-and-minutes =
    { $hours ->
        [one] { $hours } Std. { $minutes } Min.
       *[other] { $hours } Std. { $minutes } Min.
    }

# Explorer
explorer-configure = Konfigurieren
explorer-configure-display = Auf der Startseite anzeigen
explorer-configure-reorder = Reihenfolge ändern
explorer-configure-add-collection-hint = Rechtsklick auf eine beliebige Sammlung, um sie zur Startseite hinzuzufügen.
explorer-library-count =
    { $count ->
        [one] { $count } Eintrag
       *[other] { $count } Einträge
    }
explorer-nav-aria = Abschnitte
explorer-customize = Anpassen
explorer-customize-done = Fertig
explorer-menu-add-to-home = Zur Startseite hinzufügen
explorer-menu-remove-from-home = Von der Startseite entfernen
explorer-add-shelf = Regal hinzufügen
explorer-add-collection = Sammlung…
explorer-add-saved-search = Gespeicherte Suche…
explorer-shelf-upcoming-deadlines = Anstehende Lektürefristen
explorer-shelf-upcoming-deadlines-desc = Fällig in dieser Woche, sonst der nächste Termin innerhalb eines Monats.
explorer-shelf-pinned = Pinned
explorer-shelf-pinned-desc = Items you’ve pinned, plus pinned collections (with next-up for syllabi).
explorer-go-to-reading-schedule = Zum Lektüreplan
explorer-go-to-my-annotations = Zum Annotation Feed
explorer-shelf-watch-now = Jetzt ansehen
explorer-shelf-watch-now-desc = Neueste Videos in dieser Bibliothek.
explorer-shelf-listen-now = Jetzt anhören
explorer-shelf-listen-now-desc = Neueste Audiodateien in dieser Bibliothek.
explorer-shelf-recently-read = Zuletzt gelesen
explorer-shelf-recently-read-desc = Zuletzt geöffnete Einträge.
explorer-shelf-recently-added = Zuletzt hinzugefügt
explorer-shelf-recently-added-desc = In den letzten { $days } Tagen hinzugefügt.
explorer-recent-in-feed = Neu im Feed
explorer-recent-in-feed-desc = Neueste Einträge aus Ihren Feeds.
explorer-recent-annotations = Neue Annotationen
explorer-recent-annotations-desc = Markierungen, die Sie kürzlich gemacht haben.
my-annotations-empty = Keine neueren Annotationen
my-annotations-desc = Your highlights and notes across sources, in chronological order.
my-annotations-order-newest-last = Newest last
my-annotations-order-newest-last-title = Oldest at the top, newest at the bottom
my-annotations-order-newest-first = Newest first
my-annotations-order-newest-first-title = Newest at the top, oldest at the bottom
annotations-quote-order-menu = Zitate
annotations-quote-order-location = Ort
annotations-quote-order-location-title = Zitate nach Position im Dokument ordnen
annotations-quote-order-date-added = Hinzugefügt
annotations-quote-order-date-added-title = Zitate nach Hinzufügedatum ordnen (älteste zuerst)
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
my-annotations-layout-vertical = Vertikal
my-annotations-layout-vertical-title = Gestapelte Cover mit untereinander stehenden Zitaten
my-annotations-layout-grid = Raster
my-annotations-layout-grid-title = Volle Breite: Cover und Zitate als Wand
explorer-empty = Noch nichts anzuzeigen
explorer-shelf-empty = Keine Einträge
explorer-move-up = Regal nach oben
explorer-move-down = Regal nach unten
explorer-remove-shelf = Regal entfernen

# Collection tree
tree-tooltip-reading-schedule = Lektüreplan (automatisch verwaltet)
tree-tooltip-auto-managed = Automatisch verwaltet von Zotero Syllabus
tree-tooltip-syllabus = Lehrplan

# User guide sample items (created at tour time; not used as match keys)
tour-sample-reading-1 = Beispieltext: Einstieg in Kurslisten
tour-sample-reading-2 = Beispieltext: Beim Lesen annotieren
tour-sample-reading-3 = Beispieltext: Die Woche vorausplanen

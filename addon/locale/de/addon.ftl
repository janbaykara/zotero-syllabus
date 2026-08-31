startup-begin = Addon wird geladen
startup-finish = Addon ist bereit
enable-syllabus-title = In einen Lehrplan umwandeln?
enable-syllabus-message = „{ $name }“ in einen Lehrplan umwandeln? Eine Lehrplan-Notiz wird in dieser Sammlung gespeichert.
enable-subcollections-title = Untersammlungen für Sitzungen verwalten?
enable-subcollections-message =
    Wenn Sie dies aktivieren, verwaltet das Plugin Untersammlungen unter „{ $name }“. Bereits vorhandene Ordner können dabei gelöscht oder überschrieben werden.

    Was passiert:

    • Pro Sitzung wird ein Ordner angelegt oder übernommen und so umbenannt, dass er zum Lehrplan passt (zum Beispiel „Sitzung 1: Titel“).

    • Untersammlungen, die keine solchen Sitzungsordner sind — und die keine eigene Lehrplan-Notiz haben — werden gelöscht. Einträge werden nicht aus der Bibliothek gelöscht; sie bleiben in der übergeordneten Sammlung.

    • Die Einträge jedes Sitzungsordners werden aus der Lehrplan-Notiz überschrieben. Überzählige Einträge werden nur aus dem Ordner entfernt.

    • Wenn Sie eine Sitzung aus dem Lehrplan entfernen, wird der zugehörige Sitzungsordner gelöscht.

    • Wenn Sie einen Sitzungsordner löschen, legt das Plugin ihn erneut an.

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
userGuide-start-title = Willkommen bei Zotero Syllabus
userGuide-start-desc =
    Wandeln Sie jede Zotero-Sammlung in eine Lektüreliste um — nach Sitzung gliedern, Prioritäten setzen und den nächsten Lesestoff im Blick behalten.
userGuide-start-close = Später erinnern
userGuide-collection-title = Mit einer Sammlung beginnen
userGuide-collection-desc =
    Lehrpläne liegen auf Sammlungen. Wir öffnen eine Übungs-Sammlung „Syllabus Tour“ mit einigen Beispieltexten.
userGuide-syllabusButton-title = Lehrplan-Ansicht öffnen
userGuide-syllabusButton-desc =
    Klicken Sie in der Eintrags-Werkzeugleiste auf Lehrplan, um die Liste durch Ihre Kursgliederung zu ersetzen. Die Tour wechselt automatisch dorthin.
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
userGuide-subcollections-title = Optional: Sitzungsordner
userGuide-subcollections-desc =
    Möchten Sie Ordner-Spiegel pro Sitzung? Aktivieren Sie Untersammlungen für Sitzungen in den Einstellungen. Lassen Sie dies aus, sofern das Plugin Unterordner nicht verwalten soll.
userGuide-finish-title = Sie sind startklar
userGuide-finish-desc =
    Diese Tour können Sie jederzeit über Hilfe → Benutzerhandbuch von Zotero Syllabus öffnen erneut aufrufen. Viel Erfolg beim Studium!
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
view-tab-table = Tabelle
view-tab-table-tooltip = Als Tabelle anzeigen
view-tab-gallery = Galerie
view-tab-gallery-tooltip = Als Galerie anzeigen
view-tab-reading-schedule = Lektüreplan
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
page-compact-enable = Kompaktmodus aktivieren
page-compact-disable = Kompaktmodus deaktivieren
page-reader-enable = Lesemodus aktivieren
page-reader-disable = Lesemodus deaktivieren
page-export = Lehrplan-Datei exportieren
page-import = Lehrplan-Datei importieren
page-edit-settings = Lehrplaneinstellungen bearbeiten
page-lock = Lehrplan sperren
page-unlock = Lehrplan entsperren
page-print = Die Liste in der Lehrplan-Ansicht als PDF drucken
placeholder-course-code = Veranstaltungskennung
placeholder-institution = Hochschule
placeholder-add-description = Beschreibung hinzufügen…
page-add-class = { $nomenclature } { $number } hinzufügen
page-add-to-class = Zu { $nomenclature } { $number } hinzufügen
page-drop-create-class = Eintrag hier ablegen, um { $nomenclature } { $number } anzulegen
page-drop-import-file = .syllabus-Datei zum Importieren ablegen
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
item-pane-mark-done = Als erledigt markieren
placeholder-class-number = z. B. 1, 2, 3…
field-priority = Priorität
field-instructions = Hinweise
placeholder-instructions = Hinweise zu dieser Aufgabe hinzufügen…
assignment-delete = Aufgabe löschen
item-pane-select-collection = Wählen Sie eine Sammlung, um Lehrplan-Aufgaben anzuzeigen

# Settings
settings-title = Lehrplaneinstellungen
settings-back = Zurück zur Lehrplan-Ansicht
settings-nomenclature = Bezeichnung
settings-nomenclature-desc = Wählen Sie die Bezeichnung für einzelne Termine (z. B. „Woche“, „Klasse“, „Sitzung“, „Abschnitt“).
settings-singular = Einzahl
settings-nomenclature-placeholder = z. B. Woche, Klasse, Sitzung, Abschnitt
settings-plural-label = Mehrzahl:
settings-subcollections = Untersammlungen für Sitzungen
settings-subcollections-desc = Standardmäßig aus. Wenn aktiviert, erhält jede Sitzung einen Ordner unter dieser Sammlung. Ordner werden angelegt, umbenannt und entfernt, damit sie zum Lehrplan passen — einschließlich vorhandener Untersammlungen, die gelöscht werden können. Das Deaktivieren lässt Ordner bestehen.
settings-subcollections-checkbox = Untersammlungen anlegen?
settings-bib-style = Bibliografiestil
settings-bib-style-desc = Wählen Sie einen CSL-Stil (Citation Style Language) für bibliografische Nachweise. Ist keiner gesetzt, wird der Standardstil des Nutzers verwendet.
settings-citation-style = Zitierstil
settings-user-default = Nutzerstandard
settings-user-default-named = Nutzerstandard: { $name }
settings-priorities = Prioritäten
settings-priorities-desc = Prioritätsnamen, -farben und Sortierung anpassen.
settings-add-priority = Neue Priorität hinzufügen
settings-add-priority-button = Priorität hinzufügen
settings-new-priority-name = Neue Priorität
settings-priority-move-up = Nach oben
settings-priority-move-down = Nach unten
settings-priority-color = Prioritätsfarbe
settings-priority-name-placeholder = Prioritätsname
settings-priority-delete = Priorität löschen
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
gallery-empty-subcollections = Keine Untersammlungen oder Einträge in dieser Sammlung.
gallery-unnumbered = Unnummeriert
gallery-unnumbered-desc = Zugewiesen ohne Sitzungsnummer.
gallery-sort-auto = Auto
gallery-sort-auto-title = Automatische Reihenfolge (Sammlung oder Lehrplan)
gallery-sort-az = A–Z
gallery-sort-az-title = Nach A–Z sortieren
gallery-sort-date = Datum
gallery-sort-date-title = Nach Datum sortieren (neueste zuerst)
gallery-group-none = Keine
gallery-group-none-title = Keine Gruppierung
gallery-group-type = Typ
gallery-group-type-title = Nach Eintragstyp gruppieren
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
gallery-options-aria = Galerie-Ansichtsoptionen
gallery-options-title = Ansichtsoptionen
gallery-menu-view = Ansicht
gallery-menu-sort = Sortieren
gallery-menu-group = Gruppieren nach
gallery-page-of = Seite { $page } von { $total }

# Reading schedule
schedule-edit-settings = Lektüreplan-Einstellungen bearbeiten
schedule-empty-title = Keine Lektüre geplant
schedule-empty-desc = Fügen Sie Sitzungen Lesedaten hinzu, um sie hier zu sehen.
schedule-this-week = Diese Woche
schedule-next-week = Nächste Woche
schedule-settings-title = Lektüreplan-Einstellungen
schedule-settings-back = Zurück zum Lektüreplan
schedule-settings-library = Bibliothekssammlung
schedule-settings-desc =
    Standardmäßig aus. Wenn aktiviert, wird in Meine Bibliothek eine Sammlung oberster Ebene „Lektüreplan“ mit einem Ordner für jedes kürzliche und bevorstehende Lesedatum geführt. Ordner werden automatisch angelegt, umbenannt und gefüllt. Das Deaktivieren löscht diese Sammlung; Einträge in den Lehrplänen bleiben erhalten.
schedule-settings-checkbox = Sammlung „Lektüreplan“ erzeugen?
schedule-day-managed-banner = Automatisch aus Ihren Lehrplänen verwaltet. Änderungen hier werden überschrieben.
schedule-day-empty = Für diesen Tag ist keine Lektüre geplant.
schedule-window-empty = Im Planungszeitraum ist noch keine Lektüre. Fügen Sie Sitzungen Lesedaten hinzu, um sie hier zu sehen.
schedule-no-dates = Keine Daten
schedule-of-collection = von { $name }
schedule-open-syllabus = Lehrplan für { $title } öffnen
class-folder-managed-banner = Automatisch aus diesem Lehrplan verwaltet. Änderungen in diesem Ordner werden überschrieben.

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
progress-print-preparing = Lehrplan wird für den Druck vorbereitet…
progress-print-failed = Das Lehrplan-PDF konnte nicht gespeichert werden
dialog-save-pdf = Lehrplan-PDF speichern
file-filter-pdf = PDF
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

# Collection tree
tree-tooltip-reading-schedule = Lektüreplan (automatisch verwaltet)
tree-tooltip-auto-managed = Automatisch verwaltet von Zotero Syllabus
tree-tooltip-syllabus = Lehrplan

# User guide sample items (created at tour time; not used as match keys)
tour-sample-reading-1 = Beispieltext: Einstieg in Kurslisten
tour-sample-reading-2 = Beispieltext: Beim Lesen annotieren
tour-sample-reading-3 = Beispieltext: Die Woche vorausplanen

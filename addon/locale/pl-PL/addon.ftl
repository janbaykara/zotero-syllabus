startup-begin = Wtyczka jest wczytywana
startup-finish = Wtyczka jest gotowa
enable-syllabus-title = Przekształcić w sylabus?
enable-syllabus-message = Przekształcić „{ $name }” w sylabus? W tej kolekcji zostanie zapisana notatka sylabusa.
enable-subcollections-title = Zarządzać podkolekcjami zajęć?
enable-subcollections-message =
    Włączenie tej opcji pozwala wtyczce zarządzać kolekcjami podrzędnymi w „{ $name }”. Może to spowodować usunięcie lub nadpisanie już istniejących folderów.

    Co się stanie:

    • Dla każdych zajęć tworzony lub przejmowany jest jeden folder i zmieniana jest jego nazwa zgodnie z sylabusem (na przykład „Zajęcia 1: Tytuł”).

    • Kolekcje podrzędne, które nie są folderami zajęć — i nie mają własnej notatki sylabusa — zostaną usunięte. Pozycje nie są usuwane z biblioteki; pozostają w kolekcji nadrzędnej.

    • Pozycje w każdym folderze zajęć są nadpisywane na podstawie notatki sylabusa. Nadmiarowe pozycje w folderze są usuwane tylko z folderu.

    • Usunięcie zajęć z sylabusa usuwa odpowiadający im folder.

    • Jeśli usuniesz folder zajęć, wtyczka utworzy go ponownie.

    Późniejsze wyłączenie tej opcji kończy zarządzanie folderami; istniejące foldery pozostają na miejscu.

    Kontynuować?
enable-reading-schedule-collection-title = Utworzyć kolekcję Harmonogram lektur?
enable-reading-schedule-collection-message =
    Włączenie tej opcji tworzy nadrzędną kolekcję „Harmonogram lektur” w bibliotece Moja biblioteka z folderem dla każdego terminu lektury (od 10 dni wstecz).

    Co się stanie:

    • Foldery dat są tworzone, przemianowywane i wypełniane automatycznie na podstawie sylabusów.

    • Pozycje w tych folderach są nadpisywane zgodnie z harmonogramem. Nadmiarowe pozycje są usuwane tylko z folderu — nie z biblioteki.

    • Jeśli usuniesz kolekcję lub folder daty, wtyczka utworzy go ponownie, dopóki ta opcja jest włączona.

    • Sylabusy z bibliotek grupowych nie są uwzględniane (pozycje nie mogą przechodzić między bibliotekami).

    Późniejsze wyłączenie tej opcji usuwa kolekcję „Harmonogram lektur” i jej foldery dat. Pozycje sylabusów pozostają na miejscu.

    Kontynuować?
disable-reading-schedule-collection-title = Usunąć kolekcję Harmonogram lektur?
disable-reading-schedule-collection-message =
    Wyłączenie tej opcji usuwa zarządzaną kolekcję „Harmonogram lektur” oraz jej foldery dat.

    Pozycje nie są usuwane z biblioteki; pozostają w oryginalnych kolekcjach sylabusów.

    Kontynuować?
prefs-title = Zotero Syllabus
prefs-table-title = Tytuł
prefs-table-detail = Szczegóły
tabpanel-lib-tab-label = Karta biblioteki
tabpanel-reader-tab-label = Karta czytnika
menu-toggle-bibliography = Przełącz bibliografię
managed-folder-banner-title = Folder zarządzany automatycznie
managed-folder-banner-class =
    Nie dodawaj ani nie usuwaj tu pozycji. Ten folder zajęć jest synchronizowany z sylabusem; zmiany ręczne zostaną nadpisane.
managed-folder-banner-schedule =
    Nie dodawaj ani nie usuwaj tu pozycji. Ten folder harmonogramu lektur jest synchronizowany z sylabusami; zmiany ręczne zostaną nadpisane.
menuHelp-openUserGuide = Otwórz przewodnik Zotero Syllabus
userGuide-start-title = Witamy w Zotero Syllabus
userGuide-start-desc =
    Przekształć dowolną kolekcję Zotero w listę lektur kursu — porządkuj według zajęć, ustalaj priorytety i śledź, co czytać dalej.
userGuide-start-close = Przypomnij później
userGuide-collection-title = Zacznij od kolekcji
userGuide-collection-desc =
    Sylabusy są powiązane z kolekcjami. Otworzymy kolekcję ćwiczeniową „Wycieczka po sylabusie” z kilkoma przykładowymi lekturami.
userGuide-syllabusButton-title = Otwórz widok sylabusa
userGuide-syllabusButton-desc =
    Kliknij Sylabus na pasku narzędzi pozycji, aby zastąpić listę zarysem kursu. Wycieczka przełączy widok za Ciebie.
userGuide-addClass-title = Dodaj zajęcia
userGuide-addClass-desc =
    Zajęcia (lub tygodnie / sesje — nazwy można później zmienić) to sekcje sylabusa. Dodaj jedne, aby rozpocząć.
userGuide-assign-title = Przypisz lektury
userGuide-assign-desc =
    Przeciągnij pozycje do zajęć albo kliknij prawym przyciskiem → Przypisz do zajęć. Nieprzypisane pozycje pozostają w dziale Lektury uzupełniające.
userGuide-itemPane-title = Edytuj w panelu pozycji
userGuide-itemPane-desc =
    Zaznacz lekturę, aby w sekcji Zadania lekturowe ustawić numer zajęć, priorytet, instrukcje i status ukończenia.
userGuide-readingDate-title = Ustaw termin zajęć
userGuide-readingDate-desc =
    Każde zajęcia mogą mieć termin lektury. Po kliknięciu Dalej ustawimy go dla Zajęć 1 — wtedy będzie można otworzyć Harmonogram lektur.
userGuide-readingSchedule-title = Otwórz Harmonogram lektur
userGuide-readingSchedule-desc =
    Harmonogram lektur zbiera zajęcia z terminami ze wszystkich sylabusów. Dalej otworzy go, aby pokazać, co nadchodzi.
userGuide-subcollections-title = Opcjonalnie: foldery zajęć
userGuide-subcollections-desc =
    Chcesz lustrzane foldery dla każdych zajęć? Włącz Podkolekcje zajęć w Ustawieniach. Pozostaw wyłączone, jeśli wtyczka nie ma zarządzać folderami podrzędnymi.
userGuide-finish-title = Wszystko gotowe
userGuide-finish-desc =
    Tę wycieczkę możesz w każdej chwili otworzyć ponownie z menu Pomoc → Otwórz przewodnik Zotero Syllabus. Powodzenia w nauce!
userGuide-empty-title = Porządkuj tę kolekcję według zajęć
userGuide-empty-desc =
    Dodaj zajęcia dla każdego tygodnia lub spotkania, a następnie przypisz lektury. Możesz też odbyć krótką wycieczkę z przewodnikiem.
userGuide-empty-tour = Rozpocznij wycieczkę

# Shared
app-name = Zotero Syllabus
this-collection = ta kolekcja
untitled = Bez tytułu
nav-back = Wstecz
nav-previous = Poprzedni
nav-next = Dalej

# View tabs / toolbar
view-tab-checklist = Lista kontrolna
view-tab-checklist-tooltip = Widok listy kontrolnej
view-tab-syllabus = Sylabus
view-tab-syllabus-tooltip = Widok sylabusa
view-tab-create-syllabus = Utwórz sylabus
view-tab-create-syllabus-tooltip = Przekształć tę kolekcję w sylabus
view-tab-table = Tabela
view-tab-table-tooltip = Widok tabeli
view-tab-gallery = Galeria
view-tab-gallery-tooltip = Widok galerii
view-tab-reading-schedule = Harmonogram lektur
toolbar-reading-schedule-review = Przejrzyj Harmonogram lektur
toolbar-reading-schedule-open = Otwórz Harmonogram lektur

# Context menus
menu-set-priority = Ustaw priorytet
menu-none = (Brak)
menu-assign-to-class = Przypisz do zajęć
menu-no-collection = (Nie wybrano kolekcji)
menu-class-label = { $nomenclature } { $number }
menu-add-to-new-class = Dodaj do nowych: { $nomenclature } { $number }
menu-set-reading-status = Ustaw status lektury
status-done = Ukończono
status-not-done = Nie ukończono

# Syllabus page
page-toc-title = Spis treści
placeholder-add-title = Dodaj tytuł…
page-compact-enable = Włącz tryb zwarty
page-compact-disable = Wyłącz tryb zwarty
page-reader-enable = Włącz tryb czytnika
page-reader-disable = Wyłącz tryb czytnika
page-export = Eksportuj plik sylabusa
page-import = Importuj plik sylabusa
page-edit-settings = Edytuj ustawienia sylabusa
page-lock = Zablokuj sylabus
page-unlock = Odblokuj sylabus
page-print = Drukuj listę w widoku sylabusa jako PDF
placeholder-course-code = Kod przedmiotu
placeholder-institution = Uczelnia
placeholder-add-description = Dodaj opis…
page-add-class = Dodaj: { $nomenclature } { $number }
page-add-to-class = Dodaj do: { $nomenclature } { $number }
page-drop-create-class = Upuść pozycję tutaj, aby utworzyć: { $nomenclature } { $number }
page-drop-import-file = Upuść plik .syllabus, aby zaimportować
further-reading-heading = Lektury uzupełniające
sort-label = Sortuj
further-reading-sort-aria = Sortuj lektury uzupełniające
sort-by-title = Tytuł
sort-by-creator = Twórca
sort-by-date = Data
further-reading-empty-desc = Pozycje w tej sekcji nie zostały przypisane do żadnych zajęć.
toc-empty = Brak dostępnych zajęć
placeholder-url = https://
links-delete = Usuń odnośnik
links-edit = Edytuj odnośnik
links-add = Dodaj odnośnik
bibliography-heading = Bibliografia

# Class groups / cards
mark-done = Oznacz jako ukończone
mark-not-done = Oznacz jako nieukończone
class-due-date-label = Termin:
class-reset-sort = Resetuj kolejność sortowania
class-move-up = Przenieś { $nomenclature } w górę
class-move-down = Przenieś { $nomenclature } w dół
class-delete = Usuń { $nomenclature }
class-dropzone-hint = Przeciągnij pozycje do: { $nomenclature } { $number }
due-date-clear = Wyczyść termin
due-date-add = Dodaj termin
placeholder-select-date = Wybierz datę
item-in-publication = w { $name }
attachment-url = URL
attachment-pdf = PDF
attachment-snapshot = Migawka
attachment-epub = EPUB
attachment-html = HTML
attachment-doc = DOC
attachment-txt = TXT
attachment-zip = ZIP
attachment-file = Plik
attachment-view = Widok
attachment-open = Otwórz { $label }
assignment-duplicate = Utwórz duplikat zadania
assignment-duplicate-label = Duplikuj
assignment-unassign-class = Usuń z zajęć
assignment-unassign-syllabus = Usuń z sylabusa
assignment-unassign-label = Cofnij przypisanie
priority-set-to = Ustaw priorytet na { $name }
priority-clear = Wyczyść priorytet
youtube-play = Odtwórz { $title } w YouTube

# Item pane
item-pane-not-found = Nie znaleziono pozycji
item-pane-none-selected = Nie zaznaczono pozycji
item-pane-n-selected = Zaznaczono pozycji: { $count }
item-pane-current-view = bieżący widok
item-pane-also-assigned = także przypisane do
item-pane-assignment-n = Zadanie nr { $number }
item-pane-assignment-for = dla { $title }
item-pane-due = Termin { $date }
item-pane-reference-material = Materiały źródłowe
item-pane-mark-done = Oznacz jako ukończone
placeholder-class-number = np. 1, 2, 3…
field-priority = Priorytet
field-instructions = Instrukcje
placeholder-instructions = Dodaj instrukcje do tego zadania…
assignment-delete = Usuń zadanie
item-pane-select-collection = Wybierz kolekcję, aby zobaczyć zadania sylabusa

# Settings
settings-title = Ustawienia sylabusa
settings-back = Powrót do widoku sylabusa
settings-nomenclature = Nazewnictwo
settings-nomenclature-desc = Wybierz termin na pojedyncze spotkania (np. „tydzień”, „zajęcia”, „sesja”, „sekcja”).
settings-singular = Forma liczby pojedynczej
settings-nomenclature-placeholder = np. tydzień, zajęcia, sesja, sekcja
settings-plural-label = Forma liczby mnogiej:
settings-subcollections = Podkolekcje zajęć
settings-subcollections-desc = Domyślnie wyłączone. Po włączeniu każde zajęcia otrzymują folder w tej kolekcji. Foldery są tworzone, przemianowywane i usuwane zgodnie z sylabusem — w tym istniejące kolekcje podrzędne, które mogą zostać usunięte. Wyłączenie tej opcji pozostawia foldery na miejscu.
settings-subcollections-checkbox = Tworzyć podkolekcje?
settings-bib-style = Styl bibliografii
settings-bib-style-desc = Wybierz styl CSL (Citation Style Language) dla odwołań bibliograficznych. Jeśli nie ustawiono, użyty zostanie styl domyślny użytkownika.
settings-citation-style = Styl cytowania
settings-user-default = Domyślny użytkownika
settings-user-default-named = Domyślny użytkownika: { $name }
settings-priorities = Priorytety
settings-priorities-desc = Dostosuj nazwy priorytetów, kolory i kolejność sortowania.
settings-add-priority = Dodaj nowy priorytet
settings-add-priority-button = Dodaj priorytet
settings-new-priority-name = Nowy priorytet
settings-priority-move-up = Przenieś w górę
settings-priority-move-down = Przenieś w dół
settings-priority-color = Kolor priorytetu
settings-priority-name-placeholder = Nazwa priorytetu
settings-priority-delete = Usuń priorytet
settings-priority-name-label = Nazwa
settings-priority-preview = Podgląd:
priority-default-course-info = Informacje o przedmiocie
priority-default-essential = Obowiązkowe
priority-default-recommended = Zalecane
priority-default-optional = Fakultatywne

# Gallery
gallery-empty-filtered = Brak pasujących pozycji.
gallery-empty = Brak pozycji w tej kolekcji.
gallery-untagged = Bez etykiet
gallery-untagged-desc = Pozycje w tej sekcji nie mają etykiet.
gallery-empty-subcollections = Brak podkolekcji ani pozycji w tej kolekcji.
gallery-unnumbered = Bez numeru
gallery-unnumbered-desc = Przypisane bez numeru zajęć.
gallery-sort-auto = Auto
gallery-sort-auto-title = Kolejność automatyczna (kolekcja lub sylabus)
gallery-sort-az = A–Z
gallery-sort-az-title = Sortuj A–Z
gallery-sort-date = Data
gallery-sort-date-title = Sortuj według daty (od najnowszych)
gallery-group-none = Brak
gallery-group-none-title = Bez grupowania
gallery-group-type = Typ
gallery-group-type-title = Grupuj według typu pozycji
gallery-group-tags = Etykiety
gallery-group-tags-title = Grupuj według etykiet
gallery-group-subcollections = Podkolekcje
gallery-group-subcollections-title = Grupuj według podkolekcji
gallery-group-classes = Zajęcia
gallery-group-classes-title = Grupuj według zajęć
gallery-layout-cover = Okładka
gallery-layout-cover-title = Ilustracja okładki
gallery-layout-card = Karta
gallery-layout-card-title = Karty sylabusa
gallery-options-aria = Opcje widoku galerii
gallery-options-title = Opcje widoku
gallery-menu-view = Widok
gallery-menu-sort = Sortuj
gallery-menu-group = Grupuj według
gallery-in-this-collection = W tej kolekcji
gallery-groups-nav-aria = Grupy
gallery-group-jump = Pokaż { $name }
gallery-prefs-summary = { $layout } / { $sort } / { $group }
gallery-page-of = Strona { $page } z { $total }

# Reading schedule
schedule-edit-settings = Edytuj ustawienia harmonogramu lektur
schedule-empty-title = Brak zaplanowanych lektur
schedule-empty-desc = Dodaj terminy lektur do zajęć, aby zobaczyć je tutaj.
schedule-this-week = W tym tygodniu
schedule-next-week = W przyszłym tygodniu
schedule-settings-title = Ustawienia harmonogramu lektur
schedule-settings-back = Powrót do harmonogramu lektur
schedule-settings-library = Kolekcja w bibliotece
schedule-settings-desc =
    Domyślnie wyłączone. Po włączeniu w bibliotece Moja biblioteka utrzymywana jest nadrzędna kolekcja „Harmonogram lektur” z folderem dla każdej niedawnej i nadchodzącej daty lektury. Foldery są tworzone, przemianowywane i wypełniane automatycznie. Wyłączenie tej opcji usuwa tę kolekcję; pozycje sylabusów pozostają na miejscu.
schedule-settings-checkbox = Generować kolekcję „Harmonogram lektur”?
schedule-day-managed-banner = Zarządzane automatycznie na podstawie sylabusów. Zmiany tutaj zostaną nadpisane.
schedule-day-empty = Brak lektur zaplanowanych na ten dzień.
schedule-window-empty = W oknie harmonogramu nie ma jeszcze lektur. Dodaj terminy lektur do zajęć, aby zobaczyć je tutaj.
schedule-no-dates = Brak dat
schedule-of-collection = z { $name }
schedule-of-collection-in-library = z { $collection } ({ $library })
schedule-open-syllabus = Otwórz sylabus: { $title }
class-folder-managed-banner = Zarządzane automatycznie na podstawie tego sylabusa. Zmiany w tym folderze zostaną nadpisane.

# Columns
column-reading-instructions = Instrukcje lektury
column-status = Status
column-reading-time = Czas czytania
column-syllabus-info = Informacje sylabusa
column-class-hash = nr { $number }

# Progress / dialogs
dialog-save-export = Zapisz eksport sylabusa
progress-import-success-title = Import zakończony
progress-import-success-text = Pomyślnie zaimportowano i scalono metadane sylabusa
progress-import-error-title = Błąd importu
progress-import-bad-file = Upuść plik .syllabus
progress-print-preparing = Przygotowywanie sylabusa do druku…
progress-print-failed = Nie udało się zapisać sylabusa jako PDF
dialog-save-pdf = Zapisz sylabus jako PDF
file-filter-pdf = PDF
progress-saving-pdf = Zapisywanie PDF…
dialog-save-file = Zapisz plik
progress-translator-install-error = Błąd instalacji scraperów list lektur
progress-migrate-start =
    { $count ->
        [one] Migracja { $count } sylabusa do notatek kolekcji…
        [few] Migracja { $count } sylabusów do notatek kolekcji…
       *[many] Migracja { $count } sylabusów do notatek kolekcji…
    }
progress-migrate-item = Migracja { $current } z { $total }…
progress-migrate-done =
    { $count ->
        [one] Zmigrowano { $count } sylabus
        [few] Zmigrowano { $count } sylabusy
       *[many] Zmigrowano { $count } sylabusów
    }
progress-migrate-empty-cleared =
    { $count ->
        [one] Wyczyszczono { $count } puste ustawienie
        [few] Wyczyszczono { $count } puste ustawienia
       *[many] Wyczyszczono { $count } pustych ustawień
    }
progress-migrate-not-found =
    { $count ->
        [one] Nie znaleziono { $count } kolekcji
        [few] Nie znaleziono { $count } kolekcji
       *[many] Nie znaleziono { $count } kolekcji
    }
progress-migrate-failed = Niepowodzeń: { $count }
progress-migrate-remaining = Pozostało w preferencjach: { $count }
reading-time-minutes = { $minutes } min
reading-time-hours =
    { $hours ->
        [one] { $hours } godz.
        [few] { $hours } godz.
       *[many] { $hours } godz.
    }
reading-time-hours-and-minutes =
    { $hours ->
        [one] { $hours } godz. { $minutes } min
        [few] { $hours } godz. { $minutes } min
       *[many] { $hours } godz. { $minutes } min
    }

# Collection tree
tree-tooltip-reading-schedule = Harmonogram lektur (zarządzany automatycznie)
tree-tooltip-auto-managed = Zarządzane automatycznie przez Zotero Syllabus
tree-tooltip-syllabus = Sylabus

# User guide sample items (created at tour time; not used as match keys)
tour-sample-reading-1 = Przykładowa lektura: Pierwsze kroki z listami kursów
tour-sample-reading-2 = Przykładowa lektura: Adnotowanie w trakcie czytania
tour-sample-reading-3 = Przykładowa lektura: Planowanie nadchodzącego tygodnia

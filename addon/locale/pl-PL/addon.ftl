startup-begin = Wtyczka jest wczytywana
startup-finish = Wtyczka jest gotowa
enable-syllabus-title = Przekształcić w sylabus?
enable-syllabus-message = Przekształcić „{ $name }” w sylabus? W tej kolekcji zostanie zapisana notatka sylabusa.
enable-subcollections-title = Zarządzać podkolekcjami zajęć?
enable-subcollections-message =
    Włączenie tej opcji pozwala wtyczce zarządzać kolekcjami podrzędnymi w „{ $name }”. Może to spowodować usunięcie lub nadpisanie już istniejących folderów.

    Co się stanie:

    • Dla zajęć z przypisanymi lekturami tworzony lub przejmowany jest jeden folder i zmieniana jest jego nazwa zgodnie z sylabusem (na przykład „Zajęcia 1: Tytuł”).

    • Zajęcia bez przypisanych lektur nie otrzymują folderu. Istniejące foldery takich zajęć są usuwane.

    • Kolekcje podrzędne, które nie są folderami zajęć — i nie mają własnej notatki sylabusa — zostaną usunięte. Pozycje nie są usuwane z biblioteki; pozostają w kolekcji nadrzędnej.

    • Pozycje w każdym folderze zajęć są nadpisywane na podstawie notatki sylabusa. Nadmiarowe pozycje w folderze są usuwane tylko z folderu.

    • Usunięcie zajęć z sylabusa usuwa odpowiadający im folder.

    • Jeśli usuniesz folder zajęć, który nadal ma przypisane lektury, wtyczka utworzy go ponownie.

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
managed-folder-banner-pinned =
    Don’t add or remove items here. This folder mirrors items you’ve pinned; pin or unpin elsewhere to change membership.
menuHelp-openUserGuide = Otwórz przewodnik Zotero Syllabus
menuHelp-openDocumentation = Dokumentacja Zotero Syllabus
menuHelp-openDiscord = Discord
menuHelp-openIssues = GitHub Issues
menuHelp-openReddit = Reddit
menuHelp-openForum = Zotero Forum
userGuide-start-title = Witamy w Zotero Syllabus
userGuide-start-desc =
    Przekształć dowolną kolekcję Zotero w listę lektur kursu — porządkuj według zajęć, ustalaj priorytety i śledź, co czytać dalej.
userGuide-start-close = Przypomnij później
userGuide-exit = Zakończ przewodnik
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
userGuide-collection-title = Zacznij od kolekcji
userGuide-collection-desc =
    Sylabusy są powiązane z kolekcjami. Otworzymy kolekcję ćwiczeniową „Wycieczka po sylabusie” z kilkoma przykładowymi lekturami.
userGuide-syllabusButton-title = Przekształć w sylabus
userGuide-syllabusButton-desc =
    Kliknij Przekształć w sylabus na pasku narzędzi pozycji, aby przekształcić tę kolekcję w zarys kursu. Wycieczka przełączy widok za Ciebie.
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
userGuide-readingSchedule-light-title = Open Reading Schedule
userGuide-readingSchedule-light-desc =
    The Reading Schedule tab gathers class due dates across your syllabi. Next opens it from the tab bar.
userGuide-home-title = Home view
userGuide-home-desc =
    At the library root, switch to Home for shelves of recent items and upcoming deadlines. Next selects your library home.
userGuide-subcollections-title = Opcjonalnie: foldery zajęć
userGuide-subcollections-desc =
    Chcesz lustrzane foldery dla każdych zajęć? Włącz Podkolekcje zajęć w Ustawieniach. Pozostaw wyłączone, jeśli wtyczka nie ma zarządzać folderami podrzędnymi.
userGuide-finish-title = Wszystko gotowe
userGuide-finish-desc =
    Tę wycieczkę możesz w każdej chwili otworzyć ponownie z menu Pomoc → Otwórz przewodnik Zotero Syllabus. Powodzenia w nauce!
userGuide-finish-community =
    Questions, bugs, or ideas? Join the conversation:
userGuide-link-discord = Discord
userGuide-link-issues = GitHub Issues
userGuide-link-forum = Zotero Forum
userGuide-link-reddit = Reddit
userGuide-finish-prefs-title = You’re set
userGuide-finish-prefs-desc =
    Turn views on or off anytime in Preferences → Zotero Syllabus → Views. You can reopen this tour from Help.
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
view-tab-create-syllabus = Przekształć w sylabus
view-tab-create-syllabus-tooltip = Przekształć tę kolekcję w sylabus
view-tab-table = Tabela
view-tab-table-tooltip = Widok tabeli
view-tab-gallery = Galeria
view-tab-gallery-tooltip = Widok galerii
view-tab-explorer = Home
view-tab-explorer-tooltip = View as Home
view-tab-reading-schedule = Harmonogram lektur
reading-schedule-desc = Class due dates across your syllabi, so you can see what’s next.
view-tab-my-annotations = Annotation Feed
toolbar-my-annotations-open = Open Annotation Feed
toolbar-reading-schedule-review = Przejrzyj Harmonogram lektur
toolbar-reading-schedule-open = Otwórz Harmonogram lektur

# Context menus
menu-set-priority = Ustaw priorytet przypisania
menu-none = (Brak)
menu-assign-to-class = Przypisz do zajęć
menu-no-collection = (Nie wybrano kolekcji)
menu-class-label = { $nomenclature } { $number }
menu-add-to-new-class = Dodaj do nowych: { $nomenclature } { $number }
menu-search-classes = Szukaj zajęć…
menu-set-reading-status = Ustaw status lektury
status-done = Ukończono
status-not-done = Nie ukończono

# Syllabus page
page-toc-title = Spis treści
placeholder-add-title = Dodaj tytuł…
page-density-cycle = Przełącz na { $next }
page-density-row = Wiersz
page-density-standard = Standardowa
page-density-expanded = Rozszerzona
page-reader-enable = Włącz pola wyboru
page-reader-disable = Wyłącz pola wyboru
page-export = Eksportuj plik sylabusa
page-import = Importuj plik sylabusa
page-edit-settings = Edytuj ustawienia sylabusa
page-lock = Zablokuj sylabus
page-unlock = Odblokuj sylabus
page-lock-search = Zablokowane podczas wyszukiwania
page-view-options-aria = Syllabus view options
page-view-checkboxes = Pokaż pola wyboru
page-view-notes = Pokaż notatki
page-print = Zapisz sylabus jako PDF, Word, Markdown lub HTML
page-save-pdf = PDF
page-save-word = Word
page-save-markdown = Markdown
page-save-html = HTML
page-publish = Publish online…
print-notes-excluded = Notatki do zajęć pozostają prywatne i nie zostaną uwzględnione.
placeholder-course-code = Kod przedmiotu
placeholder-institution = Uczelnia
placeholder-add-description = Dodaj opis…
page-add-class = Dodaj: { $nomenclature } { $number }
page-add-to-class = Dodaj do: { $nomenclature } { $number }
page-drop-create-class = Upuść pozycję tutaj, aby utworzyć: { $nomenclature } { $number }
page-drop-import-file = Upuść pliki, aby dodać je do tej kolekcji
further-reading-heading = Lektury uzupełniające
sort-label = Sortuj
further-reading-sort-aria = Sortuj lektury uzupełniające
further-reading-add-readings-aria = Dodaj lektury do dalszych lektur
sort-by-title = Tytuł
sort-by-creator = Twórca
sort-by-date = Data
further-reading-empty-desc = Pozycje w tej sekcji nie zostały przypisane do żadnych zajęć.
unnumbered-add-readings-aria = Dodaj lektury do sekcji nienumerowanej
unnumbered-add-note-aria = Dodaj notatkę do sekcji nienumerowanej
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
class-insert-here = Dodaj { $nomenclature } tutaj
class-dropzone-hint = Przeciągnij pozycje do: { $nomenclature } { $number }
class-add-readings = Dodaj lektury
class-add-readings-aria = Dodaj lektury do: { $nomenclature } { $number }
class-add-note = Dodaj notatkę
class-note-priority = Notatka do zajęć
class-note-open = Otwórz notatkę
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
assignment-edit-instructions = Edytuj instrukcje czytania
assignment-edit-instructions-label = Instrukcje
assignment-unassign-class = Usuń z zajęć
assignment-unassign-syllabus = Usuń z sylabusa
assignment-unassign-label = Cofnij przypisanie
priority-set-to = Ustaw priorytet na { $name }
priority-clear = Wyczyść priorytet
priority-none = Bez priorytetu
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
item-pane-class-named = { $nomenclature } { $number }: { $title }
item-pane-mark-done = Oznacz jako ukończone
placeholder-class-number = np. 1, 2, 3…
field-priority = Priorytet
field-instructions = Instrukcje
placeholder-instructions = Dodaj instrukcje do tego zadania…
assignment-delete = Usuń zadanie
item-pane-select-collection = Wybierz kolekcję, aby zobaczyć zadania sylabusa
item-pane-add-to-class = Dodaj do zajęć…
item-pane-create-assignment = Utwórz przypisanie
item-pane-show-in-syllabus = Show in syllabus
add-to-class-window-title = Dodaj do zajęć
add-to-class-search = Szukaj sylabusów i zajęć
add-to-class-empty = Brak pasujących zajęć
add-to-class-no-syllabi = Przekształć kolekcję w sylabus, aby przypisywać lektury do zajęć.
add-to-class-syllabus-in-library = { $syllabus } ({ $library })
add-to-class-cancel = Anuluj

# Settings
settings-title = Ustawienia sylabusa
settings-window-title = Ustawienia: { $name }
settings-view = View
settings-view-desc = Density and checkboxes for this syllabus.
settings-density = Density
settings-file = Syllabus file
settings-file-desc = Export or import a .syllabus metadata file for this collection.
settings-back = Powrót do widoku sylabusa
settings-nomenclature = Nazewnictwo
settings-nomenclature-desc = Wybierz termin na pojedyncze spotkania (np. „tydzień”, „zajęcia”, „sesja”, „sekcja”).
settings-singular = Forma liczby pojedynczej
settings-nomenclature-placeholder = np. tydzień, zajęcia, sesja, sekcja
settings-plural-label = Forma liczby mnogiej:
settings-subcollections = Podkolekcje zajęć
settings-subcollections-desc = Po włączeniu zajęcia z przypisanymi lekturami otrzymują folder w tej kolekcji.
settings-subcollections-checkbox = Tworzyć podkolekcje?
settings-bib-style = Styl bibliografii
settings-bib-style-desc = Wybierz styl CSL (Citation Style Language) dla odwołań bibliograficznych.
settings-citation-style = Styl cytowania
settings-user-default = Domyślny użytkownika
settings-user-default-named = Domyślny użytkownika: { $name }
settings-priorities = Priorytety
settings-priorities-desc = Dostosuj nazwy, kolory i kolejność priorytetów tego sylabusu.
settings-priorities-global-title = Globalne domyślne priorytety
settings-priorities-global-desc = Nowe sylabusy kopiują te priorytety. Istniejące zachowują własne listy.
settings-priorities-global-link = Edytuj ustawienia globalne…
settings-priorities-global-done = Gotowe
settings-priorities-global-reset = Przywróć wbudowane domyślne
settings-priorities-set-global = Użyj jako ustawienia globalne
settings-priorities-set-global-confirm-title = Użyć jako ustawienia globalne?
settings-priorities-set-global-confirm-message =
    To zastąpi Twoje globalne domyślne priorytety priorytetami tego sylabusu. Nowe sylabusy skopiują te nazwy, kolory i kolejność. Istniejące się nie zmienią.
settings-priorities-set-global-done = Zapisano jako ustawienia globalne dla nowych sylabusów
settings-priorities-reset-global = Przywróć ustawienia globalne
settings-priorities-reset-global-confirm-title = Przywrócić ustawienia globalne?
settings-priorities-reset-global-confirm-message =
    To zastąpi priorytety tego sylabusu Twoimi ustawieniami globalnymi. Lektury używające priorytetów spoza listy globalnej będzie trzeba przenieść lub wyczyścić.
settings-priorities-reset-global-done = Przywrócono priorytety do ustawień globalnych
settings-add-priority = Dodaj nowy priorytet
settings-add-priority-button = Dodaj priorytet
settings-new-priority-name = Nowy priorytet
settings-priority-move-up = Przenieś w górę
settings-priority-move-down = Przenieś w dół
settings-priority-color = Kolor priorytetu
settings-priority-name-placeholder = Nazwa priorytetu
settings-priority-delete = Usuń priorytet
settings-priority-delete-title = Usunąć priorytet?
settings-priority-delete-message =
    { $count ->
        [one] { $count } lektura używa „{ $name }”. Wybierz, co z nią zrobić przed usunięciem tego priorytetu.
       *[other] { $count } lektury używają „{ $name }”. Wybierz, co z nimi zrobić przed usunięciem tego priorytetu.
    }
settings-priority-delete-migrate-label = Przenieś lektury do
settings-priority-delete-migrate = Przenieś i usuń
settings-priority-delete-clear = Wyczyść priorytet
settings-priority-delete-cancel = Anuluj
settings-priority-name-label = Nazwa
settings-priority-preview = Podgląd:
priority-default-course-info = Informacje o przedmiocie
priority-default-essential = Obowiązkowe
priority-default-recommended = Zalecane
priority-default-optional = Fakultatywne

# Gallery
gallery-pinned-header =
    Items you’ve pinned for quick access. Pin or unpin from an item’s context menu or the Reading Schedule. Collections you pin stay on Home and Reading Schedule, not in this folder.
gallery-add-readings-aria = Dodaj lektury do tej kolekcji
gallery-empty-filtered = Brak pasujących pozycji.
gallery-empty = Brak pozycji w tej kolekcji.
gallery-untagged = Bez etykiet
gallery-untagged-desc = Pozycje w tej sekcji nie mają etykiet.
gallery-uncredited = Bez twórcy
gallery-uncredited-desc = Pozycje w tej sekcji nie mają twórcy.
gallery-empty-subcollections = Brak podkolekcji ani pozycji w tej kolekcji.
gallery-unnumbered = Bez numeru
gallery-unnumbered-desc = Przypisane bez numeru zajęć.
gallery-sort-auto = Auto
gallery-sort-auto-title = Kolejność automatyczna (osobista lista lektur, potem zajęcia, potem kolekcja)
gallery-sort-az = A–Z
gallery-sort-az-title = Sortuj A–Z
gallery-sort-date = Opublikowano
gallery-sort-date-title = Sortuj według daty publikacji (od najnowszych)
gallery-sort-date-added = Dodano
gallery-sort-date-added-title = Sortuj według daty dodania (od najnowszych)
gallery-sort-personal-order = Kolejność czytania
gallery-sort-personal-order-title = Osobista kolejność czytania (przeciągnij, aby zmienić)
gallery-personal-order-unordered = Bez kolejności
gallery-personal-order-landing-label = Reading order
gallery-personal-order-landing-empty = Drag items here to set your reading order
personal-reading-order-menu-add = Dodaj do kolejności czytania kolekcji
personal-reading-order-menu-remove = Usuń z kolejności czytania kolekcji
gallery-sort-last-read = Last Read
gallery-sort-last-read-title = Sort by last read (most recent first)
gallery-group-none = Brak
gallery-group-none-title = Bez grupowania
gallery-group-auto = Automatycznie
gallery-group-auto-title = Automatyczne grupowanie
gallery-group-type = Typ
gallery-group-type-title = Grupuj według typu pozycji
gallery-group-creator = Twórca
gallery-group-creator-title = Grupuj według twórcy
gallery-group-tags = Etykiety
gallery-group-tags-title = Grupuj według etykiet
gallery-include-automatic-tags = Uwzględnij automatyczne etykiety
gallery-include-automatic-tags-title = Uwzględnij etykiety dodawane przez Zotero z słów kluczowych i haseł przedmiotowych
gallery-group-subcollections = Podkolekcje
gallery-group-subcollections-title = Grupuj według podkolekcji
gallery-group-classes = Zajęcia
gallery-group-classes-title = Grupuj według zajęć
gallery-layout-cover = Okładka
gallery-layout-cover-title = Ilustracja okładki
gallery-layout-card = Karta
gallery-layout-card-title = Karty sylabusa
gallery-layout-annotations = Adnotacje
gallery-layout-annotations-title = Okładki ze wszystkimi adnotacjami
gallery-annotations-empty = Brak adnotacji
gallery-annotations-none-heading = Brak adnotacji
gallery-preview-none-heading = Brak podglądu
gallery-annotations-show-empty = Pokaż elementy bez adnotacji
gallery-layout-magazine = Podgląd
gallery-layout-magazine-title = Okładki z podglądem fragmentów
gallery-menu-packing = Packing
gallery-packing-vertical = Vertical
gallery-packing-vertical-title = Covers with abstracts in a reading stack
gallery-packing-grid = Grid
gallery-packing-grid-title = Equal-size magazine tiles
gallery-packing-packed = Packed
gallery-packing-packed-title = Mixed-size magazine layout

# Gallery notes (collection-scoped child notes)
gallery-note-add = Dodaj notatkę osobistą
gallery-note-edit = Edytuj notatkę osobistą
gallery-note-remove = Usuń notatkę osobistą
gallery-note-label = Notatka osobista
magazine-shelf-watch = Oglądaj
magazine-shelf-watch-title = Ostatnio dodane filmy
magazine-shelf-listen = Słuchaj
magazine-shelf-listen-title = Ostatnio dodane nagrania
magazine-highlights = Wyróżnienia
magazine-blurb-open = Otwórz ten fragment w czytniku
gallery-options-aria = Opcje widoku galerii
gallery-options-title = Opcje widoku
gallery-menu-view = Widok
gallery-menu-sort = Sortuj
gallery-menu-group = Grupuj według
gallery-menu-type-size = Rozmiar tekstu
gallery-type-small = Mały
gallery-type-small-title = Mniejszy tekst podglądu
gallery-type-large = Duży
gallery-type-large-title = Większy tekst podglądu
gallery-in-this-collection = W tej kolekcji
gallery-open-collection = Przejdź do { $name }
gallery-groups-nav-aria = Grupy
gallery-group-jump = Pokaż { $name }
gallery-prefs-summary = { $layout } / { $sort } / { $group }
gallery-page-of = Strona { $page } z { $total }
gallery-save-globally = Zapisz jako domyślne
gallery-save-globally-title = Zapisz tę opcję jako domyślną dla wszystkich kolekcji
gallery-save-globally-active-title = Ustawienie tej kolekcji różni się od domyślnego. Kliknij, aby zapisać je jako domyślne.
galleryTour-settings-title = Opcje galerii
galleryTour-settings-desc =
    Otwórz menu w rogu, aby zmienić widok, sortowanie i grupowanie. Pokażemy trzy układy.
galleryTour-cover-title = Widok okładki
galleryTour-cover-desc =
    Okładka pokazuje każdy element jako ilustrację — książki, artykuły i strony WWW na pierwszy rzut oka.
galleryTour-magazine-title = Widok podglądu
galleryTour-magazine-desc =
    Podgląd pokazuje każdą okładkę obok fragmentu — jak Adnotacje, ale z zapowiedzią zamiast wyróżnień. Pozycje bez podglądu są w rzędzie okładek.
galleryTour-card-title = Widok kart
galleryTour-card-desc =
    Karty używają tego samego układu sylabusa, pogrupowane według typu elementu, aby podobne lektury były razem.
galleryTour-choose-title = Wybierz domyślny
galleryTour-choose-desc =
    W jakim układzie ma się otwierać Galeria? Możesz to później zmienić w preferencjach Zotero Syllabus lub przez Zapisz jako domyślne.
galleryTour-skip = Pomiń

# Reading schedule
schedule-edit-settings = Edytuj ustawienia harmonogramu lektur
schedule-empty-title = Brak zaplanowanych lektur
schedule-empty-desc = Dodaj terminy lektur do zajęć, aby zobaczyć je tutaj.
schedule-this-week = W tym tygodniu
schedule-next-week = W przyszłym tygodniu
schedule-settings-title = Ustawienia harmonogramu lektur
schedule-settings-library = Kolekcja w bibliotece
schedule-settings-checkbox = Generować kolekcję „Harmonogram lektur”?
schedule-apply-to-pinned = Zastosuj do Pinned
schedule-day-managed-banner = Zarządzane automatycznie na podstawie sylabusów. Zmiany tutaj zostaną nadpisane.
schedule-day-empty = Brak lektur zaplanowanych na ten dzień.
schedule-window-empty = W oknie harmonogramu nie ma jeszcze lektur. Dodaj terminy lektur do zajęć, aby zobaczyć je tutaj.
schedule-no-dates = Brak dat
schedule-class-named = { $nomenclature } { $number }: { $name }
schedule-of-collection = w { $name }
schedule-of-collection-in-library = w { $collection } ({ $library })
schedule-open-syllabus = Otwórz sylabus: { $title }
class-folder-managed-banner = Zarządzane automatycznie na podstawie tego sylabusa. Zmiany w tym folderze zostaną nadpisane.

# Pinned (Reading Schedule)
pinned-section-heading = Pinned
pinned-hide = Ukryj
pinned-show = Pokaż
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
column-reading-instructions = Instrukcje lektury
column-status = Status
column-reading-time = Czas czytania
column-syllabus-info = Zajęcia / zadanie sylabusa
column-syllabus-priority = Priorytet sylabusa
column-personal-reading-order = Osobista kolejność czytania
column-class-hash = nr { $number }

# Progress / dialogs
dialog-save-export = Zapisz eksport sylabusa
progress-import-success-title = Import zakończony
progress-import-success-text = Pomyślnie zaimportowano i scalono metadane sylabusa
progress-import-error-title = Błąd importu
progress-import-bad-file = Upuść plik .syllabus
progress-print-preparing = Przygotowywanie sylabusu…
progress-print-failed = Nie udało się zapisać sylabusu
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
item-share-via-url = Share via URL
item-unpublish = Unpublish shared URL
item-share-pane-multi-selected = Select a single item to share
item-share-pane-unsupported = Notes cannot be shared via URL
item-share-pane-not-shared = This item is not shared online
dialog-item-share-confirm-title = Share item online?
dialog-item-share-confirm-text = This uploads the item's bibliographic details and attached files to a public URL. Anyone with the link can open them. Only share materials you have the right to share.
dialog-item-unpublish-confirm-title = Unpublish item?
dialog-item-unpublish-confirm-text = This removes the public item page. Attached files are removed only if no published syllabus still links to them.
progress-item-share-preparing = Preparing item share…
progress-item-share-uploading = Uploading { $current } of { $total }…
progress-item-share-done = Shared — link copied
progress-item-share-failed = Could not share the item
progress-item-unpublish = Removing shared item…
progress-item-unpublish-done = Item unpublished
progress-item-unpublish-failed = Could not unpublish the item
item-share-untitled = Untitled
item-share-meta-summary = Details
item-share-meta-creators = Creators
item-share-meta-date = Date
item-share-meta-type = Type
item-share-meta-publication = Publication
item-share-meta-publisher = Publisher
item-share-meta-pages = Volume / issue / pages
item-share-meta-doi = DOI
item-share-meta-isbn = ISBN
item-share-meta-url = URL
item-share-meta-abstract = Abstract
item-share-meta-tags = Tags
item-share-files-heading = Files
item-share-cite-heading = Cite
item-share-no-files = No files attached
item-share-viewer-title = Document preview
dialog-save-pdf = Zapisz sylabus jako PDF
file-filter-pdf = PDF
dialog-save-word = Zapisz sylabus jako Word
file-filter-word = Word
dialog-save-markdown = Zapisz sylabus jako Markdown
file-filter-markdown = Markdown
dialog-save-html = Zapisz sylabus jako HTML
file-filter-html = HTML
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
my-annotations-empty-color-filter = Żadna adnotacja nie pasuje do wybranych kolorów
my-annotations-empty-tag-filter = Żadna adnotacja nie pasuje do wybranych tagów
my-annotations-empty-filters = Żadna adnotacja nie pasuje do wybranych filtrów
my-annotations-search-placeholder = Szukaj w cytatach i komentarzach
my-annotations-search-aria = Szukaj adnotacji
my-annotations-search-clear = Wyczyść wyszukiwanie
my-annotations-search-scope-aria = Search in
my-annotations-search-scope-both = Annotations and Full Text
my-annotations-search-scope-annotations = Annotations Only
my-annotations-search-scope-fulltext = Full Text Only
my-annotations-empty-search = Żadna adnotacja nie pasuje do tego wyszukiwania
my-annotations-desc = Your highlights and notes across sources, in chronological order.
my-annotations-order-newest-last = Newest last
my-annotations-order-newest-last-title = Oldest at the top, newest at the bottom
my-annotations-order-newest-first = Newest first
my-annotations-order-newest-first-title = Newest at the top, oldest at the bottom
annotations-quote-order-menu = Sortuj adnotacje
annotations-quote-order-location = Lokalizacja
annotations-quote-order-location-title = Sortuj cytaty według pozycji w dokumencie
annotations-quote-order-date-added = Dodano
annotations-quote-order-date-added-title = Sortuj cytaty według daty dodania (najstarsze najpierw)
annotations-activity-gap-later =
    { $unit ->
        [day] { $count ->
            [one] dzień później
            [few] { $count } dni później
           *[many] { $count } dni później
        }
        [week] { $count ->
            [one] tydzień później
            [few] { $count } tygodnie później
           *[many] { $count } tygodni później
        }
        [month] { $count ->
            [one] miesiąc później
            [few] { $count } miesiące później
           *[many] { $count } miesięcy później
        }
        [year] { $count ->
            [one] rok później
            [few] { $count } lata później
           *[many] { $count } lat później
        }
       *[other] później
    }
annotations-activity-gap-earlier =
    { $unit ->
        [day] { $count ->
            [one] dzień wcześniej
            [few] { $count } dni wcześniej
           *[many] { $count } dni wcześniej
        }
        [week] { $count ->
            [one] tydzień wcześniej
            [few] { $count } tygodnie wcześniej
           *[many] { $count } tygodni wcześniej
        }
        [month] { $count ->
            [one] miesiąc wcześniej
            [few] { $count } miesiące wcześniej
           *[many] { $count } miesięcy wcześniej
        }
        [year] { $count ->
            [one] rok wcześniej
            [few] { $count } lata wcześniej
           *[many] { $count } lat wcześniej
        }
       *[other] wcześniej
    }
my-annotations-load-previous = Load previous
my-annotations-load-previous-loading = Loading…
my-annotations-open-in-reader = Open in reader
my-annotations-copy = Copy
my-annotations-copied = Copied
my-annotations-copy-all = Copy all
my-annotations-options-aria = Annotation Feed options
my-annotations-menu-order = Order
my-annotations-menu-color = Filtruj według koloru
my-annotations-menu-color-clear = Wyczyść filtr kolorów
my-annotations-menu-tag = Filtruj według tagu
my-annotations-menu-tag-clear = Wyczyść filtr tagów
my-annotations-menu-tag-add = Dodaj tag
my-annotations-menu-tag-remove = Usuń tag „{ $tag }”
my-annotations-color-swatch = { $color }
my-annotations-color-yellow = Żółty
my-annotations-color-light-yellow = Jasny żółty
my-annotations-color-red = Czerwony
my-annotations-color-green = Zielony
my-annotations-color-blue = Niebieski
my-annotations-color-purple = Fioletowy
my-annotations-color-magenta = Magenta
my-annotations-color-orange = Pomarańczowy
my-annotations-color-gray = Szary
my-annotations-menu-copy = Copy
my-annotations-menu-copy-desc = Applied when copying annotations from this feed.
my-annotations-copy-blockquote = Prefix with Markdown blockquotes (>)
my-annotations-copy-cite-key = Append Pandoc cite keys ({"[@…]"})
my-annotations-page = p. { $page }
my-annotations-stream-tags-aria = Tagi
my-annotations-batch-aria = Akcje zbiorcze adnotacji
my-annotations-batch-selected =
    { $count ->
        [one] { $count } zaznaczona
        [few] { $count } zaznaczone
       *[many] { $count } zaznaczonych
    }
my-annotations-batch-select = Zaznacz adnotację
my-annotations-batch-tag = Oznacz tagiem
my-annotations-batch-tag-placeholder = Nazwa tagu
my-annotations-batch-tag-apply = Zastosuj
my-annotations-batch-untag = Usuń tag
my-annotations-batch-untag-empty = Brak tagów na zaznaczonych adnotacjach
my-annotations-batch-untag-tag = Usuń tag „{ $tag }”
my-annotations-batch-recolour = Zmień kolor
my-annotations-batch-recolour-swatch = Zmień kolor na { $color }
my-annotations-batch-clear = Odznacz wszystko
my-annotations-related =
    { $count ->
        [one] Powiązane: { $count }
       *[other] Powiązane: { $count }
    }
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
tree-tooltip-reading-schedule = Harmonogram lektur (zarządzany automatycznie)
tree-tooltip-auto-managed = Zarządzane automatycznie przez Zotero Syllabus
tree-tooltip-syllabus = Sylabus

# User guide sample items (created at tour time; not used as match keys)
tour-sample-reading-1 = Przykładowa lektura: Pierwsze kroki z listami kursów
tour-sample-reading-2 = Przykładowa lektura: Adnotowanie w trakcie czytania
tour-sample-reading-3 = Przykładowa lektura: Planowanie nadchodzącego tygodnia

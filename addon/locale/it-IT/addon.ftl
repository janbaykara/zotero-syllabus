startup-begin = Il componente aggiuntivo è in caricamento
startup-finish = Il componente aggiuntivo è pronto
enable-syllabus-title = Convertire in un programma del corso?
enable-syllabus-message = Convertire «{ $name }» in un programma del corso? Una nota di programma verrà salvata in questa raccolta.
enable-subcollections-title = Gestire le sottoraccolte delle lezioni?
enable-subcollections-message =
    Attivando questa opzione il componente aggiuntivo gestisce le raccolte figlie sotto «{ $name }». Ciò può eliminare o riscrivere cartelle già esistenti.

    Cosa succede:

    • Viene creata o adottata una cartella per ogni lezione con letture assegnate e rinominata in modo da corrispondere al programma (ad esempio «Lezione 1: Titolo»).

    • Le lezioni senza letture assegnate non hanno una cartella. Le cartelle esistenti di quelle lezioni vengono rimosse.

    • Le raccolte figlie che non sono quelle cartelle di lezione — e che non hanno una propria nota di programma — verranno eliminate. Gli elementi non vengono cancellati dalla libreria; restano nella raccolta padre.

    • Gli elementi di ogni cartella di lezione vengono sovrascritti a partire dalla nota del programma. Gli elementi in eccesso vengono rimossi solo dalla cartella.

    • Rimuovere una lezione dal programma elimina quella cartella di lezione.

    • Se si elimina una cartella di lezione che ha ancora letture assegnate, il componente aggiuntivo la ricrea.

    Disattivando in seguito si interrompe la gestione delle cartelle; quelle esistenti restano al loro posto.

    Continuare?
enable-reading-schedule-collection-title = Generare la raccolta Calendario delle letture?
enable-reading-schedule-collection-message =
    Attivando questa opzione si crea una raccolta di primo livello «Calendario delle letture» in Libreria personale, con una cartella per ogni data di lettura (da 10 giorni fa in poi).

    Cosa succede:

    • Le cartelle per data vengono create, rinominate e riempite automaticamente a partire dai programmi.

    • Gli elementi in quelle cartelle vengono sovrascritti a partire dal calendario. Gli elementi in eccesso vengono rimossi solo dalla cartella, non dalla libreria.

    • Se si elimina la raccolta o una cartella di data, il componente aggiuntivo la ricrea finché l’impostazione è attiva.

    • I programmi delle librerie di gruppo non sono inclusi (gli elementi non possono passare da una libreria all’altra).

    Disattivando in seguito si elimina la raccolta «Calendario delle letture» e le sue cartelle di data. Gli elementi dei programmi restano al loro posto.

    Continuare?
disable-reading-schedule-collection-title = Rimuovere la raccolta Calendario delle letture?
disable-reading-schedule-collection-message =
    Disattivando questa opzione si elimina la raccolta gestita «Calendario delle letture» e le sue cartelle di data.

    Gli elementi non vengono cancellati dalla libreria; restano nelle raccolte originali del programma.

    Continuare?
prefs-title = Zotero Syllabus
prefs-table-title = Titolo
prefs-table-detail = Dettaglio
tabpanel-lib-tab-label = Scheda libreria
tabpanel-reader-tab-label = Scheda lettore
menu-toggle-bibliography = Mostra/nascondi bibliografia
managed-folder-banner-title = Cartella gestita automaticamente
managed-folder-banner-class =
    Non aggiungere né rimuovere elementi qui. Questa cartella di lezione è tenuta in sincrono con il programma; le modifiche manuali vengono sovrascritte.
managed-folder-banner-schedule =
    Non aggiungere né rimuovere elementi qui. Questa cartella del calendario delle letture è tenuta in sincrono con i programmi; le modifiche manuali vengono sovrascritte.
menuHelp-openUserGuide = Apri la guida utente di Zotero Syllabus
userGuide-start-title = Benvenuto in Zotero Syllabus
userGuide-start-desc =
    Trasforma qualsiasi raccolta Zotero in una lista di letture del corso: organizza per lezione, imposta le priorità e tieni traccia di cosa leggere dopo.
userGuide-start-close = Ricordamelo più tardi
userGuide-collection-title = Parti da una raccolta
userGuide-collection-desc =
    I programmi vivono sulle raccolte. Apriremo una raccolta di prova «Syllabus Tour» con alcune letture di esempio.
userGuide-syllabusButton-title = Converti in un programma
userGuide-syllabusButton-desc =
    Fai clic su Converti in programma nella barra degli strumenti degli elementi per convertire questa raccolta nello schema del corso. Il tour passerà lì automaticamente.
userGuide-addClass-title = Aggiungi una lezione
userGuide-addClass-desc =
    Le lezioni (o settimane / sessioni — potrai rinominarle in seguito) sono le sezioni del programma. Aggiungine una per iniziare.
userGuide-assign-title = Assegna le letture
userGuide-assign-desc =
    Trascina gli elementi in una lezione, oppure clic destro → Assegna a una lezione. Gli elementi non assegnati restano in Letture integrative.
userGuide-itemPane-title = Modifica nel riquadro dell’elemento
userGuide-itemPane-desc =
    Seleziona una lettura per impostare numero di lezione, priorità, istruzioni e stato di completamento nella sezione Compiti di lettura.
userGuide-readingDate-title = Imposta la scadenza di una lezione
userGuide-readingDate-desc =
    Ogni lezione può avere una data di lettura. Ne imposteremo una sulla Lezione 1 quando fai clic su Avanti — poi potrai aprire il Calendario delle letture.
userGuide-readingSchedule-title = Apri il Calendario delle letture
userGuide-readingSchedule-desc =
    Il Calendario delle letture raccoglie le lezioni con scadenza da tutti i programmi. Avanti lo apre per vedere cosa arriva.
userGuide-subcollections-title = Facoltativo: cartelle di lezione
userGuide-subcollections-desc =
    Vuoi specchi di cartella per lezione? Attiva Sottoraccolte delle lezioni in Impostazioni. Lascia disattivato a meno che tu non voglia che il componente aggiuntivo gestisca le cartelle figlie.
userGuide-finish-title = Sei pronto
userGuide-finish-desc =
    Puoi riaprire questo tour in qualsiasi momento da Aiuto → Apri la guida utente di Zotero Syllabus. Buono studio!
userGuide-empty-title = Organizza questa raccolta per lezione
userGuide-empty-desc =
    Aggiungi lezioni per ogni settimana o sessione, poi assegna le letture. Puoi anche seguire un breve tour guidato.
userGuide-empty-tour = Fai il tour

# Shared
app-name = Zotero Syllabus
this-collection = questa raccolta
untitled = Senza titolo
nav-back = Indietro
nav-previous = Precedente
nav-next = Avanti

# View tabs / toolbar
view-tab-checklist = Elenco di controllo
view-tab-checklist-tooltip = Visualizza come elenco di controllo
view-tab-syllabus = Programma
view-tab-syllabus-tooltip = Visualizza come programma del corso
view-tab-create-syllabus = Converti in programma
view-tab-create-syllabus-tooltip = Converti questa raccolta in un programma del corso
view-tab-table = Tabella
view-tab-table-tooltip = Visualizza come tabella
view-tab-gallery = Galleria
view-tab-gallery-tooltip = Visualizza come galleria
view-tab-explorer = Home
view-tab-explorer-tooltip = View as Home
view-tab-reading-schedule = Calendario delle letture
toolbar-reading-schedule-review = Rivedi il Calendario delle letture
toolbar-reading-schedule-open = Apri il Calendario delle letture

# Context menus
menu-set-priority = Imposta priorità
menu-none = (Nessuna)
menu-assign-to-class = Assegna a una lezione
menu-no-collection = (Nessuna raccolta selezionata)
menu-class-label = { $nomenclature } { $number }
menu-add-to-new-class = Aggiungi alla nuova { $nomenclature } { $number }
menu-set-reading-status = Imposta stato di lettura
status-done = Completato
status-not-done = Non completato

# Syllabus page
page-toc-title = Indice
placeholder-add-title = Aggiungi un titolo…
page-compact-enable = Attiva la modalità compatta
page-compact-disable = Disattiva la modalità compatta
page-reader-enable = Attiva la modalità lettura
page-reader-disable = Disattiva la modalità lettura
page-export = Esporta file del programma
page-import = Importa file del programma
page-edit-settings = Modifica impostazioni del programma
page-lock = Blocca il programma
page-unlock = Sblocca il programma
page-print = Stampa l’elenco della vista Programma come PDF
placeholder-course-code = Codice dell’insegnamento
placeholder-institution = Istituzione
placeholder-add-description = Aggiungi una descrizione…
page-add-class = Aggiungi { $nomenclature } { $number }
page-add-to-class = Aggiungi a { $nomenclature } { $number }
page-drop-create-class = Rilascia l’elemento qui per creare { $nomenclature } { $number }
page-drop-import-file = Rilascia i file per aggiungerli a questa raccolta
further-reading-heading = Letture integrative
sort-label = Ordina
further-reading-sort-aria = Ordina le letture integrative
sort-by-title = Titolo
sort-by-creator = Autore
sort-by-date = Data
further-reading-empty-desc = Gli elementi in questa sezione non sono stati assegnati ad alcuna lezione.
toc-empty = Nessuna lezione disponibile
placeholder-url = https://
links-delete = Elimina collegamento
links-edit = Modifica collegamento
links-add = Aggiungi collegamento
bibliography-heading = Bibliografia

# Class groups / cards
mark-done = Segna come completato
mark-not-done = Segna come non completato
class-due-date-label = Scadenza:
class-reset-sort = Reimposta l’ordine
class-move-up = Sposta { $nomenclature } in alto
class-move-down = Sposta { $nomenclature } in basso
class-delete = Elimina { $nomenclature }
class-dropzone-hint = Trascina gli elementi su { $nomenclature } { $number }
due-date-clear = Cancella la scadenza
due-date-add = Aggiungi una scadenza
placeholder-select-date = Seleziona data
item-in-publication = in { $name }
attachment-url = URL
attachment-pdf = PDF
attachment-snapshot = Istantanea
attachment-epub = EPUB
attachment-html = HTML
attachment-doc = DOC
attachment-txt = TXT
attachment-zip = ZIP
attachment-file = File
attachment-view = Visualizza
attachment-open = Apri { $label }
assignment-duplicate = Crea assegnazione duplicata
assignment-duplicate-label = Duplica
assignment-unassign-class = Rimuovi dalla lezione
assignment-unassign-syllabus = Rimuovi dal programma
assignment-unassign-label = Annulla assegnazione
priority-set-to = Imposta priorità su { $name }
priority-clear = Cancella priorità
youtube-play = Riproduci { $title } su YouTube

# Item pane
item-pane-not-found = Elemento non trovato
item-pane-none-selected = Nessun elemento selezionato
item-pane-n-selected = { $count } elementi selezionati
item-pane-current-view = vista corrente
item-pane-also-assigned = anche assegnato a
item-pane-assignment-n = Compito #{ $number }
item-pane-assignment-for = per { $title }
item-pane-due = Scadenza { $date }
item-pane-reference-material = Materiale di riferimento
item-pane-class-named = { $nomenclature } { $number }: { $title }
item-pane-mark-done = Segna come completato
placeholder-class-number = es. 1, 2, 3…
field-priority = Priorità
field-instructions = Istruzioni
placeholder-instructions = Aggiungi istruzioni per questo compito…
assignment-delete = Elimina compito
item-pane-select-collection = Seleziona una raccolta per vedere le assegnazioni del programma

# Settings
settings-title = Impostazioni del programma
settings-back = Torna alla vista programma
settings-nomenclature = Nomenclatura
settings-nomenclature-desc = Scegli il termine usato per le singole sessioni (ad es. «settimana», «lezione», «sessione», «sezione»).
settings-singular = Forma singolare
settings-nomenclature-placeholder = es. settimana, lezione, sessione, sezione
settings-plural-label = Forma plurale:
settings-subcollections = Sottoraccolte delle lezioni
settings-subcollections-desc = Disattivato per impostazione predefinita. Se attivato, ogni lezione con letture assegnate ottiene una cartella sotto questa raccolta. Le lezioni senza assegnazioni non hanno una cartella; quelle cartelle vengono rimosse. Le cartelle vengono create, rinominate e rimosse per corrispondere al programma — comprese le raccolte figlie esistenti, che possono essere eliminate. Disattivare lascia le cartelle al loro posto.
settings-subcollections-checkbox = Creare sottoraccolte?
settings-bib-style = Stile bibliografico
settings-bib-style-desc = Scegli uno stile CSL (Citation Style Language) per i riferimenti bibliografici. Se non è impostato, verrà usato lo stile predefinito dell’utente.
settings-citation-style = Stile di citazione
settings-user-default = Predefinito utente
settings-user-default-named = Predefinito utente: { $name }
settings-priorities = Priorità
settings-priorities-desc = Personalizza nomi, colori e ordine delle priorità.
settings-add-priority = Aggiungi una nuova priorità
settings-add-priority-button = Aggiungi priorità
settings-new-priority-name = Nuova priorità
settings-priority-move-up = Sposta in alto
settings-priority-move-down = Sposta in basso
settings-priority-color = Colore della priorità
settings-priority-name-placeholder = Nome della priorità
settings-priority-delete = Elimina priorità
settings-priority-name-label = Nome
settings-priority-preview = Anteprima:
priority-default-course-info = Informazioni sul corso
priority-default-essential = Essenziale
priority-default-recommended = Consigliato
priority-default-optional = Facoltativo

# Gallery
gallery-empty-filtered = Nessun elemento corrispondente.
gallery-empty = Nessun elemento in questa raccolta.
gallery-untagged = Senza etichette
gallery-untagged-desc = Gli elementi in questa sezione non hanno etichette.
gallery-uncredited = Senza creatore
gallery-uncredited-desc = Gli elementi in questa sezione non hanno creatore.
gallery-empty-subcollections = Nessuna sottoraccolta o elemento in questa raccolta.
gallery-unnumbered = Senza numero
gallery-unnumbered-desc = Assegnato senza numero di lezione.
gallery-sort-auto = Auto
gallery-sort-auto-title = Ordine automatico (raccolta o programma)
gallery-sort-az = A–Z
gallery-sort-az-title = Ordina A–Z
gallery-sort-date = Data
gallery-sort-date-title = Ordina per data (più recenti prima)
gallery-sort-date-added = Aggiunto
gallery-sort-date-added-title = Ordina per data di aggiunta (più recenti prima)
gallery-group-none = Nessuno
gallery-group-none-title = Nessun raggruppamento
gallery-group-auto = Automatico
gallery-group-auto-title = Raggruppamento automatico
gallery-group-type = Tipo
gallery-group-type-title = Raggruppa per tipo di elemento
gallery-group-creator = Creatore
gallery-group-creator-title = Raggruppa per creatore
gallery-group-tags = Etichette
gallery-group-tags-title = Raggruppa per etichette
gallery-group-subcollections = Sottoraccolte
gallery-group-subcollections-title = Raggruppa per sottoraccolte
gallery-group-classes = Lezioni
gallery-group-classes-title = Raggruppa per lezioni
gallery-layout-cover = Copertina
gallery-layout-cover-title = Immagine di copertina
gallery-layout-card = Scheda
gallery-layout-card-title = Schede del programma
gallery-layout-magazine = Magazine
gallery-layout-magazine-title = Layout magazine a dimensioni miste
magazine-shelf-watch = Guarda
magazine-shelf-watch-title = Video aggiunti di recente
magazine-shelf-listen = Ascolta
magazine-shelf-listen-title = Audio aggiunto di recente
magazine-highlights = Evidenziazioni
gallery-options-aria = Opzioni della vista Galleria
gallery-options-title = Opzioni di visualizzazione
gallery-menu-view = Vista
gallery-menu-sort = Ordina
gallery-menu-group = Raggruppa per
gallery-menu-type-size = Dimensione del testo
gallery-type-small = Piccolo
gallery-type-small-title = Testo magazine più piccolo
gallery-type-large = Grande
gallery-type-large-title = Testo magazine più grande
gallery-in-this-collection = In questa raccolta
gallery-groups-nav-aria = Gruppi
gallery-group-jump = Mostra { $name }
gallery-prefs-summary = { $layout } / { $sort } / { $group }
gallery-page-of = Pagina { $page } di { $total }
gallery-save-globally = Salva come predefinito
gallery-save-globally-title = Salva questa opzione come predefinita per tutte le raccolte
gallery-save-globally-active-title = L’impostazione di questa raccolta differisce dal predefinito. Fai clic per salvarla come predefinita.
galleryTour-settings-title = Opzioni galleria
galleryTour-settings-desc =
    Apri il menu nell’angolo per cambiare vista, ordinamento e raggruppamento. Vedremo i tre layout.
galleryTour-cover-title = Vista Copertina
galleryTour-cover-desc =
    Copertina mostra ogni elemento come illustrazione — libri, articoli e pagine web a colpo d’occhio.
galleryTour-magazine-title = Vista Magazine
galleryTour-magazine-desc =
    Magazine mescola riquadri grandi e piccoli, come un sommario. Ideale per sfogliare e leggere le anteprime.
galleryTour-card-title = Vista Schede
galleryTour-card-desc =
    Le schede usano lo stesso layout del syllabus, raggruppate per tipo di elemento così le letture simili stanno insieme.
galleryTour-choose-title = Scegli il predefinito
galleryTour-choose-desc =
    Con quale layout deve aprirsi la Galleria? Potrai cambiarlo più tardi nelle preferenze di Zotero Syllabus o con Salva come predefinito.
galleryTour-skip = Salta

# Reading schedule
schedule-edit-settings = Modifica impostazioni del calendario delle letture
schedule-empty-title = Nessuna lettura programmata
schedule-empty-desc = Aggiungi date di lettura alle lezioni per vederle qui.
schedule-this-week = Questa settimana
schedule-next-week = Settimana prossima
schedule-settings-title = Impostazioni del calendario delle letture
schedule-settings-back = Torna al calendario delle letture
schedule-settings-library = Raccolta della libreria
schedule-settings-desc =
    Disattivato per impostazione predefinita. Se attivato, in Libreria personale viene mantenuta una raccolta di primo livello «Calendario delle letture» con una cartella per ogni data di lettura recente e imminente. Le cartelle vengono create, rinominate e riempite automaticamente. Disattivare elimina quella raccolta; gli elementi dei programmi restano al loro posto.
schedule-settings-checkbox = Generare la raccolta «Calendario delle letture»?
schedule-day-managed-banner = Gestito automaticamente a partire dai programmi. Le modifiche qui vengono sovrascritte.
schedule-day-empty = Nessuna lettura programmata per questo giorno.
schedule-window-empty = Ancora nessuna lettura nella finestra del calendario. Aggiungi date di lettura alle lezioni per vederle qui.
schedule-no-dates = Nessuna data
schedule-of-collection = di { $name }
schedule-of-collection-in-library = di { $collection } ({ $library })
schedule-open-syllabus = Apri il programma di { $title }
class-folder-managed-banner = Gestito automaticamente a partire da questo programma. Le modifiche in questa cartella vengono sovrascritte.

# Columns
column-reading-instructions = Istruzioni di lettura
column-status = Stato
column-reading-time = Tempo di lettura
column-syllabus-info = Info del programma
column-class-hash = #{ $number }

# Progress / dialogs
dialog-save-export = Salva esportazione del programma
progress-import-success-title = Importazione riuscita
progress-import-success-text = Metadati del programma importati e uniti con successo
progress-import-error-title = Errore di importazione
progress-import-bad-file = Rilascia un file .syllabus
progress-print-preparing = Preparazione del programma per la stampa…
progress-print-failed = Impossibile salvare il PDF del programma
dialog-save-pdf = Salva PDF del programma
file-filter-pdf = PDF
progress-saving-pdf = Salvataggio del PDF…
dialog-save-file = Salva file
progress-translator-install-error = Errore durante l’installazione degli scraper delle liste di lettura
progress-migrate-start =
    { $count ->
        [one] Migrazione di { $count } programma alle note della raccolta…
       *[other] Migrazione di { $count } programmi alle note della raccolta…
    }
progress-migrate-item = Migrazione di { $current } di { $total }…
progress-migrate-done =
    { $count ->
        [one] Migrato { $count } programma
       *[other] Migrati { $count } programmi
    }
progress-migrate-empty-cleared =
    { $count ->
        [one] { $count } preferenza vuota cancellata
       *[other] { $count } preferenze vuote cancellate
    }
progress-migrate-not-found =
    { $count ->
        [one] { $count } raccolta non trovata
       *[other] { $count } raccolte non trovate
    }
progress-migrate-failed = { $count } non riuscito/i
progress-migrate-remaining = { $count } rimanente/i nelle preferenze
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
explorer-configure = Configure
explorer-configure-display = Display on Home
explorer-configure-reorder = Reorder
explorer-library-count =
    { $count ->
        [one] { $count } item
       *[other] { $count } items
    }
explorer-nav-aria = Sections
explorer-customize = Customize
explorer-customize-done = Done
explorer-add-shelf = Add shelf
explorer-add-collection = Collection…
explorer-add-saved-search = Saved search…
explorer-shelf-upcoming-deadlines = Upcoming reading deadlines
explorer-shelf-upcoming-deadlines-desc = Due this week, or the next deadline within a month.
explorer-go-to-reading-schedule = Go to Reading Schedule
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
explorer-empty = Nothing to show yet
explorer-shelf-empty = No items
explorer-move-up = Move shelf up
explorer-move-down = Move shelf down
explorer-remove-shelf = Remove shelf

# Collection tree
tree-tooltip-reading-schedule = Calendario delle letture (gestito automaticamente)
tree-tooltip-auto-managed = Gestito automaticamente da Zotero Syllabus
tree-tooltip-syllabus = Programma

# User guide sample items (created at tour time; not used as match keys)
tour-sample-reading-1 = Lettura di esempio: Iniziare con le liste del corso
tour-sample-reading-2 = Lettura di esempio: Annotare durante la lettura
tour-sample-reading-3 = Lettura di esempio: Pianificare la settimana

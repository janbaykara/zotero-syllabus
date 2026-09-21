startup-begin = O extra está a carregar
startup-finish = O extra está pronto
enable-syllabus-title = Transformar num programa de curso?
enable-syllabus-message = Transformar «{ $name }» num programa de curso? Será guardada uma nota de programa nesta coleção.
enable-subcollections-title = Gerir subcoleções de aulas?
enable-subcollections-message =
    Ativar esta opção permite que o extra gira as coleções descendentes em «{ $name }». Isso pode eliminar ou reescrever pastas que já existam.

    O que acontece:

    • É criada ou adotada uma pasta por aula com leituras atribuídas, cuja designação passa a coincidir com o programa (por exemplo, «Aula 1: Título»).

    • As aulas sem leituras atribuídas não recebem pasta. As pastas existentes dessas aulas são removidas.

    • As coleções descendentes que não sejam essas pastas de aula — e que não tenham uma nota de programa própria — serão eliminadas. Os itens não são eliminados da biblioteca; permanecem na coleção ascendente.

    • Os itens de cada pasta de aula são sobrescritos a partir da nota do programa. Os itens a mais na pasta são removidos apenas da pasta.

    • Remover uma aula do programa elimina a pasta correspondente.

    • Se eliminar uma pasta de aula que ainda tenha leituras atribuídas, o extra recria-a.

    Desativar mais tarde deixa de gerir as pastas; as pastas existentes mantêm-se.

    Continuar?
enable-reading-schedule-collection-title = Gerar a coleção Calendário de leituras?
enable-reading-schedule-collection-message =
    Ativar esta opção cria uma coleção de primeiro nível «Calendário de leituras» em A Minha Biblioteca, com uma pasta para cada data de leitura (a partir de 10 dias atrás).

    O que acontece:

    • As pastas de datas são criadas, renomeadas e preenchidas automaticamente a partir dos seus programas de curso.

    • Os itens nessas pastas são sobrescritos a partir do calendário. Os itens a mais são removidos apenas da pasta — não da biblioteca.

    • Se eliminar a coleção ou uma pasta de data, o extra recria-a enquanto esta definição estiver ativa.

    • Os programas de bibliotecas de grupo não são incluídos (os itens não podem atravessar bibliotecas).

    Desativar mais tarde elimina a coleção «Calendário de leituras» e as respetivas pastas de datas. Os itens dos programas de curso mantêm-se.

    Continuar?
disable-reading-schedule-collection-title = Remover a coleção Calendário de leituras?
disable-reading-schedule-collection-message =
    Desativar esta opção elimina a coleção gerida «Calendário de leituras» e as respetivas pastas de datas.

    Os itens não são eliminados da biblioteca; permanecem nas coleções originais dos programas de curso.

    Continuar?
prefs-title = Zotero Syllabus
prefs-table-title = Título
prefs-table-detail = Detalhe
tabpanel-lib-tab-label = Separador da biblioteca
tabpanel-reader-tab-label = Separador do leitor
menu-toggle-bibliography = Mostrar/ocultar bibliografia
managed-folder-banner-title = Pasta de gestão automática
managed-folder-banner-class =
    Não adicione nem remova itens aqui. Esta pasta de aula é mantida em sincronia com o programa de curso; as edições manuais são sobrescritas.
managed-folder-banner-schedule =
    Não adicione nem remova itens aqui. Esta pasta do calendário de leituras é mantida em sincronia com os seus programas de curso; as edições manuais são sobrescritas.
menuHelp-openUserGuide = Abrir o guia do utilizador do Zotero Syllabus
userGuide-start-title = Bem-vindo ao Zotero Syllabus
userGuide-start-desc =
    Transforme qualquer coleção do Zotero numa lista de leituras da unidade curricular — organize por aula, defina prioridades e acompanhe o que ler a seguir.
userGuide-start-close = Lembrar mais tarde
userGuide-exit = Sair do percurso
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
userGuide-collection-title = Começar a partir de uma coleção
userGuide-collection-desc =
    Os programas de curso residem nas coleções. Abriremos uma coleção de ensaio «Visita guiada ao programa» com algumas leituras de exemplo.
userGuide-syllabusButton-title = Transformar num programa
userGuide-syllabusButton-desc =
    Clique em Transformar em programa na barra de ferramentas dos itens para transformar esta coleção num plano da unidade curricular. A visita guiada fará essa mudança por si.
userGuide-addClass-title = Adicionar uma aula
userGuide-addClass-desc =
    As aulas (ou semanas / sessões — pode alterar a designação mais tarde) são as secções do programa. Adicione uma para começar.
userGuide-assign-title = Atribuir leituras
userGuide-assign-desc =
    Arraste itens para uma aula ou clique com o botão direito → Atribuir a uma aula. Os itens não atribuídos permanecem em Leituras complementares.
userGuide-itemPane-title = Editar no painel do item
userGuide-itemPane-desc =
    Selecione uma leitura para definir o número da aula, a prioridade, as instruções e o estado de conclusão na secção Trabalhos de leitura.
userGuide-readingDate-title = Definir a data-limite da aula
userGuide-readingDate-desc =
    Cada aula pode ter uma data de leitura. Definiremos uma na Aula 1 quando clicar em Seguinte — depois poderá abrir o Calendário de leituras.
userGuide-readingSchedule-title = Abrir o Calendário de leituras
userGuide-readingSchedule-desc =
    O Calendário de leituras reúne as aulas com datas-limite de todos os seus programas. Seguinte abre-o para ver o que se aproxima.
userGuide-readingSchedule-light-title = Open Reading Schedule
userGuide-readingSchedule-light-desc =
    The Reading Schedule tab gathers class due dates across your syllabi. Next opens it from the tab bar.
userGuide-home-title = Home view
userGuide-home-desc =
    At the library root, switch to Home for shelves of recent items and upcoming deadlines. Next selects your library home.
userGuide-subcollections-title = Opcional: pastas de aula
userGuide-subcollections-desc =
    Pretende pastas espelho por aula? Ative as Subcoleções de aulas nas Definições. Deixe desativado, salvo se quiser que o extra gira as pastas descendentes.
userGuide-finish-title = Está pronto
userGuide-finish-desc =
    Reabra esta visita guiada a qualquer momento em Ajuda → Abrir o guia do utilizador do Zotero Syllabus. Bons estudos!
userGuide-finish-prefs-title = You’re set
userGuide-finish-prefs-desc =
    Turn views on or off anytime in Preferences → Zotero Syllabus → Views. You can reopen this tour from Help.
userGuide-empty-title = Organizar esta coleção por aula
userGuide-empty-desc =
    Adicione aulas para cada semana ou sessão e atribua as leituras. Também pode fazer uma visita guiada breve.
userGuide-empty-tour = Fazer a visita guiada

# Shared
app-name = Zotero Syllabus
this-collection = esta coleção
untitled = Sem título
nav-back = Voltar
nav-previous = Anterior
nav-next = Seguinte

# View tabs / toolbar
view-tab-checklist = Lista de verificação
view-tab-checklist-tooltip = Ver como lista de verificação
view-tab-syllabus = Programa
view-tab-syllabus-tooltip = Ver como programa de curso
view-tab-create-syllabus = Transformar em programa
view-tab-create-syllabus-tooltip = Transformar esta coleção num programa de curso
view-tab-table = Tabela
view-tab-table-tooltip = Ver como tabela
view-tab-gallery = Galeria
view-tab-gallery-tooltip = Ver como galeria
view-tab-explorer = Home
view-tab-explorer-tooltip = View as Home
view-tab-reading-schedule = Calendário de leituras
reading-schedule-desc = Class due dates across your syllabi, so you can see what’s next.
view-tab-my-annotations = Annotation Feed
toolbar-my-annotations-open = Open Annotation Feed
toolbar-reading-schedule-review = Rever o Calendário de leituras
toolbar-reading-schedule-open = Abrir o Calendário de leituras

# Context menus
menu-set-priority = Definir prioridade
menu-none = (Nenhuma)
menu-assign-to-class = Atribuir a uma aula
menu-no-collection = (Nenhuma coleção selecionada)
menu-class-label = { $nomenclature } { $number }
menu-add-to-new-class = Adicionar a { $nomenclature } { $number } novo/a
menu-set-reading-status = Definir estado de leitura
status-done = Concluído
status-not-done = Não concluído

# Syllabus page
page-toc-title = Índice
placeholder-add-title = Adicionar um título…
page-density-cycle = Mudar para { $next }
page-density-row = Linha
page-density-standard = Padrão
page-density-expanded = Expandido
page-reader-enable = Ativar caixas de seleção
page-reader-disable = Desativar caixas de seleção
page-export = Exportar ficheiro do programa
page-import = Importar ficheiro do programa
page-edit-settings = Editar definições do programa
page-lock = Bloquear o programa
page-unlock = Desbloquear o programa
page-view-options-aria = Syllabus view options
page-view-checkboxes = Checkboxes
page-print = Guardar o programa como PDF, Word, Markdown ou HTML
page-save-pdf = PDF
page-save-word = Word
page-save-markdown = Markdown
page-save-html = HTML
page-publish = Publish online…
placeholder-course-code = Código da unidade curricular
placeholder-institution = Instituição
placeholder-add-description = Adicionar uma descrição…
page-add-class = Adicionar { $nomenclature } { $number }
page-add-to-class = Adicionar a { $nomenclature } { $number }
page-drop-create-class = Largue o item aqui para criar { $nomenclature } { $number }
page-drop-import-file = Largue ficheiros para os adicionar a esta coleção
further-reading-heading = Leituras complementares
sort-label = Ordenar
further-reading-sort-aria = Ordenar as leituras complementares
sort-by-title = Título
sort-by-creator = Criador
sort-by-date = Data
further-reading-empty-desc = Os itens nesta secção não foram atribuídos a nenhuma aula.
toc-empty = Não há aulas disponíveis
placeholder-url = https://
links-delete = Eliminar ligação
links-edit = Editar ligação
links-add = Adicionar ligação
bibliography-heading = Bibliografia

# Class groups / cards
mark-done = Marcar como concluído
mark-not-done = Marcar como não concluído
class-due-date-label = Data-limite:
class-reset-sort = Repor a ordem de classificação
class-move-up = Mover { $nomenclature } para cima
class-move-down = Mover { $nomenclature } para baixo
class-delete = Eliminar { $nomenclature }
class-insert-here = Adicionar { $nomenclature } aqui
class-dropzone-hint = Arraste itens para { $nomenclature } { $number }
due-date-clear = Limpar a data-limite
due-date-add = Adicionar uma data-limite
placeholder-select-date = Selecionar data
item-in-publication = em { $name }
attachment-url = URL
attachment-pdf = PDF
attachment-snapshot = Instantâneo
attachment-epub = EPUB
attachment-html = HTML
attachment-doc = DOC
attachment-txt = TXT
attachment-zip = ZIP
attachment-file = Ficheiro
attachment-view = Ver
attachment-open = Abrir { $label }
assignment-duplicate = Criar atribuição duplicada
assignment-duplicate-label = Duplicar
assignment-unassign-class = Remover da aula
assignment-unassign-syllabus = Remover do programa
assignment-unassign-label = Anular atribuição
priority-set-to = Definir prioridade como { $name }
priority-clear = Limpar prioridade
youtube-play = Reproduzir { $title } no YouTube

# Item pane
item-pane-not-found = Item não encontrado
item-pane-none-selected = Nenhum item selecionado
item-pane-n-selected = { $count } itens selecionados
item-pane-current-view = vista atual
item-pane-also-assigned = também atribuído a
item-pane-assignment-n = Trabalho n.º { $number }
item-pane-assignment-for = para { $title }
item-pane-due = Até { $date }
item-pane-reference-material = Material de referência
item-pane-class-named = { $nomenclature } { $number }: { $title }
item-pane-mark-done = Marcar como concluído
placeholder-class-number = p. ex., 1, 2, 3…
field-priority = Prioridade
field-instructions = Instruções
placeholder-instructions = Adicionar instruções para este trabalho…
assignment-delete = Eliminar trabalho
item-pane-select-collection = Selecione uma coleção para ver os trabalhos do programa

# Settings
settings-title = Definições do programa de curso
settings-view = View
settings-view-desc = Density and checkboxes for this syllabus.
settings-density = Density
settings-file = Syllabus file
settings-file-desc = Export or import a .syllabus metadata file for this collection.
settings-back = Voltar à vista de programa
settings-nomenclature = Nomenclatura
settings-nomenclature-desc = Escolha o termo usado para as sessões individuais (p. ex., «semana», «aula», «sessão», «secção»).
settings-singular = Forma singular
settings-nomenclature-placeholder = p. ex., semana, aula, sessão, secção
settings-plural-label = Forma plural:
settings-subcollections = Subcoleções de aulas
settings-subcollections-desc = Desativado por omissão. Quando ativado, cada aula com leituras atribuídas recebe uma pasta nesta coleção. As aulas sem atribuições não recebem pasta, e essas pastas são removidas. As pastas são criadas, renomeadas e removidas de acordo com o programa — incluindo coleções descendentes existentes, que podem ser eliminadas. Desativar deixa as pastas no sítio.
settings-subcollections-checkbox = Criar subcoleções?
settings-bib-style = Estilo bibliográfico
settings-bib-style-desc = Escolha um estilo CSL (Citation Style Language) para as referências bibliográficas. Se não for definido, será usado o estilo predefinido do utilizador.
settings-citation-style = Estilo de citação
settings-user-default = Predefinição do utilizador
settings-user-default-named = Predefinição do utilizador: { $name }
settings-priorities = Prioridades
settings-priorities-desc = Personalize os nomes, as cores e a ordem das prioridades.
settings-add-priority = Adicionar nova prioridade
settings-add-priority-button = Adicionar prioridade
settings-new-priority-name = Nova prioridade
settings-priority-move-up = Mover para cima
settings-priority-move-down = Mover para baixo
settings-priority-color = Cor da prioridade
settings-priority-name-placeholder = Nome da prioridade
settings-priority-delete = Eliminar prioridade
settings-priority-name-label = Nome
settings-priority-preview = Pré-visualização:
priority-default-course-info = Informação da unidade curricular
priority-default-essential = Essencial
priority-default-recommended = Recomendado
priority-default-optional = Opcional

# Gallery
gallery-empty-filtered = Nenhum item correspondente.
gallery-empty = Não há itens nesta coleção.
gallery-untagged = Sem etiquetas
gallery-untagged-desc = Os itens nesta secção não têm etiquetas.
gallery-uncredited = Sem criador
gallery-uncredited-desc = Os itens nesta secção não têm criador.
gallery-empty-subcollections = Não há subcoleções nem itens nesta coleção.
gallery-unnumbered = Sem número
gallery-unnumbered-desc = Atribuído sem número de aula.
gallery-sort-auto = Automático
gallery-sort-auto-title = Ordem automática (coleção ou programa)
gallery-sort-az = A–Z
gallery-sort-az-title = Ordenar A–Z
gallery-sort-date = Data
gallery-sort-date-title = Ordenar por data (mais recente primeiro)
gallery-sort-date-added = Adicionado
gallery-sort-date-added-title = Ordenar por data de adição (mais recente primeiro)
gallery-sort-last-read = Last Read
gallery-sort-last-read-title = Sort by last read (most recent first)
gallery-group-none = Nenhum
gallery-group-none-title = Sem agrupamento
gallery-group-auto = Automático
gallery-group-auto-title = Agrupamento automático
gallery-group-type = Tipo
gallery-group-type-title = Agrupar por tipo de item
gallery-group-creator = Criador
gallery-group-creator-title = Agrupar por criador
gallery-group-tags = Etiquetas
gallery-group-tags-title = Agrupar por etiquetas
gallery-group-subcollections = Subcoleções
gallery-group-subcollections-title = Agrupar por subcoleções
gallery-group-classes = Aulas
gallery-group-classes-title = Agrupar por aulas
gallery-layout-cover = Capa
gallery-layout-cover-title = Imagem de capa
gallery-layout-card = Cartão
gallery-layout-card-title = Cartões do programa
gallery-layout-magazine = Revista
gallery-layout-magazine-title = Esquema de revista com tamanhos variados

# Gallery notes (collection-scoped child notes)
gallery-note-add = Add Gallery Note
gallery-note-edit = Edit Gallery Note
gallery-note-remove = Remove Gallery Note
gallery-note-label = Gallery note
magazine-shelf-watch = Ver
magazine-shelf-watch-title = Vídeos adicionados recentemente
magazine-shelf-listen = Ouvir
magazine-shelf-listen-title = Áudio adicionado recentemente
magazine-highlights = Destaques
gallery-options-aria = Opções da vista de galeria
gallery-options-title = Opções de vista
gallery-menu-view = Vista
gallery-menu-sort = Ordenar
gallery-menu-group = Agrupar por
gallery-menu-type-size = Tamanho do texto
gallery-type-small = Pequeno
gallery-type-small-title = Texto de revista mais pequeno
gallery-type-large = Grande
gallery-type-large-title = Texto de revista maior
gallery-in-this-collection = Nesta coleção
gallery-groups-nav-aria = Grupos
gallery-group-jump = Mostrar { $name }
gallery-prefs-summary = { $layout } / { $sort } / { $group }
gallery-page-of = Página { $page } de { $total }
gallery-save-globally = Guardar como predefinição
gallery-save-globally-title = Guardar esta opção como predefinição para todas as coleções
gallery-save-globally-active-title = A definição desta coleção difere da predefinição. Clique para a guardar como predefinição.
galleryTour-settings-title = Opções da galeria
galleryTour-settings-desc =
    Abra o menu no canto para mudar a vista, a ordenação e o agrupamento. Vamos percorrer os três esquemas.
galleryTour-cover-title = Vista Capa
galleryTour-cover-desc =
    Capa mostra cada item como ilustração — livros, artigos e páginas web de relance.
galleryTour-magazine-title = Vista Revista
galleryTour-magazine-desc =
    Revista mistura mosaicos grandes e pequenos, como um sumário. Boa para folhear e ler destaques.
galleryTour-card-title = Vista Cartões
galleryTour-card-desc =
    Os cartões usam o mesmo esquema do programa, agrupados por tipo de item para juntar leituras semelhantes.
galleryTour-choose-title = Escolher a predefinição
galleryTour-choose-desc =
    Com que esquema deve a Galeria abrir? Pode alterar isto mais tarde nas preferências do Zotero Syllabus ou com Guardar como predefinição.
galleryTour-skip = Saltar

# Reading schedule
schedule-edit-settings = Editar definições do calendário de leituras
schedule-empty-title = Nenhuma leitura agendada
schedule-empty-desc = Adicione datas de leitura às aulas para as ver aqui.
schedule-this-week = Esta semana
schedule-next-week = Semana seguinte
schedule-settings-title = Definições do Calendário de leituras
schedule-settings-library = Coleção da biblioteca
schedule-settings-desc =
    Desativado por omissão. Quando ativado, é mantida em A Minha Biblioteca uma coleção de primeiro nível «Calendário de leituras» com uma pasta para cada data de leitura recente e futura. As pastas são criadas, renomeadas e preenchidas automaticamente. Desativar elimina essa coleção; os itens dos programas de curso mantêm-se.
schedule-settings-checkbox = Gerar a coleção «Calendário de leituras»?
schedule-day-managed-banner = Gestão automática a partir dos seus programas de curso. As edições aqui são sobrescritas.
schedule-day-empty = Nenhuma leitura agendada para este dia.
schedule-window-empty = Ainda não há leituras na janela do calendário. Adicione datas de leitura às aulas para as ver aqui.
schedule-no-dates = Sem datas
schedule-of-collection = de { $name }
schedule-of-collection-in-library = de { $collection } ({ $library })
schedule-open-syllabus = Abrir o programa de { $title }
class-folder-managed-banner = Gestão automática a partir deste programa. As edições nesta pasta são sobrescritas.

# Pinned (Reading Schedule)
pinned-section-heading = Pinned
pinned-item-label = Pinned item
pinned-next-up-from = Next up from { $name }
pinned-menu-pin-item = Add to Pinned
pinned-menu-unpin-item = Remove from Pinned
pinned-menu-pin-syllabus = Pin syllabus
pinned-menu-unpin-syllabus = Unpin syllabus
pinned-unpin-item = Unpin
pinned-unpin-syllabus = Unpin syllabus
pinned-edit-intention = Edit intention
pinned-unpin-note-title = Remove from Pinned?
pinned-unpin-note-message =
    This item has an intention note. Keep the note, delete it, or cancel.
pinned-unpin-keep = Keep note
pinned-unpin-delete = Delete note
pinned-unpin-cancel = Cancel
pinned-done-unpin-title = Unpin this item?
pinned-done-unpin-message = Remove this item from Pinned?
pinned-done-unpin-syllabus-title = Unpin this syllabus?
pinned-done-unpin-syllabus-message = Remove this syllabus from Pinned?

# Columns
column-reading-instructions = Instruções de leitura
column-status = Estado
column-reading-time = Tempo de leitura
column-syllabus-info = Informação do programa
column-class-hash = n.º { $number }

# Progress / dialogs
dialog-save-export = Guardar exportação do programa
progress-import-success-title = Importação concluída
progress-import-success-text = Metadados do programa importados e fundidos com êxito
progress-import-error-title = Erro de importação
progress-import-bad-file = Largue um ficheiro .syllabus
progress-print-preparing = A preparar o programa…
progress-print-failed = Não foi possível guardar o programa
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
dialog-save-pdf = Guardar PDF do programa
file-filter-pdf = PDF
dialog-save-word = Guardar programa como Word
file-filter-word = Word
dialog-save-markdown = Guardar programa como Markdown
file-filter-markdown = Markdown
dialog-save-html = Guardar programa como HTML
file-filter-html = HTML
progress-saving-pdf = A guardar PDF…
dialog-save-file = Guardar ficheiro
progress-translator-install-error = Erro ao instalar os extratores de listas de leitura
progress-migrate-start =
    { $count ->
        [one] A migrar { $count } programa de curso para notas de coleção…
       *[other] A migrar { $count } programas de curso para notas de coleção…
    }
progress-migrate-item = A migrar { $current } de { $total }…
progress-migrate-done =
    { $count ->
        [one] Migrado { $count } programa de curso
       *[other] Migrados { $count } programas de curso
    }
progress-migrate-empty-cleared =
    { $count ->
        [one] { $count } preferência vazia eliminada
       *[other] { $count } preferências vazias eliminadas
    }
progress-migrate-not-found =
    { $count ->
        [one] { $count } coleção não encontrada
       *[other] { $count } coleções não encontradas
    }
progress-migrate-failed = { $count } falharam
progress-migrate-remaining = { $count } restantes nas preferências
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
explorer-menu-add-to-home = Add to Home
explorer-menu-remove-from-home = Remove from Home
explorer-add-shelf = Add shelf
explorer-add-collection = Collection…
explorer-add-saved-search = Saved search…
explorer-shelf-upcoming-deadlines = Upcoming reading deadlines
explorer-shelf-upcoming-deadlines-desc = Due this week, or the next deadline within a month.
explorer-shelf-pinned = Pinned
explorer-shelf-pinned-desc = Items you’ve pinned, and the next unread assignment from each pinned syllabus.
explorer-go-to-reading-schedule = Go to Reading Schedule
explorer-go-to-my-annotations = See all
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
explorer-annotations-size = Size
explorer-annotations-size-small-title = Compact, truncated quotes
explorer-annotations-size-large-title = Full-length quotes
explorer-empty = Nothing to show yet
explorer-shelf-empty = No items
explorer-move-up = Move shelf up
explorer-move-down = Move shelf down
explorer-remove-shelf = Remove shelf

# Collection tree
tree-tooltip-reading-schedule = Calendário de leituras (gestão automática)
tree-tooltip-auto-managed = Gestão automática pelo Zotero Syllabus
tree-tooltip-syllabus = Programa de curso

# User guide sample items (created at tour time; not used as match keys)
tour-sample-reading-1 = Leitura de exemplo: Primeiros passos com listas da unidade curricular
tour-sample-reading-2 = Leitura de exemplo: Anotar à medida que se lê
tour-sample-reading-3 = Leitura de exemplo: Planear a semana seguinte

startup-begin = O complemento está carregando
startup-finish = O complemento está pronto
enable-syllabus-title = Transformar em um programa do curso?
enable-syllabus-message = Transformar “{ $name }” em um programa do curso? Uma nota de programa será armazenada nesta coleção.
enable-subcollections-title = Gerenciar subcoleções de aula?
enable-subcollections-message =
    Ativar esta opção permite que o complemento gerencie coleções filhas em “{ $name }”. Isso pode excluir ou reescrever pastas que você já tem.

    O que acontece:

    • Uma pasta é criada ou adotada por aula com leituras atribuídas e renomeada para corresponder ao programa (por exemplo, “Aula 1: Título”).

    • Aulas sem leituras atribuídas não recebem pasta. Pastas existentes dessas aulas são removidas.

    • Coleções filhas que não forem essas pastas de aula — e que não tiverem a própria nota de programa — serão excluídas. Os itens não são excluídos da biblioteca; permanecem na coleção pai.

    • Os itens de cada pasta de aula são sobrescritos a partir da nota do programa. Itens extras na pasta são removidos somente da pasta.

    • Remover uma aula do programa exclui essa pasta de aula.

    • Se você excluir uma pasta de aula que ainda tiver leituras atribuídas, o complemento a recria.

    Desativar depois interrompe o gerenciamento das pastas; as pastas existentes permanecem.

    Continuar?
enable-reading-schedule-collection-title = Gerar coleção Cronograma de leitura?
enable-reading-schedule-collection-message =
    Ativar esta opção cria uma coleção de nível superior “Cronograma de leitura” em Minha Biblioteca, com uma pasta para cada data de leitura (a partir de 10 dias atrás).

    O que acontece:

    • Pastas de data são criadas, renomeadas e preenchidas automaticamente a partir dos seus programas.

    • Os itens nessas pastas são sobrescritos a partir do cronograma. Itens extras são removidos somente da pasta — não da biblioteca.

    • Se você excluir a coleção ou uma pasta de data, o complemento a recria enquanto esta opção estiver ativa.

    • Programas de bibliotecas de grupo não são incluídos (itens não podem cruzar bibliotecas).

    Desativar depois exclui a coleção “Cronograma de leitura” e suas pastas de data. Os itens dos programas permanecem no lugar.

    Continuar?
disable-reading-schedule-collection-title = Remover coleção Cronograma de leitura?
disable-reading-schedule-collection-message =
    Desativar esta opção exclui a coleção gerenciada “Cronograma de leitura” e suas pastas de data.

    Os itens não são excluídos da sua biblioteca; permanecem nas coleções originais do programa.

    Continuar?
prefs-title = Zotero Syllabus
prefs-table-title = Título
prefs-table-detail = Detalhe
tabpanel-lib-tab-label = Aba da biblioteca
tabpanel-reader-tab-label = Aba do leitor
menu-toggle-bibliography = Alternar bibliografia
managed-folder-banner-title = Pasta gerenciada automaticamente
managed-folder-banner-class =
    Não adicione nem remova itens aqui. Esta pasta de aula é mantida em sincronia com o programa; edições manuais são sobrescritas.
managed-folder-banner-schedule =
    Não adicione nem remova itens aqui. Esta pasta do cronograma de leitura é mantida em sincronia com os seus programas; edições manuais são sobrescritas.
menuHelp-openUserGuide = Abrir o guia do usuário do Zotero Syllabus
userGuide-start-title = Bem-vindo ao Zotero Syllabus
userGuide-start-desc =
    Transforme qualquer coleção do Zotero em uma lista de leituras da disciplina — organize por aula, defina prioridades e acompanhe o que ler em seguida.
userGuide-start-close = Lembrar depois
userGuide-collection-title = Começar por uma coleção
userGuide-collection-desc =
    Os programas ficam nas coleções. Abriremos uma coleção de prática “Syllabus Tour” com algumas leituras de exemplo.
userGuide-syllabusButton-title = Transformar em um programa
userGuide-syllabusButton-desc =
    Clique em Transformar em programa na barra de ferramentas dos itens para transformar esta coleção no esboço da disciplina. O tour mudará para lá automaticamente.
userGuide-addClass-title = Adicionar uma aula
userGuide-addClass-desc =
    Aulas (ou semanas / sessões — você pode renomeá-las depois) são as seções do seu programa. Adicione uma para começar.
userGuide-assign-title = Atribuir leituras
userGuide-assign-desc =
    Arraste itens para uma aula, ou clique com o botão direito → Atribuir a uma aula. Itens não atribuídos ficam em Leituras complementares.
userGuide-itemPane-title = Editar no painel do item
userGuide-itemPane-desc =
    Selecione uma leitura para definir número da aula, prioridade, instruções e status de conclusão na seção Tarefas de leitura.
userGuide-readingDate-title = Definir data de entrega da aula
userGuide-readingDate-desc =
    Cada aula pode ter uma data de leitura. Definiremos uma na Aula 1 quando você clicar em Avançar — depois você pode abrir o Cronograma de leitura.
userGuide-readingSchedule-title = Abrir Cronograma de leitura
userGuide-readingSchedule-desc =
    O Cronograma de leitura reúne aulas com datas de entrega em todos os seus programas. Avançar o abre para você ver o que vem pela frente.
userGuide-subcollections-title = Opcional: pastas de aula
userGuide-subcollections-desc =
    Quer espelhos de pasta por aula? Ative Subcoleções de aula em Configurações. Deixe desligado, a menos que queira que o complemento gerencie pastas filhas.
userGuide-finish-title = Tudo pronto
userGuide-finish-desc =
    Reabra este tour a qualquer momento em Ajuda → Abrir o guia do usuário do Zotero Syllabus. Bons estudos!
userGuide-empty-title = Organizar esta coleção por aula
userGuide-empty-desc =
    Adicione aulas para cada semana ou sessão e atribua as leituras. Você também pode fazer um tour guiado curto.
userGuide-empty-tour = Fazer o tour

# Shared
app-name = Zotero Syllabus
this-collection = esta coleção
untitled = Sem título
nav-back = Voltar
nav-previous = Anterior
nav-next = Avançar

# View tabs / toolbar
view-tab-checklist = Lista de verificação
view-tab-checklist-tooltip = Ver como lista de verificação
view-tab-syllabus = Programa
view-tab-syllabus-tooltip = Ver como programa do curso
view-tab-create-syllabus = Transformar em programa
view-tab-create-syllabus-tooltip = Transformar esta coleção em um programa do curso
view-tab-table = Tabela
view-tab-table-tooltip = Ver como tabela
view-tab-gallery = Galeria
view-tab-gallery-tooltip = Ver como galeria
view-tab-explorer = Home
view-tab-explorer-tooltip = View as Home
view-tab-reading-schedule = Cronograma de leitura
toolbar-reading-schedule-review = Revisar o Cronograma de leitura
toolbar-reading-schedule-open = Abrir Cronograma de leitura

# Context menus
menu-set-priority = Definir prioridade
menu-none = (Nenhuma)
menu-assign-to-class = Atribuir a uma aula
menu-no-collection = (Nenhuma coleção selecionada)
menu-class-label = { $nomenclature } { $number }
menu-add-to-new-class = Adicionar à nova { $nomenclature } { $number }
menu-set-reading-status = Definir status de leitura
status-done = Concluído
status-not-done = Não concluído

# Syllabus page
page-toc-title = Sumário
placeholder-add-title = Adicionar um título…
page-compact-enable = Ativar modo compacto
page-compact-disable = Desativar modo compacto
page-reader-enable = Ativar modo de leitura
page-reader-disable = Desativar modo de leitura
page-export = Exportar arquivo de programa
page-import = Importar arquivo de programa
page-edit-settings = Editar configurações do programa
page-lock = Bloquear programa
page-unlock = Desbloquear programa
page-print = Imprimir a lista na visão Programa como PDF
placeholder-course-code = Código da disciplina
placeholder-institution = Instituição
placeholder-add-description = Adicionar uma descrição…
page-add-class = Adicionar { $nomenclature } { $number }
page-add-to-class = Adicionar a { $nomenclature } { $number }
page-drop-create-class = Solte o item aqui para criar { $nomenclature } { $number }
page-drop-import-file = Solte arquivos para adicioná-los a esta coleção
further-reading-heading = Leituras complementares
sort-label = Ordenar
further-reading-sort-aria = Ordenar leituras complementares
sort-by-title = Título
sort-by-creator = Criador
sort-by-date = Data
further-reading-empty-desc = Os itens nesta seção ainda não foram atribuídos a nenhuma aula.
toc-empty = Nenhuma aula disponível
placeholder-url = https://
links-delete = Excluir link
links-edit = Editar link
links-add = Adicionar link
bibliography-heading = Bibliografia

# Class groups / cards
mark-done = Marcar como concluído
mark-not-done = Marcar como não concluído
class-due-date-label = Data de entrega:
class-reset-sort = Redefinir ordem
class-move-up = Mover { $nomenclature } para cima
class-move-down = Mover { $nomenclature } para baixo
class-delete = Excluir { $nomenclature }
class-insert-here = Adicionar { $nomenclature } aqui
class-dropzone-hint = Arraste itens para { $nomenclature } { $number }
due-date-clear = Limpar data de entrega
due-date-add = Adicionar data de entrega
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
attachment-file = Arquivo
attachment-view = Ver
attachment-open = Abrir { $label }
assignment-duplicate = Criar atribuição duplicada
assignment-duplicate-label = Duplicar
assignment-unassign-class = Remover da aula
assignment-unassign-syllabus = Remover do programa
assignment-unassign-label = Desatribuir
priority-set-to = Definir prioridade como { $name }
priority-clear = Limpar prioridade
youtube-play = Reproduzir { $title } no YouTube

# Item pane
item-pane-not-found = Item não encontrado
item-pane-none-selected = Nenhum item selecionado
item-pane-n-selected = { $count } itens selecionados
item-pane-current-view = visão atual
item-pane-also-assigned = também atribuído a
item-pane-assignment-n = Tarefa #{ $number }
item-pane-assignment-for = para { $title }
item-pane-due = Entrega { $date }
item-pane-reference-material = Material de referência
item-pane-class-named = { $nomenclature } { $number }: { $title }
item-pane-mark-done = Marcar como concluído
placeholder-class-number = ex.: 1, 2, 3…
field-priority = Prioridade
field-instructions = Instruções
placeholder-instructions = Adicionar instruções para esta tarefa…
assignment-delete = Excluir tarefa
item-pane-select-collection = Selecione uma coleção para ver as tarefas do programa

# Settings
settings-title = Configurações do programa
settings-back = Voltar à visão do programa
settings-nomenclature = Nomenclatura
settings-nomenclature-desc = Escolha o termo usado para as sessões individuais (por exemplo, “semana”, “aula”, “sessão”, “unidade”).
settings-singular = Forma singular
settings-nomenclature-placeholder = ex.: semana, aula, sessão, unidade
settings-plural-label = Forma plural:
settings-subcollections = Subcoleções de aula
settings-subcollections-desc = Desativado por padrão. Quando ativado, cada aula com leituras atribuídas ganha uma pasta nesta coleção. Aulas sem atribuições não recebem pasta, e essas pastas são removidas. Pastas são criadas, renomeadas e removidas para corresponder ao programa — inclusive coleções filhas existentes, que podem ser excluídas. Desativar deixa as pastas no lugar.
settings-subcollections-checkbox = Criar subcoleções?
settings-bib-style = Estilo de bibliografia
settings-bib-style-desc = Escolha um estilo CSL (Citation Style Language) para as referências bibliográficas. Se não for definido, será usado o estilo padrão do usuário.
settings-citation-style = Estilo de citação
settings-user-default = Padrão do usuário
settings-user-default-named = Padrão do usuário: { $name }
settings-priorities = Prioridades
settings-priorities-desc = Personalize nomes, cores e ordem das prioridades.
settings-add-priority = Adicionar nova prioridade
settings-add-priority-button = Adicionar prioridade
settings-new-priority-name = Nova prioridade
settings-priority-move-up = Mover para cima
settings-priority-move-down = Mover para baixo
settings-priority-color = Cor da prioridade
settings-priority-name-placeholder = Nome da prioridade
settings-priority-delete = Excluir prioridade
settings-priority-name-label = Nome
settings-priority-preview = Prévia:
priority-default-course-info = Informações da disciplina
priority-default-essential = Obrigatória
priority-default-recommended = Recomendada
priority-default-optional = Opcional

# Gallery
gallery-empty-filtered = Nenhum item correspondente.
gallery-empty = Nenhum item nesta coleção.
gallery-untagged = Sem etiquetas
gallery-untagged-desc = Os itens nesta seção não têm etiquetas.
gallery-uncredited = Sem criador
gallery-uncredited-desc = Os itens nesta seção não têm criador.
gallery-empty-subcollections = Nenhuma subcoleção ou item nesta coleção.
gallery-unnumbered = Sem número
gallery-unnumbered-desc = Atribuído sem número de aula.
gallery-sort-auto = Auto
gallery-sort-auto-title = Ordem automática (coleção ou programa)
gallery-sort-az = A–Z
gallery-sort-az-title = Ordenar A–Z
gallery-sort-date = Data
gallery-sort-date-title = Ordenar por data (mais recentes primeiro)
gallery-sort-date-added = Adicionado
gallery-sort-date-added-title = Ordenar por data de adição (mais recentes primeiro)
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
gallery-layout-cover-title = Arte de capa
gallery-layout-card = Cartão
gallery-layout-card-title = Cartões do programa
gallery-layout-magazine = Revista
gallery-layout-magazine-title = Layout de revista com tamanhos variados
magazine-shelf-watch = Assistir
magazine-shelf-watch-title = Vídeos adicionados recentemente
magazine-shelf-listen = Ouvir
magazine-shelf-listen-title = Áudio adicionado recentemente
magazine-highlights = Destaques
gallery-options-aria = Opções da visão Galeria
gallery-options-title = Opções de visualização
gallery-menu-view = Visualização
gallery-menu-sort = Ordenar
gallery-menu-group = Agrupar por
gallery-menu-type-size = Tamanho do texto
gallery-type-small = Pequeno
gallery-type-small-title = Texto de revista menor
gallery-type-large = Grande
gallery-type-large-title = Texto de revista maior
gallery-in-this-collection = Nesta coleção
gallery-groups-nav-aria = Grupos
gallery-group-jump = Mostrar { $name }
gallery-prefs-summary = { $layout } / { $sort } / { $group }
gallery-page-of = Página { $page } de { $total }
gallery-save-globally = Salvar como padrão
gallery-save-globally-title = Salvar esta opção como padrão para todas as coleções
gallery-save-globally-active-title = A configuração desta coleção difere do padrão. Clique para salvá-la como padrão.
galleryTour-settings-title = Opções da galeria
galleryTour-settings-desc =
    Abra o menu no canto para mudar a visualização, a ordenação e o agrupamento. Vamos percorrer os três layouts.
galleryTour-cover-title = Vista Capa
galleryTour-cover-desc =
    Capa mostra cada item como arte — livros, artigos e páginas da web de relance.
galleryTour-magazine-title = Vista Revista
galleryTour-magazine-desc =
    Revista mistura blocos grandes e pequenos, como um sumário. Boa para folhear e ler chamadas.
galleryTour-card-title = Vista Cartões
galleryTour-card-desc =
    Os cartões usam o mesmo layout do programa, agrupados por tipo de item para juntar leituras semelhantes.
galleryTour-choose-title = Escolher o padrão
galleryTour-choose-desc =
    Com qual layout a Galeria deve abrir? Você pode mudar depois nas preferências do Zotero Syllabus ou com Salvar como padrão.
galleryTour-skip = Pular

# Reading schedule
schedule-edit-settings = Editar configurações do cronograma de leitura
schedule-empty-title = Nenhuma leitura agendada
schedule-empty-desc = Adicione datas de leitura às aulas para vê-las aqui.
schedule-this-week = Esta semana
schedule-next-week = Próxima semana
schedule-settings-title = Configurações do cronograma de leitura
schedule-settings-back = Voltar ao cronograma de leitura
schedule-settings-library = Coleção da biblioteca
schedule-settings-desc =
    Desativado por padrão. Quando ativado, uma coleção de nível superior “Cronograma de leitura” é mantida em Minha Biblioteca, com uma pasta para cada data de leitura recente e futura. Pastas são criadas, renomeadas e preenchidas automaticamente. Desativar exclui essa coleção; os itens dos programas permanecem no lugar.
schedule-settings-checkbox = Gerar coleção “Cronograma de leitura”?
schedule-day-managed-banner = Gerenciado automaticamente a partir dos seus programas. Edições aqui são sobrescritas.
schedule-day-empty = Nenhuma leitura agendada para este dia.
schedule-window-empty = Ainda não há leituras na janela do cronograma. Adicione datas de leitura às aulas para vê-las aqui.
schedule-no-dates = Sem datas
schedule-of-collection = de { $name }
schedule-of-collection-in-library = de { $collection } ({ $library })
schedule-open-syllabus = Abrir programa de { $title }
class-folder-managed-banner = Gerenciado automaticamente a partir deste programa. Edições nesta pasta são sobrescritas.

# Columns
column-reading-instructions = Instruções de leitura
column-status = Status
column-reading-time = Tempo de leitura
column-syllabus-info = Info do programa
column-class-hash = #{ $number }

# Progress / dialogs
dialog-save-export = Salvar exportação do programa
progress-import-success-title = Importação bem-sucedida
progress-import-success-text = Metadados do programa importados e mesclados com sucesso
progress-import-error-title = Erro de importação
progress-import-bad-file = Solte um arquivo .syllabus
progress-print-preparing = Preparando o programa para impressão…
progress-print-failed = Não foi possível salvar o PDF do programa
dialog-save-pdf = Salvar PDF do programa
file-filter-pdf = PDF
progress-saving-pdf = Salvando PDF…
dialog-save-file = Salvar arquivo
progress-translator-install-error = Erro ao instalar os coletores de listas de leitura
progress-migrate-start =
    { $count ->
        [one] Migrando { $count } programa para notas de coleção…
       *[other] Migrando { $count } programas para notas de coleção…
    }
progress-migrate-item = Migrando { $current } de { $total }…
progress-migrate-done =
    { $count ->
        [one] { $count } programa migrado
       *[other] { $count } programas migrados
    }
progress-migrate-empty-cleared =
    { $count ->
        [one] { $count } preferência vazia limpa
       *[other] { $count } preferências vazias limpas
    }
progress-migrate-not-found =
    { $count ->
        [one] { $count } coleção não encontrada
       *[other] { $count } coleções não encontradas
    }
progress-migrate-failed = { $count } falhou
progress-migrate-remaining = { $count } restante(s) nas preferências
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
tree-tooltip-reading-schedule = Cronograma de leitura (gerenciado automaticamente)
tree-tooltip-auto-managed = Gerenciado automaticamente pelo Zotero Syllabus
tree-tooltip-syllabus = Programa

# User guide sample items (created at tour time; not used as match keys)
tour-sample-reading-1 = Leitura de exemplo: Começando com listas da disciplina
tour-sample-reading-2 = Leitura de exemplo: Anotar enquanto lê
tour-sample-reading-3 = Leitura de exemplo: Planejar a semana

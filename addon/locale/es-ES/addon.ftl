startup-begin = El complemento se está cargando
startup-finish = El complemento está listo
enable-syllabus-title = ¿Convertir en un programa del curso?
enable-syllabus-message = ¿Convertir «{ $name }» en un programa del curso? Se guardará una nota de programa en esta colección.
enable-subcollections-title = ¿Gestionar subcolecciones de clase?
enable-subcollections-message =
    Al activar esta opción, el complemento gestiona las colecciones hijas de «{ $name }». Eso puede eliminar o reescribir carpetas que ya tenga.

    Qué ocurre:

    • Se crea o se adopta una carpeta por clase y se renombra para que coincida con el programa (por ejemplo, «Clase 1: Título»).

    • Las colecciones hijas que no sean esas carpetas de clase —y que no tengan su propia nota de programa— se eliminarán. Los elementos no se borran de la biblioteca; permanecen en la colección padre.

    • Los elementos de cada carpeta de clase se sobrescriben a partir de la nota del programa. Los elementos de más se quitan solo de la carpeta.

    • Quitar una clase del programa elimina esa carpeta de clase.

    • Si elimina una carpeta de clase, el complemento la vuelve a crear.

    Desactivar más tarde deja de gestionar las carpetas; las existentes se conservan.

    ¿Continuar?
enable-reading-schedule-collection-title = ¿Generar la colección Calendario de lecturas?
enable-reading-schedule-collection-message =
    Al activar esta opción se crea una colección de nivel superior «Calendario de lecturas» en Mi biblioteca, con una carpeta por cada fecha de lectura (desde hace 10 días).

    Qué ocurre:

    • Las carpetas de fecha se crean, se renombran y se rellenan automáticamente a partir de sus programas.

    • Los elementos de esas carpetas se sobrescriben a partir del calendario. Los elementos de más se quitan solo de la carpeta, no de la biblioteca.

    • Si elimina la colección o una carpeta de fecha, el complemento la vuelve a crear mientras esta opción esté activa.

    • No se incluyen programas de bibliotecas de grupo (los elementos no pueden cruzar bibliotecas).

    Desactivar más tarde elimina la colección «Calendario de lecturas» y sus carpetas de fecha. Los elementos de los programas permanecen en su sitio.

    ¿Continuar?
disable-reading-schedule-collection-title = ¿Quitar la colección Calendario de lecturas?
disable-reading-schedule-collection-message =
    Al desactivar esta opción se elimina la colección gestionada «Calendario de lecturas» y sus carpetas de fecha.

    Los elementos no se borran de su biblioteca; permanecen en las colecciones originales del programa.

    ¿Continuar?
prefs-title = Zotero Syllabus
prefs-table-title = Título
prefs-table-detail = Detalle
tabpanel-lib-tab-label = Pestaña de biblioteca
tabpanel-reader-tab-label = Pestaña del lector
menu-toggle-bibliography = Mostrar u ocultar bibliografía
managed-folder-banner-title = Carpeta gestionada automáticamente
managed-folder-banner-class =
    No añada ni quite elementos aquí. Esta carpeta de clase se mantiene sincronizada con el programa; las ediciones manuales se sobrescriben.
managed-folder-banner-schedule =
    No añada ni quite elementos aquí. Esta carpeta del calendario de lecturas se mantiene sincronizada con sus programas; las ediciones manuales se sobrescriben.
menuHelp-openUserGuide = Abrir la guía de usuario de Zotero Syllabus
userGuide-start-title = Bienvenido a Zotero Syllabus
userGuide-start-desc =
    Convierta cualquier colección de Zotero en una lista de lecturas del curso: organice por clase, fije prioridades y siga qué leer a continuación.
userGuide-start-close = Recordármelo más tarde
userGuide-collection-title = Empezar por una colección
userGuide-collection-desc =
    Los programas viven en las colecciones. Abriremos una colección de práctica «Syllabus Tour» con algunas lecturas de ejemplo.
userGuide-syllabusButton-title = Abrir la vista Programa
userGuide-syllabusButton-desc =
    Pulse Programa en la barra de herramientas de elementos para sustituir la lista por el esquema del curso. El recorrido cambiará allí por usted.
userGuide-addClass-title = Añadir una clase
userGuide-addClass-desc =
    Las clases (o semanas / sesiones — puede cambiar el nombre más adelante) son las secciones de su programa. Añada una para empezar.
userGuide-assign-title = Asignar lecturas
userGuide-assign-desc =
    Arrastre elementos a una clase, o clic derecho → Asignar a una clase. Los elementos no asignados permanecen en Lecturas complementarias.
userGuide-itemPane-title = Editar en el panel del elemento
userGuide-itemPane-desc =
    Seleccione una lectura para fijar el número de clase, la prioridad, las instrucciones y el estado de hecho en la sección Tareas de lectura.
userGuide-readingDate-title = Fijar la fecha de entrega de una clase
userGuide-readingDate-desc =
    Cada clase puede tener una fecha de lectura. Fijaremos una en la Clase 1 al pulsar Siguiente; después podrá abrir el Calendario de lecturas.
userGuide-readingSchedule-title = Abrir el Calendario de lecturas
userGuide-readingSchedule-desc =
    El Calendario de lecturas reúne las clases con fecha de entrega de todos sus programas. Siguiente lo abre para ver lo que se avecina.
userGuide-subcollections-title = Opcional: carpetas de clase
userGuide-subcollections-desc =
    ¿Quiere espejos de carpeta por clase? Active Subcolecciones de clase en Ajustes. Déjelo desactivado salvo que quiera que el complemento gestione las carpetas hijas.
userGuide-finish-title = Ya está listo
userGuide-finish-desc =
    Puede reabrir este recorrido en cualquier momento desde Ayuda → Abrir la guía de usuario de Zotero Syllabus. ¡Buen estudio!
userGuide-empty-title = Organizar esta colección por clase
userGuide-empty-desc =
    Añada clases para cada semana o sesión y asigne las lecturas. También puede seguir un breve recorrido guiado.
userGuide-empty-tour = Hacer el recorrido

# Shared
app-name = Zotero Syllabus
this-collection = esta colección
untitled = Sin título
nav-back = Atrás
nav-previous = Anterior
nav-next = Siguiente

# View tabs / toolbar
view-tab-checklist = Lista de comprobación
view-tab-checklist-tooltip = Ver como lista de comprobación
view-tab-syllabus = Programa
view-tab-syllabus-tooltip = Ver como programa del curso
view-tab-table = Tabla
view-tab-table-tooltip = Ver como tabla
view-tab-gallery = Galería
view-tab-gallery-tooltip = Ver como galería
view-tab-reading-schedule = Calendario de lecturas
toolbar-reading-schedule-review = Revisar el Calendario de lecturas
toolbar-reading-schedule-open = Abrir el Calendario de lecturas

# Context menus
menu-set-priority = Establecer prioridad
menu-none = (Ninguna)
menu-assign-to-class = Asignar a una clase
menu-no-collection = (Ninguna colección seleccionada)
menu-class-label = { $nomenclature } { $number }
menu-add-to-new-class = Añadir a la nueva { $nomenclature } { $number }
menu-set-reading-status = Establecer estado de lectura
status-done = Hecho
status-not-done = No hecho

# Syllabus page
page-toc-title = Índice
placeholder-add-title = Añadir un título…
page-compact-enable = Activar el modo compacto
page-compact-disable = Desactivar el modo compacto
page-reader-enable = Activar el modo de lectura
page-reader-disable = Desactivar el modo de lectura
page-export = Exportar archivo de programa
page-import = Importar archivo de programa
page-edit-settings = Editar ajustes del programa
page-lock = Bloquear programa
page-unlock = Desbloquear programa
page-print = Imprimir la lista de la vista Programa como PDF
placeholder-course-code = Código de la asignatura
placeholder-institution = Institución
placeholder-add-description = Añadir una descripción…
page-add-class = Añadir { $nomenclature } { $number }
page-add-to-class = Añadir a { $nomenclature } { $number }
page-drop-create-class = Suelte el elemento aquí para crear { $nomenclature } { $number }
page-drop-import-file = Suelte un archivo .syllabus para importar
further-reading-heading = Lecturas complementarias
sort-label = Ordenar
further-reading-sort-aria = Ordenar lecturas complementarias
sort-by-title = Título
sort-by-creator = Creador
sort-by-date = Fecha
further-reading-empty-desc = Los elementos de esta sección no se han asignado a ninguna clase.
toc-empty = No hay clases disponibles
placeholder-url = https://
links-delete = Eliminar enlace
links-edit = Editar enlace
links-add = Añadir enlace
bibliography-heading = Bibliografía

# Class groups / cards
mark-done = Marcar como hecho
mark-not-done = Marcar como no hecho
class-due-date-label = Fecha de entrega:
class-reset-sort = Restablecer el orden
class-move-up = Subir { $nomenclature }
class-move-down = Bajar { $nomenclature }
class-delete = Eliminar { $nomenclature }
class-dropzone-hint = Arrastre elementos a { $nomenclature } { $number }
due-date-clear = Borrar fecha de entrega
due-date-add = Añadir una fecha de entrega
placeholder-select-date = Seleccionar fecha
item-in-publication = en { $name }
attachment-url = URL
attachment-pdf = PDF
attachment-snapshot = Instantánea
attachment-epub = EPUB
attachment-html = HTML
attachment-doc = DOC
attachment-txt = TXT
attachment-zip = ZIP
attachment-file = Archivo
attachment-view = Ver
attachment-open = Abrir { $label }
assignment-duplicate = Crear asignación duplicada
assignment-duplicate-label = Duplicar
assignment-unassign-class = Quitar de la clase
assignment-unassign-syllabus = Quitar del programa
assignment-unassign-label = Desasignar
priority-set-to = Establecer prioridad en { $name }
priority-clear = Quitar prioridad
youtube-play = Reproducir { $title } en YouTube

# Item pane
item-pane-not-found = Elemento no encontrado
item-pane-none-selected = Ningún elemento seleccionado
item-pane-n-selected = { $count } elementos seleccionados
item-pane-current-view = vista actual
item-pane-also-assigned = también asignado a
item-pane-assignment-n = Tarea #{ $number }
item-pane-assignment-for = para { $title }
item-pane-due = Entrega { $date }
item-pane-reference-material = Material de referencia
item-pane-mark-done = Marcar como hecho
placeholder-class-number = p. ej., 1, 2, 3…
field-priority = Prioridad
field-instructions = Instrucciones
placeholder-instructions = Añadir instrucciones para esta tarea…
assignment-delete = Eliminar tarea
item-pane-select-collection = Seleccione una colección para ver las asignaciones del programa

# Settings
settings-title = Ajustes del programa
settings-back = Volver a la vista del programa
settings-nomenclature = Nomenclatura
settings-nomenclature-desc = Elija el término con el que se denominan las sesiones individuales (p. ej., «semana», «clase», «sesión», «sección»).
settings-singular = Forma singular
settings-nomenclature-placeholder = p. ej., semana, clase, sesión, sección
settings-plural-label = Forma plural:
settings-subcollections = Subcolecciones de clase
settings-subcollections-desc = Desactivado de forma predeterminada. Al activarlo, cada clase obtiene una carpeta bajo esta colección. Las carpetas se crean, se renombran y se eliminan para coincidir con el programa, incluidas las colecciones hijas existentes, que pueden borrarse. Desactivar deja las carpetas en su sitio.
settings-subcollections-checkbox = ¿Crear subcolecciones?
settings-bib-style = Estilo de bibliografía
settings-bib-style-desc = Elija un estilo CSL (Citation Style Language) para las referencias bibliográficas. Si no se define, se usará el estilo predeterminado del usuario.
settings-citation-style = Estilo de cita
settings-user-default = Predeterminado del usuario
settings-user-default-named = Predeterminado del usuario: { $name }
settings-priorities = Prioridades
settings-priorities-desc = Personalice nombres, colores y orden de las prioridades.
settings-add-priority = Añadir una prioridad nueva
settings-add-priority-button = Añadir prioridad
settings-new-priority-name = Prioridad nueva
settings-priority-move-up = Subir
settings-priority-move-down = Bajar
settings-priority-color = Color de la prioridad
settings-priority-name-placeholder = Nombre de la prioridad
settings-priority-delete = Eliminar prioridad
settings-priority-name-label = Nombre
settings-priority-preview = Vista previa:
priority-default-course-info = Información del curso
priority-default-essential = Esencial
priority-default-recommended = Recomendada
priority-default-optional = Opcional

# Gallery
gallery-empty-filtered = No hay elementos coincidentes.
gallery-empty = No hay elementos en esta colección.
gallery-untagged = Sin etiquetas
gallery-untagged-desc = Los elementos de esta sección no tienen etiquetas.
gallery-empty-subcollections = No hay subcolecciones ni elementos en esta colección.
gallery-unnumbered = Sin número
gallery-unnumbered-desc = Asignado sin número de clase.
gallery-sort-auto = Auto
gallery-sort-auto-title = Orden automático (colección o programa)
gallery-sort-az = A–Z
gallery-sort-az-title = Ordenar A–Z
gallery-sort-date = Fecha
gallery-sort-date-title = Ordenar por fecha (más recientes primero)
gallery-group-none = Ninguno
gallery-group-none-title = Sin agrupación
gallery-group-type = Tipo
gallery-group-type-title = Agrupar por tipo de elemento
gallery-group-tags = Etiquetas
gallery-group-tags-title = Agrupar por etiquetas
gallery-group-subcollections = Subcolecciones
gallery-group-subcollections-title = Agrupar por subcolecciones
gallery-group-classes = Clases
gallery-group-classes-title = Agrupar por clases
gallery-layout-cover = Portada
gallery-layout-cover-title = Imagen de portada
gallery-layout-card = Tarjeta
gallery-layout-card-title = Tarjetas del programa
gallery-options-aria = Opciones de la vista Galería
gallery-options-title = Opciones de vista
gallery-menu-view = Vista
gallery-menu-sort = Ordenar
gallery-menu-group = Agrupar por
gallery-page-of = Página { $page } de { $total }

# Reading schedule
schedule-edit-settings = Editar ajustes del calendario de lecturas
schedule-empty-title = No hay lecturas programadas
schedule-empty-desc = Añada fechas de lectura a las clases para verlas aquí.
schedule-this-week = Esta semana
schedule-next-week = La semana que viene
schedule-settings-title = Ajustes del calendario de lecturas
schedule-settings-back = Volver al calendario de lecturas
schedule-settings-library = Colección de la biblioteca
schedule-settings-desc =
    Desactivado de forma predeterminada. Al activarlo, se mantiene en Mi biblioteca una colección de nivel superior «Calendario de lecturas» con una carpeta por cada fecha de lectura reciente y próxima. Las carpetas se crean, se renombran y se rellenan automáticamente. Desactivar elimina esa colección; los elementos de los programas permanecen en su sitio.
schedule-settings-checkbox = ¿Generar la colección «Calendario de lecturas»?
schedule-day-managed-banner = Gestionado automáticamente a partir de sus programas. Las ediciones aquí se sobrescriben.
schedule-day-empty = No hay lecturas programadas para este día.
schedule-window-empty = Aún no hay lecturas en la ventana del calendario. Añada fechas de lectura a las clases para verlas aquí.
schedule-no-dates = Sin fechas
schedule-of-collection = de { $name }
schedule-open-syllabus = Abrir el programa de { $title }
class-folder-managed-banner = Gestionado automáticamente a partir de este programa. Las ediciones en esta carpeta se sobrescriben.

# Columns
column-reading-instructions = Instrucciones de lectura
column-status = Estado
column-reading-time = Tiempo de lectura
column-syllabus-info = Info del programa
column-class-hash = #{ $number }

# Progress / dialogs
dialog-save-export = Guardar exportación del programa
progress-import-success-title = Importación correcta
progress-import-success-text = Metadatos del programa importados y fusionados correctamente
progress-import-error-title = Error de importación
progress-import-bad-file = Suelte un archivo .syllabus
progress-print-preparing = Preparando el programa para imprimir…
progress-print-failed = No se pudo guardar el PDF del programa
dialog-save-pdf = Guardar PDF del programa
file-filter-pdf = PDF
progress-saving-pdf = Guardando PDF…
dialog-save-file = Guardar archivo
progress-translator-install-error = Error al instalar los extractores de listas de lectura
progress-migrate-start =
    { $count ->
        [one] Migrando { $count } programa a notas de colección…
       *[other] Migrando { $count } programas a notas de colección…
    }
progress-migrate-item = Migrando { $current } de { $total }…
progress-migrate-done =
    { $count ->
        [one] Se ha migrado { $count } programa
       *[other] Se han migrado { $count } programas
    }
progress-migrate-empty-cleared =
    { $count ->
        [one] { $count } preferencia vacía borrada
       *[other] { $count } preferencias vacías borradas
    }
progress-migrate-not-found =
    { $count ->
        [one] { $count } colección no encontrada
       *[other] { $count } colecciones no encontradas
    }
progress-migrate-failed = { $count } fallido(s)
progress-migrate-remaining = { $count } restante(s) en las preferencias
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

# Collection tree
tree-tooltip-reading-schedule = Calendario de lecturas (gestionado automáticamente)
tree-tooltip-auto-managed = Gestionado automáticamente por Zotero Syllabus
tree-tooltip-syllabus = Programa

# User guide sample items (created at tour time; not used as match keys)
tour-sample-reading-1 = Lectura de ejemplo: Primeros pasos con las listas del curso
tour-sample-reading-2 = Lectura de ejemplo: Anotar sobre la marcha
tour-sample-reading-3 = Lectura de ejemplo: Planificar la semana

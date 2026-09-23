startup-begin = Дополнение загружается
startup-finish = Дополнение готово
enable-syllabus-title = Превратить в силлабус?
enable-syllabus-message = Превратить «{ $name }» в силлабус? В этой коллекции будет сохранена заметка силлабуса.
enable-subcollections-title = Управлять подколлекциями занятий?
enable-subcollections-message =
    Включение этой опции позволяет дополнению управлять дочерними коллекциями в «{ $name }». Это может удалить или перезаписать уже существующие папки.

    Что произойдёт:

    • Для каждого занятия с назначенными текстами создаётся или принимается одна папка, которая переименовывается в соответствии с силлабусом (например, «Занятие 1: Название»).

    • Занятия без назначенных текстов не получают папку. Существующие папки таких занятий удаляются.

    • Дочерние коллекции, которые не являются этими папками занятий — и у которых нет собственной заметки силлабуса — будут удалены. Записи не удаляются из библиотеки; они остаются в родительской коллекции.

    • Записи в каждой папке занятия перезаписываются из заметки силлабуса. Лишние записи удаляются только из папки.

    • Удаление занятия из силлабуса удаляет соответствующую папку.

    • Если вы удалите папку занятия, в которой ещё есть назначенные тексты, дополнение создаст её заново.

    Позднее отключение прекращает управление папками; существующие папки остаются на месте.

    Продолжить?
enable-reading-schedule-collection-title = Создать коллекцию «График чтения»?
enable-reading-schedule-collection-message =
    Включение этой опции создаёт коллекцию верхнего уровня «График чтения» в «Моя библиотека» с папкой для каждой даты чтения (начиная с 10 дней назад).

    Что произойдёт:

    • Папки дат создаются, переименовываются и заполняются автоматически на основе ваших силлабусов.

    • Записи в этих папках перезаписываются из графика. Лишние записи удаляются только из папки — не из библиотеки.

    • Если вы удалите коллекцию или папку даты, дополнение создаст её заново, пока эта настройка включена.

    • Силлабусы из групповых библиотек не включаются (записи не могут пересекать библиотеки).

    Позднее отключение удаляет коллекцию «График чтения» и её папки дат. Записи силлабусов остаются на месте.

    Продолжить?
disable-reading-schedule-collection-title = Удалить коллекцию «График чтения»?
disable-reading-schedule-collection-message =
    Отключение этой опции удаляет управляемую коллекцию «График чтения» и её папки дат.

    Записи не удаляются из библиотеки; они остаются в исходных коллекциях силлабусов.

    Продолжить?
prefs-title = Zotero Syllabus
prefs-table-title = Название
prefs-table-detail = Подробности
tabpanel-lib-tab-label = Вкладка библиотеки
tabpanel-reader-tab-label = Вкладка просмотрщика
menu-toggle-bibliography = Показать/скрыть библиографию
managed-folder-banner-title = Автоматически управляемая папка
managed-folder-banner-class =
    Не добавляйте и не удаляйте записи здесь. Эта папка занятия синхронизируется с силлабусом; ручные правки будут перезаписаны.
managed-folder-banner-schedule =
    Не добавляйте и не удаляйте записи здесь. Эта папка графика чтения синхронизируется с вашими силлабусами; ручные правки будут перезаписаны.
menuHelp-openUserGuide = Открыть руководство пользователя Zotero Syllabus
userGuide-start-title = Добро пожаловать в Zotero Syllabus
userGuide-start-desc =
    Превратите любую коллекцию Zotero в список литературы курса — организуйте по занятиям, задайте приоритеты и отслеживайте, что читать дальше.
userGuide-start-close = Напомнить позже
userGuide-exit = Выйти из тура
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
userGuide-collection-title = Начните с коллекции
userGuide-collection-desc =
    Силлабусы привязаны к коллекциям. Мы откроем учебную коллекцию «Экскурсия по силлабусу» с несколькими образцами литературы.
userGuide-syllabusButton-title = Превратить в силлабус
userGuide-syllabusButton-desc =
    Нажмите «Превратить в силлабус» на панели инструментов записей, чтобы превратить эту коллекцию в план курса. Экскурсия переключит вид за вас.
userGuide-addClass-title = Добавьте занятие
userGuide-addClass-desc =
    Занятия (или недели / сессии — названия можно изменить позже) — это разделы силлабуса. Добавьте одно, чтобы начать.
userGuide-assign-title = Назначьте литературу
userGuide-assign-desc =
    Перетащите записи в занятие или щёлкните правой кнопкой → Назначить занятию. Неназначенные записи остаются в разделе «Дополнительная литература».
userGuide-itemPane-title = Редактируйте в панели записи
userGuide-itemPane-desc =
    Выберите чтение, чтобы задать номер занятия, приоритет, инструкции и статус выполнения в разделе «Задания по чтению».
userGuide-readingDate-title = Задайте срок занятия
userGuide-readingDate-desc =
    У каждого занятия может быть дата чтения. Мы зададим её для Занятия 1, когда вы нажмёте «Далее» — затем можно открыть «График чтения».
userGuide-readingSchedule-title = Откройте «График чтения»
userGuide-readingSchedule-desc =
    «График чтения» собирает занятия со сроками из всех ваших силлабусов. «Далее» откроет его, чтобы показать предстоящее.
userGuide-readingSchedule-light-title = Open Reading Schedule
userGuide-readingSchedule-light-desc =
    The Reading Schedule tab gathers class due dates across your syllabi. Next opens it from the tab bar.
userGuide-home-title = Home view
userGuide-home-desc =
    At the library root, switch to Home for shelves of recent items and upcoming deadlines. Next selects your library home.
userGuide-subcollections-title = По желанию: папки занятий
userGuide-subcollections-desc =
    Нужны зеркальные папки для каждого занятия? Включите «Подколлекции занятий» в настройках. Оставьте выключенным, если дополнение не должно управлять дочерними папками.
userGuide-finish-title = Всё готово
userGuide-finish-desc =
    Эту экскурсию можно снова открыть в любой момент: Справка → Открыть руководство пользователя Zotero Syllabus. Успехов в учёбе!
userGuide-finish-prefs-title = You’re set
userGuide-finish-prefs-desc =
    Turn views on or off anytime in Preferences → Zotero Syllabus → Views. You can reopen this tour from Help.
userGuide-empty-title = Организуйте эту коллекцию по занятиям
userGuide-empty-desc =
    Добавьте занятия для каждой недели или сессии, затем назначьте литературу. Можно также пройти краткую экскурсию.
userGuide-empty-tour = Пройти экскурсию

# Shared
app-name = Zotero Syllabus
this-collection = эта коллекция
untitled = Без названия
nav-back = Назад
nav-previous = Предыдущий
nav-next = Далее

# View tabs / toolbar
view-tab-checklist = Контрольный список
view-tab-checklist-tooltip = Показать как контрольный список
view-tab-syllabus = Силлабус
view-tab-syllabus-tooltip = Показать как силлабус
view-tab-create-syllabus = Превратить в силлабус
view-tab-create-syllabus-tooltip = Превратить эту коллекцию в силлабус
view-tab-table = Таблица
view-tab-table-tooltip = Показать как таблицу
view-tab-gallery = Галерея
view-tab-gallery-tooltip = Показать как галерею
view-tab-explorer = Home
view-tab-explorer-tooltip = View as Home
view-tab-reading-schedule = График чтения
reading-schedule-desc = Class due dates across your syllabi, so you can see what’s next.
view-tab-my-annotations = Annotation Feed
toolbar-my-annotations-open = Open Annotation Feed
toolbar-reading-schedule-review = Просмотреть график чтения
toolbar-reading-schedule-open = Открыть график чтения

# Context menus
menu-set-priority = Задать приоритет
menu-none = (Нет)
menu-assign-to-class = Назначить занятию
menu-no-collection = (Коллекция не выбрана)
menu-class-label = { $nomenclature } { $number }
menu-add-to-new-class = Добавить в { $nomenclature } { $number }
menu-set-reading-status = Задать статус чтения
status-done = Выполнено
status-not-done = Не выполнено

# Syllabus page
page-toc-title = Оглавление
placeholder-add-title = Добавить название…
page-density-cycle = Переключить на { $next }
page-density-row = Строка
page-density-standard = Стандартная
page-density-expanded = Расширенная
page-reader-enable = Включить флажки
page-reader-disable = Выключить флажки
page-export = Экспортировать файл силлабуса
page-import = Импортировать файл силлабуса
page-edit-settings = Изменить параметры силлабуса
page-lock = Заблокировать силлабус
page-unlock = Разблокировать силлабус
page-view-options-aria = Syllabus view options
page-view-checkboxes = Checkboxes
page-print = Сохранить силубус как PDF, Word, Markdown или HTML
page-save-pdf = PDF
page-save-word = Word
page-save-markdown = Markdown
page-save-html = HTML
page-publish = Publish online…
placeholder-course-code = Код курса
placeholder-institution = Учебное заведение
placeholder-add-description = Добавить описание…
page-add-class = Добавить { $nomenclature } { $number }
page-add-to-class = Добавить в { $nomenclature } { $number }
page-drop-create-class = Перетащите запись сюда, чтобы создать { $nomenclature } { $number }
page-drop-import-file = Перетащите файлы, чтобы добавить их в эту коллекцию
further-reading-heading = Дополнительная литература
sort-label = Сортировка
further-reading-sort-aria = Сортировать дополнительную литературу
sort-by-title = Название
sort-by-creator = Автор
sort-by-date = Дата
further-reading-empty-desc = Записи в этом разделе не назначены ни одному занятию.
toc-empty = Нет доступных занятий
placeholder-url = https://
links-delete = Удалить ссылку
links-edit = Изменить ссылку
links-add = Добавить ссылку
bibliography-heading = Библиография

# Class groups / cards
mark-done = Отметить как выполненное
mark-not-done = Отметить как невыполненное
class-due-date-label = Срок:
class-reset-sort = Сбросить порядок сортировки
class-move-up = Переместить { $nomenclature } вверх
class-move-down = Переместить { $nomenclature } вниз
class-delete = Удалить { $nomenclature }
class-insert-here = Добавить { $nomenclature } сюда
class-dropzone-hint = Перетащите записи в { $nomenclature } { $number }
due-date-clear = Очистить срок
due-date-add = Добавить срок
placeholder-select-date = Выберите дату
item-in-publication = в { $name }
attachment-url = URL
attachment-pdf = PDF
attachment-snapshot = Снимок
attachment-epub = EPUB
attachment-html = HTML
attachment-doc = DOC
attachment-txt = TXT
attachment-zip = ZIP
attachment-file = Файл
attachment-view = Просмотр
attachment-open = Открыть { $label }
assignment-duplicate = Создать дубликат задания
assignment-duplicate-label = Дублировать
assignment-unassign-class = Убрать из занятия
assignment-unassign-syllabus = Убрать из силлабуса
assignment-unassign-label = Снять назначение
priority-set-to = Задать приоритет: { $name }
priority-clear = Снять приоритет
youtube-play = Воспроизвести { $title } на YouTube

# Item pane
item-pane-not-found = Запись не найдена
item-pane-none-selected = Записи не выбраны
item-pane-n-selected = Выбрано записей: { $count }
item-pane-current-view = текущий вид
item-pane-also-assigned = также назначено
item-pane-assignment-n = Задание №{ $number }
item-pane-assignment-for = для { $title }
item-pane-due = Срок { $date }
item-pane-reference-material = Справочные материалы
item-pane-class-named = { $nomenclature } { $number }: { $title }
item-pane-mark-done = Отметить выполненным
placeholder-class-number = напр., 1, 2, 3…
field-priority = Приоритет
field-instructions = Инструкции
placeholder-instructions = Добавьте инструкции к этому заданию…
assignment-delete = Удалить задание
item-pane-select-collection = Выберите коллекцию, чтобы увидеть задания силлабуса

# Settings
settings-title = Параметры силлабуса
settings-window-title = Настройки: { $name }
settings-view = View
settings-view-desc = Density and checkboxes for this syllabus.
settings-density = Density
settings-file = Syllabus file
settings-file-desc = Export or import a .syllabus metadata file for this collection.
settings-back = Назад к виду силлабуса
settings-nomenclature = Наименования
settings-nomenclature-desc = Выберите термин для отдельных занятий (напр., «неделя», «занятие», «сессия», «раздел»).
settings-singular = Форма единственного числа
settings-nomenclature-placeholder = напр., неделя, занятие, сессия, раздел
settings-plural-label = Форма множественного числа:
settings-subcollections = Подколлекции занятий
settings-subcollections-desc = При включении каждое занятие с назначенными текстами получает папку в этой коллекции.
settings-subcollections-checkbox = Создавать подколлекции?
settings-bib-style = Стиль библиографии
settings-bib-style-desc = Выберите стиль CSL (Citation Style Language) для библиографических ссылок.
settings-citation-style = Стиль цитирования
settings-user-default = По умолчанию пользователя
settings-user-default-named = По умолчанию пользователя: { $name }
settings-priorities = Приоритеты
settings-priorities-desc = Настройте названия, цвета и порядок приоритетов для этой программы.
settings-priorities-global-title = Глобальные приоритеты по умолчанию
settings-priorities-global-desc = Новые программы копируют эти приоритеты. Существующие сохраняют свои списки.
settings-priorities-global-link = Изменить глобальные настройки…
settings-priorities-global-done = Готово
settings-priorities-global-reset = Сбросить к встроенным значениям
settings-priorities-set-global = Сделать глобальными по умолчанию
settings-priorities-set-global-confirm-title = Сделать глобальными по умолчанию?
settings-priorities-set-global-confirm-message =
    Это заменит ваши глобальные приоритеты по умолчанию приоритетами этой программы. Новые программы скопируют эти названия, цвета и порядок. Существующие не изменятся.
settings-priorities-set-global-done = Сохранено как глобальные настройки для новых программ
settings-priorities-reset-global = Сбросить к глобальным
settings-priorities-reset-global-confirm-title = Сбросить к глобальным?
settings-priorities-reset-global-confirm-message =
    Это заменит приоритеты этой программы вашими глобальными настройками. Чтения с приоритетами вне глобального списка нужно будет переместить или очистить.
settings-priorities-reset-global-done = Приоритеты сброшены к глобальным настройкам
settings-add-priority = Добавить новый приоритет
settings-add-priority-button = Добавить приоритет
settings-new-priority-name = Новый приоритет
settings-priority-move-up = Переместить вверх
settings-priority-move-down = Переместить вниз
settings-priority-color = Цвет приоритета
settings-priority-name-placeholder = Название приоритета
settings-priority-delete = Удалить приоритет
settings-priority-delete-title = Удалить приоритет?
settings-priority-delete-message =
    { $count ->
        [one] { $count } чтение использует «{ $name }». Выберите, что сделать с ним, прежде чем удалить этот приоритет.
       *[other] { $count } чтений используют «{ $name }». Выберите, что сделать с ними, прежде чем удалить этот приоритет.
    }
settings-priority-delete-migrate-label = Переместить чтения в
settings-priority-delete-migrate = Переместить и удалить
settings-priority-delete-clear = Сбросить приоритет
settings-priority-delete-cancel = Отмена
settings-priority-name-label = Название
settings-priority-preview = Предпросмотр:
priority-default-course-info = Сведения о курсе
priority-default-essential = Обязательное
priority-default-recommended = Рекомендуемое
priority-default-optional = Факультативное

# Gallery
gallery-empty-filtered = Нет подходящих записей.
gallery-empty = В этой коллекции нет записей.
gallery-untagged = Без меток
gallery-untagged-desc = У записей в этом разделе нет меток.
gallery-uncredited = Без автора
gallery-uncredited-desc = У записей в этом разделе нет автора.
gallery-empty-subcollections = В этой коллекции нет подколлекций и записей.
gallery-unnumbered = Без номера
gallery-unnumbered-desc = Назначено без номера занятия.
gallery-sort-auto = Авто
gallery-sort-auto-title = Автоматический порядок (коллекция или силлабус)
gallery-sort-az = А–Я
gallery-sort-az-title = Сортировать А–Я
gallery-sort-date = Дата
gallery-sort-date-title = Сортировать по дате (сначала новые)
gallery-sort-date-added = Добавлено
gallery-sort-date-added-title = Сортировать по дате добавления (сначала новые)
gallery-sort-last-read = Last Read
gallery-sort-last-read-title = Sort by last read (most recent first)
gallery-group-none = Нет
gallery-group-none-title = Без группировки
gallery-group-auto = Автоматически
gallery-group-auto-title = Автоматическая группировка
gallery-group-type = Тип
gallery-group-type-title = Группировать по типу записи
gallery-group-creator = Автор
gallery-group-creator-title = Группировать по автору
gallery-group-tags = Метки
gallery-group-tags-title = Группировать по меткам
gallery-group-subcollections = Подколлекции
gallery-group-subcollections-title = Группировать по подколлекциям
gallery-group-classes = Занятия
gallery-group-classes-title = Группировать по занятиям
gallery-layout-cover = Обложка
gallery-layout-cover-title = Изображение обложки
gallery-layout-card = Карточка
gallery-layout-card-title = Карточки силлабуса
gallery-layout-annotations = Аннотации
gallery-layout-annotations-title = Обложки со всеми аннотациями
gallery-annotations-empty = Нет аннотаций
gallery-annotations-none-heading = Нет аннотаций
gallery-annotations-show-empty = Показывать элементы без аннотаций
gallery-layout-magazine = Журнал
gallery-layout-magazine-title = Журнальная вёрстка разных размеров
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
magazine-shelf-watch = Смотреть
magazine-shelf-watch-title = Недавно добавленные видео
magazine-shelf-listen = Слушать
magazine-shelf-listen-title = Недавно добавленное аудио
magazine-highlights = Выделения
gallery-options-aria = Параметры вида галереи
gallery-options-title = Параметры вида
gallery-menu-view = Вид
gallery-menu-sort = Сортировка
gallery-menu-group = Группировать по
gallery-menu-type-size = Размер текста
gallery-type-small = Мелкий
gallery-type-small-title = Более мелкий текст журнала
gallery-type-large = Крупный
gallery-type-large-title = Более крупный текст журнала
gallery-in-this-collection = В этой коллекции
gallery-groups-nav-aria = Группы
gallery-group-jump = Показать { $name }
gallery-prefs-summary = { $layout } / { $sort } / { $group }
gallery-page-of = Страница { $page } из { $total }
gallery-save-globally = Сохранить как значение по умолчанию
gallery-save-globally-title = Сохранить этот параметр как значение по умолчанию для всех коллекций
gallery-save-globally-active-title = Настройка этой коллекции отличается от значения по умолчанию. Нажмите, чтобы сохранить её по умолчанию.
galleryTour-settings-title = Параметры галереи
galleryTour-settings-desc =
    Откройте меню в углу, чтобы сменить вид, сортировку и группировку. Мы покажем три макета.
galleryTour-cover-title = Вид обложки
galleryTour-cover-desc =
    Обложка показывает каждый элемент как изображение — книги, статьи и веб-страницы сразу видны.
galleryTour-magazine-title = Журнальный вид
galleryTour-magazine-desc =
    Журнал смешивает крупные и мелкие плитки, как содержание. Удобно листать и читать анонсы.
galleryTour-card-title = Вид карточек
galleryTour-card-desc =
    Карточки используют тот же макет программы, сгруппированные по типу элемента, чтобы похожие материалы были рядом.
galleryTour-choose-title = Выберите значение по умолчанию
galleryTour-choose-desc =
    С каким макетом должна открываться Галерея? Позже это можно изменить в настройках Zotero Syllabus или через «Сохранить как значение по умолчанию».
galleryTour-skip = Пропустить

# Reading schedule
schedule-edit-settings = Изменить параметры графика чтения
schedule-empty-title = Нет запланированных чтений
schedule-empty-desc = Добавьте даты чтения к занятиям, чтобы увидеть их здесь.
schedule-this-week = На этой неделе
schedule-next-week = На следующей неделе
schedule-settings-title = Параметры графика чтения
schedule-settings-library = Коллекция в библиотеке
schedule-settings-desc =
    По умолчанию выключено. При включении в «Моя библиотека» поддерживается коллекция верхнего уровня «График чтения» с папкой для каждой недавней и предстоящей даты чтения. Папки создаются, переименовываются и заполняются автоматически. Отключение удаляет эту коллекцию; записи силлабусов остаются на месте.
schedule-settings-checkbox = Создавать коллекцию «График чтения»?
schedule-day-managed-banner = Управляется автоматически на основе ваших силлабусов. Правки здесь будут перезаписаны.
schedule-day-empty = На этот день чтений не запланировано.
schedule-window-empty = В окне графика пока нет чтений. Добавьте даты чтения к занятиям, чтобы увидеть их здесь.
schedule-no-dates = Нет дат
schedule-of-collection = из { $name }
schedule-of-collection-in-library = из { $collection } ({ $library })
schedule-open-syllabus = Открыть силлабус: { $title }
class-folder-managed-banner = Управляется автоматически на основе этого силлабуса. Правки в этой папке будут перезаписаны.

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
column-reading-instructions = Инструкции по чтению
column-status = Статус
column-reading-time = Время чтения
column-syllabus-info = Сведения силлабуса
column-class-hash = №{ $number }

# Progress / dialogs
dialog-save-export = Сохранить экспорт силлабуса
progress-import-success-title = Импорт выполнен
progress-import-success-text = Метаданные силлабуса успешно импортированы и объединены
progress-import-error-title = Ошибка импорта
progress-import-bad-file = Перетащите файл .syllabus
progress-print-preparing = Подготовка силубуса…
progress-print-failed = Не удалось сохранить силубус
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
dialog-save-pdf = Сохранить PDF силлабуса
file-filter-pdf = PDF
dialog-save-word = Сохранить силубус как Word
file-filter-word = Word
dialog-save-markdown = Сохранить силубус как Markdown
file-filter-markdown = Markdown
dialog-save-html = Сохранить силубус как HTML
file-filter-html = HTML
progress-saving-pdf = Сохранение PDF…
dialog-save-file = Сохранить файл
progress-translator-install-error = Ошибка установки сборщиков списков литературы
progress-migrate-start =
    { $count ->
        [one] Перенос { $count } силлабуса в заметки коллекций…
        [few] Перенос { $count } силлабусов в заметки коллекций…
       *[many] Перенос { $count } силлабусов в заметки коллекций…
    }
progress-migrate-item = Перенос { $current } из { $total }…
progress-migrate-done =
    { $count ->
        [one] Перенесён { $count } силлабус
        [few] Перенесено { $count } силлабуса
       *[many] Перенесено { $count } силлабусов
    }
progress-migrate-empty-cleared =
    { $count ->
        [one] Очищена { $count } пустая настройка
        [few] Очищены { $count } пустые настройки
       *[many] Очищено { $count } пустых настроек
    }
progress-migrate-not-found =
    { $count ->
        [one] { $count } коллекция не найдена
        [few] { $count } коллекции не найдены
       *[many] { $count } коллекций не найдено
    }
progress-migrate-failed = Ошибок: { $count }
progress-migrate-remaining = Осталось в настройках: { $count }
reading-time-minutes = { $minutes } мин
reading-time-hours =
    { $hours ->
        [one] { $hours } ч
        [few] { $hours } ч
       *[many] { $hours } ч
    }
reading-time-hours-and-minutes =
    { $hours ->
        [one] { $hours } ч { $minutes } мин
        [few] { $hours } ч { $minutes } мин
       *[many] { $hours } ч { $minutes } мин
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
annotations-quote-order-menu = Цитаты
annotations-quote-order-location = Место
annotations-quote-order-location-title = Упорядочивать цитаты по позиции в документе
annotations-quote-order-date-added = Добавлено
annotations-quote-order-date-added-title = Упорядочивать цитаты по дате добавления (сначала старые)
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
tree-tooltip-reading-schedule = График чтения (автоматическое управление)
tree-tooltip-auto-managed = Автоматически управляется Zotero Syllabus
tree-tooltip-syllabus = Силлабус

# User guide sample items (created at tour time; not used as match keys)
tour-sample-reading-1 = Образец чтения: Начало работы со списками курса
tour-sample-reading-2 = Образец чтения: Аннотирование по ходу чтения
tour-sample-reading-3 = Образец чтения: Планирование предстоящей недели

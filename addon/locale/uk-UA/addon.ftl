startup-begin = Додаток завантажується
startup-finish = Додаток готовий
enable-syllabus-title = Перетворити на силабус?
enable-syllabus-message = Перетворити «{ $name }» на силабус? У цій колекції буде збережено нотатку силабуса.
enable-subcollections-title = Керувати підколекціями занять?
enable-subcollections-message =
    Увімкнення цієї опції дозволяє додатку керувати дочірніми колекціями в «{ $name }». Це може вилучити або перезаписати вже наявні теки.

    Що станеться:

    • Для кожного заняття з призначеними текстами створюється або переймається одна тека, яку перейменовують відповідно до силабуса (наприклад, «Заняття 1: Назва»).

    • Заняття без призначених текстів не отримують теку. Наявні теки таких занять вилучаються.

    • Дочірні колекції, які не є цими теками занять — і які не мають власної нотатки силабуса — буде вилучено. Записи не вилучаються з бібліотеки; вони залишаються в батьківській колекції.

    • Записи в кожній теці заняття перезаписуються з нотатки силабуса. Зайві записи вилучаються лише з теки.

    • Вилучення заняття із силабуса вилучає відповідну теку.

    • Якщо ви вилучите теку заняття, в якій ще є призначені тексти, додаток створить її знову.

    Пізніше вимкнення припиняє керування теками; наявні теки залишаються на місці.

    Продовжити?
enable-reading-schedule-collection-title = Створити колекцію «Графік читання»?
enable-reading-schedule-collection-message =
    Увімкнення цієї опції створює колекцію верхнього рівня «Графік читання» в «Моя бібліотека» з текою для кожної дати читання (починаючи з 10 днів тому).

    Що станеться:

    • Теки дат створюються, перейменовуються й заповнюються автоматично на основі ваших силабусів.

    • Записи в цих теках перезаписуються з графіка. Зайві записи вилучаються лише з теки — не з бібліотеки.

    • Якщо ви вилучите колекцію або теку дати, додаток створить її знову, поки цей параметр увімкнено.

    • Силабуси з групових бібліотек не включаються (записи не можуть переходити між бібліотеками).

    Пізніше вимкнення вилучає колекцію «Графік читання» та її теки дат. Записи силабусів залишаються на місці.

    Продовжити?
disable-reading-schedule-collection-title = Вилучити колекцію «Графік читання»?
disable-reading-schedule-collection-message =
    Вимкнення цієї опції вилучає керовану колекцію «Графік читання» та її теки дат.

    Записи не вилучаються з бібліотеки; вони залишаються в початкових колекціях силабусів.

    Продовжити?
prefs-title = Zotero Syllabus
prefs-table-title = Назва
prefs-table-detail = Подробиці
tabpanel-lib-tab-label = Вкладка бібліотеки
tabpanel-reader-tab-label = Вкладка переглядача
menu-toggle-bibliography = Показати/сховати бібліографію
managed-folder-banner-title = Автоматично керована тека
managed-folder-banner-class =
    Не додавайте й не вилучайте записи тут. Ця тека заняття синхронізується із силабусом; ручні зміни буде перезаписано.
managed-folder-banner-schedule =
    Не додавайте й не вилучайте записи тут. Ця тека графіка читання синхронізується з вашими силабусами; ручні зміни буде перезаписано.
menuHelp-openUserGuide = Відкрити посібник користувача Zotero Syllabus
userGuide-start-title = Ласкаво просимо до Zotero Syllabus
userGuide-start-desc =
    Перетворіть будь-яку колекцію Zotero на список літератури курсу — організуйте за заняттями, задайте пріоритети й відстежуйте, що читати далі.
userGuide-start-close = Нагадати пізніше
userGuide-exit = Вийти з туру
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
userGuide-collection-title = Почніть із колекції
userGuide-collection-desc =
    Силабуси прив’язані до колекцій. Ми відкриємо навчальну колекцію «Екскурсія силабусом» із кількома зразками літератури.
userGuide-syllabusButton-title = Перетворити на силабус
userGuide-syllabusButton-desc =
    Натисніть «Перетворити на силабус» на панелі інструментів записів, щоб перетворити цю колекцію на план курсу. Екскурсія перемкне вигляд за вас.
userGuide-addClass-title = Додайте заняття
userGuide-addClass-desc =
    Заняття (або тижні / сесії — назви можна змінити пізніше) — це розділи силабуса. Додайте одне, щоб почати.
userGuide-assign-title = Призначте літературу
userGuide-assign-desc =
    Перетягніть записи до заняття або клацніть правою кнопкою → Призначити до заняття. Непризначені записи залишаються в розділі «Додаткова література».
userGuide-itemPane-title = Редагуйте в панелі запису
userGuide-itemPane-desc =
    Виберіть читання, щоб задати номер заняття, пріоритет, інструкції та стан виконання в розділі «Завдання з читання».
userGuide-readingDate-title = Задайте термін заняття
userGuide-readingDate-desc =
    Кожне заняття може мати дату читання. Ми задамо її для Заняття 1, коли ви натиснете «Далі» — тоді можна відкрити «Графік читання».
userGuide-readingSchedule-title = Відкрийте «Графік читання»
userGuide-readingSchedule-desc =
    «Графік читання» збирає заняття з термінами з усіх ваших силабусів. «Далі» відкриє його, щоб показати заплановане.
userGuide-readingSchedule-light-title = Open Reading Schedule
userGuide-readingSchedule-light-desc =
    The Reading Schedule tab gathers class due dates across your syllabi. Next opens it from the tab bar.
userGuide-home-title = Home view
userGuide-home-desc =
    At the library root, switch to Home for shelves of recent items and upcoming deadlines. Next selects your library home.
userGuide-subcollections-title = За бажанням: теки занять
userGuide-subcollections-desc =
    Потрібні дзеркальні теки для кожного заняття? Увімкніть «Підколекції занять» у параметрах. Залиште вимкненим, якщо додаток не має керувати дочірніми теками.
userGuide-finish-title = Усе готово
userGuide-finish-desc =
    Цю екскурсію можна знову відкрити будь-коли: Довідка → Відкрити посібник користувача Zotero Syllabus. Успіхів у навчанні!
userGuide-finish-prefs-title = You’re set
userGuide-finish-prefs-desc =
    Turn views on or off anytime in Preferences → Zotero Syllabus → Views. You can reopen this tour from Help.
userGuide-empty-title = Організуйте цю колекцію за заняттями
userGuide-empty-desc =
    Додайте заняття для кожного тижня або сесії, потім призначте літературу. Можна також пройти коротку екскурсію.
userGuide-empty-tour = Пройти екскурсію

# Shared
app-name = Zotero Syllabus
this-collection = ця колекція
untitled = Без назви
nav-back = Назад
nav-previous = Попередній
nav-next = Далі

# View tabs / toolbar
view-tab-checklist = Контрольний список
view-tab-checklist-tooltip = Показати як контрольний список
view-tab-syllabus = Силабус
view-tab-syllabus-tooltip = Показати як силабус
view-tab-create-syllabus = Перетворити на силабус
view-tab-create-syllabus-tooltip = Перетворити цю колекцію на силабус
view-tab-table = Таблиця
view-tab-table-tooltip = Показати як таблицю
view-tab-gallery = Галерея
view-tab-gallery-tooltip = Показати як галерею
view-tab-explorer = Home
view-tab-explorer-tooltip = View as Home
view-tab-reading-schedule = Графік читання
reading-schedule-desc = Class due dates across your syllabi, so you can see what’s next.
view-tab-my-annotations = Annotation Feed
toolbar-my-annotations-open = Open Annotation Feed
toolbar-reading-schedule-review = Переглянути графік читання
toolbar-reading-schedule-open = Відкрити графік читання

# Context menus
menu-set-priority = Задати пріоритет
menu-none = (Немає)
menu-assign-to-class = Призначити до заняття
menu-no-collection = (Колекцію не вибрано)
menu-class-label = { $nomenclature } { $number }
menu-add-to-new-class = Додати до { $nomenclature } { $number }
menu-set-reading-status = Задати стан читання
status-done = Виконано
status-not-done = Не виконано

# Syllabus page
page-toc-title = Зміст
placeholder-add-title = Додати назву…
page-density-cycle = Перемкнути на { $next }
page-density-row = Рядок
page-density-standard = Стандартна
page-density-expanded = Розширена
page-reader-enable = Увімкнути прапорці
page-reader-disable = Вимкнути прапорці
page-export = Експортувати файл силабуса
page-import = Імпортувати файл силабуса
page-edit-settings = Змінити параметри силабуса
page-lock = Заблокувати силабус
page-unlock = Розблокувати силабус
page-view-options-aria = Syllabus view options
page-view-checkboxes = Checkboxes
page-print = Зберегти силабус як PDF, Word, Markdown або HTML
page-save-pdf = PDF
page-save-word = Word
page-save-markdown = Markdown
page-save-html = HTML
page-publish = Publish online…
placeholder-course-code = Код курсу
placeholder-institution = Заклад освіти
placeholder-add-description = Додати опис…
page-add-class = Додати { $nomenclature } { $number }
page-add-to-class = Додати до { $nomenclature } { $number }
page-drop-create-class = Перетягніть запис сюди, щоб створити { $nomenclature } { $number }
page-drop-import-file = Перетягніть файли, щоб додати їх до цієї колекції
further-reading-heading = Додаткова література
sort-label = Сортування
further-reading-sort-aria = Сортувати додаткову літературу
sort-by-title = Назва
sort-by-creator = Автор
sort-by-date = Дата
further-reading-empty-desc = Записи в цьому розділі не призначені жодному заняттю.
toc-empty = Немає доступних занять
placeholder-url = https://
links-delete = Вилучити посилання
links-edit = Змінити посилання
links-add = Додати посилання
bibliography-heading = Бібліографія

# Class groups / cards
mark-done = Позначити як виконане
mark-not-done = Позначити як невиконане
class-due-date-label = Термін:
class-reset-sort = Скинути порядок сортування
class-move-up = Перемістити { $nomenclature } вгору
class-move-down = Перемістити { $nomenclature } вниз
class-delete = Вилучити { $nomenclature }
class-insert-here = Додати { $nomenclature } сюди
class-dropzone-hint = Перетягніть записи до { $nomenclature } { $number }
due-date-clear = Очистити термін
due-date-add = Додати термін
placeholder-select-date = Виберіть дату
item-in-publication = у { $name }
attachment-url = URL
attachment-pdf = PDF
attachment-snapshot = Знімок
attachment-epub = EPUB
attachment-html = HTML
attachment-doc = DOC
attachment-txt = TXT
attachment-zip = ZIP
attachment-file = Файл
attachment-view = Перегляд
attachment-open = Відкрити { $label }
assignment-duplicate = Створити дублікат завдання
assignment-duplicate-label = Дублювати
assignment-unassign-class = Прибрати із заняття
assignment-unassign-syllabus = Прибрати із силабуса
assignment-unassign-label = Скасувати призначення
priority-set-to = Задати пріоритет: { $name }
priority-clear = Зняти пріоритет
youtube-play = Відтворити { $title } на YouTube

# Item pane
item-pane-not-found = Запис не знайдено
item-pane-none-selected = Записи не вибрано
item-pane-n-selected = Вибрано записів: { $count }
item-pane-current-view = поточний вигляд
item-pane-also-assigned = також призначено
item-pane-assignment-n = Завдання №{ $number }
item-pane-assignment-for = для { $title }
item-pane-due = Термін { $date }
item-pane-reference-material = Довідкові матеріали
item-pane-class-named = { $nomenclature } { $number }: { $title }
item-pane-mark-done = Позначити виконаним
placeholder-class-number = напр., 1, 2, 3…
field-priority = Пріоритет
field-instructions = Інструкції
placeholder-instructions = Додайте інструкції до цього завдання…
assignment-delete = Вилучити завдання
item-pane-select-collection = Виберіть колекцію, щоб переглянути завдання силабуса

# Settings
settings-title = Параметри силабуса
settings-window-title = Налаштування: { $name }
settings-view = View
settings-view-desc = Density and checkboxes for this syllabus.
settings-density = Density
settings-file = Syllabus file
settings-file-desc = Export or import a .syllabus metadata file for this collection.
settings-back = Назад до вигляду силабуса
settings-nomenclature = Найменування
settings-nomenclature-desc = Виберіть термін для окремих занять (напр., «тиждень», «заняття», «сесія», «розділ»).
settings-singular = Форма однини
settings-nomenclature-placeholder = напр., тиждень, заняття, сесія, розділ
settings-plural-label = Форма множини:
settings-subcollections = Підколекції занять
settings-subcollections-desc = Якщо увімкнено, кожне заняття з призначеними текстами отримує теку в цій колекції.
settings-subcollections-checkbox = Створювати підколекції?
settings-bib-style = Стиль бібліографії
settings-bib-style-desc = Виберіть стиль CSL (Citation Style Language) для бібліографічних посилань.
settings-citation-style = Стиль цитування
settings-user-default = Типово для користувача
settings-user-default-named = Типово для користувача: { $name }
settings-priorities = Пріоритети
settings-priorities-desc = Налаштуйте назви, кольори та порядок пріоритетів для цієї програми.
settings-priorities-global-title = Глобальні пріоритети за замовчуванням
settings-priorities-global-desc = Нові програми копіюють ці пріоритети. Існуючі зберігають власні списки.
settings-priorities-global-link = Редагувати глобальні налаштування…
settings-priorities-global-done = Готово
settings-priorities-global-reset = Скинути до вбудованих значень
settings-priorities-set-global = Зробити глобальними за замовчуванням
settings-priorities-set-global-confirm-title = Зробити глобальними за замовчуванням?
settings-priorities-set-global-confirm-message =
    Це замінить ваші глобальні пріоритети за замовчуванням пріоритетами цієї програми. Нові програми скопіюють ці назви, кольори та порядок. Існуючі не зміняться.
settings-priorities-set-global-done = Збережено як глобальні налаштування для нових програм
settings-priorities-reset-global = Скинути до глобальних
settings-priorities-reset-global-confirm-title = Скинути до глобальних?
settings-priorities-reset-global-confirm-message =
    Це замінить пріоритети цієї програми вашими глобальними налаштуваннями. Читання з пріоритетами поза глобальним списком потрібно буде перемістити або скинути.
settings-priorities-reset-global-done = Пріоритети скинуто до глобальних налаштувань
settings-add-priority = Додати новий пріоритет
settings-add-priority-button = Додати пріоритет
settings-new-priority-name = Новий пріоритет
settings-priority-move-up = Перемістити вгору
settings-priority-move-down = Перемістити вниз
settings-priority-color = Колір пріоритету
settings-priority-name-placeholder = Назва пріоритету
settings-priority-delete = Вилучити пріоритет
settings-priority-delete-title = Видалити пріоритет?
settings-priority-delete-message =
    { $count ->
        [one] { $count } читання використовує «{ $name }». Виберіть, що з ним зробити, перш ніж видалити цей пріоритет.
       *[other] { $count } читань використовують «{ $name }». Виберіть, що з ними зробити, перш ніж видалити цей пріоритет.
    }
settings-priority-delete-migrate-label = Перемістити читання до
settings-priority-delete-migrate = Перемістити й видалити
settings-priority-delete-clear = Скинути пріоритет
settings-priority-delete-cancel = Скасувати
settings-priority-name-label = Назва
settings-priority-preview = Попередній перегляд:
priority-default-course-info = Відомості про курс
priority-default-essential = Обов’язкове
priority-default-recommended = Рекомендоване
priority-default-optional = Факультативне

# Gallery
gallery-empty-filtered = Немає відповідних записів.
gallery-empty = У цій колекції немає записів.
gallery-untagged = Без міток
gallery-untagged-desc = Записи в цьому розділі не мають міток.
gallery-uncredited = Без автора
gallery-uncredited-desc = Записи в цьому розділі не мають автора.
gallery-empty-subcollections = У цій колекції немає підколекцій і записів.
gallery-unnumbered = Без номера
gallery-unnumbered-desc = Призначено без номера заняття.
gallery-sort-auto = Авто
gallery-sort-auto-title = Автоматичний порядок (колекція або силабус)
gallery-sort-az = А–Я
gallery-sort-az-title = Сортувати А–Я
gallery-sort-date = Дата
gallery-sort-date-title = Сортувати за датою (спочатку нові)
gallery-sort-date-added = Додано
gallery-sort-date-added-title = Сортувати за датою додавання (спочатку нові)
gallery-sort-last-read = Last Read
gallery-sort-last-read-title = Sort by last read (most recent first)
gallery-group-none = Немає
gallery-group-none-title = Без групування
gallery-group-auto = Автоматично
gallery-group-auto-title = Автоматичне групування
gallery-group-type = Тип
gallery-group-type-title = Групувати за типом запису
gallery-group-creator = Автор
gallery-group-creator-title = Групувати за автором
gallery-group-tags = Мітки
gallery-group-tags-title = Групувати за мітками
gallery-group-subcollections = Підколекції
gallery-group-subcollections-title = Групувати за підколекціями
gallery-group-classes = Заняття
gallery-group-classes-title = Групувати за заняттями
gallery-layout-cover = Обкладинка
gallery-layout-cover-title = Зображення обкладинки
gallery-layout-card = Картка
gallery-layout-card-title = Картки силабуса
gallery-layout-annotations = Анотації
gallery-layout-annotations-title = Обкладинки з усіма анотаціями
gallery-annotations-empty = Немає анотацій
gallery-annotations-none-heading = Немає анотацій
gallery-annotations-show-empty = Показувати елементи без анотацій
gallery-layout-magazine = Журнал
gallery-layout-magazine-title = Журнальне компонування різних розмірів

# Gallery notes (collection-scoped child notes)
gallery-note-add = Add Gallery Note
gallery-note-edit = Edit Gallery Note
gallery-note-remove = Remove Gallery Note
gallery-note-label = Gallery note
magazine-shelf-watch = Дивитися
magazine-shelf-watch-title = Нещодавно додані відео
magazine-shelf-listen = Слухати
magazine-shelf-listen-title = Нещодавно додане аудіо
magazine-highlights = Виділення
gallery-options-aria = Параметри вигляду галереї
gallery-options-title = Параметри вигляду
gallery-menu-view = Вигляд
gallery-menu-sort = Сортування
gallery-menu-group = Групувати за
gallery-menu-type-size = Розмір тексту
gallery-type-small = Дрібний
gallery-type-small-title = Дрібніший текст журналу
gallery-type-large = Великий
gallery-type-large-title = Більший текст журналу
gallery-in-this-collection = У цій колекції
gallery-groups-nav-aria = Групи
gallery-group-jump = Показати { $name }
gallery-prefs-summary = { $layout } / { $sort } / { $group }
gallery-page-of = Сторінка { $page } з { $total }
gallery-save-globally = Зберегти як типове
gallery-save-globally-title = Зберегти цей параметр як типовий для всіх колекцій
gallery-save-globally-active-title = Параметр цієї колекції відрізняється від типового. Натисніть, щоб зберегти його як типовий.
galleryTour-settings-title = Параметри галереї
galleryTour-settings-desc =
    Відкрийте меню в куті, щоб змінити вигляд, сортування й групування. Покажемо три макети.
galleryTour-cover-title = Вигляд обкладинки
galleryTour-cover-desc =
    Обкладинка показує кожен елемент як зображення — книжки, статті й вебсторінки одразу видно.
galleryTour-magazine-title = Журнальний вигляд
galleryTour-magazine-desc =
    Журнал змішує великі й малі плитки, як зміст. Зручно гортати й читати анонси.
galleryTour-card-title = Вигляд карток
galleryTour-card-desc =
    Картки використовують той самий макет програми, згруповані за типом елемента, щоб схожі матеріали були поруч.
galleryTour-choose-title = Виберіть типове
galleryTour-choose-desc =
    З яким макетом має відкриватися Галерея? Пізніше це можна змінити в параметрах Zotero Syllabus або через «Зберегти як типове».
galleryTour-skip = Пропустити

# Reading schedule
schedule-edit-settings = Змінити параметри графіка читання
schedule-empty-title = Немає запланованих читань
schedule-empty-desc = Додайте дати читання до занять, щоб побачити їх тут.
schedule-this-week = Цього тижня
schedule-next-week = Наступного тижня
schedule-settings-title = Параметри графіка читання
schedule-settings-library = Колекція в бібліотеці
schedule-settings-desc =
    Типово вимкнено. Якщо увімкнено, у «Моя бібліотека» підтримується колекція верхнього рівня «Графік читання» з текою для кожної недавньої та майбутньої дати читання. Теки створюються, перейменовуються й заповнюються автоматично. Вимкнення вилучає цю колекцію; записи силабусів залишаються на місці.
schedule-settings-checkbox = Створювати колекцію «Графік читання»?
schedule-day-managed-banner = Керується автоматично на основі ваших силабусів. Зміни тут буде перезаписано.
schedule-day-empty = На цей день читань не заплановано.
schedule-window-empty = У вікні графіка ще немає читань. Додайте дати читання до занять, щоб побачити їх тут.
schedule-no-dates = Немає дат
schedule-of-collection = з { $name }
schedule-of-collection-in-library = з { $collection } ({ $library })
schedule-open-syllabus = Відкрити силабус: { $title }
class-folder-managed-banner = Керується автоматично на основі цього силабуса. Зміни в цій теці буде перезаписано.

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
column-reading-instructions = Інструкції з читання
column-status = Стан
column-reading-time = Час читання
column-syllabus-info = Відомості силабуса
column-class-hash = №{ $number }

# Progress / dialogs
dialog-save-export = Зберегти експорт силабуса
progress-import-success-title = Імпорт виконано
progress-import-success-text = Метадані силабуса успішно імпортовано й об’єднано
progress-import-error-title = Помилка імпорту
progress-import-bad-file = Перетягніть файл .syllabus
progress-print-preparing = Підготовка силабуса…
progress-print-failed = Не вдалося зберегти силабус
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
dialog-save-pdf = Зберегти PDF силабуса
file-filter-pdf = PDF
dialog-save-word = Зберегти силабус як Word
file-filter-word = Word
dialog-save-markdown = Зберегти силабус як Markdown
file-filter-markdown = Markdown
dialog-save-html = Зберегти силабус як HTML
file-filter-html = HTML
progress-saving-pdf = Збереження PDF…
dialog-save-file = Зберегти файл
progress-translator-install-error = Помилка встановлення збирачів списків літератури
progress-migrate-start =
    { $count ->
        [one] Перенесення { $count } силабуса до нотаток колекцій…
        [few] Перенесення { $count } силабусів до нотаток колекцій…
       *[many] Перенесення { $count } силабусів до нотаток колекцій…
    }
progress-migrate-item = Перенесення { $current } з { $total }…
progress-migrate-done =
    { $count ->
        [one] Перенесено { $count } силабус
        [few] Перенесено { $count } силабуси
       *[many] Перенесено { $count } силабусів
    }
progress-migrate-empty-cleared =
    { $count ->
        [one] Очищено { $count } порожній параметр
        [few] Очищено { $count } порожні параметри
       *[many] Очищено { $count } порожніх параметрів
    }
progress-migrate-not-found =
    { $count ->
        [one] { $count } колекцію не знайдено
        [few] { $count } колекції не знайдено
       *[many] { $count } колекцій не знайдено
    }
progress-migrate-failed = Помилок: { $count }
progress-migrate-remaining = Залишилось у параметрах: { $count }
reading-time-minutes = { $minutes } хв
reading-time-hours =
    { $hours ->
        [one] { $hours } год
        [few] { $hours } год
       *[many] { $hours } год
    }
reading-time-hours-and-minutes =
    { $hours ->
        [one] { $hours } год { $minutes } хв
        [few] { $hours } год { $minutes } хв
       *[many] { $hours } год { $minutes } хв
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
annotations-quote-order-menu = Цитати
annotations-quote-order-location = Місце
annotations-quote-order-location-title = Впорядковувати цитати за позицією в документі
annotations-quote-order-date-added = Додано
annotations-quote-order-date-added-title = Впорядковувати цитати за датою додавання (спочатку старі)
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
tree-tooltip-reading-schedule = Графік читання (автоматичне керування)
tree-tooltip-auto-managed = Автоматично керується Zotero Syllabus
tree-tooltip-syllabus = Силабус

# User guide sample items (created at tour time; not used as match keys)
tour-sample-reading-1 = Зразок читання: Початок роботи зі списками курсу
tour-sample-reading-2 = Зразок читання: Анотування під час читання
tour-sample-reading-3 = Зразок читання: Планування наступного тижня

startup-begin = الإضافة قيد التحميل
startup-finish = الإضافة جاهزة
enable-syllabus-title = تحويل إلى منهاج دراسي؟
enable-syllabus-message = هل تريد تحويل «{ $name }» إلى منهاج دراسي؟ ستُحفظ ملاحظة المنهاج في هذه المجموعة.
enable-subcollections-title = إدارة المجموعات الفرعية للمحاضرات؟
enable-subcollections-message =
    تفعيل هذا الخيار يتيح للإضافة إدارة المجموعات الفرعية ضمن «{ $name }». قد يؤدي ذلك إلى حذف المجلدات الموجودة أو إعادة كتابتها.

    ما الذي يحدث:

    • يُنشأ مجلد لكل محاضرة فيها قراءات معيّنة أو يُعتمد مجلد قائم، ويُعاد تسميته ليطابق المنهاج (على سبيل المثال «محاضرة 1: العنوان»).

    • المحاضرات بلا قراءات معيّنة لا تحصل على مجلد. تُزال المجلدات القائمة لتلك المحاضرات.

    • تُحذف المجموعات الفرعية التي ليست مجلدات محاضرات — والتي لا تحتوي على ملاحظة منهاج خاصة بها. لا تُحذف العناصر من المكتبة؛ بل تبقى في المجموعة الأصل.

    • تُستبدل عناصر كل مجلد محاضرة وفق ملاحظة المنهاج. تُزال العناصر الزائدة من المجلد فقط.

    • حذف محاضرة من المنهاج يحذف مجلد تلك المحاضرة.

    • إذا حذفت مجلد محاضرة ما زالت فيه قراءات معيّنة، تعيد الإضافة إنشاءه.

    إلغاء التفعيل لاحقًا يوقف إدارة المجلدات؛ وتبقى المجلدات الموجودة في مكانها.

    هل تريد المتابعة؟
enable-reading-schedule-collection-title = إنشاء مجموعة جدول القراءات؟
enable-reading-schedule-collection-message =
    تفعيل هذا الخيار ينشئ مجموعة علوية باسم «جدول القراءات» في مكتبتي مع مجلد لكل تاريخ قراءة (اعتبارًا من 10 أيام مضت).

    ما الذي يحدث:

    • تُنشأ مجلدات التواريخ ويُعاد تسميتها وتُملأ تلقائيًا من مناهجك.

    • تُستبدل العناصر في تلك المجلدات وفق الجدول. تُزال العناصر الزائدة من المجلد فقط — لا من المكتبة.

    • إذا حذفت المجموعة أو مجلد تاريخ، تعيد الإضافة إنشاءه ما دام هذا الإعداد مفعّلًا.

    • لا تُدرج مناهج مكتبات المجموعات (لا يمكن للعناصر عبور المكتبات).

    إلغاء التفعيل لاحقًا يحذف مجموعة «جدول القراءات» ومجلدات تواريخها. تبقى عناصر المناهج في مكانها.

    هل تريد المتابعة؟
disable-reading-schedule-collection-title = إزالة مجموعة جدول القراءات؟
disable-reading-schedule-collection-message =
    إلغاء التفعيل يحذف مجموعة «جدول القراءات» المُدارة ومجلدات تواريخها.

    لا تُحذف العناصر من مكتبتك؛ بل تبقى في مجموعات المناهج الأصلية.

    هل تريد المتابعة؟
prefs-title = Zotero Syllabus
prefs-table-title = العنوان
prefs-table-detail = التفصيل
tabpanel-lib-tab-label = تبويب المكتبة
tabpanel-reader-tab-label = تبويب القارئ
menu-toggle-bibliography = إظهار/إخفاء قائمة المراجع
managed-folder-banner-title = مجلد يُدار تلقائيًا
managed-folder-banner-class =
    لا تُضف عناصر هنا ولا تُزلها. يُزامن مجلد المحاضرة هذا مع المنهاج؛ وتُستبدل التعديلات اليدوية.
managed-folder-banner-schedule =
    لا تُضف عناصر هنا ولا تُزلها. يُزامن مجلد جدول القراءات هذا مع مناهجك؛ وتُستبدل التعديلات اليدوية.
menuHelp-openUserGuide = فتح دليل مستخدم Zotero Syllabus
userGuide-start-title = مرحبًا بك في Zotero Syllabus
userGuide-start-desc =
    حوّل أي مجموعة في Zotero إلى قائمة قراءات للمقرر — نظّمها حسب المحاضرة، وحدّد الأولويات، وتابع ما ينبغي قراءته تاليًا.
userGuide-start-close = تذكيري لاحقًا
userGuide-exit = إنهاء الجولة
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
optional-features-enabled = On
optional-features-disabled = Off
optional-features-toggle = { $state ->
    [on] On — click to turn off
   *[off] Off — click to turn on
}
optional-features-continue-title = Ready to continue
optional-features-continue-desc =
    Next we’ll walk through the views you enabled. You can change these later under Preferences → Zotero Syllabus → Views.
userGuide-collection-title = ابدأ من مجموعة
userGuide-collection-desc =
    المناهج مرتبطة بالمجموعات. سنفتح مجموعة تجريبية باسم «جولة في المنهاج» تتضمن بعض القراءات النموذجية.
userGuide-syllabusButton-title = تحويل إلى منهاج
userGuide-syllabusButton-desc =
    انقر «تحويل إلى منهاج» في شريط أدوات العناصر لتحويل هذه المجموعة إلى مخطط المقرر. ستنتقل الجولة إلى هناك نيابة عنك.
userGuide-addClass-title = إضافة محاضرة
userGuide-addClass-desc =
    المحاضرات (أو الأسابيع / الجلسات — يمكنك إعادة تسميتها لاحقًا) هي أقسام المنهاج. أضف واحدة للبدء.
userGuide-assign-title = تعيين القراءات
userGuide-assign-desc =
    اسحب العناصر إلى محاضرة، أو انقر بالزر الأيمن ← تعيين إلى محاضرة. تبقى العناصر غير المعيَّنة ضمن قراءات إضافية.
userGuide-itemPane-title = التحرير في لوحة العنصر
userGuide-itemPane-desc =
    حدد قراءة لتعيين رقم المحاضرة والأولوية والتعليمات وحالة الإنجاز في قسم تكليفات القراءة.
userGuide-readingDate-title = تعيين تاريخ استحقاق للمحاضرة
userGuide-readingDate-desc =
    يمكن أن يكون لكل محاضرة تاريخ قراءة. سنعيّن واحدًا للمحاضرة 1 عند النقر على التالي — ثم يمكنك فتح جدول القراءات.
userGuide-readingSchedule-title = فتح جدول القراءات
userGuide-readingSchedule-desc =
    يجمع جدول القراءات المحاضرات ذات تواريخ الاستحقاق عبر مناهجك. «التالي» يفتحه لترى ما هو قادم.
userGuide-readingSchedule-light-title = Open Reading Schedule
userGuide-readingSchedule-light-desc =
    The Reading Schedule tab gathers class due dates across your syllabi. Next opens it from the tab bar.
userGuide-home-title = Home view
userGuide-home-desc =
    At the library root, switch to Home for shelves of recent items and upcoming deadlines. Next selects your library home.
userGuide-subcollections-title = اختياري: مجلدات المحاضرات
userGuide-subcollections-desc =
    هل تريد مجلدات مطابقة لكل محاضرة؟ فعّل المجموعات الفرعية للمحاضرات في الإعدادات. اترك هذا معطّلًا ما لم ترد أن تدير الإضافة المجلدات الفرعية.
userGuide-finish-title = أنت جاهز
userGuide-finish-desc =
    يمكنك إعادة فتح هذه الجولة في أي وقت من مساعدة ← فتح دليل مستخدم Zotero Syllabus. نتمنى لك التوفيق في الدراسة!
userGuide-finish-prefs-title = You’re set
userGuide-finish-prefs-desc =
    Turn views on or off anytime in Preferences → Zotero Syllabus → Views. You can reopen this tour from Help.
userGuide-empty-title = تنظيم هذه المجموعة حسب المحاضرة
userGuide-empty-desc =
    أضف محاضرات لكل أسبوع أو جلسة، ثم عيّن القراءات. يمكنك أيضًا اتباع جولة إرشادية قصيرة.
userGuide-empty-tour = بدء الجولة

# Shared
app-name = Zotero Syllabus
this-collection = هذه المجموعة
untitled = بلا عنوان
nav-back = رجوع
nav-previous = السابق
nav-next = التالي

# View tabs / toolbar
view-tab-checklist = قائمة التحقق
view-tab-checklist-tooltip = العرض كقائمة تحقق
view-tab-syllabus = المنهاج
view-tab-syllabus-tooltip = العرض كمنهاج
view-tab-create-syllabus = تحويل إلى منهاج
view-tab-create-syllabus-tooltip = تحويل هذه المجموعة إلى منهاج دراسي
view-tab-table = جدول
view-tab-table-tooltip = العرض كجدول
view-tab-gallery = معرض
view-tab-gallery-tooltip = العرض كمعرض
view-tab-explorer = Home
view-tab-explorer-tooltip = View as Home
view-tab-reading-schedule = جدول القراءات
view-tab-my-annotations = My Annotations
toolbar-reading-schedule-review = مراجعة جدول القراءات
toolbar-reading-schedule-open = فتح جدول القراءات

# Context menus
menu-set-priority = تعيين الأولوية
menu-none = (لا شيء)
menu-assign-to-class = تعيين إلى محاضرة
menu-no-collection = (لم يُحدد أي مجموعة)
menu-class-label = { $nomenclature } { $number }
menu-add-to-new-class = إضافة إلى { $nomenclature } { $number } جديد
menu-set-reading-status = تعيين حالة القراءة
status-done = مكتمل
status-not-done = غير مكتمل

# Syllabus page
page-toc-title = جدول المحتويات
placeholder-add-title = أضف عنوانًا…
page-density-cycle = التبديل إلى { $next }
page-density-row = صف
page-density-standard = قياسي
page-density-expanded = موسّع
page-reader-enable = تمكين خانات الاختيار
page-reader-disable = تعطيل خانات الاختيار
page-export = تصدير ملف المنهاج
page-import = استيراد ملف المنهاج
page-edit-settings = تحرير إعدادات المنهاج
page-lock = قفل المنهاج
page-unlock = إلغاء قفل المنهاج
page-view-options-aria = Syllabus view options
page-view-checkboxes = Checkboxes
page-print = حفظ المنهاج كـ PDF أو Word أو Markdown أو HTML
page-save-pdf = PDF
page-save-word = Word
page-save-markdown = Markdown
page-save-html = HTML
page-publish = Publish online…
placeholder-course-code = رمز المقرر
placeholder-institution = المؤسسة
placeholder-add-description = أضف وصفًا…
page-add-class = إضافة { $nomenclature } { $number }
page-add-to-class = إضافة إلى { $nomenclature } { $number }
page-drop-create-class = أفلت العنصر هنا لإنشاء { $nomenclature } { $number }
page-drop-import-file = أفلت الملفات لإضافتها إلى هذه المجموعة
further-reading-heading = قراءات إضافية
sort-label = فرز
further-reading-sort-aria = فرز القراءات الإضافية
sort-by-title = العنوان
sort-by-creator = المؤلف
sort-by-date = التاريخ
further-reading-empty-desc = لم تُعيَّن عناصر هذا القسم إلى أي محاضرة.
toc-empty = لا توجد محاضرات متاحة
placeholder-url = https://
links-delete = حذف الرابط
links-edit = تحرير الرابط
links-add = إضافة رابط
bibliography-heading = قائمة المراجع

# Class groups / cards
mark-done = تعليم كمكتمل
mark-not-done = تعليم كغير مكتمل
class-due-date-label = تاريخ الاستحقاق:
class-reset-sort = إعادة ضبط ترتيب الفرز
class-move-up = نقل { $nomenclature } إلى الأعلى
class-move-down = نقل { $nomenclature } إلى الأسفل
class-delete = حذف { $nomenclature }
class-insert-here = إضافة { $nomenclature } هنا
class-dropzone-hint = اسحب العناصر إلى { $nomenclature } { $number }
due-date-clear = مسح تاريخ الاستحقاق
due-date-add = إضافة تاريخ استحقاق
placeholder-select-date = اختر تاريخًا
item-in-publication = في { $name }
attachment-url = URL
attachment-pdf = PDF
attachment-snapshot = لقطة
attachment-epub = EPUB
attachment-html = HTML
attachment-doc = DOC
attachment-txt = TXT
attachment-zip = ZIP
attachment-file = ملف
attachment-view = عرض
attachment-open = فتح { $label }
assignment-duplicate = إنشاء تكليف مكرر
assignment-duplicate-label = تكرار
assignment-unassign-class = إزالة من المحاضرة
assignment-unassign-syllabus = إزالة من المنهاج
assignment-unassign-label = إلغاء التعيين
priority-set-to = تعيين الأولوية إلى { $name }
priority-clear = مسح الأولوية
youtube-play = تشغيل { $title } على YouTube

# Item pane
item-pane-not-found = العنصر غير موجود
item-pane-none-selected = لم يُحدد أي عنصر
item-pane-n-selected = { $count } عناصر محددة
item-pane-current-view = العرض الحالي
item-pane-also-assigned = معيَّن أيضًا إلى
item-pane-assignment-n = التكليف #{ $number }
item-pane-assignment-for = لـ { $title }
item-pane-due = يستحق في { $date }
item-pane-reference-material = مواد مرجعية
item-pane-class-named = { $nomenclature } { $number }: { $title }
item-pane-mark-done = تعليم كمكتمل
placeholder-class-number = مثل: 1، 2، 3…
field-priority = الأولوية
field-instructions = التعليمات
placeholder-instructions = أضف تعليمات لهذا التكليف…
assignment-delete = حذف التكليف
item-pane-select-collection = حدد مجموعة لعرض تكليفات المنهاج

# Settings
settings-title = إعدادات المنهاج
settings-view = View
settings-view-desc = Density and checkboxes for this syllabus.
settings-density = Density
settings-file = Syllabus file
settings-file-desc = Export or import a .syllabus metadata file for this collection.
settings-back = العودة إلى عرض المنهاج
settings-nomenclature = المصطلح
settings-nomenclature-desc = اختر المصطلح المستخدم للإشارة إلى الجلسات الفردية (مثل «أسبوع»، «محاضرة»، «جلسة»، «قسم»).
settings-singular = صيغة المفرد
settings-nomenclature-placeholder = مثل: أسبوع، محاضرة، جلسة، قسم
settings-plural-label = صيغة الجمع:
settings-subcollections = المجموعات الفرعية للمحاضرات
settings-subcollections-desc = معطّل افتراضيًا. عند التمكين، تحصل كل محاضرة فيها قراءات معيّنة على مجلد ضمن هذه المجموعة. المحاضرات بلا تعيينات لا تحصل على مجلد، وتُزال تلك المجلدات. تُنشأ المجلدات ويُعاد تسميتها وتُحذف لتطابق المنهاج — بما في ذلك المجموعات الفرعية القائمة التي قد تُحذف. إلغاء التفعيل يترك المجلدات في مكانها.
settings-subcollections-checkbox = إنشاء مجموعات فرعية؟
settings-bib-style = أسلوب قائمة المراجع
settings-bib-style-desc = اختر أسلوب CSL (Citation Style Language) للمراجع الببليوغرافية. إن لم يُحدد، يُستخدم الأسلوب الافتراضي للمستخدم.
settings-citation-style = أسلوب الاستشهاد
settings-user-default = افتراضي المستخدم
settings-user-default-named = افتراضي المستخدم: { $name }
settings-priorities = الأولويات
settings-priorities-desc = خصّص أسماء الأولويات وألوانها وترتيب فرزها.
settings-add-priority = إضافة أولوية جديدة
settings-add-priority-button = إضافة أولوية
settings-new-priority-name = أولوية جديدة
settings-priority-move-up = نقل إلى الأعلى
settings-priority-move-down = نقل إلى الأسفل
settings-priority-color = لون الأولوية
settings-priority-name-placeholder = اسم الأولوية
settings-priority-delete = حذف الأولوية
settings-priority-name-label = الاسم
settings-priority-preview = معاينة:
priority-default-course-info = معلومات المقرر
priority-default-essential = أساسي
priority-default-recommended = مستحسن
priority-default-optional = اختياري

# Gallery
gallery-empty-filtered = لا توجد عناصر مطابقة.
gallery-empty = لا توجد عناصر في هذه المجموعة.
gallery-untagged = بلا وسوم
gallery-untagged-desc = عناصر هذا القسم بلا وسوم.
gallery-uncredited = بلا منشئ
gallery-uncredited-desc = عناصر هذا القسم بلا منشئ.
gallery-empty-subcollections = لا توجد مجموعات فرعية ولا عناصر في هذه المجموعة.
gallery-unnumbered = بلا رقم
gallery-unnumbered-desc = معيَّن دون رقم محاضرة.
gallery-sort-auto = تلقائي
gallery-sort-auto-title = ترتيب تلقائي (المجموعة أو المنهاج)
gallery-sort-az = أ–ي
gallery-sort-az-title = فرز أ–ي
gallery-sort-date = التاريخ
gallery-sort-date-title = الفرز حسب التاريخ (الأحدث أولًا)
gallery-sort-date-added = الإضافة
gallery-sort-date-added-title = الفرز حسب تاريخ الإضافة (الأحدث أولًا)
gallery-sort-last-read = Last Read
gallery-sort-last-read-title = Sort by last read (most recent first)
gallery-group-none = لا شيء
gallery-group-none-title = بلا تجميع
gallery-group-auto = تلقائي
gallery-group-auto-title = تجميع تلقائي
gallery-group-type = النوع
gallery-group-type-title = التجميع حسب نوع العنصر
gallery-group-creator = المنشئ
gallery-group-creator-title = التجميع حسب المنشئ
gallery-group-tags = الوسوم
gallery-group-tags-title = التجميع حسب الوسوم
gallery-group-subcollections = المجموعات الفرعية
gallery-group-subcollections-title = التجميع حسب المجموعات الفرعية
gallery-group-classes = المحاضرات
gallery-group-classes-title = التجميع حسب المحاضرات
gallery-layout-cover = الغلاف
gallery-layout-cover-title = صورة الغلاف
gallery-layout-card = بطاقة
gallery-layout-card-title = بطاقات المنهاج
gallery-layout-magazine = مجلة
gallery-layout-magazine-title = تخطيط مجلة بأحجام متنوعة
magazine-shelf-watch = مشاهدة
magazine-shelf-watch-title = فيديوهات أُضيفت مؤخرًا
magazine-shelf-listen = استماع
magazine-shelf-listen-title = صوت أُضيف مؤخرًا
magazine-highlights = تظليلات
gallery-options-aria = خيارات عرض المعرض
gallery-options-title = خيارات العرض
gallery-menu-view = العرض
gallery-menu-sort = الفرز
gallery-menu-group = التجميع حسب
gallery-menu-type-size = حجم النص
gallery-type-small = صغير
gallery-type-small-title = نص مجلة أصغر
gallery-type-large = كبير
gallery-type-large-title = نص مجلة أكبر
gallery-in-this-collection = في هذه المجموعة
gallery-groups-nav-aria = المجموعات
gallery-group-jump = عرض { $name }
gallery-prefs-summary = { $layout } / { $sort } / { $group }
gallery-page-of = الصفحة { $page } من { $total }
gallery-save-globally = حفظ كافتراضي
gallery-save-globally-title = حفظ هذا الخيار كافتراضي لجميع المجموعات
gallery-save-globally-active-title = إعداد هذه المجموعة يختلف عن الافتراضي. انقر لحفظه كافتراضي.
galleryTour-settings-title = خيارات المعرض
galleryTour-settings-desc =
    افتح القائمة في الزاوية لتغيير العرض والترتيب والتجميع. سنعرض التخطيطات الثلاثة.
galleryTour-cover-title = عرض الغلاف
galleryTour-cover-desc =
    يعرض الغلاف كل عنصر كصورة غلاف — كتب ومقالات وصفحات ويب بنظرة واحدة.
galleryTour-magazine-title = عرض المجلة
galleryTour-magazine-desc =
    المجلة تمزج بلاطات كبيرة وصغيرة، كصفحة محتويات. مناسبة للتصفح وقراءة المقدمات.
galleryTour-card-title = عرض البطاقات
galleryTour-card-desc =
    تستخدم البطاقات تخطيط المقرر نفسه، مجمّعة حسب نوع العنصر حتى تتجاور القراءات المتشابهة.
galleryTour-choose-title = اختر الافتراضي
galleryTour-choose-desc =
    بأي تخطيط يُفتح المعرض؟ يمكنك تغيير ذلك لاحقًا في تفضيلات Zotero Syllabus أو عبر حفظ كافتراضي.
galleryTour-skip = تخطي

# Reading schedule
schedule-edit-settings = تحرير إعدادات جدول القراءات
schedule-empty-title = لا توجد قراءات مجدولة
schedule-empty-desc = أضف تواريخ قراءة إلى المحاضرات لعرضها هنا.
schedule-this-week = هذا الأسبوع
schedule-next-week = الأسبوع القادم
schedule-settings-title = إعدادات جدول القراءات
schedule-settings-library = مجموعة المكتبة
schedule-settings-desc =
    معطّل افتراضيًا. عند التمكين، تُحفظ في مكتبتي مجموعة علوية باسم «جدول القراءات» مع مجلد لكل تاريخ قراءة قريب أو قادم. تُنشأ المجلدات ويُعاد تسميتها وتُملأ تلقائيًا. إلغاء التفعيل يحذف تلك المجموعة؛ وتبقى عناصر المناهج في مكانها.
schedule-settings-checkbox = إنشاء مجموعة «جدول القراءات»؟
schedule-day-managed-banner = يُدار تلقائيًا من مناهجك. تُستبدل التعديلات هنا.
schedule-day-empty = لا توجد قراءات مجدولة لهذا اليوم.
schedule-window-empty = لا توجد قراءات في نافذة الجدول بعد. أضف تواريخ قراءة إلى المحاضرات لعرضها هنا.
schedule-no-dates = لا توجد تواريخ
schedule-of-collection = من { $name }
schedule-of-collection-in-library = من { $collection } ({ $library })
schedule-open-syllabus = فتح منهاج { $title }
class-folder-managed-banner = يُدار تلقائيًا من هذا المنهاج. تُستبدل التعديلات في هذا المجلد.

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
column-reading-instructions = تعليمات القراءة
column-status = الحالة
column-reading-time = مدة القراءة
column-syllabus-info = معلومات المنهاج
column-class-hash = #{ $number }

# Progress / dialogs
dialog-save-export = حفظ تصدير المنهاج
progress-import-success-title = نجح الاستيراد
progress-import-success-text = تم استيراد بيانات المنهاج الوصفية ودمجها بنجاح
progress-import-error-title = خطأ في الاستيراد
progress-import-bad-file = يُرجى إفلات ملف .syllabus
progress-print-preparing = جارٍ تجهيز المنهاج…
progress-print-failed = تعذّر حفظ المنهاج
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
publish-html-published-at = published { $date } at { $time }
publish-html-credit = Published with { $syllabus }, a plugin for organising reading lists from items you store in { $zotero } reference manager
dialog-save-pdf = حفظ PDF للمنهاج
file-filter-pdf = PDF
dialog-save-word = حفظ المنهاج كمستند Word
file-filter-word = Word
dialog-save-markdown = حفظ المنهاج كـ Markdown
file-filter-markdown = Markdown
dialog-save-html = حفظ المنهاج كـ HTML
file-filter-html = HTML
progress-saving-pdf = جارٍ حفظ PDF…
dialog-save-file = حفظ الملف
progress-translator-install-error = خطأ في تثبيت مستخرجات قوائم القراءة
progress-migrate-start =
    { $count ->
        [one] جارٍ ترحيل منهاج دراسي واحد إلى ملاحظات المجموعة…
       *[other] جارٍ ترحيل { $count } مناهج دراسية إلى ملاحظات المجموعة…
    }
progress-migrate-item = جارٍ الترحيل { $current } من { $total }…
progress-migrate-done =
    { $count ->
        [one] تم ترحيل منهاج دراسي واحد
       *[other] تم ترحيل { $count } مناهج دراسية
    }
progress-migrate-empty-cleared =
    { $count ->
        [one] مُسح تفضيل فارغ واحد
       *[other] مُسحت { $count } تفضيلات فارغة
    }
progress-migrate-not-found =
    { $count ->
        [one] مجموعة واحدة غير موجودة
       *[other] { $count } مجموعات غير موجودة
    }
progress-migrate-failed = فشل { $count }
progress-migrate-remaining = تبقى { $count } في التفضيلات
reading-time-minutes = { $minutes } د
reading-time-hours =
    { $hours ->
        [one] ساعة واحدة
       *[other] { $hours } ساعات
    }
reading-time-hours-and-minutes =
    { $hours ->
        [one] ساعة واحدة { $minutes } د
       *[other] { $hours } ساعات { $minutes } د
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
my-annotations-desc = Annotations from items you've been reading recently.
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
tree-tooltip-reading-schedule = جدول القراءات (يُدار تلقائيًا)
tree-tooltip-auto-managed = يُدار تلقائيًا بواسطة Zotero Syllabus
tree-tooltip-syllabus = المنهاج

# User guide sample items (created at tour time; not used as match keys)
tour-sample-reading-1 = قراءة نموذجية: البدء بقوائم المقررات
tour-sample-reading-2 = قراءة نموذجية: التعليق أثناء القراءة
tour-sample-reading-3 = قراءة نموذجية: التخطيط للأسبوع القادم

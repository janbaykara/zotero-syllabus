startup-begin = Eklenti yükleniyor
startup-finish = Eklenti hazır
enable-syllabus-title = İzlenceye dönüştürülsün mü?
enable-syllabus-message = “{ $name }” izlenceye dönüştürülsün mü? Bu koleksiyonda bir izlence notu saklanacaktır.
enable-subcollections-title = Ders alt koleksiyonları yönetilsin mi?
enable-subcollections-message =
    Bunu açmak, eklentinin “{ $name }” altındaki alt koleksiyonları yönetmesine izin verir. Bu, mevcut klasörleri silebilir veya üzerine yazabilir.

    Ne olur:

    • Atanmış okuması olan her ders için bir klasör oluşturulur veya benimsenir ve izlenceyle eşleşecek biçimde yeniden adlandırılır (örneğin “Ders 1: Başlık”).

    • Atanmış okuması olmayan dersler klasör almaz. Bu derslerin mevcut klasörleri kaldırılır.

    • Bu ders klasörleri olmayan — ve kendi izlence notu bulunmayan — alt koleksiyonlar silinir. Öğeler kitaplıktan silinmez; üst koleksiyonda kalır.

    • Her ders klasöründeki öğeler izlence notundan üzerine yazılır. Klasördeki fazla öğeler yalnızca klasörden çıkarılır.

    • İzlenceden bir dersin kaldırılması, o ders klasörünü siler.

    • Hâlâ atanmış okuması olan bir ders klasörünü silerseniz eklenti onu yeniden oluşturur.

    Daha sonra kapatmak klasör yönetimini durdurur; mevcut klasörler yerinde bırakılır.

    Devam edilsin mi?
enable-reading-schedule-collection-title = Okuma Takvimi koleksiyonu oluşturulsun mu?
enable-reading-schedule-collection-message =
    Bunu açmak, Kitaplığım içinde her okuma tarihi için (10 gün öncesinden itibaren) bir klasör içeren üst düzey bir “Okuma Takvimi” koleksiyonu oluşturur.

    Ne olur:

    • Tarih klasörleri izlencelerinizden otomatik olarak oluşturulur, yeniden adlandırılır ve doldurulur.

    • Bu klasörlerdeki öğeler takvimden üzerine yazılır. Fazla öğeler yalnızca klasörden çıkarılır — kitaplıktan değil.

    • Bu ayar açıkken koleksiyonu veya bir tarih klasörünü silerseniz eklenti onu yeniden oluşturur.

    • Grup kitaplığı izlenceleri dahil edilmez (öğeler kitaplıklar arasında geçemez).

    Daha sonra kapatmak “Okuma Takvimi” koleksiyonunu ve tarih klasörlerini siler. İzlence öğeleriniz yerinde kalır.

    Devam edilsin mi?
disable-reading-schedule-collection-title = Okuma Takvimi koleksiyonu kaldırılsın mı?
disable-reading-schedule-collection-message =
    Bunu kapatmak, yönetilen “Okuma Takvimi” koleksiyonunu ve tarih klasörlerini siler.

    Öğeler kitaplığınızdan silinmez; özgün izlence koleksiyonlarında kalır.

    Devam edilsin mi?
prefs-title = Zotero Syllabus
prefs-table-title = Başlık
prefs-table-detail = Ayrıntı
tabpanel-lib-tab-label = Kitaplık sekmesi
tabpanel-reader-tab-label = Okuyucu sekmesi
menu-toggle-bibliography = Kaynakçayı aç/kapat
managed-folder-banner-title = Otomatik yönetilen klasör
managed-folder-banner-class =
    Buraya öğe eklemeyin veya çıkarmayın. Bu ders klasörü izlenceyle eşzamanlı tutulur; elle yapılan düzenlemelerin üzerine yazılır.
managed-folder-banner-schedule =
    Buraya öğe eklemeyin veya çıkarmayın. Bu okuma takvimi klasörü izlencelerinizle eşzamanlı tutulur; elle yapılan düzenlemelerin üzerine yazılır.
managed-folder-banner-pinned =
    Don’t add or remove items here. This folder mirrors items you’ve pinned; pin or unpin elsewhere to change membership.
menuHelp-openUserGuide = Zotero Syllabus Kullanıcı Kılavuzunu Aç
menuHelp-openDocumentation = Zotero Syllabus Belgeleri
menuHelp-openDiscord = Discord
menuHelp-openIssues = GitHub Issues
menuHelp-openReddit = Reddit
menuHelp-openForum = Zotero Forum
userGuide-start-title = Zotero Syllabus’a hoş geldiniz
userGuide-start-desc =
    Two ways to use a collection: Syllabus structures a course by class or week; Gallery is a reading list with covers and your own order — no classes required. Home, due dates, and an annotation feed sit alongside.
userGuide-start-close = Daha sonra hatırlat
userGuide-exit = Turu bitir
optional-features-intro-title = Choose your views
optional-features-intro-desc =
    Syllabus is for courses (classes, priorities, due dates). Gallery is for a personal reading list (covers and reading order) and does not need a syllabus. Turn on the surfaces you want — you can change them anytime in Preferences.
optional-features-syllabus-title = Syllabus view
optional-features-syllabus-desc =
    For a course: structure a collection by class or week, drag readings into place, and set priorities and instructions. Use Turn into Syllabus on the collection first.
optional-features-gallery-title = Gallery view
optional-features-gallery-desc =
    For a reading list — no classes needed: browse covers, previews, or cards and set your own reading order. Works on any collection, including ones that are also a syllabus.
optional-features-explorer-title = Home view
optional-features-explorer-desc =
    A library home with shelves for pinned items, recently read, annotations, deadlines, and more.
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
userGuide-collection-title = Bir koleksiyondan başlayın
userGuide-collection-desc =
    İzlenceler koleksiyonlarda yaşar. Birkaç örnek okuma içeren bir “İzlence Turu” deneme koleksiyonu açacağız.
userGuide-gallery-vs-syllabus-title = Gallery vs Syllabus
userGuide-gallery-vs-syllabus-desc =
    Same collection, two toolbar views. Gallery browses it as a reading list (covers and your own order). Syllabus organizes it by class or week for a course — after Turn into Syllabus. You can switch anytime; this tour continues with Syllabus.
userGuide-syllabusButton-title = İzlenceye dönüştürün
userGuide-syllabusButton-desc =
    Bu koleksiyonu ders taslağına dönüştürmek için öğe araç çubuğundaki İzlenceye dönüştür’e tıklayın. Tur sizi oraya geçirecektir.
userGuide-addClass-title = Ders ekleyin
userGuide-addClass-desc =
    Dersler (veya haftalar / oturumlar — adlarını sonra değiştirebilirsiniz) izlencenizin bölümleridir. Başlamak için bir tane ekleyin.
userGuide-assign-title = Okuma atayın
userGuide-assign-desc =
    Öğeleri bir derse sürükleyin veya sağ tıklayıp → Bir derse ata. Atanmamış öğeler Ek okumalar altında kalır.
userGuide-itemPane-title = Öğe bölmesinde düzenleyin
userGuide-itemPane-desc =
    Ders numarası, öncelik, yönergeler ve tamamlandı durumunu Okuma ödevleri bölümünde ayarlamak için bir okuma seçin.
userGuide-readingDate-title = Ders teslim tarihi belirleyin
userGuide-readingDate-desc =
    Her dersin bir okuma tarihi olabilir. İleri’ye tıkladığınızda Ders 1’e bir tarih koyacağız — ardından Okuma Takvimi’ni açabilirsiniz.
userGuide-readingSchedule-title = Okuma Takvimi’ni açın
userGuide-readingSchedule-desc =
    Okuma Takvimi, izlencelerinizdeki teslim tarihli dersleri bir araya getirir. İleri, yaklaşanları görmeniz için onu açar.
userGuide-readingSchedule-light-title = Open Reading Schedule
userGuide-readingSchedule-light-desc =
    The Reading Schedule tab gathers class due dates across your syllabi. Next opens it from the tab bar.
userGuide-home-title = Home view
userGuide-home-desc =
    At the library root, switch to Home for shelves of pinned items, recently read, and upcoming deadlines. Next selects your library home.
userGuide-subcollections-title = İsteğe bağlı: ders klasörleri
userGuide-subcollections-desc =
    Her ders için klasör yansıması ister misiniz? Ayarlar’da Ders alt koleksiyonlarını etkinleştirin. Eklentinin alt klasörleri yönetmesini istemiyorsanız kapalı bırakın.
userGuide-finish-title = Hazırsınız
userGuide-finish-desc =
    Bu turu istediğiniz zaman Yardım → Zotero Syllabus Kullanıcı Kılavuzunu Aç menüsünden yeniden açabilirsiniz. İyi çalışmalar!
userGuide-finish-community =
    Questions, bugs, or ideas? Join the conversation:
userGuide-link-discord = Discord
userGuide-link-issues = GitHub Issues
userGuide-link-forum = Zotero Forum
userGuide-link-reddit = Reddit
userGuide-finish-prefs-title = You’re set
userGuide-finish-prefs-desc =
    Turn views on or off anytime in Preferences → Zotero Syllabus → Views. You can reopen this tour from Help.
userGuide-empty-title = Bu koleksiyonu derse göre düzenleyin
userGuide-empty-desc =
    Her hafta veya oturum için ders ekleyin, ardından okuma atayın. Kısa bir rehberli tura da katılabilirsiniz.
userGuide-empty-tour = Tura katıl

# Shared
app-name = Zotero Syllabus
this-collection = bu koleksiyon
untitled = Başlıksız
nav-back = Geri
nav-previous = Önceki
nav-next = İleri

# View tabs / toolbar
view-tab-checklist = Denetim listesi
view-tab-checklist-tooltip = Denetim listesi olarak görüntüle
view-tab-syllabus = İzlence
view-tab-syllabus-tooltip = İzlence olarak görüntüle
view-tab-create-syllabus = İzlenceye dönüştür
view-tab-create-syllabus-tooltip = Bu koleksiyonu izlenceye dönüştür
view-tab-table = Tablo
view-tab-table-tooltip = Tablo olarak görüntüle
view-tab-gallery = Galeri
view-tab-gallery-tooltip = Galeri olarak görüntüle
view-tab-explorer = Home
view-tab-explorer-tooltip = View as Home
view-tab-reading-schedule = Okuma Takvimi
reading-schedule-desc = Class due dates across your syllabi, so you can see what’s next.
view-tab-my-annotations = Annotation Feed
toolbar-my-annotations-open = Open Annotation Feed
toolbar-reading-schedule-review = Okuma Takviminizi gözden geçirin
toolbar-reading-schedule-open = Okuma Takvimi’ni aç

# Context menus
menu-set-priority = Ödev önceliğini ayarla
menu-none = (Yok)
menu-assign-to-class = Bir derse ata
menu-no-collection = (Koleksiyon seçilmedi)
menu-class-label = { $nomenclature } { $number }
menu-add-to-new-class = Yeni { $nomenclature } { $number } öğesine ekle
menu-search-classes = Ders ara…
menu-set-reading-status = Okuma durumunu ayarla
status-done = Tamamlandı
status-not-done = Tamamlanmadı

# Syllabus page
page-toc-title = İçindekiler
placeholder-add-title = Başlık ekleyin…
page-density-cycle = { $next } görünümüne geç
page-density-row = Satır
page-density-standard = Standart
page-density-expanded = Genişletilmiş
page-reader-enable = Onay kutularını etkinleştir
page-reader-disable = Onay kutularını kapat
page-export = İzlence dosyasını dışa aktar
page-import = İzlence dosyasını içe aktar
page-edit-settings = İzlence ayarlarını düzenle
page-lock = İzlenceyi kilitle
page-unlock = İzlencenin kilidini aç
page-lock-search = Arama sırasında kilitli
page-view-options-aria = Syllabus view options
page-view-checkboxes = Onay kutularını göster
page-view-notes = Notları göster
page-print = Müfredatı PDF, Word, Markdown veya HTML olarak kaydet
page-save-pdf = PDF
page-save-word = Word
page-save-markdown = Markdown
page-save-html = HTML
page-publish = Publish online…
print-notes-excluded = Ders notları gizli kalır ve dahil edilmez.
placeholder-course-code = Ders kodu
placeholder-institution = Kurum
placeholder-add-description = Açıklama ekleyin…
page-add-class = { $nomenclature } { $number } ekle
page-drop-import-file = Bu koleksiyona eklemek için dosyaları bırakın
further-reading-heading = Ek okumalar
sort-label = Sırala
further-reading-sort-aria = Ek okumaları sırala
further-reading-add-readings-aria = Add items to further reading
sort-by-title = Başlık
sort-by-creator = Oluşturan
sort-by-date = Tarih
further-reading-empty-desc = Bu bölümdeki öğeler hiçbir derse atanmamıştır.
unnumbered-add-readings-aria = Add items to the unnumbered section
unnumbered-add-note-aria = Numarasız bölüme not ekle
unnumbered-dropzone-hint = Drag items here
further-reading-dropzone-hint = Drag items to { further-reading-heading }
toc-empty = Kullanılabilir ders yok
placeholder-url = https://
links-delete = Bağlantıyı sil
links-edit = Bağlantıyı düzenle
links-add = Bağlantı ekle
bibliography-heading = Kaynakça

# Class groups / cards
mark-done = Tamamlandı olarak işaretle
mark-not-done = Tamamlanmadı olarak işaretle
class-due-date-label = Teslim tarihi:
class-reset-sort = Sıralamayı sıfırla
class-move-up = { $nomenclature } ögesini yukarı taşı
class-move-down = { $nomenclature } ögesini aşağı taşı
class-delete = { $nomenclature } ögesini sil
class-insert-here = Buraya { $nomenclature } ekle
class-dropzone-hint = Öğeleri { $nomenclature } { $number } üzerine sürükleyin
class-add-readings = Add items
class-add-readings-aria = Add items to { $nomenclature } { $number }
class-add-note = Not ekle
class-add-section = Bölüm ekle
class-add-section-aria = { $nomenclature } { $number } öğesine bölüm ekle
class-section-title-placeholder = Bölüm başlığı
class-section-description-placeholder = Bölüm açıklaması ekle…
class-section-delete = Bölümü kaldır
class-section-delete-aria = Bölümü kaldır ve öğelerini derse taşı
class-section-move-up = Bölümü yukarı taşı
class-section-move-down = Bölümü aşağı taşı
class-section-dropzone-hint = Öğeleri buraya bırak
class-note-priority = Ders notu
class-note-open = Notu aç
due-date-clear = Teslim tarihini temizle
due-date-add = Teslim tarihi ekle
placeholder-select-date = Tarih seçin
item-in-publication = { $name } içinde
attachment-url = URL
attachment-pdf = PDF
attachment-snapshot = Anlık görüntü
attachment-epub = EPUB
attachment-html = HTML
attachment-doc = DOC
attachment-txt = TXT
attachment-zip = ZIP
attachment-file = Dosya
attachment-view = Görüntüle
attachment-open = { $label } aç
assignment-duplicate = Ödevin kopyasını oluştur
assignment-duplicate-label = Kopyala
assignment-edit-instructions = Okuma yönergelerini düzenle
assignment-edit-instructions-label = Yönergeler
assignment-unassign-class = Dersten çıkar
assignment-unassign-syllabus = İzlenceden çıkar
assignment-unassign-label = Atamayı kaldır
priority-set-to = Önceliği { $name } olarak ayarla
priority-clear = Önceliği temizle
priority-none = Öncelik yok
youtube-play = { $title } başlığını YouTube’da oynat

# Item pane
item-pane-not-found = Öğe bulunamadı
item-pane-none-selected = Hiçbir öğe seçilmedi
item-pane-n-selected = { $count } öğe seçildi
item-pane-current-view = geçerli görünüm
item-pane-also-assigned = ayrıca şuraya atanmış:
item-pane-assignment-n = Ödev #{ $number }
item-pane-assignment-for = { $title } için
item-pane-due = Teslim { $date }
item-pane-reference-material = Başvuru malzemesi
item-pane-class-named = { $nomenclature } { $number }: { $title }
item-pane-mark-done = Tamamlandı işaretle
placeholder-class-number = örn. 1, 2, 3…
field-priority = Öncelik
field-instructions = Yönergeler
placeholder-instructions = Bu ödev için yönerge ekleyin…
assignment-delete = Ödevi sil
item-pane-select-collection = İzlence ödevlerini görmek için bir koleksiyon seçin
item-pane-add-to-class = Bir derse ekle…
item-pane-create-assignment = Atama oluştur
item-pane-show-in-syllabus = Show in syllabus
add-to-class-window-title = Bir derse ekle
add-to-class-search = Müfredat ve ders ara
add-to-class-empty = Eşleşen ders yok
add-to-class-no-syllabi = Okumaları derslere atamak için önce bir koleksiyonu müfredata dönüştürün.
add-to-class-syllabus-in-library = { $syllabus } ({ $library })
add-to-class-choose-syllabus = Müfredat seç
add-to-class-choose-class = Ders seç
add-to-class-search-link = Ara…
add-to-class-back = Geri
add-to-class-cancel = İptal

# Settings
settings-title = İzlence Ayarları
settings-window-title = { $name } ayarları
settings-view = View
settings-view-desc = Density and checkboxes for this syllabus.
settings-density = Density
settings-file = Move or copy this syllabus
settings-file-desc = Use Zotero’s built-in RDF export and import — not a separate .syllabus file.
settings-file-zotero-rdf = To move a syllabus between libraries or machines: select the collection → File → Export Library… (or right-click → Export Collection…) as Zotero RDF, then File → Import… in the destination library. Syllabus structure travels with the collection note. Do not use a bespoke .syllabus file.
settings-back = İzlence görünümüne dön
settings-nomenclature = Adlandırma
settings-nomenclature-desc = Tekil oturumlar için kullanılacak terimi seçin (ör. “hafta”, “ders”, “oturum”, “bölüm”).
settings-singular = Tekil biçim
settings-nomenclature-placeholder = örn. hafta, ders, oturum, bölüm
settings-plural-label = Çoğul biçim:
settings-subcollections = Ders alt koleksiyonları
settings-subcollections-desc = Etkinleştirildiğinde atanmış okuması olan her ders bu koleksiyon altında bir klasör alır.
settings-subcollections-checkbox = Alt koleksiyonlar oluşturulsun mu?
settings-bib-style = Kaynakça stili
settings-bib-style-desc = Kaynakça göndermeleri için bir CSL (Citation Style Language) stili seçin.
settings-citation-style = Atıf stili
settings-user-default = Kullanıcı varsayılanı
settings-user-default-named = Kullanıcı varsayılanı: { $name }
settings-priorities = Öncelikler
settings-priorities-desc = Bu müfredat için öncelik adlarını, renklerini ve sırasını özelleştirin.
settings-priorities-global-title = Genel öncelik varsayılanları
settings-priorities-global-desc = Yeni müfredatlar bu öncelikleri kopyalar. Mevcutlar kendi listelerini korur.
settings-priorities-global-link = Genel varsayılanları düzenle…
settings-priorities-global-done = Bitti
settings-priorities-global-reset = Yerleşik varsayılanlara sıfırla
settings-priorities-set-global = Genel varsayılan olarak kullan
settings-priorities-set-global-confirm-title = Genel varsayılan olarak kullanılsın mı?
settings-priorities-set-global-confirm-message =
    Bu, genel öncelik varsayılanlarınızı bu müfredatın öncelikleriyle değiştirir. Yeni müfredatlar bu adları, renkleri ve sırayı kopyalar. Mevcut müfredatlar değişmez.
settings-priorities-set-global-done = Yeni müfredatlar için genel varsayılan olarak kaydedildi
settings-priorities-reset-global = Genel varsayılanlara sıfırla
settings-priorities-reset-global-confirm-title = Genel varsayılanlara sıfırlansın mı?
settings-priorities-reset-global-confirm-message =
    Bu, bu müfredatın önceliklerini genel varsayılanlarınızla değiştirir. Genel listede olmayan öncelikleri kullanan okumaların taşınması veya temizlenmesi gerekir.
settings-priorities-reset-global-done = Öncelikler genel varsayılanlara sıfırlandı
settings-add-priority = Yeni öncelik ekle
settings-add-priority-button = Öncelik ekle
settings-new-priority-name = Yeni öncelik
settings-priority-move-up = Yukarı taşı
settings-priority-move-down = Aşağı taşı
settings-priority-color = Öncelik rengi
settings-priority-name-placeholder = Öncelik adı
settings-priority-delete = Önceliği sil
settings-priority-delete-title = Öncelik silinsin mi?
settings-priority-delete-message =
    { $count ->
        [one] { $count } okuma “{ $name }” kullanıyor. Bu önceliği silmeden önce ne yapılacağını seçin.
       *[other] { $count } okuma “{ $name }” kullanıyor. Bu önceliği silmeden önce ne yapılacağını seçin.
    }
settings-priority-delete-migrate-label = Okumaları şuraya taşı
settings-priority-delete-migrate = Taşı ve sil
settings-priority-delete-clear = Önceliği temizle
settings-priority-delete-cancel = İptal
settings-priority-name-label = Ad
settings-priority-preview = Önizleme:
priority-default-course-info = Ders bilgisi
priority-default-essential = Zorunlu
priority-default-recommended = Önerilen
priority-default-optional = İsteğe bağlı

# Gallery
gallery-pinned-header =
    Items you’ve pinned for quick access. Pin or unpin from an item’s context menu or the Reading Schedule. Collections you pin stay on Home and Reading Schedule, not in this folder.
gallery-add-readings-aria = Add items to this collection
gallery-add-items = Add items
gallery-empty-filtered = Eşleşen öğe yok.
gallery-empty = Bu koleksiyonda öğe yok.
gallery-empty-title = Start a reading list
gallery-empty-desc =
    Add papers, books, or articles to this collection. Choose Reading order in the sort menu to arrange them, and optionally add a short description under the title.
gallery-untagged = Etiketsiz
gallery-untagged-desc = Bu bölümdeki öğelerin etiketi yoktur.
gallery-uncredited = Oluşturanı yok
gallery-uncredited-desc = Bu bölümdeki öğelerin oluşturanı yoktur.
gallery-empty-subcollections = Bu koleksiyonda alt koleksiyon veya öğe yok.
gallery-unnumbered = Numarasız
gallery-unnumbered-desc = Ders numarası olmadan atanmış.
gallery-sort-auto = Otomatik
gallery-sort-auto-title = Automatic order (reading order when set, otherwise collection order)
gallery-sort-auto-title-syllabus = Automatic order (reading order, then class, then collection)
gallery-sort-az = A–Z
gallery-sort-az-title = A–Z sırala
gallery-sort-date = Yayımlanma
gallery-sort-date-title = Yayımlanma tarihine göre sırala (yeniden eskiye)
gallery-sort-date-added = Eklendi
gallery-sort-date-added-title = Eklenme tarihine göre sırala (yeniden eskiye)
gallery-sort-personal-order = Okuma sırası
gallery-sort-personal-order-title = Kişisel okuma sırası (yeniden düzenlemek için sürükleyin)
gallery-personal-order-unordered = Sırasız
gallery-personal-order-unordered-empty = Drag items here to remove them from your reading order
gallery-personal-order-landing-label = Reading order
gallery-personal-order-landing-empty = Drag items here to set your reading order
personal-reading-order-menu-add = Koleksiyon okuma sırasına ekle
personal-reading-order-menu-remove = Koleksiyon okuma sırasından kaldır
gallery-sort-last-read = Last Read
gallery-sort-last-read-title = Sort by last read (most recent first)
gallery-group-none = Yok
gallery-group-none-title = Gruplama yok
gallery-group-auto = Otomatik
gallery-group-auto-title = Otomatik gruplama
gallery-group-type = Tür
gallery-group-type-title = Öğe türüne göre grupla
gallery-group-creator = Oluşturan
gallery-group-creator-title = Oluşturana göre grupla
gallery-group-tags = Etiketler
gallery-group-tags-title = Etiketlere göre grupla
gallery-include-automatic-tags = Otomatik etiketleri dahil et
gallery-include-automatic-tags-title = Zotero’nun anahtar sözcükler ve konularından eklediği etiketleri dahil et
gallery-group-subcollections = Alt koleksiyonlar
gallery-group-subcollections-title = Alt koleksiyonlara göre grupla
gallery-group-classes = Dersler
gallery-group-classes-title = Derslere göre grupla
gallery-layout-cover = Kapak
gallery-layout-cover-title = Kapak görseli
gallery-layout-card = Kart
gallery-layout-card-title = Reading cards
gallery-layout-annotations = Notlar
gallery-layout-annotations-title = Tüm notlarla kapaklar
gallery-annotations-empty = Not yok
gallery-annotations-none-heading = Not yok
gallery-preview-none-heading = Önizleme yok
gallery-annotations-show-empty = Notu olmayan öğeleri göster
gallery-layout-magazine = Önizleme
gallery-layout-magazine-title = Alıntı önizlemeli kapaklar
gallery-menu-packing = Packing
gallery-packing-vertical = Vertical
gallery-packing-vertical-title = Covers with abstracts in a reading stack
gallery-packing-grid = Grid
gallery-packing-grid-title = Equal-size magazine tiles
gallery-packing-packed = Packed
gallery-packing-packed-title = Mixed-size magazine layout

# Gallery notes (collection-scoped child notes)
gallery-note-add = Kişisel not ekle
gallery-note-edit = Kişisel notu düzenle
gallery-note-remove = Kişisel notu kaldır
gallery-note-label = Kişisel not
gallery-show-notes = Show personal notes
gallery-separate-done = Separate done items
gallery-separate-done-title = Show items marked done in their own section
gallery-prioritised-items =
    { $count ->
        [one] { $count } prioritised item
       *[other] { $count } prioritised items
    }
gallery-unprioritised-items =
    { $count ->
        [one] { $count } unprioritised item
       *[other] { $count } unprioritised items
    }
gallery-done-items =
    { $count ->
        [one] { $count } done item
       *[other] { $count } done items
    }
magazine-shelf-watch = İzle
magazine-shelf-watch-title = Son eklenen videolar
magazine-shelf-listen = Dinle
magazine-shelf-listen-title = Son eklenen sesler
magazine-highlights = Vurgular
magazine-blurb-open = Bu alıntıyı okuyucuda aç
gallery-options-aria = Galeri görünümü seçenekleri
gallery-options-title = Görünüm seçenekleri
gallery-menu-view = Görünüm
gallery-menu-sort = Sırala
gallery-menu-group = Grupla
gallery-menu-type-size = Metin boyutu
gallery-type-small = Küçük
gallery-type-small-title = Daha küçük önizleme metni
gallery-type-large = Büyük
gallery-type-large-title = Daha büyük önizleme metni
gallery-in-this-collection = Bu koleksiyonda
gallery-open-collection = { $name } konumuna git
gallery-groups-nav-aria = Gruplar
gallery-group-jump = { $name } göster
gallery-prefs-summary = { $layout } / { $sort } / { $group }
gallery-page-of = Sayfa { $page } / { $total }
gallery-save-globally = Varsayılan olarak kaydet
gallery-save-globally-title = Bu seçeneği tüm koleksiyonlar için varsayılan olarak kaydet
gallery-save-globally-active-title = Bu koleksiyonun ayarı varsayılandan farklı. Varsayılan olarak kaydetmek için tıklayın.
galleryTour-settings-title = Galeri seçenekleri
galleryTour-settings-desc =
    Gallery is your reading-list view for this collection (separate from Syllabus classes). Open the menu in the corner to switch layout, sort, and grouping — we’ll walk through the layouts.
galleryTour-cover-title = Kapak görünümü
galleryTour-cover-desc =
    Kapak her öğeyi kapak görseli olarak gösterir — kitaplar, makaleler ve web sayfaları bir bakışta.
galleryTour-magazine-title = Önizleme görünümü
galleryTour-magazine-desc =
    Önizleme, her kapağı alıntısının yanında gösterir — açıklamalar gibi ancak vurgu yerine özet. Önizlemesi olmayan öğeler bir kapak satırında durur.
galleryTour-card-title = Kart görünümü
galleryTour-card-desc =
    Cards show title, creators, and notes in a reading column. Here they’re grouped by item type so similar items sit together.
galleryTour-choose-title = Varsayılanı seçin
galleryTour-choose-desc =
    Galeri hangi yerleşimle açılsın? Bunu daha sonra Zotero Syllabus tercihlerinden veya Varsayılan olarak kaydet ile değiştirebilirsiniz.
galleryTour-skip = Atla

# Reading schedule
schedule-edit-settings = Okuma takvimi ayarlarını düzenle
schedule-empty-title = Planlanmış okuma yok
schedule-empty-desc = Burada görmek için derslere okuma tarihleri ekleyin.
schedule-this-week = Bu hafta
schedule-next-week = Gelecek hafta
schedule-settings-title = Okuma Takvimi Ayarları
schedule-settings-library = Kitaplık koleksiyonu
schedule-settings-checkbox = “Okuma Takvimi” koleksiyonu oluşturulsun mu?
schedule-apply-to-pinned = Pinned’e uygula
schedule-day-managed-banner = İzlencelerinizden otomatik yönetilir. Buradaki düzenlemelerin üzerine yazılır.
schedule-day-empty = Bu gün için planlanmış okuma yok.
schedule-window-empty = Takvim penceresinde henüz okuma yok. Burada görmek için derslere okuma tarihleri ekleyin.
schedule-no-dates = Tarih yok
schedule-class-named = { $nomenclature } { $number }: { $name }
schedule-of-collection = { $name } içinde
schedule-of-collection-in-library = { $collection } ({ $library }) içinde
schedule-open-syllabus = { $title } izlencesini aç
class-folder-managed-banner = Bu izlenceden otomatik yönetilir. Bu klasördeki düzenlemelerin üzerine yazılır.

# Pinned (Reading Schedule)
pinned-section-heading = Pinned
pinned-hide = Gizle
pinned-show = Göster
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
column-reading-instructions = Okuma yönergeleri
column-status = Durum
column-reading-time = Okuma süresi
column-syllabus-info = İzlence dersi / ödev
column-syllabus-priority = İzlence önceliği
column-personal-reading-order = Kişisel okuma sırası
column-class-hash = #{ $number }

# Progress / dialogs
dialog-save-export = İzlence dışa aktarımını kaydet
progress-import-success-title = İçe aktarma başarılı
progress-import-success-text = İzlence üst verileri başarıyla içe aktarıldı ve birleştirildi
progress-import-error-title = İçe aktarma hatası
progress-import-bad-file = Lütfen bir .syllabus dosyası bırakın
progress-print-preparing = Müfredat hazırlanıyor…
progress-print-failed = Müfredat kaydedilemedi
progress-publish-preparing = Preparing publish…
progress-publish-uploading = Uploading { $current } of { $total }…
progress-publish-done = Published — link copied
progress-publish-failed = Could not publish
progress-publish-failed-gallery = Could not publish the reading list
progress-publish-auth = Waiting for Zotero sign-in in your browser…
progress-publish-auth-failed = Could not sign in for publish
progress-publish-oauth-unconfigured = Publish OAuth is not set up on the server
progress-publish-unconfigured = Publish hosting is not configured
publish-error-title = Publish failed
publish-error-item-title = Item share failed
publish-error-unpublish-title = Unpublish failed
publish-error-quota = Storage quota exceeded ({ $usage } of { $quota } used). Unpublish something or share fewer attachments. To request a higher quota, email zoterosyllabus.deodorant482@passmail.net.
publish-error-object-too-large = A file is too large to upload (maximum { $max }).
publish-error-auth-expired = Sign-in expired. Try publishing again.
publish-error-auth-timeout = Sign-in timed out. Try again.
publish-error-not-signed-in = Not signed in for publish
publish-error-item-invalid = This item cannot be shared via URL
publish-error-collection-missing = Collection not found
publish-error-no-url = Publish finished without a public URL
publish-error-empty-body = Upload failed because a file was empty
publish-error-network = Could not reach the publish server. Check your connection and try again.
publish-error-http = Publish server returned an error (HTTP { $status })
publish-error-server = Publish server error ({ $detail })
publish-error-with-detail = { $summary } ({ $detail })
dialog-publish-confirm-title = Publish collection online?
dialog-publish-confirm-text = This uploads the page and attached files to a public URL. Anyone with the link can open them. Only publish materials you have the right to share.
share-wizard-title = Share collection
share-wizard-step-of = Step { $step } of { $total }: { $label }
share-wizard-step-kind = Format
share-wizard-step-view = View options
share-wizard-kind-help = Choose how recipients see this collection.
share-wizard-kind-syllabus = Syllabus
share-wizard-kind-syllabus-desc = Class-structured reading list with assignments and priorities.
share-wizard-kind-gallery = Personal reading list
share-wizard-kind-gallery-desc = Flat Gallery view — covers, cards, preview, or annotations.
share-wizard-view-help = Defaults match your current view. Change them for the public page only.
share-wizard-section-view = Default view options
share-wizard-section-data = Published data
share-wizard-include-attachments = Include attachments
share-wizard-include-attachments-title = Upload PDFs and other files and link titles to them on the public page.
share-wizard-include-annotations = Include annotations
share-wizard-include-annotations-title = Upload highlight and note text. Required for the Annotations layout on the public page.
share-wizard-confirm = Anyone with the link can open the page and files. Only publish materials you have the right to share.
share-wizard-confirm-with-annotations = Anyone with the link can open the page, files, and annotations. Only publish materials you have the right to share.
share-wizard-confirm-annotations-only = Anyone with the link can open the page and annotations (no attachment files). Only publish materials you have the right to share.
share-wizard-confirm-no-files = Anyone with the link can open the page (no attachment files). Only publish materials you have the right to share.
share-wizard-cancel = Cancel
share-wizard-back = Back
share-wizard-next = Next
share-wizard-publish = Publish
share-viewer-empty = No items to show.
share-viewer-bibliography = Bibliography
share-viewer-downloads = Downloads
share-viewer-downloads-aria = Download citations
share-viewer-options-aria = View options
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
publish-status-preparing = Preparing page and files…
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
publish-status-unpublished = Unpublished
dialog-publish-unpublish-title = Unpublish syllabus?
publish-unpublish-confirm =
    This permanently removes the online copy and attached files. Anyone with the link will see that the page is not found.
progress-publish-unpublish-failed = Could not unpublish syllabus
publish-html-download-ris = Download RIS
publish-html-download-bib = Download BibTeX
publish-html-download-rdf = Zotero RDF
publish-html-published-at = Published { $date }
publish-html-credit = Published with { $syllabus }, a plugin for organising reading lists from items you store in { $zotero } reference manager
item-share-via-url = Share via URL
item-unpublish = Unpublish shared URL
item-share-pane-multi-selected = Select a single item to share
item-share-pane-unsupported = Notes cannot be shared via URL
item-share-pane-not-shared = This item is not shared online
dialog-item-share-confirm-title = Share item online?
dialog-item-share-confirm-text = This uploads the item’s bibliographic details and attached files to a public URL. You can optionally include annotations. Anyone with the link can open them. Only share materials you have the right to share.
dialog-item-share-include-annotations = Include annotations
dialog-item-share-sync-title = Sync shared item?
dialog-item-share-sync-text = Re-upload this item’s page and files to the public URL.
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
item-share-annotations-heading = Annotations
item-share-no-files = No files attached
item-share-viewer-title = Document preview
dialog-save-pdf = İzlence PDF’sini kaydet
file-filter-pdf = PDF
dialog-save-word = Müfredatı Word olarak kaydet
file-filter-word = Word
dialog-save-markdown = Müfredatı Markdown olarak kaydet
file-filter-markdown = Markdown
dialog-save-html = Müfredatı HTML olarak kaydet
file-filter-html = HTML
progress-saving-pdf = PDF kaydediliyor…
dialog-save-file = Dosyayı kaydet
progress-translator-install-error = Okuma listesi ayıklayıcıları kurulurken hata oluştu
progress-migrate-start =
    { $count ->
        [one] { $count } izlence koleksiyon notlarına taşınıyor…
       *[other] { $count } izlence koleksiyon notlarına taşınıyor…
    }
progress-migrate-item = { $current } / { $total } taşınıyor…
progress-migrate-done =
    { $count ->
        [one] { $count } izlence taşındı
       *[other] { $count } izlence taşındı
    }
progress-migrate-empty-cleared =
    { $count ->
        [one] { $count } boş tercih temizlendi
       *[other] { $count } boş tercih temizlendi
    }
progress-migrate-not-found =
    { $count ->
        [one] { $count } koleksiyon bulunamadı
       *[other] { $count } koleksiyon bulunamadı
    }
progress-migrate-failed = { $count } başarısız
progress-migrate-remaining = tercihlerde { $count } kaldı
reading-time-minutes = { $minutes } dk
reading-time-hours =
    { $hours ->
        [one] { $hours } sa
       *[other] { $hours } sa
    }
reading-time-hours-and-minutes =
    { $hours ->
        [one] { $hours } sa { $minutes } dk
       *[other] { $hours } sa { $minutes } dk
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
explorer-shelf-pinned-desc = Items and collections you’ve pinned for quick access.
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
my-annotations-empty = No annotations
my-annotations-empty-color-filter = Seçilen renklerle eşleşen açıklama yok
my-annotations-empty-tag-filter = Seçilen etiketlerle eşleşen açıklama yok
my-annotations-empty-filters = Seçilen filtrelerle eşleşen açıklama yok
my-annotations-search-placeholder = Alıntı ve yorumlarda ara
my-annotations-search-aria = Açıklama ara
my-annotations-search-clear = Aramayı temizle
my-annotations-search-scope-aria = Search in
my-annotations-search-scope-both = Annotations and Full Text
my-annotations-search-scope-annotations = Annotations Only
my-annotations-search-scope-fulltext = Full Text Only
my-annotations-empty-search = Bu aramayla eşleşen açıklama yok
my-annotations-desc = Your highlights and notes across sources, in chronological order.
my-annotations-order-newest-last = Newest last
my-annotations-order-newest-last-title = Oldest at the top, newest at the bottom
my-annotations-order-newest-first = Newest first
my-annotations-order-newest-first-title = Newest at the top, oldest at the bottom
annotations-quote-order-menu = Notları sırala
annotations-quote-order-location = Konum
annotations-quote-order-location-title = Alıntıları belgedeki konuma göre sırala
annotations-quote-order-date-added = Eklendi
annotations-quote-order-date-added-title = Alıntıları eklenme tarihine göre sırala (en eski önce)
annotations-activity-gap-later =
    { $unit ->
        [day] { $count ->
            [one] bir gün sonra
           *[other] { $count } gün sonra
        }
        [week] { $count ->
            [one] bir hafta sonra
           *[other] { $count } hafta sonra
        }
        [month] { $count ->
            [one] bir ay sonra
           *[other] { $count } ay sonra
        }
        [year] { $count ->
            [one] bir yıl sonra
           *[other] { $count } yıl sonra
        }
       *[other] sonra
    }
annotations-activity-gap-earlier =
    { $unit ->
        [day] { $count ->
            [one] bir gün önce
           *[other] { $count } gün önce
        }
        [week] { $count ->
            [one] bir hafta önce
           *[other] { $count } hafta önce
        }
        [month] { $count ->
            [one] bir ay önce
           *[other] { $count } ay önce
        }
        [year] { $count ->
            [one] bir yıl önce
           *[other] { $count } yıl önce
        }
       *[other] önce
    }
my-annotations-load-previous = Load previous
my-annotations-load-previous-loading = Loading…
my-annotations-end = Your first annotation
my-annotations-end-search = Start of results
my-annotations-open-in-reader = Open in reader
my-annotations-area-image = Alan açıklaması görseli
my-annotations-open-feed = Açıklama akışını aç
my-annotations-isolated-for = { $title } için açıklamalar
my-annotations-show-all-items = Tüm öğelerin açıklamalarını göster
my-annotations-timeline-aria = Açıklama zaman çizelgesi
my-annotations-timeline-untitled = Açıklama
my-annotations-timeline-gap = Aylar arası boşluk
my-annotations-timeline-year-gap = Yıllar arası boşluk
my-annotations-timeline-collapse = Zaman çizelgesini daralt
my-annotations-timeline-expand = Zaman çizelgesini genişlet
my-annotations-copy = Copy
my-annotations-copied = Copied
my-annotations-copy-all = Copy all
my-annotations-options-aria = Annotation Feed options
my-annotations-menu-order = Order
my-annotations-menu-color = Renge göre filtrele
my-annotations-menu-color-clear = Renk filtresini temizle
my-annotations-menu-tag = Etikete göre filtrele
my-annotations-menu-tag-clear = Etiket filtresini temizle
my-annotations-menu-tag-add = Etiket ekle
my-annotations-menu-tag-remove = “{ $tag }” etiketini kaldır
my-annotations-color-swatch = { $color }
my-annotations-color-yellow = Sarı
my-annotations-color-light-yellow = Açık sarı
my-annotations-color-red = Kırmızı
my-annotations-color-green = Yeşil
my-annotations-color-blue = Mavi
my-annotations-color-purple = Mor
my-annotations-color-magenta = Magenta
my-annotations-color-orange = Turuncu
my-annotations-color-gray = Gri
my-annotations-menu-copy = Copy
my-annotations-menu-copy-desc = Applied when copying annotations from this feed.
my-annotations-copy-blockquote = Prefix with Markdown blockquotes (>)
my-annotations-copy-cite-key = Append Pandoc cite keys ({"[@…]"})
my-annotations-page = p. { $page }
my-annotations-stream-tags-aria = Etiketler
my-annotations-batch-aria = Toplu ek açıklama eylemleri
my-annotations-batch-selected =
    { $count ->
        [one] { $count } seçildi
       *[other] { $count } seçildi
    }
my-annotations-batch-select = Ek açıklamayı seç
my-annotations-batch-tag = Etiketle
my-annotations-batch-tag-placeholder = Etiket adı
my-annotations-batch-tag-apply = Uygula
my-annotations-batch-untag = Etiketi kaldır
my-annotations-batch-untag-empty = Seçili ek açıklamalarda etiket yok
my-annotations-batch-untag-tag = “{ $tag }” etiketini kaldır
my-annotations-batch-recolour = Yeniden renklendir
my-annotations-batch-recolour-swatch = { $color } olarak renklendir
my-annotations-batch-clear = Tüm seçimi kaldır
my-annotations-related =
    { $count ->
        [one] { $count } İlişkili
       *[other] { $count } İlişkili
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
tree-tooltip-reading-schedule = Okuma Takvimi (otomatik yönetilir)
tree-tooltip-auto-managed = Zotero Syllabus tarafından otomatik yönetilir
tree-tooltip-syllabus = İzlence

# User guide sample items (created at tour time; not used as match keys)
tour-sample-reading-1 = Örnek okuma: Ders listelerine giriş
tour-sample-reading-2 = Örnek okuma: Okurken not düşmek
tour-sample-reading-3 = Örnek okuma: Haftayı planlamak

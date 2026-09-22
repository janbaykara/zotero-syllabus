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
menuHelp-openUserGuide = Zotero Syllabus Kullanıcı Kılavuzunu Aç
userGuide-start-title = Zotero Syllabus’a hoş geldiniz
userGuide-start-desc =
    Herhangi bir Zotero koleksiyonunu ders okuma listesine dönüştürün — derslere göre düzenleyin, öncelikleri belirleyin ve sıradaki okumayı izleyin.
userGuide-start-close = Daha sonra hatırlat
userGuide-exit = Turu bitir
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
userGuide-collection-title = Bir koleksiyondan başlayın
userGuide-collection-desc =
    İzlenceler koleksiyonlarda yaşar. Birkaç örnek okuma içeren bir “İzlence Turu” deneme koleksiyonu açacağız.
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
    At the library root, switch to Home for shelves of recent items and upcoming deadlines. Next selects your library home.
userGuide-subcollections-title = İsteğe bağlı: ders klasörleri
userGuide-subcollections-desc =
    Her ders için klasör yansıması ister misiniz? Ayarlar’da Ders alt koleksiyonlarını etkinleştirin. Eklentinin alt klasörleri yönetmesini istemiyorsanız kapalı bırakın.
userGuide-finish-title = Hazırsınız
userGuide-finish-desc =
    Bu turu istediğiniz zaman Yardım → Zotero Syllabus Kullanıcı Kılavuzunu Aç menüsünden yeniden açabilirsiniz. İyi çalışmalar!
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
menu-set-priority = Öncelik ayarla
menu-none = (Yok)
menu-assign-to-class = Bir derse ata
menu-no-collection = (Koleksiyon seçilmedi)
menu-class-label = { $nomenclature } { $number }
menu-add-to-new-class = Yeni { $nomenclature } { $number } öğesine ekle
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
page-view-options-aria = Syllabus view options
page-view-checkboxes = Checkboxes
page-print = Müfredatı PDF, Word, Markdown veya HTML olarak kaydet
page-save-pdf = PDF
page-save-word = Word
page-save-markdown = Markdown
page-save-html = HTML
page-publish = Publish online…
placeholder-course-code = Ders kodu
placeholder-institution = Kurum
placeholder-add-description = Açıklama ekleyin…
page-add-class = { $nomenclature } { $number } ekle
page-add-to-class = { $nomenclature } { $number } öğesine ekle
page-drop-create-class = { $nomenclature } { $number } oluşturmak için öğeyi buraya bırakın
page-drop-import-file = Bu koleksiyona eklemek için dosyaları bırakın
further-reading-heading = Ek okumalar
sort-label = Sırala
further-reading-sort-aria = Ek okumaları sırala
sort-by-title = Başlık
sort-by-creator = Oluşturan
sort-by-date = Tarih
further-reading-empty-desc = Bu bölümdeki öğeler hiçbir derse atanmamıştır.
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
assignment-unassign-class = Dersten çıkar
assignment-unassign-syllabus = İzlenceden çıkar
assignment-unassign-label = Atamayı kaldır
priority-set-to = Önceliği { $name } olarak ayarla
priority-clear = Önceliği temizle
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

# Settings
settings-title = İzlence Ayarları
settings-window-title = { $name } ayarları
settings-view = View
settings-view-desc = Density and checkboxes for this syllabus.
settings-density = Density
settings-file = Syllabus file
settings-file-desc = Export or import a .syllabus metadata file for this collection.
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
gallery-empty-filtered = Eşleşen öğe yok.
gallery-empty = Bu koleksiyonda öğe yok.
gallery-untagged = Etiketsiz
gallery-untagged-desc = Bu bölümdeki öğelerin etiketi yoktur.
gallery-uncredited = Oluşturanı yok
gallery-uncredited-desc = Bu bölümdeki öğelerin oluşturanı yoktur.
gallery-empty-subcollections = Bu koleksiyonda alt koleksiyon veya öğe yok.
gallery-unnumbered = Numarasız
gallery-unnumbered-desc = Ders numarası olmadan atanmış.
gallery-sort-auto = Otomatik
gallery-sort-auto-title = Otomatik sıra (koleksiyon veya izlence)
gallery-sort-az = A–Z
gallery-sort-az-title = A–Z sırala
gallery-sort-date = Tarih
gallery-sort-date-title = Tarihe göre sırala (yeniden eskiye)
gallery-sort-date-added = Eklendi
gallery-sort-date-added-title = Eklenme tarihine göre sırala (yeniden eskiye)
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
gallery-group-subcollections = Alt koleksiyonlar
gallery-group-subcollections-title = Alt koleksiyonlara göre grupla
gallery-group-classes = Dersler
gallery-group-classes-title = Derslere göre grupla
gallery-layout-cover = Kapak
gallery-layout-cover-title = Kapak görseli
gallery-layout-card = Kart
gallery-layout-card-title = İzlence kartları
gallery-layout-annotations = Notlar
gallery-layout-annotations-title = Tüm notlarla kapaklar
gallery-annotations-empty = Not yok
gallery-annotations-none-heading = Notu olmayan öğeler
gallery-layout-magazine = Magazin
gallery-layout-magazine-title = Karışık boyutlu magazin düzeni

# Gallery notes (collection-scoped child notes)
gallery-note-add = Add Gallery Note
gallery-note-edit = Edit Gallery Note
gallery-note-remove = Remove Gallery Note
gallery-note-label = Gallery note
magazine-shelf-watch = İzle
magazine-shelf-watch-title = Son eklenen videolar
magazine-shelf-listen = Dinle
magazine-shelf-listen-title = Son eklenen sesler
magazine-highlights = Vurgular
gallery-options-aria = Galeri görünümü seçenekleri
gallery-options-title = Görünüm seçenekleri
gallery-menu-view = Görünüm
gallery-menu-sort = Sırala
gallery-menu-group = Grupla
gallery-menu-type-size = Metin boyutu
gallery-type-small = Küçük
gallery-type-small-title = Daha küçük magazin metni
gallery-type-large = Büyük
gallery-type-large-title = Daha büyük magazin metni
gallery-in-this-collection = Bu koleksiyonda
gallery-groups-nav-aria = Gruplar
gallery-group-jump = { $name } göster
gallery-prefs-summary = { $layout } / { $sort } / { $group }
gallery-page-of = Sayfa { $page } / { $total }
gallery-save-globally = Varsayılan olarak kaydet
gallery-save-globally-title = Bu seçeneği tüm koleksiyonlar için varsayılan olarak kaydet
gallery-save-globally-active-title = Bu koleksiyonun ayarı varsayılandan farklı. Varsayılan olarak kaydetmek için tıklayın.
galleryTour-settings-title = Galeri seçenekleri
galleryTour-settings-desc =
    Görünümü, sıralamayı ve gruplamayı değiştirmek için köşedeki menüyü açın. Üç yerleşimi sırayla göstereceğiz.
galleryTour-cover-title = Kapak görünümü
galleryTour-cover-desc =
    Kapak her öğeyi kapak görseli olarak gösterir — kitaplar, makaleler ve web sayfaları bir bakışta.
galleryTour-magazine-title = Magazin görünümü
galleryTour-magazine-desc =
    Magazin büyük ve küçük döşemeleri karıştırır, içindekiler sayfası gibi. Göz atmak ve kısa metinleri okumak için iyidir.
galleryTour-card-title = Kart görünümü
galleryTour-card-desc =
    Kartlar aynı müfredat yerleşimini kullanır, öğe türüne göre gruplanır böylece benzer okumalar bir arada durur.
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
schedule-settings-desc =
    Varsayılan olarak kapalıdır. Etkinleştirildiğinde Kitaplığım içinde her yakın ve yaklaşan okuma tarihi için bir klasör içeren üst düzey bir “Okuma Takvimi” koleksiyonu tutulur. Klasörler otomatik olarak oluşturulur, yeniden adlandırılır ve doldurulur. Kapatmak bu koleksiyonu siler; izlence öğeleri yerinde kalır.
schedule-settings-checkbox = “Okuma Takvimi” koleksiyonu oluşturulsun mu?
schedule-day-managed-banner = İzlencelerinizden otomatik yönetilir. Buradaki düzenlemelerin üzerine yazılır.
schedule-day-empty = Bu gün için planlanmış okuma yok.
schedule-window-empty = Takvim penceresinde henüz okuma yok. Burada görmek için derslere okuma tarihleri ekleyin.
schedule-no-dates = Tarih yok
schedule-of-collection = { $name } koleksiyonundan
schedule-of-collection-in-library = { $collection } koleksiyonundan ({ $library })
schedule-open-syllabus = { $title } izlencesini aç
class-folder-managed-banner = Bu izlenceden otomatik yönetilir. Bu klasördeki düzenlemelerin üzerine yazılır.

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
column-reading-instructions = Okuma yönergeleri
column-status = Durum
column-reading-time = Okuma süresi
column-syllabus-info = İzlence bilgisi
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
annotations-quote-order-menu = Alıntılar
annotations-quote-order-location = Konum
annotations-quote-order-location-title = Alıntıları belgedeki konuma göre sırala
annotations-quote-order-date-added = Eklendi
annotations-quote-order-date-added-title = Alıntıları eklenme tarihine göre sırala (en eski önce)
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
tree-tooltip-reading-schedule = Okuma Takvimi (otomatik yönetilir)
tree-tooltip-auto-managed = Zotero Syllabus tarafından otomatik yönetilir
tree-tooltip-syllabus = İzlence

# User guide sample items (created at tour time; not used as match keys)
tour-sample-reading-1 = Örnek okuma: Ders listelerine giriş
tour-sample-reading-2 = Örnek okuma: Okurken not düşmek
tour-sample-reading-3 = Örnek okuma: Haftayı planlamak

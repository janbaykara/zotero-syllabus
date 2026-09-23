startup-begin = Tiện ích đang tải
startup-finish = Tiện ích đã sẵn sàng
enable-syllabus-title = Chuyển thành đề cương?
enable-syllabus-message = Chuyển “{ $name }” thành đề cương? Một ghi chú đề cương sẽ được lưu trong bộ sưu tập này.
enable-subcollections-title = Quản lý bộ sưu tập con của buổi học?
enable-subcollections-message =
    Bật tùy chọn này cho phép tiện ích quản lý các bộ sưu tập con trong “{ $name }”. Việc đó có thể xóa hoặc ghi đè các thư mục bạn đã có.

    Điều gì xảy ra:

    • Mỗi buổi học có bài đọc được gán sẽ được tạo hoặc nhận một thư mục, rồi đổi tên cho khớp với đề cương (ví dụ “Buổi 1: Tiêu đề”).

    • Các buổi không có bài đọc được gán không có thư mục. Thư mục sẵn có của những buổi đó sẽ bị gỡ.

    • Các bộ sưu tập con không phải thư mục buổi học — và không có ghi chú đề cương riêng — sẽ bị xóa. Mục không bị xóa khỏi thư viện; chúng vẫn nằm trong bộ sưu tập cha.

    • Các mục trong mỗi thư mục buổi học bị ghi đè từ ghi chú đề cương. Mục thừa trong thư mục chỉ bị gỡ khỏi thư mục đó.

    • Xóa một buổi học khỏi đề cương sẽ xóa thư mục buổi học đó.

    • Nếu bạn xóa thư mục buổi học vẫn còn bài đọc được gán, tiện ích sẽ tạo lại.

    Tắt sau này sẽ ngừng quản lý thư mục; các thư mục hiện có được giữ nguyên.

    Tiếp tục?
enable-reading-schedule-collection-title = Tạo bộ sưu tập Lịch đọc?
enable-reading-schedule-collection-message =
    Bật tùy chọn này tạo bộ sưu tập cấp cao “Lịch đọc” trong Thư viện của tôi với một thư mục cho mỗi ngày đọc (từ 10 ngày trước trở đi).

    Điều gì xảy ra:

    • Thư mục ngày được tạo, đổi tên và điền tự động từ các đề cương của bạn.

    • Các mục trong những thư mục đó bị ghi đè từ lịch. Mục thừa chỉ bị gỡ khỏi thư mục — không khỏi thư viện.

    • Nếu bạn xóa bộ sưu tập hoặc thư mục ngày, tiện ích sẽ tạo lại khi tùy chọn này còn bật.

    • Đề cương trong thư viện nhóm không được đưa vào (mục không thể chuyển giữa các thư viện).

    Tắt sau này sẽ xóa bộ sưu tập “Lịch đọc” và các thư mục ngày. Mục đề cương của bạn vẫn được giữ.

    Tiếp tục?
disable-reading-schedule-collection-title = Gỡ bộ sưu tập Lịch đọc?
disable-reading-schedule-collection-message =
    Tắt tùy chọn này sẽ xóa bộ sưu tập “Lịch đọc” do tiện ích quản lý và các thư mục ngày.

    Mục không bị xóa khỏi thư viện; chúng vẫn nằm trong bộ sưu tập đề cương ban đầu.

    Tiếp tục?
prefs-title = Zotero Syllabus
prefs-table-title = Tiêu đề
prefs-table-detail = Chi tiết
tabpanel-lib-tab-label = Thẻ thư viện
tabpanel-reader-tab-label = Thẻ trình đọc
menu-toggle-bibliography = Hiện/ẩn thư mục tài liệu
managed-folder-banner-title = Thư mục tự quản lý
managed-folder-banner-class =
    Đừng thêm hoặc gỡ mục tại đây. Thư mục buổi học này được đồng bộ với đề cương; chỉnh sửa thủ công sẽ bị ghi đè.
managed-folder-banner-schedule =
    Đừng thêm hoặc gỡ mục tại đây. Thư mục lịch đọc này được đồng bộ với các đề cương của bạn; chỉnh sửa thủ công sẽ bị ghi đè.
menuHelp-openUserGuide = Mở hướng dẫn sử dụng Zotero Syllabus
menuHelp-openDocumentation = Tài liệu Zotero Syllabus
userGuide-start-title = Chào mừng đến với Zotero Syllabus
userGuide-start-desc =
    Biến bất kỳ bộ sưu tập Zotero nào thành danh sách đọc học phần — sắp xếp theo buổi học, đặt mức ưu tiên và theo dõi bài cần đọc tiếp.
userGuide-start-close = Nhắc tôi sau
userGuide-exit = Thoát hướng dẫn
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
userGuide-collection-title = Bắt đầu từ một bộ sưu tập
userGuide-collection-desc =
    Đề cương gắn với bộ sưu tập. Chúng tôi sẽ mở bộ sưu tập luyện tập “Tour đề cương” với một vài bài đọc mẫu.
userGuide-syllabusButton-title = Chuyển thành đề cương
userGuide-syllabusButton-desc =
    Nhấp Chuyển thành đề cương trên thanh công cụ mục để chuyển bộ sưu tập này thành dàn ý học phần. Tour sẽ chuyển sang đó giúp bạn.
userGuide-addClass-title = Thêm buổi học
userGuide-addClass-desc =
    Buổi học (hoặc tuần / phiên — bạn có thể đổi tên sau) là các phần của đề cương. Thêm một buổi để bắt đầu.
userGuide-assign-title = Gán bài đọc
userGuide-assign-desc =
    Kéo mục vào một buổi học, hoặc nhấp phải → Gán vào buổi học. Mục chưa gán nằm trong Đọc thêm.
userGuide-itemPane-title = Sửa trong ngăn mục
userGuide-itemPane-desc =
    Chọn một bài đọc để đặt số buổi, mức ưu tiên, hướng dẫn và trạng thái hoàn thành trong phần Bài tập đọc.
userGuide-readingDate-title = Đặt hạn cho buổi học
userGuide-readingDate-desc =
    Mỗi buổi học có thể có ngày đọc. Chúng tôi sẽ đặt một ngày cho Buổi 1 khi bạn nhấp Tiếp — rồi bạn có thể mở Lịch đọc.
userGuide-readingSchedule-title = Mở Lịch đọc
userGuide-readingSchedule-desc =
    Lịch đọc tập hợp các buổi học có hạn trên mọi đề cương. Tiếp sẽ mở lịch để bạn thấy những gì sắp tới.
userGuide-readingSchedule-light-title = Open Reading Schedule
userGuide-readingSchedule-light-desc =
    The Reading Schedule tab gathers class due dates across your syllabi. Next opens it from the tab bar.
userGuide-home-title = Home view
userGuide-home-desc =
    At the library root, switch to Home for shelves of recent items and upcoming deadlines. Next selects your library home.
userGuide-subcollections-title = Tùy chọn: thư mục buổi học
userGuide-subcollections-desc =
    Muốn thư mục gương cho từng buổi? Bật Bộ sưu tập con buổi học trong Cài đặt. Để tắt trừ khi bạn muốn tiện ích quản lý thư mục con.
userGuide-finish-title = Bạn đã sẵn sàng
userGuide-finish-desc =
    Mở lại tour này bất cứ lúc nào từ Trợ giúp → Mở hướng dẫn sử dụng Zotero Syllabus. Chúc bạn học tốt!
userGuide-finish-prefs-title = You’re set
userGuide-finish-prefs-desc =
    Turn views on or off anytime in Preferences → Zotero Syllabus → Views. You can reopen this tour from Help.
userGuide-empty-title = Tổ chức bộ sưu tập này theo buổi học
userGuide-empty-desc =
    Thêm buổi học cho từng tuần hoặc phiên, rồi gán bài đọc. Bạn cũng có thể làm một tour hướng dẫn ngắn.
userGuide-empty-tour = Làm tour

# Shared
app-name = Zotero Syllabus
this-collection = bộ sưu tập này
untitled = Không có tiêu đề
nav-back = Quay lại
nav-previous = Trước
nav-next = Tiếp

# View tabs / toolbar
view-tab-checklist = Danh sách kiểm
view-tab-checklist-tooltip = Xem dạng danh sách kiểm
view-tab-syllabus = Đề cương
view-tab-syllabus-tooltip = Xem dạng đề cương
view-tab-create-syllabus = Chuyển thành đề cương
view-tab-create-syllabus-tooltip = Chuyển bộ sưu tập này thành đề cương
view-tab-table = Bảng
view-tab-table-tooltip = Xem dạng bảng
view-tab-gallery = Thư viện ảnh
view-tab-gallery-tooltip = Xem dạng thư viện ảnh
view-tab-explorer = Home
view-tab-explorer-tooltip = View as Home
view-tab-reading-schedule = Lịch đọc
reading-schedule-desc = Class due dates across your syllabi, so you can see what’s next.
view-tab-my-annotations = Annotation Feed
toolbar-my-annotations-open = Open Annotation Feed
toolbar-reading-schedule-review = Xem lại Lịch đọc
toolbar-reading-schedule-open = Mở Lịch đọc

# Context menus
menu-set-priority = Đặt mức ưu tiên
menu-none = (Không)
menu-assign-to-class = Gán vào buổi học
menu-no-collection = (Chưa chọn bộ sưu tập)
menu-class-label = { $nomenclature } { $number }
menu-add-to-new-class = Thêm vào { $nomenclature } { $number } mới
menu-set-reading-status = Đặt trạng thái đọc
status-done = Đã xong
status-not-done = Chưa xong

# Syllabus page
page-toc-title = Mục lục
placeholder-add-title = Thêm tiêu đề…
page-density-cycle = Chuyển sang { $next }
page-density-row = Hàng
page-density-standard = Tiêu chuẩn
page-density-expanded = Mở rộng
page-reader-enable = Bật hộp kiểm
page-reader-disable = Tắt hộp kiểm
page-export = Xuất tệp đề cương
page-import = Nhập tệp đề cương
page-edit-settings = Sửa cài đặt đề cương
page-lock = Khóa đề cương
page-unlock = Mở khóa đề cương
page-view-options-aria = Syllabus view options
page-view-checkboxes = Checkboxes
page-print = Lưu đề cương dưới dạng PDF, Word, Markdown hoặc HTML
page-save-pdf = PDF
page-save-word = Word
page-save-markdown = Markdown
page-save-html = HTML
page-publish = Publish online…
placeholder-course-code = Mã học phần
placeholder-institution = Cơ sở đào tạo
placeholder-add-description = Thêm mô tả…
page-add-class = Thêm { $nomenclature } { $number }
page-add-to-class = Thêm vào { $nomenclature } { $number }
page-drop-create-class = Thả mục vào đây để tạo { $nomenclature } { $number }
page-drop-import-file = Thả tệp để thêm vào bộ sưu tập này
further-reading-heading = Đọc thêm
sort-label = Sắp xếp
further-reading-sort-aria = Sắp xếp phần đọc thêm
sort-by-title = Tiêu đề
sort-by-creator = Tác giả
sort-by-date = Ngày
further-reading-empty-desc = Các mục trong phần này chưa được gán vào buổi học nào.
toc-empty = Không có buổi học
placeholder-url = https://
links-delete = Xóa liên kết
links-edit = Sửa liên kết
links-add = Thêm liên kết
bibliography-heading = Thư mục tài liệu

# Class groups / cards
mark-done = Đánh dấu đã xong
mark-not-done = Đánh dấu chưa xong
class-due-date-label = Hạn:
class-reset-sort = Đặt lại thứ tự sắp xếp
class-move-up = Chuyển { $nomenclature } lên
class-move-down = Chuyển { $nomenclature } xuống
class-delete = Xóa { $nomenclature }
class-insert-here = Thêm { $nomenclature } tại đây
class-dropzone-hint = Kéo mục vào { $nomenclature } { $number }
due-date-clear = Xóa hạn
due-date-add = Thêm hạn
placeholder-select-date = Chọn ngày
item-in-publication = trong { $name }
attachment-url = URL
attachment-pdf = PDF
attachment-snapshot = Ảnh chụp
attachment-epub = EPUB
attachment-html = HTML
attachment-doc = DOC
attachment-txt = TXT
attachment-zip = ZIP
attachment-file = Tệp
attachment-view = Xem
attachment-open = Mở { $label }
assignment-duplicate = Tạo bài tập trùng
assignment-duplicate-label = Nhân bản
assignment-unassign-class = Gỡ khỏi buổi học
assignment-unassign-syllabus = Gỡ khỏi đề cương
assignment-unassign-label = Bỏ gán
priority-set-to = Đặt mức ưu tiên thành { $name }
priority-clear = Xóa mức ưu tiên
youtube-play = Phát { $title } trên YouTube

# Item pane
item-pane-not-found = Không tìm thấy mục
item-pane-none-selected = Chưa chọn mục nào
item-pane-n-selected = Đã chọn { $count } mục
item-pane-current-view = chế độ xem hiện tại
item-pane-also-assigned = cũng được gán vào
item-pane-assignment-n = Bài tập #{ $number }
item-pane-assignment-for = cho { $title }
item-pane-due = Hạn { $date }
item-pane-reference-material = Tài liệu tham khảo
item-pane-class-named = { $nomenclature } { $number }: { $title }
item-pane-mark-done = Đánh dấu xong
placeholder-class-number = vd. 1, 2, 3…
field-priority = Mức ưu tiên
field-instructions = Hướng dẫn
placeholder-instructions = Thêm hướng dẫn cho bài tập này…
assignment-delete = Xóa bài tập
item-pane-select-collection = Chọn một bộ sưu tập để xem bài tập đề cương

# Settings
settings-title = Cài đặt đề cương
settings-window-title = Cài đặt cho { $name }
settings-view = View
settings-view-desc = Density and checkboxes for this syllabus.
settings-density = Density
settings-file = Syllabus file
settings-file-desc = Export or import a .syllabus metadata file for this collection.
settings-back = Quay lại chế độ xem đề cương
settings-nomenclature = Cách gọi
settings-nomenclature-desc = Chọn thuật ngữ dùng cho từng buổi (vd. “tuần”, “buổi học”, “phiên”, “phần”).
settings-singular = Dạng số ít
settings-nomenclature-placeholder = vd. tuần, buổi học, phiên, phần
settings-plural-label = Dạng số nhiều:
settings-subcollections = Bộ sưu tập con buổi học
settings-subcollections-desc = Khi bật, mỗi buổi học có bài đọc được gán có một thư mục trong bộ sưu tập này.
settings-subcollections-checkbox = Tạo bộ sưu tập con?
settings-bib-style = Phong cách thư mục
settings-bib-style-desc = Chọn phong cách CSL (Citation Style Language) cho tài liệu tham khảo.
settings-citation-style = Phong cách trích dẫn
settings-user-default = Mặc định người dùng
settings-user-default-named = Mặc định người dùng: { $name }
settings-priorities = Mức ưu tiên
settings-priorities-desc = Tùy chỉnh tên, màu và thứ tự ưu tiên cho đề cương này.
settings-priorities-global-title = Ưu tiên mặc định toàn cục
settings-priorities-global-desc = Đề cương mới sẽ sao chép các ưu tiên này. Đề cương hiện có giữ danh sách riêng.
settings-priorities-global-link = Chỉnh mặc định toàn cục…
settings-priorities-global-done = Xong
settings-priorities-global-reset = Đặt lại về mặc định tích hợp
settings-priorities-set-global = Dùng làm mặc định toàn cục
settings-priorities-set-global-confirm-title = Dùng làm mặc định toàn cục?
settings-priorities-set-global-confirm-message =
    Thao tác này sẽ thay mặc định ưu tiên toàn cục bằng ưu tiên của đề cương này. Đề cương mới sẽ sao chép tên, màu và thứ tự này. Đề cương hiện có không đổi.
settings-priorities-set-global-done = Đã lưu làm mặc định toàn cục cho đề cương mới
settings-priorities-reset-global = Đặt lại về mặc định toàn cục
settings-priorities-reset-global-confirm-title = Đặt lại về mặc định toàn cục?
settings-priorities-reset-global-confirm-message =
    Thao tác này sẽ thay mức ưu tiên của đề cương này bằng mặc định toàn cục. Các bài đọc dùng mức ưu tiên không có trong danh sách toàn cục sẽ cần được chuyển hoặc xóa.
settings-priorities-reset-global-done = Đã đặt lại mức ưu tiên về mặc định toàn cục
settings-add-priority = Thêm mức ưu tiên mới
settings-add-priority-button = Thêm mức ưu tiên
settings-new-priority-name = Mức ưu tiên mới
settings-priority-move-up = Chuyển lên
settings-priority-move-down = Chuyển xuống
settings-priority-color = Màu mức ưu tiên
settings-priority-name-placeholder = Tên mức ưu tiên
settings-priority-delete = Xóa mức ưu tiên
settings-priority-delete-title = Xóa mức ưu tiên?
settings-priority-delete-message =
    { $count ->
        [one] { $count } bài đọc dùng “{ $name }”. Chọn cách xử lý trước khi xóa mức ưu tiên này.
       *[other] { $count } bài đọc dùng “{ $name }”. Chọn cách xử lý trước khi xóa mức ưu tiên này.
    }
settings-priority-delete-migrate-label = Chuyển bài đọc sang
settings-priority-delete-migrate = Chuyển và xóa
settings-priority-delete-clear = Xóa mức ưu tiên
settings-priority-delete-cancel = Hủy
settings-priority-name-label = Tên
settings-priority-preview = Xem trước:
priority-default-course-info = Thông tin học phần
priority-default-essential = Bắt buộc
priority-default-recommended = Khuyến nghị
priority-default-optional = Tùy chọn

# Gallery
gallery-empty-filtered = Không có mục khớp.
gallery-empty = Không có mục trong bộ sưu tập này.
gallery-untagged = Không thẻ
gallery-untagged-desc = Các mục trong phần này không có thẻ.
gallery-uncredited = Không tác giả
gallery-uncredited-desc = Các mục trong phần này không có tác giả.
gallery-empty-subcollections = Không có bộ sưu tập con hoặc mục trong bộ sưu tập này.
gallery-unnumbered = Không số
gallery-unnumbered-desc = Đã gán mà không có số buổi.
gallery-sort-auto = Tự động
gallery-sort-auto-title = Thứ tự tự động (bộ sưu tập hoặc đề cương)
gallery-sort-az = A–Z
gallery-sort-az-title = Sắp xếp A–Z
gallery-sort-date = Ngày
gallery-sort-date-title = Sắp xếp theo ngày (mới nhất trước)
gallery-sort-date-added = Đã thêm
gallery-sort-date-added-title = Sắp xếp theo ngày thêm (mới nhất trước)
gallery-sort-last-read = Last Read
gallery-sort-last-read-title = Sort by last read (most recent first)
gallery-group-none = Không
gallery-group-none-title = Không nhóm
gallery-group-auto = Tự động
gallery-group-auto-title = Nhóm tự động
gallery-group-type = Loại
gallery-group-type-title = Nhóm theo loại mục
gallery-group-creator = Tác giả
gallery-group-creator-title = Nhóm theo tác giả
gallery-group-tags = Thẻ
gallery-group-tags-title = Nhóm theo thẻ
gallery-group-subcollections = Bộ sưu tập con
gallery-group-subcollections-title = Nhóm theo bộ sưu tập con
gallery-group-classes = Buổi học
gallery-group-classes-title = Nhóm theo buổi học
gallery-layout-cover = Bìa
gallery-layout-cover-title = Ảnh bìa
gallery-layout-card = Thẻ bài
gallery-layout-card-title = Thẻ đề cương
gallery-layout-annotations = Chú thích
gallery-layout-annotations-title = Bìa kèm tất cả chú thích
gallery-annotations-empty = Không có chú thích
gallery-annotations-none-heading = Không có chú thích
gallery-annotations-show-empty = Hiện mục không có chú thích
gallery-layout-magazine = Tạp chí
gallery-layout-magazine-title = Bố cục tạp chí nhiều kích thước
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
magazine-shelf-watch = Xem
magazine-shelf-watch-title = Video mới thêm
magazine-shelf-listen = Nghe
magazine-shelf-listen-title = Âm thanh mới thêm
magazine-highlights = Đoạn tô sáng
gallery-options-aria = Tùy chọn chế độ xem thư viện ảnh
gallery-options-title = Tùy chọn xem
gallery-menu-view = Xem
gallery-menu-sort = Sắp xếp
gallery-menu-group = Nhóm theo
gallery-menu-type-size = Cỡ chữ
gallery-type-small = Nhỏ
gallery-type-small-title = Chữ tạp chí nhỏ hơn
gallery-type-large = Lớn
gallery-type-large-title = Chữ tạp chí lớn hơn
gallery-in-this-collection = Trong bộ sưu tập này
gallery-groups-nav-aria = Nhóm
gallery-group-jump = Hiện { $name }
gallery-prefs-summary = { $layout } / { $sort } / { $group }
gallery-page-of = Trang { $page } / { $total }
gallery-save-globally = Lưu làm mặc định
gallery-save-globally-title = Lưu tùy chọn này làm mặc định cho mọi bộ sưu tập
gallery-save-globally-active-title = Cài đặt bộ sưu tập này khác với mặc định. Nhấp để lưu làm mặc định.
galleryTour-settings-title = Tùy chọn thư viện ảnh
galleryTour-settings-desc =
    Mở menu ở góc để đổi chế độ xem, sắp xếp và nhóm. Chúng tôi sẽ lần lượt giới thiệu ba bố cục.
galleryTour-cover-title = Chế độ xem Bìa
galleryTour-cover-desc =
    Bìa hiện mỗi mục như ảnh bìa — sách, bài báo và trang web trong một cái nhìn.
galleryTour-magazine-title = Chế độ xem Tạp chí
galleryTour-magazine-desc =
    Tạp chí xen kẽ ô lớn và nhỏ, như mục lục. Phù hợp để duyệt và đọc đoạn giới thiệu.
galleryTour-card-title = Chế độ xem Thẻ
galleryTour-card-desc =
    Thẻ dùng cùng bố cục đề cương, nhóm theo loại mục để các bài đọc tương tự nằm cạnh nhau.
galleryTour-choose-title = Chọn mặc định
galleryTour-choose-desc =
    Thư viện ảnh nên mở với bố cục nào? Bạn có thể đổi sau trong tùy chọn Zotero Syllabus hoặc bằng Lưu làm mặc định.
galleryTour-skip = Bỏ qua

# Reading schedule
schedule-edit-settings = Sửa cài đặt lịch đọc
schedule-empty-title = Chưa có bài đọc được lên lịch
schedule-empty-desc = Thêm ngày đọc vào các buổi học để xem chúng tại đây.
schedule-this-week = Tuần này
schedule-next-week = Tuần sau
schedule-settings-title = Cài đặt Lịch đọc
schedule-settings-library = Bộ sưu tập thư viện
schedule-settings-desc =
    Tắt theo mặc định. Khi bật, một bộ sưu tập cấp cao “Lịch đọc” được giữ trong Thư viện của tôi với thư mục cho mỗi ngày đọc gần đây và sắp tới. Thư mục được tạo, đổi tên và điền tự động. Tắt sẽ xóa bộ sưu tập đó; mục đề cương vẫn được giữ.
schedule-settings-checkbox = Tạo bộ sưu tập “Lịch đọc”?
schedule-day-managed-banner = Tự quản lý từ các đề cương của bạn. Chỉnh sửa tại đây sẽ bị ghi đè.
schedule-day-empty = Không có bài đọc được lên lịch cho ngày này.
schedule-window-empty = Chưa có bài đọc trong cửa sổ lịch. Thêm ngày đọc vào các buổi học để xem chúng tại đây.
schedule-no-dates = Không có ngày
schedule-of-collection = của { $name }
schedule-of-collection-in-library = của { $collection } ({ $library })
schedule-open-syllabus = Mở đề cương { $title }
class-folder-managed-banner = Tự quản lý từ đề cương này. Chỉnh sửa trong thư mục này sẽ bị ghi đè.

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
column-reading-instructions = Hướng dẫn đọc
column-status = Trạng thái
column-reading-time = Thời gian đọc
column-syllabus-info = Thông tin đề cương
column-class-hash = #{ $number }

# Progress / dialogs
dialog-save-export = Lưu xuất đề cương
progress-import-success-title = Nhập thành công
progress-import-success-text = Đã nhập và gộp siêu dữ liệu đề cương thành công
progress-import-error-title = Lỗi nhập
progress-import-bad-file = Hãy thả một tệp .syllabus
progress-print-preparing = Đang chuẩn bị đề cương…
progress-print-failed = Không thể lưu đề cương
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
dialog-save-pdf = Lưu PDF đề cương
file-filter-pdf = PDF
dialog-save-word = Lưu đề cương dưới dạng Word
file-filter-word = Word
dialog-save-markdown = Lưu đề cương dưới dạng Markdown
file-filter-markdown = Markdown
dialog-save-html = Lưu đề cương dưới dạng HTML
file-filter-html = HTML
progress-saving-pdf = Đang lưu PDF…
dialog-save-file = Lưu tệp
progress-translator-install-error = Lỗi khi cài bộ trích danh sách đọc
progress-migrate-start =
    { $count ->
        [one] Đang chuyển { $count } đề cương sang ghi chú bộ sưu tập…
       *[other] Đang chuyển { $count } đề cương sang ghi chú bộ sưu tập…
    }
progress-migrate-item = Đang chuyển { $current } / { $total }…
progress-migrate-done =
    { $count ->
        [one] Đã chuyển { $count } đề cương
       *[other] Đã chuyển { $count } đề cương
    }
progress-migrate-empty-cleared =
    { $count ->
        [one] Đã xóa { $count } tùy chọn trống
       *[other] Đã xóa { $count } tùy chọn trống
    }
progress-migrate-not-found =
    { $count ->
        [one] Không tìm thấy { $count } bộ sưu tập
       *[other] Không tìm thấy { $count } bộ sưu tập
    }
progress-migrate-failed = { $count } thất bại
progress-migrate-remaining = còn { $count } trong tùy chọn
reading-time-minutes = { $minutes } phút
reading-time-hours =
    { $hours ->
        [one] { $hours } giờ
       *[other] { $hours } giờ
    }
reading-time-hours-and-minutes =
    { $hours ->
        [one] { $hours } giờ { $minutes } phút
       *[other] { $hours } giờ { $minutes } phút
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
my-annotations-desc = Your highlights and notes across sources, in chronological order.
my-annotations-order-newest-last = Newest last
my-annotations-order-newest-last-title = Oldest at the top, newest at the bottom
my-annotations-order-newest-first = Newest first
my-annotations-order-newest-first-title = Newest at the top, oldest at the bottom
annotations-quote-order-menu = Trích dẫn
annotations-quote-order-location = Vị trí
annotations-quote-order-location-title = Sắp xếp trích dẫn theo vị trí trong tài liệu
annotations-quote-order-date-added = Đã thêm
annotations-quote-order-date-added-title = Sắp xếp trích dẫn theo ngày thêm (cũ nhất trước)
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
tree-tooltip-reading-schedule = Lịch đọc (tự quản lý)
tree-tooltip-auto-managed = Tự quản lý bởi Zotero Syllabus
tree-tooltip-syllabus = Đề cương

# User guide sample items (created at tour time; not used as match keys)
tour-sample-reading-1 = Bài đọc mẫu: Bắt đầu với danh sách học phần
tour-sample-reading-2 = Bài đọc mẫu: Chú thích trong lúc đọc
tour-sample-reading-3 = Bài đọc mẫu: Lập kế hoạch tuần tới

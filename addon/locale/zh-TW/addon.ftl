startup-begin = 附加元件載入中
startup-finish = 附加元件已就緒
enable-syllabus-title = 轉為教學大綱？
enable-syllabus-message = 將「{ $name }」轉為教學大綱？將在此分類中建立一份教學大綱筆記。
enable-subcollections-title = 由外掛管理課堂子分類？
enable-subcollections-message =
    開啟後，外掛將管理「{ $name }」下的子分類。這可能刪除或改寫你已有的子分類。

    具體行為：

    • 每個課堂會建立或沿用一個子分類，並依教學大綱重新命名（例如「課堂 1: 標題」）。

    • 不是課堂資料夾、且自身沒有教學大綱筆記的子分類會被刪除。條目不會從文獻庫中刪除，仍留在父分類中。

    • 每個課堂資料夾中的條目會依教學大綱筆記重寫。資料夾中多餘的條目只會從該資料夾移除。

    • 從教學大綱中刪除某個課堂時，對應的子分類也會被刪除。

    • 如果你刪除了課堂資料夾，外掛會再建立回來。

    之後關閉此選項將停止管理資料夾，已有資料夾會保留。

    要繼續嗎？
enable-reading-schedule-collection-title = 產生「閱讀日程」分類？
enable-reading-schedule-collection-message =
    開啟後，將在「我的文獻庫」中建立頂層「閱讀日程」分類，並為每個閱讀日期（從 10 天前起）各建一個子分類。

    具體行為：

    • 日期資料夾會根據教學大綱自動建立、重新命名並填入條目。

    • 這些資料夾中的條目會依日程重寫。多餘條目只會從資料夾中移除，不會從文獻庫刪除。

    • 在此設定開啟期間，若你刪除該分類或某個日期資料夾，外掛會重新建立。

    • 群組文獻庫中的教學大綱不會納入（條目不能跨庫）。

    之後關閉此選項將刪除「閱讀日程」分類及其日期子分類。教學大綱中的條目會保留。

    要繼續嗎？
disable-reading-schedule-collection-title = 刪除「閱讀日程」分類？
disable-reading-schedule-collection-message =
    關閉後將刪除由外掛管理的「閱讀日程」分類及其日期子分類。

    條目不會從文獻庫中刪除，仍留在原教學大綱分類中。

    要繼續嗎？
prefs-title = Zotero Syllabus
prefs-table-title = 標題
prefs-table-detail = 詳情
tabpanel-lib-tab-label = 文獻庫分頁
tabpanel-reader-tab-label = 閱讀器分頁
menu-toggle-bibliography = 切換參考文獻
managed-folder-banner-title = 由外掛管理的資料夾
managed-folder-banner-class =
    請勿在此新增或移除條目。此課堂資料夾會與教學大綱同步，手動變更會被覆寫。
managed-folder-banner-schedule =
    請勿在此新增或移除條目。此閱讀日程資料夾會與各教學大綱同步，手動變更會被覆寫。
menuHelp-openUserGuide = 開啟 Zotero Syllabus 使用指南
userGuide-start-title = 歡迎使用 Zotero Syllabus
userGuide-start-desc =
    將任意 Zotero 分類變成課程閱讀清單——按課堂組織、設定優先順序，並追蹤接下來要讀什麼。
userGuide-start-close = 以後再說
userGuide-collection-title = 從分類開始
userGuide-collection-desc =
    教學大綱建立在分類上。我們將開啟一個「Syllabus Tour」練習分類，並放入幾篇範例閱讀。
userGuide-syllabusButton-title = 轉為教學大綱
userGuide-syllabusButton-desc =
    在條目工具列點選「轉為教學大綱」，將此分類轉為課程大綱。本指南會自動切換過去。
userGuide-addClass-title = 新增課堂
userGuide-addClass-desc =
    課堂（或週次 / 單元——稍後可改名）是教學大綱的分節。先新增一個開始。
userGuide-assign-title = 指派閱讀
userGuide-assign-desc =
    將條目拖入課堂，或右鍵 → 指派到課堂。未指派的條目會留在「延伸閱讀」中。
userGuide-itemPane-title = 在條目面板中編輯
userGuide-itemPane-desc =
    選取一篇閱讀，即可在「閱讀作業」區域設定課堂編號、優先順序、說明和完成狀態。
userGuide-readingDate-title = 設定課堂截止日期
userGuide-readingDate-desc =
    每個課堂都可以設定閱讀日期。點選「下一步」後我們會為第 1 課設定一個日期，然後你可以開啟閱讀日程。
userGuide-readingSchedule-title = 開啟閱讀日程
userGuide-readingSchedule-desc =
    「閱讀日程」會彙整各教學大綱中帶截止日期的課堂。下一步將開啟它，方便查看接下來的安排。
userGuide-subcollections-title = 選用：課堂資料夾
userGuide-subcollections-desc =
    需要按課堂鏡像資料夾嗎？在設定中啟用「課堂子分類」。除非希望外掛管理子資料夾，否則請保持關閉。
userGuide-finish-title = 準備就緒
userGuide-finish-desc =
    可隨時透過「說明 → 開啟 Zotero Syllabus 使用指南」重新開啟本教學。祝學習順利！
userGuide-empty-title = 按課堂組織此分類
userGuide-empty-desc =
    為每週或每節課新增課堂，然後指派閱讀。也可以先跟隨簡短引導教學。
userGuide-empty-tour = 開始教學

# Shared
app-name = Zotero Syllabus
this-collection = 此分類
untitled = 未命名
nav-back = 返回
nav-previous = 上一步
nav-next = 下一步

# View tabs / toolbar
view-tab-checklist = 清單
view-tab-checklist-tooltip = 以清單檢視顯示
view-tab-syllabus = 教學大綱
view-tab-syllabus-tooltip = 以教學大綱檢視顯示
view-tab-create-syllabus = 轉為教學大綱
view-tab-create-syllabus-tooltip = 將此分類轉為教學大綱
view-tab-table = 表格
view-tab-table-tooltip = 以表格檢視顯示
view-tab-gallery = 圖庫
view-tab-gallery-tooltip = 以圖庫檢視顯示
view-tab-reading-schedule = 閱讀日程
toolbar-reading-schedule-review = 查看閱讀日程
toolbar-reading-schedule-open = 開啟閱讀日程

# Context menus
menu-set-priority = 設定優先順序
menu-none = （無）
menu-assign-to-class = 指派到課堂
menu-no-collection = （未選取分類）
menu-class-label = { $nomenclature } { $number }
menu-add-to-new-class = 新增到新{ $nomenclature } { $number }
menu-set-reading-status = 設定閱讀狀態
status-done = 已完成
status-not-done = 未完成

# Syllabus page
page-toc-title = 目錄
placeholder-add-title = 新增標題…
page-compact-enable = 啟用精簡模式
page-compact-disable = 關閉精簡模式
page-reader-enable = 啟用閱讀模式
page-reader-disable = 關閉閱讀模式
page-export = 匯出教學大綱檔案
page-import = 匯入教學大綱檔案
page-edit-settings = 編輯教學大綱設定
page-lock = 鎖定教學大綱
page-unlock = 解鎖教學大綱
page-print = 將教學大綱檢視中的清單列印為 PDF
placeholder-course-code = 課程代碼
placeholder-institution = 院校
placeholder-add-description = 新增描述…
page-add-class = 新增{ $nomenclature } { $number }
page-add-to-class = 新增到{ $nomenclature } { $number }
page-drop-create-class = 拖放到此處以建立{ $nomenclature } { $number }
page-drop-import-file = 拖放 .syllabus 檔案以匯入
further-reading-heading = 延伸閱讀
sort-label = 排序
further-reading-sort-aria = 排序延伸閱讀
sort-by-title = 標題
sort-by-creator = 建立者
sort-by-date = 日期
further-reading-empty-desc = 此部分中的條目尚未指派到任何課堂。
toc-empty = 暫無課堂
placeholder-url = https://
links-delete = 刪除連結
links-edit = 編輯連結
links-add = 新增連結
bibliography-heading = 參考文獻

# Class groups / cards
mark-done = 標記為已完成
mark-not-done = 標記為未完成
class-due-date-label = 截止日期：
class-reset-sort = 重設排序
class-move-up = 上移{ $nomenclature }
class-move-down = 下移{ $nomenclature }
class-delete = 刪除{ $nomenclature }
class-dropzone-hint = 將條目拖到{ $nomenclature } { $number }
due-date-clear = 清除截止日期
due-date-add = 新增截止日期
placeholder-select-date = 選取日期
item-in-publication = 載於 { $name }
attachment-url = URL
attachment-pdf = PDF
attachment-snapshot = 快照
attachment-epub = EPUB
attachment-html = HTML
attachment-doc = DOC
attachment-txt = TXT
attachment-zip = ZIP
attachment-file = 檔案
attachment-view = 檢視
attachment-open = 開啟 { $label }
assignment-duplicate = 建立重複作業
assignment-duplicate-label = 重複
assignment-unassign-class = 從課堂中移除
assignment-unassign-syllabus = 從教學大綱中移除
assignment-unassign-label = 取消指派
priority-set-to = 將優先順序設為 { $name }
priority-clear = 清除優先順序
youtube-play = 在 YouTube 上播放 { $title }

# Item pane
item-pane-not-found = 找不到條目
item-pane-none-selected = 未選取條目
item-pane-n-selected = 已選取 { $count } 個條目
item-pane-current-view = 目前檢視
item-pane-also-assigned = 同時指派到
item-pane-assignment-n = 作業 #{ $number }
item-pane-assignment-for = 用於 { $title }
item-pane-due = 截止 { $date }
item-pane-reference-material = 參考資料
item-pane-mark-done = 標記完成
placeholder-class-number = 例如 1、2、3…
field-priority = 優先順序
field-instructions = 說明
placeholder-instructions = 為此作業新增說明…
assignment-delete = 刪除作業
item-pane-select-collection = 選取一個分類以檢視教學大綱作業

# Settings
settings-title = 教學大綱設定
settings-back = 返回教學大綱檢視
settings-nomenclature = 稱謂
settings-nomenclature-desc = 選擇用於指稱各次課的用語（例如「週」「課堂」「單元」「節」）。
settings-singular = 單數形式
settings-nomenclature-placeholder = 例如：週、課堂、單元、節
settings-plural-label = 複數形式：
settings-subcollections = 課堂子分類
settings-subcollections-desc = 預設關閉。啟用後，每個課堂會在此分類下擁有一個資料夾。資料夾會依教學大綱建立、重新命名和刪除——包括既有子分類，它們也可能被刪除。關閉此選項後資料夾會保留。
settings-subcollections-checkbox = 建立子分類？
settings-bib-style = 參考文獻樣式
settings-bib-style-desc = 為文獻引用選擇 CSL（Citation Style Language）樣式。未設定時將使用使用者預設樣式。
settings-citation-style = 引用樣式
settings-user-default = 使用者預設
settings-user-default-named = 使用者預設：{ $name }
settings-priorities = 優先順序
settings-priorities-desc = 自訂優先順序名稱、顏色和排序。
settings-add-priority = 新增優先順序
settings-add-priority-button = 新增優先順序
settings-new-priority-name = 新優先順序
settings-priority-move-up = 上移
settings-priority-move-down = 下移
settings-priority-color = 優先順序顏色
settings-priority-name-placeholder = 優先順序名稱
settings-priority-delete = 刪除優先順序
settings-priority-name-label = 名稱
settings-priority-preview = 預覽：
priority-default-course-info = 課程資訊
priority-default-essential = 必讀
priority-default-recommended = 推薦
priority-default-optional = 選讀

# Gallery
gallery-empty-filtered = 沒有相符的條目。
gallery-empty = 此分類中沒有條目。
gallery-untagged = 無標籤
gallery-untagged-desc = 此部分中的條目沒有標籤。
gallery-empty-subcollections = 此分類中沒有子分類或條目。
gallery-unnumbered = 未編號
gallery-unnumbered-desc = 已指派但沒有課堂編號。
gallery-sort-auto = 自動
gallery-sort-auto-title = 自動排序（分類或教學大綱）
gallery-sort-az = A–Z
gallery-sort-az-title = 按 A–Z 排序
gallery-sort-date = 日期
gallery-sort-date-title = 按日期排序（最新優先）
gallery-group-none = 無
gallery-group-none-title = 不分組
gallery-group-type = 類型
gallery-group-type-title = 按條目類型分組
gallery-group-tags = 標籤
gallery-group-tags-title = 按標籤分組
gallery-group-subcollections = 子分類
gallery-group-subcollections-title = 按子分類分組
gallery-group-classes = 課堂
gallery-group-classes-title = 按課堂分組
gallery-layout-cover = 封面
gallery-layout-cover-title = 封面圖
gallery-layout-card = 卡片
gallery-layout-card-title = 教學大綱卡片
gallery-layout-magazine = 雜誌
gallery-layout-magazine-title = 混合尺寸的雜誌版面
magazine-shelf-watch = 觀看
magazine-shelf-watch-title = 最近新增的影片
magazine-shelf-listen = 收聽
magazine-shelf-listen-title = 最近新增的音訊
gallery-options-aria = 圖庫檢視選項
gallery-options-title = 檢視選項
gallery-menu-view = 檢視
gallery-menu-sort = 排序
gallery-menu-group = 分組方式
gallery-in-this-collection = 本收藏集中
gallery-groups-nav-aria = 分組
gallery-group-jump = 顯示{ $name }
gallery-prefs-summary = { $layout } / { $sort } / { $group }
gallery-page-of = 第 { $page } 頁，共 { $total } 頁

# Reading schedule
schedule-edit-settings = 編輯閱讀日程設定
schedule-empty-title = 尚未安排閱讀
schedule-empty-desc = 為課堂新增閱讀日期即可在此查看。
schedule-this-week = 本週
schedule-next-week = 下週
schedule-settings-title = 閱讀日程設定
schedule-settings-back = 返回閱讀日程
schedule-settings-library = 文獻庫分類
schedule-settings-desc =
    預設關閉。啟用後，將在「我的文獻庫」中保留頂層「閱讀日程」分類，並為每個近期和即將到來的閱讀日期各建一個資料夾。資料夾會自動建立、重新命名並填入。關閉此選項將刪除該分類；教學大綱中的條目會保留。
schedule-settings-checkbox = 產生「閱讀日程」分類？
schedule-day-managed-banner = 由各教學大綱自動管理。此處的變更會被覆寫。
schedule-day-empty = 當天沒有安排閱讀。
schedule-window-empty = 日程範圍內尚無閱讀。為課堂新增閱讀日期即可在此查看。
schedule-no-dates = 無日期
schedule-of-collection = 屬於 { $name }
schedule-of-collection-in-library = 屬於 { $collection }（{ $library }）
schedule-open-syllabus = 開啟 { $title } 的教學大綱
class-folder-managed-banner = 由此教學大綱自動管理。此資料夾中的變更會被覆寫。

# Columns
column-reading-instructions = 閱讀說明
column-status = 狀態
column-reading-time = 閱讀時間
column-syllabus-info = 教學大綱資訊
column-class-hash = #{ $number }

# Progress / dialogs
dialog-save-export = 儲存教學大綱匯出
progress-import-success-title = 匯入成功
progress-import-success-text = 已成功匯入並合併教學大綱中繼資料
progress-import-error-title = 匯入錯誤
progress-import-bad-file = 請拖放 .syllabus 檔案
progress-print-preparing = 正在準備列印教學大綱…
progress-print-failed = 無法儲存教學大綱 PDF
dialog-save-pdf = 儲存教學大綱 PDF
file-filter-pdf = PDF
progress-saving-pdf = 正在儲存 PDF…
dialog-save-file = 儲存檔案
progress-translator-install-error = 安裝閱讀清單擷取器時發生錯誤
progress-migrate-start =
    { $count ->
        [one] 正在將 { $count } 份教學大綱遷移到分類筆記…
       *[other] 正在將 { $count } 份教學大綱遷移到分類筆記…
    }
progress-migrate-item = 正在遷移第 { $current } 份，共 { $total } 份…
progress-migrate-done =
    { $count ->
        [one] 已遷移 { $count } 份教學大綱
       *[other] 已遷移 { $count } 份教學大綱
    }
progress-migrate-empty-cleared =
    { $count ->
        [one] 已清除 { $count } 項空偏好設定
       *[other] 已清除 { $count } 項空偏好設定
    }
progress-migrate-not-found =
    { $count ->
        [one] 找不到 { $count } 個分類
       *[other] 找不到 { $count } 個分類
    }
progress-migrate-failed = { $count } 項失敗
progress-migrate-remaining = 偏好設定中還剩 { $count } 項
reading-time-minutes = { $minutes } 分鐘
reading-time-hours =
    { $hours ->
        [one] { $hours } 小時
       *[other] { $hours } 小時
    }
reading-time-hours-and-minutes =
    { $hours ->
        [one] { $hours } 小時 { $minutes } 分鐘
       *[other] { $hours } 小時 { $minutes } 分鐘
    }

# Collection tree
tree-tooltip-reading-schedule = 閱讀日程（自動管理）
tree-tooltip-auto-managed = 由 Zotero Syllabus 自動管理
tree-tooltip-syllabus = 教學大綱

# User guide sample items (created at tour time; not used as match keys)
tour-sample-reading-1 = 範例閱讀：開始整理課程書單
tour-sample-reading-2 = 範例閱讀：邊讀邊批註
tour-sample-reading-3 = 範例閱讀：規劃下週閱讀

startup-begin = アドオンを読み込み中
startup-finish = アドオンの準備ができました
enable-syllabus-title = シラバスに変換しますか？
enable-syllabus-message = 「{ $name }」をシラバスに変換しますか？このコレクションにシラバスノートが保存されます。
enable-subcollections-title = 授業のサブコレクションを管理しますか？
enable-subcollections-message =
    オンにすると、プラグインが「{ $name }」配下の子コレクションを管理します。既存のフォルダが削除または上書きされることがあります。

    動作の内容：

    • 課題がある授業ごとにフォルダが作成または流用され、シラバスに合わせて名前が付けられます（例：「授業 1: タイトル」）。

    • 課題のない授業にはフォルダは作られません。そうした授業の既存フォルダは削除されます。

    • それらの授業フォルダではなく、かつ独自のシラバスノートを持たない子コレクションは削除されます。アイテムはライブラリから削除されず、親コレクションに残ります。

    • 各授業フォルダのアイテムはシラバスノートから上書きされます。余分なアイテムはフォルダからのみ取り除かれます。

    • シラバスから授業を削除すると、その授業フォルダも削除されます。

    • まだ課題がある授業フォルダを削除すると、プラグインが再作成します。

    後でオフにするとフォルダの管理は止まります。既存のフォルダはそのまま残ります。

    続行しますか？
enable-reading-schedule-collection-title = 「読書スケジュール」コレクションを生成しますか？
enable-reading-schedule-collection-message =
    オンにすると、マイライブラリに最上位の「読書スケジュール」コレクションが作成され、各読書日（10日前以降）ごとにフォルダが作られます。

    動作の内容：

    • 日付フォルダはシラバスから自動的に作成・改名・充填されます。

    • それらのフォルダ内のアイテムはスケジュールから上書きされます。余分なアイテムはフォルダからのみ取り除かれ、ライブラリからは削除されません。

    • この設定がオンの間にコレクションや日付フォルダを削除すると、プラグインが再作成します。

    • グループライブラリのシラバスは含まれません（アイテムはライブラリをまたげません）。

    後でオフにすると「読書スケジュール」コレクションとその日付フォルダが削除されます。シラバスのアイテムはそのまま残ります。

    続行しますか？
disable-reading-schedule-collection-title = 「読書スケジュール」コレクションを削除しますか？
disable-reading-schedule-collection-message =
    オフにすると、管理されている「読書スケジュール」コレクションとその日付フォルダが削除されます。

    アイテムはライブラリから削除されず、元のシラバスコレクションに残ります。

    続行しますか？
prefs-title = Zotero Syllabus
prefs-table-title = タイトル
prefs-table-detail = 詳細
tabpanel-lib-tab-label = ライブラリタブ
tabpanel-reader-tab-label = リーダータブ
menu-toggle-bibliography = 参考文献の表示切替
managed-folder-banner-title = 自動管理フォルダ
managed-folder-banner-class =
    ここにはアイテムを追加・削除しないでください。この授業フォルダはシラバスと同期され、手動の編集は上書きされます。
managed-folder-banner-schedule =
    ここにはアイテムを追加・削除しないでください。この読書スケジュールフォルダは各シラバスと同期され、手動の編集は上書きされます。
menuHelp-openUserGuide = Zotero Syllabus ユーザーガイドを開く
userGuide-start-title = Zotero Syllabus へようこそ
userGuide-start-desc =
    任意の Zotero コレクションを授業のリーディングリストにできます。授業ごとに整理し、優先度を設定し、次に読むものを把握しましょう。
userGuide-start-close = あとで通知
userGuide-collection-title = コレクションから始める
userGuide-collection-desc =
    シラバスはコレクション上に置かれます。「Syllabus Tour」という練習用コレクションを開き、サンプルの文献をいくつか入れます。
userGuide-syllabusButton-title = シラバスに変換
userGuide-syllabusButton-desc =
    アイテムツールバーの「シラバスに変換」をクリックすると、このコレクションが授業のアウトラインに切り替わります。ツアーがその画面へ移動します。
userGuide-addClass-title = 授業を追加する
userGuide-addClass-desc =
    授業（または週 / 回——後から名称を変えられます）がシラバスの区切りです。まず1つ追加してください。
userGuide-assign-title = 文献を割り当てる
userGuide-assign-desc =
    アイテムを授業へドラッグするか、右クリック → 授業に割り当て、で割り当てます。未割り当てのアイテムは「発展学習」に残ります。
userGuide-itemPane-title = アイテムペインで編集する
userGuide-itemPane-desc =
    文献を選ぶと、「課題の割り当て」セクションで授業番号、優先度、指示、完了状態を設定できます。
userGuide-readingDate-title = 授業の期限を設定する
userGuide-readingDate-desc =
    各授業に読書日を設定できます。「次へ」をクリックすると授業 1 に日付を入れ、その後読書スケジュールを開けます。
userGuide-readingSchedule-title = 読書スケジュールを開く
userGuide-readingSchedule-desc =
    読書スケジュールは、各シラバスで期限のある授業を集めます。「次へ」で開き、これから読むものを確認できます。
userGuide-subcollections-title = 任意：授業フォルダ
userGuide-subcollections-desc =
    授業ごとにフォルダをミラーしたい場合は、設定で「授業のサブコレクション」を有効にしてください。プラグインに子フォルダを管理させたくない場合はオフのままにしてください。
userGuide-finish-title = 準備完了です
userGuide-finish-desc =
    ヘルプ → Zotero Syllabus ユーザーガイドを開く、からいつでもこのツアーを再開できます。学習を楽しんでください。
userGuide-empty-title = このコレクションを授業ごとに整理
userGuide-empty-desc =
    週や回ごとに授業を追加し、文献を割り当てます。短いガイドツアーも利用できます。
userGuide-empty-tour = ツアーを始める

# Shared
app-name = Zotero Syllabus
this-collection = このコレクション
untitled = 無題
nav-back = 戻る
nav-previous = 前へ
nav-next = 次へ

# View tabs / toolbar
view-tab-checklist = チェックリスト
view-tab-checklist-tooltip = チェックリストで表示
view-tab-syllabus = シラバス
view-tab-syllabus-tooltip = シラバスで表示
view-tab-create-syllabus = シラバスに変換
view-tab-create-syllabus-tooltip = このコレクションをシラバスに変換
view-tab-table = 表
view-tab-table-tooltip = 表で表示
view-tab-gallery = ギャラリー
view-tab-gallery-tooltip = ギャラリーで表示
view-tab-explorer = Home
view-tab-explorer-tooltip = View as Home
view-tab-reading-schedule = 読書スケジュール
toolbar-reading-schedule-review = 読書スケジュールを確認
toolbar-reading-schedule-open = 読書スケジュールを開く

# Context menus
menu-set-priority = 優先度を設定
menu-none = （なし）
menu-assign-to-class = 授業に割り当て
menu-no-collection = （コレクションが選択されていません）
menu-class-label = { $nomenclature } { $number }
menu-add-to-new-class = 新しい{ $nomenclature } { $number }に追加
menu-set-reading-status = 読書ステータスを設定
status-done = 完了
status-not-done = 未完了

# Syllabus page
page-toc-title = 目次
placeholder-add-title = タイトルを追加…
page-compact-enable = コンパクトモードを有効にする
page-compact-disable = コンパクトモードを無効にする
page-reader-enable = リーダーモードを有効にする
page-reader-disable = リーダーモードを無効にする
page-export = シラバスファイルを書き出す
page-import = シラバスファイルを読み込む
page-edit-settings = シラバス設定を編集
page-lock = シラバスをロック
page-unlock = シラバスのロックを解除
page-print = シラバスビューのリストを PDF として印刷
placeholder-course-code = 科目コード
placeholder-institution = 所属機関
placeholder-add-description = 説明を追加…
page-add-class = { $nomenclature } { $number }を追加
page-add-to-class = { $nomenclature } { $number }に追加
page-drop-create-class = ここにドロップして{ $nomenclature } { $number }を作成
page-drop-import-file = ファイルをドロップしてこのコレクションに追加
further-reading-heading = 発展学習
sort-label = 並べ替え
further-reading-sort-aria = 発展学習を並べ替え
sort-by-title = タイトル
sort-by-creator = 作成者
sort-by-date = 日付
further-reading-empty-desc = このセクションのアイテムはどの授業にも割り当てられていません。
toc-empty = 授業がありません
placeholder-url = https://
links-delete = リンクを削除
links-edit = リンクを編集
links-add = リンクを追加
bibliography-heading = 参考文献

# Class groups / cards
mark-done = 完了にする
mark-not-done = 未完了にする
class-due-date-label = 期限：
class-reset-sort = 並べ替えをリセット
class-move-up = { $nomenclature }を上へ
class-move-down = { $nomenclature }を下へ
class-delete = { $nomenclature }を削除
class-dropzone-hint = アイテムを{ $nomenclature } { $number }へドラッグ
due-date-clear = 期限をクリア
due-date-add = 期限を追加
placeholder-select-date = 日付を選択
item-in-publication = （{ $name } 所収）
attachment-url = URL
attachment-pdf = PDF
attachment-snapshot = スナップショット
attachment-epub = EPUB
attachment-html = HTML
attachment-doc = DOC
attachment-txt = TXT
attachment-zip = ZIP
attachment-file = ファイル
attachment-view = 表示
attachment-open = { $label }を開く
assignment-duplicate = 課題の複製を作成
assignment-duplicate-label = 複製
assignment-unassign-class = 授業から外す
assignment-unassign-syllabus = シラバスから外す
assignment-unassign-label = 割り当て解除
priority-set-to = 優先度を{ $name }に設定
priority-clear = 優先度をクリア
youtube-play = YouTube で { $title } を再生

# Item pane
item-pane-not-found = アイテムが見つかりません
item-pane-none-selected = アイテムが選択されていません
item-pane-n-selected = { $count } 件のアイテムを選択中
item-pane-current-view = 現在のビュー
item-pane-also-assigned = 次にも割り当て済み：
item-pane-assignment-n = 課題 #{ $number }
item-pane-assignment-for = { $title } 向け
item-pane-due = 期限 { $date }
item-pane-reference-material = 参考資料
item-pane-mark-done = 完了にする
placeholder-class-number = 例：1、2、3…
field-priority = 優先度
field-instructions = 指示
placeholder-instructions = この課題の指示を追加…
assignment-delete = 課題を削除
item-pane-select-collection = コレクションを選択してシラバスの課題を表示

# Settings
settings-title = シラバス設定
settings-back = シラバスビューに戻る
settings-nomenclature = 呼称
settings-nomenclature-desc = 各回を指す用語を選びます（例：「週」「授業」「回」「セクション」）。
settings-singular = 単数形
settings-nomenclature-placeholder = 例：週、授業、回、セクション
settings-plural-label = 複数形：
settings-subcollections = 授業のサブコレクション
settings-subcollections-desc = 既定ではオフです。オンにすると、課題がある各授業がこのコレクション配下にフォルダを持ちます。課題のない授業にはフォルダは作られず、そうしたフォルダは削除されます。フォルダはシラバスに合わせて作成・改名・削除されます。既存の子コレクションも削除されることがあります。オフにしてもフォルダは残ります。
settings-subcollections-checkbox = サブコレクションを作成しますか？
settings-bib-style = 参考文献スタイル
settings-bib-style-desc = 書誌参照に使う CSL（Citation Style Language）スタイルを選びます。未設定の場合はユーザー既定のスタイルが使われます。
settings-citation-style = 引用スタイル
settings-user-default = ユーザー既定
settings-user-default-named = ユーザー既定：{ $name }
settings-priorities = 優先度
settings-priorities-desc = 優先度の名前、色、並べ替え順をカスタマイズします。
settings-add-priority = 新しい優先度を追加
settings-add-priority-button = 優先度を追加
settings-new-priority-name = 新しい優先度
settings-priority-move-up = 上へ
settings-priority-move-down = 下へ
settings-priority-color = 優先度の色
settings-priority-name-placeholder = 優先度の名前
settings-priority-delete = 優先度を削除
settings-priority-name-label = 名前
settings-priority-preview = プレビュー：
priority-default-course-info = 授業情報
priority-default-essential = 必読
priority-default-recommended = 推奨
priority-default-optional = 任意

# Gallery
gallery-empty-filtered = 該当するアイテムはありません。
gallery-empty = このコレクションにアイテムはありません。
gallery-untagged = タグなし
gallery-untagged-desc = このセクションのアイテムにはタグがありません。
gallery-uncredited = 作成者なし
gallery-uncredited-desc = このセクションのアイテムには作成者がありません。
gallery-empty-subcollections = このコレクションにサブコレクションもアイテムもありません。
gallery-unnumbered = 番号なし
gallery-unnumbered-desc = 授業番号なしで割り当てられています。
gallery-sort-auto = 自動
gallery-sort-auto-title = 自動順（コレクションまたはシラバス）
gallery-sort-az = A–Z
gallery-sort-az-title = A–Z で並べ替え
gallery-sort-date = 日付
gallery-sort-date-title = 日付順（新しい順）
gallery-sort-date-added = 追加日
gallery-sort-date-added-title = 追加日順（新しい順）
gallery-group-none = なし
gallery-group-none-title = グループ化しない
gallery-group-auto = 自動
gallery-group-auto-title = 自動でグループ化
gallery-group-type = タイプ
gallery-group-type-title = アイテムタイプでグループ化
gallery-group-creator = 作成者
gallery-group-creator-title = 作成者でグループ化
gallery-group-tags = タグ
gallery-group-tags-title = タグでグループ化
gallery-group-subcollections = サブコレクション
gallery-group-subcollections-title = サブコレクションでグループ化
gallery-group-classes = 授業
gallery-group-classes-title = 授業でグループ化
gallery-layout-cover = カバー
gallery-layout-cover-title = カバー画像
gallery-layout-card = カード
gallery-layout-card-title = シラバスカード
gallery-layout-magazine = マガジン
gallery-layout-magazine-title = 大小混在のマガジンレイアウト
magazine-shelf-watch = 見る
magazine-shelf-watch-title = 最近追加した動画
magazine-shelf-listen = 聴く
magazine-shelf-listen-title = 最近追加した音声
magazine-highlights = ハイライト
gallery-options-aria = ギャラリー表示オプション
gallery-options-title = 表示オプション
gallery-menu-view = 表示
gallery-menu-sort = 並べ替え
gallery-menu-group = グループ化
gallery-menu-type-size = 文字サイズ
gallery-type-small = 小
gallery-type-small-title = マガジンの文字を小さく
gallery-type-large = 大
gallery-type-large-title = マガジンの文字を大きく
gallery-in-this-collection = このコレクション内
gallery-groups-nav-aria = グループ
gallery-group-jump = { $name } を表示
gallery-prefs-summary = { $layout } / { $sort } / { $group }
gallery-page-of = { $page } / { $total } ページ
gallery-save-globally = デフォルトとして保存
gallery-save-globally-title = このオプションをすべてのコレクションのデフォルトとして保存
gallery-save-globally-active-title = このコレクションの設定はデフォルトと異なります。クリックしてデフォルトとして保存します。
galleryTour-settings-title = ギャラリーのオプション
galleryTour-settings-desc =
    隅のメニューで表示、並べ替え、グループ化を切り替えます。3つのレイアウトを順に紹介します。
galleryTour-cover-title = カバー表示
galleryTour-cover-desc =
    カバーは各アイテムを表紙として表示します。図書、論文、ウェブページを一目で把握できます。
galleryTour-magazine-title = マガジン表示
galleryTour-magazine-desc =
    マガジンは大小のタイルを混ぜ、目次のように見せます。流し読みやリード文の確認に向いています。
galleryTour-card-title = カード表示
galleryTour-card-desc =
    カードはシラバスと同じレイアウトで、アイテムタイプごとにグループ化し、似た資料をまとめます。
galleryTour-choose-title = デフォルトを選ぶ
galleryTour-choose-desc =
    ギャラリーはどのレイアウトで開きますか？あとから Zotero Syllabus の設定、または「デフォルトとして保存」で変更できます。
galleryTour-skip = スキップ

# Reading schedule
schedule-edit-settings = 読書スケジュール設定を編集
schedule-empty-title = 予定された読書はありません
schedule-empty-desc = 授業に読書日を追加すると、ここに表示されます。
schedule-this-week = 今週
schedule-next-week = 来週
schedule-settings-title = 読書スケジュール設定
schedule-settings-back = 読書スケジュールに戻る
schedule-settings-library = ライブラリコレクション
schedule-settings-desc =
    既定ではオフです。オンにすると、マイライブラリに最上位の「読書スケジュール」コレクションが維持され、直近および今後の各読書日にフォルダが作られます。フォルダは自動的に作成・改名・充填されます。オフにするとそのコレクションは削除されます。シラバスのアイテムはそのまま残ります。
schedule-settings-checkbox = 「読書スケジュール」コレクションを生成しますか？
schedule-day-managed-banner = 各シラバスから自動管理されています。ここでの編集は上書きされます。
schedule-day-empty = この日に予定された読書はありません。
schedule-window-empty = スケジュール期間内にまだ読書がありません。授業に読書日を追加すると、ここに表示されます。
schedule-no-dates = 日付なし
schedule-of-collection = { $name } の
schedule-of-collection-in-library = { $collection }（{ $library }）の
schedule-open-syllabus = { $title } のシラバスを開く
class-folder-managed-banner = このシラバスから自動管理されています。このフォルダ内の編集は上書きされます。

# Columns
column-reading-instructions = 読書の指示
column-status = ステータス
column-reading-time = 読書時間
column-syllabus-info = シラバス情報
column-class-hash = #{ $number }

# Progress / dialogs
dialog-save-export = シラバスの書き出しを保存
progress-import-success-title = 読み込み成功
progress-import-success-text = シラバスのメタデータを読み込み、マージしました
progress-import-error-title = 読み込みエラー
progress-import-bad-file = .syllabus ファイルをドロップしてください
progress-print-preparing = 印刷用にシラバスを準備しています…
progress-print-failed = シラバス PDF を保存できませんでした
dialog-save-pdf = シラバス PDF を保存
file-filter-pdf = PDF
progress-saving-pdf = PDF を保存しています…
dialog-save-file = ファイルを保存
progress-translator-install-error = リーディングリスト用スクレイパーのインストールエラー
progress-migrate-start =
    { $count ->
        [one] { $count } 件のシラバスをコレクションノートへ移行中…
       *[other] { $count } 件のシラバスをコレクションノートへ移行中…
    }
progress-migrate-item = { $current } / { $total } を移行中…
progress-migrate-done =
    { $count ->
        [one] { $count } 件のシラバスを移行しました
       *[other] { $count } 件のシラバスを移行しました
    }
progress-migrate-empty-cleared =
    { $count ->
        [one] 空の設定 { $count } 件をクリアしました
       *[other] 空の設定 { $count } 件をクリアしました
    }
progress-migrate-not-found =
    { $count ->
        [one] { $count } 件のコレクションが見つかりません
       *[other] { $count } 件のコレクションが見つかりません
    }
progress-migrate-failed = { $count } 件が失敗
progress-migrate-remaining = 設定に { $count } 件が残っています
reading-time-minutes = { $minutes } 分
reading-time-hours =
    { $hours ->
        [one] { $hours } 時間
       *[other] { $hours } 時間
    }
reading-time-hours-and-minutes =
    { $hours ->
        [one] { $hours } 時間 { $minutes } 分
       *[other] { $hours } 時間 { $minutes } 分
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
tree-tooltip-reading-schedule = 読書スケジュール（自動管理）
tree-tooltip-auto-managed = Zotero Syllabus が自動管理
tree-tooltip-syllabus = シラバス

# User guide sample items (created at tour time; not used as match keys)
tour-sample-reading-1 = サンプル文献：授業リストの始め方
tour-sample-reading-2 = サンプル文献：読みながら注釈する
tour-sample-reading-3 = サンプル文献：来週の計画

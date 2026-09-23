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
menuHelp-openDocumentation = Zotero Syllabus ドキュメント
userGuide-start-title = Zotero Syllabus へようこそ
userGuide-start-desc =
    任意の Zotero コレクションを授業のリーディングリストにできます。授業ごとに整理し、優先度を設定し、次に読むものを把握しましょう。
userGuide-start-close = あとで通知
userGuide-exit = ツアーを終了
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
userGuide-readingSchedule-light-title = Open Reading Schedule
userGuide-readingSchedule-light-desc =
    The Reading Schedule tab gathers class due dates across your syllabi. Next opens it from the tab bar.
userGuide-home-title = Home view
userGuide-home-desc =
    At the library root, switch to Home for shelves of recent items and upcoming deadlines. Next selects your library home.
userGuide-subcollections-title = 任意：授業フォルダ
userGuide-subcollections-desc =
    授業ごとにフォルダをミラーしたい場合は、設定で「授業のサブコレクション」を有効にしてください。プラグインに子フォルダを管理させたくない場合はオフのままにしてください。
userGuide-finish-title = 準備完了です
userGuide-finish-desc =
    ヘルプ → Zotero Syllabus ユーザーガイドを開く、からいつでもこのツアーを再開できます。学習を楽しんでください。
userGuide-finish-prefs-title = You’re set
userGuide-finish-prefs-desc =
    Turn views on or off anytime in Preferences → Zotero Syllabus → Views. You can reopen this tour from Help.
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
reading-schedule-desc = Class due dates across your syllabi, so you can see what’s next.
view-tab-my-annotations = Annotation Feed
toolbar-my-annotations-open = Open Annotation Feed
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
page-density-cycle = { $next }に切り替え
page-density-row = 行
page-density-standard = 標準
page-density-expanded = 拡大
page-reader-enable = チェックボックスを有効にする
page-reader-disable = チェックボックスを無効にする
page-export = シラバスファイルを書き出す
page-import = シラバスファイルを読み込む
page-edit-settings = シラバス設定を編集
page-lock = シラバスをロック
page-unlock = シラバスのロックを解除
page-view-options-aria = Syllabus view options
page-view-checkboxes = Checkboxes
page-print = シラバスを PDF、Word、Markdown、または HTML として保存
page-save-pdf = PDF
page-save-word = Word
page-save-markdown = Markdown
page-save-html = HTML
page-publish = Publish online…
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
class-insert-here = ここに{ $nomenclature }を追加
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
item-pane-class-named = { $nomenclature } { $number }: { $title }
item-pane-mark-done = 完了にする
placeholder-class-number = 例：1、2、3…
field-priority = 優先度
field-instructions = 指示
placeholder-instructions = この課題の指示を追加…
assignment-delete = 課題を削除
item-pane-select-collection = コレクションを選択してシラバスの課題を表示

# Settings
settings-title = シラバス設定
settings-window-title = { $name } の設定
settings-view = View
settings-view-desc = Density and checkboxes for this syllabus.
settings-density = Density
settings-file = Syllabus file
settings-file-desc = Export or import a .syllabus metadata file for this collection.
settings-back = シラバスビューに戻る
settings-nomenclature = 呼称
settings-nomenclature-desc = 各回を指す用語を選びます（例：「週」「授業」「回」「セクション」）。
settings-singular = 単数形
settings-nomenclature-placeholder = 例：週、授業、回、セクション
settings-plural-label = 複数形：
settings-subcollections = 授業のサブコレクション
settings-subcollections-desc = オンにすると、課題がある各授業がこのコレクション配下にフォルダを持ちます。
settings-subcollections-checkbox = サブコレクションを作成しますか？
settings-bib-style = 参考文献スタイル
settings-bib-style-desc = 書誌参照に使う CSL（Citation Style Language）スタイルを選びます。
settings-citation-style = 引用スタイル
settings-user-default = ユーザー既定
settings-user-default-named = ユーザー既定：{ $name }
settings-priorities = 優先度
settings-priorities-desc = このシラバスの優先度の名前・色・並び順をカスタマイズします。
settings-priorities-global-title = グローバル優先度の既定値
settings-priorities-global-desc = 新しいシラバスはこれらの優先度をコピーします。既存のものは各自のリストを保ちます。
settings-priorities-global-link = グローバル既定値を編集…
settings-priorities-global-done = 完了
settings-priorities-global-reset = 組み込みの既定値に戻す
settings-priorities-set-global = グローバル既定値として使う
settings-priorities-set-global-confirm-title = グローバル既定値として使いますか？
settings-priorities-set-global-confirm-message =
    グローバル優先度の既定値がこのシラバスの優先度に置き換わります。新しいシラバスはこれらの名前・色・並び順をコピーします。既存のシラバスは変わりません。
settings-priorities-set-global-done = 新しいシラバス用のグローバル既定値として保存しました
settings-priorities-reset-global = グローバル既定値に戻す
settings-priorities-reset-global-confirm-title = グローバル既定値に戻しますか？
settings-priorities-reset-global-confirm-message =
    このシラバスの優先度をグローバル既定値に置き換えます。グローバル一覧にない優先度を使っている読書は移動またはクリアが必要です。
settings-priorities-reset-global-done = 優先度をグローバル既定値に戻しました
settings-add-priority = 新しい優先度を追加
settings-add-priority-button = 優先度を追加
settings-new-priority-name = 新しい優先度
settings-priority-move-up = 上へ
settings-priority-move-down = 下へ
settings-priority-color = 優先度の色
settings-priority-name-placeholder = 優先度の名前
settings-priority-delete = 優先度を削除
settings-priority-delete-title = 優先度を削除しますか？
settings-priority-delete-message =
    { $count ->
        [one] { $count } 件の読書が「{ $name }」を使用しています。この優先度を削除する前に処理を選んでください。
       *[other] { $count } 件の読書が「{ $name }」を使用しています。この優先度を削除する前に処理を選んでください。
    }
settings-priority-delete-migrate-label = 読書の移動先
settings-priority-delete-migrate = 移動して削除
settings-priority-delete-clear = 優先度をクリア
settings-priority-delete-cancel = キャンセル
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
gallery-sort-last-read = Last Read
gallery-sort-last-read-title = Sort by last read (most recent first)
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
gallery-layout-annotations = 注釈
gallery-layout-annotations-title = すべての注釈付きカバー
gallery-annotations-empty = 注釈はありません
gallery-annotations-none-heading = 注釈なし
gallery-annotations-show-empty = 注釈のないアイテムを表示
gallery-layout-magazine = マガジン
gallery-layout-magazine-title = 大小混在のマガジンレイアウト
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
progress-print-preparing = シラバスを準備しています…
progress-print-failed = シラバスを保存できませんでした
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
dialog-save-pdf = シラバス PDF を保存
file-filter-pdf = PDF
dialog-save-word = シラバスを Word として保存
file-filter-word = Word
dialog-save-markdown = シラバスを Markdown として保存
file-filter-markdown = Markdown
dialog-save-html = シラバスを HTML として保存
file-filter-html = HTML
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
annotations-quote-order-menu = 引用
annotations-quote-order-location = 位置
annotations-quote-order-location-title = 文書内の位置で引用を並べ替え
annotations-quote-order-date-added = 追加日
annotations-quote-order-date-added-title = 追加日で引用を並べ替え（古い順）
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
tree-tooltip-reading-schedule = 読書スケジュール（自動管理）
tree-tooltip-auto-managed = Zotero Syllabus が自動管理
tree-tooltip-syllabus = シラバス

# User guide sample items (created at tour time; not used as match keys)
tour-sample-reading-1 = サンプル文献：授業リストの始め方
tour-sample-reading-2 = サンプル文献：読みながら注釈する
tour-sample-reading-3 = サンプル文献：来週の計画

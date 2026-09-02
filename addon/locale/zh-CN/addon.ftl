startup-begin = 插件加载中
startup-finish = 插件已就绪
enable-syllabus-title = 转为教学大纲？
enable-syllabus-message = 将“{ $name }”转为教学大纲？将在此分类中创建一份教学大纲笔记。
enable-subcollections-title = 由插件管理课堂子分类？
enable-subcollections-message =
    开启后，插件将管理“{ $name }”下的子分类。这可能删除或改写你已有的子分类，造成数据丢失。

    具体行为：

    • 每个课堂会创建或沿用一个子分类，并按教学大纲重命名（例如“Class 1: Title”）。

    • 不是课堂文件夹、且自身没有教学大纲笔记的子分类会被删除。条目不会从文献库中删除，仍留在父分类中。

    • 每个课堂文件夹中的条目会按教学大纲笔记重写。文件夹中多余的条目只会从该文件夹移除。

    • 从教学大纲中删除某个课堂时，对应的子分类也会被删除。

    • 如果你删除了课堂文件夹，插件会再创建回来。

    之后关闭此选项将停止管理文件夹，已有文件夹会保留。

    要继续吗？
enable-reading-schedule-collection-title = 生成“阅读日程”分类？
enable-reading-schedule-collection-message =
    开启后，将在每个有教学大纲的文献库中创建顶层“阅读日程”分类，并为每个阅读日期（从 10 天前起）各建一个子分类。群组教学大纲会有自己的日程（条目不能跨库）。

    具体行为：

    • 日期文件夹会根据教学大纲自动创建、重命名并填充条目。

    • 这些文件夹中的条目会按日程重写。多余条目只会从文件夹中移除，不会从文献库删除。

    • 在此设置开启期间，若你删除该分类或某个日期文件夹，插件会重新创建。

    之后关闭此选项将删除这些“阅读日程”分类及其日期子分类。教学大纲中的条目会保留。

    要继续吗？
disable-reading-schedule-collection-title = 删除“阅读日程”分类？
disable-reading-schedule-collection-message =
    关闭后将删除由插件管理的“阅读日程”分类及其日期子分类。

    条目不会从文献库中删除，仍留在原教学大纲分类中。

    要继续吗？
prefs-title = Zotero Syllabus
prefs-table-title = 标题
prefs-table-detail = 详情
tabpanel-lib-tab-label = 库标签
tabpanel-reader-tab-label = 阅读器标签
menu-toggle-bibliography = 切换参考文献
managed-folder-banner-title = 由插件管理的文件夹
managed-folder-banner-class =
    请勿在此添加或移除条目。此课堂文件夹会与教学大纲同步，手动更改会被覆盖。
managed-folder-banner-schedule =
    请勿在此添加或移除条目。此阅读日程文件夹会与各教学大纲同步，手动更改会被覆盖。
menuHelp-openUserGuide = 打开 Zotero Syllabus 用户指南
userGuide-start-title = 欢迎使用 Zotero Syllabus
userGuide-start-desc =
    将任意 Zotero 分类变成课程阅读清单——按课堂组织、设置优先级，并跟踪接下来要读什么。
userGuide-start-close = 以后再说
userGuide-collection-title = 从分类开始
userGuide-collection-desc =
    教学大纲建立在分类上。我们将打开一个“Syllabus Tour”练习分类，并放入几篇示例阅读。
userGuide-syllabusButton-title = 转为教学大纲
userGuide-syllabusButton-desc =
    在条目工具栏点击「转为教学大纲」，将此分类转为课程大纲。本指南会自动切换过去。
userGuide-addClass-title = 添加课堂
userGuide-addClass-desc =
    课堂（或周次 / 单元——稍后可改名）是教学大纲的分节。先添加一个开始。
userGuide-assign-title = 分配阅读
userGuide-assign-desc =
    将条目拖入课堂，或右键 → 分配到课堂。未分配的条目会留在「扩展阅读」中。
userGuide-itemPane-title = 在条目面板中编辑
userGuide-itemPane-desc =
    选中一篇阅读，即可在「阅读作业」区域设置课堂编号、优先级、说明和完成状态。
userGuide-readingDate-title = 设置课堂截止日期
userGuide-readingDate-desc =
    每个课堂都可以设置阅读日期。点击「下一步」后我们会为第 1 课设置一个日期，然后你可以打开阅读日程。
userGuide-readingSchedule-title = 打开阅读日程
userGuide-readingSchedule-desc =
    「阅读日程」会汇总各教学大纲中带截止日期的课堂。下一步将打开它，方便查看接下来的安排。
userGuide-subcollections-title = 可选：课堂文件夹
userGuide-subcollections-desc =
    需要按课堂镜像文件夹吗？在设置中启用「课堂子分类」。除非希望插件管理子文件夹，否则请保持关闭。
userGuide-finish-title = 准备就绪
userGuide-finish-desc =
    可随时通过「帮助 → 打开 Zotero Syllabus 用户指南」重新打开本教程。祝学习顺利！
userGuide-empty-title = 按课堂组织此分类
userGuide-empty-desc =
    为每周或每节课添加课堂，然后分配阅读。也可以先跟随简短引导教程。
userGuide-empty-tour = 开始教程

# Shared
app-name = Zotero Syllabus
this-collection = 此分类
untitled = 未命名
nav-back = 返回
nav-previous = 上一步
nav-next = 下一步

# View tabs / toolbar
view-tab-checklist = 清单
view-tab-checklist-tooltip = 以清单视图显示
view-tab-syllabus = 教学大纲
view-tab-syllabus-tooltip = 以教学大纲视图显示
view-tab-create-syllabus = 转为教学大纲
view-tab-create-syllabus-tooltip = 将此分类转为教学大纲
view-tab-table = 表格
view-tab-table-tooltip = 以表格视图显示
view-tab-gallery = 图库
view-tab-gallery-tooltip = 以图库视图显示
view-tab-reading-schedule = 阅读日程
toolbar-reading-schedule-review = 查看阅读日程
toolbar-reading-schedule-open = 打开阅读日程

# Context menus
menu-set-priority = 设置优先级
menu-none = （无）
menu-assign-to-class = 分配到课堂
menu-no-collection = （未选择分类）
menu-class-label = { $nomenclature } { $number }
menu-add-to-new-class = 添加到新{ $nomenclature } { $number }
menu-set-reading-status = 设置阅读状态
status-done = 已完成
status-not-done = 未完成

# Syllabus page
page-toc-title = 目录
placeholder-add-title = 添加标题…
page-compact-enable = 启用紧凑模式
page-compact-disable = 关闭紧凑模式
page-reader-enable = 启用阅读模式
page-reader-disable = 关闭阅读模式
page-export = 导出教学大纲文件
page-import = 导入教学大纲文件
page-edit-settings = 编辑教学大纲设置
page-lock = 锁定教学大纲
page-unlock = 解锁教学大纲
page-print = 将教学大纲视图中的列表打印为 PDF
placeholder-course-code = 课程代码
placeholder-institution = 院校
placeholder-add-description = 添加描述…
page-add-class = 添加{ $nomenclature } { $number }
page-add-to-class = 添加到{ $nomenclature } { $number }
page-drop-create-class = 拖放到此处以创建{ $nomenclature } { $number }
page-drop-import-file = 拖放 .syllabus 文件以导入
further-reading-heading = 扩展阅读
sort-label = 排序
further-reading-sort-aria = 排序扩展阅读
sort-by-title = 标题
sort-by-creator = 创建者
sort-by-date = 日期
further-reading-empty-desc = 此部分中的条目尚未分配到任何课堂。
toc-empty = 暂无课堂
placeholder-url = https://
links-delete = 删除链接
links-edit = 编辑链接
links-add = 添加链接
bibliography-heading = 参考文献

# Class groups / cards
mark-done = 标记为已完成
mark-not-done = 标记为未完成
class-due-date-label = 截止日期：
class-reset-sort = 重置排序
class-move-up = 上移{ $nomenclature }
class-move-down = 下移{ $nomenclature }
class-delete = 删除{ $nomenclature }
class-dropzone-hint = 将条目拖到{ $nomenclature } { $number }
due-date-clear = 清除截止日期
due-date-add = 添加截止日期
placeholder-select-date = 选择日期
item-in-publication = 载于 { $name }
attachment-url = URL
attachment-pdf = PDF
attachment-snapshot = 快照
attachment-epub = EPUB
attachment-html = HTML
attachment-doc = DOC
attachment-txt = TXT
attachment-zip = ZIP
attachment-file = 文件
attachment-view = 查看
attachment-open = 打开 { $label }
assignment-duplicate = 创建重复作业
assignment-duplicate-label = 重复
assignment-unassign-class = 从课堂中移除
assignment-unassign-syllabus = 从教学大纲中移除
assignment-unassign-label = 取消分配
priority-set-to = 将优先级设为 { $name }
priority-clear = 清除优先级
youtube-play = 在 YouTube 上播放 { $title }

# Item pane
item-pane-not-found = 未找到条目
item-pane-none-selected = 未选择条目
item-pane-n-selected = 已选择 { $count } 个条目
item-pane-current-view = 当前视图
item-pane-also-assigned = 同时分配到
item-pane-assignment-n = 作业 #{ $number }
item-pane-assignment-for = 用于 { $title }
item-pane-due = 截止 { $date }
item-pane-reference-material = 参考资料
item-pane-mark-done = 标记完成
placeholder-class-number = 例如 1、2、3…
field-priority = 优先级
field-instructions = 说明
placeholder-instructions = 为此作业添加说明…
assignment-delete = 删除作业
item-pane-select-collection = 选择一个分类以查看教学大纲作业

# Settings
settings-title = 教学大纲设置
settings-back = 返回教学大纲视图
settings-nomenclature = 称谓
settings-nomenclature-desc = 选择用于指称各次课的用语（例如“周”“课堂”“单元”“节”）。
settings-singular = 单数形式
settings-nomenclature-placeholder = 例如：周、课堂、单元、节
settings-plural-label = 复数形式：
settings-subcollections = 课堂子分类
settings-subcollections-desc = 默认关闭。启用后，每个课堂会在此分类下拥有一个文件夹。文件夹会按教学大纲创建、重命名和删除——包括已有子分类，它们也可能被删除。关闭此选项后文件夹会保留。
settings-subcollections-checkbox = 创建子分类？
settings-bib-style = 参考文献样式
settings-bib-style-desc = 为文献引用选择 CSL（Citation Style Language）样式。未设置时将使用用户默认样式。
settings-citation-style = 引用样式
settings-user-default = 用户默认
settings-user-default-named = 用户默认：{ $name }
settings-priorities = 优先级
settings-priorities-desc = 自定义优先级名称、颜色和排序。
settings-add-priority = 添加新优先级
settings-add-priority-button = 添加优先级
settings-new-priority-name = 新优先级
settings-priority-move-up = 上移
settings-priority-move-down = 下移
settings-priority-color = 优先级颜色
settings-priority-name-placeholder = 优先级名称
settings-priority-delete = 删除优先级
settings-priority-name-label = 名称
settings-priority-preview = 预览：
priority-default-course-info = 课程信息
priority-default-essential = 必读
priority-default-recommended = 推荐
priority-default-optional = 选读

# Gallery
gallery-empty-filtered = 没有匹配的条目。
gallery-empty = 此分类中没有条目。
gallery-untagged = 无标签
gallery-untagged-desc = 此部分中的条目没有标签。
gallery-empty-subcollections = 此分类中没有子分类或条目。
gallery-unnumbered = 未编号
gallery-unnumbered-desc = 已分配但没有课堂编号。
gallery-sort-auto = 自动
gallery-sort-auto-title = 自动排序（分类或教学大纲）
gallery-sort-az = A–Z
gallery-sort-az-title = 按 A–Z 排序
gallery-sort-date = 日期
gallery-sort-date-title = 按日期排序（最新优先）
gallery-group-none = 无
gallery-group-none-title = 不分组
gallery-group-type = 类型
gallery-group-type-title = 按条目类型分组
gallery-group-tags = 标签
gallery-group-tags-title = 按标签分组
gallery-group-subcollections = 子分类
gallery-group-subcollections-title = 按子分类分组
gallery-group-classes = 课堂
gallery-group-classes-title = 按课堂分组
gallery-layout-cover = 封面
gallery-layout-cover-title = 封面图
gallery-layout-card = 卡片
gallery-layout-card-title = 教学大纲卡片
gallery-layout-magazine = 杂志
gallery-layout-magazine-title = 混合尺寸的杂志布局
magazine-shelf-watch = 观看
magazine-shelf-watch-title = 最近添加的视频
magazine-shelf-listen = 收听
magazine-shelf-listen-title = 最近添加的音频
gallery-options-aria = 图库视图选项
gallery-options-title = 视图选项
gallery-menu-view = 视图
gallery-menu-sort = 排序
gallery-menu-group = 分组方式
gallery-menu-type-size = 文字大小
gallery-type-small = 小
gallery-type-small-title = 较小的杂志文字
gallery-type-large = 大
gallery-type-large-title = 较大的杂志文字
gallery-in-this-collection = 本收藏中
gallery-groups-nav-aria = 分组
gallery-group-jump = 显示{ $name }
gallery-prefs-summary = { $layout } / { $sort } / { $group }
gallery-page-of = 第 { $page } 页，共 { $total } 页

# Reading schedule
schedule-edit-settings = 编辑阅读日程设置
schedule-empty-title = 尚未安排阅读
schedule-empty-desc = 为课堂添加阅读日期即可在此查看。
schedule-this-week = 本周
schedule-next-week = 下周
schedule-settings-title = 阅读日程设置
schedule-settings-back = 返回阅读日程
schedule-settings-library = 文库分类
schedule-settings-desc =
    默认关闭。启用后，将在“我的文库”中保留顶层“阅读日程”分类，并为每个近期和即将到来的阅读日期各建一个文件夹。文件夹会自动创建、重命名并填充。关闭此选项将删除该分类；教学大纲中的条目会保留。
schedule-settings-checkbox = 生成“阅读日程”分类？
schedule-day-managed-banner = 由各教学大纲自动管理。此处的更改会被覆盖。
schedule-day-empty = 当天没有安排阅读。
schedule-window-empty = 日程范围内尚无阅读。为课堂添加阅读日期即可在此查看。
schedule-no-dates = 无日期
schedule-of-collection = 属于 { $name }
schedule-of-collection-in-library = 属于 { $collection }（{ $library }）
schedule-open-syllabus = 打开 { $title } 的教学大纲
class-folder-managed-banner = 由此教学大纲自动管理。此文件夹中的更改会被覆盖。

# Columns
column-reading-instructions = 阅读说明
column-status = 状态
column-reading-time = 阅读时间
column-syllabus-info = 教学大纲信息
column-class-hash = #{ $number }

# Progress / dialogs
dialog-save-export = 保存教学大纲导出
progress-import-success-title = 导入成功
progress-import-success-text = 已成功导入并合并教学大纲元数据
progress-import-error-title = 导入错误
progress-import-bad-file = 请拖放 .syllabus 文件
progress-print-preparing = 正在准备打印教学大纲…
progress-print-failed = 无法保存教学大纲 PDF
dialog-save-pdf = 保存教学大纲 PDF
file-filter-pdf = PDF
progress-saving-pdf = 正在保存 PDF…
dialog-save-file = 保存文件
progress-translator-install-error = 安装阅读清单抓取器时出错
progress-migrate-start =
    { $count ->
        [one] 正在将 { $count } 份教学大纲迁移到分类笔记…
       *[other] 正在将 { $count } 份教学大纲迁移到分类笔记…
    }
progress-migrate-item = 正在迁移第 { $current } 份，共 { $total } 份…
progress-migrate-done =
    { $count ->
        [one] 已迁移 { $count } 份教学大纲
       *[other] 已迁移 { $count } 份教学大纲
    }
progress-migrate-empty-cleared =
    { $count ->
        [one] 已清除 { $count } 项空偏好设置
       *[other] 已清除 { $count } 项空偏好设置
    }
progress-migrate-not-found =
    { $count ->
        [one] 未找到 { $count } 个分类
       *[other] 未找到 { $count } 个分类
    }
progress-migrate-failed = { $count } 项失败
progress-migrate-remaining = 偏好设置中还剩 { $count } 项
reading-time-minutes = { $minutes } 分钟
reading-time-hours =
    { $hours ->
        [one] { $hours } 小时
       *[other] { $hours } 小时
    }
reading-time-hours-and-minutes =
    { $hours ->
        [one] { $hours } 小时 { $minutes } 分钟
       *[other] { $hours } 小时 { $minutes } 分钟
    }

# Collection tree
tree-tooltip-reading-schedule = 阅读日程（自动管理）
tree-tooltip-auto-managed = 由 Zotero Syllabus 自动管理
tree-tooltip-syllabus = 教学大纲

# User guide sample items (created at tour time; not used as match keys)
tour-sample-reading-1 = 示例阅读：开始整理课程书单
tour-sample-reading-2 = 示例阅读：边读边批注
tour-sample-reading-3 = 示例阅读：规划下周阅读

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
userGuide-syllabusButton-title = 打开教学大纲视图
userGuide-syllabusButton-desc =
    在条目工具栏点击「教学大纲」，用课程大纲替换列表视图。本指南会自动切换过去。
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

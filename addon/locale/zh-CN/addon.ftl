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
prefs-title = Zotero Syllabus
prefs-table-title = 标题
prefs-table-detail = 详情
tabpanel-lib-tab-label = 库标签
tabpanel-reader-tab-label = 阅读器标签
menu-toggle-bibliography = 切换参考文献

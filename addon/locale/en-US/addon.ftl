startup-begin = Addon is loading
startup-finish = Addon is ready
enable-syllabus-title = Turn into a syllabus?
enable-syllabus-message = Turn “{ $name }” into a syllabus? A syllabus note will be stored in this collection.
enable-subcollections-title = Manage class subcollections?
enable-subcollections-message =
    Turning this on lets the plugin manage child collections under “{ $name }”. That can delete or rewrite folders you already have.

    What happens:

    • One folder is created or adopted per class, and renamed to match the syllabus (for example “Class 1: Title”).

    • Child collections that are not those class folders — and that do not have their own syllabus note — will be deleted. Items are not deleted from the library; they stay in the parent collection.

    • Each class folder’s items are overwritten from the syllabus note. Extra items in a folder are removed from the folder only.

    • Removing a class from the syllabus deletes that class folder.

    • If you delete a class folder, the plugin recreates it.

    Turning this off later stops managing folders; existing folders are left in place.

    Continue?
enable-reading-schedule-collection-title = Generate Reading Schedule collection?
enable-reading-schedule-collection-message =
    Turning this on creates a top-level “Reading Schedule” collection in My Library with a folder for each reading date (from 10 days ago onward).

    What happens:

    • Date folders are created, renamed, and filled automatically from your syllabi.

    • Items in those folders are overwritten from the schedule. Extra items are removed from the folder only — not from the library.

    • If you delete the collection or a date folder, the plugin recreates it while this setting is on.

    • Group-library syllabi are not included (items cannot cross libraries).

    Turning this off later deletes the “Reading Schedule” collection and its date folders. Your syllabus items stay in place.

    Continue?
disable-reading-schedule-collection-title = Remove Reading Schedule collection?
disable-reading-schedule-collection-message =
    Turning this off deletes the managed “Reading Schedule” collection and its date folders.

    Items are not deleted from your library; they remain in their original syllabus collections.

    Continue?
prefs-title = Zotero Syllabus
prefs-table-title = Title
prefs-table-detail = Detail
tabpanel-lib-tab-label = Lib Tab
tabpanel-reader-tab-label = Reader Tab
menu-toggle-bibliography = Toggle Bibliography
managed-folder-banner-title = Auto-managed folder
managed-folder-banner-class =
    Don’t add or remove items here. This class folder is kept in sync with the syllabus; manual edits are overwritten.
managed-folder-banner-schedule =
    Don’t add or remove items here. This reading schedule folder is kept in sync with your syllabi; manual edits are overwritten.
menuHelp-openUserGuide = Open Zotero Syllabus User Guide
userGuide-start-title = Welcome to Zotero Syllabus
userGuide-start-desc =
    Turn any Zotero collection into a course reading list — organize by class, set priorities, and track what to read next.
userGuide-start-close = Remind me later
userGuide-collection-title = Start from a collection
userGuide-collection-desc =
    Syllabi live on collections. We’ll open a “Syllabus Tour” playground collection with a couple of sample readings.
userGuide-syllabusButton-title = Open Syllabus view
userGuide-syllabusButton-desc =
    Click Syllabus in the items toolbar to replace the list with your course outline. The tour will switch there for you.
userGuide-addClass-title = Add a class
userGuide-addClass-desc =
    Classes (or weeks / sessions — you can rename them later) are the sections of your syllabus. Add one to get started.
userGuide-assign-title = Assign readings
userGuide-assign-desc =
    Drag items into a class, or right-click → Assign to a class. Unassigned items stay under Further reading.
userGuide-itemPane-title = Edit in the item pane
userGuide-itemPane-desc =
    Select a reading to set class number, priority, instructions, and done status in the Reading assignments section.
userGuide-readingDate-title = Set a class due date
userGuide-readingDate-desc =
    Each class can have a reading date. We’ll set one on Class 1 when you click Next — then you can open the Reading Schedule.
userGuide-readingSchedule-title = Open Reading Schedule
userGuide-readingSchedule-desc =
    Reading Schedule gathers classes with due dates across your syllabi. Next opens it so you can see what’s coming up.
userGuide-subcollections-title = Optional: class folders
userGuide-subcollections-desc =
    Want folder mirrors per class? Enable Class subcollections in Settings. Leave this off unless you want the plugin to manage child folders.
userGuide-finish-title = You’re ready
userGuide-finish-desc =
    Reopen this tour anytime from Help → Open Zotero Syllabus User Guide. Happy studying!
userGuide-empty-title = Organize this collection by class
userGuide-empty-desc =
    Add classes for each week or session, then assign readings. You can also take a short guided tour.
userGuide-empty-tour = Take the tour

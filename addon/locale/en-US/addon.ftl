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
    Turning this on creates a top-level “Reading Schedule” collection in each library that has a syllabus, with a folder for each reading date (from 10 days ago onward). Group syllabi get their own schedule because items cannot cross libraries.

    What happens:

    • Date folders are created, renamed, and filled automatically from your syllabi.

    • Items in those folders are overwritten from the schedule. Extra items are removed from the folder only — not from the library.

    • If you delete the collection or a date folder, the plugin recreates it while this setting is on.

    Turning this off later deletes those “Reading Schedule” collections and their date folders. Your syllabus items stay in place.

    Continue?
disable-reading-schedule-collection-title = Remove Reading Schedule collection?
disable-reading-schedule-collection-message =
    Turning this off deletes the managed “Reading Schedule” collection(s) and their date folders.

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
userGuide-syllabusButton-title = Turn into a syllabus
userGuide-syllabusButton-desc =
    Click Turn into Syllabus in the items toolbar to turn this collection into a course outline. The tour will switch there for you.
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

# Shared
app-name = Zotero Syllabus
this-collection = this collection
untitled = Untitled
nav-back = Back
nav-previous = Previous
nav-next = Next

# View tabs / toolbar
view-tab-checklist = Checklist
view-tab-checklist-tooltip = View as Checklist
view-tab-syllabus = Syllabus
view-tab-syllabus-tooltip = View as Syllabus
view-tab-create-syllabus = Turn into Syllabus
view-tab-create-syllabus-tooltip = Turn this collection into a syllabus
view-tab-table = Table
view-tab-table-tooltip = View as Table
view-tab-gallery = Gallery
view-tab-gallery-tooltip = View as Gallery
view-tab-reading-schedule = Reading Schedule
toolbar-reading-schedule-review = Review your Reading Schedule
toolbar-reading-schedule-open = Open Reading Schedule

# Context menus
menu-set-priority = Set Priority
menu-none = (None)
menu-assign-to-class = Assign to a class
menu-no-collection = (No collection selected)
menu-class-label = { $nomenclature } { $number }
menu-add-to-new-class = Add to new { $nomenclature } { $number }
menu-set-reading-status = Set Reading Status
status-done = Done
status-not-done = Not Done

# Syllabus page
page-toc-title = Table of Contents
placeholder-add-title = Add a title…
page-compact-enable = Enable compact mode
page-compact-disable = Disable compact mode
page-reader-enable = Enable reader mode
page-reader-disable = Disable reader mode
page-export = Export syllabus file
page-import = Import syllabus file
page-edit-settings = Edit syllabus settings
page-lock = Lock syllabus
page-unlock = Unlock syllabus
page-print = Print the list in Syllabus view as a PDF
placeholder-course-code = Course Code
placeholder-institution = Institution
placeholder-add-description = Add a description…
page-add-class = Add { $nomenclature } { $number }
page-add-to-class = Add to { $nomenclature } { $number }
page-drop-create-class = Drop item here to create { $nomenclature } { $number }
page-drop-import-file = Drop .syllabus file to import
further-reading-heading = Further reading
sort-label = Sort
further-reading-sort-aria = Sort further reading
sort-by-title = Title
sort-by-creator = Creator
sort-by-date = Date
further-reading-empty-desc = Items in this section have not been assigned to any class.
toc-empty = No classes available
placeholder-url = https://
links-delete = Delete link
links-edit = Edit link
links-add = Add link
bibliography-heading = Bibliography

# Class groups / cards
mark-done = Mark as done
mark-not-done = Mark as not done
class-due-date-label = Due date:
class-reset-sort = Reset sort order
class-move-up = Move { $nomenclature } up
class-move-down = Move { $nomenclature } down
class-delete = Delete { $nomenclature }
class-dropzone-hint = Drag items to { $nomenclature } { $number }
due-date-clear = Clear due date
due-date-add = Add a due date
placeholder-select-date = Select date
item-in-publication = in { $name }
attachment-url = URL
attachment-pdf = PDF
attachment-snapshot = Snapshot
attachment-epub = EPUB
attachment-html = HTML
attachment-doc = DOC
attachment-txt = TXT
attachment-zip = ZIP
attachment-file = File
attachment-view = View
attachment-open = Open { $label }
assignment-duplicate = Create duplicate assignment
assignment-duplicate-label = Duplicate
assignment-unassign-class = Remove from class
assignment-unassign-syllabus = Remove from syllabus
assignment-unassign-label = Unassign
priority-set-to = Set priority to { $name }
priority-clear = Clear priority
youtube-play = Play { $title } on YouTube

# Item pane
item-pane-not-found = Item not found
item-pane-none-selected = No items selected
item-pane-n-selected = { $count } items selected
item-pane-current-view = current view
item-pane-also-assigned = also assigned to
item-pane-assignment-n = Assignment #{ $number }
item-pane-assignment-for = for { $title }
item-pane-due = Due { $date }
item-pane-reference-material = Reference material
item-pane-mark-done = Mark done
placeholder-class-number = e.g., 1, 2, 3…
field-priority = Priority
field-instructions = Instructions
placeholder-instructions = Add instructions for this assignment…
assignment-delete = Delete assignment
item-pane-select-collection = Select a collection to view syllabus assignments

# Settings
settings-title = Syllabus Settings
settings-back = Back to syllabus view
settings-nomenclature = Nomenclature
settings-nomenclature-desc = Choose the term used to refer to individual sessions (e.g., “week”, “class”, “session”, “section”).
settings-singular = Singular form
settings-nomenclature-placeholder = e.g., week, class, session, section
settings-plural-label = Plural form:
settings-subcollections = Class subcollections
settings-subcollections-desc = Off by default. When enabled, each class gets a folder under this collection. Folders are created, renamed, and removed to match the syllabus — including existing child collections, which can be deleted. Turning this off leaves folders in place.
settings-subcollections-checkbox = Create subcollections?
settings-bib-style = Bibliography Style
settings-bib-style-desc = Choose a CSL (Citation Style Language) style for bibliographic references. If not set, the user default style will be used.
settings-citation-style = Citation Style
settings-user-default = User default
settings-user-default-named = User default: { $name }
settings-priorities = Priorities
settings-priorities-desc = Customize priority names, colors, and sort order.
settings-add-priority = Add new priority
settings-add-priority-button = Add Priority
settings-new-priority-name = New Priority
settings-priority-move-up = Move up
settings-priority-move-down = Move down
settings-priority-color = Priority color
settings-priority-name-placeholder = Priority name
settings-priority-delete = Delete priority
settings-priority-name-label = Name
settings-priority-preview = Preview:
priority-default-course-info = Course Information
priority-default-essential = Essential
priority-default-recommended = Recommended
priority-default-optional = Optional

# Gallery
gallery-empty-filtered = No matching items.
gallery-empty = No items in this collection.
gallery-untagged = Untagged
gallery-untagged-desc = Items in this section have no tags.
gallery-empty-subcollections = No subcollections or items in this collection.
gallery-unnumbered = Unnumbered
gallery-unnumbered-desc = Assigned without a class number.
gallery-sort-auto = Auto
gallery-sort-auto-title = Automatic order (collection or syllabus)
gallery-sort-az = A–Z
gallery-sort-az-title = Sort A–Z
gallery-sort-date = Date
gallery-sort-date-title = Sort by date (newest first)
gallery-group-none = None
gallery-group-none-title = No grouping
gallery-group-type = Type
gallery-group-type-title = Group by item type
gallery-group-tags = Tags
gallery-group-tags-title = Group by tags
gallery-group-subcollections = Collections
gallery-group-subcollections-title = Group by sub-collections
gallery-group-classes = Classes
gallery-group-classes-title = Group by classes
gallery-layout-cover = Cover
gallery-layout-cover-title = Cover art
gallery-layout-card = Card
gallery-layout-card-title = Syllabus cards
gallery-layout-magazine = Magazine
gallery-layout-magazine-title = Mixed-size magazine layout
magazine-shelf-watch = Watch
magazine-shelf-watch-title = Recently added videos
magazine-shelf-listen = Listen
magazine-shelf-listen-title = Recently added audio
gallery-options-aria = Gallery view options
gallery-options-title = View options
gallery-menu-view = View
gallery-menu-sort = Sort
gallery-menu-group = Group by
gallery-menu-type-size = Text size
gallery-type-small = Small
gallery-type-small-title = Smaller magazine text
gallery-type-large = Large
gallery-type-large-title = Larger magazine text
gallery-in-this-collection = In this collection
gallery-groups-nav-aria = Groups
gallery-group-jump = Show { $name }
gallery-prefs-summary = { $layout } / { $sort } / { $group }
gallery-page-of = Page { $page } of { $total }

# Reading schedule
schedule-edit-settings = Edit reading schedule settings
schedule-empty-title = No readings scheduled
schedule-empty-desc = Add reading dates to classes to see them here.
schedule-this-week = This week
schedule-next-week = Next week
schedule-settings-title = Reading Schedule Settings
schedule-settings-back = Back to reading schedule
schedule-settings-library = Library collection
schedule-settings-desc =
    Off by default. When enabled, a top-level “Reading Schedule” collection is kept in My Library with a folder for each recent and upcoming reading date. Folders are created, renamed, and filled automatically. Turning this off deletes that collection; syllabus items stay in place.
schedule-settings-checkbox = Generate “Reading Schedule” collection?
schedule-day-managed-banner = Auto-managed from your syllabi. Edits here are overwritten.
schedule-day-empty = No readings scheduled for this day.
schedule-window-empty = No readings in the schedule window yet. Add reading dates to classes to see them here.
schedule-no-dates = No dates
schedule-of-collection = of { $name }
schedule-of-collection-in-library = of { $collection } ({ $library })
schedule-open-syllabus = Open syllabus for { $title }
class-folder-managed-banner = Auto-managed from this syllabus. Edits in this folder are overwritten.

# Columns
column-reading-instructions = Reading Instructions
column-status = Status
column-reading-time = Reading Time
column-syllabus-info = Syllabus Info
column-class-hash = #{ $number }

# Progress / dialogs
dialog-save-export = Save Syllabus Export
progress-import-success-title = Import Success
progress-import-success-text = Successfully imported and merged syllabus metadata
progress-import-error-title = Import Error
progress-import-bad-file = Please drop a .syllabus file
progress-print-preparing = Preparing syllabus for print…
progress-print-failed = Could not save the syllabus PDF
dialog-save-pdf = Save Syllabus PDF
file-filter-pdf = PDF
progress-saving-pdf = Saving PDF…
dialog-save-file = Save File
progress-translator-install-error = Error installing reading-list scrapers
progress-migrate-start =
    { $count ->
        [one] Migrating { $count } syllabus to collection notes…
       *[other] Migrating { $count } syllabi to collection notes…
    }
progress-migrate-item = Migrating { $current } of { $total }…
progress-migrate-done =
    { $count ->
        [one] Migrated { $count } syllabus
       *[other] Migrated { $count } syllabi
    }
progress-migrate-empty-cleared =
    { $count ->
        [one] { $count } empty pref cleared
       *[other] { $count } empty prefs cleared
    }
progress-migrate-not-found =
    { $count ->
        [one] { $count } collection not found
       *[other] { $count } collections not found
    }
progress-migrate-failed = { $count } failed
progress-migrate-remaining = { $count } left in preferences
reading-time-minutes = { $minutes } min
reading-time-hours =
    { $hours ->
        [one] { $hours } hr
       *[other] { $hours } hrs
    }
reading-time-hours-and-minutes =
    { $hours ->
        [one] { $hours } hr { $minutes } min
       *[other] { $hours } hrs { $minutes } min
    }

# Collection tree
tree-tooltip-reading-schedule = Reading Schedule (auto-managed)
tree-tooltip-auto-managed = Auto-managed by Zotero Syllabus
tree-tooltip-syllabus = Syllabus

# User guide sample items (created at tour time; not used as match keys)
tour-sample-reading-1 = Sample reading: Getting started with course lists
tour-sample-reading-2 = Sample reading: Annotating as you go
tour-sample-reading-3 = Sample reading: Planning the week ahead

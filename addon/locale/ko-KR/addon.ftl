startup-begin = 부가 기능을 불러오는 중
startup-finish = 부가 기능을 사용할 준비가 되었습니다
enable-syllabus-title = 강의계획서로 전환할까요?
enable-syllabus-message = “{ $name }”을(를) 강의계획서로 전환할까요? 이 컬렉션에 강의계획서 노트가 저장됩니다.
enable-subcollections-title = 수업 하위 컬렉션을 관리할까요?
enable-subcollections-message =
    이 설정을 켜면 플러그인이 “{ $name }” 아래의 하위 컬렉션을 관리합니다. 이미 있는 폴더가 삭제되거나 다시 쓰일 수 있습니다.

    동작:

    • 과제가 있는 수업마다 폴더가 만들어지거나 가져와지며, 강의계획서에 맞게 이름이 바뀝니다(예: “수업 1: 제목”).

    • 과제가 없는 수업에는 폴더가 만들어지지 않습니다. 그런 수업의 기존 폴더는 삭제됩니다.

    • 그러한 수업 폴더가 아니고 자체 강의계획서 노트도 없는 하위 컬렉션은 삭제됩니다. 항목은 라이브러리에서 삭제되지 않으며 상위 컬렉션에 남습니다.

    • 각 수업 폴더의 항목은 강의계획서 노트에서 덮어씁니다. 폴더에 있는 여분 항목은 해당 폴더에서만 제거됩니다.

    • 강의계획서에서 수업을 제거하면 해당 수업 폴더가 삭제됩니다.

    • 아직 과제가 있는 수업 폴더를 삭제하면 플러그인이 다시 만듭니다.

    나중에 끄면 폴더 관리가 중단되며, 기존 폴더는 그대로 둡니다.

    계속할까요?
enable-reading-schedule-collection-title = “읽기 일정” 컬렉션을 생성할까요?
enable-reading-schedule-collection-message =
    이 설정을 켜면 내 라이브러리에 최상위 “읽기 일정” 컬렉션이 만들어지고, 각 읽기 날짜(10일 전부터)마다 폴더가 생깁니다.

    동작:

    • 날짜 폴더는 강의계획서에서 자동으로 만들고, 이름을 바꾸며, 채웁니다.

    • 해당 폴더의 항목은 일정에서 덮어씁니다. 여분 항목은 폴더에서만 제거되며 라이브러리에서는 삭제되지 않습니다.

    • 이 설정이 켜져 있는 동안 컬렉션이나 날짜 폴더를 삭제하면 플러그인이 다시 만듭니다.

    • 그룹 라이브러리의 강의계획서는 포함되지 않습니다(항목은 라이브러리를 넘나들 수 없습니다).

    나중에 끄면 “읽기 일정” 컬렉션과 날짜 폴더가 삭제됩니다. 강의계획서의 항목은 그대로 남습니다.

    계속할까요?
disable-reading-schedule-collection-title = “읽기 일정” 컬렉션을 제거할까요?
disable-reading-schedule-collection-message =
    이 설정을 끄면 관리되는 “읽기 일정” 컬렉션과 날짜 폴더가 삭제됩니다.

    항목은 라이브러리에서 삭제되지 않으며 원래 강의계획서 컬렉션에 남습니다.

    계속할까요?
prefs-title = Zotero Syllabus
prefs-table-title = 제목
prefs-table-detail = 세부 정보
tabpanel-lib-tab-label = 라이브러리 탭
tabpanel-reader-tab-label = 리더 탭
menu-toggle-bibliography = 참고문헌 표시 전환
managed-folder-banner-title = 자동 관리 폴더
managed-folder-banner-class =
    여기에 항목을 추가하거나 제거하지 마세요. 이 수업 폴더는 강의계획서와 동기화되며, 수동 편집은 덮어쓰입니다.
managed-folder-banner-schedule =
    여기에 항목을 추가하거나 제거하지 마세요. 이 읽기 일정 폴더는 강의계획서와 동기화되며, 수동 편집은 덮어쓰입니다.
menuHelp-openUserGuide = Zotero Syllabus 사용자 가이드 열기
userGuide-start-title = Zotero Syllabus에 오신 것을 환영합니다
userGuide-start-desc =
    어떤 Zotero 컬렉션이든 강의 읽기 목록으로 바꿀 수 있습니다. 수업별로 정리하고, 우선순위를 정하고, 다음에 읽을 것을 추적하세요.
userGuide-start-close = 나중에 알림
userGuide-collection-title = 컬렉션에서 시작
userGuide-collection-desc =
    강의계획서는 컬렉션에 있습니다. 샘플 읽기가 몇 편 들어 있는 “Syllabus Tour” 연습 컬렉션을 엽니다.
userGuide-syllabusButton-title = 강의계획서로 전환
userGuide-syllabusButton-desc =
    항목 도구 모음에서 강의계획서로 전환을 클릭하면 이 컬렉션이 강의 개요로 전환됩니다. 투어가 그 화면으로 전환합니다.
userGuide-addClass-title = 수업 추가
userGuide-addClass-desc =
    수업(또는 주 / 회차 — 나중에 이름을 바꿀 수 있습니다)은 강의계획서의 구역입니다. 하나를 추가해 시작하세요.
userGuide-assign-title = 읽기 자료 배정
userGuide-assign-desc =
    항목을 수업으로 끌어다 놓거나, 마우스 오른쪽 클릭 → 수업에 배정하세요. 배정되지 않은 항목은 추가 읽기에 남습니다.
userGuide-itemPane-title = 항목 창에서 편집
userGuide-itemPane-desc =
    읽기 자료를 선택하면 읽기 과제 섹션에서 수업 번호, 우선순위, 안내, 완료 상태를 설정할 수 있습니다.
userGuide-readingDate-title = 수업 마감일 설정
userGuide-readingDate-desc =
    각 수업에 읽기 날짜를 둘 수 있습니다. 다음을 클릭하면 수업 1에 날짜를 넣은 뒤 읽기 일정을 열 수 있습니다.
userGuide-readingSchedule-title = 읽기 일정 열기
userGuide-readingSchedule-desc =
    읽기 일정은 강의계획서 전반에서 마감일이 있는 수업을 모읍니다. 다음을 누르면 열어 다가올 일정을 볼 수 있습니다.
userGuide-subcollections-title = 선택 사항: 수업 폴더
userGuide-subcollections-desc =
    수업마다 폴더 미러가 필요하신가요? 설정에서 수업 하위 컬렉션을 켜세요. 플러그인이 하위 폴더를 관리하기를 원하지 않으면 꺼 두세요.
userGuide-finish-title = 준비되었습니다
userGuide-finish-desc =
    도움말 → Zotero Syllabus 사용자 가이드 열기에서 언제든 이 투어를 다시 열 수 있습니다. 공부 잘 하세요!
userGuide-empty-title = 이 컬렉션을 수업별로 정리
userGuide-empty-desc =
    주 또는 회차마다 수업을 추가한 뒤 읽기 자료를 배정하세요. 짧은 안내 투어도 이용할 수 있습니다.
userGuide-empty-tour = 투어 시작

# Shared
app-name = Zotero Syllabus
this-collection = 이 컬렉션
untitled = 제목 없음
nav-back = 뒤로
nav-previous = 이전
nav-next = 다음

# View tabs / toolbar
view-tab-checklist = 체크리스트
view-tab-checklist-tooltip = 체크리스트로 보기
view-tab-syllabus = 강의계획서
view-tab-syllabus-tooltip = 강의계획서로 보기
view-tab-create-syllabus = 강의계획서로 전환
view-tab-create-syllabus-tooltip = 이 컬렉션을 강의계획서로 전환
view-tab-table = 표
view-tab-table-tooltip = 표로 보기
view-tab-gallery = 갤러리
view-tab-gallery-tooltip = 갤러리로 보기
view-tab-explorer = Home
view-tab-explorer-tooltip = View as Home
view-tab-reading-schedule = 읽기 일정
view-tab-my-annotations = My Annotations
toolbar-reading-schedule-review = 읽기 일정 검토
toolbar-reading-schedule-open = 읽기 일정 열기

# Context menus
menu-set-priority = 우선순위 설정
menu-none = (없음)
menu-assign-to-class = 수업에 배정
menu-no-collection = (선택한 컬렉션 없음)
menu-class-label = { $nomenclature } { $number }
menu-add-to-new-class = 새 { $nomenclature } { $number }에 추가
menu-set-reading-status = 읽기 상태 설정
status-done = 완료
status-not-done = 미완료

# Syllabus page
page-toc-title = 목차
placeholder-add-title = 제목 추가…
page-compact-enable = 컴팩트 모드 켜기
page-compact-disable = 컴팩트 모드 끄기
page-reader-enable = 리더 모드 켜기
page-reader-disable = 리더 모드 끄기
page-export = 강의계획서 파일 내보내기
page-import = 강의계획서 파일 가져오기
page-edit-settings = 강의계획서 설정 편집
page-lock = 강의계획서 잠그기
page-unlock = 강의계획서 잠금 해제
page-print = 강의계획서 보기의 목록을 PDF로 인쇄
placeholder-course-code = 교과목 코드
placeholder-institution = 기관
placeholder-add-description = 설명 추가…
page-add-class = { $nomenclature } { $number } 추가
page-add-to-class = { $nomenclature } { $number }에 추가
page-drop-create-class = 여기에 놓아 { $nomenclature } { $number } 만들기
page-drop-import-file = 파일을 놓아 이 컬렉션에 추가
further-reading-heading = 추가 읽기
sort-label = 정렬
further-reading-sort-aria = 추가 읽기 정렬
sort-by-title = 제목
sort-by-creator = 저자
sort-by-date = 날짜
further-reading-empty-desc = 이 섹션의 항목은 어떤 수업에도 배정되지 않았습니다.
toc-empty = 수업이 없습니다
placeholder-url = https://
links-delete = 링크 삭제
links-edit = 링크 편집
links-add = 링크 추가
bibliography-heading = 참고문헌

# Class groups / cards
mark-done = 완료로 표시
mark-not-done = 미완료로 표시
class-due-date-label = 마감일:
class-reset-sort = 정렬 순서 재설정
class-move-up = { $nomenclature } 위로 이동
class-move-down = { $nomenclature } 아래로 이동
class-delete = { $nomenclature } 삭제
class-insert-here = 여기에 { $nomenclature } 추가
class-dropzone-hint = 항목을 { $nomenclature } { $number }(으)로 드래그
due-date-clear = 마감일 지우기
due-date-add = 마감일 추가
placeholder-select-date = 날짜 선택
item-in-publication = in { $name }
attachment-url = URL
attachment-pdf = PDF
attachment-snapshot = 스냅샷
attachment-epub = EPUB
attachment-html = HTML
attachment-doc = DOC
attachment-txt = TXT
attachment-zip = ZIP
attachment-file = 파일
attachment-view = 보기
attachment-open = { $label } 열기
assignment-duplicate = 과제 복제 만들기
assignment-duplicate-label = 복제
assignment-unassign-class = 수업에서 제거
assignment-unassign-syllabus = 강의계획서에서 제거
assignment-unassign-label = 배정 해제
priority-set-to = 우선순위를 { $name }(으)로 설정
priority-clear = 우선순위 지우기
youtube-play = YouTube에서 { $title } 재생

# Item pane
item-pane-not-found = 항목을 찾을 수 없음
item-pane-none-selected = 선택한 항목 없음
item-pane-n-selected = { $count }개 항목 선택됨
item-pane-current-view = 현재 보기
item-pane-also-assigned = 다음에도 배정됨
item-pane-assignment-n = 과제 #{ $number }
item-pane-assignment-for = { $title }용
item-pane-due = 마감 { $date }
item-pane-reference-material = 참고 자료
item-pane-class-named = { $nomenclature } { $number }: { $title }
item-pane-mark-done = 완료로 표시
placeholder-class-number = 예: 1, 2, 3…
field-priority = 우선순위
field-instructions = 안내
placeholder-instructions = 이 과제에 대한 안내 추가…
assignment-delete = 과제 삭제
item-pane-select-collection = 컬렉션을 선택하여 강의계획서 과제 보기

# Settings
settings-title = 강의계획서 설정
settings-back = 강의계획서 보기로 돌아가기
settings-nomenclature = 명칭
settings-nomenclature-desc = 개별 회차를 가리키는 용어를 선택하세요(예: “주”, “수업”, “회차”, “섹션”).
settings-singular = 단수형
settings-nomenclature-placeholder = 예: 주, 수업, 회차, 섹션
settings-plural-label = 복수형:
settings-subcollections = 수업 하위 컬렉션
settings-subcollections-desc = 기본적으로 꺼져 있습니다. 켜면 과제가 있는 각 수업이 이 컬렉션 아래 폴더를 갖습니다. 과제가 없는 수업에는 폴더가 없으며 그런 폴더는 삭제됩니다. 폴더는 강의계획서에 맞게 만들고, 이름을 바꾸고, 삭제합니다. 기존 하위 컬렉션도 삭제될 수 있습니다. 끄면 폴더는 그대로 둡니다.
settings-subcollections-checkbox = 하위 컬렉션을 만들까요?
settings-bib-style = 참고문헌 스타일
settings-bib-style-desc = 서지 참조에 사용할 CSL(Citation Style Language) 스타일을 선택하세요. 설정하지 않으면 사용자 기본 스타일이 사용됩니다.
settings-citation-style = 인용 스타일
settings-user-default = 사용자 기본값
settings-user-default-named = 사용자 기본값: { $name }
settings-priorities = 우선순위
settings-priorities-desc = 우선순위 이름, 색, 정렬 순서를 사용자 지정합니다.
settings-add-priority = 새 우선순위 추가
settings-add-priority-button = 우선순위 추가
settings-new-priority-name = 새 우선순위
settings-priority-move-up = 위로
settings-priority-move-down = 아래로
settings-priority-color = 우선순위 색
settings-priority-name-placeholder = 우선순위 이름
settings-priority-delete = 우선순위 삭제
settings-priority-name-label = 이름
settings-priority-preview = 미리 보기:
priority-default-course-info = 강의 정보
priority-default-essential = 필수
priority-default-recommended = 권장
priority-default-optional = 선택

# Gallery
gallery-empty-filtered = 일치하는 항목이 없습니다.
gallery-empty = 이 컬렉션에 항목이 없습니다.
gallery-untagged = 태그 없음
gallery-untagged-desc = 이 섹션의 항목에는 태그가 없습니다.
gallery-uncredited = 창작자 없음
gallery-uncredited-desc = 이 섹션의 항목에는 창작자가 없습니다.
gallery-empty-subcollections = 이 컬렉션에 하위 컬렉션이나 항목이 없습니다.
gallery-unnumbered = 번호 없음
gallery-unnumbered-desc = 수업 번호 없이 배정됨.
gallery-sort-auto = 자동
gallery-sort-auto-title = 자동 순서(컬렉션 또는 강의계획서)
gallery-sort-az = A–Z
gallery-sort-az-title = A–Z 정렬
gallery-sort-date = 날짜
gallery-sort-date-title = 날짜순 정렬(최신 우선)
gallery-sort-date-added = 추가일
gallery-sort-date-added-title = 추가일순 정렬(최신 우선)
gallery-sort-last-read = Last Read
gallery-sort-last-read-title = Sort by last read (most recent first)
gallery-group-none = 없음
gallery-group-none-title = 그룹화 안 함
gallery-group-auto = 자동
gallery-group-auto-title = 자동 그룹화
gallery-group-type = 유형
gallery-group-type-title = 항목 유형별 그룹
gallery-group-creator = 창작자
gallery-group-creator-title = 창작자별 그룹
gallery-group-tags = 태그
gallery-group-tags-title = 태그별 그룹
gallery-group-subcollections = 하위 컬렉션
gallery-group-subcollections-title = 하위 컬렉션별 그룹
gallery-group-classes = 수업
gallery-group-classes-title = 수업별 그룹
gallery-layout-cover = 표지
gallery-layout-cover-title = 표지 이미지
gallery-layout-card = 카드
gallery-layout-card-title = 강의계획서 카드
gallery-layout-magazine = 매거진
gallery-layout-magazine-title = 다양한 크기의 매거진 레이아웃
magazine-shelf-watch = 보기
magazine-shelf-watch-title = 최근 추가된 동영상
magazine-shelf-listen = 듣기
magazine-shelf-listen-title = 최근 추가된 오디오
magazine-highlights = 형광 표시
gallery-options-aria = 갤러리 보기 옵션
gallery-options-title = 보기 옵션
gallery-menu-view = 보기
gallery-menu-sort = 정렬
gallery-menu-group = 그룹 기준
gallery-menu-type-size = 글자 크기
gallery-type-small = 작게
gallery-type-small-title = 매거진 글자를 작게
gallery-type-large = 크게
gallery-type-large-title = 매거진 글자를 크게
gallery-in-this-collection = 이 컬렉션에서
gallery-groups-nav-aria = 그룹
gallery-group-jump = { $name } 표시
gallery-prefs-summary = { $layout } / { $sort } / { $group }
gallery-page-of = { $page } / { $total }페이지
gallery-save-globally = 기본값으로 저장
gallery-save-globally-title = 이 옵션을 모든 컬렉션의 기본값으로 저장
gallery-save-globally-active-title = 이 컬렉션 설정이 기본값과 다릅니다. 클릭하면 기본값으로 저장합니다.
galleryTour-settings-title = 갤러리 옵션
galleryTour-settings-desc =
    모서리 메뉴에서 보기, 정렬, 그룹을 바꿉니다. 세 가지 레이아웃을 차례로 보여 드립니다.
galleryTour-cover-title = 표지 보기
galleryTour-cover-desc =
    표지는 각 항목을 커버 이미지로 보여 줍니다. 책, 논문, 웹 페이지를 한눈에 볼 수 있습니다.
galleryTour-magazine-title = 매거진 보기
galleryTour-magazine-desc =
    매거진은 큰 타일과 작은 타일을 섞어 목차처럼 보여 줍니다. 둘러보며 소개문을 읽기에 좋습니다.
galleryTour-card-title = 카드 보기
galleryTour-card-desc =
    카드는 강의계획과 같은 레이아웃이며, 항목 유형별로 묶어 비슷한 읽기 자료를 모읍니다.
galleryTour-choose-title = 기본값 선택
galleryTour-choose-desc =
    갤러리를 어떤 레이아웃으로 열까요? 나중에 Zotero Syllabus 환경설정이나 ‘기본값으로 저장’으로 바꿀 수 있습니다.
galleryTour-skip = 건너뛰기

# Reading schedule
schedule-edit-settings = 읽기 일정 설정 편집
schedule-empty-title = 예정된 읽기가 없습니다
schedule-empty-desc = 수업에 읽기 날짜를 추가하면 여기에 표시됩니다.
schedule-this-week = 이번 주
schedule-next-week = 다음 주
schedule-settings-title = 읽기 일정 설정
schedule-settings-back = 읽기 일정으로 돌아가기
schedule-settings-library = 라이브러리 컬렉션
schedule-settings-desc =
    기본적으로 꺼져 있습니다. 켜면 내 라이브러리에 최상위 “읽기 일정” 컬렉션이 유지되며, 최근 및 다가오는 각 읽기 날짜마다 폴더가 생깁니다. 폴더는 자동으로 만들고, 이름을 바꾸며, 채웁니다. 끄면 해당 컬렉션이 삭제됩니다. 강의계획서 항목은 그대로 남습니다.
schedule-settings-checkbox = “읽기 일정” 컬렉션을 생성할까요?
schedule-day-managed-banner = 강의계획서에서 자동 관리됩니다. 여기서의 편집은 덮어쓰입니다.
schedule-day-empty = 이 날에 예정된 읽기가 없습니다.
schedule-window-empty = 일정 구간에 아직 읽기가 없습니다. 수업에 읽기 날짜를 추가하면 여기에 표시됩니다.
schedule-no-dates = 날짜 없음
schedule-of-collection = { $name }의
schedule-of-collection-in-library = { $collection } ({ $library })의
schedule-open-syllabus = { $title } 강의계획서 열기
class-folder-managed-banner = 이 강의계획서에서 자동 관리됩니다. 이 폴더의 편집은 덮어쓰입니다.

# Columns
column-reading-instructions = 읽기 안내
column-status = 상태
column-reading-time = 읽기 시간
column-syllabus-info = 강의계획서 정보
column-class-hash = #{ $number }

# Progress / dialogs
dialog-save-export = 강의계획서 내보내기 저장
progress-import-success-title = 가져오기 성공
progress-import-success-text = 강의계획서 메타데이터를 가져와 병합했습니다
progress-import-error-title = 가져오기 오류
progress-import-bad-file = .syllabus 파일을 놓아 주세요
progress-print-preparing = 인쇄용 강의계획서를 준비하는 중…
progress-print-failed = 강의계획서 PDF를 저장할 수 없습니다
dialog-save-pdf = 강의계획서 PDF 저장
file-filter-pdf = PDF
progress-saving-pdf = PDF 저장 중…
dialog-save-file = 파일 저장
progress-translator-install-error = 읽기 목록 스크레이퍼 설치 오류
progress-migrate-start =
    { $count ->
        [one] 강의계획서 { $count }개를 컬렉션 노트로 이전하는 중…
       *[other] 강의계획서 { $count }개를 컬렉션 노트로 이전하는 중…
    }
progress-migrate-item = { $current } / { $total } 이전 중…
progress-migrate-done =
    { $count ->
        [one] 강의계획서 { $count }개 이전됨
       *[other] 강의계획서 { $count }개 이전됨
    }
progress-migrate-empty-cleared =
    { $count ->
        [one] 빈 설정 { $count }개 지움
       *[other] 빈 설정 { $count }개 지움
    }
progress-migrate-not-found =
    { $count ->
        [one] 컬렉션 { $count }개를 찾을 수 없음
       *[other] 컬렉션 { $count }개를 찾을 수 없음
    }
progress-migrate-failed = { $count }개 실패
progress-migrate-remaining = 환경설정에 { $count }개 남음
reading-time-minutes = { $minutes }분
reading-time-hours =
    { $hours ->
        [one] { $hours }시간
       *[other] { $hours }시간
    }
reading-time-hours-and-minutes =
    { $hours ->
        [one] { $hours }시간 { $minutes }분
       *[other] { $hours }시간 { $minutes }분
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
my-annotations-desc = Annotations from items you've been reading recently.
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
tree-tooltip-reading-schedule = 읽기 일정(자동 관리)
tree-tooltip-auto-managed = Zotero Syllabus가 자동 관리
tree-tooltip-syllabus = 강의계획서

# User guide sample items (created at tour time; not used as match keys)
tour-sample-reading-1 = 샘플 읽기: 강의 목록 시작하기
tour-sample-reading-2 = 샘플 읽기: 읽으면서 주석 달기
tour-sample-reading-3 = 샘플 읽기: 다음 주 계획하기

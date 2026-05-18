# Requirements Document

## Introduction

moyuNovel 是一个本地 TXT 小说阅读器，界面风格借鉴 OpenAI Codex IDE：左侧"会话"栏、顶部线程条、中部连续滚动正文、底部"输入框"。当前版本已经能完成阅读核心功能（TXT 导入、IndexedDB 持久化、章节识别、搜索、阅读偏好），但视觉与交互层仍有大量为了模仿 Codex 而保留的装饰性控件、行为缺陷以及一致性问题。

本规格描述一次**界面打磨（polish pass）**，不是重设计。目标是：

- 让每一个可见的交互元素要么真正可用，要么直接移除（不接受"假按钮"）。
- 修复用户在常规阅读流程中会立刻碰到的行为缺陷。
- 在保留 Codex 风格的前提下提升视觉层次和深色主题一致性。
- 桌面阅读流程是首要表面，移动端不能比当前更糟。

阅读核心（TXT 解析、章节识别、IndexedDB、搜索算法、偏好持久化）视为已经正确，本规格不再覆盖。性能与安全也不在范围内。

## Glossary

- **Reader**：整个 moyuNovel 阅读器应用。
- **Top_Bar**：阅读区顶部的横向标题条，当前包含书名、`•••` 按钮以及一组右侧操作按钮（运行、模型、终端、信息、面板）。
- **Sidebar**：左侧 376px 宽的侧边栏，包含主导航、项目分组、书架（"对话"列表）和设置入口。
- **Primary_Nav**：Sidebar 顶部的主导航按钮组（"新对话"、搜索、插件、自动化）。
- **Project_Groups**：Sidebar 中可由用户新建的项目分组及其会话行；当前在 TXT 阅读器中没有承载任何阅读语义。
- **Library**：用户已导入的 TXT 书籍集合，在 Sidebar 中以"对话"形式列出，每行展示书名与阅读进度。
- **Book**：单本 TXT 小说记录，包含正文、滚动位置、进度、最后阅读时间。
- **Reading_Toolbar**：阅读正文上方的工具条，当前含章节下拉与搜索框（CSS 类 `reader-command-bar`），默认 opacity 0.42。
- **Action_Bar**：阅读区底部的横条，当前以 Codex "composer" 形式呈现，混合了假的输入框/模型标签/发送按钮以及真实的字号调节、自动滚动、阅读偏好入口。
- **Reading_Controls**：阅读流程实际需要的控件集合：字号、自动滚动开关、阅读偏好入口（不含假 composer 元素）。
- **Preferences_Panel**：阅读偏好面板（字号、行高、宽度、字体、主题、自动滚动）。
- **Pager**：Action_Bar 下方的底部进度条与翻页按钮（顶部 / 继续）。
- **Progress_Indicator**：任何展示当前书阅读进度（百分比或"就绪"）的 UI 元素。
- **Theme**：界面主题，取值为 `light` 或 `dark`。
- **Visible_Control**：当前界面状态下用户肉眼可见且看上去可点击/可输入的元素（按钮、文本输入、下拉、滑块、单选）。
- **Dead_Control**：附着在 Visible_Control 上的、点击或交互后没有任何状态变化、没有反馈、也没有打开任何视图的控件。
- **Reader_Surface**：阅读正文所在的滚动容器（`[data-reader-scroll]`）。
- **Editable_Field**：任何可接收键盘文本输入的元素，包括 `<input>`、`<textarea>` 以及 `contenteditable="true"` 节点。
- **Demo_Book**：内置的演示书 `demo-codex-snow`，在数据库为空时由 Reader 自动写入。

## Requirements

### Requirement 1：移除装饰性死控件

**User Story:** 作为阅读者，我希望每一个我看得见的按钮都真的能做事，这样我不会因为去点一个假按钮而怀疑应用是不是坏了。

#### Acceptance Criteria

1. THE Reader SHALL ensure that every Visible_Control either performs a defined action when activated or is removed from the DOM.
2. THE Top_Bar SHALL NOT render the "运行"、"模型"、"终端"、"信息"、"面板" buttons unless each of those buttons is wired to a defined action documented in this spec.
3. THE Primary_Nav SHALL NOT render the "插件" and "自动化" entries unless each is wired to a defined action documented in this spec.
4. THE Action_Bar SHALL NOT render a fake textarea, a fake model label (例如 "5.5 中"), or a fake send button.
5. WHEN the user activates the Sidebar entry currently labelled "新对话", THE Reader SHALL either change the label to accurately describe its action (导入 TXT) or replace the entry with a control whose label matches its behaviour.
6. THE Reader SHALL NOT display the status line "已处理 1s" or any other Codex-style log line that does not reflect a real Reader event.
7. **(Correctness property)** FOR EVERY Visible_Control rendered by the Reader, activating that control SHALL produce at least one of: a state change in `state`, navigation, focus change, or a visible UI response within 200ms; otherwise the control SHALL be removed.

### Requirement 2：去掉与阅读无关的 Sidebar 项目层级

**User Story:** 作为阅读者，我希望 Sidebar 只承载我真正会用的东西（书架、搜索、设置），这样我不必在装饰性的"项目/会话"分组里寻找我刚导入的小说。

#### Acceptance Criteria

1. THE Sidebar SHALL NOT render a Project_Groups section, "新建项目" 行, or any project/session inline-edit affordances unless those entries drive a defined Reader feature; if a future Reader feature requires them, the Sidebar MAY render them at that time.
2. WHEN Project_Groups are removed from the UI, THE Reader SHALL NOT block startup if previously persisted project data exists in `localStorage`.
3. THE Sidebar SHALL render the Library as the primary list of items below Primary_Nav, using a single section header.
4. WHERE the Library is empty, THE Sidebar SHALL show an explicit empty state with a clear call-to-action to import TXT, instead of an inline editable Demo_Book row that looks like a real book.

### Requirement 3：把阅读控件从假 composer 中分离出来

**User Story:** 作为阅读者，我希望字号调节、自动滚动开关、阅读偏好入口位于一个明确属于阅读功能的工具条上，不要和"输入框/发送按钮"混在一起。

#### Acceptance Criteria

1. THE Reader SHALL render Reading_Controls (字号增减、自动滚动开关、阅读偏好入口、TXT 导入入口) in a dedicated container that is visually separable from any chat-style composer surface.
2. THE Reader SHALL provide exactly one font-size control surface; both the previous A- / A+ buttons and the Preferences_Panel font-size slider SHALL NOT remain as duplicate adjacent controls.
3. THE Reader SHALL provide exactly one entry point to open the Preferences_Panel from the main reading view.
4. WHEN the user opens the Preferences_Panel from any entry point, THE Reader SHALL display the same Preferences_Panel instance (same controls, same current values).
5. **(Correctness property — idempotence)** WHEN the user toggles the Preferences_Panel open and then closed via the same entry point, THE Reader SHALL leave `state.prefsOpen` equal to its value before the toggle pair.

### Requirement 4：进度展示来源唯一

**User Story:** 作为阅读者，我希望同一时刻只在一个明显的位置看到当前书的阅读进度，避免三处数字格式不一致让我怀疑哪个才是真的。

#### Acceptance Criteria

1. THE Reader SHALL render the Progress_Indicator for the active Book in exactly one canonical location within the reading view.
2. THE Sidebar Library row for each Book SHALL display the per-book progress in a single consistent format reused across the entire UI.
3. WHEN the Reader_Surface scrolls, THE Reader SHALL update every visible Progress_Indicator referencing the active Book using the same numeric value derived from `calculateProgress`.
4. **(Correctness property — invariant)** FOR ALL render passes, every Progress_Indicator that references the active Book SHALL display a value derived from the same `progress` field on the Book record at that render pass.

### Requirement 5：Reading_Toolbar 默认可见且符合主题

**User Story:** 作为新用户，我希望章节跳转和搜索框第一眼就能看见，并且在深色主题下不会出现刺眼的浅色背景。

#### Acceptance Criteria

1. THE Reading_Toolbar SHALL be rendered with full opacity by default (no `opacity: 0.42` hover-to-reveal pattern).
2. THE Reading_Toolbar SHALL use background, border, and text colors derived from the theme tokens (`--sidebar`, `--soft`, `--line`, `--text`, `--muted`) rather than hardcoded near-white values.
3. WHEN the active Theme is `dark`, THE Reading_Toolbar inputs (章节下拉、搜索 `<input>`) SHALL render with a background that is darker than the surrounding `.thread-body` background, not lighter.
4. WHILE the active Book has zero detected chapters, THE Reading_Toolbar SHALL hide the chapter dropdown rather than render an empty disabled control.

### Requirement 6：键盘快捷键不应抢走输入焦点

**User Story:** 作为阅读者，我在搜索框里输入空格或方向键时，希望它们落在输入框里，而不是触发正文翻页或快进搜索框光标。

#### Acceptance Criteria

1. WHEN an Editable_Field has keyboard focus, THE Reader SHALL NOT consume `Space`, `ArrowLeft`, `ArrowRight`, `PageUp`, or `PageDown` for Reader_Surface scrolling.
2. WHILE no Editable_Field has focus, THE Reader SHALL continue to map `Space` / `ArrowRight` / `PageDown` to scroll-down and `ArrowLeft` / `PageUp` to scroll-up on the Reader_Surface.
3. IF the keydown target is inside an element with `contenteditable="true"`, THEN THE Reader SHALL treat the event the same as if it were inside an `<input>` for the purposes of criterion 1.
4. **(Correctness property)** FOR ALL keydown events whose target is an Editable_Field, the default text-input behaviour of the field SHALL remain observable (typed character or caret move).

### Requirement 7：章节跳转可重复使用

**User Story:** 作为阅读者，我跳到第 3 章读完后想再次跳回第 3 章顶部，希望能直接再选一次第 3 章，而不是先选别的章节再选回来。

#### Acceptance Criteria

1. WHEN the user selects a chapter from the chapter dropdown, THE Reader SHALL scroll the Reader_Surface to that chapter heading.
2. AFTER the Reader has scrolled to the selected chapter, THE Reader SHALL reset the chapter dropdown's value to its placeholder ("跳转到...") so the same chapter is selectable again.
3. **(Correctness property — idempotence)** WHEN the user selects the same chapter twice in succession, THE Reader SHALL scroll to that chapter heading on each selection.

### Requirement 8：Sidebar 提供书籍重命名 / 删除入口（或移除孤立动作）

**User Story:** 作为阅读者，我想能从 Sidebar 上的书架行直接重命名或删除一本书，而不是只能通过隐藏的代码路径。

#### Acceptance Criteria

1. THE Library row for each Book SHALL expose a user-discoverable way to rename the Book within the Sidebar.
2. THE Library row for each Book SHALL expose a user-discoverable way to delete the Book.
3. WHEN the user renames a Book inline, THE Reader SHALL persist the new title and update only the affected DOM nodes (Sidebar row label and Top_Bar `<h1>`) without re-rendering the entire reading view.
4. AFTER an inline rename completes, THE Reader_Surface scroll position and any active Editable_Field selection SHALL be preserved.
5. IF the `handleAction` dispatcher contains a `rename-book` branch, THEN THE Reader SHALL either expose a UI entry point for it or remove the unreachable branch.

### Requirement 9：清空书架行为可预测

**User Story:** 作为阅读者，当我点"清空"并确认后，希望应用的反馈与实际状态一致，不要"清空了但又静默地长出一本演示书"让我以为没生效。

#### Acceptance Criteria

1. WHEN the user confirms the clear-library action, THE Reader SHALL remove all imported Books from IndexedDB.
2. AFTER clearing, THE Reader SHALL show a Library state that visibly distinguishes "你刚清空了书架" from "这是导入第一本书前的初始状态"; reseeding the Demo_Book silently SHALL NOT be the only feedback.
3. WHERE the Reader chooses to reseed the Demo_Book after clearing, THE Reader SHALL surface that fact in the status / empty-state copy so the user knows the visible book is the demo, not a leftover import.

### Requirement 10：字体选择反映实际渲染差异

**User Story:** 作为 Windows 上的用户，我选"宋体"和选"衬线"时，希望正文看起来真的不一样，否则这个选项没意义。

#### Acceptance Criteria

1. WHERE the user selects `fontFamily = songti`, THE Reader SHALL apply a font stack that prefers a Chinese serif face (e.g. `Songti SC`, `STSong`, `SimSun`, `Noto Serif CJK SC`) before falling back to a generic `serif`.
2. WHERE the user selects `fontFamily = serif`, THE Reader SHALL apply a font stack whose first preferred face is a Latin serif (e.g. `Georgia`, `Times New Roman`) so that side-by-side comparison with `songti` is visually distinguishable on Windows defaults.
3. IF neither preferred face is available on the OS, THEN THE Reader SHALL still render legible text via the generic fallback, and the segmented control SHALL remain interactive.

### Requirement 11：视觉层次与正文打磨

**User Story:** 作为阅读者，我希望 Sidebar、阅读区、Action_Bar 三块区域的视觉重量有清晰区别，章节标题在长文本里能一眼扫到，搜索高亮不要重复叠色。

#### Acceptance Criteria

1. THE Sidebar, Reader_Surface, and Action_Bar SHALL be rendered with at least one differentiating visual treatment between any two adjacent surfaces (background color, border, shadow, or divider) such that surface boundaries are perceivable in both Themes.
2. THE chapter heading lines (`.chapter-line`) SHALL be visually distinct from body paragraphs through at least two of: weight, size, color, spacing.
3. WHEN search is active and a line contains a match, THE Reader SHALL apply a single highlight treatment per match rather than stacking a per-line tinted background underneath per-match `<mark>` elements.
4. THE Reader_Surface custom scrollbar SHALL NOT visually compete with the body prose during long reading sessions (i.e. the scrollbar SHALL be tuned to feel secondary to the text rather than equally weighted).

### Requirement 12：移动端 (≤620px) 不退化

**User Story:** 作为偶尔在窄窗口或手机上读小说的人，我希望底部控件不会折行成奇怪的样子，并且手机上不再出现假 composer 残留物。

#### Acceptance Criteria

1. WHILE the viewport width is at or below 620px, THE Action_Bar SHALL render Reading_Controls in a layout that wraps cleanly without orphan elements (no fragment like "5.5 中" floating alone).
2. WHILE the viewport width is at or below 620px, THE Reading_Toolbar SHALL remain visible at full opacity (no hover-to-reveal behavior, since hover is unreliable on touch).
3. WHEN any Visible_Control is removed under Requirement 1 or Requirement 3, THE corresponding mobile breakpoint rules in `style.css` referring to those controls SHALL be removed or updated so no dangling selector remains.
4. WHILE the viewport width is at or below 620px, THE Reader_Surface SHALL remain scrollable to the end of the active Book without the fixed Action_Bar permanently covering the last paragraph.

### Requirement 13：Skip-to-implementation 兜底

**User Story:** 作为这次打磨工作的执行者，我希望需求里明确指出：这次打磨不引入新的阅读功能、不更换持久化层、不改变 TXT 解析或章节识别算法。

#### Acceptance Criteria

1. THE Reader SHALL retain its current TXT 导入流程、章节识别 (`isChapterTitle`)、搜索算法 (`findMatches` / `highlightSearchMatches`) 和 IndexedDB schema (`DB_NAME`, `BOOK_STORE`).
2. THE Reader SHALL retain the existing keyboard reading shortcuts (Space / Arrow / PageDown / PageUp 滚动) for the case where no Editable_Field has focus.
3. THE Reader SHALL retain the existing Preferences_Panel options (字号、行高、宽度、字体、主题、自动滚动开关与速度).
4. IF a polish change in this spec would require migrating persisted data in `localStorage` (`UI_KEY`, `PROJECTS_KEY`, `COMPOSER_KEY`), THEN THE Reader SHALL handle the absence of the legacy keys gracefully and SHALL NOT throw on first load after upgrade.

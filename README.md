# Zotero Syllabus

[![zotero target version](https://img.shields.io/badge/Zotero-7-green?style=flat-square&logo=zotero&logoColor=CC2936)](https://www.zotero.org)

A Zotero plugin that turns your collections into syllabi and course reading lists. Order your items by class, tag things as required / optional reading and pin course information.

## Installation

1. Download the latest release from the [Releases](https://github.com/janbaykara/zotero-syllabus/releases) page.
2. In Zotero, go to `Tools` → `Add-ons`
3. Click the gear icon and select `Install Add-on From File...`
4. Select the downloaded `.xpi` file

## Screenshots

### Class Management

![Drag and drop functionality demonstration](doc/images/drag-drop.gif)
_Classes grouped by course number with visual priority indicators and custom descriptions. Use drag and drop to move items between classes._

#### Standard List View

![Standard Zotero list view](doc/images/list.png)
_The standard Zotero item list view has added columns for class numbers, instructions, and reading priority levels._

#### Syllabus Metadata

![Syllabus module interface showing class organization](doc/images/module.png)
_Pin important course information to the top of the syllabus._

## Features

- **Syllabus View**: Enhanced item view with syllabus-specific columns and organization
- **Class Management**: Group items by course/class with custom titles and descriptions
- **Priority System**: Assign priorities to syllabus items with color-coded visual indicators
- **Custom Columns**: Dedicated columns for class numbers, instructions, and priority levels
- **Collection Descriptions**: Add detailed descriptions to syllabus collections
- **Context Menus**: Right-click menus for quick syllabus operations
- **Item Pane Integration**: Syllabus information displayed directly in the item pane
- **Drag & Drop Support**: Intuitive organization of course materials
- **Localization**: Multi-language support (English, French, Chinese)

## Development

This plugin is built using the [Zotero Plugin Template](https://github.com/windingwind/zotero-plugin-template).

### Requirements

- Zotero 7 beta or later
- Node.js (LTS version)
- Git
- pnpm

### Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/janbaykara/zotero-syllabus.git
   cd zotero-syllabus
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Configure environment:

   ```bash
   cp .env.example .env
   # Edit .env with your Zotero installation path
   ```

4. Start development:
   ```bash
   pnpm start
   ```

### Build

Build the plugin for production:

```bash
pnpm run build
```

### Release

Create a new release:

```bash
pnpm run release
```

This will build the plugin, create the .xpi file, and prepare it for distribution.

### Testing

Run the test suite:

```bash
pnpm test
```

### Code Quality

Check code quality:

```bash
pnpm run lint:check
```

Fix code quality issues:

```bash
pnpm run lint:fix
```

### Project Structure

```
src/
├── addon.ts              # Main addon class
├── hooks.ts              # Lifecycle hooks
├── index.ts              # Entry point
├── modules/
│   ├── syllabus.ts       # Core syllabus functionality
│   └── preferenceScript.ts # Preferences handling
└── utils/
    ├── locale.ts         # Localization utilities
    ├── prefs.ts          # Preferences management
    ├── syllabus.ts       # Syllabus data utilities
    ├── window.ts         # Window management
    └── ztoolkit.ts       # Zotero toolkit setup

addon/
├── manifest.json         # Plugin manifest
├── bootstrap.js          # Bootstrap script
├── prefs.js              # Preferences defaults
├── content/              # UI content
└── locale/               # Localization files
```

## License

AGPL-3.0-or-later

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues and feature requests, please use the [GitHub Issues](https://github.com/janbaykara/zotero-syllabus/issues) page.

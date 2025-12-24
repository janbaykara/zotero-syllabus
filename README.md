# Zotero Syllabus

[![zotero target version](https://img.shields.io/badge/Zotero-7-green?style=flat-square&logo=zotero&logoColor=CC2936)](https://www.zotero.org)

A Zotero plugin for managing syllabi and course materials.

## Author

**Jan Baykara** <janbaykara@pm.me>

## Installation

1. Download the latest release from the [Releases](https://github.com/janbaykara/zotero-syllabus/releases) page
2. In Zotero, go to `Tools` → `Add-ons`
3. Click the gear icon and select `Install Add-on From File...`
4. Select the downloaded `.xpi` file

## Development

This plugin is built using the [Zotero Plugin Template](https://github.com/windingwind/zotero-plugin-template).

### Requirements

- Zotero 7 beta or later
- Node.js (LTS version)
- Git

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

## License

AGPL-3.0-or-later

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues and feature requests, please use the [GitHub Issues](https://github.com/janbaykara/zotero-syllabus/issues) page.

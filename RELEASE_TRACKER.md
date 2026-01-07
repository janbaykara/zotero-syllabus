# Release Statistics

This repository includes a GitHub Actions workflow that automatically tracks release download statistics. The workflow runs daily and updates a CSV file (`releases.csv`) with download counts for XPI files.

#### How it works

- **Automatic execution**: Runs daily at midnight UTC via scheduled workflow
- **Manual trigger**: Can be triggered manually from the Actions tab with custom parameters
- **Self-contained**: Uses only Node.js built-in modules (no external dependencies)
- **Data preservation**: Preserves historical data even if releases are removed from GitHub

#### Configuration

The workflow accepts the following inputs (with defaults):

- `repository`: Repository in format `owner/repo` (default: `janbaykara/zotero-syllabus`)
- `csv_path`: Path to CSV file (default: `releases.csv`)
- `asset_extension`: Asset file extension to filter (default: `.xpi`)

#### CSV Format

The generated CSV file contains the following columns:

- `date`: Release published date (ISO 8601 format)
- `tag`: Release tag name
- `release name`: Release name
- `asset name`: Asset file name
- `downloads`: Download count (numeric)

#### Publishing as a Reusable Action

The workflow is designed to be easily extractable and publishable as a separate GitHub Action:

1. The script (`scripts/update-release-stats.js`) is self-contained with no external dependencies
2. Configuration is handled via workflow inputs
3. The workflow can be converted to a composite action or reusable workflow

To use in another repository, copy:

- `.github/workflows/release-stats.yml`
- `scripts/update-release-stats.js`

Then configure the inputs as needed.

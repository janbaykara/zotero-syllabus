#!/usr/bin/env node

/**
 * Update Release Stats Script
 *
 * Fetches release data from GitHub API and updates a CSV file with download counts.
 * Preserves existing rows even if releases are no longer present in the API.
 *
 * Usage:
 *   node update-release-stats.js <repository> <csv_path> <asset_extension>
 *
 * Example:
 *   node update-release-stats.js janbaykara/zotero-syllabus releases.csv .xpi
 */

import fs from 'fs';
import https from 'https';
import { URL } from 'url';

// Get command-line arguments
const repository = process.argv[2] || 'janbaykara/zotero-syllabus';
const csvPath = process.argv[3] || 'releases.csv';
const assetExtension = process.argv[4] || '.xpi';
const githubToken = process.env.GitHub_TOKEN;

if (!githubToken) {
  console.error('Error: GitHub_TOKEN environment variable is required');
  process.exit(1);
}

/**
 * Escape CSV field value
 */
function escapeCsvField(value) {
  if (value === null || value === undefined) {
    return '';
  }
  const str = String(value);
  // If field contains comma, quote, or newline, wrap in quotes and escape quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Parse CSV file and return array of row objects
 */
function parseCsv(filePath) {
  if (!fs.existsSync(filePath)) {
    return [];
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n');
  if (lines.length === 0) {
    return [];
  }

  // Parse header
  const headers = lines[0].split(',').map((h) => h.trim());
  const rows = [];

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        if (inQuotes && line[j + 1] === '"') {
          // Escaped quote
          current += '"';
          j++;
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        values.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current); // Add last value

    if (values.length === headers.length) {
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index].trim();
      });
      rows.push(row);
    }
  }

  return rows;
}

/**
 * Write CSV file from array of row objects
 */
function writeCsv(filePath, rows) {
  if (rows.length === 0) {
    return;
  }

  // Get headers from first row
  const headers = Object.keys(rows[0]);
  const lines = [headers.map(escapeCsvField).join(',')];

  // Write data rows
  for (const row of rows) {
    const values = headers.map((header) => escapeCsvField(row[header]));
    lines.push(values.join(','));
  }

  fs.writeFileSync(filePath, lines.join('\n') + '\n', 'utf-8');
}

/**
 * Fetch releases from GitHub API
 */
function fetchReleases(owner, repo, token) {
  return new Promise((resolve, reject) => {
    const url = `https://api.github.com/repos/${owner}/${repo}/releases`;
    const parsedUrl = new URL(url);

    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'release-stats-updater',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const releases = JSON.parse(data);
            resolve(releases);
          } catch (error) {
            reject(new Error(`Failed to parse JSON: ${error.message}`));
          }
        } else {
          reject(
            new Error(
              `GitHub API error: ${res.statusCode} ${res.statusMessage}\n${data}`
            )
          );
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Request failed: ${error.message}`));
    });

    req.end();
  });
}

/**
 * Main function
 */
async function main() {
  try {
    console.log(`Fetching releases for ${repository}...`);
    const [owner, repo] = repository.split('/');
    if (!owner || !repo) {
      throw new Error(`Invalid repository format: ${repository}`);
    }

    // Fetch releases from GitHub API
    const releases = await fetchReleases(owner, repo, githubToken);
    console.log(`Found ${releases.length} releases`);

    // Load existing CSV
    const existingRows = parseCsv(csvPath);
    console.log(`Loaded ${existingRows.length} existing rows from ${csvPath}`);

    // Create a map of existing rows by tag + asset name
    const existingMap = new Map();
    for (const row of existingRows) {
      const key = `${row.tag || ''}|${row['asset name'] || ''}`;
      existingMap.set(key, row);
    }

    // Process releases and update/create rows
    const updatedRows = new Map();
    let newRowsCount = 0;
    let updatedRowsCount = 0;

    for (const release of releases) {
      // Find assets matching the extension
      const matchingAssets = release.assets.filter((asset) =>
        asset.name.endsWith(assetExtension)
      );

      if (matchingAssets.length === 0) {
        console.log(
          `Skipping release ${release.tag_name} (no ${assetExtension} assets)`
        );
        continue;
      }

      // Process each matching asset
      for (const asset of matchingAssets) {
        const key = `${release.tag_name}|${asset.name}`;
        const existingRow = existingMap.get(key);

        if (existingRow) {
          // Update existing row
          existingRow.date = release.published_at || release.created_at || '';
          existingRow.tag = release.tag_name || '';
          existingRow['release name'] = release.name || release.tag_name || '';
          existingRow['asset name'] = asset.name || '';
          existingRow.downloads = String(asset.download_count || 0);
          updatedRows.set(key, existingRow);
          updatedRowsCount++;
        } else {
          // Create new row
          const newRow = {
            date: release.published_at || release.created_at || '',
            tag: release.tag_name || '',
            'release name': release.name || release.tag_name || '',
            'asset name': asset.name || '',
            downloads: String(asset.download_count || 0),
          };
          updatedRows.set(key, newRow);
          newRowsCount++;
        }
      }
    }

    // Add preserved rows (releases that are no longer in API but exist in CSV)
    for (const [key, row] of existingMap) {
      if (!updatedRows.has(key)) {
        updatedRows.set(key, row);
      }
    }

    // Convert map to array and sort by date (newest first)
    const allRows = Array.from(updatedRows.values());
    allRows.sort((a, b) => {
      const dateA = new Date(a.date || 0);
      const dateB = new Date(b.date || 0);
      return dateB - dateA;
    });

    // Write updated CSV
    writeCsv(csvPath, allRows);
    console.log(
      `Updated ${csvPath}: ${newRowsCount} new rows, ${updatedRowsCount} updated rows, ${allRows.length} total rows`
    );
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();


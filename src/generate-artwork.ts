#!/usr/bin/env bun

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

interface CliArgs {
  number?: string;
  product?: string;
  theme?: string;
  all?: boolean;
  allThemes?: boolean;
}

function parseArgs(): CliArgs {
  const args: CliArgs = {};
  const argv = process.argv.slice(2);

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg?.startsWith('--')) continue;

    const key = arg.replace(/^--/, '');
    const value = argv[i + 1];

    if (key === 'number' && value) args.number = value;
    else if (key === 'product' && value) args.product = value;
    else if (key === 'theme' && value) args.theme = value;
    else if (key === 'all') args.all = true;
    else if (key === 'all-themes') args.allThemes = true;
  }

  return args;
}

function findConfigDir(number: string, theme?: string): { dir: string; theme: string } | null {
  const baseArtDir = path.join(__dirname, '..', 'art');
  
  // First check if number folder exists directly (like art/001)
  const directConfigPath = path.join(baseArtDir, number, 'config.json');
  if (fs.existsSync(directConfigPath)) {
    // Return directory - theme will be determined when generating
    return { dir: path.dirname(directConfigPath), theme: theme || 'dark-rainbow-purple' };
  }
  
  if (theme) {
    const configPath = path.join(baseArtDir, theme, number, 'config.json');
    if (fs.existsSync(configPath)) {
      return { dir: path.dirname(configPath), theme };
    }
  } else {
    // Search through all themes
    if (fs.existsSync(baseArtDir)) {
      const themes = fs.readdirSync(baseArtDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

      for (const themeName of themes) {
        const configPath = path.join(baseArtDir, themeName, number, 'config.json');
        if (fs.existsSync(configPath)) {
          return { dir: path.dirname(configPath), theme: themeName };
        }
      }
    }
  }

  return null;
}

async function main() {
  const args = parseArgs();

  if (!args.number) {
    console.error('Error: --number is required (e.g., --number 001)');
    process.exit(1);
  }

  const configResult = findConfigDir(args.number, args.theme);
  if (!configResult) {
    console.error(`Error: Could not find config.json for number ${args.number}${args.theme ? ` in theme ${args.theme}` : ''}`);
    process.exit(1);
  }

  const { dir: configDir, theme: detectedTheme } = configResult;
  const configPath = path.join(configDir, 'config.json');
  const products = ['nft', 'cup', 'mousepad', 'socks', 'tshirt'];

  // Load base config to reuse for all themes
  const baseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

  if (args.allThemes) {
    // Generate all theme variations
    const backgrounds = ['dark', 'white'];
    const colorSchemes = ['common', 'green', 'rainbow-green', 'rainbow-yellow', 'rainbow-purple'];
    const themesToGenerate: string[] = [];
    
    for (const bg of backgrounds) {
      for (const color of colorSchemes) {
        themesToGenerate.push(`${bg}-${color}`);
      }
    }

    console.log(`Generating all ${themesToGenerate.length} theme variations for ${args.number}...\n`);

    const tempConfigPath = path.join(configDir, 'temp-config.json');

    try {
      for (const theme of themesToGenerate) {
        console.log(`\n━━━ Theme: ${theme} ━━━`);
        
        // Update config with current theme
        const tempConfig = { ...baseConfig, theme };
        fs.writeFileSync(tempConfigPath, JSON.stringify(tempConfig, null, 2));

        const productsToGenerate = args.product ? [args.product] : products;

        for (const product of productsToGenerate) {
          console.log(`  → Generating ${product}...`);
          // Create product subfolder
          const productDir = path.join(configDir, product);
          if (!fs.existsSync(productDir)) {
            fs.mkdirSync(productDir, { recursive: true });
          }
          const outputPath = path.join(productDir, `${theme}-${product}.png`);
          try {
            execSync(
              `bun src/generate-shop.ts --product ${product} --config "${tempConfigPath}" --output "${outputPath}"`,
              { stdio: 'pipe', cwd: path.join(__dirname, '..') }
            );
            process.stdout.write(`  ✓ ${product}\n`);
          } catch (error) {
            console.error(`  ✗ Failed: ${product}`);
          }
        }
      }
    } finally {
      // Clean up temp config
      if (fs.existsSync(tempConfigPath)) {
        fs.unlinkSync(tempConfigPath);
      }
    }

    console.log(`\n✓ All theme variations generated for ${args.number}`);
  } else if (args.all) {
    // Generate all products
    console.log(`Generating all products for ${args.number}...`);
    for (const product of products) {
      console.log(`\n→ Generating ${product}...`);
      // Create product subfolder
      const productDir = path.join(configDir, product);
      if (!fs.existsSync(productDir)) {
        fs.mkdirSync(productDir, { recursive: true });
      }
      const outputPath = path.join(productDir, `${detectedTheme}-${product}.png`);
      try {
        execSync(
          `bun src/generate-shop.ts --product ${product} --config "${configPath}" --output "${outputPath}"`,
          { stdio: 'inherit', cwd: path.join(__dirname, '..') }
        );
      } catch (error) {
        console.error(`Failed to generate ${product}:`, error);
      }
    }
    console.log(`\n✓ All products generated for ${args.number}`);
  } else if (args.product) {
    // Generate specific product
    if (!products.includes(args.product)) {
      console.error(`Error: Invalid product. Must be one of: ${products.join(', ')}`);
      process.exit(1);
    }
    console.log(`Generating ${args.product} for ${args.number}...`);
    // Create product subfolder
    const productDir = path.join(configDir, args.product);
    if (!fs.existsSync(productDir)) {
      fs.mkdirSync(productDir, { recursive: true });
    }
    const outputPath = path.join(productDir, `${detectedTheme}-${args.product}.png`);
    try {
      execSync(
        `bun src/generate-shop.ts --product ${args.product} --config "${configPath}" --output "${outputPath}"`,
        { stdio: 'inherit', cwd: path.join(__dirname, '..') }
      );
      console.log(`\n✓ ${args.product} generated for ${args.number}`);
    } catch (error) {
      console.error(`Failed to generate ${args.product}:`, error);
      process.exit(1);
    }
  } else {
    console.error('Error: Either --product <product>, --all, or --all-themes is required');
    console.log('\nUsage:');
    console.log('  bun run generate-artwork --number 001 --product cup');
    console.log('  bun run generate-artwork --number 002 --all');
    console.log('  bun run generate-artwork --number 001 --all-themes');
    console.log('  bun run generate-artwork --number 001 --product cup --all-themes');
    console.log('  bun run generate-artwork --number 001 --product nft --theme rainbow-purple');
    process.exit(1);
  }
}

main().catch(console.error);

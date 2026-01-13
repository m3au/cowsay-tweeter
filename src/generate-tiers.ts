import * as cowsay from 'cowsay';
import * as fs from 'fs';
import * as path from 'path';

import Convert from 'ansi-to-html';
import nodeHtmlToImage from 'node-html-to-image';
import wrap from 'word-wrap';

// Color schemes for different tiers
function seededRandom(seed: number) {
  return function () {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

function rainbowText(
  text: string,
  seed: number,
  colorScheme: 'default' | 'green' | 'yellow' | 'purple',
  freq: number = 0.1,
  spread: number = 3.0,
): string {
  let result = '';
  let charIndex = 0;
  let lineNumber = 0;
  let charInLine = 0;
  const random = seededRandom(seed);

  // Lock starting hue for each color scheme (in degrees)
  const startHue = {
    default: random() * 360, // Random start for full rainbow
    green: 120, // Start at green
    yellow: 60, // Start at yellow
    purple: 270, // Start at purple/magenta
  }[colorScheme];

  for (const char of text) {
    if (char === '\n') {
      result += char;
      lineNumber++;
      charInLine = 0;
      continue;
    }

    // Calculate diagonal position: combine horizontal and vertical
    // This creates a diagonal rainbow effect instead of horizontal stripes
    const diagonalPos = charInLine + lineNumber * 1.5; // Adjust multiplier for diagonal angle
    const hue = (startHue + diagonalPos * freq * 8) % 360;

    // Convert hue to RGB using HSL to RGB conversion
    const h = hue / 60;
    const c = 1.0; // Full saturation
    const x = c * (1 - Math.abs((h % 2) - 1));
    let r, g, b;

    if (h < 1) {
      r = c;
      g = x;
      b = 0;
    } else if (h < 2) {
      r = x;
      g = c;
      b = 0;
    } else if (h < 3) {
      r = 0;
      g = c;
      b = x;
    } else if (h < 4) {
      r = 0;
      g = x;
      b = c;
    } else if (h < 5) {
      r = x;
      g = 0;
      b = c;
    } else {
      r = c;
      g = 0;
      b = x;
    }

    // Convert to 0-255 range with full brightness
    r = Math.round(r * 255);
    g = Math.round(g * 255);
    b = Math.round(b * 255);

    result += `\x1b[38;2;${r};${g};${b}m${char}`;
    charInLine++;
    charIndex++;
  }

  return result + '\x1b[0m';
}

function plainText(text: string): string {
  return text;
}

function greenTerminalText(text: string): string {
  return `\x1b[38;2;0;255;0m${text}\x1b[0m`;
}

interface TierConfig {
  name: string;
  bgColor: string;
  textColor: string;
  applyColors: (text: string, seed: number) => string;
  css: string;
}

function getTierConfigs(): Record<string, TierConfig> {
  // Resolve font path - when compiled, __dirname is dist/, so go up one level to src/
  const srcDir = path.resolve(__dirname, '..', 'src');
  const fontPath = path.join(srcDir, 'MesloLGSDZ-Regular.ttf');
  const fontUrl = `file://${fontPath}`;

  return {
    common: {
      name: 'common',
      bgColor: '#000000',
      textColor: '#C0C0C0',
      applyColors: plainText,
      css: `
        @font-face {
          font-family: 'MesloLGS';
          src: url('${fontUrl}') format('truetype');
          font-weight: 200 900;
          font-display: swap;
        }
        body {
          background-color: #000000;
          padding: 0;
          font-size: 16px;
          height: 100%;
          margin: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }
        body::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: repeating-linear-gradient(
            0deg,
            rgba(255, 255, 255, 0.05) 0px,
            rgba(255, 255, 255, 0.05) 1px,
            transparent 1px,
            transparent 2px
          );
          pointer-events: none;
          z-index: 1;
        }
        .container {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          width: 100vw;
          position: relative;
          margin: 0;
          padding: 0;
          z-index: 2;
        }
        pre {
          margin: 0;
          font-family: 'MesloLGS', monospace;
          font-size: 6rem;
          line-height: 1.05;
          text-rendering: optimizeLegibility;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          color: #C0C0C0;
          letter-spacing: 0;
          white-space: pre;
          text-align: left;
          display: inline-block;
          text-shadow: 0 0 6px rgba(192, 192, 192, 0.5), 0 0 12px rgba(192, 192, 192, 0.3);
        }
        .watermark {
          position: absolute;
          bottom: 20px;
          right: 20px;
          font-family: 'MesloLGS', monospace;
          font-size: 1.2rem;
          color: rgba(255, 255, 255, 0.3);
        }
      `,
    },
    green: {
      name: 'green',
      bgColor: '#000000',
      textColor: '#00FF00',
      applyColors: greenTerminalText,
      css: `
        @font-face {
          font-family: 'MesloLGS';
          src: url('${fontUrl}') format('truetype');
          font-weight: 200 900;
          font-display: swap;
        }
        body {
          background-color: #000000;
          padding: 0;
          font-size: 16px;
          height: 100%;
          margin: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }
        body::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: repeating-linear-gradient(
            0deg,
            rgba(0, 255, 0, 0.03) 0px,
            rgba(0, 255, 0, 0.03) 1px,
            transparent 1px,
            transparent 2px
          );
          pointer-events: none;
        }
        .container {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          position: relative;
          filter: drop-shadow(0 0 10px rgba(0, 255, 0, 0.5));
        }
        pre {
          margin: 0;
          font-family: 'MesloLGS', monospace;
          font-size: 6rem;
          line-height: 1.1;
          text-rendering: optimizeLegibility;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          color: #00FF00;
          letter-spacing: 0;
          white-space: pre;
          text-align: left;
          display: inline-block;
        }
        .watermark {
          position: absolute;
          bottom: 20px;
          right: 20px;
          font-family: 'MesloLGS', monospace;
          font-size: 1.2rem;
          color: rgba(0, 255, 0, 0.4);
        }
      `,
    },
    'rainbow-green': {
      name: 'rainbow-green',
      bgColor: '#000000',
      textColor: '#FFFFFF',
      applyColors: (text: string, seed: number) => rainbowText(text, seed, 'green', 0.25, 6.0),
      css: `
        @font-face {
          font-family: 'MesloLGS';
          src: url('${fontUrl}') format('truetype');
          font-weight: 200 900;
          font-display: swap;
        }
        body {
          background-color: #000000;
          padding: 0;
          font-size: 16px;
          height: 100%;
          margin: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .container {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          width: 100vw;
          position: relative;
          margin: 0;
          padding: 0;
        }
        pre {
          margin: 0;
          font-family: 'MesloLGS', monospace;
          font-size: 6rem;
          line-height: 1.1;
          text-rendering: optimizeLegibility;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          letter-spacing: 0;
          white-space: pre;
          text-align: left;
          display: inline-block;
        }
        .watermark {
          position: absolute;
          bottom: 20px;
          right: 20px;
          font-family: 'MesloLGS', monospace;
          font-size: 1.2rem;
          color: rgba(255, 255, 255, 0.3);
        }
      `,
    },
    'rainbow-yellow': {
      name: 'rainbow-yellow',
      bgColor: '#000000',
      textColor: '#FFFFFF',
      applyColors: (text: string, seed: number) => rainbowText(text, seed, 'yellow', 0.25, 6.0),
      css: `
        @font-face {
          font-family: 'MesloLGS';
          src: url('${fontUrl}') format('truetype');
          font-weight: 200 900;
          font-display: swap;
        }
        body {
          background-color: #000000;
          padding: 0;
          font-size: 16px;
          height: 100%;
          margin: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .container {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          width: 100vw;
          position: relative;
          margin: 0;
          padding: 0;
        }
        pre {
          margin: 0;
          font-family: 'MesloLGS', monospace;
          font-size: 6rem;
          line-height: 1.1;
          text-rendering: optimizeLegibility;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          letter-spacing: 0;
          white-space: pre;
          text-align: left;
          display: inline-block;
        }
        .watermark {
          position: absolute;
          bottom: 20px;
          right: 20px;
          font-family: 'MesloLGS', monospace;
          font-size: 1.2rem;
          color: rgba(255, 255, 255, 0.3);
        }
      `,
    },
    'rainbow-purple': {
      name: 'rainbow-purple',
      bgColor: '#000000',
      textColor: '#FFFFFF',
      applyColors: (text: string, seed: number) => rainbowText(text, seed, 'purple', 0.25, 6.0),
      css: `
        @font-face {
          font-family: 'MesloLGS';
          src: url('${fontUrl}') format('truetype');
          font-weight: 200 900;
          font-display: swap;
        }
        body {
          background-color: #000000;
          padding: 0;
          font-size: 16px;
          height: 100%;
          margin: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .container {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          width: 100vw;
          position: relative;
          margin: 0;
          padding: 0;
        }
        pre {
          margin: 0;
          font-family: 'MesloLGS', monospace;
          font-size: 6rem;
          line-height: 1.1;
          text-rendering: optimizeLegibility;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          letter-spacing: 0;
          white-space: pre;
          text-align: left;
          display: inline-block;
        }
        .watermark {
          position: absolute;
          bottom: 20px;
          right: 20px;
          font-family: 'MesloLGS', monospace;
          font-size: 1.2rem;
          color: rgba(255, 255, 255, 0.3);
        }
      `,
    },
  };
}

interface CliArgs {
  tier?: string;
  bg?: string;
  textColor?: string;
  outputDir?: string;
  scale?: number;
  watermark?: string;
  quotesFile?: string;
  resolution?: string; // '2000' or '2048'
}

function parseArgs(): CliArgs {
  const args: CliArgs = {};
  const argv = process.argv.slice(2);

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg?.startsWith('--')) continue;

    const key = arg.replace(/^--/, '');
    const value = argv[i + 1];

    if (key === 'tier' && value) args.tier = value;
    else if (key === 'bg' && value) args.bg = value;
    else if (key === 'text-color' && value) args.textColor = value;
    else if (key === 'output-dir' && value) args.outputDir = value;
    else if (key === 'scale' && value) args.scale = parseFloat(value);
    else if (key === 'watermark' && value) args.watermark = value;
    else if (key === 'quotes-file' && value) args.quotesFile = value;
    else if (key === 'resolution' && value) args.resolution = value;
  }

  return args;
}

async function generateImage(
  quote: string,
  tierConfig: TierConfig,
  outputPath: string,
  watermark?: string,
  resolution: number = 2000,
  customBg?: string,
  customTextColor?: string,
  customWidth?: number,
  customFontSize?: string,
  customPadding?: string,
): Promise<void> {
  const wrapWidth = customWidth || 40;
  const wrappedQuote = wrap(quote, {
    width: wrapWidth,
    indent: '',
    trim: true,
    cut: false,
    newline: '\n',
    escape: (str: string) => str,
  });

  const cowsayText = cowsay.say({ text: wrappedQuote });
  const seed = Math.floor(Math.random() * 1000);
  const coloredText = tierConfig.applyColors(cowsayText, seed);

  const convert = new Convert({ newline: true });
  let html = convert.toHtml(coloredText);

  // Apply custom colors and font size to CSS if provided
  let css = tierConfig.css;
  if (customBg) {
    css = css.replace(/background-color:\s*[^;]+/g, `background-color: ${customBg}`);
  }
  if (customTextColor) {
    css = css.replace(/color:\s*#[0-9A-Fa-f]+/g, `color: ${customTextColor}`);
    // Also update pre color if it exists
    css = css.replace(/(pre\s*\{[^}]*color:)\s*[^;]+/g, `$1 ${customTextColor}`);
  }
  if (customFontSize) {
    css = css.replace(/font-size:\s*[^;]+/g, `font-size: ${customFontSize}`);
  }
  if (customPadding) {
    // Add padding to pre element to create margin around the text
    css = css.replace(/pre\s*\{[^}]*\}/g, (match) => {
      if (match.includes('padding:')) {
        return match.replace(/padding:\s*[^;]+/g, `padding: 0 ${customPadding}`);
      }
      return match.replace(/\}/g, `\n          padding: 0 ${customPadding};\n        }`);
    });
  }

  const watermarkHtml = watermark ? `<div class="watermark">${watermark}</div>` : '';

  html = `
    <style>${css}</style>
    <div class="container">
      <pre>${html}</pre>
      ${watermarkHtml}
    </div>
  `;

  // Strict square dimensions for NFT output
  const width = resolution;
  const height = resolution;

  await nodeHtmlToImage({
    output: outputPath,
    html,
    puppeteerArgs: {
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: true,
      defaultViewport: {
        width,
        height,
        deviceScaleFactor: 2, // High DPI for sharp output
      },
    },
    type: 'png',
    quality: 100,
  });
}

async function main() {
  const args = parseArgs();
  const tierConfigs = getTierConfigs();

  const quotesFile = args.quotesFile || path.join(__dirname, '..', 'quotes.txt');
  const outputDir = args.outputDir || path.join(__dirname, '..', 'nfts');
  const watermark = args.watermark;
  // Default to 2000x2000, allow 2048x2048 via --resolution 2048
  const resolution = args.resolution === '2048' ? 2048 : 2000;

  // Read quotes
  if (!fs.existsSync(quotesFile)) {
    console.error(`Quotes file not found: ${quotesFile}`);
    process.exit(1);
  }

  const quotes = fs
    .readFileSync(quotesFile, 'utf-8')
    .split('\n')
    .map((q) => q.trim())
    .filter((q) => q.length > 0);

  if (quotes.length === 0) {
    console.error('No quotes found in file');
    process.exit(1);
  }

  // Determine which tiers to process
  const tiersToProcess = args.tier ? [args.tier] : Object.keys(tierConfigs);

  // Create output directories
  for (const tierName of tiersToProcess) {
    if (!tierConfigs[tierName]) {
      console.warn(`Unknown tier: ${tierName}, skipping...`);
      continue;
    }

    const tierDir = path.join(outputDir, tierName);
    if (!fs.existsSync(tierDir)) {
      fs.mkdirSync(tierDir, { recursive: true });
    }
  }

  // Load NFT index with settings if it exists
  const indexPath = path.join(outputDir, 'index.json');
  let nftSettings: Record<string, { width?: number; fontSize?: string; padding?: string }> = {};
  if (fs.existsSync(indexPath)) {
    try {
      const indexData = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
      if (indexData.nfts && Array.isArray(indexData.nfts)) {
        for (const nft of indexData.nfts) {
          if (nft.id && nft.settings) {
            nftSettings[nft.id] = nft.settings;
          }
        }
      }
    } catch (error) {
      console.warn('Could not load NFT index settings:', error);
    }
  }

  // Process each quote for each tier
  console.log(`Processing ${quotes.length} quotes across ${tiersToProcess.length} tier(s)...`);

  for (let i = 0; i < quotes.length; i++) {
    const quote = quotes[i];
    const nftId = String(i + 1).padStart(3, '0');
    const settings = nftSettings[nftId] || {};
    console.log(`Processing quote ${i + 1}/${quotes.length}: "${quote.substring(0, 50)}..."`);

    for (const tierName of tiersToProcess) {
      const tierConfig = tierConfigs[tierName];
      if (!tierConfig) continue;

      // Apply custom colors if provided
      if (args.bg) tierConfig.bgColor = args.bg;
      if (args.textColor) tierConfig.textColor = args.textColor;

      const outputPath = path.join(outputDir, tierName, `nft-${nftId}-${tierName}.png`);

      try {
        await generateImage(
          quote,
          tierConfig,
          outputPath,
          watermark,
          resolution,
          args.bg,
          args.textColor,
          settings.width,
          settings.fontSize,
          settings.padding
        );
        console.log(`  ✓ Generated ${tierName}: ${outputPath}`);
      } catch (error) {
        console.error(`  ✗ Failed to generate ${tierName}:`, error);
      }
    }
  }

  console.log('\n✓ Batch generation complete!');
}

main().catch(console.error);

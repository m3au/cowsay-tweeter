import * as cowsay from 'cowsay';
import * as fs from 'fs';
import * as path from 'path';

import Convert from 'ansi-to-html';
import nodeHtmlToImage from 'node-html-to-image';
import wrap from 'word-wrap';

// Import the tier configs and rainbow function from generate-tiers
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

interface CliArgs {
  quote?: string;
  width?: number;
  height?: number;
  outputPath?: string;
  fontSize?: string;
  padding?: string;
  wrapWidth?: number;
}

function parseArgs(): CliArgs {
  const args: CliArgs = {};
  const argv = process.argv.slice(2);

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg?.startsWith('--')) continue;

    const key = arg.replace(/^--/, '');
    const value = argv[i + 1];

    if (key === 'quote' && value) args.quote = value;
    else if (key === 'width' && value) args.width = parseInt(value, 10);
    else if (key === 'height' && value) args.height = parseInt(value, 10);
    else if (key === 'output' && value) args.outputPath = value;
    else if (key === 'font-size' && value) args.fontSize = value;
    else if (key === 'padding' && value) args.padding = value;
    else if (key === 'wrap-width' && value) args.wrapWidth = parseInt(value, 10);
  }

  return args;
}

async function generateShopImage(
  quote: string,
  outputPath: string,
  width: number,
  height: number,
  fontSize?: string,
  padding?: string,
  wrapWidth?: number,
): Promise<void> {
  const wrapWidthValue = wrapWidth || 40;
  const wrappedQuote = wrap(quote, {
    width: wrapWidthValue,
    indent: '',
    trim: true,
    cut: false,
    newline: '\n',
    escape: (str: string) => str,
  });

  const cowsayText = cowsay.say({ text: wrappedQuote });
  const seed = Math.floor(Math.random() * 1000);
  const coloredText = rainbowText(cowsayText, seed, 'purple', 0.25, 6.0);

  const convert = new Convert({ newline: true });
  let html = convert.toHtml(coloredText);

  // Resolve font path
  const srcDir = path.resolve(__dirname, '..', 'src');
  const fontPath = path.join(srcDir, 'MesloLGSDZ-Regular.ttf');
  const fontUrl = `file://${fontPath}`;

  // Build CSS with custom dimensions
  let css = `
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
      font-size: ${fontSize || '8.5rem'};
      line-height: 1.1;
      text-rendering: optimizeLegibility;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      letter-spacing: 0;
      white-space: pre;
      text-align: left;
      display: inline-block;
      ${padding ? `padding: 0 ${padding};` : ''}
    }
  `;

  html = `
    <style>${css}</style>
    <div class="container">
      <pre>${html}</pre>
    </div>
  `;

  await nodeHtmlToImage({
    output: outputPath,
    html,
    puppeteerArgs: {
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: true,
      defaultViewport: {
        width,
        height,
        deviceScaleFactor: 2, // High DPI for sharp output (300 DPI equivalent)
      },
    },
    type: 'png',
    quality: 100,
  });
}

async function main() {
  const args = parseArgs();

  const quote = args.quote || 'It works on my machine!';
  const width = args.width || 2925;
  const height = args.height || 2502;
  const fontSize = args.fontSize || '8.5rem';
  const outputPath = args.outputPath || path.join(__dirname, '..', 'shop', 'mousepad-test.png');

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log(`Generating shop image...`);
  console.log(`  Quote: "${quote}"`);
  console.log(`  Dimensions: ${width} x ${height}`);
  console.log(`  Output: ${outputPath}`);

  try {
    await generateShopImage(
      quote,
      outputPath,
      width,
      height,
      fontSize,
      args.padding,
      args.wrapWidth,
    );
    console.log(`\n✓ Image generated successfully: ${outputPath}`);
  } catch (error) {
    console.error(`\n✗ Failed to generate image:`, error);
    process.exit(1);
  }
}

main().catch(console.error);

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

interface ProductConfig {
  width: number;
  height: number;
  fontSize: string;
  wrapWidth: number;
  paddingTop: string;
}

interface CliArgs {
  quote?: string;
  product?: string;
  width?: number;
  height?: number;
  outputPath?: string;
  fontSize?: string;
  padding?: string;
  wrapWidth?: number;
  configPath?: string;
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
    else if (key === 'product' && value) args.product = value;
    else if (key === 'width' && value) args.width = parseInt(value, 10);
    else if (key === 'height' && value) args.height = parseInt(value, 10);
    else if (key === 'output' && value) args.outputPath = value;
    else if (key === 'font-size' && value) args.fontSize = value;
    else if (key === 'padding' && value) args.padding = value;
    else if (key === 'wrap-width' && value) args.wrapWidth = parseInt(value, 10);
    else if (key === 'config' && value) args.configPath = value;
  }

  return args;
}

function loadProductConfig(configPath: string, productType: string): ProductConfig | null {
  try {
    if (!fs.existsSync(configPath)) {
      console.warn(`Config file not found: ${configPath}`);
      return null;
    }
    const configContent = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(configContent);
    if (config[productType]) {
      return config[productType] as ProductConfig;
    }
    console.warn(`Product type "${productType}" not found in config`);
    return null;
  } catch (error) {
    console.warn(`Failed to load config: ${error}`);
    return null;
  }
}

function plainText(text: string): string {
  return text;
}

function greenTerminalText(text: string): string {
  return `\x1b[38;2;0;255;0m${text}\x1b[0m`;
}

function parseTheme(theme: string): { 
  background: 'dark' | 'white'; 
  colorScheme: 'common' | 'green' | 'rainbow-green' | 'rainbow-yellow' | 'rainbow-purple';
  textStyle: 'plain' | 'green' | 'rainbow';
  rainbowColorScheme?: 'default' | 'green' | 'yellow' | 'purple';
} {
  const [bg, ...colorParts] = theme.split('-');
  const background = (bg === 'white' ? 'white' : 'dark') as 'dark' | 'white';
  const colorScheme = colorParts.join('-');
  
  // Map color scheme to text styling
  if (colorScheme === 'common') {
    return { background, colorScheme: 'common', textStyle: 'plain' };
  } else if (colorScheme === 'green') {
    return { background, colorScheme: 'green', textStyle: 'green' };
  } else if (colorScheme === 'rainbow-green') {
    return { background, colorScheme: 'rainbow-green', textStyle: 'rainbow', rainbowColorScheme: 'green' };
  } else if (colorScheme === 'rainbow-yellow') {
    return { background, colorScheme: 'rainbow-yellow', textStyle: 'rainbow', rainbowColorScheme: 'yellow' };
  } else if (colorScheme === 'rainbow-purple') {
    return { background, colorScheme: 'rainbow-purple', textStyle: 'rainbow', rainbowColorScheme: 'purple' };
  }
  
  // Default
  return { background, colorScheme: 'common', textStyle: 'plain' };
}

async function generateShopImage(
  quote: string,
  outputPath: string,
  width: number,
  height: number,
  fontSize?: string,
  paddingTop?: string,
  wrapWidth?: number,
  theme?: string,
  productType?: string,
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
  
  // Parse theme to get background and color scheme
  const themeConfig = theme ? parseTheme(theme) : { background: 'dark' as const, colorScheme: 'rainbow-purple' as const, textStyle: 'rainbow' as const, rainbowColorScheme: 'purple' as const };
  
  // Apply text coloring based on theme
  let coloredText: string;
  if (themeConfig.textStyle === 'plain') {
    // For plain text, don't add ANSI codes - we'll use CSS color
    coloredText = cowsayText;
  } else if (themeConfig.textStyle === 'green') {
    coloredText = greenTerminalText(cowsayText);
  } else {
    // rainbow - use the rainbowColorScheme directly from parseTheme
    const rainbowScheme = (themeConfig.rainbowColorScheme || 'purple') as 'default' | 'green' | 'yellow' | 'purple';
    coloredText = rainbowText(cowsayText, seed, rainbowScheme, 0.25, 6.0);
  }

  const convert = new Convert({ newline: true });
  let html = convert.toHtml(coloredText);
  
  // For plain text without ANSI codes, manually convert to HTML
  // The ansi-to-html converter doesn't convert newlines when there are no ANSI codes
  if (themeConfig.textStyle === 'plain') {
    html = cowsayText
      .split('\n')
      .map(line => {
        const escaped = line
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
        return escaped || ' '; // Preserve empty lines with space
      })
      .join('<br/>');
  }

  // Resolve font path
  const srcDir = path.resolve(__dirname, '..', 'src');
  const fontPath = path.join(srcDir, 'MesloLGSDZ-Regular.ttf');
  const fontUrl = `file://${fontPath}`;

  // Build CSS with custom dimensions
  // Parse paddingTop as margin value (if it's a percentage, use it for top/bottom margins)
  const marginTop = paddingTop && paddingTop !== '0%' ? paddingTop : '0';
  const marginBottom = paddingTop && paddingTop !== '0%' ? paddingTop : '0';
  const backgroundColor = themeConfig.background === 'white' ? '#FFFFFF' : '#000000';
  
  // Determine text color based on theme
  let textColor = '#FFFFFF';
  if (themeConfig.textStyle === 'plain') {
    // Use brighter, clearer colors for common theme
    textColor = themeConfig.background === 'white' ? '#000000' : '#FFFFFF';
  } else if (themeConfig.textStyle === 'green') {
    textColor = '#00FF00';
  }
  
  let css = `
    @font-face {
      font-family: 'MesloLGS';
      src: url('${fontUrl}') format('truetype');
      font-weight: 200 900;
      font-display: swap;
    }
    body {
      background-color: ${backgroundColor};
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
      align-items: ${productType === 'cup' ? 'flex-start' : 'center'};
      justify-content: center;
      height: 100vh;
      width: 100vw;
      position: relative;
      margin: ${marginTop} 0 ${marginBottom} 0;
      padding: ${productType === 'cup' ? '5% 0 0 0' : '0'};
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
      ${themeConfig.textStyle === 'plain' || themeConfig.textStyle === 'green' ? `color: ${textColor};` : ''}
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

  // Determine output path first to check for per-NFT config
  let outputPath = args.outputPath;
  let configDir: string | null = null;
  
  if (!outputPath && args.product) {
    // If config path is provided, use its directory
    if (args.configPath) {
      configDir = path.dirname(args.configPath);
      // Create product subfolder and output there
      const productDir = path.join(configDir, args.product);
      if (!fs.existsSync(productDir)) {
        fs.mkdirSync(productDir, { recursive: true });
      }
      outputPath = path.join(productDir, `${args.product}.png`);
    } else {
      // Try to find config by looking for config.json starting from current directory
      const cwd = process.cwd();
      let currentDir = cwd;
      
      // Search up the directory tree for config.json
      while (currentDir !== path.dirname(currentDir)) {
        const configPath = path.join(currentDir, 'config.json');
        if (fs.existsSync(configPath)) {
          configDir = currentDir;
          // Create product subfolder and output there
          const productDir = path.join(configDir, args.product);
          if (!fs.existsSync(productDir)) {
            fs.mkdirSync(productDir, { recursive: true });
          }
          outputPath = path.join(productDir, `${args.product}.png`);
          break;
        }
        currentDir = path.dirname(currentDir);
      }
      
      // If not found, error out - we need a config
      if (!configDir) {
        console.error('Error: Could not find config.json. Please run from a directory containing config.json or use --config flag.');
        process.exit(1);
      }
    }
  } else if (!outputPath) {
    outputPath = path.join(__dirname, '..', 'shop', 'mousepad-test.png');
  } else {
    // If output path is explicitly provided, ensure it's in a product subfolder
    const outputDir = path.dirname(outputPath);
    const parentDir = path.dirname(outputDir);
    const dirName = path.basename(outputDir);
    
    // Check if we're already in a product folder (cup, nft, etc.)
    const productTypes = ['cup', 'nft', 'mousepad', 'socks', 'tshirt'];
    if (!productTypes.includes(dirName)) {
      // Not in a product folder, extract product from filename or use parent dir
      const filename = path.basename(outputPath, '.png');
      const productMatch = filename.match(/(cup|nft|mousepad|socks|tshirt)/);
      if (productMatch && args.product) {
        const productDir = path.join(parentDir, args.product);
        if (!fs.existsSync(productDir)) {
          fs.mkdirSync(productDir, { recursive: true });
        }
        outputPath = path.join(productDir, path.basename(outputPath));
      }
    }
    
    // Try to find config in parent directory
    configDir = parentDir;
    const configPath = path.join(configDir, 'config.json');
    if (!fs.existsSync(configPath)) {
      configDir = path.dirname(outputPath);
    }
  }

  // Load default product dimensions (shared across all NFTs)
  let defaultDimensions: Record<string, { width: number; height: number }> = {};
  const dimensionsPath = path.join(__dirname, '..', 'art', 'product-dimensions.json');
  if (fs.existsSync(dimensionsPath)) {
    try {
      defaultDimensions = JSON.parse(fs.readFileSync(dimensionsPath, 'utf-8'));
    } catch (error) {
      console.warn(`Failed to load product dimensions: ${error}`);
    }
  }

  // Try to load product config - check per-NFT config first
  let productConfig: ProductConfig | null = null;
  let configQuote: string | null = null;
  if (args.product) {
    // First, try config in the config directory
    if (configDir) {
      const perNftConfigPath = path.join(configDir, 'config.json');
      // Try both config.json and product-config.json for backwards compatibility
      const configPath1 = path.join(configDir, 'config.json');
      const configPath2 = path.join(configDir, 'product-config.json');
      const configPath = fs.existsSync(configPath1) ? configPath1 : (fs.existsSync(configPath2) ? configPath2 : null);
      
      if (configPath && fs.existsSync(configPath)) {
        const fullConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        const perNftProductConfig = fullConfig[args.product] || null;
        configQuote = fullConfig.quote || null;
        
        // Merge default dimensions with per-NFT config (dimensions come from defaults)
        if (perNftProductConfig && defaultDimensions[args.product]) {
          productConfig = {
            width: defaultDimensions[args.product].width,
            height: defaultDimensions[args.product].height,
            fontSize: perNftProductConfig.fontSize,
            wrapWidth: perNftProductConfig.wrapWidth,
            paddingTop: perNftProductConfig.paddingTop,
          };
        } else if (perNftProductConfig) {
          // Fallback if no default dimensions found
          productConfig = perNftProductConfig;
        }
      }
    }
    
    // Fall back to explicitly provided config path if not found
    if (!productConfig && args.configPath) {
      if (fs.existsSync(args.configPath)) {
        const fullConfig = JSON.parse(fs.readFileSync(args.configPath, 'utf-8'));
        const perNftProductConfig = fullConfig[args.product] || null;
        configQuote = fullConfig.quote || configQuote;
        
        // Merge default dimensions with per-NFT config
        if (perNftProductConfig && defaultDimensions[args.product]) {
          productConfig = {
            width: defaultDimensions[args.product].width,
            height: defaultDimensions[args.product].height,
            fontSize: perNftProductConfig.fontSize,
            wrapWidth: perNftProductConfig.wrapWidth,
            paddingTop: perNftProductConfig.paddingTop,
          };
        } else if (perNftProductConfig) {
          productConfig = perNftProductConfig;
        }
      }
    }
    
    // If still no config but we have default dimensions, use those with defaults for other fields
    if (!productConfig && defaultDimensions[args.product]) {
      productConfig = {
        width: defaultDimensions[args.product].width,
        height: defaultDimensions[args.product].height,
        fontSize: '6rem',
        wrapWidth: 40,
        paddingTop: '0%',
      };
    }
  }

  // Extract theme from output path if available
  let theme: string | undefined = undefined;
  if (outputPath) {
    const filename = path.basename(outputPath, '.png');
    // Match theme pattern: dark-rainbow-purple-cup -> dark-rainbow-purple
    const themeMatch = filename.match(/^(dark|white)-(common|green|rainbow-green|rainbow-yellow|rainbow-purple)-/);
    if (themeMatch) {
      theme = `${themeMatch[1]}-${themeMatch[2]}`;
      console.log(`  Theme extracted from filename: ${theme}`);
    }
  }
  
  // Use config values or fallback to command line args or defaults
  const quote = args.quote || configQuote || 'It works on my machine!';
  // Theme defaults to dark-rainbow-purple if not extracted from filename
  if (!theme) {
    theme = 'dark-rainbow-purple';
    console.log(`  Using default theme: ${theme}`);
  }
  const width = args.width || productConfig?.width || 2925;
  const height = args.height || productConfig?.height || 2502;
  const fontSize = args.fontSize || productConfig?.fontSize || '8.5rem';
  const wrapWidth = args.wrapWidth || productConfig?.wrapWidth || 40;
  const paddingTop = productConfig?.paddingTop || '0%';

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log(`Generating shop image...`);
  if (args.product) {
    console.log(`  Product: ${args.product}`);
  }
  console.log(`  Quote: "${quote}"`);
  console.log(`  Dimensions: ${width} x ${height}`);
  console.log(`  Font size: ${fontSize}`);
  console.log(`  Wrap width: ${wrapWidth}`);
  console.log(`  Padding top: ${paddingTop}`);
  console.log(`  Output: ${outputPath}`);

  try {
    await generateShopImage(
      quote,
      outputPath,
      width,
      height,
      fontSize,
      paddingTop,
      wrapWidth,
      theme,
      args.product,
    );
    console.log(`\n✓ Image generated successfully: ${outputPath}`);
  } catch (error) {
    console.error(`\n✗ Failed to generate image:`, error);
    process.exit(1);
  }
}

main().catch(console.error);

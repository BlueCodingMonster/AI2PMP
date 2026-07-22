const sharp = require('sharp');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

async function main() {
  const svgPath = path.join(__dirname, '../public/favicon.svg');
  const tempDir = path.join(__dirname, '../.tmp/icons');
  
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const sizes = [16, 32, 48, 64, 128, 256];
  const pngPaths = [];

  console.log('Rendering SVG to PNGs...');
  for (const size of sizes) {
    const pngPath = path.join(tempDir, `favicon-${size}.png`);
    await sharp(svgPath)
      .resize(size, size)
      .png()
      .toFile(pngPath);
    pngPaths.push(pngPath);
    console.log(`- Created ${size}x${size} PNG`);
  }

  // Create Python script to bundle PNGs to ICO
  const pyScriptPath = path.join(tempDir, 'make_ico.py');
  const pyCode = `
import sys
from PIL import Image

png_paths = sys.argv[1:-1]
ico_path = sys.argv[-1]

images = [Image.open(p) for p in png_paths]
# Save the first image, and append the rest as frames
images[0].save(ico_path, format='ICO', sizes=[(img.width, img.height) for img in images])
print("Successfully generated multi-resolution ICO at:", ico_path)
`;
  fs.writeFileSync(pyScriptPath, pyCode.trim());

  const targetIcoPath = path.join(__dirname, '../src/app/favicon.ico');
  const pythonCmd = `python "${pyScriptPath}" ${pngPaths.map(p => `"${p}"`).join(' ')} "${targetIcoPath}"`;
  
  console.log('Running Python conversion script to pack ICO...');
  try {
    const output = execSync(pythonCmd, { encoding: 'utf8' });
    console.log(output);
  } catch (err) {
    console.error('Error generating ICO file:', err);
    process.exit(1);
  }

  // Clean up temp directory
  console.log('Cleaning up temporary files...');
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch (e) {
    console.warn('Could not delete temp dir:', e.message);
  }

  console.log('Icon generation completed successfully!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

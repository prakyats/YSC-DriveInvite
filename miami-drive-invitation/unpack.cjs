const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const sourceFile = path.resolve(__dirname, '..', 'A Drive to Miami - Standalone.html');
const outputDir = path.resolve(__dirname);
const assetsDir = path.join(outputDir, 'public', 'assets');

if (!fs.existsSync(path.join(outputDir, 'public'))) {
    fs.mkdirSync(path.join(outputDir, 'public'), { recursive: true });
}
if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
}

console.log('Reading source file...');
const html = fs.readFileSync(sourceFile, 'utf8');

console.log('Extracting manifest...');
const manifestMatch = html.match(/<script type="__bundler\/manifest">([\s\S]*?)<\/script>/);
if (!manifestMatch) {
    console.error('Could not find manifest');
    process.exit(1);
}
const manifest = JSON.parse(manifestMatch[1].trim());

console.log('Extracting template...');
const templateMatch = html.match(/<script type="__bundler\/template">([\s\S]*?)<\/script>/);
if (!templateMatch) {
    console.error('Could not find template');
    process.exit(1);
}
let template = JSON.parse(templateMatch[1].trim());

const assetMap = {};

console.log('Processing assets...');
for (const [uuid, asset] of Object.entries(manifest)) {
    console.log(`Processing asset: ${asset.name} (${uuid})`);
    
    let buffer = Buffer.from(asset.data, 'base64');
    
    if (asset.compressed) {
        try {
            buffer = zlib.gunzipSync(buffer);
        } catch (e) {
            console.error(`Failed to decompress ${asset.name}:`, e.message);
        }
    }
    
    // Improved extension detection
    const mimeMap = {
        'image/png': '.png',
        'image/jpeg': '.jpg',
        'image/webp': '.webp',
        'image/gif': '.gif',
        'image/svg+xml': '.svg',
        'audio/mpeg': '.mp3',
        'audio/wav': '.wav',
        'audio/ogg': '.ogg',
        'font/woff2': '.woff2',
        'font/woff': '.woff',
        'font/ttf': '.ttf',
        'text/css': '.css',
        'text/javascript': '.js',
        'application/javascript': '.js'
    };

    const assetName = asset.name || '';
    let ext = path.extname(assetName);
    if (!ext && asset.mime) {
        ext = mimeMap[asset.mime.split(';')[0]] || '';
    }
    
    const safeName = `${uuid}${ext}`;
    const filePath = path.join(assetsDir, safeName);
    
    console.log(`Writing to ${filePath} (mime: ${asset.mime})`);
    fs.writeFileSync(filePath, buffer);
    assetMap[uuid] = `./assets/${safeName}`;
}

console.log('Updating template placeholders...');
// The template uses UUIDs as placeholders. We need to find where they are.
// Usually they are in src= or href= or just as strings.
for (const [uuid, url] of Object.entries(assetMap)) {
    // Escape UUID for regex just in case
    const escapedUuid = uuid.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedUuid, 'g');
    template = template.replace(regex, url);
}

// Write the final HTML
console.log('Writing index.html...');
fs.writeFileSync(path.join(outputDir, 'index.html'), template);

console.log('Extraction complete! Files are in the "public" directory.');

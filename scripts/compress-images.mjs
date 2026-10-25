import sharp from 'sharp';
import { readdirSync, statSync, unlinkSync, existsSync } from 'fs';
import { join, extname, basename } from 'path';

const publicDir = './public';

// الصور المطلوب ضغطها وتحويلها لـ WebP
const imagesToConvert = [
  { input: 'bg4.png', output: 'bg4.webp', quality: 75, width: 1920 },
  { input: 'bg5.png', output: 'bg5.webp', quality: 75, width: 1920 },
  { input: 'bg6.png', output: 'bg6.webp', quality: 75, width: 1920 },
  { input: 'img2.png', output: 'img2.png', quality: 80, width: 1200 },
  { input: 'pc.png', output: 'pc.webp', quality: 82, width: 600 },
  { input: 'access.png', output: 'access.webp', quality: 82, width: 600 },
  { input: 'lap.png', output: 'lap.webp', quality: 82, width: 600 },
  { input: 'monitor.png', output: 'monitor.webp', quality: 82, width: 600 },
  { input: 'logo.png', output: 'logo.png', quality: 85, width: 400 },
  { input: 'logo2.png', output: 'logo2.webp', quality: 85, width: 400 },
  { input: 'logo.jpg', output: 'logo.png', quality: 85, width: 400 },
  { input: 'insta.png', output: 'insta.webp', quality: 80, width: 100 },
  { input: 'voda.png', output: 'voda.webp', quality: 80, width: 100 },
  { input: 'cash.png', output: 'cash.webp', quality: 80, width: 100 },
  { input: 'sg.jpeg', output: 'sg.webp', quality: 80, width: 400 },
];

// ضغط favicon بشكل منفصل (نحتفظ بـ PNG لكن نضغطها)
const favicon = { input: 'favicon.png', output: 'favicon.png', width: 96 };

async function compressImages() {
  let totalSaved = 0;

  console.log('🔄 بدء ضغط الصور...\n');

  // ضغط favicon
  const faviconInput = join(publicDir, favicon.input);
  if (existsSync(faviconInput)) {
    const before = statSync(faviconInput).size;
    await sharp(faviconInput)
      .resize(favicon.width, favicon.width, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png({ compressionLevel: 9, quality: 90 })
      .toFile(join(publicDir, favicon.input + '.tmp'));

    unlinkSync(faviconInput);
    const { renameSync } = await import('fs');
    renameSync(join(publicDir, favicon.input + '.tmp'), faviconInput);
    const after = statSync(faviconInput).size;
    const saved = before - after;
    totalSaved += saved;
    console.log(`✅ favicon.png: ${(before / 1024).toFixed(0)}KB → ${(after / 1024).toFixed(0)}KB (وفّرنا ${(saved / 1024).toFixed(0)}KB)`);
  }

  // تحويل الصور لـ WebP
  const processed = new Set();
  for (const img of imagesToConvert) {
    const inputPath = join(publicDir, img.input);
    const outputPath = join(publicDir, img.output);

    // تجنب تكرار معالجة نفس الملف (logo.png و logo.jpg كلاهما → logo.png)
    if (processed.has(img.output)) continue;

    if (!existsSync(inputPath)) {
      console.log(`⚠️  ${img.input} غير موجود، تم تخطيه`);
      continue;
    }

    const before = statSync(inputPath).size;

    try {
      await sharp(inputPath)
        .resize(img.width, null, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: img.quality, effort: 6 })
        .toFile(outputPath);

      const after = statSync(outputPath).size;
      const saved = before - after;
      totalSaved += saved;
      processed.add(img.output);
      console.log(`✅ ${img.input} → ${img.output}: ${(before / 1024).toFixed(0)}KB → ${(after / 1024).toFixed(0)}KB (وفّرنا ${(saved / 1024).toFixed(0)}KB)`);

      // احذف الأصل فقط إذا كان الاسم مختلفاً عن الناتج
      if (img.input !== img.output && existsSync(inputPath)) {
        unlinkSync(inputPath);
        console.log(`   🗑️  حذف ${img.input}`);
      }
    } catch (err) {
      console.error(`❌ خطأ في ${img.input}:`, err.message);
    }
  }

  console.log(`\n🎉 إجمالي ما تم توفيره: ${(totalSaved / 1024 / 1024).toFixed(2)} MB`);
  console.log('⚠️  تذكر: حدّث مراجع الصور في الكود من .png/.jpg/.jpeg إلى .webp');
}

compressImages().catch(console.error);

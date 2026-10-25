import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const publicDir = path.join(rootDir, 'public');

const BASE_URL = 'https://www.compusaif.com';
const STORE_NAME = 'كمبيو سيف | Compu Saif';

// Helper to sanitize slug
function generateSlug(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/[^\w\s\u0600-\u06FF-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

// Strip HTML tags for meta descriptions
function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeXml(unsafe) {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function escapeHtml(unsafe) {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Parse Firestore Document
function parseFirestoreDoc(doc) {
  const id = doc.name.split('/').pop();
  const f = doc.fields || {};

  function val(field) {
    if (!field) return null;
    if ('stringValue' in field) return field.stringValue;
    if ('integerValue' in field) return parseInt(field.integerValue, 10);
    if ('doubleValue' in field) return parseFloat(field.doubleValue);
    if ('booleanValue' in field) return field.booleanValue;
    if ('timestampValue' in field) return field.timestampValue;
    if ('arrayValue' in field) {
      return (field.arrayValue.values || []).map(v => val(v));
    }
    if ('mapValue' in field) {
      const res = {};
      for (const [k, v] of Object.entries(field.mapValue.fields || {})) {
        res[k] = val(v);
      }
      return res;
    }
    return null;
  }

  const rawSpecs = val(f.specifications) || [];
  const specifications = rawSpecs.map(s => {
    if (typeof s === 'object' && s !== null) {
      return { key: s.key || '', value: s.value || '' };
    }
    return null;
  }).filter(Boolean);

  return {
    id,
    name: val(f.name) || '',
    category: val(f.category) || 'laptops',
    brand: val(f.brand) || '',
    price: val(f.price) || 0,
    discountPrice: val(f.discountPrice) || null,
    specialOffer: val(f.specialOffer) || false,
    images: val(f.images) || [],
    description: val(f.description) || '',
    specifications,
    isArchived: val(f.isArchived) === true,
    updatedAt: val(f.updatedAt) || val(f.createdAt) || new Date().toISOString()
  };
}

// Fetch all products from Firestore REST API
async function fetchAllProducts() {
  console.log('📡 جاري جلب المنتجات من Firestore...');
  try {
    const res = await fetch('https://firestore.googleapis.com/v1/projects/compu-saif/databases/(default)/documents/products?pageSize=1000');
    if (!res.ok) {
      throw new Error(`Firestore API returned status: ${res.status}`);
    }
    const data = await res.json();
    const rawDocs = data.documents || [];
    const products = rawDocs.map(parseFirestoreDoc).filter(p => !p.isArchived && p.name);
    console.log(`✅ تم جلب ${products.length} منتج نشط.`);
    return products;
  } catch (err) {
    console.error('⚠️ تعذر جلب المنتجات من Firestore:', err.message);
    return [];
  }
}

// Generate pre-rendered HTML by injecting custom meta and initial semantic DOM
function injectSEO(templateHtml, {
  title,
  description,
  keywords,
  canonicalUrl,
  image,
  type = 'website',
  schemaJson,
  bodyContent = ''
}) {
  let html = templateHtml;

  // Title
  if (title) {
    html = html.replace(/<title>.*?<\/title>/is, `<title>${escapeHtml(title)}</title>`);
    html = html.replace(/<meta\s+name=["']title["']\s+content=["'].*?["']\s*\/?>/is, `<meta name="title" content="${escapeHtml(title)}" />`);
  }

  // Description
  if (description) {
    html = html.replace(/<meta\s+name=["']description["']\s+content=["'].*?["']\s*\/?>/is, `<meta name="description" content="${escapeHtml(description)}" />`);
  }

  // Keywords
  if (keywords) {
    html = html.replace(/<meta\s+name=["']keywords["']\s+content=["'].*?["']\s*\/?>/is, `<meta name="keywords" content="${escapeHtml(keywords)}" />`);
  }

  // Canonical URL
  if (canonicalUrl) {
    html = html.replace(/<link\s+rel=["']canonical["']\s+href=["'].*?["']\s*\/?>/is, `<link rel="canonical" href="${canonicalUrl}" />`);
  }

  // Open Graph
  if (title) {
    html = html.replace(/<meta\s+property=["']og:title["']\s+content=["'].*?["']\s*\/?>/is, `<meta property="og:title" content="${escapeHtml(title)}" />`);
  }
  if (description) {
    html = html.replace(/<meta\s+property=["']og:description["']\s+content=["'].*?["']\s*\/?>/is, `<meta property="og:description" content="${escapeHtml(description)}" />`);
  }
  if (canonicalUrl) {
    html = html.replace(/<meta\s+property=["']og:url["']\s+content=["'].*?["']\s*\/?>/is, `<meta property="og:url" content="${canonicalUrl}" />`);
  }
  if (image) {
    html = html.replace(/<meta\s+property=["']og:image["']\s+content=["'].*?["']\s*\/?>/is, `<meta property="og:image" content="${image}" />`);
  }
  if (type) {
    html = html.replace(/<meta\s+property=["']og:type["']\s+content=["'].*?["']\s*\/?>/is, `<meta property="og:type" content="${type}" />`);
  }

  // Twitter
  if (title) {
    html = html.replace(/<meta\s+name=["']twitter:title["']\s+content=["'].*?["']\s*\/?>/is, `<meta name="twitter:title" content="${escapeHtml(title)}" />`);
  }
  if (description) {
    html = html.replace(/<meta\s+name=["']twitter:description["']\s+content=["'].*?["']\s*\/?>/is, `<meta name="twitter:description" content="${escapeHtml(description)}" />`);
  }
  if (canonicalUrl) {
    html = html.replace(/<meta\s+name=["']twitter:url["']\s+content=["'].*?["']\s*\/?>/is, `<meta name="twitter:url" content="${canonicalUrl}" />`);
  }
  if (image) {
    html = html.replace(/<meta\s+name=["']twitter:image["']\s+content=["'].*?["']\s*\/?>/is, `<meta name="twitter:image" content="${image}" />`);
  }

  // Inject additional Schema if provided
  if (schemaJson) {
    const schemaScript = `\n  <!-- Injected SEO Structured Data (Prerendered) -->\n  <script type="application/ld+json">\n${JSON.stringify(schemaJson, null, 2)}\n  </script>\n`;
    html = html.replace('</head>', `${schemaScript}</head>`);
  }

  // Inject initial semantic HTML inside <div id="root">
  if (bodyContent) {
    html = html.replace('<div id="root"></div>', `<div id="root">${bodyContent}</div>`);
  }

  return html;
}

// Write file safely
function writeHtmlFile(relativeFilePath, content) {
  const fullPath = path.join(distDir, relativeFilePath);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(fullPath, content, 'utf-8');
}

// Generate Product Page
function prerenderProduct(templateHtml, product) {
  const slug = generateSlug(product.name);
  const canonicalUrl = `${BASE_URL}/product/${slug}`;
  const rawImage = product.images?.[0] || '';
  const mainImage = (rawImage && rawImage.startsWith('http')) ? rawImage : `${BASE_URL}/logo.png`;
  const price = product.discountPrice || product.price;

  const title = `${product.name} | كمبيو سيف`;
  
  const rawDesc = stripHtml(product.description);
  let description = rawDesc;
  if (!description || description.length < 30) {
    description = `تسوق ${product.name} استيراد فرز أول أصلي بالكامل من كمبيو سيف بأفضل سعر في مصر. ضمان معتمد وشحن سريع لجميع المحافظات.`;
  } else if (description.length > 165) {
    description = description.slice(0, 160) + '...';
  }

  const keywords = `${product.name}, لابتوبات استيراد, لابتوب استيراد, ${product.brand} استيراد, ${product.category}, كمبيو سيف, اسعار لابتوبات استيراد مصر`;

  // Schema.org Product
  const schemaJson = {
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": product.name,
    "image": product.images?.length ? product.images : [mainImage],
    "description": description,
    "sku": product.id,
    "mpn": product.id,
    "brand": {
      "@type": "Brand",
      "name": product.brand || "Compu Saif"
    },
    "category": product.category,
    "offers": {
      "@type": "Offer",
      "url": canonicalUrl,
      "priceCurrency": "EGP",
      "price": price,
      "priceValidUntil": "2027-12-31",
      "itemCondition": "https://schema.org/UsedCondition",
      "availability": "https://schema.org/InStock",
      "seller": {
        "@type": "Organization",
        "name": "كمبيو سيف | Compu Saif"
      }
    }
  };

  // Semantic Pre-rendered Content
  const specsRows = product.specifications && product.specifications.length > 0
    ? product.specifications.map(s => `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <th style="text-align: right; padding: 10px; color: #475569; font-weight: 600; width: 35%;">${escapeHtml(s.key)}</th>
          <td style="padding: 10px; color: #0f172a;">${escapeHtml(s.value)}</td>
        </tr>
      `).join('')
    : '';

  const bodyContent = `
    <main style="max-width: 1200px; margin: 0 auto; padding: 24px 16px; font-family: 'Cairo', system-ui, sans-serif; direction: rtl; color: #1e293b;">
      <nav aria-label="Breadcrumb" style="font-size: 14px; margin-bottom: 20px; color: #64748b;">
        <a href="/" style="color: #2563eb; text-decoration: none;">الرئيسية</a> &gt; 
        <a href="/products" style="color: #2563eb; text-decoration: none;">المنتجات</a> &gt; 
        <span>${escapeHtml(product.name)}</span>
      </nav>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 32px; align-items: start; background: #ffffff; border-radius: 16px; padding: 24px; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
        <div style="text-align: center;">
          <img src="${mainImage}" alt="${escapeHtml(product.name)} - ${escapeHtml(product.brand || '')} استيراد أصلي فرز أول | كمبيو سيف" style="max-width: 100%; height: auto; border-radius: 12px; object-fit: contain; max-height: 420px;" loading="eager" />
        </div>

        <div>
          <div style="display: inline-block; background: #e0f2fe; color: #0369a1; padding: 4px 12px; border-radius: 9999px; font-size: 13px; font-weight: 600; margin-bottom: 12px;">
            استيراد أصلي فرز أول - ضمان معتمد
          </div>
          <h1 style="font-size: 26px; font-weight: 800; line-height: 1.4; color: #0f172a; margin-top: 0; margin-bottom: 12px;">
            ${escapeHtml(product.name)}
          </h1>

          <div style="margin: 16px 0; font-size: 28px; font-weight: 800; color: #16a34a;">
            ${price.toLocaleString('ar-EG')} <span style="font-size: 18px; font-weight: normal; color: #475569;">جنيه مصري</span>
            ${product.discountPrice ? `<span style="font-size: 18px; text-decoration: line-through; color: #94a3b8; margin-right: 12px;">${product.price.toLocaleString('ar-EG')} ج.م</span>` : ''}
          </div>

          <p style="color: #334155; line-height: 1.7; font-size: 15px; margin-bottom: 24px;">
            ${escapeHtml(description)}
          </p>

          ${specsRows ? `
            <div style="margin-top: 24px;">
              <h2 style="font-size: 18px; font-weight: 700; margin-bottom: 12px; color: #0f172a;">المواصفات التقنية</h2>
              <table style="width: 100%; border-collapse: collapse; font-size: 14px; background: #f8fafc; border-radius: 8px; overflow: hidden;">
                <tbody>
                  ${specsRows}
                </tbody>
              </table>
            </div>
          ` : ''}
        </div>
      </div>
    </main>
  `;

  const html = injectSEO(templateHtml, {
    title,
    description,
    keywords,
    canonicalUrl,
    image: mainImage,
    type: 'product',
    schemaJson,
    bodyContent
  });

  // Write files
  writeHtmlFile(`product/${slug}/index.html`, html);
  writeHtmlFile(`products/${slug}/index.html`, html);

  if (product.id && product.id !== slug) {
    writeHtmlFile(`product/${product.id}/index.html`, html);
    writeHtmlFile(`products/${product.id}/index.html`, html);
  }
}

// Category definitions
const CATEGORIES = [
  {
    slug: 'laptop',
    title: 'لابتوبات استيراد أصلية بالكامل (Dell, HP, Lenovo) | كمبيو سيف',
    description: 'تسوق أفضل لابتوبات استيراد فرز أول أصلي بمكونات أصلية 100% للبرمجة والمونتاج والذكاء الاصطناعي والهندسة بضمان معتمد وأفضل سعر في مصر.',
    keywords: 'لابتوبات استيراد, لابتوب استيراد, لابتوب برمجة, لابتوب Dell استيراد, لابتوب HP استيراد, لابتوب Lenovo استيراد, اسعار لابتوبات استيراد',
    h1: 'لابتوبات استيراد فرز أول أصلية بالكامل'
  },
  {
    slug: 'desktop',
    title: 'أجهزة PC وكيسات كمبيوتر استيراد أصلية | كمبيو سيف',
    description: 'أقوى كيسات وأجهزة كمبيوتر PC استيراد فرز أول للشركات، الجيمنج، الرندر، والبرمجة مع ضمان حقيقي من كمبيو سيف.',
    keywords: 'كمبيوتر استيراد, كيسات استيراد, pc استيراد, كيسة استيراد dell, كيسة استيراد hp',
    h1: 'أجهزة كمبيوتر وكيسات PC استيراد'
  },
  {
    slug: 'monitor',
    title: 'شاشات كمبيوتر استيراد فرز أول | كمبيو سيف',
    description: 'شاشات كمبيوتر استيراد بأفضل دقة وتردد للمصممين والمبرمجين والمونتاج من Dell, HP, Lenovo بأفضل أسعار الجملة والقطاعي.',
    keywords: 'شاشات استيراد, شاشات كمبيوتر استيراد, شاشة dell استيراد, شاشة hp استيراد',
    h1: 'شاشات كمبيوتر استيراد أصلية'
  },
  {
    slug: 'all-in-one',
    title: 'أجهزة All in One استيراد بمكونات أصلية | كمبيو سيف',
    description: 'أجهزة All in One شاملة شاشة وكيسة استيراد أمريكا أصلية بالكامل تناسب المكاتب والشركات والبرامج المكتبية بأعلى كفاءة.',
    keywords: 'All in one, كمبيوتر شامل, اجهزة all in one استيراد, كمبيوتر مكتبي شاشة وكيسة',
    h1: 'أجهزة All in One استيراد شاملة'
  },
  {
    slug: 'accessories',
    title: 'إكسسوارات كمبيوتر ولابتوب استيراد | كمبيو سيف',
    description: 'أفضل إكسسوارات وقطع غيار لابتوب وكمبيوتر استيراد أصلية شواحن، بطاريات، رام، هارد SSD من كمبيو سيف.',
    keywords: 'اكسسوارات لابتوب, شاحن لابتوب ديل, شاحن لابتوب اتش بي, بطاريات لابتوب استيراد',
    h1: 'إكسسوارات وقطع غيار اللابتوب والكمبيوتر'
  }
];

// Prerender Category Page
function prerenderCategory(templateHtml, cat, categoryProducts) {
  const canonicalUrl = `${BASE_URL}/products/category/${cat.slug}`;
  const image = `${BASE_URL}/logo.png`;

  const topItems = categoryProducts.slice(0, 8).map(p => `
    <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; text-align: center;">
      <a href="/product/${generateSlug(p.name)}" style="text-decoration: none; color: inherit;">
        <img src="${p.images?.[0] || image}" alt="${escapeHtml(p.name)}" style="width: 100%; height: 160px; object-fit: contain; margin-bottom: 12px;" loading="lazy" />
        <h3 style="font-size: 15px; font-weight: 700; color: #0f172a; margin: 8px 0; line-height: 1.4;">${escapeHtml(p.name)}</h3>
        <p style="font-size: 18px; font-weight: 800; color: #16a34a; margin: 4px 0;">${(p.discountPrice || p.price).toLocaleString('ar-EG')} ج.م</p>
      </a>
    </div>
  `).join('');

  const bodyContent = `
    <main style="max-width: 1200px; margin: 0 auto; padding: 24px 16px; font-family: 'Cairo', system-ui, sans-serif; direction: rtl;">
      <nav aria-label="Breadcrumb" style="font-size: 14px; margin-bottom: 20px; color: #64748b;">
        <a href="/" style="color: #2563eb; text-decoration: none;">الرئيسية</a> &gt; 
        <a href="/products" style="color: #2563eb; text-decoration: none;">المنتجات</a> &gt; 
        <span>${escapeHtml(cat.h1)}</span>
      </nav>

      <header style="margin-bottom: 28px;">
        <h1 style="font-size: 28px; font-weight: 800; color: #0f172a; margin-bottom: 10px;">${escapeHtml(cat.h1)}</h1>
        <p style="font-size: 16px; color: #475569; line-height: 1.7; max-width: 800px;">${escapeHtml(cat.description)}</p>
      </header>

      ${topItems ? `
        <section>
          <h2 style="font-size: 20px; font-weight: 700; margin-bottom: 16px; color: #1e293b;">أبرز الأجهزة المتوفرة</h2>
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 20px;">
            ${topItems}
          </div>
        </section>
      ` : ''}
    </main>
  `;

  const schemaJson = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": cat.title,
    "description": cat.description,
    "url": canonicalUrl
  };

  const html = injectSEO(templateHtml, {
    title: cat.title,
    description: cat.description,
    keywords: cat.keywords,
    canonicalUrl,
    image,
    type: 'website',
    schemaJson,
    bodyContent
  });

  writeHtmlFile(`products/category/${cat.slug}/index.html`, html);
  // Also create aliases (e.g. All+In+One or laptops)
  if (cat.slug === 'laptop') {
    writeHtmlFile(`products/category/laptops/index.html`, html);
  } else if (cat.slug === 'desktop') {
    writeHtmlFile(`products/category/desktops/index.html`, html);
  } else if (cat.slug === 'monitor') {
    writeHtmlFile(`products/category/monitors/index.html`, html);
  } else if (cat.slug === 'all-in-one') {
    writeHtmlFile(`products/category/All+In+One/index.html`, html);
  }
}

// Static Pages
const STATIC_PAGES = [
  {
    path: 'products',
    title: 'جميع لابتوبات وأجهزة كمبيوتر استيراد | كمبيو سيف',
    description: 'تصفح تشكيلة واسعة من لابتوبات وأجهزة كمبيوتر وشاشات استيراد أصلية فرز أول بضمان معتمد وأفضل سعر في مصر من متجر كمبيو سيف.',
    keywords: 'لابتوبات استيراد, اجهزة استيراد, كمبيوتر استيراد, كمبيو سيف'
  },
  {
    path: 'about',
    title: 'عن كمبيو سيف | المتخصص الأول في اللابتوب والكمبيوتر الاستيراد الأصلي',
    description: 'تعرف على متجر كمبيو سيف (Compu Saif)، تاريخنا، رؤيتنا، وضماننا على جميع أجهزة ولابتوبات الاستيراد الأصلية في مصر.',
    keywords: 'كمبيو سيف, عن كمبيو سيف, متجر لابتوب استيراد, ضمان كمبيو سيف'
  },
  {
    path: 'locations',
    title: 'فروع وعناوين كمبيو سيف | Compu Saif Store Locations',
    description: 'عناوين وفروع وأرقام التواصل مع متجر كمبيو سيف لبيع اللابتوبات والكمبيوتر الاستيراد الأصلي بالقاهرة ومحافظات مصر.',
    keywords: 'عنوان كمبيو سيف, فروع كمبيو سيف, ارقام كمبيو سيف, موقع كمبيو سيف'
  },
  {
    path: 'delivery',
    title: 'الشحن والتوصيل وضمان المعاينة قبل الدفع | كمبيو سيف',
    description: 'تعرف على سياسة الشحن السريع في كمبيو سيف لجميع محافظات مصر مع ميزة المعاينة والتجربة الكاملة قبل الاستلام والدفع.',
    keywords: 'شحن كمبيو سيف, توصيل لابتوب استيراد, معاينة قبل الاستلام'
  },
  {
    path: 'faq',
    title: 'الأسئلة الشائعة حول لابتوبات وأجهزة الاستيراد | كمبيو سيف',
    description: 'إجابات على كافة الأسئلة الشائعة حول ضمان لابتوبات الاستيراد، الفرز الأول، طرق الدفع والتقسيط، وخدمة ما بعد البيع.',
    keywords: 'اسئلة شائعة لابتوب استيراد, ضمان الاستيراد, كيف اختار لابتوب استيراد'
  },
  {
    path: 'works',
    title: 'أعمالنا وتجهيزات الشركات والعملاء | كمبيو سيف',
    description: 'نماذج من تجهيزات أجهزة الكمبيوتر واللابتوبات الاستيراد للشركات ومكاتب البرمجة والمونتاج والعملاء من كمبيو سيف.',
    keywords: 'تجهيز شركات كمبيوتر, لابتوبات شركات استيراد, كمبيو سيف'
  },
  {
    path: 'wholesale',
    title: 'مبيعات الجملة للشركات والتجار | كمبيو سيف',
    description: 'أسعار خاصة وعروض جملة للشركات والتجار والمكاتب على أجهزة ولابتوبات الاستيراد بأسعار تنافسية وضمان تجاري.',
    keywords: 'لابتوبات استيراد جملة, كيسات استيراد جملة, تجار استيراد مصر'
  }
];

function prerenderStaticPages(templateHtml) {
  for (const page of STATIC_PAGES) {
    const canonicalUrl = `${BASE_URL}/${page.path}`;
    const html = injectSEO(templateHtml, {
      title: page.title,
      description: page.description,
      keywords: page.keywords,
      canonicalUrl,
      image: `${BASE_URL}/logo.png`,
      type: 'website'
    });
    writeHtmlFile(`${page.path}/index.html`, html);
  }
}

// Generate Sitemap XML with all products and categories
function generateSitemap(products) {
  console.log('🗺️ جاري إنشاء خريطة الموقع sitemap.xml...');

  const now = new Date().toISOString().split('T')[0];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <!-- Homepage -->
  <url>
    <loc>${BASE_URL}/</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${BASE_URL}/products</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
`;

  // Categories
  for (const cat of CATEGORIES) {
    xml += `  <url>
    <loc>${BASE_URL}/products/category/${cat.slug}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>\n`;
  }

  // Static Pages
  for (const p of STATIC_PAGES) {
    if (p.path === 'products') continue;
    xml += `  <url>
    <loc>${BASE_URL}/${p.path}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>\n`;
  }

  // Products (All Active with Google Images Sitemap)
  for (const p of products) {
    const slug = generateSlug(p.name);
    const date = (p.updatedAt ? new Date(p.updatedAt) : new Date()).toISOString().split('T')[0];
    
    let imagesXml = '';
    if (p.images && p.images.length > 0) {
      p.images.slice(0, 10).forEach((img, idx) => {
        if (img && img.startsWith('http')) {
          const imgUrl = escapeXml(img);
          const imgTitle = escapeXml(`${p.name} - ${p.brand || ''} صورة ${idx + 1}`);
          const imgCaption = escapeXml(`${p.name} استيراد أصلي فرز أول - ضمان معتمد من متجر كمبيو سيف`);
          imagesXml += `
    <image:image>
      <image:loc>${imgUrl}</image:loc>
      <image:title>${imgTitle}</image:title>
      <image:caption>${imgCaption}</image:caption>
    </image:image>`;
        }
      });
    }

    xml += `  <url>
    <loc>${BASE_URL}/product/${slug}</loc>
    <lastmod>${date}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>${imagesXml}
  </url>\n`;
  }

  xml += `</urlset>\n`;

  // Write to dist and public
  fs.writeFileSync(path.join(distDir, 'sitemap.xml'), xml, 'utf-8');
  fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), xml, 'utf-8');
  console.log(`✅ تم تحديث sitemap.xml بإجمالي ${products.length + CATEGORIES.length + STATIC_PAGES.length + 1} صفحة.`);
}

async function main() {
  console.log('🚀 بدء عملية الـ Prerendering المتقدم للموقع...');

  const indexPath = path.join(distDir, 'index.html');
  if (!fs.existsSync(indexPath)) {
    console.error('❌ لم يتم العثور على dist/index.html! يرجى تشغيل vite build أولاً.');
    process.exit(1);
  }

  const templateHtml = fs.readFileSync(indexPath, 'utf-8');

  // 1. Fetch products
  const products = await fetchAllProducts();

  // 2. Prerender products
  console.log(`🔨 جاري توليد ملفات HTML لـ ${products.length} منتج...`);
  let count = 0;
  for (const product of products) {
    prerenderProduct(templateHtml, product);
    count++;
  }
  console.log(`✅ تم توليد ${count} صفحة منتج بـ SEO كامل وميتا تاجز وسكيما.`);

  // 3. Prerender categories
  console.log('📁 جاري توليد صفحات التصنيفات...');
  for (const cat of CATEGORIES) {
    const catProducts = products.filter(p => {
      const c = (p.category || '').toLowerCase();
      if (cat.slug === 'laptop') return c.includes('lap') || c.includes('لابتوب');
      if (cat.slug === 'desktop') return c.includes('desk') || c.includes('pc') || c.includes('كمبيوتر') || c.includes('كيس');
      if (cat.slug === 'monitor') return c.includes('monit') || c.includes('شاش');
      if (cat.slug === 'all-in-one') return c.includes('all') || c.includes('ان ون');
      if (cat.slug === 'accessories') return c.includes('access') || c.includes('اكسسوار');
      return false;
    });
    prerenderCategory(templateHtml, cat, catProducts);
  }

  // 4. Prerender static pages
  console.log('📄 جاري توليد الصفحات الثابتة...');
  prerenderStaticPages(templateHtml);

  // 5. Generate sitemap
  generateSitemap(products);

  console.log('🎉 اكتملت عملية الـ Prerendering بنجاح 100%!');
}

main().catch(err => {
  console.error('❌ حدث خطأ أثناء الـ Prerendering:', err);
  process.exit(1);
});

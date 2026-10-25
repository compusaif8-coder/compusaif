import { db } from '../lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { getProductUrl } from './url';

interface SitemapUrl {
    loc: string;
    lastmod?: string;
    changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
    priority?: number;
}

export async function generateSitemap(): Promise<string> {
    const baseUrl = 'https://www.compusaif.com';
    const urls: SitemapUrl[] = [];

    // Static pages
    const staticPages = [
        { loc: '/', changefreq: 'daily' as const, priority: 1.0 },
        { loc: '/products', changefreq: 'daily' as const, priority: 0.9 },
        { loc: '/works', changefreq: 'weekly' as const, priority: 0.7 },
        { loc: '/locations', changefreq: 'monthly' as const, priority: 0.6 },
        { loc: '/about', changefreq: 'monthly' as const, priority: 0.5 },
        { loc: '/careers', changefreq: 'monthly' as const, priority: 0.5 },
        { loc: '/faq', changefreq: 'monthly' as const, priority: 0.6 },
        { loc: '/delivery', changefreq: 'monthly' as const, priority: 0.6 },
    ];

    urls.push(...staticPages);

    // Fetch all active products from Firebase
    try {
        const productsRef = collection(db, 'products');
        const q = query(productsRef, where('isArchived', '==', false));
        const querySnapshot = await getDocs(q);

        querySnapshot.forEach((doc) => {
            const product = doc.data();
            urls.push({
                loc: getProductUrl(doc.id, product.name || ''),
                lastmod: product.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
                changefreq: 'weekly',
                priority: 0.8
            });
        });
    } catch (error) {
        console.error('Error fetching products for sitemap:', error);
    }

    // Generate XML
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls.map(url => `  <url>
    <loc>${baseUrl}${url.loc}</loc>
    ${url.lastmod ? `<lastmod>${url.lastmod}</lastmod>` : ''}
    ${url.changefreq ? `<changefreq>${url.changefreq}</changefreq>` : ''}
    ${url.priority !== undefined ? `<priority>${url.priority}</priority>` : ''}
  </url>`).join('\n')}
</urlset>`;

    return sitemap;
}

// Function to download sitemap (for manual use or scheduled generation)
export async function downloadSitemap() {
    const sitemap = await generateSitemap();
    const blob = new Blob([sitemap], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sitemap.xml';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

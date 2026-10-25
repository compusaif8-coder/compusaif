import { Helmet } from 'react-helmet-async';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';

interface SEOHelmetProps {
    title?: string;
    description?: string;
    keywords?: string;
    image?: string;
    url?: string;
    type?: 'website' | 'product' | 'article';
    productData?: {
        name: string;
        brand?: string;
        price?: number;
        currency?: string;
        availability?: 'InStock' | 'OutOfStock' | 'PreOrder';
        condition?: 'NewCondition' | 'UsedCondition' | 'RefurbishedCondition';
        sku?: string;
        images?: string[];
    };
}

export const SEOHelmet = ({
    title,
    description,
    keywords,
    image,
    url,
    type = 'website',
    productData,
}: SEOHelmetProps) => {
    const { settings } = useSiteSettings();

    const baseUrl = settings.seoBaseUrl || 'https://www.compusaif.com';
    const storeName = settings.storeName || 'Compu Saif';
    const defTitle = settings.seoTitle || `كمبيوسيف | لابتوب استيراد امريكي اوريجنال و PC Dell, HP, Lenovo | ${storeName}`;
    const defDesc = settings.seoDescription || 'متجر كمبيو سيف: لابتوبات وأجهزة PC وشاشات و All in One استيراد بمكونات أصلية بالكامل (Dell, HP, Lenovo) للبرمجة، الذكاء الاصطناعي، المونتاج، والأعمال الهندسية. مع كمبيو سيف أنت دايماً في الأمان.';
    const defKw = settings.seoKeywords || 'كمبيو سيف, Compu Saif, لابتوبات استيراد, لابتوب استيراد, كمبيوتر استيراد, كيسات pc استيراد, شاشات استيراد, اجهزة all in one, لابتوبات للبرمجة, لابتوبات للذكاء الاصطناعي, لابتوبات للمونتاج, لابتوبات برامج هندسية, لابتوب Dell, لابتوب HP, لابتوب Lenovo, اجهزة اصلية بالكامل, مع كمبيو سيف انت دايما في الامان';
    const defImage = settings.seoImage || settings.logoUrl || '/logo.png';
    const faviconUrl = settings.faviconUrl || '/favicon.png';

    const fullUrl = url ? `${baseUrl}${url}` : baseUrl;
    const absImage = image
        ? (image.startsWith('http') ? image : `${baseUrl}${image}`)
        : (defImage.startsWith('http') ? defImage : `${baseUrl}${defImage}`);
    const absFavicon = faviconUrl.startsWith('http') ? faviconUrl : `${baseUrl}${faviconUrl}`;

    const pageTitle = title ? `${title} | ${storeName}` : defTitle;
    const pageDescription = description || defDesc;
    const pageKeywords = keywords || defKw;

    // Product Schema
    const productSchema = productData ? {
        "@context": "https://schema.org/",
        "@type": "Product",
        "name": productData.name,
        "image": (productData.images && productData.images.length > 0)
            ? productData.images.map(img => img.startsWith('http') ? img : `${baseUrl}${img}`)
            : absImage,
        "description": pageDescription,
        "sku": productData.sku || '',
        "brand": { "@type": "Brand", "name": productData.brand || storeName },
        "offers": {
            "@type": "Offer",
            "url": fullUrl,
            "priceCurrency": productData.currency || "EGP",
            "price": productData.price || 0,
            "availability": `https://schema.org/${productData.availability || 'InStock'}`,
            "itemCondition": `https://schema.org/${productData.condition || 'RefurbishedCondition'}`,
            "seller": {
                "@type": "ComputerStore",
                "name": storeName,
                "url": baseUrl
            }
        }
    } : null;

    // BreadcrumbList Schema
    const breadcrumbSchema = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "الرئيسية", "item": baseUrl },
            ...(url && url !== '/' ? [{
                "@type": "ListItem",
                "position": 2,
                "name": title || 'صفحة',
                "item": fullUrl
            }] : [])
        ]
    };

    // Store & Organization Schema (Rich Knowledge Graph for Google)
    const organizationSchema = {
        "@context": "https://schema.org",
        "@type": ["ComputerStore", "OnlineStore"],
        "@id": `${baseUrl}/#store`,
        "name": storeName,
        "alternateName": ["كمبيو سيف", "Compu Saif Store", "كومبيو سيف للابتوبات", "CompuSaif"],
        "url": baseUrl,
        "logo": {
            "@type": "ImageObject",
            "url": absFavicon,
            "width": 512,
            "height": 512,
            "caption": "Compu Saif Store Logo"
        },
        "image": absImage,
        "description": "متجر كمبيو سيف متخصص في بيع لابتوبات وأجهزة كمبيوتر وشاشات استيراد أصلية بالكامل Dell, HP, Lenovo تناسب البرمجة والذكاء الاصطناعي والمونتاج والبرامج الهندسية.",
        "slogan": "مع كمبيو سيف أنت دايماً في الأمان",
        "priceRange": "$$",
        "telephone": "+201146324540",
        "email": "ibrahim.moamen100@gmail.com",
        "address": {
            "@type": "PostalAddress",
            "streetAddress": "مكرم عبيد",
            "addressLocality": "مدينة نصر",
            "addressRegion": "القاهرة",
            "addressCountry": "EG"
        },
        "geo": {
            "@type": "GeoCoordinates",
            "latitude": "30.0561",
            "longitude": "31.3438"
        },
        "knowsAbout": [
            "لابتوبات استيراد أصلية",
            "أجهزة PC وكيسات استيراد",
            "شاشات استيراد",
            "أجهزة All in One",
            "لابتوبات للبرمجة",
            "لابتوبات للذكاء الاصطناعي",
            "لابتوبات للمونتاج",
            "لابتوبات برامج هندسية",
            "Dell",
            "HP",
            "Lenovo"
        ],
        "sameAs": [
            "https://www.facebook.com/compusaaiff",
            "https://instagram.com/compusaaiff",
            "https://www.tiktok.com/@compu.saif_"
        ]
    };

    // WebSite Schema
    const websiteSchema = {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "@id": `${baseUrl}/#website`,
        "name": storeName,
        "alternateName": "كمبيو سيف",
        "url": baseUrl,
        "potentialAction": {
            "@type": "SearchAction",
            "target": {
                "@type": "EntryPoint",
                "urlTemplate": `${baseUrl}/products?search={search_term_string}`
            },
            "query-input": "required name=search_term_string"
        }
    };

    return (
        <Helmet>
            {/* Primary Meta Tags */}
            <title>{pageTitle}</title>
            <meta name="title" content={pageTitle} />
            <meta name="description" content={pageDescription} />
            {pageKeywords && <meta name="keywords" content={pageKeywords} />}
            <meta name="author" content="كمبيو سيف | Compu Saif Store" />
            <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />

            {/* Google Search Favicon & App Icons */}
            <link rel="icon" type="image/png" sizes="48x48" href={faviconUrl} />
            <link rel="icon" type="image/png" sizes="96x96" href={faviconUrl} />
            <link rel="icon" type="image/png" sizes="192x192" href={faviconUrl} />
            <link rel="icon" type="image/png" sizes="512x512" href={faviconUrl} />
            <link rel="shortcut icon" type="image/png" href={faviconUrl} />
            <link rel="apple-touch-icon" sizes="180x180" href={faviconUrl} />
            <link rel="manifest" href="/site.webmanifest" />

            {/* Canonical */}
            <link rel="canonical" href={fullUrl} />

            {/* Open Graph */}
            <meta property="og:type" content={type} />
            <meta property="og:url" content={fullUrl} />
            <meta property="og:title" content={pageTitle} />
            <meta property="og:description" content={pageDescription} />
            <meta property="og:image" content={absImage} />
            <meta property="og:site_name" content={storeName} />
            <meta property="og:locale" content="ar_EG" />

            {/* Twitter */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:url" content={fullUrl} />
            <meta name="twitter:title" content={pageTitle} />
            <meta name="twitter:description" content={pageDescription} />
            <meta name="twitter:image" content={absImage} />

            {/* Structured Data Scripts */}
            {productSchema && (
                <script type="application/ld+json">{JSON.stringify(productSchema)}</script>
            )}
            <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
            <script type="application/ld+json">{JSON.stringify(organizationSchema)}</script>
            <script type="application/ld+json">{JSON.stringify(websiteSchema)}</script>
        </Helmet>
    );
};

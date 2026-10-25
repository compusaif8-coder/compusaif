import { Product, ProductSize } from "@/types/product";

/**
 * Migrates a product's sizes from the old format (full price only) to the new format (extra price).
 * 
 * Old format:
 * sizes: [{ id: "...", label: "S", price: 100 }]
 * 
 * New format:
 * sizes: [{ id: "...", label: "S", price: 100, extraPrice: 0 }]
 * 
 * Logic:
 * - If extraPrice is already present, assume it's migrated.
 * - If extraPrice is missing:
 *   - extraPrice = size.price - product.price
 *   - If size.price is missing (shouldn't happen), default to base price.
 */
export function migrateProductSizes(product: Product): Product {
    if (!product.sizes || product.sizes.length === 0) {
        return product;
    }

    const basePrice = product.price;

    const migratedSizes = product.sizes.map((size: any) => {
        // Check if already migrated
        if (typeof size.extraPrice === 'number') {
            return size as ProductSize;
        }

        // Calculate extra price
        // If size.price exists, use it. Otherwise assume 0 (which is bad, but fallback).
        const currentPrice = typeof size.price === 'number' ? size.price : basePrice;

        // extraPrice = Final Price - Base Price
        const extraPrice = currentPrice - basePrice;

        return {
            ...size,
            price: currentPrice,
            extraPrice: extraPrice,
        } as ProductSize;
    });

    return {
        ...product,
        sizes: migratedSizes,
    };
}

/**
 * Helper to check if a product needs migration
 */
export function needsMigration(product: Product): boolean {
    if (!product.sizes || product.sizes.length === 0) return false;

    // Check if any size is missing extraPrice
    return product.sizes.some((size: any) => typeof size.extraPrice !== 'number');
}

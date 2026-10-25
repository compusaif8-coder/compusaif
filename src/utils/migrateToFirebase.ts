import { productsService } from '@/lib/firebase';
import { Product } from '@/types/product';
import initialData from '../data/store.json';

export async function migrateDataToFirebase() {
  try {
    console.log('بدء ترحيل البيانات إلى Firebase...');
    
    const products = initialData.products || [];
    console.log(`عدد المنتجات المراد ترحيلها: ${products.length}`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const product of products) {
      try {
        // Remove the id since Firebase will generate a new one
        const { id, ...productData } = product;
        
        // Add the product to Firebase
        await productsService.addProduct(productData as any);
        successCount++;
        
        console.log(`تم ترحيل المنتج: ${product.name}`);
      } catch (error) {
        console.error(`خطأ في ترحيل المنتج ${product.name}:`, error);
        errorCount++;
      }
    }
    
    console.log(`تم الانتهاء من الترحيل:`);
    console.log(`- المنتجات المترحلة بنجاح: ${successCount}`);
    console.log(`- المنتجات التي فشل ترحيلها: ${errorCount}`);
    
    return { successCount, errorCount };
  } catch (error) {
    console.error('خطأ في ترحيل البيانات:', error);
    throw error;
  }
}

// Function to check if Firebase has data
export async function checkFirebaseData() {
  try {
    const products = await productsService.getAllProducts();
    console.log(`عدد المنتجات في Firebase: ${products.length}`);
    return products.length;
  } catch (error) {
    console.error('خطأ في فحص بيانات Firebase:', error);
    return 0;
  }
}

// Function to migrate only if Firebase is empty
export async function migrateIfEmpty() {
  try {
    const firebaseCount = await checkFirebaseData();
    
    if (firebaseCount === 0) {
      console.log('Firebase فارغ، سيتم ترحيل البيانات...');
      return await migrateDataToFirebase();
    } else {
      console.log(`Firebase يحتوي على ${firebaseCount} منتج، لن يتم الترحيل`);
      return { successCount: 0, errorCount: 0, skipped: true };
    }
  } catch (error) {
    console.error('خطأ في فحص وترحيل البيانات:', error);
    throw error;
  }
} 
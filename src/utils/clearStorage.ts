// Utility function to clear localStorage data
export const clearLocalStorage = () => {
  try {
    // Clear the shop-storage data
    localStorage.removeItem('shop-storage');
    
    // Also clear any other related storage keys
    const keysToRemove = [
      'shop-storage',
      'storee-cart',
      'storee-products',
      'storee-filters'
    ];
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });
    
    console.log('تم تنظيف البيانات المحفوظة في localStorage');
    return true;
  } catch (error) {
    console.error('خطأ في تنظيف localStorage:', error);
    return false;
  }
};

// Function to clear cart only
export const clearCartStorage = () => {
  try {
    const storageKey = 'shop-storage';
    const existingData = localStorage.getItem(storageKey);
    
    if (existingData) {
      const parsedData = JSON.parse(existingData);
      // Keep everything except cart
      const { cart, ...otherData } = parsedData;
      localStorage.setItem(storageKey, JSON.stringify(otherData));
    }
    
    console.log('تم تنظيف السلة من localStorage');
    return true;
  } catch (error) {
    console.error('خطأ في تنظيف السلة:', error);
    return false;
  }
};

// Function to check if there are old products in localStorage
export const checkOldProductsInStorage = () => {
  try {
    const storageKey = 'shop-storage';
    const existingData = localStorage.getItem(storageKey);
    
    if (existingData) {
      const parsedData = JSON.parse(existingData);
      // Check if there are products stored (which shouldn't be the case with new Firebase setup)
      if (parsedData.state && parsedData.state.products && parsedData.state.products.length > 0) {
        console.log('تم العثور على منتجات قديمة في localStorage:', parsedData.state.products.length);
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('خطأ في فحص البيانات المحفوظة:', error);
    return false;
  }
}; 
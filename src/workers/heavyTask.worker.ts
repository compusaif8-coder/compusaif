// Web Worker for handling heavy computations
self.onmessage = (e: MessageEvent) => {
  const { type, data } = e.data;

  switch (type) {
    case "FILTER_PRODUCTS":
      const filteredProducts = filterProducts(data.products, data.filters);
      self.postMessage({
        type: "FILTER_PRODUCTS_DONE",
        data: filteredProducts,
      });
      break;

    case "SORT_PRODUCTS":
      const sortedProducts = sortProducts(data.products, data.sortBy);
      self.postMessage({ type: "SORT_PRODUCTS_DONE", data: sortedProducts });
      break;

    case "CALCULATE_STATISTICS":
      const statistics = calculateStatistics(data.products);
      self.postMessage({ type: "CALCULATE_STATISTICS_DONE", data: statistics });
      break;

    default:
      console.warn("Unknown task type:", type);
  }
};

// Helper functions
function filterProducts(products: any[], filters: any) {
  return products.filter((product) => {
    return Object.entries(filters).every(([key, value]) => {
      if (!value) return true;
      return product[key] === value;
    });
  });
}

function sortProducts(products: any[], sortBy: string) {
  return [...products].sort((a, b) => {
    if (sortBy === "price") {
      return a.price - b.price;
    }
    if (sortBy === "name") {
      return a.name.localeCompare(b.name);
    }
    return 0;
  });
}

function calculateStatistics(products: any[]) {
  return {
    totalProducts: products.length,
    averagePrice:
      products.reduce((acc, curr) => acc + curr.price, 0) / products.length,
    categories: products.reduce((acc, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + 1;
      return acc;
    }, {}),
  };
}

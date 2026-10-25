import { useStore } from "@/store/useStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";

export const QuantityDebugger = () => {
  const { products, updateProductQuantity } = useStore();
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [testQuantity, setTestQuantity] = useState<number>(0);

  const handleTestUpdate = async () => {
    if (!selectedProduct) return;
    
    const product = products.find(p => p.id === selectedProduct);
    if (!product) return;

    console.log(`Debug: Testing quantity update for ${product.name}`);
    console.log(`Debug: Current quantity: ${product.wholesaleInfo?.quantity || 0}`);
    console.log(`Debug: New quantity: ${testQuantity}`);
    
    try {
      await updateProductQuantity(selectedProduct, testQuantity);
      console.log(`Debug: Update completed successfully`);
    } catch (error) {
      console.error(`Debug: Update failed:`, error);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Quantity Debugger</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Select Product:</label>
          <select 
            value={selectedProduct} 
            onChange={(e) => setSelectedProduct(e.target.value)}
            className="w-full p-2 border rounded"
          >
            <option value="">Choose a product...</option>
            {products.map(product => (
              <option key={product.id} value={product.id}>
                {product.name} (Qty: {product.wholesaleInfo?.quantity || 0})
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">New Quantity:</label>
          <input
            type="number"
            value={testQuantity}
            onChange={(e) => setTestQuantity(Number(e.target.value))}
            className="w-full p-2 border rounded"
            min="0"
          />
        </div>
        
        <Button onClick={handleTestUpdate} className="w-full">
          Test Quantity Update
        </Button>
        
        {selectedProduct && (
          <div className="mt-4 p-3 bg-gray-100 rounded">
            <h4 className="font-medium">Selected Product Info:</h4>
            {(() => {
              const product = products.find(p => p.id === selectedProduct);
              if (!product) return <p>Product not found</p>;
              
              return (
                <div className="text-sm">
                  <p><strong>Name:</strong> {product.name}</p>
                  <p><strong>Current Quantity:</strong> {product.wholesaleInfo?.quantity || 0}</p>
                  <p><strong>Purchased Quantity:</strong> {product.wholesaleInfo?.purchasedQuantity || 0}</p>
                  <p><strong>Product ID:</strong> {product.id}</p>
                </div>
              );
            })()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}; 
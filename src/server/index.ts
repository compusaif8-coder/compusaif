import express, {
  Request,
  Response,
  NextFunction,
  RequestHandler,
} from "express";
import uploadRouter from "./upload";
import path from "path";
import fs from "fs";
import cors from "cors";

const app = express();
const port = 3001;

// Ensure upload directory exists
const uploadDir = path.join(process.cwd(), "public", "upload");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Ensure store.json exists
const storeDir = path.join(process.cwd(), "src", "data");
const storePath = path.join(storeDir, "store.json");
if (!fs.existsSync(storeDir)) {
  fs.mkdirSync(storeDir, { recursive: true });
}
if (!fs.existsSync(storePath)) {
  fs.writeFileSync(storePath, JSON.stringify({ products: [] }, null, 2));
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Add cache control headers middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate"
  );
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});

// Serve uploaded files
app.use("/upload", express.static(uploadDir));

// Routes
app.use("/api", uploadRouter);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Helper function to read store data
const readStoreData = () => {
  try {
    const fileContent = fs.readFileSync(storePath, "utf8");
    return JSON.parse(fileContent);
  } catch (error) {
    console.error("Error reading store data:", error);
    return { products: [] };
  }
};

// Helper function to write store data
const writeStoreData = (data: any) => {
  try {
    fs.writeFileSync(storePath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error("Error writing store data:", error);
    return false;
  }
};

// Save store data endpoint
app.post("/api/save-store", ((req: Request, res: Response) => {
  try {
    const storeData = req.body;

    // Validate the data structure
    if (!storeData || !Array.isArray(storeData.products)) {
      return res.status(400).json({ error: "Invalid store data format" });
    }

    // Write to store.json file
    if (writeStoreData(storeData)) {
      console.log("Store data saved successfully to store.json");
      res.json({ success: true, message: "Store data saved successfully" });
    } else {
      res.status(500).json({ error: "Failed to save store data" });
    }
  } catch (error) {
    console.error("Error saving store data:", error);
    res.status(500).json({ error: "Failed to save store data" });
  }
}) as unknown as express.RequestHandler);

// Get store data endpoint
app.get("/api/store", ((req: Request, res: Response) => {
  try {
    const storeData = readStoreData();
    res.json(storeData);
  } catch (error) {
    console.error("Error reading store data:", error);
    res.status(500).json({ error: "Failed to read store data" });
  }
}) as unknown as express.RequestHandler);

// Add single product endpoint
app.post("/api/products", (req: Request, res: Response) => {
  try {
    const newProduct = req.body;
    const storeData = readStoreData();

    // Add new product
    storeData.products.push(newProduct);

    // Save back to file
    if (writeStoreData(storeData)) {
      console.log("Product added successfully to store.json:", newProduct.name);
      res.status(201).json({
        success: true,
        message: "Product added successfully",
        product: newProduct,
      });
    } else {
      res.status(500).json({ error: "Failed to add product" });
    }
  } catch (error) {
    console.error("Error adding product:", error);
    res.status(500).json({ error: "Failed to add product" });
  }
});

// Update product endpoint
app.put("/api/products/:id", ((req: Request, res: Response) => {
  try {
    const productId = req.params.id;
    const updatedProduct = req.body;
    const storeData = readStoreData();

    // Find and update product
    const productIndex = storeData.products.findIndex(
      (p: any) => p.id === productId
    );
    if (productIndex === -1) {
      return res.status(404).json({ error: "Product not found" });
    }

    storeData.products[productIndex] = updatedProduct;

    // Save back to file
    if (writeStoreData(storeData)) {
      console.log(
        "Product updated successfully in store.json:",
        updatedProduct.name
      );
      res.json({
        success: true,
        message: "Product updated successfully",
        product: updatedProduct,
      });
    } else {
      res.status(500).json({ error: "Failed to update product" });
    }
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({ error: "Failed to update product" });
  }
}) as unknown as express.RequestHandler);

// Delete product endpoint
app.delete("/api/products/:id", ((req: Request, res: Response) => {
  try {
    const productId = req.params.id;
    const storeData = readStoreData();

    // Find and remove product
    const productIndex = storeData.products.findIndex(
      (p: any) => p.id === productId
    );
    if (productIndex === -1) {
      return res.status(404).json({ error: "Product not found" });
    }

    const deletedProduct = storeData.products.splice(productIndex, 1)[0];

    // Save back to file
    if (writeStoreData(storeData)) {
      console.log(
        "Product deleted successfully from store.json:",
        deletedProduct.name
      );
      res.json({
        success: true,
        message: "Product deleted successfully",
        product: deletedProduct,
      });
    } else {
      res.status(500).json({ error: "Failed to delete product" });
    }
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ error: "Failed to delete product" });
  }
}) as unknown as express.RequestHandler);

// Error handling middleware
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error("Server error:", err);
    res.status(500).json({ error: err.message || "Internal server error" });
  }
);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

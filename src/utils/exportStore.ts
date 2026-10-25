
import { useStore } from "@/store/useStore";

export const exportStoreToFile = () => {
  const jsonData = useStore.getState().exportToJSON();
  
  // Create a blob from the JSON data
  const blob = new Blob([jsonData], { type: "application/json" });
  
  // Create a URL for the blob
  const url = URL.createObjectURL(blob);
  
  // Create a link element
  const link = document.createElement("a");
  link.href = url;
  link.download = "store.json";
  
  // Append the link to the document
  document.body.appendChild(link);
  
  // Click the link to trigger the download
  link.click();
  
  // Clean up
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export const useFacebookPixel = () => {
  const location = useLocation();

  useEffect(() => {
    if (typeof (window as any).fbq === "function") {
      (window as any).fbq("track", "PageView");
    }
  }, [location.pathname]);
};

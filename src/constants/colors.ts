// Common color options for clothing
export const commonColors = [
  // Basic Colors
  { name: "أسود", value: "#000000", category: "basic" },
  { name: "أبيض", value: "#FFFFFF", category: "basic" },
  { name: "رمادي", value: "#808080", category: "basic" },
  { name: "رمادي فاتح", value: "#D3D3D3", category: "basic" },
  { name: "رمادي داكن", value: "#404040", category: "basic" },
  
  // Warm Colors
  { name: "أحمر", value: "#FF0000", category: "warm" },
  { name: "أحمر داكن", value: "#8B0000", category: "warm" },
  { name: "برتقالي", value: "#FFA500", category: "warm" },
  { name: "برتقالي داكن", value: "#FF8C00", category: "warm" },
  { name: "أصفر", value: "#FFFF00", category: "warm" },
  { name: "أصفر ذهبي", value: "#FFD700", category: "warm" },
  { name: "بني", value: "#8B4513", category: "warm" },
  { name: "بني فاتح", value: "#D2691E", category: "warm" },
  { name: "بيج", value: "#F5F5DC", category: "warm" },
  { name: "كريمي", value: "#FFFDD0", category: "warm" },
  
  // Cool Colors
  { name: "أزرق", value: "#0000FF", category: "cool" },
  { name: "أزرق داكن", value: "#00008B", category: "cool" },
  { name: "أزرق فاتح", value: "#87CEEB", category: "cool" },
  { name: "أزرق بحري", value: "#000080", category: "cool" },
  { name: "أخضر", value: "#008000", category: "cool" },
  { name: "أخضر داكن", value: "#006400", category: "cool" },
  { name: "أخضر فاتح", value: "#90EE90", category: "cool" },
  { name: "أخضر زيتوني", value: "#808000", category: "cool" },
  { name: "تركواز", value: "#40E0D0", category: "cool" },
  { name: "نيلي", value: "#4B0082", category: "cool" },
  
  // Purple & Pink
  { name: "بنفسجي", value: "#800080", category: "purple" },
  { name: "بنفسجي فاتح", value: "#DDA0DD", category: "purple" },
  { name: "بنفسجي داكن", value: "#4B0082", category: "purple" },
  { name: "وردي", value: "#FFC0CB", category: "purple" },
  { name: "وردي داكن", value: "#FF1493", category: "purple" },
  { name: "وردي فاتح", value: "#FFB6C1", category: "purple" },
  
  // Fashion Colors
  { name: "ذهبي", value: "#FFD700", category: "fashion" },
  { name: "فضي", value: "#C0C0C0", category: "fashion" },
  { name: "برونزي", value: "#CD7F32", category: "fashion" },
  { name: "نحاسي", value: "#B87333", category: "fashion" },
  { name: "مرجاني", value: "#FF7F50", category: "fashion" },
  { name: "سلمون", value: "#FA8072", category: "fashion" },
  { name: "خوخي", value: "#FFCBA4", category: "fashion" },
  { name: "لافندر", value: "#E6E6FA", category: "fashion" },
  { name: "مينت", value: "#98FF98", category: "fashion" },
  { name: "سماوي", value: "#87CEEB", category: "fashion" },
];

// Color categories for better organization
export const colorCategories = {
  basic: "الألوان الأساسية",
  warm: "الألوان الدافئة", 
  cool: "الألوان الباردة",
  purple: "البنفسجي والوردي",
  fashion: "ألوان الموضة"
};

// Helper function to get color by value
export const getColorByName = (value: string) => {
  return commonColors.find(color => color.value === value) || {
    name: value,
    value: value,
    category: "unknown"
  };
};

// Helper function to get colors by category
export const getColorsByCategory = (category: string) => {
  return commonColors.filter(color => color.category === category);
};

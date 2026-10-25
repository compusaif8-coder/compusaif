export interface CategoryDoc {
  id: string;
  name: string;
  slug: string;
  count: number;
  displayOrder?: number;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  subcategories?: string[];
}

export interface BrandDoc {
  id: string;
  name: string;
  slug: string;
  count: number;
  displayOrder?: number;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

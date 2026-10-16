export interface AiSearchResult {
  id: string;
  sellerName: string;
  sellerVerified: boolean;
  productName: string;
  category: string;
  description: string;
  price: number | null;
  rating: number;
  city: string;
  image: string | null;
}

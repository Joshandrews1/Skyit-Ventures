export interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number; // Current selling price in $ (or converted standard value)
  originalPrice: number; // For discount reference
  discountPercent: number;
  rating: number;
  ratingCount: number;
  image: string;
  images?: string[];
  features: string[];
  specs: Record<string, string>;
  stock: number;
  allowCOD?: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'out_for_delivery' | 'delivered' | 'cancelled';

export interface TrackingMilestone {
  status: OrderStatus;
  label: string;
  timestamp: string;
  completed: boolean;
  desc: string;
}

export interface CustomerDetails {
  name: string;
  email: string;
  phone: string;
  city: string;
  address: string;
}

export interface Order {
  id: string;
  userId?: string;
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  customerDetails: CustomerDetails;
  status: OrderStatus;
  trackingProgress: TrackingMilestone[];
  createdAt: string;
  paymentMethod: string;
}

export interface Review {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  userEmail: string;
  rating: number; // 1 to 5
  comment: string;
  createdAt: string; // ISO string
  isVerifiedPurchase: boolean;
}

export interface ChatMessage {
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  suggestedProducts?: Product[];
  images?: string[];
}

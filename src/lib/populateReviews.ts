import { db } from '../firebase';
import { doc, setDoc, deleteDoc, getDocs, collection } from 'firebase/firestore';
import { Review, Product } from '../types';

export const populateReviews = async () => {
  // Use a local storage key to ensure this runs once per load to keep Firestore writes optimal
  const hasRun = sessionStorage.getItem('jeeme_db_initialized_v3');
  if (hasRun) return;

  try {
    console.log('Starting catalog and reviews clean-and-seed process...');

    // 1. Fetch all existing products from Firestore
    const productsRef = collection(db, 'products');
    const productsSnapshot = await getDocs(productsRef);
    
    console.log(`Skipped clearing existing products. Currently ${productsSnapshot.size} products exist.`);

    // 2. Fetch all existing reviews from Firestore
    const reviewsRef = collection(db, 'reviews');
    const reviewsSnapshot = await getDocs(reviewsRef);
    console.log(`Skipped clearing existing reviews. Currently ${reviewsSnapshot.size} reviews exist.`);

    // 3. Define the precise, clean set of 3 unique products
    const cleanProducts: Product[] = [
      {
        id: 'p1',
        name: 'Felicity 5KVA 48V Pure Sine Wave Solar Inverter',
        description: 'The Felicity 5KVA 48V Inverter is a robust and highly efficient power solution designed for demanding West African energy environments. Engineered with advanced pure sine wave technology, it ensures your sensitive electronics, appliances, and lighting systems run smoothly without interference.',
        category: 'Inverters',
        price: 500000,
        originalPrice: 550000,
        discountPercent: 9,
        image: 'https://images.unsplash.com/photo-1620038650424-8547d2a2c289?auto=format&fit=crop&w=400&q=80',
        features: ['Pure Sine Output', 'Built-in MPPT', 'Lagos Delivery'],
        specs: { 'KVA Rating': '5.0 KVA', 'Efficiency': '94%', 'Input Voltage': '48VDC' },
        stock: 42,
        rating: 5,
        ratingCount: 2
      },
      {
        id: 'p2',
        name: 'Tubular 220Ah 12V Deep Cycle Gel Battery',
        description: 'Designed specifically for deep cycle applications, this Tubular 220Ah Gel Battery offers premium longevity and stable performance under high load conditions. Perfect for uninterrupted power backup systems.',
        category: 'Batteries',
        price: 280000,
        originalPrice: 310000,
        discountPercent: 10,
        image: 'https://images.unsplash.com/photo-1548613053-220ef31815bb?auto=format&fit=crop&w=400&q=80',
        features: ['Maintenance Free', 'Deep Cycle Durability', 'Safe Gel Technology'],
        specs: { 'Capacity': '220 Ah', 'Voltage': '12V', 'Chemistry': 'Lead-Acid Gel' },
        stock: 30,
        rating: 4.5,
        ratingCount: 2
      },
      {
        id: 'p3',
        name: 'Hikvision 4-Camera HD CCTV Security Kit',
        description: 'Comprehensive home and business security kit featuring 4 high-definition weatherproof outdoor cameras, an 8-channel digital video recorder, and intelligent motion detection alerts sent straight to your phone.',
        category: 'Security Systems',
        price: 180000,
        originalPrice: 200000,
        discountPercent: 10,
        image: 'https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=400&q=80',
        features: ['1080p HD Resolution', 'IP67 Weatherproof', 'Night Vision', 'Mobile App Access'],
        specs: { 'Channels': '8', 'Cameras Included': '4', 'Resolution': '1080p' },
        stock: 15,
        rating: 5,
        ratingCount: 2
      }
    ];

    // Write products to Firestore
    for (const prod of cleanProducts) {
      await setDoc(doc(db, 'products', prod.id), prod);
    }
    console.log('Successfully populated clean, distinct products.');

    // 4. Define 2 completely unique, high-quality reviews for each product
    const cleanReviews: Review[] = [
      {
        id: 'auto-rev-1',
        productId: 'p1',
        userId: 'user-gen-101',
        userName: 'Emeka Adeleke',
        userEmail: 'emeka.a@outlook.com',
        rating: 5,
        comment: 'I purchased this Felicity inverter last month and it has completely changed our office workspace environment. The power cutovers are absolutely seamless; our computers do not even flicker when the mains drop.',
        createdAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
        isVerifiedPurchase: true
      },
      {
        id: 'auto-rev-2',
        productId: 'p1',
        userId: 'user-gen-102',
        userName: 'Fatima Yaradua',
        userEmail: 'fatima.y@yahoo.com',
        rating: 5,
        comment: 'Highly recommend this energy solution. The cooling system is incredibly silent and the dashboard display provides precise real-time details of our power generation and battery status.',
        createdAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
        isVerifiedPurchase: true
      },
      {
        id: 'auto-rev-3',
        productId: 'p2',
        userId: 'user-gen-103',
        userName: 'Oluwaseun Balogun',
        userEmail: 'seun.b@gmail.com',
        rating: 5,
        comment: 'This 220Ah Tubular Gel unit holds charge exceptionally well. We have been running our essential household fans and refrigerator all night long with very minimal depletion.',
        createdAt: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString(),
        isVerifiedPurchase: true
      },
      {
        id: 'auto-rev-4',
        productId: 'p2',
        userId: 'user-gen-104',
        userName: 'Ngozi Ezenduka',
        userEmail: 'ngozi.e@hotmail.com',
        rating: 4,
        comment: 'The build quality of these batteries is extremely solid. They took a few hours to mount properly in our rack but have performed flawlessly through multiple load cycles.',
        createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
        isVerifiedPurchase: true
      },
      {
        id: 'auto-rev-5',
        productId: 'p3',
        userId: 'user-gen-105',
        userName: 'Tunde Kosoko',
        userEmail: 'tunde.k@gmail.com',
        rating: 5,
        comment: 'The 1080p clarity on this Hikvision kit is spectacular. Night vision is surprisingly bright and clear, allowing us to keep a steady eye on our outer perimeter with complete ease.',
        createdAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
        isVerifiedPurchase: true
      },
      {
        id: 'auto-rev-6',
        productId: 'p3',
        userId: 'user-gen-106',
        userName: 'Chioma Okoye',
        userEmail: 'chioma.o@live.com',
        rating: 5,
        comment: 'Extremely pleased with the mobile application interface. I can easily monitor live video feeds from my shop while traveling, and the movement alerts are always instant.',
        createdAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
        isVerifiedPurchase: true
      }
    ];

    // Write reviews to Firestore
    for (const rev of cleanReviews) {
      await setDoc(doc(db, 'reviews', rev.id), rev);
    }
    console.log('Successfully populated unique, high-quality reviews.');

    // Save session flag so we do not write to Firestore repeatedly on every hot reload/re-render
    sessionStorage.setItem('jeeme_db_initialized_v3', 'true');

  } catch (error) {
    console.warn('Error cleaning/seeding catalog and reviews:', error);
  }
};

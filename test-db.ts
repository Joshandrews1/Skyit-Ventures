import { initializeApp } from 'firebase/app';
import { initializeFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';

async function run() {
  const config = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
  const app = initializeApp(config, 'temp-app');
  
  console.log("Querying the database...");
  const db = initializeFirestore(app, {}, config.firestoreDatabaseId);
  const productsCol = collection(db, 'products');
  try {
    const snapshot = await getDocs(productsCol);
    console.log(`Found ${snapshot.size} products in database.`);
    
    const productsList: any[] = [];
    snapshot.forEach(doc => {
      productsList.push({
        id: doc.id,
        ...doc.data()
      });
    });

    const fileContent = `import { Product } from '../types';\n\nexport const mockProducts: Product[] = ${JSON.stringify(productsList, null, 2)};\n\nexport const getProducts = () => mockProducts;\n`;
    
    fs.writeFileSync('src/data/products.ts', fileContent, 'utf8');
    console.log("Successfully wrote database products to src/data/products.ts as offline fallback.");
  } catch (err: any) {
    console.error("Error querying database:", err.message);
  }
}

run().catch(console.error);

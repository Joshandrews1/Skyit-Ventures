import { initializeApp } from 'firebase/app';
import { initializeFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';

async function run() {
  const config = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
  const app = initializeApp(config, 'temp-app');
  
  // Try querying the (default) database
  console.log("Querying the (default) database...");
  const dbDefault = initializeFirestore(app, {});
  const productsColDefault = collection(dbDefault, 'products');
  try {
    const snapshotDefault = await getDocs(productsColDefault);
    console.log(`Found ${snapshotDefault.size} products in (default) database.`);
    snapshotDefault.forEach(doc => {
      console.log(`- ID: ${doc.id}, Name: ${doc.data().name}`);
    });
  } catch (err: any) {
    console.error("Error on (default) database:", err.message);
  }
}

run().catch(console.error);

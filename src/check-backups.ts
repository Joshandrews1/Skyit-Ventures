import { initializeApp } from 'firebase/app';
import { initializeFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';

async function checkCollection(db: any, name: string) {
  try {
    const colRef = collection(db, name);
    const snap = await getDocs(colRef);
    if (snap.size > 0) {
      console.log(`[FOUND] Collection '${name}' has ${snap.size} documents.`);
      snap.docs.slice(0, 3).forEach(doc => {
        console.log(`  - ID: ${doc.id}, Name: ${doc.data().name}`);
      });
    } else {
      console.log(`Collection '${name}' is empty or does not exist.`);
    }
  } catch (err: any) {
    console.log(`Error checking '${name}':`, err.message);
  }
}

async function run() {
  const config = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
  const app = initializeApp(config, 'temp-app-2');
  const db = initializeFirestore(app, {}, config.firestoreDatabaseId);

  const candidates = [
    'products_backup',
    'products_old',
    'backup_products',
    'old_products',
    'catalog',
    'inventory',
    'products-backup',
    'products_v1',
    'products_v2',
    'original_products'
  ];

  for (const name of candidates) {
    await checkCollection(db, name);
  }
}

run().catch(console.error);

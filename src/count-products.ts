import { initializeApp } from 'firebase/app';
import { initializeFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';

async function run() {
  const config = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
  const app = initializeApp(config, 'temp-count');
  const db = initializeFirestore(app, {}, config.firestoreDatabaseId);

  const ref = collection(db, 'products');
  const snap = await getDocs(ref);
  console.log(`Current products in Firestore: ${snap.size}`);
  snap.forEach((d) => {
    console.log(`- ${d.id}: ${d.data().name}`);
  });
}

run().catch(console.error);

import { initializeApp } from 'firebase/app';
import { initializeFirestore, doc, deleteDoc } from 'firebase/firestore';
import fs from 'fs';

async function run() {
  const config = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
  const app = initializeApp(config, 'temp-delete');
  const db = initializeFirestore(app, {}, config.firestoreDatabaseId);

  const ids = ['p1', 'p2', 'p3'];
  for (const id of ids) {
    try {
      await deleteDoc(doc(db, 'products', id));
      console.log(`Deleted: ${id}`);
    } catch (e: any) {
      console.error(`Failed to delete ${id}: ${e.message}`);
    }
  }
}

run().catch(console.error);

import { initializeApp } from 'firebase/app';
import { initializeFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';

async function run() {
  const config = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
  const app = initializeApp(config, 'temp-audit-retrieve');
  const db = initializeFirestore(app, {}, config.firestoreDatabaseId);

  console.log("Attempting to retrieve audit logs...");
  try {
    const colRef = collection(db, 'audit_logs');
    const snap = await getDocs(colRef);
    console.log(`Successfully fetched audit_logs. Size: ${snap.size}`);
    snap.forEach(doc => {
      console.log(`Document [${doc.id}]:`, JSON.stringify(doc.data(), null, 2));
    });
  } catch (err: any) {
    console.error("Failed to fetch audit logs:", err.message);
  }
}

run().catch(console.error);

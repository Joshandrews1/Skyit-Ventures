import { initializeApp } from 'firebase/app';
import { initializeFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import fs from 'fs';

async function run() {
  const config = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
  const app = initializeApp(config, 'temp-update');
  const db = initializeFirestore(app, {}, config.firestoreDatabaseId);

  const colRef = collection(db, 'products');
  const snapshot = await getDocs(colRef);
  
  console.log(`Checking ${snapshot.size} products for 'Lagos' references...`);

  for (const productDoc of snapshot.docs) {
    const data = productDoc.data();
    let description = data.description || '';
    
    // Check if 'Lagos' (case-insensitive) is present
    if (description.toLowerCase().includes('lagos')) {
      console.log(`Updating product: ${data.id} - ${data.name}`);
      
      // Replace 'Lagos' or 'Lagos-based' with Nigeria-wide references
      let newDescription = description.replace(/Lagos-based/gi, 'nationwide');
      newDescription = newDescription.replace(/in Lagos/gi, 'across Nigeria');
      newDescription = newDescription.replace(/Lagos/gi, 'Nigeria');

      await updateDoc(doc(db, 'products', productDoc.id), {
        description: newDescription
      });
      console.log(`  -> Updated.`);
    }
  }
  console.log('Finished updating product descriptions.');
}

run().catch(console.error);

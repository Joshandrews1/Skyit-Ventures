import { initializeApp } from 'firebase/app';
import { initializeFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';

async function run() {
  const config = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
  const app = initializeApp(config, 'temp-audit-products');
  const db = initializeFirestore(app, {}, config.firestoreDatabaseId);

  console.log("Fetching audit logs for products...");
  try {
    const colRef = collection(db, 'audit_logs');
    const snap = await getDocs(colRef);
    console.log(`Total logs found: ${snap.size}`);
    
    const productLogs: any[] = [];
    snap.forEach(doc => {
      const data = doc.data();
      if (['CREATE_PRODUCT', 'UPDATE_PRODUCT', 'DELETE_PRODUCT'].includes(data.action) || data.targetType === 'product') {
        productLogs.push(data);
      }
    });

    // Sort by timestamp
    productLogs.sort((a, b) => {
      const tA = a.timestamp || '';
      const tB = b.timestamp || '';
      return tA.localeCompare(tB);
    });

    console.log(`Found ${productLogs.length} product-related logs.`);
    fs.writeFileSync('product_logs_extracted.json', JSON.stringify(productLogs, null, 2));
    console.log("Successfully saved product logs to product_logs_extracted.json");
    
    // Print a summary of all unique products seen in the logs
    const seenProducts = new Map<string, { name: string; price: number; logs: string[] }>();
    productLogs.forEach(log => {
      const details = log.details || '';
      const targetId = log.targetId || '';
      
      // Match "Created new product element: NAME (Price: ₦PRICE)" or "Price: $PRICE" or updated info
      let name = '';
      let price = 0;
      
      const createMatch = details.match(/Created new product element:\s*(.*?)\s*\(Price:\s*[₦$](.*?)\)/i);
      const updateMatch = details.match(/Updated details and configuration for\s*(.*?)\s*\(Price:\s*[₦$](.*?)\)/i);
      const inlineMatch = details.match(/Direct inline edit: updated details and specifications for product ID:\s*(.*?)\s*\((.*?)\)/i);
      
      if (createMatch) {
        name = createMatch[1].trim();
        price = parseFloat(createMatch[2].replace(/,/g, ''));
      } else if (updateMatch) {
        name = updateMatch[1].trim();
        price = parseFloat(updateMatch[2].replace(/,/g, ''));
      }
      
      if (targetId) {
        const existing = seenProducts.get(targetId) || { name: '', price: 0, logs: [] };
        if (name) existing.name = name;
        if (price) existing.price = price;
        existing.logs.push(`[${log.timestamp}] ${log.action}: ${details}`);
        seenProducts.set(targetId, existing);
      }
    });

    console.log(`\n=== UNIQUE PRODUCTS DETECTED IN LOGS (${seenProducts.size}) ===`);
    seenProducts.forEach((info, id) => {
      console.log(`\nID: ${id}`);
      console.log(`Name: ${info.name || '(Unknown)'}`);
      console.log(`Price: ₦${info.price ? info.price.toLocaleString() : '(Unknown)'}`);
      console.log(`History:`);
      info.logs.forEach(l => console.log(`  - ${l}`));
    });

  } catch (err: any) {
    console.error("Failed to query product logs:", err.message);
  }
}

run().catch(console.error);

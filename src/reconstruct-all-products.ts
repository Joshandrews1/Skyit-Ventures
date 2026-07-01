import fs from 'fs';

interface ProductEntry {
  id: string;
  name: string;
  price: number;
  action: string;
  timestamp: string;
  details: string;
}

try {
  const logs: any[] = JSON.parse(fs.readFileSync('product_logs_extracted.json', 'utf8'));
  console.log(`Loaded ${logs.length} logs from product_logs_extracted.json`);

  const productMap = new Map<string, { id: string; name: string; price: number; lastUpdated: string }>();

  logs.forEach(log => {
    const details = log.details || '';
    const targetId = log.targetId || '';
    if (!targetId) return;

    let name = '';
    let price = 0;

    // Match patterns
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

    const existing = productMap.get(targetId);
    if (!existing) {
      productMap.set(targetId, {
        id: targetId,
        name: name || '(Unknown Name)',
        price: price || 0,
        lastUpdated: log.timestamp
      });
    } else {
      if (name) existing.name = name;
      if (price) existing.price = price;
      if (log.timestamp > existing.lastUpdated) {
        existing.lastUpdated = log.timestamp;
      }
    }
  });

  const finalProducts = Array.from(productMap.values());
  console.log(`Found ${finalProducts.length} unique products in the audit history.`);
  fs.writeFileSync('unique_products_reconstructed.json', JSON.stringify(finalProducts, null, 2));
  console.log("Saved unique products to unique_products_reconstructed.json");

  // Let's print out the list
  finalProducts.forEach((p, idx) => {
    console.log(`${idx + 1}. [ID: ${p.id}] Name: "${p.name}", Price: ₦${p.price.toLocaleString()}`);
  });

} catch (err: any) {
  console.error("Reconstruction failed:", err.message);
}

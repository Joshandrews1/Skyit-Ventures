import fs from 'fs';
import path from 'path';

function findFiles(dir: string) {
  try {
    const list = fs.readdirSync(dir);
    list.forEach(file => {
      const p = path.join(dir, file);
      try {
        const stat = fs.statSync(p);
        if (stat.isDirectory()) {
          if (!p.includes('node_modules') && !p.includes('.git') && !p.includes('dist') && !p.includes('proc') && !p.includes('sys') && !p.includes('dev')) {
            findFiles(p);
          }
        } else {
          console.log(`[FILE] ${p} (size=${stat.size}, mtime=${stat.mtime.toISOString()})`);
        }
      } catch (e) {
        // ignore
      }
    });
  } catch (e) {
    // ignore
  }
}

console.log("=== Finding all files in workspace ===");
findFiles('.');

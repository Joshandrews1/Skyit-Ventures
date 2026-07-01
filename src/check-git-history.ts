import { execSync } from 'child_process';
import fs from 'fs';

try {
  if (fs.existsSync('.git')) {
    console.log("Git repository found in current folder (.)");
    console.log(execSync("git status", { encoding: 'utf8' }));
    console.log(execSync("git log --oneline -n 20", { encoding: 'utf8' }));
  } else {
    console.log("No git repo in current folder.");
  }
} catch (e: any) {
  console.error("Git check failed:", e.message);
}

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const localeDir = path.join(root, "app", "[locale]");

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.tsx?$/.test(entry.name)) {
      const relDir = path.relative(localeDir, path.dirname(full));
      const depth = relDir ? relDir.split(path.sep).length : 0;
      const prefix = "../".repeat(depth + 2);
      let content = fs.readFileSync(full, "utf8");
      content = content.replace(/from "(?:\.\.\/)+(?:lib|components)\//g, (match) => {
        const tail = match.match(/(?:lib|components)\//)[0];
        return `from "${prefix}${tail}`;
      });
      fs.writeFileSync(full, content);
    }
  }
}

walk(localeDir);
console.log("Import paths updated");

import fs from "fs";

const files = [
  "src/admin/AdminPortal.jsx",
  "src/admin/AdminSettings.jsx",
  "server-db.json"
];

for (const f of files) {
  if (!fs.existsSync(f)) continue;
  let content = fs.readFileSync(f, "utf8");
  let orig = content;
  
  // Replace corrupted rupee
  content = content.replaceAll("â‚¹", "₹");
  // Replace corrupted en-dash / bullet
  content = content.replaceAll("â€¢", "•");
  content = content.replaceAll("â€“", "–");
  // Replace corrupted stars
  content = content.replaceAll("â˜…", "★");
  content = content.replaceAll("â˜†", "☆");
  // Replace corrupted sun/moon/star
  content = content.replaceAll(/icon:\s*"[^"]*",\s*label:\s*"Dark"/g, 'icon: "🌙", label: "Dark"');
  content = content.replaceAll(/icon:\s*"[^"]*",\s*label:\s*"Light"/g, 'icon: "☀️", label: "Light"');
  content = content.replaceAll(/Mark as Chef's Special[^<]*/g, "Mark as Chef's Special ⭐");
  // Replace corrupted emoji
  content = content.replaceAll("ðŸ”´", "🔴");
  content = content.replaceAll("ðŸŸ¢", "🟢");
  content = content.replaceAll("ðŸ’¡", "💡");
  content = content.replaceAll("ðŸ”¥", "🔥");
  content = content.replaceAll("ðŸŒ™", "🌙");
  
  if (content !== orig) {
    fs.writeFileSync(f, content, "utf8");
    console.log(`Cleaned: ${f}`);
  } else {
    console.log(`No change: ${f}`);
  }
}

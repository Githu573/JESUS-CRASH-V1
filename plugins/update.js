const { cmd } = require("../command");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const AdmZip = require("adm-zip");
const { setCommitHash, getCommitHash } = require("../data/updateDB");

cmd({
  pattern: "update",
  alias: ["upgrade", "sync"],
  react: "🆕",
  desc: "Update the bot to the latest version.",
  category: "menu",
  filename: __filename
}, async (client, message, args, { reply, isOwner }) => {
  if (!isOwner) return reply("❌ This command is for the bot *owner only*.");

  try {
    await reply("🔍 Checking for *JESUS-CRASH-V1* updates...");

    // 1️⃣ Get latest commit hash from GitHub API
    const { data } = await axios.get("https://api.github.com/repos/DAWENS-BOY96/JESUS-CRASH-V1/commits/main", {
      headers: {
        "User-Agent": "JESUS-CRASH-V1-Updater"
      }
    });

    const latestCommitHash = data.sha;
    const currentHash = await getCommitHash();

    if (latestCommitHash === currentHash) {
      return reply("✅ Your *JESUS-CRASH-V1* bot is already up-to-date.");
    }

    await reply("📥 Update found! Downloading latest files...");

    // 2️⃣ Download the ZIP archive
    const zipUrl = "https://github.com/DAWENS-BOY96/JESUS-CRASH-V1/archive/refs/heads/main.zip";
    const zipPath = path.join(__dirname, "latest.zip");
    const { data: zipData } = await axios.get(zipUrl, { responseType: "arraybuffer" });

    fs.writeFileSync(zipPath, zipData);
    await reply("📦 Extracting update...");

    // 3️⃣ Extract files
    const extractPath = path.join(__dirname, "latest");
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(extractPath, true);

    const sourcePath = path.join(extractPath, "JESUS-CRASH-V1-main");
    const destinationPath = path.join(__dirname, "..");

    // 4️⃣ Copy updated files (preserve config files)
    await reply("🔄 Applying update...");
    copyFolderSync(sourcePath, destinationPath);

    // 5️⃣ Save commit hash
    await setCommitHash(latestCommitHash);

    // 🧹 Clean up
    fs.unlinkSync(zipPath);
    fs.rmSync(extractPath, { recursive: true, force: true });

    await reply("✅ Update completed successfully!\n♻ Restarting bot...");
    process.exit(0);

  } catch (err) {
    console.error("❌ Update Error:", err);
    reply("❌ Update failed. Please try again later or manually.");
  }
});

// 🔁 Copy files from source to destination except sensitive files
function copyFolderSync(source, target) {
  if (!fs.existsSync(target)) fs.mkdirSync(target, { recursive: true });

  const items = fs.readdirSync(source);
  for (const item of items) {
    const srcPath = path.join(source, item);
    const destPath = path.join(target, item);

    // Skip config files you want to preserve
    const skipFiles = ["config.js", "app.json", "package.json"];
    if (skipFiles.includes(item)) {
      console.log(`⚠️ Skipping ${item} to preserve local configuration.`);
      continue;
    }

    if (fs.lstatSync(srcPath).isDirectory()) {
      copyFolderSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

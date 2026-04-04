const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'db.json');
const uploadDir = path.join(__dirname, '..', 'public', 'uploads');

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

if (!fs.existsSync(dbPath)) {
    console.log('db.json not found. Nothing to migrate.');
    process.exit(0);
}

const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
let migratedCount = 0;

if (db.tasks && Array.isArray(db.tasks)) {
    db.tasks = db.tasks.map((task, index) => {
        if (task.image && task.image.startsWith('data:image/')) {
            try {
                const parts = task.image.split(',');
                const mimeMatch = parts[0].match(/data:image\/(.*?);base64/);
                const extension = (mimeMatch && mimeMatch[1]) || 'jpg';
                const base64Data = parts[1];

                const fileName = `migrated_${Date.now()}_${index}.${extension}`;
                const filePath = path.join(uploadDir, fileName);
                const imageUrl = `/uploads/${fileName}`;

                fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));

                migratedCount++;
                return { ...task, image: imageUrl };
            } catch (err) {
                console.error(`Failed to migrate task ${task.id}:`, err);
                return task;
            }
        }
        return task;
    });
}

fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
console.log(`Migration complete! ${migratedCount} images moved to public/uploads/ and db.json minimized.`);

import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const STYLE = 'color';
const SIZE = '100';
const DOWNLOAD_DIR = path.join(__dirname, 'menu_icons');

// CORRECTED Mapping for Picasso Café (Fixed 404s)
const menuIcons = {
    // Breakfast
    "queen_bees_muesli": "honey",
    "hot_oats": "porridge",
    "toast_raspberry_jam": "jam-toast",           // Fixed
    "cinnamon_french_toast": "french-toast",      
    "eggs_benedict": "eggs-benedict",
    "scrambled_eggs": "scrambled-eggs",
    "omelette": "omelette",
    "pancakes": "pancake",                        // Fixed slug

    // Starters & Salads
    "chicken_salad": "salad",
    "salad_nicoise": "fish-food",
    "garlic_prawns": "prawn",
    "calamari_rings": "fried-calamari",           
    "chicken_wings": "chicken-wings",
    "spare_ribs": "ribs",                         // Fixed slug
    "garlic_bread": "garlic-bread",

    // Burgers & Sandwiches
    "picasso_burger": "hamburger",
    "chicken_burger": "chicken-burger",           // Fixed slug
    "veggie_burger": "veggie-burger",
    "club_sandwich": "sandwich",
    "steak_sandwich": "steak-medium",

    // Pizza
    "pizza_margherita": "pizza",
    "pizza_seafood": "prawn",
    "calzone": "pizza",                           // Calzone is often a variant of 'pizza' slug

    // Mains
    "t_bone_steak": "steak",
    "sirloin_steak": "steak-medium",
    "red_snapper": "fish-food",
    "king_prawns": "prawn",                       // 'shrimp' was failing, 'prawn' exists
    "lobster_thermidor": "lobster",
    "chicken_kiev": "fried-chicken",              // Fixed slug
    "pork_chops": "pork-chop",

    // Sides
    "chips": "french-fries",
    "rice": "rice-bowl",
    "mashed_potatoes": "mashed-potatoes",
    "mixed_vegetables": "vegetables"              // Fixed slug
};

async function downloadImage(itemName, iconSlug) {
    const url = `https://img.icons8.com/${STYLE}/${SIZE}/${iconSlug}.png`;
    const filePath = path.join(DOWNLOAD_DIR, `${itemName}.png`);

    // SKIP if file already exists
    if (fs.existsSync(filePath)) {
        console.log(`⏭️  Skipping: ${itemName}.png (Already exists)`);
        return;
    }

    try {
        const response = await axios({
            url,
            method: 'GET',
            responseType: 'stream'
        });

        return new Promise((resolve, reject) => {
            const writer = fs.createWriteStream(filePath);
            response.data.pipe(writer);
            writer.on('finish', () => {
                console.log(`✅ Downloaded: ${itemName}.png`);
                resolve();
            });
            writer.on('error', reject);
        });
    } catch (error) {
        // Log the specific error to help with further troubleshooting
        console.error(`❌ Failed to download ${itemName} (Slug: ${iconSlug}): ${error.response ? error.response.status : error.message}`);
    }
}

async function run() {
    if (!fs.existsSync(DOWNLOAD_DIR)) {
        fs.mkdirSync(DOWNLOAD_DIR);
    }

    console.log("Starting menu icon downloads...");
    
    for (const [name, slug] of Object.entries(menuIcons)) {
        await downloadImage(name, slug);
    }

    console.log("\nDone! Check the 'menu_icons' folder.");
}

run();
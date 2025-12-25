const API_KEY = process.argv[2];

if (!API_KEY) {
    console.error("Please provide API Key");
    process.exit(1);
}

const getHeaders = {
    'Accept': 'application/vnd.api+json',
    'Content-Type': 'application/vnd.api+json',
    'Authorization': `Bearer ${API_KEY}`
};

async function getData() {
    try {
        console.log("Checking API Key...");

        // 1. Get Me
        const userRes = await fetch('https://api.lemonsqueezy.com/v1/users/me', { headers: getHeaders });
        if (!userRes.ok) throw new Error(`User auth failed: ${userRes.statusText}`);
        const userData = await userRes.json();
        console.log(`User: ${userData.data.attributes.name} (${userData.data.attributes.email})`);

        // 2. Get All Products (No Filter)
        console.log("\nFetching ALL Products (no filters)...");
        const productsRes = await fetch('https://api.lemonsqueezy.com/v1/products', { headers: getHeaders });
        const products = await productsRes.json();

        if (products.data.length === 0) {
            console.log("❌ No products found at all.");
            return;
        }

        for (const product of products.data) {
            console.log(`\n📦 Product: ${product.attributes.name} (ID: ${product.id})`);
            console.log(`   Store ID: ${product.attributes.store_id}`);
            console.log(`   Status: ${product.attributes.status}`);
            console.log(`   Test Mode: ${product.attributes.test_mode}`);

            // Get Variants
            const variantsRes = await fetch(`https://api.lemonsqueezy.com/v1/variants?filter[product_id]=${product.id}`, { headers: getHeaders });
            const variants = await variantsRes.json();

            for (const variant of variants.data) {
                console.log(`   🔹 Variant: ${variant.attributes.name} (ID: ${variant.id})`);
            }
        }

    } catch (error) {
        console.error("Error:", error.message);
    }
}

getData();

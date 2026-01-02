const axios = require('axios');

async function testProxy() {
    const proxyUrl = 'http://localhost:3001/api/p/cors-proxy';

    console.log('--- Testing /cors-proxy ---');

    // Test 1: GET Request (Notion Homepage)
    try {
        console.log('\n1. Testing GET (expect 200/3xx)...');
        const res = await axios.get(`${proxyUrl}?url=https://www.notion.so/`, {
            validateStatus: () => true
        });
        console.log(`Status: ${res.status}`);
        console.log(`Content-Type: ${res.headers['content-type']}`);
        if (res.status >= 200 && res.status < 400) console.log('PASS');
        else console.log('FAIL (Unexpected status)');
    } catch (err) {
        console.error('FAIL (Network/Server Error):', err.message);
    }

    // Test 2: POST Request (Simulated API Call)
    // We use a known public endpoint or just a dummy one to see if body is passed
    // and we get the UPSTREAM status code, NOT 500.
    try {
        console.log('\n2. Testing POST (expect upstream status, NOT 500)...');
        // Using a non-existent endpoint on Notion to force a 404. 
        // If our proxy is fixed, we should see 404. If broken, we see 500.
        const res = await axios.post(`${proxyUrl}?url=https://www.notion.so/api/v3/dummyEndpoint`, {
            test: 'data'
        }, {
            validateStatus: () => true
        });

        console.log(`Status: ${res.status}`);
        console.log(`Data (snippet):`, JSON.stringify(res.data).slice(0, 100));

        if (res.status === 404 || res.status === 400 || res.status === 401) {
            console.log('PASS (Correctly forwarded upstream error)');
        } else if (res.status === 500) {
            console.log('FAIL (500 Internal Server Error - Proxy Crashed?)');
        } else {
            console.log('Check Manual (Unexpected status)');
        }
    } catch (err) {
        console.error('FAIL (Network/Server Error):', err.message);
    }
}

testProxy();

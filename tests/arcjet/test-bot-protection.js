const { config } = require('dotenv');
const { resolve } = require('path');

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

/**
 * Test cases for bot protection
 */
const BOT_TEST_CASES = [
    // Legitimate search engine crawlers (should be ALLOWED)
    {
        name: 'Googlebot',
        userAgent: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        expectedResult: 'ALLOWED',
        description: 'Google search engine crawler'
    },
    {
        name: 'Bingbot',
        userAgent: 'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
        expectedResult: 'ALLOWED',
        description: 'Bing search engine crawler'
    },
    {
        name: 'Facebook External Hit',
        userAgent: 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
        expectedResult: 'ALLOWED',
        description: 'Facebook link preview crawler'
    },

    // Regular browsers (should be ALLOWED)
    {
        name: 'Chrome Browser',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        expectedResult: 'ALLOWED',
        description: 'Regular Chrome browser'
    },

    // Automated tools and bots (should be BLOCKED)
    {
        name: 'cURL',
        userAgent: 'curl/8.7.1',
        expectedResult: 'BLOCKED',
        description: 'Command line HTTP client'
    },
    {
        name: 'Python Requests',
        userAgent: 'python-requests/2.25.1',
        expectedResult: 'BLOCKED',
        description: 'Python HTTP library'
    },
    {
        name: 'Generic Bot',
        userAgent: 'MyBot/1.0',
        expectedResult: 'BLOCKED',
        description: 'Custom bot'
    },
    {
        name: 'Scrapy Spider',
        userAgent: 'Scrapy/2.5.0',
        expectedResult: 'BLOCKED',
        description: 'Web scraping framework'
    }
];

/**
 * Test bot protection with a specific user agent
 */
async function testBotProtection(testCase, baseUrl = 'http://localhost:3000') {
    const startTime = Date.now();

    try {
        const headers = {
            'Content-Type': 'application/json'
        };

        // Only add User-Agent if it's not empty
        if (testCase.userAgent) {
            headers['User-Agent'] = testCase.userAgent;
        }

        const response = await fetch(`${baseUrl}/api/chat`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                message: 'Test message for bot protection',
                conversationId: 'bot-test'
            }),
            redirect: 'manual' // Don't follow redirects
        });

        const responseTime = Date.now() - startTime;
        const actualResult = response.status === 403 ? 'BLOCKED' : 'ALLOWED';
        const passed = actualResult === testCase.expectedResult;

        return {
            testCase,
            actualResult,
            status: response.status,
            responseTime,
            passed
        };

    } catch (error) {
        const responseTime = Date.now() - startTime;
        return {
            testCase,
            actualResult: 'ERROR',
            status: 0,
            responseTime,
            passed: false,
            error: error.message
        };
    }
}

/**
 * Run all bot protection tests
 */
async function runBotProtectionTests(baseUrl = 'http://localhost:3000') {
    console.log('🤖 BOT PROTECTION TESTING SUITE');
    console.log('═'.repeat(80));
    console.log(`Testing against: ${baseUrl}`);
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log(`Total test cases: ${BOT_TEST_CASES.length}`);
    console.log('═'.repeat(80));

    const results = [];

    for (const testCase of BOT_TEST_CASES) {
        console.log(`\n🧪 Testing: ${testCase.name}`);
        console.log(`   User Agent: ${testCase.userAgent || '(empty)'}`);
        console.log(`   Expected: ${testCase.expectedResult}`);
        console.log(`   Description: ${testCase.description}`);

        const result = await testBotProtection(testCase, baseUrl);
        results.push(result);

        const statusIcon = result.passed ? '✅' : '❌';
        const resultText = result.actualResult === 'ERROR'
            ? `ERROR: ${result.error}`
            : `${result.actualResult} (${result.status})`;

        console.log(`   Result: ${statusIcon} ${resultText} - ${result.responseTime}ms`);

        if (!result.passed && result.actualResult !== 'ERROR') {
            console.log(`   ⚠️  Expected ${testCase.expectedResult}, got ${result.actualResult}`);
        }

        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Summary
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    const errors = results.filter(r => r.actualResult === 'ERROR').length;
    const averageResponseTime = Math.round(
        results.reduce((sum, r) => sum + r.responseTime, 0) / results.length
    );

    console.log('\n📊 TEST SUMMARY');
    console.log('═'.repeat(40));
    console.log(`Total Tests: ${results.length}`);
    console.log(`Passed: ${passed} ✅`);
    console.log(`Failed: ${failed} ❌`);
    console.log(`Errors: ${errors} 🚨`);
    console.log(`Success Rate: ${Math.round((passed / results.length) * 100)}%`);
    console.log(`Average Response Time: ${averageResponseTime}ms`);

    // Detailed analysis
    console.log('\n🔍 DETAILED ANALYSIS');
    console.log('─'.repeat(40));

    const blockedBots = results.filter(r =>
        r.testCase.expectedResult === 'BLOCKED' && r.actualResult === 'BLOCKED'
    ).length;

    const allowedCrawlers = results.filter(r =>
        r.testCase.expectedResult === 'ALLOWED' && r.actualResult === 'ALLOWED'
    ).length;

    const botsCount = BOT_TEST_CASES.filter(t => t.expectedResult === 'BLOCKED').length;
    const crawlersCount = BOT_TEST_CASES.filter(t => t.expectedResult === 'ALLOWED').length;

    console.log(`Bots correctly blocked: ${blockedBots}/${botsCount}`);
    console.log(`Crawlers correctly allowed: ${allowedCrawlers}/${crawlersCount}`);

    // Show failures
    const failures = results.filter(r => !r.passed);
    if (failures.length > 0) {
        console.log('\n❌ FAILED TESTS:');
        failures.forEach(f => {
            console.log(`   • ${f.testCase.name}: Expected ${f.testCase.expectedResult}, got ${f.actualResult}`);
        });
    }

    if (passed === results.length) {
        console.log('\n🎉 All bot protection tests passed!');
    } else {
        console.log(`\n⚠️  ${failed} test(s) failed. Review the results above.`);
    }

    return {
        total: results.length,
        passed,
        failed,
        errors,
        successRate: Math.round((passed / results.length) * 100),
        results
    };
}

// Run tests if this file is executed directly
if (require.main === module) {
    runBotProtectionTests().catch(console.error);
}

module.exports = { runBotProtectionTests, testBotProtection, BOT_TEST_CASES }; 
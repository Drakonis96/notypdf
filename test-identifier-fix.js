// Test script to verify the identifier generation logic works correctly
// This simulates the generateNextIdentifier method behavior

function generateNextIdentifier(pattern, existingIdentifiers) {
    // Handle patterns like "LV001_RF001" where we need to match "LV001_" and increment "RF001"
    if (pattern.includes('_')) {
        const parts = pattern.split('_');
        if (parts.length === 2) {
            const basePattern = parts[0]; // e.g., "LV001"
            const incrementPart = parts[1]; // e.g., "RF001"
            
            // Extract the incrementing pattern (prefix + number)
            const incrementMatch = incrementPart.match(/^(.+?)(\d+)$/);
            if (incrementMatch) {
                const [, incrementPrefix, incrementNumberStr] = incrementMatch;
                
                // Find all existing identifiers that match the base pattern
                const matchingIdentifiers = existingIdentifiers.filter(id => {
                    return id.startsWith(basePattern + '_' + incrementPrefix);
                });
                
                console.log(`Base pattern: ${basePattern}`);
                console.log(`Increment prefix: ${incrementPrefix}`);
                console.log(`Increment number string: ${incrementNumberStr}`);
                console.log(`Matching identifiers: ${JSON.stringify(matchingIdentifiers)}`);
                
                // Extract numbers from matching identifiers and find the maximum
                let maxNumber = 0; // Start from 0
                matchingIdentifiers.forEach(id => {
                    const idParts = id.split('_');
                    if (idParts.length === 2 && idParts[0] === basePattern) {
                        const regex = new RegExp(`^${incrementPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\d+)$`);
                        const numberMatch = idParts[1].match(regex);
                        if (numberMatch) {
                            const num = parseInt(numberMatch[1], 10);
                            console.log(`Found number: ${num}`);
                            if (num > maxNumber) {
                                maxNumber = num;
                            }
                        }
                    }
                });
                
                console.log(`Max number found: ${maxNumber}`);
                
                // Generate next identifier
                const nextNumber = maxNumber + 1;
                const paddedNumber = nextNumber.toString().padStart(incrementNumberStr.length, '0');
                const result = `${basePattern}_${incrementPrefix}${paddedNumber}`;
                console.log(`Generated identifier: ${result}`);
                return result;
            }
        }
    }
    
    // Fallback logic for patterns without underscore
    const match = pattern.match(/^(.+?)(\d+)(.*)$/);
    if (!match) {
        return pattern;
    }

    const [, prefix, numberStr, suffix] = match;
    
    // Find the highest existing number for this pattern
    let maxNumber = 0;
    const patternRegex = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\d+)${suffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);
    
    existingIdentifiers.forEach(id => {
        const match = id.match(patternRegex);
        if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxNumber) {
                maxNumber = num;
            }
        }
    });

    // Generate next identifier
    const nextNumber = maxNumber + 1;
    const paddedNumber = nextNumber.toString().padStart(numberStr.length, '0');
    return `${prefix}${paddedNumber}${suffix}`;
}

// Test cases
console.log('=== Testing Identifier Generation ===\n');

// Test 1: Empty database (first entry)
console.log('Test 1: Empty database');
console.log('Pattern: LV001_RF001');
console.log('Existing: []');
const result1 = generateNextIdentifier('LV001_RF001', []);
console.log(`Expected: LV001_RF001, Got: ${result1}`);
console.log(`✓ ${result1 === 'LV001_RF001' ? 'PASS' : 'FAIL'}\n`);

// Test 2: Existing entries with same base pattern
console.log('Test 2: Existing entries with same base pattern');
console.log('Pattern: LV001_RF001');
console.log('Existing: ["LV001_RF001", "LV001_RF002", "LV001_RF003"]');
const result2 = generateNextIdentifier('LV001_RF001', ['LV001_RF001', 'LV001_RF002', 'LV001_RF003']);
console.log(`Expected: LV001_RF004, Got: ${result2}`);
console.log(`✓ ${result2 === 'LV001_RF004' ? 'PASS' : 'FAIL'}\n`);

// Test 3: Different base patterns (should not interfere)
console.log('Test 3: Different base patterns');
console.log('Pattern: LV002_RF001');
console.log('Existing: ["LV001_RF001", "LV001_RF002", "LV003_RF001"]');
const result3 = generateNextIdentifier('LV002_RF001', ['LV001_RF001', 'LV001_RF002', 'LV003_RF001']);
console.log(`Expected: LV002_RF001, Got: ${result3}`);
console.log(`✓ ${result3 === 'LV002_RF001' ? 'PASS' : 'FAIL'}\n`);

// Test 4: Mixed existing identifiers
console.log('Test 4: Mixed existing identifiers');
console.log('Pattern: LV001_RF001');
console.log('Existing: ["LV001_RF002", "LV002_RF001", "LV001_RF001", "LV001_RF005"]');
const result4 = generateNextIdentifier('LV001_RF001', ['LV001_RF002', 'LV002_RF001', 'LV001_RF001', 'LV001_RF005']);
console.log(`Expected: LV001_RF006, Got: ${result4}`);
console.log(`✓ ${result4 === 'LV001_RF006' ? 'PASS' : 'FAIL'}\n`);

// Test 5: Simple pattern without underscore
console.log('Test 5: Simple pattern without underscore');
console.log('Pattern: DOC001');
console.log('Existing: ["DOC001", "DOC002"]');
const result5 = generateNextIdentifier('DOC001', ['DOC001', 'DOC002']);
console.log(`Expected: DOC003, Got: ${result5}`);
console.log(`✓ ${result5 === 'DOC003' ? 'PASS' : 'FAIL'}\n`);

console.log('=== Test Summary ===');
const allPassed = [
    result1 === 'LV001_RF001',
    result2 === 'LV001_RF004', 
    result3 === 'LV002_RF001',
    result4 === 'LV001_RF006',
    result5 === 'DOC003'
].every(Boolean);

console.log(`All tests passed: ${allPassed ? '✅ YES' : '❌ NO'}`);

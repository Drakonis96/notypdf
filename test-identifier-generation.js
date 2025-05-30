// Test file to verify identifier generation logic
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
        
        // Extract numbers from matching identifiers
        let maxNumber = parseInt(incrementNumberStr, 10) - 1;
        matchingIdentifiers.forEach(id => {
          const idParts = id.split('_');
          if (idParts.length === 2 && idParts[0] === basePattern) {
            const numberMatch = idParts[1].match(new RegExp(`^${incrementPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\d+)$`));
            if (numberMatch) {
              const num = parseInt(numberMatch[1], 10);
              if (num > maxNumber) {
                maxNumber = num;
              }
            }
          }
        });
        
        // Generate next identifier
        const nextNumber = maxNumber + 1;
        const paddedNumber = nextNumber.toString().padStart(incrementNumberStr.length, '0');
        return `${basePattern}_${incrementPrefix}${paddedNumber}`;
      }
    }
  }
  
  // Fallback to original logic for patterns without underscore
  const match = pattern.match(/^(.+?)(\d+)(.*)$/);
  if (!match) {
    return pattern;
  }

  const [, prefix, numberStr, suffix] = match;
  const baseNumber = parseInt(numberStr, 10);
  
  // Find the highest existing number for this pattern
  let maxNumber = baseNumber - 1;
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

// Test case 1: Basic pattern with underscore (empty database)
console.log('Test 1: Empty database with pattern LV001_RF001');
const result1 = generateNextIdentifier('LV001_RF001', []);
console.log('Expected: LV001_RF001');
console.log('Result:  ', result1);
console.log('Pass:', result1 === 'LV001_RF001' ? '✅' : '❌');
console.log();

// Test case 2: Pattern with existing identifiers
console.log('Test 2: Database with existing LV001_RF001, LV001_RF002, LV001_RF003');
const existing1 = ['LV001_RF001', 'LV001_RF002', 'LV001_RF003'];
const result2 = generateNextIdentifier('LV001_RF001', existing1);
console.log('Expected: LV001_RF004');
console.log('Result:  ', result2);
console.log('Pass:', result2 === 'LV001_RF004' ? '✅' : '❌');
console.log();

// Test case 3: Pattern with mixed identifiers (should only match base pattern)
console.log('Test 3: Database with mixed identifiers');
const existing2 = ['LV001_RF001', 'LV001_RF002', 'LV002_RF001', 'LV001_XY001'];
const result3 = generateNextIdentifier('LV001_RF001', existing2);
console.log('Expected: LV001_RF003');
console.log('Result:  ', result3);
console.log('Pass:', result3 === 'LV001_RF003' ? '✅' : '❌');
console.log();

// Test case 4: Different base pattern
console.log('Test 4: Different base pattern LV002_RF001');
const existing3 = ['LV001_RF001', 'LV001_RF002', 'LV002_RF001', 'LV002_RF005'];
const result4 = generateNextIdentifier('LV002_RF001', existing3);
console.log('Expected: LV002_RF006');
console.log('Result:  ', result4);
console.log('Pass:', result4 === 'LV002_RF006' ? '✅' : '❌');
console.log();

// Test case 5: Legacy pattern without underscore
console.log('Test 5: Legacy pattern without underscore');
const existing4 = ['DOC001', 'DOC002', 'DOC003'];
const result5 = generateNextIdentifier('DOC001', existing4);
console.log('Expected: DOC004');
console.log('Result:  ', result5);
console.log('Pass:', result5 === 'DOC004' ? '✅' : '❌');
console.log();

// Test case 6: Pattern with leading zeros preservation
console.log('Test 6: Leading zeros preservation');
const existing5 = ['LV001_RF001', 'LV001_RF009', 'LV001_RF010'];
const result6 = generateNextIdentifier('LV001_RF001', existing5);
console.log('Expected: LV001_RF011');
console.log('Result:  ', result6);
console.log('Pass:', result6 === 'LV001_RF011' ? '✅' : '❌');
console.log();

console.log('=== All tests completed ===');

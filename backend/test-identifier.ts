import { 
  calculateCheckCharacter, 
  verifyCheckCharacter, 
  parseDisplayIdentifier, 
  validateDisplayIdentifier 
} from './src/services/identifierService.js';
import assert from 'assert';

async function runTests() {
  console.log('--- Starting ULPIN-Compatible Identifier Tests ---\n');

  // Test 1: Check Digit ISO 7064 MOD 37,36 Generation & Verification
  try {
    // Generate valid check digit
    // CS707P-TA-S21-U03-PRV-4 -> base: CS707PTAS21U03PRV
    const baseStr = 'CS707PTAS21U03PRV';
    const checkChar = calculateCheckCharacter(baseStr);
    assert.ok(typeof checkChar === 'string' && checkChar.length === 1);
    
    // Valid check
    assert.strictEqual(verifyCheckCharacter('CS707P-TA-S21-U03-PRV-' + checkChar), true);
    
    // Invalid check (altered char)
    assert.strictEqual(verifyCheckCharacter('CS707P-TA-S21-U03-PRV-X'), false);
    
    // Transposition check (should fail)
    assert.strictEqual(verifyCheckCharacter('CS707P-TA-S12-U03-PRV-' + checkChar), false);
    
    console.log('✅ Check Digit (ISO 7064 MOD 37,36) logic passed.');
  } catch (e: any) {
    console.error('❌ Check Digit test failed:', e.message);
  }

  // Test 2: Parsing Examples from spec
  const tests = [
    {
      id: 'CS434-S40-U02-PRV-4',
      expect: { base: 'CS434', storey: { type: 'S', number: 40 }, unit: 'U02', spaceType: 'PRV' }
    },
    {
      id: 'CS707P-TA-S21-U03-PRV-9',
      expect: { base: 'CS707P', wing: 'TA', storey: { type: 'S', number: 21 }, unit: 'U03', spaceType: 'PRV' }
    },
    {
      id: 'CS707P-WPD-B02-K147-PRK-2',
      expect: { base: 'CS707P', wing: 'WPD', storey: { type: 'B', number: 2 }, parking: 'K147', spaceType: 'PRK' }
    },
    {
      id: 'CS464-WT3-S45-U02-PRV-7',
      expect: { base: 'CS464', wing: 'WT3', storey: { type: 'S', number: 45 }, unit: 'U02', spaceType: 'PRV' }
    },
    {
      id: 'CS707P-UTL-SEW-16284303-5',
      expect: { base: 'CS707P', registrationLevel: 'UTL', utilityType: 'SEW', utilityReference: '16284303' }
    },
    {
      id: 'CS707P-AIR-V01-3',
      expect: { base: 'CS707P', registrationLevel: 'AIR', airRightReference: 'V01' }
    }
  ];

  for (const t of tests) {
    try {
      const parsed = parseDisplayIdentifier(t.id);
      assert.strictEqual(parsed.base, t.expect.base);
      if (t.expect.storey) {
        assert.strictEqual(parsed.storey?.type, t.expect.storey.type);
        assert.strictEqual(parsed.storey?.number, t.expect.storey.number);
      }
      if (t.expect.wing) assert.strictEqual(parsed.wing, t.expect.wing);
      if (t.expect.unit) assert.strictEqual(parsed.unit, t.expect.unit);
      if (t.expect.spaceType) assert.strictEqual(parsed.spaceType, t.expect.spaceType);
      if (t.expect.registrationLevel) assert.strictEqual(parsed.registrationLevel, t.expect.registrationLevel);
      if (t.expect.utilityType) assert.strictEqual(parsed.utilityType, t.expect.utilityType);
      
      console.log(`✅ Parsing test passed for: ${t.id}`);
    } catch (e: any) {
      console.error(`❌ Parsing test failed for: ${t.id} - ${e.message}`);
    }
  }

  // Test 3: Validation rules (Rejections)
  const invalidTests = [
    'CS707P', // missing check digit and components
    '-S21-U03-PRV-4', // empty base
    'CS707P-TA-S21-U03-PRV' // missing check
  ];

  for (const inv of invalidTests) {
    const val = validateDisplayIdentifier(inv);
    if (!val.valid) {
      console.log(`✅ Correctly rejected invalid identifier: ${inv}`);
    } else {
      console.error(`❌ Failed to reject invalid identifier: ${inv}`);
    }
  }

  console.log('\n--- ULPIN-Compatible Identifier Tests Completed ---');
}

runTests();

const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/**
 * Calculates the ISO 7064 MOD 37,36 check character.
 * @param input The string (without the check character) to calculate for.
 * @returns A single check character.
 */
export function calculateCheckCharacter(input: string): string {
  if (!input || input.length === 0) {
    throw new Error('Input cannot be empty');
  }

  const cleanInput = input.toUpperCase().replace(/-/g, '');
  let p = 36;
  
  for (let i = 0; i < cleanInput.length; i++) {
    const char = cleanInput.charAt(i);
    const val = ALPHABET.indexOf(char);
    
    if (val === -1) {
      throw new Error(`Invalid character in identifier: ${char}`);
    }
    
    let s = (p + val) % 37;
    if (s === 0) {
      s = 37;
    }
    p = (s * 2) % 37;
  }
  
  const checkValue = (38 - p) % 37;
  // Based on standard ISO 7064 Mod 37,36 logic.
  // The check character value is chosen so that ((p + checkValue) % 37) == 1
  return ALPHABET.charAt(checkValue % 36);
}

/**
 * Verifies if an identifier (including check character) is valid.
 * @param identifier The full identifier string including the check character.
 */
export function verifyCheckCharacter(identifier: string): boolean {
  if (!identifier || identifier.length < 2) return false;
  
  const parts = identifier.split('-');
  const checkChar = parts[parts.length - 1];
  const baseWithoutCheck = parts.slice(0, -1).join('-');
  
  try {
    const expectedCheck = calculateCheckCharacter(baseWithoutCheck);
    return expectedCheck === checkChar.toUpperCase();
  } catch (e) {
    return false;
  }
}

export interface ParsedIdentifier {
  base: string;
  wing?: string;
  storey?: {
    type: string;
    number?: number;
  };
  unit?: string;
  parking?: string;
  spaceType?: string;
  check: string;
  registrationLevel?: string;
  utilityType?: string;
  utilityReference?: string;
  airRightReference?: string;
}

/**
 * Parses a delimited ULPIN-compatible identifier.
 */
export function parseDisplayIdentifier(identifier: string): ParsedIdentifier {
  if (!identifier || typeof identifier !== 'string') {
    throw new Error('Invalid identifier format');
  }

  const tokens = identifier.toUpperCase().split('-');
  
  if (tokens.length < 2) {
    throw new Error('Identifier must contain at least base and check digit');
  }

  const base = tokens[0];
  const check = tokens[tokens.length - 1];
  
  if (!base) {
    throw new Error('Base cannot be empty');
  }

  const parsed: ParsedIdentifier = { base, check };
  
  // Middle tokens
  const middleTokens = tokens.slice(1, -1);
  
  for (const token of middleTokens) {
    // Check Registration Level (UTL / AIR)
    if (token === 'UTL' || token === 'AIR') {
      parsed.registrationLevel = token;
      continue;
    }
    
    if (parsed.registrationLevel === 'UTL') {
      if (!parsed.utilityType) {
        parsed.utilityType = token;
      } else if (!parsed.utilityReference) {
        parsed.utilityReference = token;
      }
      continue;
    }
    
    if (parsed.registrationLevel === 'AIR') {
      if (!parsed.airRightReference) {
        parsed.airRightReference = token;
      }
      continue;
    }

    // Space Type
    if (token.length === 3 && ['PRV', 'COM', 'XCM', 'RTL', 'PRK', 'SVC', 'RFG'].includes(token)) {
      parsed.spaceType = token;
      continue;
    }

    // Wing / Tower / Block
    if ((token.startsWith('W') || token.startsWith('T') || token.startsWith('BLK')) && token.length > 1 && !token.startsWith('TA-') /* just a guard, TA is fine */ ) {
      // Actually, if it starts with T (Tower) or W (Wing)
      parsed.wing = token;
      continue;
    }
    
    // Storey (S, B, P, M, R, G)
    const storeyPrefixes = ['S', 'B', 'P', 'M', 'R', 'G'];
    const prefix = token.charAt(0);
    
    // Specifically identifying storeys vs types (like SVC)
    if (storeyPrefixes.includes(prefix) && !['PRV', 'COM', 'XCM', 'RTL', 'PRK', 'SVC', 'RFG'].includes(token)) {
      parsed.storey = {
        type: prefix,
        number: token.length > 1 && !isNaN(parseInt(token.substring(1), 10)) ? parseInt(token.substring(1), 10) : undefined
      };
      continue;
    }

    // Unit
    if (token.startsWith('U') && !['UTL'].includes(token)) {
      parsed.unit = token;
      continue;
    }

    // Parking
    if (token.startsWith('K')) {
      parsed.parking = token;
      continue;
    }
  }

  return parsed;
}

export function validateDisplayIdentifier(identifier: string): { valid: boolean; reason?: string } {
  try {
    if (!verifyCheckCharacter(identifier)) {
      return { valid: false, reason: 'Invalid check character' };
    }
    
    parseDisplayIdentifier(identifier);
    return { valid: true };
  } catch (error: any) {
    return { valid: false, reason: error.message };
  }
}

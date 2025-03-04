export class FieldMatcher {
    constructor(mappings) {
      this.fieldMappings = mappings;
      this.fuzzyMatchThreshold = 0.8;
    }
  
    // Calculates similarity between two strings
    calculateSimilarity(str1, str2) {
      const s1 = str1.toLowerCase();
      const s2 = str2.toLowerCase();
      
      // Levenshtein distance implementation
      const matrix = Array(s2.length + 1).fill().map(() => Array(s1.length + 1).fill(0));
      
      for (let i = 0; i <= s1.length; i++) matrix[0][i] = i;
      for (let j = 0; j <= s2.length; j++) matrix[j][0] = j;
      
      for (let j = 1; j <= s2.length; j++) {
        for (let i = 1; i <= s1.length; i++) {
          const substitutionCost = s1[i - 1] === s2[j - 1] ? 0 : 1;
          matrix[j][i] = Math.min(
            matrix[j][i - 1] + 1,
            matrix[j - 1][i] + 1,
            matrix[j - 1][i - 1] + substitutionCost
          );
        }
      }
      
      const maxLength = Math.max(s1.length, s2.length);
      return 1 - matrix[s2.length][s1.length] / maxLength;
    }
  
    // Find best matching field using both exact and fuzzy matching
    findMatchingField(fieldName, formElements) {
      const possibleFieldNames = this.fieldMappings[fieldName];
      if (!possibleFieldNames) {
        console.warn(`No mapping found for field: ${fieldName}`);
        return null;
      }
  
      let bestMatch = {
        element: null,
        score: 0,
        matchType: null
      };
  
      for (const element of formElements) {
        const attributes = this.getElementAttributes(element);
        
        // Try exact matching first
        const exactMatch = this.findExactMatch(attributes, possibleFieldNames);
        if (exactMatch) {
          return { element, matchType: 'exact' };
        }
  
        // If no exact match, try fuzzy matching
        const fuzzyMatchScore = this.findBestFuzzyMatch(attributes, possibleFieldNames);
        if (fuzzyMatchScore > bestMatch.score && fuzzyMatchScore >= this.fuzzyMatchThreshold) {
          bestMatch = {
            element,
            score: fuzzyMatchScore,
            matchType: 'fuzzy'
          };
        }
      }
  
      return bestMatch.element ? bestMatch : null;
    }
  
    getElementAttributes(element) {
      return {
        id: element.id?.toLowerCase() || '',
        name: element.name?.toLowerCase() || '',
        className: element.className?.toLowerCase() || '',
        placeholder: element.placeholder?.toLowerCase() || '',
        label: this.findAssociatedLabel(element)?.toLowerCase() || '',
        ariaLabel: element.getAttribute('aria-label')?.toLowerCase() || '',
        dataTestId: element.getAttribute('data-testid')?.toLowerCase() || ''
      };
    }
  
    findAssociatedLabel(element) {
      let label = '';
      if (element.id) {
        const labelElement = document.querySelector(`label[for="${element.id}"]`);
        if (labelElement) {
          label = labelElement.textContent.trim();
        }
      }
      return label;
    }
  
    findExactMatch(attributes, possibleNames) {
      return possibleNames.some(name => 
        Object.values(attributes).some(attr => 
          attr === name || attr.includes(name)
        )
      );
    }
  
    findBestFuzzyMatch(attributes, possibleNames) {
      let bestScore = 0;
      
      for (const name of possibleNames) {
        for (const attr of Object.values(attributes)) {
          if (attr) {
            const score = this.calculateSimilarity(name, attr);
            bestScore = Math.max(bestScore, score);
          }
        }
      }
      
      return bestScore;
    }
}
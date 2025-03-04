export class FormFiller {
    constructor(fieldMatcher) {
      this.fieldMatcher = fieldMatcher;
      this.valueFormatters = {
        birthDate: this.formatDate,
        expiryDate: this.formatDate,
        issueDate: this.formatDate,
        isAgeOver18: this.formatBoolean,
        isAgeOver21: this.formatBoolean
      };
    }
  
    async fillForm(data) {
      const results = {
        successful: [],
        failed: []
      };
  
      for (const [fieldName, value] of Object.entries(data)) {
        try {
          const success = await this.fillField(fieldName, value);
          if (success) {
            results.successful.push(fieldName);
          } else {
            results.failed.push({ field: fieldName, reason: 'No matching field found' });
          }
        } catch (error) {
          results.failed.push({ field: fieldName, reason: error.message });
          console.error(`Error filling field ${fieldName}:`, error);
        }
      }
  
      return results;
    }
  
    async fillField(fieldName, value) {
      const formElements = Array.from(document.querySelectorAll(
        'input, select, textarea, [contenteditable="true"]'
      ));
  
      const match = this.fieldMatcher.findMatchingField(fieldName, formElements);
      if (!match) return false;
  
      const { element, matchType } = match;
      const formattedValue = this.formatValue(fieldName, value);
  
      await this.setElementValue(element, formattedValue);
      this.triggerChangeEvent(element);
  
      console.log(`Filled field ${fieldName} (${matchType} match) with value: ${formattedValue}`);
      return true;
    }
  
    formatValue(fieldName, value) {
      const formatter = this.valueFormatters[fieldName];
      return formatter ? formatter(value) : String(value);
    }
  
    formatDate(dateStr) {
      try {
        const date = new Date(dateStr);
        return date.toISOString().split('T')[0]; // YYYY-MM-DD
      } catch {
        return dateStr;
      }
    }
  
    formatBoolean(value) {
      return String(value).toLowerCase() === 'true' ? true : false;
    }
  
    async setElementValue(element, value) {
      switch (element.type) {
        case 'radio':
          await this.handleRadioButton(element, value);
          break;
        case 'checkbox':
          element.checked = Boolean(value);
          break;
        case 'select-one':
          await this.handleSelect(element, value);
          break;
        case 'file':
          console.warn('File inputs cannot be automatically filled');
          break;
        default:
          if (element.hasAttribute('contenteditable')) {
            element.textContent = value;
          } else {
            element.value = value;
          }
      }
    }
  
    async handleRadioButton(element, value) {
      const radioGroup = document.querySelectorAll(`input[name="${element.name}"]`);
      for (const radio of radioGroup) {
        if (radio.value.toLowerCase() === String(value).toLowerCase()) {
          radio.checked = true;
          break;
        }
      }
    }
  
    async handleSelect(element, value) {
      const options = Array.from(element.options);
      const matchingOption = options.find(option => 
        option.value.toLowerCase() === String(value).toLowerCase() ||
        option.text.toLowerCase() === String(value).toLowerCase()
      );
      
      if (matchingOption) {
        element.value = matchingOption.value;
      }
    }
  
    triggerChangeEvent(element) {
      const event = new Event('change', { bubbles: true });
      element.dispatchEvent(event);
      element.dispatchEvent(new Event('input', { bubbles: true }));
    }
}
import { FieldMatcher } from './utils/fieldMatcher.js';
import { FormFiller } from './utils/formFiller.js';
import { fieldMappings } from './config/fieldMappings.js';

class FormFillingController {
  constructor() {
    this.fieldMatcher = new FieldMatcher(fieldMappings);
    this.formFiller = new FormFiller(this.fieldMatcher);
    this.setupMessageListener();
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log('Received message:', message);

      if (message.action === 'updateDOM') {
        this.handleFormFilling(message.data)
          .then(results => {
            console.log('Form filling results:', results);
            sendResponse({ status: 'success', results });
          })
          .catch(error => {
            console.error('Form filling error:', error);
            sendResponse({ status: 'error', error: error.message });
          });

        return true; // Keep message channel open for async response
      }
    });
  }

  async handleFormFilling(data) {
    try {
      const results = await this.formFiller.fillForm(data);
      
      // Log results
      results.successful.forEach(field => {
        console.log(`Successfully filled field: ${field}`);
      });
      
      results.failed.forEach(({ field, reason }) => {
        console.warn(`Failed to fill field: ${field}, Reason: ${reason}`);
      });

      return results;
    } catch (error) {
      console.error('Error during form filling:', error);
      throw error;
    }
  }
}

// Initialize the controller
new FormFillingController();
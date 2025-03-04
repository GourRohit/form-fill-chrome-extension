class SSEController {
    constructor() {
      this.eventSource = null;
      this.reconnectAttempts = 0;
      this.maxReconnectAttempts = 5;
      this.reconnectDelay = 1000;
      this.setupEventSource();
      this.setupKeepAlive();
    }
  
    setupKeepAlive() {
      chrome.alarms.create('keepAlive', { periodInMinutes: 0.4167 });
      chrome.alarms.onAlarm.addListener(this.handleAlarm.bind(this));
    }
  
    handleAlarm(alarm) {
      if (alarm.name === 'keepAlive') {
        this.checkConnection();
      }
    }
  
    checkConnection() {
      if (!this.eventSource || this.eventSource.readyState === EventSource.CLOSED) {
        console.log('SSE connection lost, attempting to reconnect...');
        this.setupEventSource();
      }
    }
  
    setupEventSource() {
      if (this.eventSource) {
        this.eventSource.close();
      }
  
      try {
        this.eventSource = new EventSource('https://localhost:4215/verifier-sdk/sse/read/chrome_ext');
        this.setupEventListeners();
      } catch (error) {
        console.error('Error creating EventSource:', error);
        this.handleReconnection();
      }
    }
  
    setupEventListeners() {
      this.eventSource.onopen = this.handleOpen.bind(this);
      this.eventSource.onerror = this.handleError.bind(this);
      this.eventSource.onmessage = this.handleMessage.bind(this);
      
      this.eventSource.addEventListener('SCANNED_DATA', this.handleScannedData.bind(this));
      this.eventSource.addEventListener('ERROR_DATA', this.handleErrorData.bind(this));
    }
  
    handleOpen(event) {
      console.log('SSE Connection opened');
      this.reconnectAttempts = 0;
    }
  
    handleError(error) {
      console.error('SSE Error:', error);
      if (this.eventSource.readyState === EventSource.CLOSED) {
        this.handleReconnection();
      }
    }
  
    handleMessage(event) {
      console.log('Received message:', event.data);
      try {
        const data = JSON.parse(event.data);
        this.processData(data);
      } catch (error) {
        console.error('Error processing message:', error);
      }
    }
  
    async handleScannedData(event) {
      try {
        const data = JSON.parse(event.data);
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (tabs.length === 0) {
          throw new Error('No active tab found');
        }
  
        const activeTab = tabs[0];
        await this.injectContentScript(activeTab.id);
        await this.sendMessageToContent(activeTab.id, data);
        
      } catch (error) {
        console.error('Error handling scanned data:', error);
      }
    }
  
    handleErrorData(event) {
      console.error('Received error data:', event.data);
    }
  
    async injectContentScript(tabId) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId },
          files: ['scripts/content.js']
        });
        console.log('Content script injected successfully');
      } catch (error) {
        console.error('Error injecting content script:', error);
        throw error;
      }
    }
  
    async sendMessageToContent(tabId, data) {
      try {
        const response = await chrome.tabs.sendMessage(tabId, {
          action: 'updateDOM',
          data
        });
        console.log('Content script response:', response);
      } catch (error) {
        console.error('Error sending message to content script:', error);
        throw error;
      }
    }
  
    handleReconnection() {
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
        
        console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`);
        
        setTimeout(() => this.setupEventSource(), delay);
      } else {
        console.error('Max reconnection attempts reached');
      }
    }
}

// Initialize the controller
new SSEController();
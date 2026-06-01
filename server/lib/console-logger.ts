import { WebSocket } from 'ws';

interface ConsoleMessage {
  type: 'request' | 'response' | 'error' | 'info';
  message: string;
  details?: any;
  timestamp?: Date;
}

class ConsoleLogger {
  private clients: Set<WebSocket> = new Set();
  private messageHistory: ConsoleMessage[] = [];
  private maxHistorySize = 100;

  // Add a WebSocket client
  addClient(ws: WebSocket) {
    this.clients.add(ws);
    console.log(`[ConsoleLogger] Client added, total clients: ${this.clients.size}`);
    
    // Send recent history to new client
    this.messageHistory.forEach(msg => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(msg));
      }
    });

    // Send a welcome message
    if (ws.readyState === WebSocket.OPEN) {
      const welcomeMessage = {
        type: 'info',
        message: 'Console connected - monitoring API activity...',
        timestamp: new Date()
      };
      ws.send(JSON.stringify(welcomeMessage));
    }

    ws.on('close', () => {
      this.clients.delete(ws);
      console.log(`[ConsoleLogger] Client disconnected, total clients: ${this.clients.size}`);
    });

    ws.on('error', () => {
      this.clients.delete(ws);
      console.log(`[ConsoleLogger] Client error, total clients: ${this.clients.size}`);
    });
  }

  // Log a message to all connected clients
  private log(message: ConsoleMessage) {
    const logEntry = {
      ...message,
      timestamp: new Date()
    };

    // Add to history
    this.messageHistory.push(logEntry);
    if (this.messageHistory.length > this.maxHistorySize) {
      this.messageHistory = this.messageHistory.slice(-this.maxHistorySize);
    }

    // Debug logging
    console.log(`[ConsoleLogger] Logging message: ${logEntry.message} to ${this.clients.size} clients`);

    // Broadcast to all clients
    const messageStr = JSON.stringify(logEntry);
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(messageStr);
          console.log(`[ConsoleLogger] Sent message to client: ${logEntry.message}`);
        } catch (error) {
          console.error('Failed to send console message:', error);
          this.clients.delete(client);
        }
      } else {
        console.log(`[ConsoleLogger] Client connection not open, state: ${client.readyState}`);
      }
    });
  }

  // Log different types of messages in plain English
  logRequest(method: string, url: string, params?: any) {
    let message = `Making ${method.toUpperCase()} request to ${url}`;
    
    if (url.includes('/zillow/')) {
      message = `Searching Zillow for properties`;
      if (params?.location) {
        message += ` in ${params.location}`;
      }
    } else if (url.includes('/properties/')) {
      message = `Fetching property details`;
    } else if (url.includes('/zip-scraping/')) {
      message = `Managing scraping job`;
    }

    this.log({
      type: 'request',
      message,
      details: params ? `Parameters: ${JSON.stringify(params, null, 2)}` : undefined
    });
  }

  logResponse(status: number, data?: any, context?: string) {
    let message = `Received response (${status})`;
    
    if (status >= 200 && status < 300) {
      if (context?.includes('zillow')) {
        const count = data?.props?.length || data?.length || 0;
        message = `Found ${count} properties from Zillow`;
      } else if (context?.includes('scraping')) {
        message = `Scraping operation completed successfully`;
      } else {
        message = `Request completed successfully`;
      }
    } else if (status === 429) {
      message = `Rate limit reached - too many requests, will retry`;
    } else if (status >= 400) {
      message = `Request failed (${status}) - ${data?.message || 'Unknown error'}`;
    }

    this.log({
      type: status >= 400 ? 'error' : 'response',
      message,
      details: data ? (typeof data === 'string' ? data : JSON.stringify(data, null, 2)) : undefined
    });
  }

  logError(error: string | Error, context?: string) {
    const message = typeof error === 'string' ? error : error.message;
    let friendlyMessage = `Error: ${message}`;

    if (message.includes('429') || message.includes('Too Many Requests')) {
      friendlyMessage = `Hit API rate limit - will retry with delay`;
    } else if (message.includes('timeout')) {
      friendlyMessage = `Request timed out - server may be busy`;
    } else if (message.includes('network')) {
      friendlyMessage = `Network connection issue`;
    } else if (context) {
      friendlyMessage = `Error in ${context}: ${message}`;
    }

    this.log({
      type: 'error',
      message: friendlyMessage,
      details: typeof error === 'object' ? error.stack : undefined
    });
  }

  logInfo(message: string, details?: any) {
    this.log({
      type: 'info',
      message,
      details
    });
  }

  // Log scraping job progress
  logScrapingProgress(jobId: number, zipCode: string, progress: number, status: string, addresses?: string[]) {
    const progressPercent = Math.round(progress * 100);
    let message = `Job ${jobId}: Processing ${zipCode} (${progressPercent}% complete)`;
    
    if (status === 'completed') {
      message = `Job ${jobId}: Finished processing ${zipCode} successfully`;
      if (addresses && addresses.length > 0) {
        const addressList = addresses.slice(0, 3).join(', ');
        const remaining = addresses.length > 3 ? ` and ${addresses.length - 3} more` : '';
        message += ` - Found properties: ${addressList}${remaining}`;
      }
    } else if (status === 'failed') {
      message = `Job ${jobId}: Failed to process ${zipCode}`;
    }

    this.log({
      type: status === 'failed' ? 'error' : 'info',
      message,
      details: addresses && addresses.length > 0 ? `Addresses found: ${addresses.join(', ')}` : `ZIP Code: ${zipCode}, Progress: ${progressPercent}%, Status: ${status}`
    });
  }

  // Log batch processing updates
  logBatchUpdate(jobId: number, processed: number, total: number, successful: number, failed: number) {
    const message = `Job ${jobId}: Processed ${processed}/${total} ZIP codes (${successful} successful, ${failed} failed)`;
    
    this.log({
      type: 'info',
      message,
      details: `Progress: ${Math.round((processed / total) * 100)}%`
    });
  }
}

// Singleton instance
export const consoleLogger = new ConsoleLogger();
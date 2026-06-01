import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Terminal, Trash2, Play, Pause } from 'lucide-react';

interface ConsoleEntry {
  id: string;
  timestamp: Date;
  type: 'request' | 'response' | 'error' | 'info';
  message: string;
  details?: any;
}

interface ApiConsoleProps {
  className?: string;
}

export function ApiConsole({ className }: ApiConsoleProps) {
  const [entries, setEntries] = useState<ConsoleEntry[]>([]);
  const [isRunning, setIsRunning] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Auto-scroll to bottom when new entries are added
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries]);

  // Connect to WebSocket for real-time console updates
  useEffect(() => {
    if (!isRunning) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/console`;
    
    console.log('Attempting to connect to WebSocket:', wsUrl);
    
    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected successfully');
        addEntry('info', 'Console connected - monitoring API activity...');
      };

      ws.onmessage = (event) => {
        console.log('Received WebSocket message:', event.data);
        try {
          const data = JSON.parse(event.data);
          addEntry(data.type, data.message, data.details);
        } catch (error) {
          console.error('Failed to parse console message:', error);
          addEntry('error', 'Failed to parse console message');
        }
      };

      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        if (isRunning) {
          addEntry('error', 'Console connection lost - attempting to reconnect...');
          // Attempt to reconnect after 3 seconds
          setTimeout(() => {
            if (isRunning) {
              setIsRunning(false);
              setTimeout(() => setIsRunning(true), 100);
            }
          }, 3000);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        addEntry('error', 'Console connection error - check browser console for details');
      };

    } catch (error) {
      addEntry('error', 'Failed to connect to console WebSocket');
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [isRunning]);

  const addEntry = (type: ConsoleEntry['type'], message: string, details?: any) => {
    const entry: ConsoleEntry = {
      id: Date.now().toString() + Math.random(),
      timestamp: new Date(),
      type,
      message,
      details
    };
    
    setEntries(prev => [...prev.slice(-199), entry]); // Keep last 200 entries
  };

  const clearConsole = () => {
    setEntries([]);
    addEntry('info', 'Console cleared');
  };

  const toggleConsole = () => {
    setIsRunning(!isRunning);
    if (!isRunning) {
      addEntry('info', 'Console monitoring resumed');
    } else {
      addEntry('info', 'Console monitoring paused');
    }
  };

  const getEntryColor = (type: ConsoleEntry['type']) => {
    switch (type) {
      case 'request': return 'text-blue-700';
      case 'response': return 'text-green-700';
      case 'error': return 'text-red-700';
      case 'info': return 'text-slate-600';
      default: return 'text-slate-700';
    }
  };

  const getEntryBadgeColor = (type: ConsoleEntry['type']) => {
    switch (type) {
      case 'request': return 'bg-blue-100 text-blue-800';
      case 'response': return 'bg-green-100 text-green-800';
      case 'error': return 'bg-red-100 text-red-800';
      case 'info': return 'bg-slate-100 text-slate-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  return (
    <Card className={`border-2 border-slate-300 ${className}`}>
      <CardHeader className="bg-slate-50 border-b-2 border-slate-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="h-5 w-5 text-slate-600" />
            <CardTitle className="text-slate-800">API Console</CardTitle>
            <Badge variant={isRunning ? "default" : "secondary"} className="text-xs">
              {isRunning ? 'Live' : 'Paused'}
            </Badge>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={toggleConsole}
              className="text-xs"
            >
              {isRunning ? <Pause className="h-3 w-3 mr-1" /> : <Play className="h-3 w-3 mr-1" />}
              {isRunning ? 'Pause' : 'Resume'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={clearConsole}
              className="text-xs"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Clear
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-80" ref={scrollRef}>
          <div className="p-4 space-y-2 font-mono text-sm">
            {entries.length === 0 ? (
              <div className="text-slate-500 italic text-center py-8">
                Console is ready - API activity will appear here...
              </div>
            ) : (
              entries.map((entry) => (
                <div key={entry.id} className="flex items-start gap-3">
                  <span className="text-slate-400 text-xs mt-0.5 min-w-[60px]">
                    {formatTimestamp(entry.timestamp)}
                  </span>
                  <Badge 
                    className={`text-xs min-w-[70px] justify-center ${getEntryBadgeColor(entry.type)}`}
                  >
                    {entry.type.toUpperCase()}
                  </Badge>
                  <div className={`flex-1 ${getEntryColor(entry.type)}`}>
                    <div>{entry.message}</div>
                    {entry.details && (
                      <div className="text-xs text-slate-500 mt-1 pl-4 border-l-2 border-slate-200">
                        {typeof entry.details === 'string' 
                          ? entry.details 
                          : JSON.stringify(entry.details, null, 2)
                        }
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
import React, { useState, useEffect, useRef } from 'react';
import { Send, Activity, Zap, Database, Code, FileText, Globe, Settings, Cpu, BarChart3 } from 'lucide-react';

const VaultMK9Pro = () => {
  const [command, setCommand] = useState('');
  const [messages, setMessages] = useState([
    { type: 'system', content: 'VAULT MK9 PRO initialized. Multi-agent command center ready.', timestamp: '12:34:01' },
    { type: 'assistant', content: 'Welcome to VAULT MK9 PRO. All systems operational. How can I assist you today?', timestamp: '12:34:11' }
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [endpoint, setEndpoint] = useState('http://localhost:5678/webhook/vault-mk9-command');
  const [connectionStatus, setConnectionStatus] = useState('CONNECTED');
  const messagesEndRef = useRef(null);

  // Agent data with execution counts and status (matching MK9 backend)
  const [agents, setAgents] = useState([
    { id: 'chitchat', name: 'Chat Agent', icon: Activity, status: 'active', executions: 1247, description: 'Casual conversation & greetings' },
    { id: 'ai', name: 'AI Assistant', icon: Code, status: 'active', executions: 892, description: 'Advanced AI processing' },
    { id: 'browser', name: 'Browser Agent', icon: Globe, status: 'idle', executions: 543, description: 'Web automation & scraping' },
    { id: 'system', name: 'System Agent', icon: Cpu, status: 'active', executions: 331, description: 'System operations' },
    { id: 'file', name: 'File Agent', icon: FileText, status: 'idle', executions: 156, description: 'File management' },
    { id: 'database', name: 'Database Agent', icon: Database, status: 'warning', executions: 89, description: 'Data management' }
  ]);

  // Monitoring data
  const [monitoringData, setMonitoringData] = useState({
    successRate: 94.7,
    avgResponseTime: 2.1,
    totalRequests: 1247,
    activeAgents: 6,
    uptime: 99.4,
    memoryUsed: 67.8
  });

  // Response time chart data
  const [responseTimeData, setResponseTimeData] = useState([
    { time: '12:30', value: 1.8 },
    { time: '12:31', value: 2.2 },
    { time: '12:32', value: 1.9 },
    { time: '12:33', value: 2.4 },
    { time: '12:34', value: 2.1 },
    { time: '12:35', value: 1.7 },
    { time: '12:36', value: 2.3 }
  ]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Simulated response time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setResponseTimeData(prev => {
        const newData = [...prev.slice(1)];
        const newTime = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
        const newValue = 1.5 + Math.random() * 1.5;
        newData.push({ time: newTime, value: parseFloat(newValue.toFixed(1)) });
        return newData;
      });
      
      setMonitoringData(prev => ({
        ...prev,
        avgResponseTime: parseFloat((1.5 + Math.random() * 1.5).toFixed(1))
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e) => {
    if (!command.trim() || isProcessing) return;

    const userMessage = {
      type: 'user',
      content: command,
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: false })
    };

    setMessages(prev => [...prev, userMessage]);
    const currentCommand = command;
    setCommand('');
    setIsProcessing(true);

    try {
      // Real API call to MK9 backend
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          command: currentCommand,
          userId: 'vault-mk9-pro',
          sessionId: Date.now().toString()
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.text();
      let result;
      
      try {
        result = JSON.parse(data);
        if (Array.isArray(result)) result = result[0];
      } catch (parseError) {
        throw new Error(`Invalid JSON response: ${data.substring(0, 100)}...`);
      }

      // Handle successful response
      const assistantMessage = {
        type: 'assistant',
        content: result.response?.message || result.message || 'Command executed successfully.',
        timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
        agent: result.agent || result.agentType,
        status: result.status
      };

      setMessages(prev => [...prev, assistantMessage]);
      setConnectionStatus('CONNECTED');

      // Update agent execution count based on which agent was used
      const usedAgent = result.agent || result.agentType;
      if (usedAgent) {
        setAgents(prev => prev.map(agent => 
          agent.id === usedAgent ? { ...agent, executions: agent.executions + 1, status: 'active' } : agent
        ));
      }

      // Update monitoring data
      setMonitoringData(prev => ({
        ...prev,
        totalRequests: prev.totalRequests + 1,
        successRate: Math.min(prev.successRate + 0.1, 100)
      }));

    } catch (error) {
      console.error('VAULT MK9 PRO Error:', error);
      
      const errorMessage = {
        type: 'system',
        content: `Error: ${error.message}`,
        timestamp: new Date().toLocaleTimeString('en-US', { hour12: false })
      };

      setMessages(prev => [...prev, errorMessage]);
      setConnectionStatus('ERROR');
      
      // Update monitoring data for error
      setMonitoringData(prev => ({
        ...prev,
        totalRequests: prev.totalRequests + 1,
        successRate: Math.max(prev.successRate - 0.5, 0)
      }));
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'text-green-400 shadow-green-400/50';
      case 'warning': return 'text-amber-400 shadow-amber-400/50';
      case 'error': return 'text-red-400 shadow-red-400/50';
      default: return 'text-gray-400 shadow-gray-400/50';
    }
  };

  const getStatusDot = (status) => {
    switch (status) {
      case 'active': return 'bg-green-400 shadow-green-400/50 animate-pulse';
      case 'warning': return 'bg-amber-400 shadow-amber-400/50 animate-pulse';
      case 'error': return 'bg-red-400 shadow-red-400/50 animate-pulse';
      default: return 'bg-gray-400 shadow-gray-400/50';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden relative">
      {/* Animated Background */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-400 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
        <div className="absolute top-3/4 right-1/4 w-96 h-96 bg-pink-400 rounded-full mix-blend-multiply filter blur-xl animate-pulse animation-delay-2000"></div>
        <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl animate-pulse animation-delay-4000"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 p-6 backdrop-blur-sm bg-slate-900/30 border-b border-cyan-400/20 shadow-lg shadow-cyan-400/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Zap className="w-8 h-8 text-cyan-400 animate-pulse" />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-pink-400 bg-clip-text text-transparent">
                VAULT MK9 PRO
              </h1>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-300">Endpoint:</span>
              <input
                type="text"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                className="bg-slate-800/50 border border-cyan-400/30 rounded-lg px-3 py-1 text-sm text-cyan-400 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
              />
              <button
                onClick={async () => {
                  try {
                    setConnectionStatus('TESTING');
                    const response = await fetch(endpoint, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ command: 'ping', userId: 'test', sessionId: Date.now().toString() })
                    });
                    setConnectionStatus(response.ok ? 'CONNECTED' : 'ERROR');
                  } catch {
                    setConnectionStatus('ERROR');
                  }
                }}
                className="px-3 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/30 rounded-lg text-xs text-cyan-400 transition-colors duration-200"
              >
                Test
              </button>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                connectionStatus === 'CONNECTED' ? getStatusDot('active') : 
                connectionStatus === 'ERROR' ? getStatusDot('error') : 
                getStatusDot('warning')
              }`}></div>
              <span className={`text-sm font-medium ${
                connectionStatus === 'CONNECTED' ? 'text-green-400' : 
                connectionStatus === 'ERROR' ? 'text-red-400' : 
                'text-amber-400'
              }`}>{connectionStatus}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-88px)]">
        {/* Left Panel - Agents & Modules */}
        <div className="w-80 p-6 backdrop-blur-lg bg-slate-900/20 border-r border-cyan-400/20">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-cyan-400 mb-4 flex items-center">
              <Settings className="w-5 h-5 mr-2" />
              AGENTS & MODULES
            </h2>
            <p className="text-xs text-gray-400 mb-4">Available system agents</p>
          </div>

          <div className="space-y-3">
            {agents.map((agent) => (
              <div
                key={agent.id}
                className="p-4 rounded-lg backdrop-blur-sm bg-slate-800/30 border border-slate-700/50 hover:border-cyan-400/50 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-400/10 cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <agent.icon className={`w-5 h-5 ${getStatusColor(agent.status)} group-hover:scale-110 transition-transform duration-300`} />
                    <div>
                      <h3 className="font-medium text-white group-hover:text-cyan-400 transition-colors duration-300">{agent.name}</h3>
                      <p className="text-xs text-gray-400">{agent.description}</p>
                    </div>
                  </div>
                  <div className={`w-2 h-2 rounded-full ${getStatusDot(agent.status)}`}></div>
                </div>
                
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">Executions:</span>
                  <span className="text-cyan-400 font-mono">{agent.executions.toLocaleString()}</span>
                </div>
                
                <div className="mt-2 w-full bg-slate-700/50 rounded-full h-1 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-cyan-400 to-pink-400 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min((agent.executions / 1500) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Center Panel - Multi-Agent Command Interface */}
        <div className="flex-1 flex flex-col">
          {/* Chat Header */}
          <div className="p-4 backdrop-blur-sm bg-slate-900/20 border-b border-cyan-400/20">
            <h2 className="text-lg font-semibold text-cyan-400 mb-1">MULTI-AGENT COMMAND INTERFACE</h2>
            <p className="text-xs text-gray-400">Execute commands across connected agents</p>
          </div>

          {/* Messages */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} animate-fadeInUp`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-4 backdrop-blur-sm border transition-all duration-300 ${
                    message.type === 'user'
                      ? 'bg-cyan-400/10 border-cyan-400/30 shadow-lg shadow-cyan-400/10'
                      : message.type === 'system'
                      ? 'bg-amber-400/10 border-amber-400/30 shadow-lg shadow-amber-400/10'
                      : 'bg-slate-800/30 border-slate-700/50 shadow-lg shadow-slate-400/5'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className={`text-xs font-mono ${
                      message.type === 'user' ? 'text-cyan-400' : message.type === 'system' ? 'text-amber-400' : 'text-green-400'
                    }`}>
                      {message.type === 'user' ? 'USER' : message.type === 'system' ? 'SYSTEM' : 'AI ASSISTANT'}
                    </span>
                    <span className="text-xs text-gray-400 ml-4">{message.timestamp}</span>
                  </div>
                  <p className="text-white font-mono text-sm leading-relaxed">{message.content}</p>
                </div>
              </div>
            ))}
            
            {isProcessing && (
              <div className="flex justify-start animate-fadeInUp">
                <div className="max-w-[80%] rounded-lg p-4 backdrop-blur-sm bg-slate-800/30 border border-slate-700/50 shadow-lg shadow-slate-400/5">
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                    <span className="text-cyan-400 text-sm font-mono">Processing...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Command Input */}
          <div className="p-4 backdrop-blur-sm bg-slate-900/20 border-t border-cyan-400/20">
            <div className="flex space-x-4">
              <input
                type="text"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                placeholder="Enter command or query..."
                disabled={isProcessing}
                className="flex-1 bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/50 font-mono transition-all duration-300 disabled:opacity-50"
              />
              <button
                onClick={handleSubmit}
                disabled={isProcessing}
                className="px-6 py-3 bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 rounded-lg font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-pink-500/25 hover:shadow-pink-500/40 flex items-center space-x-2"
              >
                <Send className="w-4 h-4" />
                <span>Execute</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Panel - System Monitoring */}
        <div className="w-80 p-6 backdrop-blur-lg bg-slate-900/20 border-l border-cyan-400/20">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-cyan-400 mb-4 flex items-center">
              <BarChart3 className="w-5 h-5 mr-2" />
              SYSTEM MONITORING
            </h2>
            <p className="text-xs text-gray-400 mb-4">Real-time analytics & performance</p>
          </div>

          {/* Success Rate */}
          <div className="mb-6 p-4 rounded-lg backdrop-blur-sm bg-slate-800/30 border border-slate-700/50">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-300">Success Rate</span>
              <span className="text-green-400 font-mono text-sm">{monitoringData.successRate}%</span>
            </div>
            <div className="relative w-24 h-24 mx-auto">
              <svg className="w-24 h-24 transform -rotate-90">
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="6"
                  fill="transparent"
                  className="text-slate-700"
                />
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="6"
                  fill="transparent"
                  strokeDasharray={`${2 * Math.PI * 40}`}
                  strokeDashoffset={`${2 * Math.PI * 40 * (1 - monitoringData.successRate / 100)}`}
                  className="text-green-400 drop-shadow-sm"
                  style={{ filter: 'drop-shadow(0 0 6px rgb(34 197 94 / 0.5))' }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold text-green-400">{monitoringData.successRate}%</span>
              </div>
            </div>
          </div>

          {/* Response Time Chart */}
          <div className="mb-6 p-4 rounded-lg backdrop-blur-sm bg-slate-800/30 border border-slate-700/50">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-300">Avg Response Time</span>
              <span className="text-cyan-400 font-mono text-sm">{monitoringData.avgResponseTime}s</span>
            </div>
            <div className="h-16 flex items-end justify-between space-x-1">
              {responseTimeData.map((point, index) => (
                <div
                  key={index}
                  className="flex-1 bg-gradient-to-t from-cyan-400 to-cyan-300 rounded-sm transition-all duration-300"
                  style={{ height: `${(point.value / 3) * 100}%`, filter: 'drop-shadow(0 0 4px rgb(34 211 238 / 0.5))' }}
                ></div>
              ))}
            </div>
          </div>

          {/* Agent Activity */}
          <div className="mb-6 p-4 rounded-lg backdrop-blur-sm bg-slate-800/30 border border-slate-700/50">
            <h3 className="text-sm font-medium text-cyan-400 mb-3">Agent Activity</h3>
            <div className="space-y-2">
              {agents.slice(0, 4).map((agent) => (
                <div key={agent.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${getStatusDot(agent.status)}`}></div>
                    <span className="text-xs text-gray-300">{agent.name}</span>
                  </div>
                  <span className="text-xs text-cyan-400 font-mono">{agent.executions}</span>
                </div>
              ))}
            </div>
          </div>

          {/* System Stats */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-300">Total Requests</span>
              <span className="text-cyan-400 font-mono">{monitoringData.totalRequests.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-300">Active Agents</span>
              <span className="text-green-400 font-mono">{monitoringData.activeAgents}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-300">Uptime</span>
              <span className="text-cyan-400 font-mono">{monitoringData.uptime}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-300">Memory Used</span>
              <span className="text-amber-400 font-mono">{monitoringData.memoryUsed}%</span>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeInUp {
          animation: fadeInUp 0.5s ease-out forwards;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
};

export default VaultMK9Pro;
import React, { useEffect, useState } from 'react';
import { DollarSign, TrendingUp, Activity } from 'lucide-react';

interface CostData {
  total_cost: string;
  total_tokens: string;
  request_count: string;
}

interface AgentCost {
  agent_name: string;
  agent_id: number;
  cost_today?: string;
  cost_month?: string;
  tokens_today?: string;
  tokens_month?: string;
  requests_today?: string;
  requests_month?: string;
}

export default function CostSummary() {
  const [todayCost, setTodayCost] = useState<CostData | null>(null);
  const [monthCost, setMonthCost] = useState<CostData | null>(null);
  const [todayAgentCosts, setTodayAgentCosts] = useState<AgentCost[]>([]);
  const [monthAgentCosts, setMonthAgentCosts] = useState<AgentCost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'today' | 'month'>('today');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api';

  useEffect(() => {
    fetchCostData();
    // Refresh every 5 minutes
    const interval = setInterval(fetchCostData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchCostData = async () => {
    try {
      setLoading(true);
      
      // Fetch today's total
      const todayRes = await fetch(`${API_URL}/costs/today`);
      if (!todayRes.ok) throw new Error('Failed to fetch today costs');
      const todayData = await todayRes.json();
      setTodayCost(todayData);

      // Fetch month's total
      const monthRes = await fetch(`${API_URL}/costs/month`);
      if (!monthRes.ok) throw new Error('Failed to fetch month costs');
      const monthData = await monthRes.json();
      setMonthCost(monthData);

      // Fetch today's agent breakdown
      const todayAgentsRes = await fetch(`${API_URL}/costs/by-agent/today`);
      if (!todayAgentsRes.ok) throw new Error('Failed to fetch agent costs (today)');
      const todayAgents = await todayAgentsRes.json();
      setTodayAgentCosts(todayAgents);

      // Fetch month's agent breakdown
      const monthAgentsRes = await fetch(`${API_URL}/costs/by-agent/month`);
      if (!monthAgentsRes.ok) throw new Error('Failed to fetch agent costs (month)');
      const monthAgents = await monthAgentsRes.json();
      setMonthAgentCosts(monthAgents);

      setError(null);
    } catch (err) {
      console.error('Error fetching cost data:', err);
      setError('Failed to load cost data');
    } finally {
      setLoading(false);
    }
  };

  const formatCost = (cost: string | number) => {
    const num = typeof cost === 'string' ? parseFloat(cost) : cost;
    return `$${num.toFixed(4)}`;
  };

  const formatTokens = (tokens: string | number) => {
    const num = typeof tokens === 'string' ? parseInt(tokens) : tokens;
    return num.toLocaleString();
  };

  const agentCosts = view === 'today' ? todayAgentCosts : monthAgentCosts;
  const costKey = view === 'today' ? 'cost_today' : 'cost_month';
  const tokensKey = view === 'today' ? 'tokens_today' : 'tokens_month';

  if (loading && !todayCost) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Today's Cost */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Today's Cost</p>
              <p className="text-3xl font-bold text-gray-900">
                {todayCost ? formatCost(todayCost.total_cost) : '$0.0000'}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {todayCost ? formatTokens(todayCost.total_tokens) : '0'} tokens
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        {/* Month's Cost */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">This Month</p>
              <p className="text-3xl font-bold text-gray-900">
                {monthCost ? formatCost(monthCost.total_cost) : '$0.0000'}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {monthCost ? formatTokens(monthCost.total_tokens) : '0'} tokens
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Agent Breakdown */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Activity className="w-5 h-5 mr-2 text-gray-600" />
            Cost by Agent
          </h3>
          <div className="flex gap-2">
            <button
              onClick={() => setView('today')}
              className={`px-3 py-1 text-sm rounded ${
                view === 'today'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setView('month')}
              className={`px-3 py-1 text-sm rounded ${
                view === 'month'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              This Month
            </button>
          </div>
        </div>

        {agentCosts.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            No agent activity {view === 'today' ? 'today' : 'this month'}
          </p>
        ) : (
          <div className="space-y-3">
            {agentCosts.map((agent) => (
              <div
                key={`${agent.agent_id}-${agent.agent_name}`}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="font-medium text-gray-900">{agent.agent_name || 'Unknown Agent'}</p>
                  <p className="text-xs text-gray-500">
                    {formatTokens(agent[tokensKey] || '0')} tokens
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">
                    {formatCost(agent[costKey] || '0')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

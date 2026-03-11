import { useState, useEffect } from 'react';
import { Upload, DollarSign, TrendingUp, TrendingDown, Users, Target, FileText, Calendar } from 'lucide-react';
import axios from 'axios';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface MonthlyMetrics {
  period: string;
  revenue_total: number;
  revenue_subscriptions: number;
  revenue_one_time: number;
  expenses_total: number;
  expenses_payroll: number;
  expenses_marketing: number;
  expenses_software: number;
  expenses_other: number;
  net_profit: number;
  profit_margin: number;
  mrr: number;
  arr: number;
  active_subscribers: number;
  churn_rate: number;
}

interface Statement {
  id: number;
  statement_type: string;
  statement_period: string;
  file_name: string;
  uploaded_at: string;
  status: string;
}

function Financials() {
  const [currentMonth, setCurrentMonth] = useState<MonthlyMetrics | null>(null);
  const [trends, setTrends] = useState<MonthlyMetrics[]>([]);
  const [statements, setStatements] = useState<Statement[]>([]);
  const [ytd, setYtd] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [overviewRes, trendsRes, statementsRes] = await Promise.all([
        axios.get('/api/financials/overview'),
        axios.get('/api/financials/trends'),
        axios.get('/api/financials/statements')
      ]);

      setCurrentMonth(overviewRes.data.current_month);
      setYtd(overviewRes.data.ytd);
      setTrends(trendsRes.data.trends);
      setStatements(statementsRes.data.statements);
    } catch (error) {
      console.error('Failed to load financials:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);
    formData.append('statement_type', 'bank');
    formData.append('statement_period', new Date().toISOString().slice(0, 7));

    try {
      setUploading(true);
      await axios.post('/api/financials/upload', formData);
      loadData();
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  // Chart data
  const revenueExpenseData = {
    labels: trends.map(t => t.period),
    datasets: [
      {
        label: 'Revenue',
        data: trends.map(t => t.revenue_total),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true
      },
      {
        label: 'Expenses',
        data: trends.map(t => t.expenses_total),
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: true
      },
      {
        label: 'Profit',
        data: trends.map(t => t.net_profit),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true
      }
    ]
  };

  const expenseBreakdownData = currentMonth ? {
    labels: ['Payroll', 'Marketing', 'Software', 'Other'],
    datasets: [{
      label: 'Expenses',
      data: [
        currentMonth.expenses_payroll,
        currentMonth.expenses_marketing,
        currentMonth.expenses_software,
        currentMonth.expenses_other
      ],
      backgroundColor: [
        'rgba(239, 68, 68, 0.8)',
        'rgba(251, 146, 60, 0.8)',
        'rgba(59, 130, 246, 0.8)',
        'rgba(156, 163, 175, 0.8)'
      ]
    }]
  } : null;

  const mrrTrendData = {
    labels: trends.map(t => t.period),
    datasets: [{
      label: 'MRR',
      data: trends.map(t => t.mrr),
      borderColor: 'rgb(147, 51, 234)',
      backgroundColor: 'rgba(147, 51, 234, 0.1)',
      fill: true
    }]
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">
      <div className="text-gray-500">Loading financials...</div>
    </div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Financials</h1>
        <label className="btn-primary cursor-pointer">
          <Upload size={18} className="inline mr-2" />
          Upload Statement
          <input
            type="file"
            className="hidden"
            accept=".pdf,.csv,.xlsx,.xls"
            onChange={handleUpload}
            disabled={uploading}
          />
        </label>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Monthly Revenue</p>
              <p className="text-2xl font-bold text-gray-900">
                {currentMonth ? formatCurrency(currentMonth.revenue_total) : '-'}
              </p>
            </div>
            <DollarSign className="text-blue-500" size={32} />
          </div>
          {currentMonth && (
            <p className="text-sm text-green-600 mt-2">
              MRR: {formatCurrency(currentMonth.mrr)}
            </p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Net Profit</p>
              <p className="text-2xl font-bold text-gray-900">
                {currentMonth ? formatCurrency(currentMonth.net_profit) : '-'}
              </p>
            </div>
            {currentMonth && currentMonth.net_profit >= 0 ? (
              <TrendingUp className="text-green-500" size={32} />
            ) : (
              <TrendingDown className="text-red-500" size={32} />
            )}
          </div>
          {currentMonth && (
            <p className="text-sm text-gray-600 mt-2">
              Margin: {currentMonth.profit_margin.toFixed(1)}%
            </p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Subscribers</p>
              <p className="text-2xl font-bold text-gray-900">
                {currentMonth?.active_subscribers || '-'}
              </p>
            </div>
            <Users className="text-purple-500" size={32} />
          </div>
          {currentMonth && (
            <p className="text-sm text-gray-600 mt-2">
              Churn: {currentMonth.churn_rate.toFixed(1)}%
            </p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">YTD Profit</p>
              <p className="text-2xl font-bold text-gray-900">
                {ytd ? formatCurrency(ytd.ytd_profit) : '-'}
              </p>
            </div>
            <Target className="text-orange-500" size={32} />
          </div>
          {ytd && (
            <p className="text-sm text-gray-600 mt-2">
              Revenue: {formatCurrency(ytd.ytd_revenue)}
            </p>
          )}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue vs Expenses Trend */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Revenue vs Expenses (12 Months)</h3>
          <Line
            data={revenueExpenseData}
            options={{
              responsive: true,
              plugins: {
                legend: { position: 'top' as const },
                tooltip: {
                  callbacks: {
                    label: (context) => {
                      const value = context.parsed.y;
                      return `${context.dataset.label}: ${value !== null ? formatCurrency(value) : 'N/A'}`;
                    }
                  }
                }
              },
              scales: {
                y: {
                  ticks: {
                    callback: (value) => formatCurrency(Number(value))
                  }
                }
              }
            }}
          />
        </div>

        {/* Expense Breakdown */}
        {expenseBreakdownData && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Expense Breakdown (This Month)</h3>
            <Bar
              data={expenseBreakdownData}
              options={{
                responsive: true,
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    callbacks: {
                      label: (context) => {
                        const value = context.parsed.y;
                        return value !== null ? formatCurrency(value) : 'N/A';
                      }
                    }
                  }
                },
                scales: {
                  y: {
                    ticks: {
                      callback: (value) => formatCurrency(Number(value))
                    }
                  }
                }
              }}
            />
          </div>
        )}

        {/* MRR Trend */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">MRR Trend</h3>
          <Line
            data={mrrTrendData}
            options={{
              responsive: true,
              plugins: {
                legend: { display: false },
                tooltip: {
                  callbacks: {
                    label: (context) => {
                      const value = context.parsed.y;
                      return value !== null ? formatCurrency(value) : 'N/A';
                    }
                  }
                }
              },
              scales: {
                y: {
                  ticks: {
                    callback: (value) => formatCurrency(Number(value))
                  }
                }
              }
            }}
          />
        </div>

        {/* Recent Statements */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FileText size={20} />
            Recent Statements
          </h3>
          <div className="space-y-3">
            {statements.slice(0, 5).map(statement => (
              <div key={statement.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div>
                  <p className="font-medium text-sm">{statement.file_name}</p>
                  <p className="text-xs text-gray-500">
                    {statement.statement_type} • {statement.statement_period}
                  </p>
                </div>
                <span className={`text-xs px-2 py-1 rounded ${
                  statement.status === 'complete' ? 'bg-green-100 text-green-700' :
                  statement.status === 'processing' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {statement.status}
                </span>
              </div>
            ))}
            {statements.length === 0 && (
              <p className="text-gray-500 text-sm text-center py-4">No statements uploaded yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Financials;

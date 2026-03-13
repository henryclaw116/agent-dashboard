import React, { useState, useEffect } from 'react';
import { Brain, TrendingUp, Calendar, Play, CheckCircle, AlertCircle } from 'lucide-react';
import { api } from '../api/api';

interface TrainingLesson {
  category: string;
  lesson: string;
  examples: string[];
  confidence: number;
}

interface TrainingHistory {
  id: number;
  writer_prompt?: string;
  scorer_guidelines?: string;
  router_rules?: string;
  reply_lessons: TrainingLesson[];
  quality_lessons: TrainingLesson[];
  training_date: string;
  created_at: string;
}

interface TrainingStats {
  total_training_cycles: number;
  last_training_date: string | null;
  total_reply_lessons: number;
  total_quality_lessons: number;
  agents_trained: {
    writer: number;
    scorer: number;
    router: number;
  };
}

function AgentTraining() {
  const [history, setHistory] = useState<TrainingHistory[]>([]);
  const [stats, setStats] = useState<TrainingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [selectedCycle, setSelectedCycle] = useState<TrainingHistory | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [historyRes, statsRes] = await Promise.all([
        api.get('/agent-training/history?limit=20'),
        api.get('/agent-training/stats')
      ]);
      setHistory(historyRes.data.history || []);
      setStats(statsRes.data.stats || null);
    } catch (error) {
      console.error('Failed to load training data:', error);
    } finally {
      setLoading(false);
    }
  };

  const runTraining = async () => {
    if (!confirm('Run agent training cycle now? This will analyze all recent feedback and update agent prompts.')) {
      return;
    }

    try {
      setRunning(true);
      const response = await api.post('/agent-training/run');
      
      alert(`✅ ${response.data.message}\n\nUpdated ${response.data.updates.length} agent(s)`);
      loadData();
    } catch (error) {
      console.error('Failed to run training:', error);
      alert('Failed to run training cycle');
    } finally {
      setRunning(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="grid grid-cols-4 gap-4">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Brain className="text-purple-600" size={32} />
            Agent Training System
          </h1>
          <p className="text-gray-600 mt-2">
            Automated machine learning from your feedback. Agents improve weekly.
          </p>
        </div>
        <button
          onClick={runTraining}
          disabled={running}
          className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
        >
          <Play size={20} />
          {running ? 'Training...' : 'Run Training Now'}
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-gray-600 text-sm font-medium">Training Cycles</h3>
              <TrendingUp className="text-purple-600" size={20} />
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.total_training_cycles}</p>
            <p className="text-xs text-gray-500 mt-1">Total runs</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-gray-600 text-sm font-medium">Reply Lessons</h3>
              <CheckCircle className="text-green-600" size={20} />
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.total_reply_lessons}</p>
            <p className="text-xs text-gray-500 mt-1">Writer Agent</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-gray-600 text-sm font-medium">Quality Lessons</h3>
              <Brain className="text-blue-600" size={20} />
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.total_quality_lessons}</p>
            <p className="text-xs text-gray-500 mt-1">Scorer/Router</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-500">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-gray-600 text-sm font-medium">Last Training</h3>
              <Calendar className="text-orange-600" size={20} />
            </div>
            <p className="text-lg font-bold text-gray-900">
              {stats.last_training_date 
                ? new Date(stats.last_training_date).toLocaleDateString()
                : 'Never'}
            </p>
            <p className="text-xs text-gray-500 mt-1">Most recent</p>
          </div>
        </div>
      )}

      {/* Next Training Schedule */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <Calendar className="text-purple-600 flex-shrink-0" size={24} />
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">📅 Automatic Training Schedule</h3>
            <p className="text-gray-700 text-sm mb-2">
              Training runs <strong>every Monday at 6:00 AM MDT</strong> automatically.
            </p>
            <p className="text-gray-600 text-xs">
              The system analyzes all feedback from the past week and updates agent prompts to improve performance.
              You can also trigger training manually anytime using the button above.
            </p>
          </div>
        </div>
      </div>

      {/* Training History */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold">Training History</h2>
          <p className="text-gray-600 text-sm mt-1">Recent training cycles and what agents learned</p>
        </div>

        {history.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Brain size={48} className="mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Training History Yet</h3>
            <p className="text-sm">
              The first training cycle will run next Monday, or click "Run Training Now" to start immediately.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {history.map((cycle) => (
              <div
                key={cycle.id}
                className="p-6 hover:bg-gray-50 cursor-pointer"
                onClick={() => setSelectedCycle(selectedCycle?.id === cycle.id ? null : cycle)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Calendar size={16} className="text-gray-600" />
                      <span className="font-semibold text-gray-900">
                        {new Date(cycle.training_date).toLocaleString()}
                      </span>
                      {cycle.writer_prompt && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                          Writer Updated
                        </span>
                      )}
                      {cycle.scorer_guidelines && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                          Scorer Updated
                        </span>
                      )}
                      {cycle.router_rules && (
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                          Router Updated
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>{cycle.reply_lessons.length} reply lessons</span>
                      <span>•</span>
                      <span>{cycle.quality_lessons.length} quality lessons</span>
                    </div>

                    {/* Expanded Details */}
                    {selectedCycle?.id === cycle.id && (
                      <div className="mt-4 space-y-4">
                        {/* Reply Lessons */}
                        {cycle.reply_lessons.length > 0 && (
                          <div className="bg-green-50 border border-green-200 rounded p-4">
                            <h4 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                              <CheckCircle size={16} />
                              Reply Writing Lessons ({cycle.reply_lessons.length})
                            </h4>
                            <ul className="space-y-2">
                              {cycle.reply_lessons.map((lesson, i) => (
                                <li key={i} className="text-sm text-green-800">
                                  <strong>{lesson.category}:</strong> {lesson.lesson}
                                  {lesson.confidence && (
                                    <span className="ml-2 text-xs text-green-600">
                                      ({Math.round(lesson.confidence * 100)}% confidence)
                                    </span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Quality Lessons */}
                        {cycle.quality_lessons.length > 0 && (
                          <div className="bg-blue-50 border border-blue-200 rounded p-4">
                            <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                              <Brain size={16} />
                              Lead Quality Lessons ({cycle.quality_lessons.length})
                            </h4>
                            <ul className="space-y-2">
                              {cycle.quality_lessons.map((lesson, i) => (
                                <li key={i} className="text-sm text-blue-800">
                                  <strong>{lesson.category}:</strong> {lesson.lesson}
                                  {lesson.confidence && (
                                    <span className="ml-2 text-xs text-blue-600">
                                      ({Math.round(lesson.confidence * 100)}% confidence)
                                    </span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Updated Prompts */}
                        {cycle.writer_prompt && (
                          <div className="bg-gray-50 border border-gray-200 rounded p-4">
                            <h4 className="font-semibold text-gray-900 mb-2">Updated Writer Prompt</h4>
                            <pre className="text-xs text-gray-700 whitespace-pre-wrap bg-white p-3 rounded border border-gray-300">
                              {cycle.writer_prompt}
                            </pre>
                          </div>
                        )}

                        {cycle.scorer_guidelines && (
                          <div className="bg-gray-50 border border-gray-200 rounded p-4">
                            <h4 className="font-semibold text-gray-900 mb-2">Updated Scorer Guidelines</h4>
                            <pre className="text-xs text-gray-700 whitespace-pre-wrap bg-white p-3 rounded border border-gray-300">
                              {cycle.scorer_guidelines}
                            </pre>
                          </div>
                        )}

                        {cycle.router_rules && (
                          <div className="bg-gray-50 border border-gray-200 rounded p-4">
                            <h4 className="font-semibold text-gray-900 mb-2">Updated Router Rules</h4>
                            <pre className="text-xs text-gray-700 whitespace-pre-wrap bg-white p-3 rounded border border-gray-300">
                              {cycle.router_rules}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <button className="text-gray-400 hover:text-gray-600">
                    {selectedCycle?.id === cycle.id ? '▼' : '▶'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default AgentTraining;

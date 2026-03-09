import React from 'react';
import { WorkflowStep } from '../types/workflow';

interface WorkflowStepCardProps {
  step: WorkflowStep;
  isFirst: boolean;
  isLast: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

const WorkflowStepCard: React.FC<WorkflowStepCardProps> = ({
  step,
  isFirst,
  isLast,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown
}) => {
  return (
    <div className="relative">
      {/* Connector Line */}
      {!isLast && (
        <div className="absolute left-8 top-full w-0.5 h-4 bg-blue-300 -mb-4" />
      )}
      
      <div className="bg-white border-2 border-gray-200 rounded-lg p-6 hover:border-blue-300 transition-all">
        <div className="flex items-start gap-4">
          {/* Step Number Circle */}
          <div className="flex-shrink-0">
            <div className="w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center text-xl font-bold">
              {step.step_order}
            </div>
          </div>

          {/* Step Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <h4 className="text-lg font-semibold text-gray-900">
                {step.step_name}
              </h4>
              
              {/* Action Buttons */}
              <div className="flex items-center gap-1">
                <button
                  onClick={onMoveUp}
                  disabled={isFirst}
                  className={`p-1 rounded ${
                    isFirst
                      ? 'text-gray-300 cursor-not-allowed'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  title="Move up"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </button>
                
                <button
                  onClick={onMoveDown}
                  disabled={isLast}
                  className={`p-1 rounded ${
                    isLast
                      ? 'text-gray-300 cursor-not-allowed'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  title="Move down"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                <button
                  onClick={onEdit}
                  className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                  title="Edit"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>

                <button
                  onClick={onDelete}
                  className="p-1 text-red-600 hover:bg-red-50 rounded"
                  title="Delete"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Prompt */}
            <div className="mb-3">
              <p className="text-sm font-medium text-gray-700 mb-1">📝 Instructions:</p>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{step.prompt}</p>
            </div>

            {/* Rules */}
            {step.rules && (
              <div className="mb-3">
                <p className="text-sm font-medium text-gray-700 mb-1">⚖️ Rules:</p>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{step.rules}</p>
              </div>
            )}

            {/* Conditions */}
            {step.conditions && (
              <div className="mb-3">
                <p className="text-sm font-medium text-gray-700 mb-1">✅ Conditions:</p>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{step.conditions}</p>
              </div>
            )}

            {/* Prerequisites */}
            {step.prerequisites && (
              <div className="mb-3">
                <p className="text-sm font-medium text-gray-700 mb-1">🔗 Prerequisites:</p>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{step.prerequisites}</p>
              </div>
            )}

            {/* Expected Output */}
            {step.expected_output && (
              <div className="mb-3">
                <p className="text-sm font-medium text-gray-700 mb-1">🎯 Expected Output:</p>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{step.expected_output}</p>
              </div>
            )}

            {/* Tools & Duration */}
            <div className="flex items-center gap-4 text-xs text-gray-500 mt-3">
              {step.tools_needed && step.tools_needed.length > 0 && (
                <div className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>Tools: {step.tools_needed.join(', ')}</span>
                </div>
              )}
              
              {step.estimated_duration_minutes && (
                <div className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>~{step.estimated_duration_minutes} min</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkflowStepCard;

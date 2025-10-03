import React, { useState, useEffect } from 'react';
import { TrendingUp, Users, Calendar, AlertTriangle, Save, RefreshCw, PlusCircle, Trash2 } from 'lucide-react';
import { apiClient } from '../../services/api';

interface Scenario {
  id: string;
  name: string;
  description: string;
  changes: ScenarioChange[];
  impact: ScenarioImpact;
  createdAt: string;
  status: 'draft' | 'analyzed' | 'applied';
}

interface ScenarioChange {
  type: 'allocation' | 'availability' | 'project' | 'team';
  entityId: string;
  entityName: string;
  field: string;
  oldValue: any;
  newValue: any;
}

interface ScenarioImpact {
  utilizationChange: number;
  conflictsCreated: number;
  conflictsResolved: number;
  costImpact: number;
  timelineImpact: string;
  affectedEmployees: string[];
  recommendations: string[];
}

export const WhatIfScenarios: React.FC = () => {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [activeScenario, setActiveScenario] = useState<Scenario | null>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  // Form state for new scenario
  const [newScenario, setNewScenario] = useState({
    name: '',
    description: '',
    changeType: 'allocation',
    entityId: '',
    field: 'allocatedHours',
    newValue: ''
  });

  useEffect(() => {
    loadData();
    loadScenarios();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [empResponse, projResponse] = await Promise.all([
        apiClient.get('/employees'),
        apiClient.get('/projects')
      ]);

      setEmployees(empResponse.data.data || []);
      setProjects(projResponse.data.data || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadScenarios = () => {
    // Load saved scenarios from localStorage for now
    const saved = localStorage.getItem('whatIfScenarios');
    if (saved) {
      setScenarios(JSON.parse(saved));
    }
  };

  const createScenario = () => {
    if (!newScenario.name || !newScenario.entityId) {
      alert('Please provide scenario name and select an entity');
      return;
    }

    const entityName = newScenario.changeType === 'allocation'
      ? employees.find(e => e.id === newScenario.entityId)?.name
      : projects.find(p => p.id === newScenario.entityId)?.name;

    const scenario: Scenario = {
      id: Date.now().toString(),
      name: newScenario.name,
      description: newScenario.description,
      changes: [{
        type: newScenario.changeType as any,
        entityId: newScenario.entityId,
        entityName: entityName || 'Unknown',
        field: newScenario.field,
        oldValue: null, // Would be fetched from current data
        newValue: newScenario.newValue
      }],
      impact: {
        utilizationChange: 0,
        conflictsCreated: 0,
        conflictsResolved: 0,
        costImpact: 0,
        timelineImpact: 'No impact',
        affectedEmployees: [],
        recommendations: []
      },
      createdAt: new Date().toISOString(),
      status: 'draft'
    };

    const updated = [...scenarios, scenario];
    setScenarios(updated);
    localStorage.setItem('whatIfScenarios', JSON.stringify(updated));
    setActiveScenario(scenario);

    // Reset form
    setNewScenario({
      name: '',
      description: '',
      changeType: 'allocation',
      entityId: '',
      field: 'allocatedHours',
      newValue: ''
    });
  };

  const analyzeScenario = async (scenario: Scenario) => {
    setAnalyzing(true);

    // Simulate analysis
    setTimeout(() => {
      const impact: ScenarioImpact = {
        utilizationChange: Math.random() * 20 - 10,
        conflictsCreated: Math.floor(Math.random() * 3),
        conflictsResolved: Math.floor(Math.random() * 2),
        costImpact: Math.random() * 50000 - 25000,
        timelineImpact: Math.random() > 0.5 ? 'Delayed by 2 weeks' : 'On track',
        affectedEmployees: employees.slice(0, Math.floor(Math.random() * 5)).map(e => e.name),
        recommendations: [
          'Consider redistributing work among team members',
          'Review project timeline constraints',
          'Evaluate skill matching for optimal allocation'
        ]
      };

      const updatedScenario = {
        ...scenario,
        impact,
        status: 'analyzed' as const
      };

      const updated = scenarios.map(s =>
        s.id === scenario.id ? updatedScenario : s
      );

      setScenarios(updated);
      setActiveScenario(updatedScenario);
      localStorage.setItem('whatIfScenarios', JSON.stringify(updated));
      setAnalyzing(false);
    }, 2000);
  };

  const applyScenario = async (scenario: Scenario) => {
    if (!confirm(`Are you sure you want to apply scenario "${scenario.name}"? This will modify actual data.`)) {
      return;
    }

    try {
      // In production, this would apply the changes via API
      alert(`Scenario "${scenario.name}" would be applied to the system.`);

      const updated = scenarios.map(s =>
        s.id === scenario.id ? { ...s, status: 'applied' as const } : s
      );
      setScenarios(updated);
      localStorage.setItem('whatIfScenarios', JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to apply scenario:', error);
      alert('Failed to apply scenario');
    }
  };

  const deleteScenario = (id: string) => {
    const updated = scenarios.filter(s => s.id !== id);
    setScenarios(updated);
    localStorage.setItem('whatIfScenarios', JSON.stringify(updated));
    if (activeScenario?.id === id) {
      setActiveScenario(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <TrendingUp className="w-8 h-8 text-purple-600" />
          What-If Scenario Planning
        </h1>
        <p className="text-gray-600 mt-2">
          Simulate changes and analyze their impact before applying them to your resource plan
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scenario Creation Panel */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Create New Scenario</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Scenario Name
                </label>
                <input
                  type="text"
                  value={newScenario.name}
                  onChange={(e) => setNewScenario({ ...newScenario, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g., Q2 Expansion"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newScenario.description}
                  onChange={(e) => setNewScenario({ ...newScenario, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  rows={2}
                  placeholder="Describe the scenario..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Change Type
                </label>
                <select
                  value={newScenario.changeType}
                  onChange={(e) => setNewScenario({ ...newScenario, changeType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="allocation">Allocation Change</option>
                  <option value="availability">Availability Change</option>
                  <option value="project">Project Change</option>
                  <option value="team">Team Change</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select {newScenario.changeType === 'allocation' ? 'Employee' : 'Project'}
                </label>
                <select
                  value={newScenario.entityId}
                  onChange={(e) => setNewScenario({ ...newScenario, entityId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Select...</option>
                  {(newScenario.changeType === 'allocation' ? employees : projects).map(entity => (
                    <option key={entity.id} value={entity.id}>
                      {entity.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Change Parameter
                </label>
                <select
                  value={newScenario.field}
                  onChange={(e) => setNewScenario({ ...newScenario, field: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="allocatedHours">Allocated Hours</option>
                  <option value="startDate">Start Date</option>
                  <option value="endDate">End Date</option>
                  <option value="role">Role</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Value
                </label>
                <input
                  type="text"
                  value={newScenario.newValue}
                  onChange={(e) => setNewScenario({ ...newScenario, newValue: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Enter new value..."
                />
              </div>

              <button
                onClick={createScenario}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition"
              >
                <PlusCircle className="w-4 h-4" />
                Create Scenario
              </button>
            </div>
          </div>

          {/* Saved Scenarios */}
          <div className="bg-white rounded-lg shadow-md p-6 mt-6">
            <h2 className="text-xl font-semibold mb-4">Saved Scenarios</h2>

            <div className="space-y-2">
              {scenarios.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No scenarios created yet</p>
              ) : (
                scenarios.map(scenario => (
                  <div
                    key={scenario.id}
                    className={`p-3 rounded-lg border cursor-pointer transition ${
                      activeScenario?.id === scenario.id
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-purple-300'
                    }`}
                    onClick={() => setActiveScenario(scenario)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium">{scenario.name}</h3>
                        <p className="text-xs text-gray-500">
                          {new Date(scenario.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className={`px-2 py-1 text-xs rounded ${
                          scenario.status === 'applied'
                            ? 'bg-green-100 text-green-800'
                            : scenario.status === 'analyzed'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {scenario.status}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteScenario(scenario.id);
                          }}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Scenario Analysis Panel */}
        <div className="lg:col-span-2">
          {activeScenario ? (
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-semibold">{activeScenario.name}</h2>
                  <p className="text-gray-600">{activeScenario.description}</p>
                </div>
                <div className="flex gap-2">
                  {activeScenario.status === 'draft' && (
                    <button
                      onClick={() => analyzeScenario(activeScenario)}
                      disabled={analyzing}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition"
                    >
                      <RefreshCw className={`w-4 h-4 ${analyzing ? 'animate-spin' : ''}`} />
                      {analyzing ? 'Analyzing...' : 'Analyze Impact'}
                    </button>
                  )}
                  {activeScenario.status === 'analyzed' && (
                    <button
                      onClick={() => applyScenario(activeScenario)}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition"
                    >
                      <Save className="w-4 h-4" />
                      Apply Scenario
                    </button>
                  )}
                </div>
              </div>

              {/* Changes */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">Proposed Changes</h3>
                <div className="space-y-2">
                  {activeScenario.changes.map((change, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex justify-between">
                        <span className="font-medium">{change.entityName}</span>
                        <span className="text-sm text-gray-500">{change.type}</span>
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {change.field}: {change.oldValue || 'Current'} → {change.newValue}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Impact Analysis */}
              {activeScenario.status !== 'draft' && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Impact Analysis</h3>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
                      <div className="text-2xl font-bold text-blue-600">
                        {activeScenario.impact.utilizationChange > 0 ? '+' : ''}
                        {activeScenario.impact.utilizationChange.toFixed(1)}%
                      </div>
                      <div className="text-sm text-gray-600">Utilization Change</div>
                    </div>

                    <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4">
                      <div className="text-2xl font-bold text-red-600">
                        {activeScenario.impact.conflictsCreated}
                      </div>
                      <div className="text-sm text-gray-600">New Conflicts</div>
                    </div>

                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
                      <div className="text-2xl font-bold text-green-600">
                        {activeScenario.impact.conflictsResolved}
                      </div>
                      <div className="text-sm text-gray-600">Resolved Conflicts</div>
                    </div>

                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
                      <div className="text-2xl font-bold text-purple-600">
                        ${Math.abs(activeScenario.impact.costImpact).toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-600">
                        {activeScenario.impact.costImpact > 0 ? 'Cost Increase' : 'Cost Savings'}
                      </div>
                    </div>
                  </div>

                  {/* Timeline Impact */}
                  <div className="mb-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-amber-600" />
                      <span className="font-medium">Timeline Impact:</span>
                      <span className={activeScenario.impact.timelineImpact === 'On track' ? 'text-green-600' : 'text-amber-600'}>
                        {activeScenario.impact.timelineImpact}
                      </span>
                    </div>
                  </div>

                  {/* Affected Employees */}
                  {activeScenario.impact.affectedEmployees.length > 0 && (
                    <div className="mb-6">
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Affected Employees
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {activeScenario.impact.affectedEmployees.map((emp, index) => (
                          <span key={index} className="px-3 py-1 bg-gray-100 rounded-full text-sm">
                            {emp}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recommendations */}
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-blue-600" />
                      AI Recommendations
                    </h4>
                    <ul className="space-y-1">
                      {activeScenario.impact.recommendations.map((rec, index) => (
                        <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                          <span className="text-blue-600 mt-0.5">•</span>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                Select or Create a Scenario
              </h3>
              <p className="text-gray-500">
                Choose a saved scenario or create a new one to begin analysis
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
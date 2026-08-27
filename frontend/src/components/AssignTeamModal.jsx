import React, { useState, useEffect } from 'react';
import { Users, X, Check, ShieldCheck, HardHat, RefreshCw, Sparkles, Building2, AlertCircle } from 'lucide-react';
import { masterDataApi } from '../api/masterDataApi';

const DEFAULT_MUNICIPAL_DEPARTMENTS = [
  { id: 'dept-roads', name: 'Civil / Roads', code: 'ROADS', description: 'Handles roads, potholes, footpath repairs, and road infrastructure' },
  { id: 'dept-sanitation', name: 'Sanitation / Solid Waste', code: 'SANITATION', description: 'Handles garbage collection, street dumping, and waste management' },
  { id: 'dept-ugd', name: 'Drainage / Public Works', code: 'UGD', description: 'Handles underground drainage, water leakage, and manhole safety' },
  { id: 'dept-electrical', name: 'Electrical Grid', code: 'ELECTRICAL', description: 'Handles street lights, power failure, and electrical civic infrastructure' },
  { id: 'dept-general', name: 'Other Municipal Services', code: 'GENERAL', description: 'General municipal response division' }
];

const getRecommendedDeptCode = (category = '') => {
  const cat = category.toLowerCase();
  if (cat.includes('pothole') || cat.includes('road') || cat.includes('footpath') || cat.includes('tree')) return 'ROADS';
  if (cat.includes('garbage') || cat.includes('waste') || cat.includes('dump')) return 'SANITATION';
  if (cat.includes('drainage') || cat.includes('water') || cat.includes('manhole') || cat.includes('leakage')) return 'UGD';
  if (cat.includes('street') || cat.includes('light') || cat.includes('electrical')) return 'ELECTRICAL';
  return 'GENERAL';
};

const AssignTeamModal = ({ isOpen, onClose, incident, onAssign }) => {
  const [departments, setDepartments] = useState(DEFAULT_MUNICIPAL_DEPARTMENTS);
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);

  const category = incident?.category || '';
  const recommendedCode = getRecommendedDeptCode(category);

  useEffect(() => {
    if (isOpen) {
      const loadDepts = async () => {
        try {
          setFetchingData(true);
          const res = await masterDataApi.getDepartments();
          if (res?.success && res?.data?.departments && res.data.departments.length > 0) {
            const list = res.data.departments.map(d => ({
              ...d,
              description: d.description || DEFAULT_MUNICIPAL_DEPARTMENTS.find(dm => dm.code === d.code)?.description || 'Municipal service response division'
            }));
            setDepartments(list);

            // Auto-select recommended department if available
            const recommendedDept = list.find(d => d.code === recommendedCode) || list[0];
            setSelectedDeptId(recommendedDept.id);
          } else {
            setDepartments(DEFAULT_MUNICIPAL_DEPARTMENTS);
            const rec = DEFAULT_MUNICIPAL_DEPARTMENTS.find(d => d.code === recommendedCode) || DEFAULT_MUNICIPAL_DEPARTMENTS[0];
            setSelectedDeptId(rec.id);
          }
        } catch (err) {
          console.warn('[ASSIGN DEPT] Using municipal fallback departments:', err);
          setDepartments(DEFAULT_MUNICIPAL_DEPARTMENTS);
          const rec = DEFAULT_MUNICIPAL_DEPARTMENTS.find(d => d.code === recommendedCode) || DEFAULT_MUNICIPAL_DEPARTMENTS[0];
          setSelectedDeptId(rec.id);
        } finally {
          setFetchingData(false);
        }
      };
      loadDepts();
    }
  }, [isOpen, category]);

  if (!isOpen || !incident) return null;

  const currentDeptName = incident.departments?.name || (incident.department_id ? 'Assigned Division' : null);

  const handleConfirmAssignment = async () => {
    if (!selectedDeptId) return;

    try {
      setLoading(true);
      const selectedDept = departments.find(d => d.id === selectedDeptId) || departments[0];
      await onAssign(incident.id, selectedDept);
      onClose();
    } catch (err) {
      console.error('[ASSIGN DEPT] Error assigning department:', err);
    } finally {
      setLoading(false);
    }
  };

  const selectedDeptObj = departments.find(d => d.id === selectedDeptId);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Modal Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#237A52] text-white flex items-center justify-center font-bold">
              <HardHat className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-tight text-white">Assign Field Dispatch Department</h3>
              <p className="text-[11px] text-emerald-200 font-medium">Incident #{incident.id.slice(0, 8).toUpperCase()} • {category}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          
          {/* Incident Summary Card */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-slate-900 text-sm">{category || 'Civic Incident'}</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-[#237A52] font-extrabold text-[10px]">
                {incident.report_count || 1} Citizen {incident.report_count === 1 ? 'Report' : 'Reports'} Merged
              </span>
            </div>

            <div className="text-[11px] text-slate-500 font-medium">
              Location: {incident.address || incident.location_name || 'Davangere Municipal Zone'}
            </div>

            {currentDeptName && (
              <div className="pt-1 text-[11px] font-bold text-amber-700 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Currently Assigned: {currentDeptName} (Reassignment will create an audit record)</span>
              </div>
            )}
          </div>

          {/* Department Selection List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider block">
                Select Municipal Response Division <span className="text-red-500">*</span>
              </label>
              <span className="text-[10px] text-slate-400 font-bold">5 Departments Available</span>
            </div>

            {fetchingData ? (
              <div className="p-8 text-center text-xs text-slate-400 font-medium flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-[#237A52]" />
                <span>Loading municipal departments...</span>
              </div>
            ) : (
              <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                {departments.map((dept) => {
                  const isSelected = selectedDeptId === dept.id;
                  const isRecommended = dept.code === recommendedCode;

                  return (
                    <div
                      key={dept.id}
                      onClick={() => setSelectedDeptId(dept.id)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start justify-between ${
                        isSelected
                          ? 'border-[#237A52] bg-emerald-50/60 shadow-2xs'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="space-y-1 pr-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 text-xs">{dept.name}</span>
                          
                          {isRecommended && (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-black flex items-center gap-1 border border-emerald-200">
                              <Sparkles className="w-3 h-3 text-emerald-600" />
                              <span>RECOMMENDED</span>
                            </span>
                          )}

                          <span className="px-1.5 py-0.25 rounded text-[9px] font-extrabold bg-slate-100 text-slate-600">
                            {dept.code}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                          {dept.description}
                        </p>
                      </div>

                      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                        isSelected ? 'bg-[#237A52] text-white' : 'border border-slate-300'
                      }`}>
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-[11px] text-slate-500 font-bold truncate max-w-[200px]">
            {selectedDeptObj ? `Selected: ${selectedDeptObj.name}` : 'Select a department'}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleConfirmAssignment}
              disabled={loading || fetchingData || !selectedDeptId}
              className="px-5 py-2.5 rounded-xl bg-[#166534] hover:bg-[#14532D] disabled:opacity-50 text-white text-xs font-extrabold shadow-sm transition-all flex items-center gap-2 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{loading ? 'Assigning...' : 'Confirm Department Assignment'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AssignTeamModal;

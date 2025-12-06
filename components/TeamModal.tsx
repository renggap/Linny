
import React, { useState } from 'react';
import { X, Users } from 'lucide-react';

interface TeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, icon: string) => void;
}

export const TeamModal: React.FC<TeamModalProps> = ({ isOpen, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('🛸');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name) {
      onSave(name, icon);
      onClose();
      setName('');
      setIcon('🛸');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#25262B] w-[400px] rounded-xl shadow-2xl border border-[#363840] p-6 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white flex items-center">
            <Users className="w-4 h-4 mr-2 text-gray-400" />
            Create Team
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">Team Name</label>
            <input 
              type="text" 
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-[#191A1F] border border-[#363840] rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-[#5E6AD2] transition-colors"
              placeholder="e.g. Customer Support"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">Icon (Emoji)</label>
            <input 
              type="text" 
              value={icon}
              onChange={e => setIcon(e.target.value)}
              className="w-full bg-[#191A1F] border border-[#363840] rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-[#5E6AD2] transition-colors"
              placeholder="🛸"
              maxLength={2}
            />
          </div>

          <div className="pt-2 flex justify-end space-x-2">
            <button type="button" onClick={onClose} className="px-3 py-2 text-xs font-medium text-gray-400 hover:text-white transition-colors">Cancel</button>
            <button 
                type="submit" 
                disabled={!name} 
                className={`px-3 py-2 bg-[#5E6AD2] hover:bg-[#4b55aa] text-white text-xs font-semibold rounded transition-colors shadow-lg shadow-purple-900/20 ${!name ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                Create Team
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

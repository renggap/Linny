
import React, { useState } from 'react';
import { X, Briefcase } from 'lucide-react';
import { Team } from '../types';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  teams: Team[];
  onSave: (name: string, identifier: string, icon: string, teamId: string) => void;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({ isOpen, onClose, teams, onSave }) => {
  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [icon, setIcon] = useState('⚡');
  const [teamId, setTeamId] = useState(teams[0]?.id || '');

  if (!isOpen) return null;

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setName(newName);
    // Auto-generate identifier if empty
    if (!identifier && newName.length >= 3) {
      setIdentifier(newName.substring(0, 3).toUpperCase());
    }
  };

  const handleIdentifierChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Enforce 3 uppercase letters
    const val = e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
    setIdentifier(val);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && identifier && teamId) {
      onSave(name, identifier, icon, teamId);
      onClose();
      setName('');
      setIdentifier('');
      setIcon('⚡');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-[#25262B] w-[400px] rounded-xl shadow-2xl border border-[#363840] p-6 animate-in zoom-in-95">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white flex items-center">
            <Briefcase className="w-4 h-4 mr-2 text-gray-400" />
            Create Project
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">Team</label>
            <select
              value={teamId}
              onChange={e => setTeamId(e.target.value)}
              className="w-full bg-[#191A1F] border border-[#363840] rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-[#5E6AD2]"
            >
              {teams.map(t => (
                <option key={t.id} value={t.id} className="bg-[#25262B] text-white">
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">Project Name</label>
            <input
              type="text"
              value={name}
              onChange={handleNameChange}
              className="w-full bg-[#191A1F] border border-[#363840] rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-[#5E6AD2]"
              placeholder="e.g. Website Redesign"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">Identifier (3 Letters)</label>
            <input
              type="text"
              value={identifier}
              onChange={handleIdentifierChange}
              className="w-full bg-[#191A1F] border border-[#363840] rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-[#5E6AD2] font-mono tracking-wider"
              placeholder="WEB"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">Icon</label>
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-[#191A1F] border border-[#363840] rounded-lg flex items-center justify-center text-2xl">
                {icon}
              </div>
              <div className="flex-1 grid grid-cols-8 gap-1 p-2 bg-[#191A1F] border border-[#363840] rounded-lg max-h-24 overflow-y-auto">
                {['⚡', '🚀', '💡', '🎯', '📦', '🔧', '🎨', '📱',
                  '💻', '🌐', '📊', '📈', '🔒', '🛡️', '⚙️', '🔨',
                  '📁', '📂', '💼', '🗂️', '📋', '✅', '🎉', '⭐',
                  '💎', '🔥', '❤️', '💚', '💙', '💜', '🧡', '💛'].map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setIcon(emoji)}
                      className={`w-7 h-7 flex items-center justify-center rounded hover:bg-[#363840] transition-colors text-base ${icon === emoji ? 'bg-[#5E6AD2]/30 ring-1 ring-[#5E6AD2]' : ''}`}
                    >
                      {emoji}
                    </button>
                  ))}
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end space-x-2">
            <button type="button" onClick={onClose} className="px-3 py-2 text-xs font-medium text-gray-400 hover:text-white">Cancel</button>
            <button
              type="submit"
              disabled={!name || identifier.length !== 3}
              className={`px-3 py-2 bg-[#5E6AD2] hover:bg-[#4b55aa] text-white text-xs font-semibold rounded transition-colors ${(!name || identifier.length !== 3) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Create Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
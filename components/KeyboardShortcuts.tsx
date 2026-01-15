
import React from 'react';
import { X } from 'lucide-react';

interface Shortcut {
    key: string;
    ctrl?: boolean;
    shift?: boolean;
    description: string;
}

interface KeyboardShortcutsProps {
    isOpen: boolean;
    onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsProps> = ({ isOpen, onClose }) => {
    const shortcuts: Shortcut[] = [
        { key: 'C', description: 'Create new issue' },
        { key: 'I', description: 'Open inbox' },
        { key: 'F', description: 'Search workspace' },
        { key: 'K', description: 'Open command menu' },
        { key: 'G', description: 'Go to projects' },
        { key: '?', description: 'Show help' },
        { key: 'ESC', description: 'Close current modal' }
    ];

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 animate-in fade-in duration-200" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="bg-[#1A1B1F] w-[500px] rounded-xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] border border-[#363840]/40 overflow-hidden animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-center justify-between px-8 h-14 border-b border-[#363840]/30 shrink-0">
                    <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Interface Hotkeys</h2>
                    <button onClick={onClose} className="p-1 text-gray-600 hover:text-white hover:bg-[#25262B] rounded transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 space-y-6">
                    <div className="grid gap-3">
                        {shortcuts.map((shortcut, index) => (
                            <div
                                key={index}
                                className="flex items-center justify-between p-3 bg-[#25262B]/20 border border-[#363840]/20 rounded-lg group hover:border-[#5E6AD2]/30 transition-colors"
                            >
                                <span className="text-[13px] font-medium text-gray-400 group-hover:text-gray-200">
                                    {shortcut.description}
                                </span>
                                <div className="flex items-center space-x-1.5">
                                    {shortcut.ctrl && (
                                        <kbd className="px-2 py-1 bg-[#1A1B1F] border border-[#363840] rounded text-[10px] font-mono text-gray-500">CTRL</kbd>
                                    )}
                                    <kbd className="px-2 py-1 bg-[#1A1B1F] border border-[#363840] rounded text-[10px] font-mono text-[#5E6AD2] font-bold">{shortcut.key}</kbd>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="pt-6 border-t border-[#363840]/10">
                        <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest text-center">Global input listener active</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default KeyboardShortcutsModal;

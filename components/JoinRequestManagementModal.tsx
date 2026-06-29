import React, { useEffect } from 'react';
import { X, Users, UserPlus, Check, X as XIcon, Clock, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useJoinRequests } from '../hooks/useJoinRequests';
import { useApproveJoinRequest, useRejectJoinRequest } from '../hooks/useJoinRequests';
import { JoinRequest } from '../types';
import { UserAvatar } from './UserAvatar';

interface JoinRequestManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const JoinRequestManagementModal: React.FC<JoinRequestManagementModalProps> = ({
  isOpen,
  onClose
}) => {
  console.log('[JoinRequestManagementModal] Rendered, isOpen:', isOpen);

  const { data: joinRequests = [], isLoading, error, refetch } = useJoinRequests();
  const approveMutation = useApproveJoinRequest();
  const rejectMutation = useRejectJoinRequest();

  console.log('[JoinRequestManagementModal] Query state:', {
    isLoading,
    dataLength: joinRequests.length,
    error: error?.message,
    data: joinRequests
  });

  useEffect(() => {
    console.log('[JoinRequestManagementModal] isOpen changed, refetching...');
    refetch();
  }, [isOpen, refetch]);

  if (!isOpen) return null;

  const pendingRequests = joinRequests.filter(req => req.status === 'pending');

  const handleApprove = async (requestId: string) => {
    try {
      await approveMutation.mutateAsync(requestId);
    } catch (error: any) {
      alert(error.message || 'Failed to approve request');
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      await rejectMutation.mutateAsync(requestId);
    } catch (error: any) {
      alert(error.message || 'Failed to reject request');
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-[#070809]/80 backdrop-blur-sm"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-[#0F1014] w-full max-w-[600px] h-[70vh] rounded-[32px] shadow-[0_48px_140px_-20px_rgba(0,0,0,0.9)] border border-[#22242A] flex flex-col overflow-hidden relative z-10"
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between px-10 h-20 border-b border-[#1A1C23] bg-[#14151A]/30 shrink-0">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-[#1A1C23] border border-[#2C2D35] rounded-xl flex items-center justify-center shadow-inner">
                <Users className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#E8E8E8] tracking-tight">
                  Join Requests
                </h2>
                <div className="flex items-center space-x-2 mt-0.5">
                  <span className="text-[9px] font-black text-[#5E6068] uppercase tracking-[0.3em]">
                    {pendingRequests.length} PENDING
                  </span>
                </div>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-[#5E6068] hover:text-[#E8E8E8] hover:bg-[#1C1D24] rounded-xl transition-all">
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto no-scrollbar py-2">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              </div>
            ) : pendingRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full px-10">
                <div className="w-16 h-16 bg-[#1A1C23] rounded-2xl flex items-center justify-center mb-4">
                  <Clock className="w-8 h-8 text-[#5E6068]" />
                </div>
                <h3 className="text-lg font-semibold text-[#E8E8E8] mb-2">No Pending Requests</h3>
                <p className="text-sm text-[#5E6068] text-center">
                  When users apply to join your workspace, their requests will appear here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#1A1C23]/50">
                {pendingRequests.map((request, idx) => (
                  <motion.div
                    key={request.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className="flex items-center justify-between px-10 py-5 hover:bg-[#14151A]/30 transition-all group"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="relative">
                        <UserAvatar
                          name={request.user?.name || 'Unknown'}
                          size="lg"
                          className="rounded-xl"
                        />
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#1A1C23] rounded-lg flex items-center justify-center border-2 border-[#0F1014]">
                          <span className="text-xs">{request.team?.icon || '📁'}</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-bold text-[#E8E8E8] tracking-tight">
                          {request.user?.name || 'Unknown User'}
                        </div>
                        <div className="text-xs text-[#5E6068] mt-0.5">
                          {request.user?.email || 'No email'}
                        </div>
                        <div className="text-xs text-[#5E6AD8] mt-1">
                          wants to join {request.team?.name || 'Unknown Workspace'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleReject(request.id)}
                        disabled={rejectMutation.isPending}
                        className="p-2.5 text-[#5E6068] hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all disabled:opacity-50"
                        title="Reject"
                      >
                        <XIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleApprove(request.id)}
                        disabled={approveMutation.isPending}
                        className="px-4 py-2.5 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-xl flex items-center transition-all disabled:opacity-50"
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Approve
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-10 py-4 border-t border-[#1A1C23] bg-[#14151A]/10 shrink-0">
            <p className="text-xs text-[#5E6068] text-center">
              Approved users will be added as team members and receive a notification
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

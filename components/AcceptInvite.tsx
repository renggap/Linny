import React, { useEffect, useState } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { Mail, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface InvitationData {
  team: {
    id: string;
    name: string;
    icon: string;
  };
  role: string;
  email: string;
}

export const AcceptInvite: React.FC = () => {
  const navigate = useNavigate();
  const search = useSearch({ from: '/accept-invite' });
  const { user, isAuthenticated } = useAuth();
  const token = (search as { token?: string }).token;

  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const checkInvitation = async () => {
      if (!token) {
        setError('Tidak ada token undangan');
        setLoading(false);
        return;
      }

      try {
        const response = await api.invitations.checkInvite(token);
        if (!response) {
          setError('Undangan tidak valid atau kadaluarsa');
          setLoading(false);
          return;
        }
        setInvitation(response);
        setLoading(false);

        // If already authenticated, auto-accept
        if (isAuthenticated && user) {
          await acceptInvitation();
        }
      } catch (err: any) {
        setError(err.message || 'Undangan tidak valid atau kadaluarsa');
        setLoading(false);
      }
    };

    checkInvitation();
  }, [token, isAuthenticated, user]);

  const acceptInvitation = async () => {
    if (!token) return;

    setAccepting(true);
    try {
      await api.invitations.acceptInvite(token);
      setSuccess(true);
      setAccepting(false);

      // Redirect to team after 2 seconds
      setTimeout(() => {
        if (invitation) {
          navigate({ to: '/team/$teamSlug', params: { teamSlug: invitation.team.name.toLowerCase().replace(/\s+/g, '-') } });
        }
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Gagal menerima undangan');
      setAccepting(false);
    }
  };

  const handleRegister = () => {
    navigate({
      to: '/',
      search: { inviteEmail: invitation?.email, inviteToken: token || undefined }
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1E1F24] flex items-center justify-center p-6">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-[#5E6AD2] animate-spin mx-auto mb-4" />
          <p className="text-[#DEDEDE]">Mengecek undangan...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#1E1F24] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-[#2A2B30] rounded-2xl p-8 border border-[#3E3F46]">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white text-center mb-2">Undangan Tidak Valid</h1>
          <p className="text-[#9CA3AF] text-center mb-6">{error}</p>
          <button
            onClick={() => navigate({ to: '/' })}
            className="w-full px-4 py-3 bg-[#5E6AD2] hover:bg-[#5E6AD2]/80 rounded-lg text-white transition-colors"
          >
            Kembali ke Beranda
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#1E1F24] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-[#2A2B30] rounded-2xl p-8 border border-[#3E3F46]">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white text-center mb-2">Undangan Diterima!</h1>
          <p className="text-[#DEDEDE] text-center mb-2">
            Kakak sekarang anggota team <strong>{invitation?.team.name}</strong>
          </p>
          <p className="text-[#9CA3AF] text-center text-sm">
            Mengalihkan ke workspace...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#1E1F24] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-[#2A2B30] rounded-2xl p-8 border border-[#3E3F46]">
          <Mail className="w-16 h-16 text-[#5E6AD2] mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white text-center mb-2">Undangan ke Team</h1>
          <p className="text-[#DEDEDE] text-center mb-6">
            Kakak diundang gabung ke <strong>{invitation?.team.name}</strong> sebagai <strong>{invitation?.role}</strong>
          </p>

          <div className="bg-[#1E1F24] rounded-lg p-4 mb-6">
            <p className="text-sm text-[#9CA3AF] mb-2">Email undangan:</p>
            <p className="text-[#DEDEDE] font-medium">{invitation?.email}</p>
          </div>

          <button
            onClick={handleRegister}
            className="w-full px-4 py-3 bg-[#5E6AD2] hover:bg-[#5E6AD2]/80 rounded-lg text-white transition-colors mb-3"
          >
            Daftar & Gabung Team
          </button>
          <p className="text-xs text-[#9CA3AF] text-center">
            Atau login kalau kakak udah punya akun
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1E1F24] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-[#2A2B30] rounded-2xl p-8 border border-[#3E3F46]">
        <Mail className="w-16 h-16 text-[#5E6AD2] mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white text-center mb-2">Undangan ke Team</h1>
        <p className="text-[#DEDEDE] text-center mb-6">
          Kakak diundang gabung ke <strong>{invitation?.team.name}</strong> sebagai <strong>{invitation?.role}</strong>
        </p>

        <button
          onClick={acceptInvitation}
          disabled={accepting}
          className="w-full px-4 py-3 bg-[#5E6AD2] hover:bg-[#5E6AD2]/80 rounded-lg text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {accepting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Menerima...
            </>
          ) : (
            'Terima Undangan'
          )}
        </button>
      </div>
    </div>
  );
};

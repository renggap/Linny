
import React, { useState, useEffect } from 'react';
import { Sparkles } from './Icons';
import { User } from '../types';

interface AuthProps {
  users: User[];
  onLogin: (user: User) => void;
  onSignup: (name: string, email: string, pass: string) => void;
}

export const Auth: React.FC<AuthProps> = ({ users, onLogin, onSignup }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [inviteMode, setInviteMode] = useState(false);

  useEffect(() => {
    // Check for invite params
    const params = new URLSearchParams(window.location.search);
    const inviteEmail = params.get('inviteEmail');
    if (inviteEmail) {
        setIsLogin(false);
        setEmail(inviteEmail);
        setInviteMode(true);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isLogin) {
      const user = users.find(u => u.email === email && u.password === password);
      if (user) {
        onLogin(user);
      } else {
        setError('Invalid credentials');
      }
    } else {
      if (!email || !password || !name) {
        setError('All fields are required');
        return;
      }
      if (users.find(u => u.email === email)) {
        // If user exists, try to log them in automatically if password matches (simplification)
        // Or show error
        setError('Email already exists. Please log in.');
        return;
      }
      onSignup(name, email, password);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#1E1F24] items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#25262B] border border-[#363840] rounded-xl p-8 shadow-2xl">
        <div className="flex flex-col items-center mb-8">
           <div className="w-10 h-10 bg-[#5E6AD2] rounded-lg flex items-center justify-center text-white mb-4 shadow-lg shadow-[#5E6AD2]/20">
             <Sparkles className="w-5 h-5" />
           </div>
           <h1 className="text-2xl font-bold text-white tracking-tight">Linear Clone</h1>
           <p className="text-gray-500 mt-2 text-sm">
               {inviteMode ? 'Accept your invitation to join' : 'Log in to manage your projects'}
           </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">Full Name</label>
              <input 
                type="text" 
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-[#191A1F] border border-[#363840] rounded-md px-3 py-2 text-sm text-white focus:border-[#5E6AD2] focus:outline-none transition-colors"
                placeholder="Jane Doe"
              />
            </div>
          )}
          
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">Email</label>
            <input 
              type="email" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={inviteMode} // Lock email if coming from invite
              className={`w-full bg-[#191A1F] border border-[#363840] rounded-md px-3 py-2 text-sm text-white focus:border-[#5E6AD2] focus:outline-none transition-colors ${inviteMode ? 'opacity-50 cursor-not-allowed' : ''}`}
              placeholder="name@company.com"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-[#191A1F] border border-[#363840] rounded-md px-3 py-2 text-sm text-white focus:border-[#5E6AD2] focus:outline-none transition-colors"
              placeholder="••••••••"
            />
          </div>

          {error && <div className="text-red-500 text-xs">{error}</div>}

          <button 
            type="submit"
            className="w-full bg-[#5E6AD2] hover:bg-[#4b55aa] text-white font-medium py-2 rounded-md transition-colors shadow-lg shadow-purple-900/20"
          >
            {isLogin ? 'Log In' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 text-center">
          {!inviteMode && (
            <button 
                onClick={() => { setIsLogin(!isLogin); setError(''); }}
                className="text-sm text-gray-500 hover:text-[#5E6AD2] transition-colors"
            >
                {isLogin ? "Don't have an account? Sign up" : "Already have an account? Log in"}
            </button>
          )}
          {inviteMode && (
              <button 
                  onClick={() => { setInviteMode(false); setIsLogin(true); setEmail(''); }}
                  className="text-sm text-gray-500 hover:text-[#5E6AD2] transition-colors"
              >
                  Cancel invitation
              </button>
          )}
        </div>
      </div>
    </div>
  );
};

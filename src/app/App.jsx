import React, { useEffect } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { FinanceProvider, useFinance } from '@/context/FinanceContext';
import BottomNav from '@/components/layout/BottomNav';
import Toast from '@/components/layout/Toast';
import LoadingScreen from '@/components/layout/LoadingScreen';
import AddTransactionModal from '@/components/modals/AddTransactionModal';
import TransferModal from '@/components/modals/TransferModal';
import AIAssistantModal from '@/components/modals/AIAssistantModal';
import AIProposalModal from '@/components/modals/AIProposalModal';
import AIInsightsModal from '@/components/modals/AIInsightsModal';
import NewGoalModal from '@/components/modals/NewGoalModal';
import FriendQrModal from '@/components/modals/FriendQrModal';
import AIAssistantFab from '@/components/common/AIAssistantFab';

import DashboardPage from '@/pages/DashboardPage';
import CalendarPage from '@/pages/CalendarPage';
import TransactionsPage from '@/pages/TransactionsPage';
import WalletsPage from '@/pages/WalletsPage';
import RankingPage from '@/pages/RankingPage';
import FriendsPage from '@/pages/FriendsPage';
import SettingsPage from '@/pages/SettingsPage';
import LoginPage from '@/pages/LoginPage';

function MainAppShell() {
  const { isLoggedIn, loading } = useAuth();
  const {
    activeTab,
    setIsAIAssistantOpen,
    setIsAddTxOpen,
    setIsTransferOpen,
    setIsAIProposalOpen,
    setIsAIInsightsOpen,
    setIsNewGoalOpen,
    setIsFriendQrOpen
  } = useFinance();

  // Global hotkeys (Ctrl+K for AI Assistant, Escape to dismiss sheets)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsAIAssistantOpen(prev => !prev);
      } else if (e.key === 'Escape') {
        setIsAIAssistantOpen(false);
        setIsAddTxOpen(false);
        setIsTransferOpen(false);
        setIsAIProposalOpen(false);
        setIsAIInsightsOpen(false);
        setIsNewGoalOpen(false);
        setIsFriendQrOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    setIsAIAssistantOpen,
    setIsAddTxOpen,
    setIsTransferOpen,
    setIsAIProposalOpen,
    setIsAIInsightsOpen,
    setIsNewGoalOpen,
    setIsFriendQrOpen
  ]);

  if (loading) {
    return <LoadingScreen message="Đang khởi động FinTrack Pro..." />;
  }

  if (!isLoggedIn) {
    return <LoginPage />;
  }

  return (
    <div className="mobile-viewport" id="mobileApp">
      {/* Screen container */}
      <div className="screen-container">
        {activeTab === 'dashboard' && <DashboardPage />}
        {activeTab === 'calendar' && <CalendarPage />}
        {activeTab === 'transactions' && <TransactionsPage />}
        {activeTab === 'wallets' && <WalletsPage />}
        {activeTab === 'ranking' && <RankingPage />}
        {activeTab === 'friends' && <FriendsPage />}
        {activeTab === 'settings' && <SettingsPage />}
      </div>

      {/* Magic UI Shimmer AI FAB */}
      <AIAssistantFab />

      {/* Bottom Nav */}
      <BottomNav />

      {/* Modals & Sheets */}
      <AddTransactionModal />
      <TransferModal />
      <AIAssistantModal />
      <AIProposalModal />
      <AIInsightsModal />
      <NewGoalModal />
      <FriendQrModal />

      {/* Global Toast */}
      <Toast />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <FinanceProvider>
        <MainAppShell />
      </FinanceProvider>
    </AuthProvider>
  );
}

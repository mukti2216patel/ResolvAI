import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import ReplyForm from '@/components/ReplyForm';
import DOMPurify from 'dompurify';
import TicketDetail from '@/components/TicketDetail';
import UpdateTicket from '@/components/UpdateTicket';
import { 
  ArrowLeft, 
  AlertCircle
} from 'lucide-react';
import type { Ticket, TicketStatus, TicketPriority, TicketCategory } from '@/types';
import { UserRole } from '@/types';
import { authClient } from '@/lib/auth-client';
import { getTicketSender } from '@/lib/utils';

// Details components styling and constants are located inside client/src/components/TicketDetail.tsx
export default function TicketDetails() {
  const { id } = useParams<{ id: string }>();
  const ticketNumber = parseInt(id || '', 10);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: session } = authClient.useSession();
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const replyMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await axios.post(`/api/tickets/${ticketNumber}/replies`, { content });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketNumber] });
      queryClient.invalidateQueries({ queryKey: ['ticketStats'] });
      showToast('Reply submitted successfully', 'success');
    },
    onError: () => {
      showToast('Failed to submit reply', 'error');
    }
  });


  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const { data: ticket, isLoading, error } = useQuery<Ticket>({
    queryKey: ['ticket', ticketNumber],
    queryFn: async () => {
      const res = await axios.get<Ticket>(`/api/tickets/${ticketNumber}`);
      return res.data;
    },
    enabled: !isNaN(ticketNumber),
  });

  const { data: agents = [], isLoading: isLoadingAgents } = useQuery<any[]>({
    queryKey: ['agents'],
    queryFn: async () => {
      const res = await axios.get<any[]>('/api/agents');
      return res.data;
    },
    enabled: !!session,
  });

  const statusMutation = useMutation({
    mutationFn: async (status: TicketStatus) => {
      const res = await axios.patch(`/api/tickets/${ticketNumber}`, { status });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketNumber] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticketStats'] });
      showToast('Status updated successfully', 'success');
    },
    onError: () => {
      showToast('Failed to update status', 'error');
    }
  });

  const categoryMutation = useMutation({
    mutationFn: async (category: TicketCategory) => {
      const res = await axios.patch(`/api/tickets/${ticketNumber}`, { category });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketNumber] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticketStats'] });
      showToast('Category updated successfully', 'success');
    },
    onError: () => {
      showToast('Failed to update category', 'error');
    }
  });

  const assignMutation = useMutation({
    mutationFn: async (assignedToId: string | null) => {
      const res = await axios.patch(`/api/tickets/${ticketNumber}`, { assigned_to: assignedToId });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketNumber] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticketStats'] });
      showToast('Assignment updated successfully', 'success');
    },
    onError: () => {
      showToast('Failed to update assignment', 'error');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await axios.delete(`/api/tickets/${ticketNumber}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticketStats'] });
      navigate('/');
    },
  });

  const handleSignOut = async () => {
    await authClient.signOut();
    navigate('/login');
  };





  if (!session) {
    return null;
  }



  return (
    <>
      <header className="bg-gradient-to-br from-bg-secondary to-bg-card border-b border-border-color backdrop-blur-[20px] sticky top-0 z-[100]">
        <div className="max-w-[1200px] mx-auto py-4 px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-[1.8rem] drop-shadow-[0_0_8px_var(--color-accent-glow)]">🎫</span>
            <Link to="/" className="text-[1.5rem] font-extrabold bg-gradient-to-br from-accent to-[#a78bfa] bg-clip-text text-transparent tracking-[-0.02em] hover:opacity-90">
              Helpdesk
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[0.9rem] font-medium text-text-secondary">Welcome, {session.user.name}</span>
            {session.user.role === UserRole.ADMIN && (
              <Link 
                to="/users"
                className="inline-flex items-center gap-[6px] px-5 py-[10px] rounded-md font-sans text-sm font-semibold cursor-pointer transition-[0.2s_cubic-bezier(0.4,0,0.2,1)] whitespace-nowrap bg-transparent text-text-secondary border border-border-color hover:bg-bg-hover hover:text-text-primary"
              >
                Users
              </Link>
            )}
            <button 
              className="inline-flex items-center gap-[6px] px-5 py-[10px] rounded-md font-sans text-sm font-semibold cursor-pointer transition-[0.2s_cubic-bezier(0.4,0,0.2,1)] whitespace-nowrap bg-transparent text-text-secondary border border-border-color hover:bg-bg-hover hover:text-text-primary" 
              onClick={handleSignOut}
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1000px] mx-auto py-8 px-6">
        {/* Back Link */}
        <Link 
          to="/tickets" 
          className="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors mb-6 text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Tickets
        </Link>

        {isLoading ? (
          <div className="space-y-6 animate-pulse">
            <div className="h-10 bg-bg-card border border-border-color rounded-xl w-3/4" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-6">
                <div className="h-32 bg-bg-card border border-border-color rounded-xl" />
                <div className="h-48 bg-bg-card border border-border-color rounded-xl" />
              </div>
              <div className="h-64 bg-bg-card border border-border-color rounded-xl" />
            </div>
          </div>
        ) : error || !ticket ? (
          <div className="bg-bg-card border border-border-color rounded-xl p-8 text-center flex flex-col items-center justify-center gap-4">
            <AlertCircle className="w-12 h-12 text-danger" />
            <h2 className="text-xl font-bold">Ticket Not Found</h2>
            <p className="text-text-secondary max-w-md">
              The ticket you are looking for does not exist or you do not have permission to view it.
            </p>
            <Link 
              to="/" 
              className="px-5 py-2.5 bg-gradient-to-br from-accent to-[#8b5cf6] text-white font-semibold rounded-md shadow-glow hover:shadow-[0_0_40px_var(--color-accent-glow)] transition-all"
            >
              Return to Dashboard
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            
            {/* Left Content Area: Ticket Details */}
            <div className="md:col-span-2 space-y-6">
              
              {/* Ticket Basic Details */}
              <TicketDetail ticket={ticket} />

              {/* Replies Thread */}
              <div className="bg-bg-card border border-border-color rounded-xl p-6 shadow-md space-y-6">
                <h3 className="text-sm font-bold uppercase tracking-wider text-text-muted">Reply Thread</h3>
                
                {ticket.replies && ticket.replies.length > 0 ? (
                  <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                    {ticket.replies.map((reply) => {
                      let replySenderName = 'Unknown User';
                      let isReplyAuthorAgent = false;
                      let isReplyAuthorAdmin = false;
                      let isReplyAuthorAI = false;
                      const isCustomer = reply.senderType === 'customer';

                      if (isCustomer) {
                        const customerSender = getTicketSender({
                          ...ticket,
                          customerEmail: reply.customerEmail,
                          user: null,
                        });
                        replySenderName = reply.customerName || customerSender.name || 'Customer';
                      } else {
                        replySenderName = reply.user?.name || (reply.userId ? 'Unknown User' : 'AI Assistant');
                        isReplyAuthorAgent = reply.user?.role === 'agent';
                        isReplyAuthorAdmin = reply.user?.role === 'admin';
                        isReplyAuthorAI = !reply.user && !reply.userId;
                      }

                      let avatarBgClass = 'bg-accent/15 border border-accent/30 text-accent';
                      if (isCustomer) {
                        avatarBgClass = 'bg-[rgba(78,205,196,0.15)] border border-[rgba(78,205,196,0.3)] text-status-open';
                      } else if (isReplyAuthorAI) {
                        avatarBgClass = 'bg-purple-500/15 border border-purple-500/30 text-purple-400';
                      }

                      return (
                        <div key={reply.id} className="bg-bg-secondary/40 border border-border-color/60 rounded-xl p-4 flex gap-4 transition-all hover:bg-bg-secondary/60 animate-fadeIn">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-base font-bold shrink-0 ${avatarBgClass}`}>
                            {replySenderName.charAt(0).toUpperCase()}
                          </div>
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-text-primary truncate">
                                  {replySenderName}
                                </span>
                                {isReplyAuthorAdmin && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[0.65rem] font-bold uppercase tracking-wider bg-danger/10 text-danger border border-danger/20">
                                    Admin
                                  </span>
                                )}
                                {isReplyAuthorAgent && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[0.65rem] font-bold uppercase tracking-wider bg-accent/10 text-accent border border-accent/20">
                                    Agent
                                  </span>
                                )}
                                {isReplyAuthorAI && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[0.65rem] font-bold uppercase tracking-wider bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                    AI
                                  </span>
                                )}
                                {isCustomer && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[0.65rem] font-bold uppercase tracking-wider bg-[rgba(78,205,196,0.15)] text-status-open border border-[rgba(78,205,196,0.25)]">
                                    Customer
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-text-muted">
                                {new Date(reply.createdAt).toLocaleString()}
                              </span>
                            </div>
                            {reply.bodyHtml ? (
                              <div
                                className="text-sm text-text-primary leading-relaxed break-words"
                                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(reply.bodyHtml) }}
                              />
                            ) : (
                              <div className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed break-words">
                                {reply.content}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6 text-text-muted text-sm italic bg-bg-secondary/20 rounded-lg border border-dashed border-border-color">
                    No replies yet. Use the form below to start the conversation.
                  </div>
                )}
              </div>

              {/* Submit Reply Form */}
              <ReplyForm 
                onSubmit={(content) => replyMutation.mutateAsync(content)} 
                isPending={replyMutation.isPending} 
                customerName={ticket ? getTicketSender(ticket).name : undefined}
              />

            </div>

            {/* Right Sidebar: Control Panel */}
            <div className="space-y-6">
              <UpdateTicket 
                ticket={ticket}
                agents={agents || []}
                isLoadingAgents={isLoadingAgents}
                onStatusChange={(status) => statusMutation.mutate(status)}
                onCategoryChange={(category) => categoryMutation.mutate(category)}
                onAssignChange={(assignedToId) => assignMutation.mutate(assignedToId)}
                onDelete={() => deleteMutation.mutate()}
                isUpdatingStatus={statusMutation.isPending}
                isUpdatingCategory={categoryMutation.isPending}
                isUpdatingAssignment={assignMutation.isPending}
                isDeleting={deleteMutation.isPending}
              />
            </div>

          </div>
        )}
      </main>

      {/* Floating Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[1000] px-4 py-3 rounded-lg border shadow-lg flex items-center gap-2 animate-fadeIn ${
          toast.type === 'success' 
            ? 'bg-[rgba(78,205,196,0.15)] text-status-open border-[rgba(78,205,196,0.3)] backdrop-blur-md'
            : 'bg-[rgba(255,77,106,0.15)] text-danger border-[rgba(255,77,106,0.3)] backdrop-blur-md'
        }`}>
          <span className="text-sm font-semibold">{toast.message}</span>
        </div>
      )}
    </>
  );
}

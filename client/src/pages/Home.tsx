import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { authClient } from '@/lib/auth-client';
import AppLayout from '@/components/AppLayout';

const formatResolutionTime = (ms: number) => {
  if (!ms || ms <= 0) return 'N/A';
  const totalMinutes = Math.round(ms / 60000);
  if (totalMinutes < 60) {
    return `${totalMinutes}m`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
};

export default function Home() {
  const { data: session, isPending } = authClient.useSession();

  const { data: stats } = useQuery({
    queryKey: ['ticketStats'],
    queryFn: async () => {
      const res = await axios.get('/api/tickets/stats');
      return res.data as {
        totalTickets: number;
        openTickets: number;
        resolvedByAI: number;
        percentResolvedByAI: number;
        averageResolutionTimeMs: number;
        ticketsPerDay: {
          date: string;
          label: string;
          count: number;
        }[];
      };
    },
    enabled: !!session,
  });

  if (isPending) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-text-muted gap-4" style={{ height: '100vh' }}>
        <div className="w-9 h-9 border-[3px] border-border-color border-t-accent rounded-full animate-spin-slow" />
        <p>Loading session…</p>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return (
    <AppLayout>
      <div className="mb-6 border-b border-border-color/50 pb-5">
        <h2 className="text-2xl font-bold text-text-primary">Dashboard</h2>
      </div>

      {/* Dashboard Metrics Grid */}
      {stats && typeof stats.totalTickets === 'number' && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="relative bg-bg-card border border-border-color/60 rounded-lg p-5 shadow-md transition-all duration-300 hover:border-accent-theme/50 hover:shadow-[0_0_15px_rgba(0,240,255,0.12)] overflow-hidden group">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-accent-theme" />
            <span className="text-[0.68rem] font-mono font-bold uppercase tracking-wider text-text-secondary block before:content-['//_'] before:opacity-50">Total Tickets</span>
            <div className="text-[1.8rem] font-bold font-heading text-text-primary mt-2 font-mono tracking-tight">{stats.totalTickets}</div>
            <span className="text-[0.65rem] font-mono text-text-muted mt-2 block">database_records_loaded</span>
          </div>

          <div className="relative bg-bg-card border border-border-color/60 rounded-lg p-5 shadow-md transition-all duration-300 hover:border-accent-purple/50 hover:shadow-[0_0_15px_rgba(189,0,255,0.12)] overflow-hidden group">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#ffd700]" />
            <span className="text-[0.68rem] font-mono font-bold uppercase tracking-wider text-text-secondary block before:content-['//_'] before:opacity-50">Open Tickets</span>
            <div className="text-[1.8rem] font-bold font-heading text-[#ffd700] mt-2 font-mono tracking-tight">{stats.openTickets}</div>
            <span className="text-[0.65rem] font-mono text-text-muted mt-2 block">awaiting_agent_response</span>
          </div>

          <div className="relative bg-bg-card border border-border-color/60 rounded-lg p-5 shadow-md transition-all duration-300 hover:border-accent-theme/50 hover:shadow-[0_0_15px_rgba(0,240,255,0.12)] overflow-hidden group">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-accent-theme to-[#bd00ff]" />
            <div className="flex justify-between items-start">
              <span className="text-[0.68rem] font-mono font-bold uppercase tracking-wider text-text-secondary block before:content-['//_'] before:opacity-50">Resolved by AI</span>
              <span className="bg-accent-theme/10 text-accent-theme font-mono text-[0.6rem] font-bold px-1 py-0.5 rounded border border-accent-theme/30 text-center tracking-widest">AI</span>
            </div>
            <div className="text-[1.8rem] font-bold font-heading text-[#a78bfa] mt-2 font-mono tracking-tight">{stats.resolvedByAI}</div>
            <span className="text-[0.65rem] font-mono text-text-muted mt-2 block">auto_resolved_via_groq</span>
          </div>

          <div className="relative bg-bg-card border border-border-color/60 rounded-lg p-5 shadow-md transition-all duration-300 hover:border-accent-theme/50 hover:shadow-[0_0_15px_rgba(0,240,255,0.12)] overflow-hidden group">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-accent-theme to-[#bd00ff]" />
            <div className="flex justify-between items-start">
              <span className="text-[0.68rem] font-mono font-bold uppercase tracking-wider text-text-secondary block before:content-['//_'] before:opacity-50">AI Resolution %</span>
              <span className="bg-accent-theme/10 text-accent-theme font-mono text-[0.6rem] font-bold px-1 py-0.5 rounded border border-accent-theme/30 text-center tracking-widest">AI</span>
            </div>
            <div className="text-[1.8rem] font-bold font-heading text-[#a78bfa] mt-2 font-mono tracking-tight">{stats.percentResolvedByAI}%</div>
            <span className="text-[0.65rem] font-mono text-text-muted mt-2 block">ratio_of_total_traffic</span>
          </div>

          <div className="relative bg-bg-card border border-border-color/60 rounded-lg p-5 shadow-md transition-all duration-300 hover:border-accent-theme/50 hover:shadow-[0_0_15px_rgba(0,240,255,0.12)] overflow-hidden group">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#00ff88]" />
            <span className="text-[0.68rem] font-mono font-bold uppercase tracking-wider text-text-secondary block before:content-['//_'] before:opacity-50">Avg Resolution Time</span>
            <div className="text-[1.8rem] font-bold font-heading text-[#00ff88] mt-2 font-mono tracking-tight">
              {formatResolutionTime(stats.averageResolutionTimeMs)}
            </div>
            <span className="text-[0.65rem] font-mono text-text-muted mt-2 block">mean_time_to_close_state</span>
          </div>
        </div>
      )}

      {/* Ticket Volume Bar Chart */}
      {stats && Array.isArray(stats.ticketsPerDay) && (
        <div className="bg-bg-card border border-border-color/60 rounded-lg p-6 shadow-lg mb-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#00f0ff] to-[#bd00ff] opacity-50" />
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-sm font-bold font-heading uppercase tracking-widest text-text-primary">// TRAFFIC_FLOW_MONITOR</h3>
              <p className="text-xs font-mono text-text-secondary mt-1">Total tickets created per day over the past 30 days</p>
            </div>
            <span className="text-xs font-mono bg-bg-primary border border-border-color text-text-secondary px-2.5 py-1 rounded tracking-wider uppercase">
              LAST_30_DAYS
            </span>
          </div>

          <div className="h-[200px] flex items-end gap-[6px] md:gap-[10px] w-full select-none pt-4 relative">
            {/* Gridlines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none border-b border-border-color/20 pb-6 pt-4">
              {[0, 1, 2, 3, 4].map((i) => {
                const maxVal = Math.max(...stats.ticketsPerDay.map((d) => d.count), 5);
                const val = Math.round(maxVal * (1 - i / 4));
                return (
                  <div key={i} className="w-full flex items-center justify-between border-t border-border-color/10 h-0 relative">
                    <span className="absolute -left-1 -translate-x-full text-[0.6rem] font-mono font-semibold text-text-muted bg-bg-card px-1.5">
                      {val}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Bars */}
            <div className="flex items-end gap-1.5 md:gap-3 w-full h-[160px] z-10 px-2">
              {stats.ticketsPerDay.map((d, index) => {
                const maxVal = Math.max(...stats.ticketsPerDay.map((d) => d.count), 5);
                const heightPercent = maxVal > 0 ? (d.count / maxVal) * 100 : 0;
                return (
                  <div
                    key={d.date}
                    className="flex-1 flex flex-col items-center group relative cursor-pointer"
                    style={{ height: '100%' }}
                  >
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-2 bg-bg-secondary/95 border border-border-color/80 text-text-primary text-[0.7rem] px-2.5 py-1.5 rounded shadow-xl opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all pointer-events-none whitespace-nowrap z-30 flex flex-col gap-0.5 items-center font-mono">
                      <span className="font-bold text-[0.72rem] text-accent-theme">
                        {d.count} {d.count === 1 ? 'ticket' : 'tickets'}
                      </span>
                      <span className="text-text-muted text-[0.62rem]">{d.label}</span>
                    </div>

                    {/* Bar */}
                    <div className="w-full flex items-end justify-center h-full">
                      <div
                        className="w-full rounded-t-[2px] bg-accent-theme/40 hover:bg-accent-theme border-t border-accent-theme/60 hover:shadow-glow transition-all duration-300"
                        style={{
                          height: `${Math.max(heightPercent, 2)}%`,
                          minHeight: d.count > 0 ? '4px' : '2px',
                          opacity: d.count > 0 ? 1 : 0.2,
                        }}
                      />
                    </div>

                    {/* X-axis labels */}
                    <span className="absolute top-full mt-2 text-[0.62rem] font-mono text-text-muted group-hover:text-text-primary transition-colors hidden md:block">
                      {index % 5 === 0 || index === stats.ticketsPerDay.length - 1 ? d.label : ''}
                    </span>
                    <span className="absolute top-full mt-2 text-[0.62rem] font-mono text-text-muted group-hover:text-text-primary transition-colors block md:hidden">
                      {index % 10 === 0 || index === stats.ticketsPerDay.length - 1 ? d.label : ''}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="h-6" />
        </div>
      )}
    </AppLayout>
  );
}

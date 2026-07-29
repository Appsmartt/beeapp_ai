import FloatingTabBar from '@/components/app/FloatingTabBar';
import DesktopSidebar from '@/components/app/DesktopSidebar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-100/90 flex flex-col lg:flex-row selection:bg-brand-primary/20 overflow-x-hidden">
      
      {/* Permanent Desktop Sidebar (hidden on mobile/tablet) */}
      <DesktopSidebar />

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col min-h-screen lg:h-screen lg:overflow-y-auto relative w-full">
        
        {/* Mobile / Tablet Centered Container (Full-width on mobile, max-w-3xl on tablet, 100% on desktop) */}
        <div className="w-full max-w-full sm:max-w-3xl lg:max-w-7xl mx-auto min-h-screen lg:min-h-0 bg-white sm:shadow-lg lg:shadow-none flex-1 flex flex-col relative pb-20 lg:pb-0">
          {children}
        </div>

        {/* Floating Tab Bar (Mobile and Tablet only, hidden on Desktop lg:) */}
        <div className="lg:hidden">
          <FloatingTabBar />
        </div>

      </div>

    </div>
  );
}

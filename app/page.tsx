import Lens from '@/components/lens/Lens';
import Canvas from '@/components/canvas/Canvas';
import Insights from '@/components/insights/Insights';
import MoraChat from '@/components/chat/MoraChat';
import { AppProvider } from '@/lib/contexts';
import { QueryProvider } from '@/lib/queryClient';

export default function Home() {
  return (
    <QueryProvider>
      <AppProvider>
        <div className="h-screen flex overflow-hidden">
          <Lens />
          <Canvas />
          <Insights />
          <MoraChat />
        </div>
      </AppProvider>
    </QueryProvider>
  );
}

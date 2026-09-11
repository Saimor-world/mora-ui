import FinanceApp from '@/apps/finance';

export default function CapitalQaPage() {
  return (
    <main className="min-h-screen bg-[#080b12] p-6 text-white">
      <FinanceApp
        paneId="qa-capital"
        initialData={{ address: 'r3q2jXeSs8JZeaaVHeNSnz52XXs4GtLidj' }}
      />
    </main>
  );
}

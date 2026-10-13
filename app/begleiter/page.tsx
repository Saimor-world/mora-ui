import { Suspense } from 'react';
import BegleiterApp from '@/components/begleiter/BegleiterApp';

export default function BegleiterPage() {
  return <Suspense fallback={null}><BegleiterApp /></Suspense>;
}

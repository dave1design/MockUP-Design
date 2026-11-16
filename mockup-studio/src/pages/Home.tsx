import { useState } from 'react';
import Hero from '../components/home/Hero';
import Library, { type Filter } from '../components/home/Library';
import Developer from '../components/home/Developer';
import { CtaBand, Faq, Features, HowItWorks, Marquee, Showcase, Stats } from '../components/home/Sections';
import { useManifest } from '../data/useManifest';

export default function Home() {
  const { mockups, loading, error } = useManifest();
  const [category, setCategory] = useState<Filter>('all');
  const [query, setQuery] = useState('');

  return (
    <>
      <Hero onPickCategory={setCategory} />
      <Marquee />
      <Features mockups={mockups} />
      <Showcase mockups={mockups} />
      <HowItWorks />
      <Library mockups={mockups} loading={loading} error={error} category={category} setCategory={setCategory} query={query} setQuery={setQuery} />
      <Stats count={mockups.length} />
      <Faq />
      <Developer />
      <CtaBand />
    </>
  );
}

import React from 'react';
import { fireEvent, render, screen, cleanup } from '@testing-library/react';
import { Cockpit } from '@/features/home/cockpit/Cockpit';
import { OpenPlanet } from '@/features/home/cockpit/Scene';
import { MORGENROT_STRUCTURE } from '@/lib/demo/morgenrot/structure';


describe('Cockpit visual accessibility and mobile company context', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState(null, '', '/os?firma=morgenrot&als=marius');
    window.matchMedia = jest.fn().mockImplementation(query => ({matches:query.includes('max-width'),media:query,addEventListener:jest.fn(),removeEventListener:jest.fn()}));
  });
  afterEach(cleanup);
  it('keeps the real department planets available from owner Home on a phone', () => {
    render(<Cockpit initialViewer="marius"/>);
    expect(screen.getByTestId('home')).toHaveAttribute('data-phone','1');
    expect(screen.getByTestId('planet-system')).toBeInTheDocument();
    expect(screen.getByTestId('open-service')).toBeInTheDocument();
    expect(screen.getByTestId('open-kueche')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('open-kueche'));
    expect(screen.getByTestId('planet-kueche')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('dock-home'));
    expect(screen.getByTestId('planet-system')).toBeInTheDocument();
  });
  it('names the opened planet as a heading independently of the decorative horizon', () => {
    render(<OpenPlanet planet={MORGENROT_STRUCTURE[1]} showMoons onMoon={()=>{}} activeMoon={null}/>);
    expect(screen.getByRole('heading',{name:'Küche',level:2})).toBeInTheDocument();
    expect(Array.from(screen.getByTestId('planet-kueche').querySelectorAll<HTMLElement>('.glass-orb')).every(el=>parseFloat(el.style.width)>=90)).toBe(true);
  });
  it('uses MÔRA sparingly on Home and visibly above the horizon in the Universe', () => {
    render(<Cockpit initialViewer="marius"/>);
    expect(screen.getAllByTestId('mora-mark')).toHaveLength(1);
    fireEvent.click(screen.getByTestId('open-firma'));
    expect(screen.queryByTestId('cockpit-presence')).not.toBeInTheDocument();
    expect(screen.getAllByTestId('mora-mark')).toHaveLength(1);
    expect(screen.getByTestId('captain-place')).toContainElement(screen.getByTestId('mora-mark'));
  });
});

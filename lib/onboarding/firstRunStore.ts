'use client';
const KEY = 'saimor_first_run_tour_v1';

export function isFirstRunTourDone(): boolean {
    if (typeof window === 'undefined') return true;
    return window.localStorage.getItem(KEY) === 'done';
}

export function markFirstRunTourDone(): void {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(KEY, 'done');
}

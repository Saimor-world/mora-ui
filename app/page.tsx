"use client";

import React from 'react';
import { WelcomeScreen } from '@/components/auth/WelcomeScreen';

export default function RootPage() {
    return <WelcomeScreen onAuthenticated={() => {
        // Redirect to /home after authentication
        window.location.href = '/home';
    }} />;
}

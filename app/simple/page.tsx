"use client";

export default function SimplePage() {
    return (
        <div style={{
            width: '100vw',
            height: '100vh',
            background: '#030806',
            color: '#10B981',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '40px',
            fontFamily: 'monospace',
            fontSize: '18px'
        }}>
            <div style={{ fontSize: '48px', color: '#CEB676' }}>✨ SAIMÔR MÔRA</div>

            <div style={{
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                padding: '30px',
                borderRadius: '16px',
                maxWidth: '600px',
                textAlign: 'center'
            }}>
                <div style={{ marginBottom: '20px', fontSize: '24px' }}>System Status</div>

                <div style={{ marginBottom: '10px' }}>✅ React: Running</div>
                <div style={{ marginBottom: '10px' }}>✅ Next.js: Running</div>
                <div style={{ marginBottom: '10px' }}>✅ Frontend: localhost:3003</div>
                <div style={{ marginBottom: '10px' }}>✅ Backend: localhost:8083</div>

                <div style={{ marginTop: '30px', fontSize: '14px', opacity: 0.7 }}>
                    If you see this page with dark background,<br/>
                    React and styling are working correctly!
                </div>
            </div>

            <div style={{ marginTop: '20px' }}>
                <a
                    href="/home"
                    style={{
                        background: 'rgba(16, 185, 129, 0.2)',
                        border: '1px solid rgba(16, 185, 129, 0.5)',
                        padding: '12px 24px',
                        borderRadius: '8px',
                        color: '#10B981',
                        textDecoration: 'none',
                        display: 'inline-block'
                    }}
                >
                    → Go to Main App (/home)
                </a>
            </div>
        </div>
    );
}

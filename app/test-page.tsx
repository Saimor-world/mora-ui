export default function TestPage() {
    return (
        <div style={{
            background: '#030806',
            color: '#10B981',
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: '20px',
            fontSize: '24px',
            fontFamily: 'monospace'
        }}>
            <div>✅ SAIMÔR MÔRA TEST</div>
            <div>Backend: http://localhost:8083</div>
            <div>Frontend: http://localhost:3003</div>
            <div style={{ color: '#CEB676' }}>If you see this, React is working!</div>
        </div>
    );
}

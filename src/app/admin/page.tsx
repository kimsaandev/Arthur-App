'use client';

import { useState, useEffect } from 'react';
import styles from '../page.module.css';

export default function AdminPage() {
    const [password, setPassword] = useState('');
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    // settings
    const [activeModel, setActiveModel] = useState('gemini');
    const [activeFont, setActiveFont] = useState('notoSansKr');
    const [geminiKey, setGeminiKey] = useState('');
    const [fluxKey, setFluxKey] = useState('');

    const [hasGeminiKey, setHasGeminiKey] = useState(false);
    const [hasFluxKey, setHasFluxKey] = useState(false);

    const [statusMessage, setStatusMessage] = useState('');

    useEffect(() => {
        // 초기 로딩 시 모델 활성화 상태와 키 존재 여부만 가져온다.
        fetch('/api/admin/settings')
            .then(res => res.json())
            .then(data => {
                if (data.active_model) setActiveModel(data.active_model);
                if (data.active_font) setActiveFont(data.active_font);
                setHasGeminiKey(data.has_gemini_key);
                setHasFluxKey(data.has_flux_key);
            })
            .catch(err => console.error(err));
    }, []);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        // 실제로는 백엔드로 패스워드를 보내 토큰을 받는 것이 안전하지만 테스트용의 간단구현
        if (password === '7575admin') {
            setIsLoggedIn(true);
        } else {
            setStatusMessage('비밀번호가 틀렸습니다.');
        }
    };

    const handleSaveSettings = async () => {
        setStatusMessage('저장 중...');
        try {
            const res = await fetch('/api/admin/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    admin_password: password,
                    active_model: activeModel,
                    active_font: activeFont,
                    gemini_key: geminiKey,
                    flux_key: fluxKey
                })
            });

            if (res.ok) {
                setStatusMessage('설정이 안전하게 저장되었습니다.');
                setGeminiKey(''); // 입력창 초기화
                setFluxKey('');

                // 업데이트 정보 가져오기
                const getRes = await fetch('/api/admin/settings');
                const pData = await getRes.json();
                setHasGeminiKey(pData.has_gemini_key);
                setHasFluxKey(pData.has_flux_key);
            } else {
                setStatusMessage(`오류: ${res.statusText}`);
            }
        } catch (e: any) {
            setStatusMessage(`전송 실패: ${e.message}`);
        }
    };

    if (!isLoggedIn) {
        return (
            <main className={styles.main} style={{ background: '#fef9e7', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ background: 'white', padding: '3rem', borderRadius: '15px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', textAlign: 'center' }}>
                    <h1 style={{ color: '#5d4037', marginBottom: '1.5rem' }}>관리자 접근</h1>
                    <p style={{ color: '#666', marginBottom: '2rem' }}>시스템 코어 설정을 위해 관리자 암호를 입력하세요.</p>
                    <form onSubmit={handleLogin}>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="비밀번호"
                            style={{ padding: '0.8rem', width: '250px', borderRadius: '8px', border: '1px solid #ccc', marginBottom: '1rem', fontSize: '1rem' }}
                        /><br />
                        <button type="submit" style={{ padding: '0.8rem 2rem', background: '#5d4037', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                            접속
                        </button>
                    </form>
                    {statusMessage && <p style={{ color: 'red', marginTop: '1rem' }}>{statusMessage}</p>}
                </div>
            </main>
        );
    }

    return (
        <main className={styles.main} style={{ background: '#fef9e7', minHeight: '100vh', padding: '2rem' }}>
            <div style={{ maxWidth: '800px', margin: '0 auto', background: 'white', padding: '2rem 3rem', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
                <h1 style={{ color: '#5d4037', borderBottom: '2px solid #5d4037', paddingBottom: '1rem', marginBottom: '2rem' }}>인공지능(AI) 코어 설정</h1>

                <div style={{ marginBottom: '2.5rem' }}>
                    <h2 style={{ fontSize: '1.2rem', color: '#444', marginBottom: '1rem' }}>서비스 웹폰트 설정</h2>
                    <select
                        value={activeFont}
                        onChange={(e) => setActiveFont(e.target.value)}
                        style={{ padding: '0.8rem', width: '100%', maxWidth: '400px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '1rem' }}
                    >
                        <option value="notoSansKr">Noto Sans KR (기본 고딕)</option>
                        <option value="maruburi">Maru Buri (마루부리)</option>
                        <option value="nanum-world">나눔손글씨 세계적인 한글</option>
                        <option value="nanum-gangbujang">나눔손글씨 강부장님체</option>
                        <option value="nanum-sea">나눔손글씨 세아체</option>
                    </select>
                </div>

                <div style={{ marginBottom: '2.5rem' }}>
                    <h2 style={{ fontSize: '1.2rem', color: '#444', marginBottom: '1rem' }}>활성 생성 모델 선택</h2>
                    <div style={{ display: 'flex', gap: '1.5rem' }}>
                        <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
                            <input type="radio" value="gemini" checked={activeModel === 'gemini'} onChange={() => setActiveModel('gemini')} style={{ transform: 'scale(1.2)' }} />
                            Google Gemini Pro
                        </label>
                        <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
                            <input type="radio" value="flux" checked={activeModel === 'flux'} onChange={() => setActiveModel('flux')} style={{ transform: 'scale(1.2)' }} />
                            Flux.2 Klein 9B (Replicate)
                        </label>
                    </div>
                </div>

                <div style={{ marginBottom: '2.5rem', border: '1px solid #eee', padding: '1.5rem', borderRadius: '10px', background: '#fafafa' }}>
                    <h2 style={{ fontSize: '1.2rem', color: '#444', marginBottom: '1rem' }}>API 키 관리 (보안 구역)</h2>
                    <p style={{ fontSize: '0.85rem', color: '#e74c3c', marginBottom: '1.5rem' }}>* 키는 암호화되어 저장됩니다. 기존 키를 유지하려면 빈칸으로 두세요.</p>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem', color: '#5d4037' }}>
                            Gemini API Key
                            {hasGeminiKey && <span style={{ color: 'green', fontSize: '0.8rem', marginLeft: '0.5rem' }}>(현재 등록됨)</span>}
                        </label>
                        <input
                            type="password"
                            value={geminiKey}
                            onChange={(e) => setGeminiKey(e.target.value)}
                            placeholder={hasGeminiKey ? "새로운 키로 덮어쓰기 (기존 유지 시 빈칸)" : "입력 필요"}
                            style={{ padding: '0.8rem', width: '100%', borderRadius: '8px', border: '1px solid #ddd' }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem', color: '#5d4037' }}>
                            Flux.2 API Key (BFL token)
                            {hasFluxKey && <span style={{ color: 'green', fontSize: '0.8rem', marginLeft: '0.5rem' }}>(현재 등록됨)</span>}
                        </label>
                        <input
                            type="password"
                            value={fluxKey}
                            onChange={(e) => setFluxKey(e.target.value)}
                            placeholder={hasFluxKey ? "새로운 키로 덮어쓰기 (기존 유지 시 빈칸)" : "입력 필요"}
                            style={{ padding: '0.8rem', width: '100%', borderRadius: '8px', border: '1px solid #ddd' }}
                        />
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                    <button
                        onClick={handleSaveSettings}
                        style={{ padding: '1rem 3rem', background: '#5d4037', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem' }}
                    >
                        모든 설정 저장 및 보안 암호화
                    </button>
                    <button
                        onClick={() => window.location.href = '/'}
                        style={{ padding: '1rem 3rem', background: '#ccc', color: '#333', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem' }}
                    >
                        메인으로
                    </button>
                </div>

                {statusMessage && (
                    <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#d4edda', color: '#155724', borderRadius: '8px', textAlign: 'center', fontWeight: 'bold' }}>
                        {statusMessage}
                    </div>
                )}
            </div>
        </main>
    );
}

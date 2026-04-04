import React from 'react';
import Link from 'next/link';
import styles from '../page.module.css';

export default function UnauthorizedPage() {
    return (
        <main className={styles.landingMain}>
            <img src="/Main_top.png" alt="Happy Birthday Arthur" className={styles.headerImage} />
            <div className={styles.container}>
                <div
                    className={styles.card}
                    style={{
                        position: 'relative',
                        background: 'rgba(255, 255, 255, 0.95)',
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        minHeight: '400px'
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
                        <img
                            src="/unauthorized_arthur.png"
                            alt="Arthur"
                            style={{ width: '150px', height: 'auto' }}
                        />
                    </div>


                    <p style={{ fontSize: '1.1rem', color: '#555', marginBottom: '1.5rem', lineHeight: '1.6' }}>
                        연결 시간이 초과되었습니다.<br />
                        현장 QR 코드를<br />다시 스캔해 주세요.
                    </p>

                    <div style={{ marginTop: '2rem' }}>
                        <a
                            href="https://soma.kspo.or.kr/main"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                color: '#a67c52',
                                textDecoration: 'underline',
                                fontSize: '1.25rem',
                                fontWeight: '500'
                            }}
                        >
                            소마미술관 바로가기
                        </a>
                    </div>
                </div>
            </div>
            <img src="/Main_bottom.png" alt="Publishers" className={styles.footerImage} />
        </main>
    );
}

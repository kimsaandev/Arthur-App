"use client";

import { useState, useRef, useEffect } from 'react';
import styles from './page.module.css';
import { motion, AnimatePresence } from 'framer-motion';



export default function Home() {
  const [userImage, setUserImage] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<React.ReactNode | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dots, setDots] = useState('');

  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
      interval = setInterval(() => {
        setDots(prev => prev.length >= 3 ? '' : prev + '.');
      }, 500);
    } else {
      setDots('');
    }
    return () => clearInterval(interval);
  }, [loading]);


  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setUserImage(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleShare = async () => {
    if (!generatedImageUrl) return;

    try {
      const response = await fetch(generatedImageUrl);
      const blob = await response.blob();
      const file = new File([blob], `arthur_party_${Date.now()}.jpg`, { type: 'image/jpeg' });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Happy Birthday Arthur',
          text: '생일 파티 사진을 확인해 보세요!',
        });
      } else {
        // Fallback to standard download if share is not supported
        const link = document.createElement('a');
        link.href = generatedImageUrl.replace('/uploads/', '/api/uploads/');
        link.download = `arthur_party_${Date.now()}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('Sharing failed', error);
      // Even if share fails, try traditional download
      const link = document.createElement('a');
      link.href = generatedImageUrl.replace('/uploads/', '/api/uploads/');
      link.download = `arthur_party_${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleSubmit = async () => {
    if (!userImage) return;
    setLoading(true);
    setStatus(<>생일 파티에 들어가고 있어요<br />잠시만 기다려 주세요</>);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userImage, userName }),
      });

      const data = await response.json();
      if (data.success) {
        setStatus(<>파티에 도착했습니다.<br /><span style={{ fontSize: '0.95rem', fontWeight: '500', display: 'block', marginTop: '0.3rem' }}>액자 속 주인공을 확인해 보세요</span></>);
        // Use instaImage if available, otherwise just use image. 
        // URL을 할당할 때 NGINX 리버스 프록시 우회를 위해 API 경로로 명시적 치환
        const targetUrl = data.instaImage || data.image;
        setGeneratedImageUrl(targetUrl.replace('/uploads/', '/api/uploads/'));
        setUserImage(null); // Reset for next person
        setUserName('');
      } else {
        setStatus("어쿠! " + (data.message || "문제가 발생했습니다."));
      }
    } catch (error) {
      setStatus("서버 연결 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  if (!isClient) return null;

  return (
    <main className={styles.landingMain}>
      <img src="/Main_top.png" alt="Happy Birthday Arthur" className={styles.headerImage} />
      <div className={styles.container}>
        <div
          className={styles.card}
          style={{ position: 'relative', background: 'rgba(255, 255, 255, 0.95)' }}
        >
          {/* 캐릭터 상단 우측 배치 (Deco_02.png) */}
          <div style={{
            position: 'absolute',
            top: '-55px',
            right: '2px',
            width: '60px',
            zIndex: 10,
            pointerEvents: 'none',
            filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))'
          }}>
            <img
              src="/Deco_02.png"
              alt="Arthur Right"
              style={{ width: '100%', height: 'auto' }}
            />
          </div>

          {/* 캐릭터 상단 좌측 배치 (Deco_01.png) */}
          <div style={{
            position: 'absolute',
            top: '-65px',
            left: '8px',
            width: '60px',
            zIndex: 10,
            pointerEvents: 'none',
            filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))'
          }}>
            <img
              src="/Deco_01.png"
              alt="Arthur Left"
              style={{ width: '100%', height: 'auto' }}
            />
          </div>

          <h3 style={{ color: '#d35400', marginBottom: '1rem', fontSize: '1.4rem' }}>오늘의 주인공 되기</h3>

          <div style={{ marginBottom: '1rem', textAlign: 'left' }}>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="이름을 입력하세요"
              style={{
                width: '100%',
                padding: '0.8rem',
                borderRadius: '20px',
                border: loading ? '2px solid #FFD700' : '2px solid #f39c12',
                fontSize: '1rem',
                transition: 'all 0.3s'
              }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <div
              className={styles.uploadArea}
              onClick={() => !loading && fileInputRef.current?.click()}
              style={{
                height: '160px',
                border: loading ? '3px solid #FFD700' : '2px dashed #f39c12',
                background: '#fffcf5',
                boxShadow: loading ? 'inset 0 0 20px rgba(255, 215, 0, 0.2)' : 'none'
              }}
            >
              {userImage ? (
                <img src={userImage} alt="User Upload" className={styles.preview} />
              ) : (
                <div className={styles.uploadPlaceholder} style={{ color: '#d35400', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
                    <path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z" />
                  </svg>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="user"
                onChange={handleImageUpload}
                hidden
              />
            </div>
          </div>

          <button
            className={styles.generateBtn}
            onClick={handleSubmit}
            disabled={!userImage || !userName || loading}
            style={{
              width: '100%',
              marginTop: '0',
              fontWeight: 'bold',
              background: loading ? 'linear-gradient(45deg, #FFD700, #FFA500)' : '#e67e22',
              boxShadow: loading ? 'none' : '0 4px 0 #d35400'
            }}
          >
            {loading ? '생일 파티에 들어가는 중...' : '생일 파티 들어가기!'}
          </button>
        </div>
      </div>
      <img src="/Main_bottom.png" alt="Publishers" className={styles.footerImage} />

      <AnimatePresence>
        {status && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 'rgba(0, 0, 0, 0.6)',
              backdropFilter: 'blur(5px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: '2rem'
            }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              style={{
                background: '#fff',
                padding: loading ? '2.5rem' : '1.5rem 1.25rem',
                borderRadius: '24px',
                textAlign: 'center',
                maxWidth: '430px', // 이미지가 튀어나오므로 여유 공간 확보
                width: '100%',
                boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
                border: '4px solid #f39c12',
                position: 'relative',
                marginTop: loading ? '100px' : '0' // 이미지가 들어갈 공간 확보
              }}
            >
              {loading && (
                <div style={{
                  position: 'absolute',
                  top: '-150px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '130px', // 보내주신 이미지 비율에 맞게 크기 조절
                  zIndex: 1001
                }}>
                  <img
                    src="/loading_character.webp"
                    alt="Loading Character"
                    style={{ width: '100%', height: 'auto' }}
                  />
                </div>
              )}
              {!loading && (
                <button
                  onClick={() => {
                    setStatus(null);
                    setGeneratedImageUrl(null);
                  }}
                  style={{
                    position: 'absolute',
                    top: '15px',
                    right: '15px',
                    background: 'transparent',
                    border: 'none',
                    fontSize: '2.25rem',
                    color: '#888',
                    cursor: 'pointer',
                    lineHeight: '1',
                    padding: '5px'
                  }}
                  aria-label="닫기"
                >
                  ✕
                </button>
              )}

              <p style={{
                fontSize: '1.2rem',
                lineHeight: '1.6',
                color: '#5d4037',
                fontWeight: 'bold',
                marginBottom: '1rem',
                marginTop: loading ? '1rem' : '0rem',
                wordBreak: 'keep-all',
                overflowWrap: 'break-word'
              }}>
                {status}
                {loading && (
                  <span>
                    <span style={{ opacity: dots.length >= 1 ? 1 : 0 }}>.</span>
                    <span style={{ opacity: dots.length >= 2 ? 1 : 0 }}>.</span>
                    <span style={{ opacity: dots.length >= 3 ? 1 : 0 }}>.</span>
                  </span>
                )}
              </p>

              {!loading && generatedImageUrl && (
                <div style={{ marginBottom: '1rem', width: '100%', borderRadius: '12px', overflow: 'hidden', border: '2px solid #efefef' }}>
                  <img src={generatedImageUrl} alt="Generated Party Photo" style={{ width: '100%', height: 'auto', display: 'block' }} />
                </div>
              )}

              {!loading && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
                  {generatedImageUrl && (
                    <button
                      onClick={handleShare}
                      style={{
                        background: '#e67e22',
                        color: '#fff',
                        border: 'none',
                        padding: '0.8rem 2.5rem',
                        borderRadius: '50px',
                        fontSize: '1.1rem',
                        fontWeight: 'bold',
                        boxShadow: '0 4px 0 #d35400',
                        cursor: 'pointer',
                        width: '80%',
                        maxWidth: '250px'
                      }}
                    >
                      사진 저장하기
                    </button>
                  )}

                  {generatedImageUrl && (
                    <p style={{ fontSize: '0.9rem', color: '#888', marginTop: '5px', wordBreak: 'keep-all', overflowWrap: 'break-word' }}>
                      * 사진 앱(갤러리)에<wbr /> 저장되지<wbr /> 않을<wbr /> 경우,<wbr /> 이미지를<wbr /> 길게<wbr /> 눌러<wbr /> <b>'사진 앱에 저장'</b>을<wbr /> 선택해 주세요.
                    </p>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main >
  );
}


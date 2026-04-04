
"use client";

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import styles from '../page.module.css';

interface Task {
    id: string;
    image: string;
    instaImage?: string; // 추가
    timestamp: string;
}

export default function GalleryPage() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isEditMode, setIsEditMode] = useState(false);

    // Pagination 상태
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const fetchTasks = async (page = 1, showSpinner = true) => {
        try {
            if (showSpinner) setLoading(true);
            const res = await fetch(`/api/tasks?all=true&page=${page}`);
            const data = await res.json();
            setTasks(data.tasks);
            if (data.pagination) {
                setTotalPages(data.pagination.totalPages);
                setCurrentPage(data.pagination.currentPage);
            }

        } catch (err) {
            console.error("Failed to fetch images", err);
        } finally {
            if (showSpinner) setLoading(false);
        }
    };

    useEffect(() => {
        fetchTasks(currentPage, true);
        // 백그라운드 갱신 시에는 showSpinner를 false로 하여 화면 깜빡임을 방지합니다.
        const interval = setInterval(() => fetchTasks(currentPage, false), 5000);
        return () => clearInterval(interval);
    }, [currentPage]);

    const handleDownload = (imageUrl: string, id: string) => {
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = `arthur_party_${id}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleDelete = async () => {
        if (selectedIds.length === 0) return;

        const password = window.prompt("삭제를 위해 비밀번호를 입력하세요:");
        if (password !== "7575") {
            alert("비밀번호가 틀렸습니다.");
            return;
        }

        if (!confirm(`${selectedIds.length}개의 이미지를 삭제하시겠습니까?`)) return;

        try {
            const res = await fetch('/api/tasks', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: selectedIds, password: password }),
            });

            if (res.ok) {
                alert("선택한 이미지가 삭제되었습니다.");
                setSelectedIds([]);
                setIsEditMode(false);
                fetchTasks(currentPage);
            }
        } catch (err) {
            alert("삭제 중 오류가 발생했습니다.");
        }
    };

    return (
        <main className={styles.main} style={{ background: '#fef9e7', minHeight: '100vh', padding: '2rem' }}>
            <header style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '3rem',
                position: 'relative',
                minHeight: '40px',
                width: '100%',
                maxWidth: '1200px', // 콘텐츠영역(그리드)과 같은 너비 상한값 지정
                margin: '0 auto 3rem auto' // 중앙 정렬 및 하단 여백 설정
            }}>
                {/* 좌측 여백 블럭 (중앙 정렬 균형 맞추기 위함) */}
                <div style={{ flex: 1 }}></div>

                <motion.h1
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={styles.title}
                    style={{ color: '#5d4037', display: 'block', margin: 0, flex: 1, textAlign: 'center' }}
                >
                    갤러리
                </motion.h1>

                <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', gap: '1rem', alignItems: 'center' }}>
                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                            setIsEditMode(!isEditMode);
                            setSelectedIds([]);
                        }}
                        style={{
                            padding: '0.6rem 1.5rem',
                            borderRadius: '50px',
                            border: '2px solid #5d4037',
                            background: isEditMode ? '#5d4037' : 'transparent',
                            color: isEditMode ? 'white' : '#5d4037',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            fontSize: '0.9rem'
                        }}
                    >
                        {isEditMode ? '선택 취소' : '관리 모드'}
                    </motion.button>

                    {isEditMode && selectedIds.length > 0 && (
                        <motion.button
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleDelete}
                            style={{
                                padding: '0.6rem 1.5rem',
                                borderRadius: '50px',
                                border: 'none',
                                background: '#d63031',
                                color: 'white',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                fontSize: '0.9rem',
                                boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                            }}
                        >
                            선택 삭제 ({selectedIds.length})
                        </motion.button>
                    )}
                </div>
            </header>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
                    <div className={styles.loader}></div>
                </div>
            ) : (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', // 카드가 좁아지도록 변경하여 4열 유도
                    gap: '2rem',
                    width: '100%',
                    maxWidth: '1200px',
                    margin: '0 auto'
                }}>
                    <AnimatePresence>
                        {tasks.length > 0 ? tasks.map((task, index) => (
                            <motion.div
                                key={task.id}
                                onClick={() => isEditMode && toggleSelect(task.id)}
                                style={{
                                    background: 'white',
                                    borderRadius: '16px',
                                    overflow: 'hidden',
                                    boxShadow: selectedIds.includes(task.id)
                                        ? '0 0 0 4px #ff6b6b, 0 10px 30px rgba(0,0,0,0.2)'
                                        : '0 10px 20px rgba(0,0,0,0.05)',
                                    position: 'relative',
                                    border: '4px solid #fff',
                                    cursor: isEditMode ? 'pointer' : 'default',
                                    transition: 'box-shadow 0.2s'
                                }}
                            >
                                {/* Selection Overlay */}
                                {isEditMode && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '10px',
                                        right: '10px',
                                        width: '30px',
                                        height: '30px',
                                        borderRadius: '50%',
                                        background: selectedIds.includes(task.id) ? '#ff6b6b' : 'rgba(255,255,255,0.8)',
                                        border: '2px solid white',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        zIndex: 2,
                                        color: 'white',
                                        fontSize: '1rem'
                                    }}>
                                        {selectedIds.includes(task.id) && '✓'}
                                    </div>
                                )}

                                {/* AI 원본 이미지 영역 */}
                                <div style={{ position: 'relative' }}>
                                    <img
                                        src={task.image ? task.image.replace('/uploads/', '/api/uploads/') : ''}
                                        alt={`AI Generated Image ${index}`}
                                        style={{ width: '100%', height: 'auto', display: 'block' }}
                                    />
                                    {!isEditMode && task.image && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDownload(task.image.replace('/uploads/', '/api/uploads/'), `${task.id}_ai`);
                                            }}
                                            style={{
                                                position: 'absolute',
                                                bottom: '10px',
                                                right: '10px',
                                                padding: '0.4rem 0.8rem',
                                                background: 'rgba(78, 205, 196, 0.9)',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '8px',
                                                fontSize: '0.8rem',
                                                fontWeight: 'bold',
                                                cursor: 'pointer',
                                                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                            }}
                                        >
                                            AI 원본 다운
                                        </button>
                                    )}
                                </div>

                                {/* 인스타 이미지 영역 (존재할 경우에만 표시) */}
                                {task.instaImage && (
                                    <div style={{ position: 'relative', borderTop: '2px dashed #eee', marginTop: '0.4rem', paddingTop: '0.4rem' }}>
                                        <img
                                            src={task.instaImage.replace('/uploads/', '/api/uploads/')}
                                            alt={`Insta Frame Image ${index}`}
                                            style={{ width: '100%', height: 'auto', display: 'block' }}
                                        />
                                        {!isEditMode && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDownload(task.instaImage!.replace('/uploads/', '/api/uploads/'), `${task.id}_insta`);
                                                }}
                                                style={{
                                                    position: 'absolute',
                                                    bottom: '10px',
                                                    right: '10px',
                                                    padding: '0.4rem 0.8rem',
                                                    background: 'rgba(243, 156, 18, 0.9)', // 인스타 느낌의 오렌지톤
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '8px',
                                                    fontSize: '0.8rem',
                                                    fontWeight: 'bold',
                                                    cursor: 'pointer',
                                                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                                }}
                                            >
                                                인스타 다운
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* 하단 날짜 정보 영역 */}
                                <div style={{
                                    padding: '0.5rem 1rem', // 상하 여백 50% 축소
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    background: '#fdfbf7',
                                    borderTop: '1px solid #eee'
                                }}>
                                    <span style={{ fontSize: '0.65rem', color: '#8d6e63', fontWeight: 'bold' }}> {/* 텍스트 크기 70% 축소 */}
                                        {new Date(task.timestamp).toLocaleDateString()} 생성
                                    </span>
                                </div>
                            </motion.div>
                        )) : (
                            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '5rem', opacity: 0.5 }}>
                                아직 보관된 사진이 없어요. 첫 번째 주인공이 되어보세요!
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            )}

            {/* Pagination Controls */}
            {!loading && totalPages > 1 && (
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '0.8rem',
                    marginTop: '4rem',
                    flexWrap: 'wrap'
                }}>
                    <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        style={{
                            padding: '0.6rem 1.2rem',
                            borderRadius: '8px',
                            border: '1px solid #ddd',
                            background: currentPage === 1 ? '#f5f5f5' : 'white',
                            color: currentPage === 1 ? '#aaa' : '#5d4037',
                            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                            fontWeight: 'bold'
                        }}
                    >
                        이전
                    </button>

                    {/* Abbreviated Page Numbers */}
                    {(() => {
                        const pages = [];
                        const maxVisible = 5; // 한 번에 보여줄 최대 번호 개수 (축약 시)

                        if (totalPages <= 7) {
                            // 페이지가 적으면 전부 표시
                            for (let i = 1; i <= totalPages; i++) pages.push(i);
                        } else {
                            // 페이지가 많으면 축약 로직 적용
                            pages.push(1);

                            if (currentPage > 4) {
                                pages.push('...');
                            }

                            const start = Math.max(2, currentPage - 1);
                            const end = Math.min(totalPages - 1, currentPage + 1);

                            // 현재 페이지 주변 번호를 가변적으로 계산
                            let displayStart = start;
                            let displayEnd = end;

                            if (currentPage <= 4) displayEnd = 5;
                            if (currentPage >= totalPages - 3) displayStart = totalPages - 4;

                            for (let i = Math.max(2, displayStart); i <= Math.min(totalPages - 1, displayEnd); i++) {
                                pages.push(i);
                            }

                            if (currentPage < totalPages - 3) {
                                pages.push('...');
                            }

                            pages.push(totalPages);
                        }

                        return pages.map((pageNum, idx) => (
                            pageNum === '...' ? (
                                <span key={`dots-${idx}`} style={{ color: '#5d4037', padding: '0 0.5rem' }}>...</span>
                            ) : (
                                <button
                                    key={pageNum}
                                    onClick={() => setCurrentPage(pageNum as number)}
                                    style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '50%',
                                        border: 'none',
                                        background: currentPage === pageNum ? '#5d4037' : 'white',
                                        color: currentPage === pageNum ? 'white' : '#5d4037',
                                        fontWeight: 'bold',
                                        cursor: 'pointer',
                                        boxShadow: currentPage === pageNum ? '0 4px 10px rgba(93,64,55,0.3)' : '0 2px 5px rgba(0,0,0,0.05)'
                                    }}
                                >
                                    {pageNum}
                                </button>
                            )
                        ));
                    })()}

                    <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        style={{
                            padding: '0.6rem 1.2rem',
                            borderRadius: '8px',
                            border: '1px solid #ddd',
                            background: currentPage === totalPages ? '#f5f5f5' : 'white',
                            color: currentPage === totalPages ? '#aaa' : '#5d4037',
                            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                            fontWeight: 'bold'
                        }}
                    >
                        다음
                    </button>
                </div>
            )}

            <footer style={{ marginTop: '5rem', textAlign: 'center', opacity: 0.3, fontSize: '0.8rem' }}>
                © Happy Birthday Arthur Archive
            </footer>
        </main>
    );
}

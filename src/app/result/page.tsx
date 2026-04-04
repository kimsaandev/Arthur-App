
"use client";

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

export default function DisplayPage() {
    const [currentImage, setCurrentImage] = useState<any>(null);
    const [isShowingLive, setIsShowingLive] = useState(false);
    const [nextTaskInQueue, setNextTaskInQueue] = useState<any>(null);
    const [queueSize, setQueueSize] = useState(0);

    // Use a ref to keep track of state inside intervals/timeouts without triggering re-runs
    const processingRef = useRef(false);

    const fireConfetti = () => {
        const count = 200;
        const defaults = {
            origin: { y: 0.7 },
            zIndex: 1000
        };

        function fire(particleRatio: number, opts: any) {
            confetti({
                ...defaults,
                ...opts,
                particleCount: Math.floor(count * particleRatio)
            });
        }

        fire(0.25, { spread: 26, startVelocity: 55 });
        fire(0.2, { spread: 60 });
        fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
        fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
        fire(0.1, { spread: 120, startVelocity: 45 });
    };

    useEffect(() => {
        const pollTasks = async () => {
            // If we are currently "in the middle" of a 1-minute show, don't start a new one
            // but we still want to fetch the queue size
            try {
                const response = await fetch('/api/tasks');
                const data = await response.json();
                const tasks = data.tasks || [];

                setQueueSize(tasks.length);

                if (tasks.length > 0) {
                    if (!processingRef.current) {
                        // START SHOWING IMAGE
                        processingRef.current = true;
                        setIsShowingLive(true);

                        const taskToShow = tasks[0];
                        setCurrentImage(taskToShow);
                        setNextTaskInQueue(null);

                        // Fire confetti when a new user image appears
                        fireConfetti();

                        // 1. Show for 1 minute (60,000ms)
                        setTimeout(async () => {
                            // 2. After 1 minute, mark this task as completed
                            await fetch('/api/tasks', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ id: taskToShow.id }),
                            });

                            // 3. Reset state to allow next image
                            setCurrentImage(null);
                            setIsShowingLive(false);
                            processingRef.current = false;
                        }, 60000);
                    } else {
                        // ALREADY PROCESSING - Check if there's someone waiting
                        // (The person we are currently showing is tasks[0], so if tasks.length > 1, someone is waiting)
                        if (tasks.length > 1) {
                            setNextTaskInQueue(tasks[1]);
                        } else {
                            setNextTaskInQueue(null);
                        }
                    }
                } else {
                    // No tasks at all
                    if (!processingRef.current) {
                        setCurrentImage(null);
                        setNextTaskInQueue(null);
                    }
                }
            } catch (e) {
                console.error("Polling error", e);
            }
        };

        const interval = setInterval(pollTasks, 3000); // Check every 3 seconds
        return () => clearInterval(interval);
    }, []);

    return (
        <main style={{
            width: '100vw',
            height: '100vh',
            backgroundColor: '#fbf3e6',
            margin: 0,
            padding: 0,
            overflow: 'hidden',
            position: 'relative'
        }}>
            {/* Background / Default Image */}
            <AnimatePresence>
                <motion.div
                    key={currentImage ? currentImage.id : 'default'}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 2 }}
                    style={{
                        width: '100%',
                        height: '100%',
                        position: 'absolute',
                        top: 0,
                        left: 0
                    }}
                >
                    <img
                        src={currentImage ? currentImage.image.replace('/uploads/', '/api/uploads/') : "/arthur_template.jpg"}
                        alt="Display"
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain'
                        }}
                    />
                </motion.div>
            </AnimatePresence>

            {/* Waiting Message Notification */}
            <AnimatePresence>
                {isShowingLive && nextTaskInQueue && (
                    <motion.div
                        initial={{ y: 100, x: "-50%", opacity: 0 }}
                        animate={{ y: 0, x: "-50%", opacity: 1 }}
                        exit={{ y: 100, x: "-50%", opacity: 0 }}
                        style={{
                            position: 'absolute',
                            bottom: '2.9%',
                            left: '50%',
                            background: 'rgba(241, 151, 56, 0.9)', // Main orange color
                            backdropFilter: 'blur(10px)',
                            color: 'white',
                            padding: '10px 21px',  // 85%
                            borderRadius: '10px',
                            fontSize: '0.93rem',   // 85%
                            fontWeight: 'bold',
                            zIndex: 100,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                            pointerEvents: 'none',
                            textAlign: 'center',
                            minWidth: '272px',     // 85%
                            border: '2px solid white'
                        }}
                    >
                        잠시만 기다려주세요, 다음 주인공이 들어오고 있어요.
                        <div style={{ fontSize: '0.76rem', marginTop: '5px', color: '#ffeb3b' }}>
                            (대기 인원: {queueSize - 1}명)
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>


        </main>
    );
}


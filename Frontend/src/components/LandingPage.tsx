import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useInView } from 'motion/react';
import { Car, Users, ShieldCheck, BarChart3, ArrowRight, Phone, Mail, MapPin, Zap, Gauge, Wrench } from 'lucide-react';

export default function LandingPage() {
    const navigate = useNavigate();
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    // Track mouse for interactive RGB glow effect
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            setMousePos({ x: e.clientX, y: e.clientY });
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    // Animated counter hook
    const useCountUp = (end: number, duration: number = 2000, startOnView: boolean = true) => {
        const [count, setCount] = useState(0);
        const ref = useRef(null);
        const isInView = useInView(ref, { once: true, margin: "-100px" });

        useEffect(() => {
            if (!startOnView || !isInView) return;
            let startTime: number;
            const animate = (timestamp: number) => {
                if (!startTime) startTime = timestamp;
                const progress = Math.min((timestamp - startTime) / duration, 1);
                setCount(Math.floor(progress * end));
                if (progress < 1) requestAnimationFrame(animate);
            };
            requestAnimationFrame(animate);
        }, [isInView, end, duration, startOnView]);

        return { count, ref };
    };

    const vehiclesSold = useCountUp(100, 2000);
    const happyCustomers = useCountUp(500, 2500);
    const activePlans = useCountUp(50, 1500);
    const satisfaction = useCountUp(99, 1800);

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-white font-sans overflow-x-hidden relative">
            {/* Animated RGB Background Orbs */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <motion.div
                    className="absolute w-[600px] h-[600px] rounded-full blur-[120px] opacity-40"
                    style={{
                        background: 'radial-gradient(circle, rgba(0,255,255,0.3) 0%, rgba(255,0,255,0.2) 50%, transparent 70%)',
                        left: mousePos.x * 0.05,
                        top: mousePos.y * 0.05,
                    }}
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.3, 0.5, 0.3],
                    }}
                    transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.div
                    className="absolute w-[500px] h-[500px] rounded-full blur-[100px] opacity-30"
                    style={{
                        background: 'radial-gradient(circle, rgba(255,0,128,0.3) 0%, rgba(0,128,255,0.2) 50%, transparent 70%)',
                        right: mousePos.x * 0.03,
                        bottom: mousePos.y * 0.03,
                    }}
                    animate={{
                        scale: [1.2, 1, 1.2],
                        opacity: [0.2, 0.4, 0.2],
                    }}
                    transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.div
                    className="absolute w-[400px] h-[400px] rounded-full blur-[80px] opacity-20"
                    style={{
                        background: 'radial-gradient(circle, rgba(0,255,128,0.25) 0%, rgba(128,0,255,0.15) 50%, transparent 70%)',
                        left: '50%',
                        top: '50%',
                        transform: 'translate(-50%, -50%)',
                    }}
                    animate={{
                        scale: [1, 1.3, 1],
                        x: [0, 50, 0],
                        y: [0, -30, 0],
                    }}
                    transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
                />
            </div>

            {/* Hero Section */}
            <section className="relative overflow-hidden py-20 lg:py-32">
                <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0f] via-[#0f0a1a] to-[#0a0a0f]" />

                {/* Animated grid background */}
                <div className="absolute inset-0 opacity-20">
                    <div className="absolute inset-0" style={{
                        backgroundImage: 'linear-gradient(rgba(0,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,255,0.1) 1px, transparent 1px)',
                        backgroundSize: '50px 50px',
                    }} />
                </div>

                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <motion.div
                        className="text-center"
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                    >
                        {/* Animated Logo with RGB glow */}
                        <motion.div
                            className="flex justify-center mb-8"
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ duration: 1, type: "spring", stiffness: 200 }}
                        >
                            <div className="relative">
                                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 rounded-full blur-xl opacity-60 animate-pulse" />
                                <div className="relative bg-[#0a0a0f]/80 p-5 rounded-full border-2 border-cyan-500/50 backdrop-blur-sm">
                                    <Car size={56} className="text-cyan-400 drop-shadow-[0_0_10px_rgba(0,255,255,0.8)]" />
                                </div>
                            </div>
                        </motion.div>

                        {/* Animated Title with RGB gradient */}
                        <motion.h1
                            className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight mb-6"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.2 }}
                        >
                            <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent animate-gradient">
                                Baheria
                            </span>
                            <span className="bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent animate-gradient">
                                Motors
                            </span>
                        </motion.h1>

                        <motion.p
                            className="text-xl sm:text-2xl text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-purple-300 font-semibold mb-4"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.8, delay: 0.4 }}
                        >
                            Premium Car Dealership Management System
                        </motion.p>

                        <motion.p
                            className="text-base text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.8, delay: 0.6 }}
                        >
                            Streamline your showroom operations with our comprehensive dashboard.
                            Manage customers, vehicles, installments, and payments all in one place.
                        </motion.p>

                        {/* Animated Buttons */}
                        <motion.div
                            className="flex flex-col sm:flex-row gap-4 justify-center"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.8 }}
                        >
                            <motion.button
                                onClick={() => navigate('/login')}
                                className="group relative inline-flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-bold py-4 px-10 rounded-xl transition-all duration-300 cursor-pointer overflow-hidden"
                                whileHover={{ scale: 1.05, boxShadow: "0 0 30px rgba(0,255,255,0.5)" }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <span className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                <span className="relative z-10 flex items-center gap-2">
                                    Get Started
                                    <motion.div
                                        animate={{ x: [0, 5, 0] }}
                                        transition={{ duration: 1.5, repeat: Infinity }}
                                    >
                                        <ArrowRight size={18} />
                                    </motion.div>
                                </span>
                            </motion.button>
                            <motion.a
                                href="#features"
                                className="inline-flex items-center justify-center gap-2 bg-transparent border-2 border-cyan-500/50 hover:border-cyan-400 text-cyan-400 hover:text-white font-bold py-4 px-10 rounded-xl transition-all duration-300 backdrop-blur-sm"
                                whileHover={{ scale: 1.05, boxShadow: "0 0 20px rgba(0,255,255,0.3)" }}
                                whileTap={{ scale: 0.95 }}
                            >
                                Learn More
                            </motion.a>
                        </motion.div>
                    </motion.div>
                </div>

                {/* Floating particles */}
                <div className="absolute inset-0 pointer-events-none">
                    {[...Array(20)].map((_, i) => (
                        <motion.div
                            key={i}
                            className="absolute w-1 h-1 bg-cyan-400 rounded-full"
                            style={{
                                left: `${Math.random() * 100}%`,
                                top: `${Math.random() * 100}%`,
                            }}
                            animate={{
                                y: [0, -30, 0],
                                opacity: [0, 1, 0],
                                scale: [0, 1, 0],
                            }}
                            transition={{
                                duration: 3 + Math.random() * 2,
                                repeat: Infinity,
                                delay: Math.random() * 2,
                            }}
                        />
                    ))}
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-24 relative">
                <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0f] via-[#0f0a1a] to-[#0a0a0f]" />
                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <motion.div
                        className="text-center mb-20"
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-100px" }}
                        transition={{ duration: 0.8 }}
                    >
                        <h2 className="text-4xl sm:text-5xl font-black mb-4 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                            Powerful Features
                        </h2>
                        <p className="text-slate-400 max-w-2xl mx-auto text-lg">
                            Everything you need to run your car dealership efficiently
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {[
                            { icon: Users, title: "Customer Management", desc: "Track customer profiles, credit limits, and purchase history with ease.", color: "cyan" },
                            { icon: Car, title: "Vehicle Inventory", desc: "Manage your vehicle stock, pricing, and specifications in one place.", color: "purple" },
                            { icon: BarChart3, title: "Installment Plans", desc: "Create and manage flexible installment plans for your customers.", color: "pink" },
                            { icon: ShieldCheck, title: "Secure & Reliable", desc: "Bank-grade security with audit logs and role-based access control.", color: "green" },
                        ].map((feature, index) => (
                            <motion.div
                                key={index}
                                className="group relative bg-[#1a1a2e]/50 border border-slate-800/50 p-8 rounded-2xl backdrop-blur-sm overflow-hidden"
                                initial={{ opacity: 0, y: 50 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: "-50px" }}
                                transition={{ duration: 0.6, delay: index * 0.1 }}
                                whileHover={{
                                    y: -10,
                                    borderColor: `rgba(${feature.color === 'cyan' ? '0,255,255' : feature.color === 'purple' ? '168,85,247' : feature.color === 'pink' ? '236,72,153' : '34,197,94'}, 0.5)`,
                                    boxShadow: `0 20px 40px rgba(${feature.color === 'cyan' ? '0,255,255' : feature.color === 'purple' ? '168,85,247' : feature.color === 'pink' ? '236,72,153' : '34,197,94'}, 0.2)`,
                                }}
                            >
                                {/* RGB glow effect on hover */}
                                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/0 via-purple-500/0 to-pink-500/0 group-hover:from-cyan-500/10 group-hover:via-purple-500/10 group-hover:to-pink-500/10 transition-all duration-500" />

                                <div className="relative z-10">
                                    <motion.div
                                        className={`bg-${feature.color}-500/10 p-4 rounded-xl w-fit mb-6 border border-${feature.color}-500/20`}
                                        whileHover={{ rotate: 360, scale: 1.1 }}
                                        transition={{ duration: 0.6 }}
                                    >
                                        <feature.icon size={32} className={`text-${feature.color}-400 drop-shadow-[0_0_8px_rgba(${feature.color === 'cyan' ? '0,255,255' : feature.color === 'purple' ? '168,85,247' : feature.color === 'pink' ? '236,72,153' : '34,197,94'},0.6)]`} />
                                    </motion.div>
                                    <h3 className="text-xl font-bold text-white mb-3 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-cyan-400 group-hover:to-purple-400 transition-all duration-300">
                                        {feature.title}
                                    </h3>
                                    <p className="text-slate-400 leading-relaxed">
                                        {feature.desc}
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Stats Section */}
            <section className="py-24 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-900/20 via-purple-900/20 to-pink-900/20" />
                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        {[
                            { value: vehiclesSold.count, label: "Vehicles Sold", suffix: "+", color: "cyan" },
                            { value: happyCustomers.count, label: "Happy Customers", suffix: "+", color: "purple" },
                            { value: activePlans.count, label: "Active Plans", suffix: "+", color: "pink" },
                            { value: satisfaction.count, label: "Satisfaction", suffix: "%", color: "green" },
                        ].map((stat, index) => (
                            <motion.div
                                key={index}
                                className="text-center group"
                                initial={{ opacity: 0, scale: 0.5 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true, margin: "-50px" }}
                                transition={{ duration: 0.6, delay: index * 0.1 }}
                            >
                                <motion.div
                                    className={`text-5xl sm:text-6xl font-black mb-3 bg-gradient-to-r from-${stat.color}-400 to-${stat.color}-600 bg-clip-text text-transparent`}
                                    whileHover={{ scale: 1.1 }}
                                >
                                    {stat.value}{stat.suffix}
                                </motion.div>
                                <div className="text-slate-400 font-medium text-lg group-hover:text-white transition-colors duration-300">
                                    {stat.label}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Contact Section */}
            <section className="py-24 relative">
                <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0f] via-[#0f0a1a] to-[#0a0a0f]" />
                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <motion.div
                        className="text-center mb-16"
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-100px" }}
                        transition={{ duration: 0.8 }}
                    >
                        <h2 className="text-4xl sm:text-5xl font-black mb-4 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                            Get In Touch
                        </h2>
                        <p className="text-slate-400 text-lg">
                            Visit our showroom or contact us for more information
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                        {[
                            { icon: Phone, title: "Phone", value: "+92 300 1234567", color: "cyan" },
                            { icon: Mail, title: "Email", value: "info@baheriamotors.com", color: "purple" },
                            { icon: MapPin, title: "Location", value: "Blue Area, Islamabad", color: "pink" },
                        ].map((contact, index) => (
                            <motion.div
                                key={index}
                                className="group relative bg-[#1a1a2e]/50 border border-slate-800/50 p-8 rounded-2xl backdrop-blur-sm overflow-hidden"
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: "-50px" }}
                                transition={{ duration: 0.6, delay: index * 0.1 }}
                                whileHover={{
                                    y: -5,
                                    borderColor: `rgba(${contact.color === 'cyan' ? '0,255,255' : contact.color === 'purple' ? '168,85,247' : '236,72,153'}, 0.5)`,
                                }}
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/0 via-purple-500/0 to-pink-500/0 group-hover:from-cyan-500/5 group-hover:via-purple-500/5 group-hover:to-pink-500/5 transition-all duration-500" />

                                <div className="relative z-10 flex items-center gap-5">
                                    <motion.div
                                        className={`bg-${contact.color}-500/10 p-4 rounded-xl border border-${contact.color}-500/20`}
                                        whileHover={{ rotate: 360, scale: 1.1 }}
                                        transition={{ duration: 0.6 }}
                                    >
                                        <contact.icon size={28} className={`text-${contact.color}-400`} />
                                    </motion.div>
                                    <div>
                                        <div className="text-lg font-bold text-white mb-1 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-cyan-400 group-hover:to-purple-400 transition-all duration-300">
                                            {contact.title}
                                        </div>
                                        <div className="text-slate-400 group-hover:text-slate-300 transition-colors duration-300">
                                            {contact.value}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 relative border-t border-slate-800/50">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-900/10 via-purple-900/10 to-pink-900/10" />
                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <motion.p
                        className="text-slate-500 text-lg"
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                    >
                        © 2024 <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent font-semibold">Baheria Motors</span>. All rights reserved.
                    </motion.p>
                </div>
            </footer>

            {/* Global CSS for animations */}
            <style>{`
                @keyframes gradient {
                    0%, 100% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                }
                .animate-gradient {
                    background-size: 200% 200%;
                    animation: gradient 3s ease infinite;
                }
            `}</style>
        </div>
    );
}

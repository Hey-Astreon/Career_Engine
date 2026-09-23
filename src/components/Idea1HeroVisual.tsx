"use client";

import React from "react";
import { motion } from "framer-motion";
import { FileText, CheckCircle2, FileCode2 } from "lucide-react";

export default function Idea1HeroVisual() {
  // We use keyframes for a continuous 3-stage loop:
  // 1. Resume enters engine
  // 2. Engine processes
  // 3. Perfect match exits

  return (
    <motion.div
      initial={{ opacity: 0, y: 60 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, delay: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="mt-16 w-full max-w-[1000px] mx-auto"
    >
      <div className="relative rounded-3xl overflow-hidden shadow-[0_20px_80px_rgba(0,0,0,0.08)] border border-black/[0.04] bg-[#fafafa] aspect-[16/10] sm:aspect-[21/9] flex items-center justify-center p-4 sm:p-8">
        {/* Background Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />

        {/* The Track / Pipeline Line */}
        <div className="absolute left-1/4 right-1/4 top-1/2 -translate-y-1/2 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />

        <div className="relative z-10 w-full h-full flex items-center justify-center">
          
          {/* LEFT: Incoming Messy Resume */}
          <motion.div 
            animate={{ 
              x: ["-100%", "50%", "50%", "50%"],
              opacity: [0, 1, 0, 0],
              scale: [1, 1, 0.5, 0.5]
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute left-[15%] w-32 bg-white rounded-xl shadow-md border border-black/10 p-4 flex flex-col gap-2 opacity-0"
          >
            <div className="flex items-center gap-2 mb-2 text-red-500">
              <FileText className="w-4 h-4" />
              <span className="text-[10px] font-bold">RAW RESUME</span>
            </div>
            <div className="h-1.5 w-full bg-black/10 rounded-full" />
            <div className="h-1.5 w-3/4 bg-black/10 rounded-full" />
            <div className="h-1.5 w-5/6 bg-black/10 rounded-full" />
            <div className="h-1.5 w-1/2 bg-black/10 rounded-full" />
          </motion.div>

          {/* CENTER: AstreWork Core Engine */}
          <motion.div 
            animate={{ 
              boxShadow: [
                "0 0 0 rgba(0,113,227,0)", 
                "0 0 0 rgba(0,113,227,0)", 
                "0 0 60px rgba(0,113,227,0.3)", 
                "0 0 0 rgba(0,113,227,0)"
              ],
              borderColor: [
                "rgba(255,255,255,0.6)",
                "rgba(255,255,255,0.6)",
                "rgba(0,113,227,0.5)",
                "rgba(255,255,255,0.6)"
              ]
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="w-40 h-40 bg-white/60 backdrop-blur-xl border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.08)] rounded-3xl flex flex-col items-center justify-center relative z-20"
          >
            {/* Inner Processing Glow */}
            <motion.div 
               animate={{ opacity: [0, 0, 1, 0] }}
               transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
               className="absolute inset-0 bg-blue-500/10 rounded-3xl blur-xl"
            />
            
            <div className="w-12 h-12 bg-gradient-to-br from-[#0071e3] to-cyan-400 rounded-2xl flex items-center justify-center mb-3 shadow-lg relative z-10">
              <FileCode2 className="w-6 h-6 text-white" />
            </div>
            <div className="text-[12px] font-bold tracking-widest text-[#1d1d1f] relative z-10">ASTREWORK CORE</div>
            
            <motion.div 
              animate={{ opacity: [1, 1, 0, 1] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="text-[10px] font-medium text-[#86868b] mt-1 relative z-10"
            >
              WAITING
            </motion.div>
            <motion.div 
              animate={{ opacity: [0, 0, 1, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="text-[10px] font-medium text-[#0071e3] mt-1 absolute bottom-6"
            >
              PROCESSING...
            </motion.div>
          </motion.div>

          {/* RIGHT: Structured Perfect Match Exiting */}
          <motion.div 
            animate={{ 
              x: ["-50%", "-50%", "-50%", "100%"],
              opacity: [0, 0, 1, 1],
              scale: [0.5, 0.5, 1, 1]
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute right-[15%] w-40 bg-white rounded-xl shadow-lg border border-emerald-500/20 p-4 flex flex-col gap-3 opacity-0"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-emerald-500">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-[10px] font-bold">ATS OPTIMIZED</span>
              </div>
            </div>
            <div className="bg-emerald-500/10 rounded p-2 flex flex-col gap-1.5">
              <div className="h-2 w-full bg-emerald-500/30 rounded-full" />
              <div className="h-2 w-3/4 bg-emerald-500/30 rounded-full" />
            </div>
            <div className="text-[10px] font-bold text-[#1d1d1f] text-center mt-1">
              99% MATCH SCORE
            </div>
          </motion.div>

        </div>
      </div>
    </motion.div>
  );
}

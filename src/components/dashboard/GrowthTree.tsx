import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, Leaf, Flower2 } from 'lucide-react';

interface GrowthTreeProps {
  score: number; // 0 to 100
  entriesCount: number;
  habitsCount: number;
}

const GrowthTree: React.FC<GrowthTreeProps> = ({ score, entriesCount, habitsCount }) => {
  // Normalize score to 0-1
  const normalizedScore = Math.min(Math.max(score / 100, 0), 1);
  
  // Tree height based on entries
  const treeHeight = 40 + Math.min(entriesCount * 2, 60); // 40% to 100%
  
  // Number of leaves based on habits
  const leavesCount = Math.min(habitsCount, 12);
  
  // Flowers based on high score
  const flowersCount = score > 80 ? 3 : score > 60 ? 1 : 0;

  return (
    <div className="relative w-full h-64 flex flex-col items-center justify-end bg-gradient-to-b from-indigo-50/20 to-transparent rounded-3xl overflow-hidden p-8 border border-slate-100/50">
      <div className="absolute top-4 left-4 flex items-center gap-2">
        <div className="bg-emerald-100 p-1.5 rounded-lg">
          <Leaf className="w-4 h-4 text-emerald-600" />
        </div>
        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Your Growth Tree</span>
      </div>

      {/* Ground */}
      <div className="absolute bottom-0 w-full h-4 bg-emerald-100/30" />

      {/* Tree Trunk */}
      <motion.div 
        initial={{ height: 0 }}
        animate={{ height: `${treeHeight}%` }}
        transition={{ duration: 1.5, ease: "easeOut" }}
        className="relative w-4 bg-amber-800/80 rounded-t-full origin-bottom"
      >
        {/* Leaves */}
        {Array.from({ length: leavesCount }).map((_, i) => (
          <motion.div
            key={`leaf-${i}`}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 1 + i * 0.1 }}
            className="absolute w-6 h-4 bg-emerald-500 rounded-full"
            style={{
              top: `${Math.random() * 80}%`,
              left: i % 2 === 0 ? '-18px' : '10px',
              transform: `rotate(${i % 2 === 0 ? '-45deg' : '45deg'})`,
            }}
          />
        ))}

        {/* Flowers */}
        {Array.from({ length: flowersCount }).map((_, i) => (
          <motion.div
            key={`flower-${i}`}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 2 + i * 0.2 }}
            className="absolute"
            style={{
              top: `${Math.random() * 50}%`,
              left: i % 2 === 0 ? '-12px' : '8px',
            }}
          >
            <Flower2 className="w-5 h-5 text-pink-400 fill-pink-400/20" />
          </motion.div>
        ))}

        {/* Growth Glow */}
        {score > 70 && (
          <motion.div 
            animate={{ opacity: [0.2, 0.5, 0.2] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute -inset-4 bg-yellow-400/20 blur-xl rounded-full"
          />
        )}
      </motion.div>

      {/* Stats Overlay */}
      <div className="absolute bottom-6 right-6 text-right">
        <div className="text-3xl font-black text-slate-800 leading-none">{score}%</div>
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Growth Index</div>
      </div>

      <div className="absolute bottom-6 left-6 flex gap-4">
        <div className="flex flex-col">
          <span className="text-lg font-bold text-slate-700">{entriesCount}</span>
          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Journals</span>
        </div>
        <div className="flex flex-col">
          <span className="text-lg font-bold text-slate-700">{habitsCount}</span>
          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Habits</span>
        </div>
      </div>
    </div>
  );
};

export default GrowthTree;

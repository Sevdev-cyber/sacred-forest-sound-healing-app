import React from 'react';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="dark:bg-stone-900 bg-white border dark:border-stone-700 border-stone-200 rounded-3xl p-8 max-w-md w-full shadow-2xl relative transition-colors duration-300">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 dark:text-stone-500 text-stone-400 hover:text-stone-700 dark:hover:text-stone-300 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        <h2 className="text-2xl font-bold dark:text-forest-300 text-forest-700 mb-4 font-sans">Sacred Forest Mixer</h2>
        
        <div className="space-y-4 dark:text-stone-300 text-stone-600 leading-relaxed text-sm">
          <p>
            Welcome to your personal sound sanctuary. This soundboard is designed for meditation, yoga, or deep focus.
          </p>
          
          <ul className="list-disc pl-5 space-y-2">
            <li><strong className="dark:text-forest-100 text-forest-800">Gapless Looping:</strong> Sounds loop infinitely without interruption.</li>
            <li><strong className="dark:text-forest-100 text-forest-800">Smart Fading:</strong> Sounds take 3 seconds to fade in/out for a jarring-free experience.</li>
            <li><strong className="dark:text-forest-100 text-forest-800">Layering:</strong> Combine a Tonal Base (Drone) with Atmospheric sounds.</li>
          </ul>

          <p className="italic text-stone-500 text-xs mt-6">
            Note: This demo uses real-time web audio synthesis instead of recorded files to ensure it works instantly in your browser without downloads.
          </p>
        </div>

        <button 
          onClick={onClose}
          className="mt-8 w-full py-3 bg-forest-700 hover:bg-forest-600 text-white rounded-xl font-bold tracking-wide transition-colors"
        >
          Enter the Forest
        </button>
      </div>
    </div>
  );
};

export default InfoModal;
// src/AudioVisualizer.js
import React, { useEffect } from 'react';
import p5 from 'p5'; // Import p5

const AudioVisualizer = ({ mediaRef }) => {
  useEffect(() => {
    const sketch = (p) => {
      p.setup = () => {
        p.createCanvas(400, 400);
        // Additional setup code
      };

      p.draw = () => {
        // Visualization code
      };
    };

    const myP5 = new p5(sketch);

    return () => {
      myP5.remove(); // Cleanup on unmount
    };
  }, [mediaRef]);

  return null; // or return your visualizer component
};

export default AudioVisualizer;
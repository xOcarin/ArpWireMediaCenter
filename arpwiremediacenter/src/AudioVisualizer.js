import React, { useEffect } from 'react';
import p5 from 'p5';
import 'p5/lib/addons/p5.sound';

const AudioVisualizer = ({ mediaRef }) => {
  useEffect(() => {
    const sketch = (p) => {
      let audio;
      let fft;

      p.setup = () => {
        p.createCanvas(300, 100);
        fft = new p5.FFT();
        audio = new p5.AudioIn();
        audio.start();
        fft.setInput(audio);
      };

      p.draw = () => {
        p.background(0);
        let spectrum = fft.analyze();
        p.noStroke();
        for (let i = 0; i < spectrum.length; i++) {
          let x = p.map(i, 0, spectrum.length, 0, p.width);
          let h = -p.map(spectrum[i], 0, 255, 0, p.height);
          p.fill(i, 255, 255);
          p.rect(x, p.height, p.width / spectrum.length, h);
        }
      };
    };

    const p5Instance = new p5(sketch);

    return () => {
      p5Instance.remove(); // Cleanup on unmount
    };
  }, [mediaRef]);

  return <div id="visualizer" />;
};

export default AudioVisualizer;
import { useState, useRef, useEffect } from "react";
import "./App.css";
//const { ipcRenderer } = window.require("electron");
//onClick={() => ipcRenderer.send("minimize-window")
//onClick={() => ipcRenderer.send("close-window")
import AudioVisualizer from './AudioVisualizer'; 
import { Howl } from 'howler'; // Import Howler


function App() {
  const [files, setFiles] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(1); // Volume state (range 0-1)
  const mediaRef = useRef(null);
  const progressRef = useRef(null); // Reference to the progress bar
  const [pressedButton, setPressedButton] = useState(null);
  const [shouldScroll, setShouldScroll] = useState(false);
  const fileNameRef = useRef(null);
  const [tempFileName, setTempFileName] = useState(null); // New state for temporary file name
  const [showVisualizer, setShowVisualizer] = useState(false); // New state for visualizer
  const [sound, setSound] = useState(null); // New state for Howler sound

  useEffect(() => {
    const importMediaFiles = async () => {
      const context = require.context("./media", false, /\.(mp3|wav|mp4)$/);
      const mediaFiles = context.keys().map((file) => ({
        name: file.replace("./", ""),
        src: context(file),
        type: file.endsWith(".mp4") ? "video/mp4" : "audio/mpeg",
      }));
      setFiles(mediaFiles);
    };
    importMediaFiles();
  }, []);

  // Define currentFile after files are set
  const currentFile = files[currentIndex]; // Ensure this is defined after files are populated

  const togglePlayPause = () => {
    if (sound) {
      if (isPlaying) {
        sound.pause();
      } else {
        sound.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const updateProgress = () => {
    if (mediaRef.current) {
      const progressValue = (mediaRef.current.currentTime / mediaRef.current.duration) * 100;
      setProgress(progressValue);
    }
  };

  const nextTrack = () => {
    if (sound) {
        sound.stop(); // Stop the current track
    }
    setCurrentIndex((prevIndex) => (prevIndex + 1) % files.length);
    setIsPlaying(false);
    setProgress(0);
    
    // Play the next track directly
    const newSound = new Howl({
        src: [files[(currentIndex + 1) % files.length].src],
        volume: volume,
        onplay: () => setIsPlaying(true),
        onpause: () => setIsPlaying(false),
        onend: nextTrack, // Automatically go to the next track when the current one ends
    });
    setSound(newSound);
    newSound.play(); // Start playing the next track
}; 

  const prevTrack = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + files.length) % files.length);
    setIsPlaying(false);
    setProgress(0);
  };

  const handleVolumeChange = (e) => {
    const volumeValue = e.target.value;
    setVolume(volumeValue);
    if (mediaRef.current) {
      mediaRef.current.volume = volumeValue; // Update the volume on the media element
    }
  };

  const [isDragging, setIsDragging] = useState(false);

  const handleProgressMouseDown = (e) => {
    setIsDragging(true);
    updateProgressBar(e);
  };

  const handleProgressMouseMove = (e) => {
    if (isDragging) updateProgressBar(e);
  };

  const handleProgressMouseUp = () => {
    setIsDragging(false);
  };

  const updateProgressBar = (e) => {
    if (!mediaRef.current) return;
    const progressBar = progressRef.current;
    const rect = progressBar.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const newProgress = Math.min(Math.max(0, offsetX / rect.width), 1);
    setProgress(newProgress * 100);
    mediaRef.current.currentTime = newProgress * mediaRef.current.duration;
  };

  // Event listeners for dragging behavior
  useEffect(() => {
    window.addEventListener("mouseup", handleProgressMouseUp);
    window.addEventListener("mousemove", handleProgressMouseMove);
    return () => {
      window.removeEventListener("mouseup", handleProgressMouseUp);
      window.removeEventListener("mousemove", handleProgressMouseMove);
    };
  }, [isDragging]);


  // Ensure the volume is set every time the current track changes
  useEffect(() => {
    if (mediaRef.current) {
      mediaRef.current.volume = volume;
    }
  }, [currentIndex, volume]); // Reapply volume when the song or volume changes

  // Auto play the new track when it changes
  useEffect(() => {
    if (currentFile) {
      const newSound = new Howl({
        src: [currentFile.src],
        volume: volume,
        onplay: () => setIsPlaying(true),
        onpause: () => setIsPlaying(false),
        onend: nextTrack, // Automatically go to the next track when the current one ends
      });
      setSound(newSound);
    }
    // Cleanup function to stop the sound when the component unmounts or track changes
    return () => {
      if (sound) {
        sound.stop();
      }
    };
  }, [currentFile]); // This will run when the track changes

  useEffect(() => {
    if (mediaRef.current) {
      mediaRef.current.addEventListener("timeupdate", updateProgress);
      return () => {
        mediaRef.current.removeEventListener("timeupdate", updateProgress);
      };
    }
  }, [currentIndex]);

  const handleButtonClick = (buttonId) => {
    setPressedButton((prevButton) => (prevButton === buttonId ? null : buttonId));
    if (buttonId === 'aud') {
      setShowVisualizer((prev) => !prev); // Toggle visualizer
    }
  };

  useEffect(() => {
    const checkOverflow = () => {
      if (fileNameRef.current) {
        const isOverflowing = fileNameRef.current.scrollWidth > fileNameRef.current.clientWidth;
        setShouldScroll(isOverflowing);
      }
    };

    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    
    return () => {
      window.removeEventListener('resize', checkOverflow);
    };
  }, [files, currentIndex]); // Changed dependency to files and currentIndex

  const handleClockClick = () => {
    const currentTime = new Date().toLocaleTimeString(); // Get current system time
    setTempFileName(currentTime); // Set temporary file name to current time
    setShouldScroll(false); // Disable scrolling
    setTimeout(() => {
      setTempFileName(null); // Revert back to original file name after 3 seconds
      setShouldScroll(true); // Re-enable scrolling after reverting
    }, 3000);
  };

  if (files.length === 0) return <div className="app">Loading media files...</div>;

  return (
      <div className="app">
        <div className="title-bar">
          <div className="drag-region"></div>
          <button className="window-btn">—</button>
          <button className="window-btn close">✕</button>
        </div>
        <div className="player-container">
          <img id={'background'} src="/media player components/background.png" alt="Next" style={{ position: 'absolute' }} />
          <img id={'screen'} src="/media player components/screen.png" alt="Next" style={{ position: 'absolute'}} />
    

          <img 
            id="button1" 
            className={`navbuttons ${pressedButton === 'button1' ? 'active' : ''}`} 
            src="/media player components/1-2.png" 
            alt="Button Image" 
            onClick={() => handleButtonClick('button1')}
          />
          <img 
            id="button2" 
            className={`navbuttons ${pressedButton === 'button2' ? 'active' : ''}`} 
            src="/media player components/2-2.png" 
            alt="Button Image" 
            onClick={() => handleButtonClick('button2')}
          />
          <img 
            id="button3" 
            className={`navbuttons ${pressedButton === 'button3' ? 'active' : ''}`} 
            src="/media player components/3-2.png" 
            alt="Button Image" 
            onClick={() => handleButtonClick('button3')}
          />
          <img 
            id="button4" 
            className={`navbuttons ${pressedButton === 'button4' ? 'active' : ''}`} 
            src="/media player components/4-2.png" 
            alt="Button Image" 
            onClick={() => handleButtonClick('button4')}
          />
          <img 
            id="button5" 
            className={`navbuttons ${pressedButton === 'button5' ? 'active' : ''}`} 
            src="/media player components/5-2.png" 
            alt="Button Image" 
            onClick={() => handleButtonClick('button5')}
          />
          <img 
            id="button6" 
            className={`navbuttons ${pressedButton === 'button6' ? 'active' : ''}`} 
            src="/media player components/6-2.png" 
            alt="Button Image" 
            onClick={() => handleButtonClick('button6')}
          />

          <img 
            id="aud" 
            className="navbuttons"
            src="/media player components/aud-2.png" 
            alt="Button Image" 
            onClick={() => handleButtonClick('aud')}
          />
          <img 
            id="dsc" 
            className="navbuttons"
            src="/media player components/dsc-2.png" 
            alt="Button Image" 
            onClick={() => handleButtonClick('dsc')}
          />

          <img 
            id="clock" 
            className="navbuttons" 
            src="/media player components/clock-2.png" 
            alt="Button Image" 
            onClick={handleClockClick}
          />
          <img 
            id="ba" 
            className="navbuttons"
            src="/media player components/ba-2.png" 
            alt="Button Image" 
            onClick={() => handleButtonClick('ba')}
          />
          <img 
            id="rel" 
            className="navbuttons"
            src="/media player components/rel-2.png" 
            alt="Button Image" 
            onClick={() => handleButtonClick('rel')}
          />

        <img 
          id="on" 
          className="roundButtons" 
          onClick={togglePlayPause} 
          src={isPlaying ? "/media player components/on.png" : "/media player components/play.png"} 
          alt={isPlaying ? "Play Button" : "Pause Button"} 
        />

          <img id="skipL" className="skipButtons" onClick={prevTrack} src="/media player components/skipL.png" alt="Button Image" style={{ pointerEvents: 'none' }} />
          <div className="skipButton-mask skipL-mask" onClick={prevTrack}></div>
          
          <img id="skipR" className="skipButtons" onClick={nextTrack} src="/media player components/skipR.png" alt="Button Image" style={{ pointerEvents: 'none' }} />
          <div className="skipButton-mask skipR-mask" onClick={nextTrack}></div>
          
          <img id="topS" className="skipButtons" src="/media player components/topS.png" alt="Button Image" style={{ pointerEvents: 'none' }} />
          <div className="skipButton-mask topS-mask"></div>
          
          <img id="bottomS" className="skipButtons" src="/media player components/bottomS.png" alt="Button Image" style={{ pointerEvents: 'none' }} />
          <div className="skipButton-mask bottomS-mask"></div>

          <p className={`file-name ${shouldScroll ? 'scroll' : ''}`} ref={fileNameRef}>
            <span>{tempFileName || currentFile.name}</span>
          </p>
          {tempFileName && (
            <p className="time-display">{tempFileName}</p>
          )}
          {currentFile && (
            <>
              {currentFile.type.startsWith("video") ? (
                <video ref={mediaRef} src={currentFile.src} className="video" onClick={togglePlayPause} />
              ) : (
                <audio ref={mediaRef} src={currentFile.src} className="audio" onClick={togglePlayPause} />
              )}
            </>
          )}
          <div className="controls">
            <div className="controls-inner">
              <button className="play-pause" onClick={togglePlayPause}>
                {isPlaying ? "❚❚" : "▶"}
              </button>
            </div>
            <div
                className="progress-bar"
                ref={progressRef}
                onMouseDown={handleProgressMouseDown}
            >
              <div className="progress" style={{ width: `${progress}%` }}></div>
            </div>

            {/* Custom Volume Control */}
            <div className="volume-control">
              <label htmlFor="volume-slider">Volumer:</label>
              <input
                  type="range"
                  id="volume-slider"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  onChange={handleVolumeChange}
              />
              <button>WAWEAW</button>
            </div>

          </div>
        </div>
        {showVisualizer && <AudioVisualizer mediaRef={mediaRef} />} {/* Render visualizer conditionally */}
      </div>
  );

}

export default App;

import { useState, useRef, useEffect } from "react";
import "./App.css";
//const { ipcRenderer } = window.require("electron");
//onClick={() => ipcRenderer.send("minimize-window")
//onClick={() => ipcRenderer.send("close-window")
function App() {
  const [files, setFiles] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(1); // Volume state (range 0-1)
  const mediaRef = useRef(null);
  const progressRef = useRef(null); // Reference to the progress bar

  useEffect(() => {
    const importMediaFiles = async () => {
      const context = require.context("./media", false, /\.(mp3|wav|mp4)$/);
      const mediaFiles = context.keys().map((file, index) => ({
        name: file.replace("./", ""),
        src: context(file),
        type: file.endsWith(".mp4") ? "video/mp4" : "audio/mpeg",
      }));
      setFiles(mediaFiles);
    };
    importMediaFiles();
  }, []);

  const togglePlayPause = () => {
    if (mediaRef.current) {
      if (isPlaying) {
        mediaRef.current.pause();
      } else {
        mediaRef.current.play();
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
    setCurrentIndex((prevIndex) => (prevIndex + 1) % files.length);
    setIsPlaying(false);
    setProgress(0);
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
    if (mediaRef.current) {
      mediaRef.current.play(); // Start playing the new track
      setIsPlaying(true); // Set isPlaying to true so UI reflects playing state
    }
  }, [currentIndex]); // This will run when the track changes

  useEffect(() => {
    if (mediaRef.current) {
      mediaRef.current.addEventListener("timeupdate", updateProgress);
      return () => {
        mediaRef.current.removeEventListener("timeupdate", updateProgress);
      };
    }
  }, [currentIndex]);

  if (files.length === 0) return <div className="app">Loading media files...</div>;

  const currentFile = files[currentIndex];

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
          <button className={"navbuttons"} id="number1" style={{ position: 'absolute' }}>
            1
          </button>

          <img src="/media player components/1.png" alt="Button Image" style={{ position: 'absolute', width: '10%', height: '10%', objectFit: 'cover', display: 'block', bottom: '30px'}} />
          



          <button className={"navbuttons"} id="number2" style={{ position: 'absolute'}}>
          2
          </button>
          <button className={"navbuttons"} id="number3" style={{ position: 'absolute'}}>
          3
          </button>
          <button className={"navbuttons"} id="number4" style={{ position: 'absolute'}}>
          4
          </button>
          <button className={"navbuttons"} id="number5" style={{ position: 'absolute'}}>
          5
          </button>
          <button className={"navbuttons"} id="number6" style={{ position: 'absolute'}}>
          6
          </button>
          <p className="file-name">{currentFile.name}</p>
          {currentFile.type.startsWith("video") ? (
              <video ref={mediaRef} src={currentFile.src} className="video" onClick={togglePlayPause} />
          ) : (
              <audio ref={mediaRef} src={currentFile.src} className="audio" onClick={togglePlayPause} />
          )}
          <div className="controls">
            <div className="controls-inner">
              <button className="skip" onClick={prevTrack}>
                <img src="/media player components/skipl.png" alt="Previous" style={{ position: 'absolute', top: '10px', left: '10px' }} />
              </button>
              <button className="play-pause" onClick={togglePlayPause}>
                {isPlaying ? "❚❚" : "▶"}
              </button>
              <button className="skip" onClick={nextTrack}>
                <img src="/media player components/skipr.png" alt="Next" style={{ position: 'absolute', top: '10px', right: '10px' }} />
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
      </div>
  );

}

export default App;

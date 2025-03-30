import { useState, useRef, useEffect } from "react";
import "./App.css";

function App() {
  const [files, setFiles] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const mediaRef = useRef(null);

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
      <div className="player-container">
        <p className="file-name">Now playing: {currentFile.name}</p>
        {currentFile.type.startsWith("video") ? (
          <video ref={mediaRef} src={currentFile.src} className="video" controls />
        ) : (
          <audio ref={mediaRef} src={currentFile.src} className="audio" controls />
        )}
        <div className="controls">
          <div className="controls-inner">
            <button className="skip" onClick={prevTrack}>⏮</button>
            <button className="play-pause" onClick={togglePlayPause}>
              {isPlaying ? "❚❚" : "▶"} 
            </button>
            <button className="skip" onClick={nextTrack}>⏭</button>
          </div>
          <div className="progress-bar">
            <div className="progress" style={{ width: `${progress}%` }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;


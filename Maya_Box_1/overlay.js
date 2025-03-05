// Enhanced React component for the overlay
function Overlay() {
  const [time, setTime] = React.useState(new Date().toLocaleTimeString());
  const [isRecording, setIsRecording] = React.useState(false);
  const [snapshots, setSnapshots] = React.useState([]);
  
  // Update the clock
  React.useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);
  
  // Toggle recording state
  const toggleRecording = () => {
    setIsRecording(!isRecording);
    console.log(`Recording ${!isRecording ? 'started' : 'stopped'}`);
  };
  
  // Take a snapshot
  const takeSnapshot = () => {
    // Add current time to snapshots for UI feedback
    const newSnapshot = new Date().toISOString();
    setSnapshots([...snapshots, newSnapshot]);
    console.log(`Snapshot taken at ${newSnapshot}`);
  };
  
  return (
    <div className="overlay">
      {/* Big glass pane with test message */}
      <div className="glass-pane">
        <div className="test-message">THIS IS A TEST</div>
      </div>
      
      <div className="timestamp">{time}</div>
      
      {/* Optional: Display recent snapshots */}
      {snapshots.length > 0 && (
        <div className="snapshots">
          <div className="snapshot-label">Recent Snapshot:</div>
          <div className="snapshot-time">{new Date(snapshots[snapshots.length - 1]).toLocaleTimeString()}</div>
        </div>
      )}
      
      <div className="controls">
        <button 
          className={isRecording ? "recording" : ""} 
          onClick={toggleRecording}
        >
          {isRecording ? "Stop Recording" : "Record"}
        </button>
        <button onClick={takeSnapshot}>Snapshot</button>
      </div>
    </div>
  );
}

// Render the component
ReactDOM.render(<Overlay />, document.getElementById('root'));

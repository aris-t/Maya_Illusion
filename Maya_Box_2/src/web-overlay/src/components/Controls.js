import React from 'react';

function Controls({ isRecording, onRecordToggle, onSnapshotTake }) {
  return (
    <div className="controls">
      <button 
        className={isRecording ? "recording" : ""} 
        onClick={onRecordToggle}
      >
        {isRecording ? "Stop Recording" : "Record"}
      </button>
      <button onClick={onSnapshotTake}>Snapshot</button>
    </div>
  );
}

export default Controls;

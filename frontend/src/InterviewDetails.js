import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import "./Dashboard.css";

const InterviewDetails = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { callData, candidateData } = location.state || {};

  if (!callData || !candidateData) {
    return <div className="no-data">No interview data found.</div>;
  }

  // Format call status for display
  const formatCallStatus = (status) => {
    const statusMap = {
      'completed': 'Completed',
      'failed': 'Failed',
      'no-answer': 'Not Picked Up',
      'busy': 'Line Busy',
      'canceled': 'Canceled',
      'in-progress': 'In Progress',
      'scheduled': 'Scheduled'
    };
    return statusMap[candidateData.status] || statusMap[candidateData.terminationReason] || 'Unknown';
  };

  const formatDuration = (seconds) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="interview-details-container">
      <button
        className="back-button"
        onClick={() => navigate(-1)}
      >
        <FontAwesomeIcon icon={faArrowLeft} /> Back to Dashboard
      </button>

      <h2>Interview Details for {candidateData.name}</h2>

      <div className="interview-meta-info">
        <div className="meta-card">
          <p><strong>Status:</strong> <span className={`status-${candidateData.status || candidateData.terminationReason}`}>
            {formatCallStatus()}
          </span></p>
        </div>

        <div className="meta-card">
          <p><strong>Job Role:</strong> {callData.jobRole}</p>
          <p><strong>Scheduled:</strong> {new Date(callData.scheduledTime).toLocaleString()}</p>
        </div>
      </div>

      <div className="score-section">
        <h3>AI Evaluation</h3>
        {candidateData.scoreJustification ? (
          <div className="evaluation-card">
            <div className="score-display">
              <div className="score-circle">
                <span>{candidateData.score || candidateData.technicalScore}</span>
                <small>/10</small>
              </div>
              <div className="score-label">Overall Score</div>
            </div>

            <div className="score-details">
              <h4>Evaluation Summary</h4>
              <p className="justification">{candidateData.scoreJustification}</p>

              <div className="score-breakdown">
                <h4>Detailed Scores</h4>
                <p><strong>Technical:</strong> {candidateData.technicalScore}/10</p>
                <p><strong>Communication:</strong> {candidateData.communicationScore}/10</p>
                <p><strong>Status:</strong> {candidateData.completionStatus}</p>
              </div>

              {candidateData.scoreBreakdown?.length > 0 && (
                <>
                  <h4>Category Breakdown</h4>
                  <ul className="breakdown-list">
                    {candidateData.scoreBreakdown.map((item, i) => (
                      <li key={i}>
                        <strong>{item.category}:</strong> {item.score}/10 - {item.comment}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="no-score">
            <p>No evaluation available for this interview.</p>
          </div>
        )}
      </div>

      <div className="transcript-section">
        <h3>Conversation Transcript</h3>
        {candidateData.transcript ? (
          <div className="transcript-content">
            {candidateData.transcript.split('\n\n').map((line, i) => (
              <div
                key={i}
                className={`transcript-line ${line.startsWith('assistant:') ? 'ai-message' : 'user-message'}`}
              >
                <span className="speaker">
                  {line.startsWith('assistant:') ? 'Interviewer' : 'Candidate'}:
                </span>
                {line.replace(/^(assistant|user):\s*/, '')}
              </div>
            ))}
          </div>
        ) : (
          <p className="no-transcript">No transcript available for this interview.</p>
        )}
      </div>
    </div>
  );
};

export default InterviewDetails;
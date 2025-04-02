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
    return <div>No interview data found.</div>;
  }

  return (
    <div className="interview-details-container">
      <button 
        className="back-button"
        onClick={() => navigate(-1)}
      >
        <FontAwesomeIcon icon={faArrowLeft} /> Back to Dashboard
      </button>

      <h2>Interview Details for {candidateData.name}</h2>
      
      <div className="interview-basic-info">
        <p><strong>Job Role:</strong> {callData.jobRole}</p>
        <p><strong>Date:</strong> {new Date(callData.scheduledTime).toLocaleDateString()}</p>
        <p><strong>Time:</strong> {new Date(callData.scheduledTime).toLocaleTimeString()}</p>
        <p><strong>Phone:</strong> {candidateData.phone}</p>
      </div>

      <div className="score-section">
        <h3>AI Evaluation Score: {candidateData.score || "N/A"}</h3>
        {candidateData.score && (
          <>
            <div className="score-justification">
              <h4>Evaluation Summary</h4>
              <p>{candidateData.scoreJustification || "No detailed evaluation available."}</p>
            </div>

            <div className="score-breakdown">
              <h4>Score Breakdown</h4>
              <ul>
                {candidateData.scoreBreakdown?.map((item, i) => (
                  <li key={i}>
                    <strong>{item.category}:</strong> {item.score}/10 - {item.comment}
                  </li>
                )) || <li>No detailed breakdown available.</li>}
              </ul>
            </div>
          </>
        )}
      </div>

      <div className="transcript-section">
        <h3>Interview Transcript</h3>
        {candidateData.transcript ? (
          <div className="transcript-content">
            {candidateData.transcript}
          </div>
        ) : (
          <p>No transcript available for this interview.</p>
        )}
      </div>
    </div>
  );
};

export default InterviewDetails;
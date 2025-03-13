import React, { useState } from "react";
import "./Scheduler.css"; // Import the CSS file

const Scheduler = () => {
  const [jobRole, setJobRole] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [candidatePhone, setCandidatePhone] = useState("");
  const [interviewDateTime, setInterviewDateTime] = useState("");

  const handleScheduler = () => {
    // Add logic to handle the call scheduling
    console.log("Call scheduled with the following details:");
    console.log("Job Role:", jobRole);
    console.log("Job Description:", jobDescription);
    console.log("Candidate Phone:", candidatePhone);
    console.log("Interview Date & Time:", interviewDateTime);
    alert("Call scheduled successfully! 🎉");
  };

  return (
    <div className="scheduler">
      <h1>Welcome HRs! </h1>
       <h2> Let's Automate That Phone Interview for You.</h2>
      <p className="tagline">
        Say goodbye to manual scheduling and hello to AI-powered interviews. 
        Let’s make hiring smarter, faster, and cooler than ever! 
      </p>

      <div className="form-container">
        <div className="form-group">
          <label htmlFor="jobRole">Job Role</label>
          <input
            type="text"
            id="jobRole"
            value={jobRole}
            onChange={(e) => setJobRole(e.target.value)}
            placeholder="Enter the job role (e.g., Software Engineer)"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="jobDescription">Job Description</label>
          <textarea
            id="jobDescription"
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Enter the job description"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="candidatePhone">Candidate's Phone Number</label>
          <input
            type="tel"
            id="candidatePhone"
            value={candidatePhone}
            onChange={(e) => setCandidatePhone(e.target.value)}
            placeholder="Enter the candidate's phone number"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="interviewDateTime">Interview Date & Time</label>
          <input
            type="datetime-local"
            id="interviewDateTime"
            value={interviewDateTime}
            onChange={(e) => setInterviewDateTime(e.target.value)}
            required
          />
        </div>

        <button className="scheduler-button" onClick={handleScheduler}>
          Schedule
        </button>
      </div>
    </div>
  );
};

export default Scheduler;
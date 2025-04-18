import React, { useState, useEffect } from "react"; // Import useEffect
import "./Contact.css";

const Contact = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState(""); // State for status message

  // Clear the status message after 1 minute (60,000 milliseconds)
  useEffect(() => {
    if (statusMessage) {
      const timer = setTimeout(() => {
        setStatusMessage(""); // Clear the message
      }, 60000); // 1 minute = 60,000 milliseconds

      return () => clearTimeout(timer); // Cleanup the timer
    }
  }, [statusMessage]); // Run this effect whenever statusMessage changes

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/send-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, message }),
      });

      if (response.ok) {
        setStatusMessage("Message sent successfully! Thank you for reaching out. We will get back to you soon"); // Set success message
      } else {
        setStatusMessage("Failed to send message. Please try again."); 
      }
    } catch (error) {
      console.error("Error:", error);
      setStatusMessage("An error occurred. Please try again."); 
    }

    // Clear the form
    setName("");
    setEmail("");
    setMessage("");
  };

  return (
    <section id="contact" className="contact">
      <div className="contact">
        <h1>Contact Us</h1>
        <form className="contact-form" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Your Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            type="email"
            placeholder="Your Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <textarea
            placeholder="Your Message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
          />

          {/* Display status message above the button */}
          {statusMessage && (
            <p className={`status-message ${statusMessage.includes("successfully") ? "success" : "error"}`}>
              {statusMessage}
            </p>
          )}

          <button type="submit">Send Message</button>
        </form>
      </div>
    </section>
  );
};

export default Contact;
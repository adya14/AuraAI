import React, { useEffect } from "react";
import "./Contact.css";

const Contact = () => {

  return (
    <section id="contact" className="contact">
      <div className="contact">
        <h1>Contact Us</h1>
        <form className="contact-form">
          <input type="text" placeholder="Your Name" required />
          <input type="email" placeholder="Your Email" required />
          <textarea placeholder="Your Message" required></textarea>
          <button type="submit">Send Message</button>
        </form>
      </div>
    </section>
  );
};

export default Contact;
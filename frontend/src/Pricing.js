import React from "react";
import "./Pricing.css";

const Pricing = () => {
  return (
    <div className="pricing">
      <h1>Pricing</h1>
      <div className="pricing-cards">
        <div className="card">
          <h2>Basic Plan</h2>
          <p>₹999/month</p>
          <ul>
            <li>50 AI Interviews per month</li>
            <li>Basic Analytics</li>
            <li>Email Support</li>
          </ul>
          <button className="pricing-button">Buy Now</button>
        </div>
        <div className="card">
          <h2>Pro Plan</h2>
          <p>₹4999/month</p>
          <ul>
            <li>250 AI Interviews per month</li>
            <li>Advanced Analytics</li>
            <li>Priority Support</li>
          </ul>
          <button className="pricing-button">Buy Now</button>
        </div>
        <div className="card">
          <h2>Quantum Flex Plan</h2>
          <p>Pay as you go</p>
          <ul>
            <li>Unlimited AI Interviews</li>
            <li>Advanced Analytics</li>
            <li>Priority Support</li>
          </ul>
          <button className="pricing-button">Contact Us</button>
        </div>
      </div>
    </div>
  );
};

export default Pricing;
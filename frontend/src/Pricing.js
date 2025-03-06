import React from "react";
import "./Pricing.css";

const Pricing = () => {
  return (
    <div className="pricing">
      <h1>Pricing</h1>
      <div className="pricing-cards">
        <div className="card">
          <h2>Basic Plan</h2>
          <p>$99/month</p>
          <ul>
            <li>10 AI Interviews per month</li>
            <li>Basic Analytics</li>
            <li>Email Support</li>
          </ul>
          <button className="pricing-button">Buy Now</button>
        </div>
        <div className="card">
          <h2>Pro Plan</h2>
          <p>$199/month</p>
          <ul>
            <li>50 AI Interviews per month</li>
            <li>Advanced Analytics</li>
            <li>Priority Support</li>
          </ul>
          <button className="pricing-button">Buy Now</button>
        </div>
        <div className="card">
          <h2>Enterprise Plan</h2>
          <p>Custom Pricing</p>
          <ul>
            <li>Unlimited AI Interviews</li>
            <li>Custom Analytics</li>
            <li>Dedicated Account Manager</li>
          </ul>
          <button className="pricing-button">Contact Us</button>
        </div>
      </div>
    </div>
  );
};

export default Pricing;
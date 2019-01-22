import React, { Component } from 'react';
import logo from '../logo.svg';
import './IdleScreen.css';

class IdleScreen extends Component {

  getDate() {
    return new Date().toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true });
  }
  
  render() {
    return (
      <div>
        <img src={logo} className="app-logo" alt="logo" />
        <div className="time">
          {this.getDate()}
        </div>
      </div>
    );
  }

}

export default IdleScreen;

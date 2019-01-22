import React, { Component } from 'react';
import './ActiveScreen.css';

class ActiveScreen extends Component {
  constructor(props){
    super(props);
    this.state ={
      activeUser: this.props.activeUser,
    }
  }

  getGreeting() {
    var hour = new Date().getHours();
    if ((hour < 12) && (hour > 2)) {
      return "Good morning";
    }
    else if ((hour >= 12) && (hour < 17)) {
      return "Good afternoon";
    }
    else {
      return "Good evening";
    }
  }

  render() {
    return (
      <div>
        <div className="greeting">
          {this.getGreeting()}, {this.state.activeUser}!
        </div>
      </div>
    );
  }

}

export default ActiveScreen;

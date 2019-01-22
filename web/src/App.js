import React, { Component } from 'react';
import './App.css';
import Tracker from './Tracker/Tracker';
import ActiveScreen from './ActiveScreen/ActiveScreen';
import IdleScreen from './IdleScreen/IdleScreen';
import RegistrationScreen from './RegistrationScreen/RegistrationScreen';

class App extends Component {
  constructor(props){
    super(props);
    this.state ={
      screen: this.Screen.Idle,
      activeUser: "",
      imageData: ""
    }
  }

  Screen = { Idle: 1, Registration: 2, Active: 3 };

  setActive = (user) => {
    this.setState({ screen: this.Screen.Active, activeUser: user, imageData: "" });
  }

  setIdle = () => {
    this.setState({ screen: this.Screen.Idle, activeUser: "", imageData: "" });
  }

  goToRegistrationPage = (imageData) => {
    this.setState({ screen: this.Screen.Registration, activeUser: "", imageData: imageData });
  }

  render() {
    return (
      <div className="app">
        <div className="page">
          {(this.state.screen === this.Screen.Idle) && <IdleScreen /> }
          {(this.state.screen === this.Screen.Active) && <ActiveScreen activeUser={this.state.activeUser} />}
          {(this.state.screen === this.Screen.Registration) && <RegistrationScreen imageData={this.state.imageData} setIdle={this.setIdle} />}
        </div>
        <div className="tracker">
          {(this.state.screen !== this.Screen.Registration) && <Tracker setActive={this.setActive} setIdle={this.setIdle} goToRegistrationPage={this.goToRegistrationPage} />}
        </div>
      </div>
    );
  }

}

export default App;

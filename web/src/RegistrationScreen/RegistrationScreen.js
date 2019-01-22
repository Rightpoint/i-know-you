import React, { Component } from 'react';
import { Button, Checkbox } from 'react-bootstrap';
import './RegistrationScreen.css';

class RegistrationScreen extends Component {
  constructor(props){
    super(props);
    this.state ={
      savePassword: false
    }
  }

  toggleSaveEmail = () => {
    this.setState({ savePassword: !this.state.savePassword });
  }

  addNewUser = () => {
    // access the image via this.props.imageData;

  }

  render() {
    return (
      <div className="registration">
        <Button onClick={this.props.setIdle}>X</Button>
        <h1>We don't recognize you!</h1>
        <div>If you would like to be recognized in the future, please enter your email below.</div>
        <div className="left-col">
          <div>Email:</div>
          <div>Password:</div>
        </div>
        <div className="right-col">
          <input type="text" id="emailField" pattern="[a-zA-Z]{2,30}((@rightpoint.com)|(@raizlabs.com)){1}" maxLength="50" autoComplete="off" /><br/>
          <input type="password" id="passwordField" maxLength="50" autoComplete="off" />
        </div>
        <div>
          <span className="left-col">Save Password?</span>
          <div className="right-col">
            <Checkbox checked={this.state.savePassword} onChange={this.toggleSaveEmail} />
          </div>
        </div>
        <br/>
        <Button onClick={this.addNewUser}>Submit</Button>
      </div>
    );
  }

}

export default RegistrationScreen;

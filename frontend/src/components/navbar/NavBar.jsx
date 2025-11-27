import React from 'react';
import Sidebar from "../sidebar/SideBar";
import './Navbar.css';

export default function Navbar() {
  return (
    <nav className="navbar">
      <Sidebar />
      <h1 className="navbar-title">MindEase</h1>
      <div className="navbar-subtitle">You're not alone.</div>
    </nav>
  );
}

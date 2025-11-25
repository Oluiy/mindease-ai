import { useState } from "react";
import { Menu, X, Home, MessageSquare, Settings } from "lucide-react";
import { Button } from 'react-bootstrap';import './SideBar.css';

export default function Sidebar() {
  const [open, setOpen] = useState(false);

  return (
  <div className="sidebar-container">
    <Button variant="link" onClick={() => setOpen(!open)} className="sidebar-toggle">
      {open ? <X size={20} /> : <Menu size={20} />}
    </Button>

    <div className={`sidebar ${open ? "sidebar-open" : "sidebar-closed"}`}>
      <div className="sidebar-header">Menu</div>

      <div className="sidebar-menu">
        <SidebarItem icon={<Home size={18} />} label="Home" />
        <SidebarItem icon={<MessageSquare size={18} />} label="Chat" />
        <SidebarItem icon={<Settings size={18} />} label="Settings" />
      </div>
    </div>

    {open && (
      <div
        onClick={() => setOpen(false)}
        className="sidebar-overlay"
      />
    )}
  </div>
);
}

function SidebarItem({ icon, label }) {
  return (
    <button className="sidebar-item">
      {icon}
      <span>{label}</span>
    </button>
  );
}

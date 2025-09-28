import React, { useState } from "react";
import { Tabs } from "antd";
import Chat from "./pages/Chat";
import Dash from "./pages/Dash";
import ApiTest from "./pages/ApiTest";

const App = () => {
  const [activeTab, setActiveTab] = useState("apitest");

  return (
    <div style={{ padding: 20 }}>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          { key: "apitest", label: "🔧 API Test", children: <ApiTest /> },
          { key: "chat", label: "Interviewee (Chat)", children: <Chat /> },
          { key: "dash", label: "Interviewer (Dashboard)", children: <Dash /> },
        ]}
      />
    </div>
  );
};

export default App;

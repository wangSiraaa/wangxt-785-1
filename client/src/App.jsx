import React from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Layout, Menu, Typography } from 'antd';
import { 
  FileAddOutlined, 
  CameraOutlined, 
  ToolOutlined, 
  AuditOutlined, 
  UnorderedListOutlined 
} from '@ant-design/icons';
import ReportList from './pages/ReportList';
import ReportCreate from './pages/ReportCreate';
import Survey from './pages/Survey';
import Assessment from './pages/Assessment';
import Review from './pages/Review';
import ReportDetail from './pages/ReportDetail';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

const menuItems = [
  { key: '/', icon: <UnorderedListOutlined />, label: <Link to="/">案件列表</Link> },
  { key: '/create', icon: <FileAddOutlined />, label: <Link to="/create">报案登记</Link> },
  { key: '/survey', icon: <CameraOutlined />, label: <Link to="/survey">查勘管理</Link> },
  { key: '/assessment', icon: <ToolOutlined />, label: <Link to="/assessment">定损管理</Link> },
  { key: '/review', icon: <AuditOutlined />, label: <Link to="/review">复核队列</Link> },
];

function App() {
  const location = useLocation();
  const selectedKey = location.pathname === '/' ? '/' : 
    menuItems.find(item => location.pathname.startsWith(item.key))?.key || '/';

  return (
    <Layout className="app-container">
      <Header style={{ background: '#001529', display: 'flex', alignItems: 'center', padding: '0 24px' }}>
        <Title level={4} style={{ color: '#fff', margin: 0, marginRight: 48 }}>
          保险查勘定损协作系统
        </Title>
      </Header>
      <Layout>
        <Sider width={200} theme="light">
          <Menu
            mode="inline"
            selectedKeys={[selectedKey]}
            items={menuItems}
            style={{ height: '100%', borderRight: 0 }}
          />
        </Sider>
        <Layout style={{ padding: '0 24px 24px' }}>
          <Content className="main-content">
            <Routes>
              <Route path="/" element={<ReportList />} />
              <Route path="/create" element={<ReportCreate />} />
              <Route path="/survey" element={<Survey />} />
              <Route path="/survey/:id" element={<Survey />} />
              <Route path="/assessment" element={<Assessment />} />
              <Route path="/assessment/:id" element={<Assessment />} />
              <Route path="/review" element={<Review />} />
              <Route path="/report/:id" element={<ReportDetail />} />
            </Routes>
          </Content>
        </Layout>
      </Layout>
    </Layout>
  );
}

export default App;

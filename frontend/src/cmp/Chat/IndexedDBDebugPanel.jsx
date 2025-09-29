import React, { useState, useEffect } from 'react';
import { Card, Button, Table, Typography, Space, Tag, Statistic } from 'antd';
import { DatabaseOutlined, UserOutlined, DeleteOutlined } from '@ant-design/icons';
import { useIndexedDB } from '../../util/useIndexedDB';

const { Title, Text } = Typography;

const IndexedDBDebugPanel = () => {
  const { 
    isInitialized, 
    isLoading, 
    error, 
    getAllUsers, 
    getUsersCount, 
    deleteUser 
  } = useIndexedDB();
  
  const [users, setUsers] = useState([]);
  const [userCount, setUserCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  // Load users data
  const loadUsers = async () => {
    try {
      setRefreshing(true);
      const [allUsers, count] = await Promise.all([
        getAllUsers(),
        getUsersCount()
      ]);
      setUsers(allUsers);
      setUserCount(count);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setRefreshing(false);
    }
  };

  // Load data when component mounts and DB is ready
  useEffect(() => {
    if (isInitialized && !isLoading) {
      loadUsers();
    }
  }, [isInitialized, isLoading]);

  // Handle delete user
  const handleDeleteUser = async (email) => {
    try {
      await deleteUser(email);
      loadUsers(); // Refresh list
    } catch (err) {
      console.error('Failed to delete user:', err);
    }
  };

  // Table columns
  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone',
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => new Date(date).toLocaleString(),
    },
    {
      title: 'Updated',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      render: (date) => new Date(date).toLocaleString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Button 
          type="text" 
          danger 
          icon={<DeleteOutlined />}
          onClick={() => handleDeleteUser(record.email)}
          size="small"
        >
          Delete
        </Button>
      ),
    },
  ];

  if (!isInitialized) {
    return (
      <Card title="🔄 IndexedDB Debug Panel" style={{ marginBottom: '20px' }}>
        <Text>Initializing IndexedDB...</Text>
      </Card>
    );
  }

  if (error) {
    return (
      <Card title="❌ IndexedDB Debug Panel" style={{ marginBottom: '20px' }}>
        <Text type="danger">Error: {error}</Text>
      </Card>
    );
  }

  return (
    <Card 
      title={
        <Space>
          <DatabaseOutlined />
          IndexedDB Debug Panel
          <Tag color={isInitialized ? 'green' : 'red'}>
            {isInitialized ? 'Connected' : 'Disconnected'}
          </Tag>
        </Space>
      }
      style={{ marginBottom: '20px' }}
      extra={
        <Button onClick={loadUsers} loading={refreshing}>
          Refresh
        </Button>
      }
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        {/* Statistics */}
        <Space size="large">
          <Statistic 
            title="Total Users" 
            value={userCount} 
            prefix={<UserOutlined />} 
          />
          <Statistic 
            title="Status" 
            value={isInitialized ? "Ready" : "Not Ready"} 
            valueStyle={{ color: isInitialized ? '#3f8600' : '#cf1322' }}
          />
        </Space>

        {/* Users Table */}
        <Table
          dataSource={users}
          columns={columns}
          rowKey="email"
          size="small"
          pagination={{ pageSize: 5 }}
          loading={refreshing}
          locale={{ 
            emptyText: 'No users stored yet. Complete an interview to see data here.' 
          }}
        />
      </Space>
    </Card>
  );
};

export default IndexedDBDebugPanel;
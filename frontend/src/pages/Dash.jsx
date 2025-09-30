import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Card, 
  Input, 
  Select, 
  Space, 
  Button, 
  Tag, 
  Statistic, 
  Row, 
  Col,
  Modal,
  Typography,
  Divider,
  Badge,
  Avatar,
  message,
  Spin,
  Empty
} from 'antd';
import { 
  SearchOutlined, 
  UserOutlined, 
  EyeOutlined,
  TrophyOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import apiService from '../services/apiService';
import CandidateDetailModal from '../cmp/Dash/CandidateDetailModal';

const { Title, Text } = Typography;
const { Option } = Select;

const Dashboard = () => {
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('completedAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    inProgress: 0,
    abandoned: 0,
    averageScore: 0
  });

  // Fetch interviews data
  const fetchInterviews = async () => {
    try {
      setLoading(true);
      const response = await apiService.getAllInterviews({
        search: searchText,
        sortBy,
        sortOrder,
        status: statusFilter
      });
      
      if (response.success) {
        setInterviews(response.interviews);
        calculateStats(response.interviews);
      }
    } catch (error) {
      console.error('Error fetching interviews:', error);
      message.error('Failed to fetch interviews data');
    } finally {
      setLoading(false);
    }
  };

  // Calculate dashboard statistics
  const calculateStats = (interviewsData) => {
    const total = interviewsData.length;
    const completed = interviewsData.filter(i => i.status === 'completed').length;
    const inProgress = interviewsData.filter(i => i.status === 'in-progress').length;
    const abandoned = interviewsData.filter(i => i.status === 'abandoned').length;
    
    const completedInterviews = interviewsData.filter(i => i.status === 'completed' && i.averageScore);
    const averageScore = completedInterviews.length > 0 
      ? completedInterviews.reduce((sum, i) => sum + i.averageScore, 0) / completedInterviews.length 
      : 0;

    setStats({
      total,
      completed,
      inProgress,
      abandoned,
      averageScore: Math.round(averageScore * 10) / 10
    });
  };

  // Handle search
  const handleSearch = (value) => {
    setSearchText(value);
  };

  // Handle status filter change
  const handleStatusChange = (value) => {
    setStatusFilter(value);
  };

  // Handle sort change
  const handleSortChange = (field, order) => {
    setSortBy(field);
    setSortOrder(order);
  };

  // Show candidate details
  const showCandidateDetails = (candidate) => {
    setSelectedCandidate(candidate);
    setDetailModalVisible(true);
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in-progress': return 'processing';
      case 'abandoned': return 'error';
      default: return 'default';
    }
  };

  // Get score color
  const getScoreColor = (score) => {
    if (score >= 8) return '#52c41a';
    if (score >= 6) return '#faad14';
    if (score >= 4) return '#ff7a45';
    return '#ff4d4f';
  };

  // Table columns
  const columns = [
    {
      title: 'Candidate',
      dataIndex: 'candidateInfo',
      key: 'candidate',
      render: (candidateInfo) => (
        <Space>
          <Avatar icon={<UserOutlined />} />
          <div>
            <div style={{ fontWeight: 500 }}>
              {candidateInfo?.name || 'N/A'}
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              {candidateInfo?.email}
            </div>
          </div>
        </Space>
      ),
      sorter: true,
    },
    {
      title: 'Phone',
      dataIndex: ['candidateInfo', 'phone'],
      key: 'phone',
      render: (phone) => phone || 'N/A',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={getStatusColor(status)}>
          {status.toUpperCase()}
        </Tag>
      ),
      filters: [
        { text: 'Completed', value: 'completed' },
        { text: 'In Progress', value: 'in-progress' },
        { text: 'Abandoned', value: 'abandoned' },
      ],
    },
    {
      title: 'Questions',
      key: 'questions',
      render: (_, record) => {
        const answered = record.questions?.filter(q => q.answered).length || 0;
        const total = record.questions?.length || 0;
        return (
          <div>
            <Text>{answered}/{total}</Text>
            <div style={{ fontSize: '12px', color: '#666' }}>answered</div>
          </div>
        );
      },
    },
    {
      title: 'Average Score',
      dataIndex: 'averageScore',
      key: 'averageScore',
      render: (score) => (
        <div style={{ textAlign: 'center' }}>
          {score ? (
            <div>
              <div 
                style={{ 
                  fontWeight: 'bold', 
                  color: getScoreColor(score),
                  fontSize: '16px'
                }}
              >
                {typeof score === 'number' ? score.toFixed(1) : score}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>/ 10</div>
            </div>
          ) : (
            <Text type="secondary">N/A</Text>
          )}
        </div>
      ),
      sorter: true,
    },
    {
      title: 'Duration',
      dataIndex: 'duration',
      key: 'duration',
      render: (duration) => duration ? `${duration}m` : 'N/A',
    },
    {
      title: 'Completed',
      dataIndex: 'completedAt',
      key: 'completedAt',
      render: (date, record) => {
        const d = date || record.startedAt;
        return d ? new Date(d).toLocaleDateString() : 'N/A';
      },
      sorter: true,
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, record) => (
        <Button
          icon={<EyeOutlined />}
          onClick={() => showCandidateDetails(record)}
          type="primary"
          size="small"
        >
          View Details
        </Button>
      ),
    },
  ];

  // Effect to fetch data when filters change
  useEffect(() => {
    fetchInterviews();
  }, [searchText, statusFilter, sortBy, sortOrder]);

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>
        <TrophyOutlined /> Interviewer Dashboard
      </Title>

      {/* Statistics Cards */}
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Interviews"
              value={stats.total}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Completed"
              value={stats.completed}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="In Progress"
              value={stats.inProgress}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Average Score"
              value={stats.averageScore}
              suffix="/ 10"
              precision={1}
              valueStyle={{ color: getScoreColor(stats.averageScore) }}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters and Search */}
      <Card style={{ marginBottom: '24px' }}>
        <Space size="middle" wrap>
          <Input.Search
            placeholder="Search by name, email, or phone"
            onSearch={handleSearch}
            onChange={(e) => handleSearch(e.target.value)}
            style={{ width: 300 }}
            prefix={<SearchOutlined />}
          />
          
          <Select
            placeholder="Filter by status"
            value={statusFilter}
            onChange={handleStatusChange}
            style={{ width: 150 }}
          >
            <Option value="all">All Status</Option>
            <Option value="completed">Completed</Option>
            <Option value="in-progress">In Progress</Option>
            <Option value="abandoned">Abandoned</Option>
          </Select>

          <Select
            placeholder="Sort by"
            value={`${sortBy}-${sortOrder}`}
            onChange={(value) => {
              const [field, order] = value.split('-');
              handleSortChange(field, order);
            }}
            style={{ width: 200 }}
          >
            <Option value="completedAt-desc">Latest First</Option>
            <Option value="completedAt-asc">Oldest First</Option>
            <Option value="averageScore-desc">Highest Score</Option>
            <Option value="averageScore-asc">Lowest Score</Option>
            <Option value="candidateInfo.name-asc">Name A-Z</Option>
            <Option value="candidateInfo.name-desc">Name Z-A</Option>
          </Select>

          <Button onClick={fetchInterviews}>
            Refresh
          </Button>
        </Space>
      </Card>

      {/* Interviews Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={interviews}
          loading={loading}
          rowKey={(record) => record._id || record.id || record._doc?._id}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} of ${total} interviews`,
          }}
          locale={{
            emptyText: <Empty description="No interviews found" />
          }}
        />
      </Card>

      {/* Candidate Detail Modal */}
      <CandidateDetailModal
        visible={detailModalVisible}
        candidate={selectedCandidate}
        onClose={() => {
          setDetailModalVisible(false);
          setSelectedCandidate(null);
        }}
      />
    </div>
  );
};

export default Dashboard;

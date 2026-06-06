import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Tag, Button, Input, Select, Space, Typography, message } from 'antd';
import { PlusOutlined, EyeOutlined } from '@ant-design/icons';
import { claimApi } from '../services/api';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Search } = Input;
const { Option } = Select;

const statusColors = {
  pending_survey: 'default',
  surveying: 'processing',
  pending_assess: 'warning',
  assessing: 'processing',
  pending_review: 'warning',
  reviewing: 'processing',
  review_rejected: 'error',
  pending_pay: 'success',
  completed: 'success',
  closed: 'default'
};

function ReportList() {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState();
  const [keyword, setKeyword] = useState('');
  const [statusList, setStatusList] = useState([]);

  useEffect(() => {
    loadStatusList();
    loadReports();
  }, []);

  const loadStatusList = async () => {
    try {
      const data = await claimApi.getStatusList();
      setStatusList(data);
    } catch (error) {
      message.error('加载状态列表失败');
    }
  };

  const loadReports = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (keyword) params.keyword = keyword;
      
      const data = await claimApi.getReports(params);
      setReports(data);
    } catch (error) {
      message.error('加载案件列表失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: '报案号',
      dataIndex: 'report_no',
      key: 'report_no',
      width: 160,
      render: (text, record) => (
        <a onClick={() => navigate(`/report/${record.id}`)}>{text}</a>
      )
    },
    {
      title: '报案人',
      dataIndex: 'reporter_name',
      key: 'reporter_name',
      width: 100
    },
    {
      title: '联系电话',
      dataIndex: 'reporter_phone',
      key: 'reporter_phone',
      width: 120
    },
    {
      title: '车牌号',
      dataIndex: 'vehicle_plate',
      key: 'vehicle_plate',
      width: 100
    },
    {
      title: '车辆信息',
      dataIndex: 'vehicle_brand',
      key: 'vehicle',
      render: (text, record) => `${text} ${record.vehicle_model}`
    },
    {
      title: '事故地点',
      dataIndex: 'accident_location',
      key: 'accident_location',
      ellipsis: true
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status, record) => (
        <Tag color={statusColors[status]} className="status-tag">
          {record.status_name}
        </Tag>
      )
    },
    {
      title: '报案时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (text) => dayjs(text).format('YYYY-MM-DD HH:mm')
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/report/${record.id}`)}
          >
            详情
          </Button>
          {record.status === 'pending_survey' && (
            <Button
              type="link"
              size="small"
              onClick={() => navigate(`/survey/${record.id}`)}
            >
              查勘
            </Button>
          )}
          {['pending_assess', 'assessing', 'review_rejected'].includes(record.status) && (
            <Button
              type="link"
              size="small"
              onClick={() => navigate(`/assessment/${record.id}`)}
            >
              定损
            </Button>
          )}
        </Space>
      )
    }
  ];

  return (
    <div>
      <div className="page-header">
        <Title level={3}>案件列表</Title>
      </div>

      <Space style={{ marginBottom: 16 }} wrap>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/create')}>
          新增报案
        </Button>
        <Select
          placeholder="状态筛选"
          style={{ width: 140 }}
          allowClear
          value={statusFilter}
          onChange={(value) => {
            setStatusFilter(value);
            setTimeout(loadReports, 100);
          }}
        >
          {statusList.map(item => (
            <Option key={item.code} value={item.code}>{item.name}</Option>
          ))}
        </Select>
        <Search
          placeholder="搜索报案号/报案人/车牌号"
          style={{ width: 260 }}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onSearch={loadReports}
          enterButton
        />
        <Button onClick={loadReports}>刷新</Button>
      </Space>

      <Table
        columns={columns}
        dataSource={reports}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
        scroll={{ x: 1200 }}
      />
    </div>
  );
}

export default ReportList;

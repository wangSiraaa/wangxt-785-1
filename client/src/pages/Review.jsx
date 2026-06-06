import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, Table, Button, Tag, Typography, message, Space,
  Modal, Form, Input, Descriptions, Statistic, Row, Col
} from 'antd';
import { EyeOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { claimApi } from '../services/api';
import dayjs from 'dayjs';

const { Title } = Typography;
const { TextArea } = Input;

function Review() {
  const navigate = useNavigate();
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [reviewType, setReviewType] = useState(null);
  const [reviewForm] = Form.useForm();

  useEffect(() => {
    loadReviewQueue();
  }, []);

  const loadReviewQueue = async () => {
    setLoading(true);
    try {
      const data = await claimApi.getReviewQueue();
      setQueue(data);
    } catch (error) {
      message.error('加载复核队列失败');
    } finally {
      setLoading(false);
    }
  };

  const handleStartReview = async (record) => {
    try {
      const data = await claimApi.startReview(record.id, '审核员王五');
      setSelectedReport(data);
      setReviewModalVisible(true);
      setReviewType(null);
      reviewForm.resetFields();
    } catch (error) {
      message.error('开始复核失败: ' + error.message);
    }
  };

  const handleViewDetail = async (record) => {
    try {
      const data = await claimApi.getReportById(record.id);
      setSelectedReport(data);
      setReviewModalVisible(true);
      setReviewType(null);
    } catch (error) {
      message.error('加载详情失败');
    }
  };

  const handleProcessReview = async (values) => {
    if (!selectedReport || !reviewType) return;

    try {
      const result = reviewType === 'approve' ? 'approve' : 'reject';
      await claimApi.processReview(
        selectedReport.id,
        '审核员王五',
        result,
        values.opinion
      );
      message.success(reviewType === 'approve' ? '复核通过' : '已退回');
      setReviewModalVisible(false);
      loadReviewQueue();
    } catch (error) {
      message.error('处理失败: ' + error.message);
    }
  };

  const columns = [
    {
      title: '报案号', dataIndex: 'report_no', key: 'report_no', width: 160,
      render: (text, record) => (
        <a onClick={() => navigate(`/report/${record.id}`)}>{text}</a>
      )
    },
    { title: '报案人', dataIndex: 'reporter_name', key: 'reporter_name', width: 100 },
    { title: '车牌号', dataIndex: 'vehicle_plate', key: 'vehicle_plate', width: 100 },
    { title: '定损金额(元)', key: 'amount', width: 120,
      render: (_, record) => record.current_review?.total_amount?.toFixed(2) || '-' },
    { title: '权限阈值(元)', key: 'threshold', width: 120,
      render: (_, record) => record.current_review?.threshold?.toFixed(2) || '-' },
    { title: '状态', dataIndex: 'status_name', key: 'status', width: 100,
      render: (text, record) => (
        <Tag color={record.status === 'reviewing' ? 'processing' : 'warning'}>
          {text}
        </Tag>
      )
    },
    { title: '提交时间', dataIndex: 'updated_at', key: 'updated_at', width: 160,
      render: (t) => dayjs(t).format('YYYY-MM-DD HH:mm') },
    {
      title: '操作', key: 'action', width: 180,
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}>查看</Button>
          {record.status === 'pending_review' && (
            <Button type="primary" size="small" onClick={() => handleStartReview(record)}>
              开始复核
            </Button>
          )}
        </Space>
      )
    }
  ];

  return (
    <div>
      <div className="page-header">
        <Title level={3}>超权限复核队列</Title>
      </div>

      <Card>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Statistic title="待复核案件" value={queue.filter(r => r.status === 'pending_review').length} />
          </Col>
          <Col span={6}>
            <Statistic title="复核中案件" value={queue.filter(r => r.status === 'reviewing').length} />
          </Col>
        </Row>

        <Table
          columns={columns}
          dataSource={queue}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title={`案件复核 - ${selectedReport?.report_no || ''}`}
        open={reviewModalVisible}
        onCancel={() => setReviewModalVisible(false)}
        width={800}
        footer={null}
        destroyOnClose
      >
        {selectedReport && (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Descriptions column={2} size="small" bordered>
              <Descriptions.Item label="报案号">{selectedReport.report_no}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color="processing">{selectedReport.status_name}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="报案人">{selectedReport.reporter_name}</Descriptions.Item>
              <Descriptions.Item label="联系电话">{selectedReport.reporter_phone}</Descriptions.Item>
              <Descriptions.Item label="车牌号">{selectedReport.vehicle_plate}</Descriptions.Item>
              <Descriptions.Item label="车辆">{selectedReport.vehicle_brand} {selectedReport.vehicle_model}</Descriptions.Item>
              <Descriptions.Item label="定损金额" span={2}>
                <span style={{ color: '#cf1322', fontWeight: 'bold', fontSize: 16 }}>
                  ¥ {selectedReport.total_amount?.toFixed(2)}
                </span>
              </Descriptions.Item>
            </Descriptions>

            <Card title="损失明细" size="small">
              <Table
                size="small"
                pagination={false}
                dataSource={selectedReport.damage_items}
                rowKey="id"
                columns={[
                  { title: '损失部位', dataIndex: 'damage_part', key: 'part' },
                  { title: '项目名称', dataIndex: 'item_name', key: 'name' },
                  { title: '数量', dataIndex: 'quantity', key: 'qty' },
                  { title: '单价', dataIndex: 'unit_price', key: 'price', render: v => v.toFixed(2) },
                  { title: '小计', dataIndex: 'total_amount', key: 'total', render: v => v.toFixed(2) },
                  { title: '配件来源', dataIndex: 'parts_source', key: 'source' }
                ]}
              />
            </Card>

            {selectedReport.status === 'reviewing' && (
              <Form form={reviewForm} layout="vertical" onFinish={handleProcessReview}>
                <Form.Item
                  name="opinion"
                  label="复核意见"
                  rules={[{ required: true, message: '请输入复核意见' }]}
                >
                  <TextArea rows={3} placeholder="请输入复核意见" />
                </Form.Item>
                <Form.Item>
                  <Space>
                    <Button
                      type="primary"
                      icon={<CheckOutlined />}
                      onClick={() => setReviewType('approve')}
                      htmlType="submit"
                    >
                      复核通过
                    </Button>
                    <Button
                      danger
                      icon={<CloseOutlined />}
                      onClick={() => setReviewType('reject')}
                      htmlType="submit"
                    >
                      退回修改
                    </Button>
                    <Button onClick={() => setReviewModalVisible(false)}>取消</Button>
                  </Space>
                </Form.Item>
              </Form>
            )}

            {selectedReport.status !== 'reviewing' && (
              <Button onClick={() => setReviewModalVisible(false)}>关闭</Button>
            )}
          </Space>
        )}
      </Modal>
    </div>
  );
}

export default Review;
